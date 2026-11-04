import { asWeightUnit, stampWorkoutWeightUnits, stampRoutineWeightUnits } from './weightUnits'
import { format } from 'date-fns'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { db } from '../db'
import { catalog } from '../data/catalog'
import type {
  Exercise,
  Folder,
  Routine,
  Workout,
  Measurement,
  SettingsRecord,
  ExerciseNote,
  MuscleOverride,
  Settings,
} from '../types'

// Las copias hechas antes de los cambios de nombre llevan app: 'Kitaeru' o 'RepLog' y se siguen aceptando
const BACKUP_APP_IDS = ['HardFit', 'hardFIT', 'Kitaeru', 'RepLog'] as const

export interface HardfitBackup {
  app: 'HardFit'
  version: number
  exportedAt: string
  data: {
    exercises: Exercise[]
    folders: Folder[]
    routines: Routine[]
    workouts: Workout[]
    measurements: Measurement[]
    settings: SettingsRecord[]
    exerciseNotes: ExerciseNote[]
    muscleOverrides: MuscleOverride[]
  }
}

/**
 * Recopila todas las tablas de Dexie para generar una copia de seguridad íntegra.
 */
export async function buildBackup(): Promise<HardfitBackup> {
  const [exercises, folders, routines, workouts, measurements, settings, exerciseNotes, muscleOverrides] =
    await Promise.all([
      db.exercises.toArray(),
      db.folders.toArray(),
      db.routines.toArray(),
      db.workouts.toArray(),
      db.measurements.toArray(),
      db.settings.toArray(),
      db.exerciseNotes.toArray(),
      db.muscleOverrides.toArray(),
    ])

  return {
    app: 'HardFit',
    version: 4,
    exportedAt: new Date().toISOString(),
    data: {
      exercises,
      folders,
      routines,
      workouts,
      measurements,
      settings,
      exerciseNotes,
      muscleOverrides,
    },
  }
}

/**
 * Restaura una copia de seguridad íntegra a partir de una cadena JSON.
 * Descarga una copia de seguridad previa antes de sobrescribir.
 */
