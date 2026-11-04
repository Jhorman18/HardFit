import { db } from '../db'
import { supabase, isCloudConfigured } from '../lib/supabase'
import type { Exercise, Folder, Routine, Workout, Measurement, Settings } from '../types'

export const SYNCABLE_COLLECTIONS = [
  'exercises',
  'folders',
  'routines',
  'workouts',
  'measurements',
  'settings',
] as const

export type SyncableCollection = (typeof SYNCABLE_COLLECTIONS)[number]

export interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  deleted: number
  error?: string
}

/**
 * Serialización determinista de objetos ordenando las claves alfabéticamente.
 * Garantiza que dos objetos con el mismo contenido generen la misma representación,
 * independientemente del orden de inserción de sus propiedades.
 */
export function deterministicStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj)
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicStringify).join(',') + ']'
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  const entries: string[] = []
  for (const k of keys) {
    const val = (obj as Record<string, unknown>)[k]
    if (val !== undefined) {
      entries.push(`${JSON.stringify(k)}:${deterministicStringify(val)}`)
    }
  }
  return '{' + entries.join(',') + '}'
}

/**
 * Genera un hash estable del contenido de un registro usando una variante rápida de djb2.
 * Permite detectar si un registro local ha cambiado desde la última sincronización
 * sin necesidad de mantener columnas de timestamp 'updatedAt' en todas las tablas locales.
 */
