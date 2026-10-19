import { format } from 'date-fns'
import { db } from '../db'
import type { Exercise, Folder, Routine, Workout, Measurement, SettingsRecord } from '../types'

export interface RepLogBackup {
  app: 'RepLog'
  version: number
  exportedAt: string
  data: {
    exercises: Exercise[]
    folders: Folder[]
    routines: Routine[]
    workouts: Workout[]
    measurements: Measurement[]
    settings: SettingsRecord[]
  }
}

/**
 * Recopila todas las tablas de Dexie para generar una copia de seguridad íntegra.
 */
export async function buildBackup(): Promise<RepLogBackup> {
  const [exercises, folders, routines, workouts, measurements, settings] = await Promise.all([
    db.exercises.toArray(),
    db.folders.toArray(),
    db.routines.toArray(),
    db.workouts.toArray(),
    db.measurements.toArray(),
    db.settings.toArray(),
  ])

  return {
    app: 'RepLog',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      exercises,
      folders,
      routines,
      workouts,
      measurements,
      settings,
    },
  }
}

/**
 * Crea un Blob y dispara la descarga en el navegador con fallback para entornos WebView.
 */
export function downloadBlob(filename: string, mime: string, content: string): void {
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
  downloadBlob(`replog-backup-${dateStr}.json`, 'application/json', jsonContent)
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
  downloadBlob(`replog-entrenos-${dateStr}.csv`, 'text/csv;charset=utf-8', csvContent)
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
  downloadBlob(`replog-medidas-${dateStr}.csv`, 'text/csv;charset=utf-8', csvContent)
}