export async function importBackupFromText(
  text: string
): Promise<{ counts: Record<string, number> }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Archivo JSON inválido')
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !BACKUP_APP_IDS.includes((parsed as { app?: unknown }).app as (typeof BACKUP_APP_IDS)[number]) ||
    !(parsed as { data?: unknown }).data ||
    typeof (parsed as { data?: unknown }).data !== 'object'
  ) {
    throw new Error('No es una copia de HardFit')
  }

  const data = (parsed as { data: Record<string, unknown> }).data

  const exercises = Array.isArray(data.exercises) ? (data.exercises as Exercise[]) : []
  const folders = Array.isArray(data.folders) ? (data.folders as Folder[]) : []
  const routines = Array.isArray(data.routines) ? (data.routines as Routine[]) : []
  const workouts = Array.isArray(data.workouts) ? (data.workouts as Workout[]) : []
  const measurements = Array.isArray(data.measurements) ? (data.measurements as Measurement[]) : []
  const settings = Array.isArray(data.settings) ? (data.settings as SettingsRecord[]) : []
  const exerciseNotes = Array.isArray(data.exerciseNotes)
    ? (data.exerciseNotes as ExerciseNote[])
    : []

  const hasMuscleOverrides = Array.isArray(data.muscleOverrides)
  const muscleOverrides = hasMuscleOverrides ? (data.muscleOverrides as MuscleOverride[]) : []

  // SEGURIDAD: antes de sobrescribir, descargar copia del estado actual
  const prev = await buildBackup()
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  await downloadBlob(
    `hardfit-backup-previo-${dateStr}.json`,
    'application/json',
    JSON.stringify(prev, null, 2)
  )

  // Preservar seedVersion para no re-sembrar el catálogo al recargar
  const currentSettings = await db.settings.toArray()
  const currentAppSetting = currentSettings.find((s): s is Settings => s.id === 'app')
  const currentSeedVersion = Math.max(currentAppSetting?.seedVersion ?? 3, 3)

  const finalSettings: SettingsRecord[] = [...settings]
  const hasSeedVersion = finalSettings.some(
    (s) =>
      'seedVersion' in s &&
      typeof (s as Settings).seedVersion === 'number' &&
      ((s as Settings).seedVersion ?? 0) >= 3
  )

  if (!hasSeedVersion) {
    const appIdx = finalSettings.findIndex((s) => s.id === 'app')
    if (appIdx >= 0) {
      const existingApp = finalSettings[appIdx] as Settings
      finalSettings[appIdx] = {
        ...existingApp,
        seedVersion: currentSeedVersion,
      }
    } else {
      finalSettings.push({
        id: 'app',
        units: 'kg',
        restSeconds: 120,
        createdAt: Date.now(),
        seedVersion: currentSeedVersion,
      })
    }
  }

  const importedApp = finalSettings.find((record): record is Settings => record.id === 'app')
  const legacyUnit = asWeightUnit(importedApp?.legacyWeightUnit ?? importedApp?.units)
  const normalizedRoutines = routines.map(routine => stampRoutineWeightUnits(routine, legacyUnit))
  const normalizedWorkouts = workouts.map(workout => stampWorkoutWeightUnits(workout, legacyUnit))
  for (let index = 0; index < finalSettings.length; index++) {
    const record = finalSettings[index]
    if (record.id === 'active_workout') finalSettings[index] = { ...record, workout: stampWorkoutWeightUnits(record.workout, legacyUnit) }
    else finalSettings[index] = { ...record, legacyWeightUnit: record.legacyWeightUnit ?? legacyUnit }
  }

  const hasCatalog = exercises.some((e) => !e.isCustom)

  // Transacción atómica Dexie rw sobre las 8 tablas de datos (sin tocar syncMeta)
  await db.transaction(
    'rw',
    [
      db.exercises,
      db.folders,
      db.routines,
      db.workouts,
      db.measurements,
      db.settings,
      db.exerciseNotes,
      db.muscleOverrides,
    ],
    async () => {
      await db.exercises.clear()
      if (!hasCatalog) {
        const catalogRecords: Exercise[] = catalog.map((ex) => ({
          ...ex,
          isCustom: false,
        }))
        await db.exercises.bulkPut(catalogRecords)
      }
      if (exercises.length > 0) {
        await db.exercises.bulkPut(exercises)
      }

      await db.folders.clear()
      if (folders.length > 0) {
        await db.folders.bulkPut(folders)
      }

      await db.routines.clear()
      if (routines.length > 0) {
        await db.routines.bulkPut(normalizedRoutines)
      }

      await db.workouts.clear()
      if (workouts.length > 0) {
        await db.workouts.bulkPut(normalizedWorkouts)
      }

      await db.measurements.clear()
      if (measurements.length > 0) {
        await db.measurements.bulkPut(measurements)
      }

      await db.settings.clear()
      if (finalSettings.length > 0) {
        await db.settings.bulkPut(finalSettings)
      }

      await db.exerciseNotes.clear()
      if (exerciseNotes.length > 0) {
        await db.exerciseNotes.bulkPut(exerciseNotes)
      }

      // Los backups anteriores a v3 no contienen preferencias de enfoque.
      if (hasMuscleOverrides) {
        await db.muscleOverrides.clear()
        if (muscleOverrides.length > 0) {
          await db.muscleOverrides.bulkPut(muscleOverrides)
        }
      }
    }
  )

  // Una importaci?n expl?cita sustituye tambi?n el cache de la sesi?n activa.
  if (typeof window !== 'undefined') {
    const active = finalSettings.find(record => record.id === 'active_workout')
    if (active && active.id === 'active_workout') localStorage.setItem('replog_active_workout', JSON.stringify(active.workout))
    else localStorage.removeItem('replog_active_workout')
  }

  return {
    counts: {
      exercises: hasCatalog ? exercises.length : exercises.length + catalog.length,
      folders: folders.length,
      routines: routines.length,
      workouts: workouts.length,
      measurements: measurements.length,
      settings: finalSettings.length,
      exerciseNotes: exerciseNotes.length,
      muscleOverrides: muscleOverrides.length,
    },
  }
}

/**
 * Descarga o guarda un archivo. En entornos móviles nativos (Capacitor/Android/iOS):
 * - Guarda el archivo en almacenamiento del dispositivo
 * - Abre el menú nativo para guardar en "Descargas / Archivos" o compartirlo.
 * En entornos web/PWA:
 * - Dispara la descarga tradicional directa al navegador / carpeta Descargas.
 */
export async function downloadBlob(filename: string, mime: string, content: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Guardar copia en el directorio de Documentos si está disponible
      try {
        await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        })
      } catch {
        // Fallback silencioso si el almacenamiento de Documentos está restringido por el SO
      }

      // 2. Guardar en Cache y abrir hoja de guardado/compartición nativa de Android
      const fileResult = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      })

      await Share.share({
        title: filename,
        url: fileResult.uri,
        dialogTitle: `Guardar ${filename}`,
      })
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('cancel')) {
        return
      }
      console.warn('Error en Filesystem/Share nativo, aplicando fallback:', err)
    }
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)

  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch {
    // Fallback para entornos donde el elemento <a> con download no responde
    window.open(url, '_blank')
  } finally {
    // Liberar memoria del blob después de iniciar la descarga
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 2000)
  }
}