export function stableHash(obj: unknown): string {
  const str = deterministicStringify(obj)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

/**
 * Obtiene todos los registros locales de una colección para sincronizar.
 * - 'exercises': SOLO aquellos donde isCustom === true (no sincroniza ejercicios predeterminados de fábrica).
 * - 'settings': SOLO el registro con id === 'app' (NUNCA 'active_workout').
 */
export async function getLocalRecords(
  collection: SyncableCollection
): Promise<Array<{ docId: string; data: unknown }>> {
  switch (collection) {
    case 'exercises': {
      const list = await db.exercises.toArray()
      return list
        .filter((e) => e.isCustom === true)
        .map((e) => ({ docId: e.id, data: e }))
    }
    case 'folders': {
      const list = await db.folders.toArray()
      return list.map((f) => ({ docId: f.id, data: f }))
    }
    case 'routines': {
      const list = await db.routines.toArray()
      return list.map((r) => ({ docId: r.id, data: r }))
    }
    case 'workouts': {
      const list = await db.workouts.toArray()
      return list.map((w) => ({ docId: w.id, data: w }))
    }
    case 'measurements': {
      const list = await db.measurements.toArray()
      return list.map((m) => ({ docId: m.id, data: m }))
    }
    case 'settings': {
      const s = await db.settings.get('app')
      if (s && s.id === 'app') {
        return [{ docId: 'app', data: s }]
      }
      return []
    }
    default:
      return []
  }
}

/**
 * Obtiene un registro local individual por colección y docId.
 */
export async function getLocalRecord(
  collection: string,
  docId: string
): Promise<unknown | null> {
  switch (collection) {
    case 'exercises':
      return (await db.exercises.get(docId)) ?? null
    case 'folders':
      return (await db.folders.get(docId)) ?? null
    case 'routines':
      return (await db.routines.get(docId)) ?? null
    case 'workouts':
      return (await db.workouts.get(docId)) ?? null
    case 'measurements':
      return (await db.measurements.get(docId)) ?? null
    case 'settings':
      if (docId === 'app') {
        const s = await db.settings.get('app')
        return s && s.id === 'app' ? s : null
      }
      return null
    default:
      return null
  }
}

/**
 * Aplica un cambio remoto en la base de datos Dexie local.
 * Si deleted es true, borra el registro de Dexie. Si es false, realiza un upsert (put).
 */
export async function applyRemoteToLocal(
  collection: string,
  docId: string,
  data: unknown,
  deleted: boolean
): Promise<void> {
  if (deleted) {
    switch (collection) {
      case 'exercises':
        await db.exercises.delete(docId)
        break
      case 'folders':
        await db.folders.delete(docId)
        break
      case 'routines':
        await db.routines.delete(docId)
        break
      case 'workouts':
        await db.workouts.delete(docId)
        break
      case 'measurements':
        await db.measurements.delete(docId)
        break
      case 'settings':
        if (docId === 'app') {
          await db.settings.delete('app')
        }
        break
    }
    return
  }

  // Inserción o actualización
  switch (collection) {
    case 'exercises': {
      const item = data as Exercise
      await db.exercises.put({ ...item, isCustom: true })
      break
    }
    case 'folders':
      await db.folders.put(data as Folder)
      break
    case 'routines':
      await db.routines.put(data as Routine)
      break
    case 'workouts':
      await db.workouts.put(data as Workout)
      break
    case 'measurements':
      await db.measurements.put(data as Measurement)
      break
    case 'settings':
      if (docId === 'app') {
        await db.settings.put(data as Settings)
      }
      break
  }
}

let isSyncing = false

/**
 * Ejecuta una sincronización completa local-first con Supabase:
 *
 * 1. PULL: Descarga registros modificados desde lastPulledAt.
 *    REGLA LWW (Last-Write-Wins) y estado sucio:
 *    - Se compara el hash local actual con syncMeta.hash.
 *    - Si el registro local NO está sucio (hashActual === syncMeta.hash o no existía local ni en syncMeta),
 *      se aplica el cambio remoto en Dexie y se actualiza syncMeta.
 *    - Si el registro local SÍ está sucio (fue modificado o creado offline después de la última sincronización),
 *      NO se pisa el cambio local con el remoto. El cambio local prevalecerá en el paso de PUSH posterior.
 *
 * 2. PUSH: Para cada colección:
 *    - Recorre registros locales. Si no tienen syncMeta o su hash cambió (sucio), hace upsert a Supabase.
 *    - Detecta borrados: para claves de syncMeta que ya no existen en Dexie local, marca deleted: true en Supabase.
 *
 * 3. Actualiza metadatos de sincronización (lastPulledAt y lastSyncAt).
 */
export async function syncNow(): Promise<SyncResult> {
  if (!supabase || !isCloudConfigured) {
    return {
      success: false,
      pulled: 0,
      pushed: 0,
      deleted: 0,
      error: 'Supabase no está configurado en las variables de entorno.',
    }
  }

  if (isSyncing) {
    return {
      success: false,
      pulled: 0,
      pushed: 0,
      deleted: 0,
      error: 'Sincronización en curso.',
    }
  }

  isSyncing = true

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session || !session.user) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        deleted: 0,
        error: 'No hay sesión de usuario activa.',
      }
    }

    const userId = session.user.id
    let pulledCount = 0
    let pushedCount = 0
    let deletedCount = 0

    // ==========================================
    // PASO A: PULL (Descargar novedades remotas)
    // ==========================================
    const lastPullRecord = await db.syncMeta.get('meta:lastPulledAt')
    const since = (lastPullRecord?.val as string) ?? '1970-01-01T00:00:00.000Z'

    const { data: remoteRecords, error: pullError } = await supabase
      .from('replog_records')
      .select('collection, doc_id, data, updated_at, deleted')
      .eq('user_id', userId)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })

    if (pullError) {
      console.error('Error al descargar registros remotos:', pullError)
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        deleted: 0,
        error: `Error al descargar: ${pullError.message}`,
      }
    }

    let maxUpdatedAt = since

    if (remoteRecords && remoteRecords.length > 0) {
      for (const row of remoteRecords) {
        try {
          const coll = row.collection as SyncableCollection
          if (!SYNCABLE_COLLECTIONS.includes(coll)) {
            continue
          }
          if (coll === 'settings' && row.doc_id !== 'app') {
            continue
          }

          const metaKey = `${coll}:${row.doc_id}`
          const meta = await db.syncMeta.get(metaKey)
          const localDoc = await getLocalRecord(coll, row.doc_id)
          const localHash = localDoc ? stableHash(localDoc) : null

          // Evaluación de suciedad local:
          // Si el registro local existe y tiene syncMeta, está sucio si localHash !== meta.hash.
          // Si el registro local existe pero no tiene syncMeta, fue creado offline -> sucio.
          // Si el registro local no existe pero tiene syncMeta, fue borrado offline -> sucio.
          // Si el registro local no existe y no tiene syncMeta, es nuevo remotamente -> limpio.
          const isDirty = meta ? localHash !== meta.hash : localDoc !== null

          if (!isDirty) {
            // El registro local NO está sucio: aplicamos el cambio remoto
            if (row.deleted) {
              await applyRemoteToLocal(coll, row.doc_id, null, true)
              await db.syncMeta.delete(metaKey)
            } else {
              await applyRemoteToLocal(coll, row.doc_id, row.data, false)
              await db.syncMeta.put({
                key: metaKey,
                hash: stableHash(row.data),
                syncedAt: Date.now(),
              })
            }
            pulledCount++
          } else {
            // Regla LWW: el registro local está sucio con modificaciones locales no sincronizadas.
            // NO se pisa; prevalecen los datos locales y ganarán en el siguiente paso de PUSH.
            console.log(
              `[Sync LWW] Conservando cambios locales para ${metaKey}; se enviarán en PUSH.`
            )
          }

          if (row.updated_at && row.updated_at > maxUpdatedAt) {
            maxUpdatedAt = row.updated_at
          }
        } catch (err) {
          console.error(`Error procesando fila remota ${row.collection}:${row.doc_id}:`, err)
        }
      }

      if (maxUpdatedAt > since) {
        await db.syncMeta.put({
          key: 'meta:lastPulledAt',
          val: maxUpdatedAt,
          syncedAt: Date.now(),
        })
      }
    }

    // ==========================================
    // PASO B: PUSH (Subir novedades locales)
    // ==========================================
    for (const coll of SYNCABLE_COLLECTIONS) {
      try {
        const localRecords = await getLocalRecords(coll)
        const localDocIds = new Set<string>()

        // 1. Subir registros nuevos o modificados
        for (const item of localRecords) {
          localDocIds.add(item.docId)
          const metaKey = `${coll}:${item.docId}`
          const meta = await db.syncMeta.get(metaKey)
          const hashActual = stableHash(item.data)

          if (!meta || meta.hash !== hashActual) {
            // El registro local está sucio
            const nowIso = new Date().toISOString()
            const { error: pushErr } = await supabase.from('replog_records').upsert(
              {
                user_id: userId,
                collection: coll,
                doc_id: item.docId,
                data: item.data,
                updated_at: nowIso,
                deleted: false,
              },
              { onConflict: 'user_id,collection,doc_id' }
            )

            if (pushErr) {
              console.error(`Error al subir ${metaKey}:`, pushErr)
            } else {
              await db.syncMeta.put({
                key: metaKey,
                hash: hashActual,
                syncedAt: Date.now(),
              })
              pushedCount++
            }
          }
        }

        // 2. Propagar eliminaciones: claves en syncMeta que ya no existen en local Dexie
        const prefix = `${coll}:`
        const allMeta = await db.syncMeta.toArray()
        const collMetas = allMeta.filter((m) => m.key.startsWith(prefix))

        for (const m of collMetas) {
          const docId = m.key.slice(prefix.length)
          if (!localDocIds.has(docId)) {
            const nowIso = new Date().toISOString()
            const { error: delErr } = await supabase.from('replog_records').upsert(
              {
                user_id: userId,
                collection: coll,
                doc_id: docId,
                data: {},
                updated_at: nowIso,
                deleted: true,
              },
              { onConflict: 'user_id,collection,doc_id' }
            )

            if (delErr) {
              console.error(`Error al marcar borrado remoto para ${m.key}:`, delErr)
            } else {
              await db.syncMeta.delete(m.key)
              deletedCount++
            }
          }
        }
      } catch (collErr) {
        console.error(`Error en paso PUSH para colección ${coll}:`, collErr)
      }
    }

    // ==========================================
    // PASO C: Actualizar lastSyncAt
    // ==========================================
    const now = Date.now()
    await db.syncMeta.put({
      key: 'meta:lastSyncAt',
      syncedAt: now,
      val: new Date(now).toISOString(),
    })

    return {
      success: true,
      pulled: pulledCount,
      pushed: pushedCount,
      deleted: deletedCount,
    }
  } catch (err: any) {
    console.error('Error general durante la sincronización:', err)
    return {
      success: false,
      pulled: 0,
      pushed: 0,
      deleted: 0,
      error: err?.message || 'Error de red o conexión al sincronizar.',
    }
  } finally {
    isSyncing = false
  }
}