/**
 * Escapa valores para cumplir el estándar RFC 4180 de CSV.
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Exporta una copia de seguridad completa en formato JSON.
 */
export async function exportJson(): Promise<void> {
  const backup = await buildBackup()
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const jsonContent = JSON.stringify(backup, null, 2)
  await downloadBlob(`hardfit-backup-${dateStr}.json`, 'application/json', jsonContent)
}

/**
 * Exporta un registro tabular de todos los entrenamientos en formato CSV (una fila por serie).
 * Incluye BOM \uFEFF al inicio para compatibilidad con Microsoft Excel y acentos en español.
 */
export async function exportWorkoutsCsv(): Promise<void> {
  const [workouts, exercises] = await Promise.all([
    db.workouts.toArray(),
    db.exercises.toArray(),
  ])

  const exerciseMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]))

  const headers = [
    'fecha',
    'entreno',
    'ejercicio',
    'grupo_muscular',
    'equipo',
    'serie',
    'tipo',
    'peso',
    'unidad_peso',
    'reps',
    'rpe',
    'duracion_seg',
    'distancia_m',
    'completada',
    'volumen',
  ]

  const rows: string[] = []

  // Ordenar entrenamientos por fecha de inicio cronológica
  const sortedWorkouts = [...workouts].sort((a, b) => a.startedAt - b.startedAt)

  for (const workout of sortedWorkouts) {
    if (!workout.entries || workout.entries.length === 0) continue

    const fechaStr = format(new Date(workout.startedAt), 'yyyy-MM-dd HH:mm')
    const entrenoNombre = workout.name || 'Entrenamiento'

    for (const entry of workout.entries) {
      const exercise = exerciseMap.get(entry.exerciseId)
      const ejercicioNombre = exercise ? exercise.name : entry.exerciseId
      const grupoMuscular = exercise ? exercise.muscleGroup : ''
      const equipo = exercise ? exercise.equipment : ''
      const tipoEjercicio = exercise ? exercise.type : 'weight_reps'

      entry.sets.forEach((set, index) => {
        const serieNum = index + 1
        const tipoSerie = set.type || 'normal'
        const peso = set.weight !== undefined && set.weight !== null ? set.weight : ''
        const reps = set.reps !== undefined && set.reps !== null ? set.reps : ''
        const rpe = set.rpe !== undefined && set.rpe !== null ? set.rpe : ''
        const duracion =
          set.durationSec !== undefined && set.durationSec !== null ? set.durationSec : ''
        const distancia =
          set.distanceM !== undefined && set.distanceM !== null ? set.distanceM : ''
        const completada = set.completed ? 'Sí' : 'No'

        // Volumen: peso * reps para ejercicios de carga; 0 para peso corporal, tiempo o distancia
        const volumen =
          tipoEjercicio === 'weight_reps'
            ? (Number(set.weight) || 0) * (Number(set.reps) || 0)
            : 0

        const row = [
          escapeCsvCell(fechaStr),
          escapeCsvCell(entrenoNombre),
          escapeCsvCell(ejercicioNombre),
          escapeCsvCell(grupoMuscular),
          escapeCsvCell(equipo),
          escapeCsvCell(serieNum),
          escapeCsvCell(tipoSerie),
          escapeCsvCell(peso),
          escapeCsvCell(set.weightUnit ?? entry.weightUnit ?? workout.weightUnit ?? 'kg'),
          escapeCsvCell(reps),
          escapeCsvCell(rpe),
          escapeCsvCell(duracion),
          escapeCsvCell(distancia),
          escapeCsvCell(completada),
          escapeCsvCell(volumen),
        ].join(',')

        rows.push(row)
      })
    }
  }

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  await downloadBlob(`hardfit-entrenos-${dateStr}.csv`, 'text/csv;charset=utf-8', csvContent)
}

/**
 * Exporta el registro de medidas corporales en CSV.
 */
export async function exportMeasurementsCsv(): Promise<void> {
  const measurements = await db.measurements.toArray()
  const sorted = [...measurements].sort((a, b) => a.date - b.date)

  const headers = ['fecha', 'tipo', 'valor', 'unidad']
  const rows = sorted.map((m) => {
    const fechaStr = format(new Date(m.date), 'yyyy-MM-dd HH:mm')
    return [
      escapeCsvCell(fechaStr),
      escapeCsvCell(m.type),
      escapeCsvCell(m.value),
      escapeCsvCell(m.unit),
    ].join(',')
  })

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  await downloadBlob(`hardfit-medidas-${dateStr}.csv`, 'text/csv;charset=utf-8', csvContent)
}
