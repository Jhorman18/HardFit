import { startOfMonth, endOfMonth } from 'date-fns'
import type { Exercise, Workout, MuscleOverride } from '../types'
import { isValidSet, workoutVolume, countValidSets } from './stats'
import { exerciseMedia, type ExerciseMediaItem, type MuscleKey } from '../data/exerciseMedia'
import { getEffectiveMedia } from './effectiveMuscles'

/**
 * Obtiene un ejercicio a partir de un Map o Record de ejercicios.
 */
export function getExercise(
  exerciseId: string,
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>
): Exercise | undefined {
  if (!exercisesById) return undefined
  return exercisesById instanceof Map ? exercisesById.get(exerciseId) : exercisesById[exerciseId]
}

/**
 * Determina si un entrenamiento finalizado cae dentro del intervalo de tiempo [fromTs, toTs].
 */
export function isWorkoutInRange(w: Workout, fromTs?: number, toTs?: number): boolean {
  if (w.finishedAt === null || w.finishedAt === undefined) return false
  const ts = w.finishedAt ?? w.startedAt
  if (fromTs !== undefined && ts < fromTs) return false
  if (toTs !== undefined && ts > toTs) return false
  return true
}

export interface TopExerciseItem {
  exerciseId: string
  name: string
  muscleGroup: string
  sessions: number
  sets: number
}

/**
 * Devuelve los ejercicios más frecuentes en el período:
 * sessions = nº de entrenos (en el período) que incluyen ese ejercicio con series válidas.
 * sets = total de series válidas.
 * Orden desc por sessions (desempata por sets).
 */
export function topExercises(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  fromTs?: number,
  toTs?: number
): TopExerciseItem[] {
  const filtered = workouts.filter((w) => isWorkoutInRange(w, fromTs, toTs))
  const stats = new Map<string, { sessions: number; sets: number }>()

  for (const w of filtered) {
    if (!w.entries) continue
    const exercisesInSession = new Set<string>()

    for (const entry of w.entries) {
      if (!entry.sets) continue
      let validSetsCount = 0
      for (const s of entry.sets) {
        if (isValidSet(s)) {
          validSetsCount++
        }
      }

      if (validSetsCount > 0) {
        exercisesInSession.add(entry.exerciseId)
        const current = stats.get(entry.exerciseId) || { sessions: 0, sets: 0 }
        current.sets += validSetsCount
        stats.set(entry.exerciseId, current)
      }
    }

    for (const exId of exercisesInSession) {
      const current = stats.get(exId)
      if (current) {
        current.sessions += 1
      }
    }
  }

  const result: TopExerciseItem[] = []
  for (const [exerciseId, data] of stats.entries()) {
    const ex = getExercise(exerciseId, exercisesById)
    result.push({
      exerciseId,
      name: ex?.name || 'Ejercicio desconocido',
      muscleGroup: ex?.muscleGroup || 'Otros',
      sessions: data.sessions,
      sets: data.sets,
    })
  }

  result.sort((a, b) => {
    if (b.sessions !== a.sessions) {
      return b.sessions - a.sessions
    }
    return b.sets - a.sets
  })

  return result
}

/**
 * Calcula las series válidas por grupo muscular en el período indicado.
 */
export function setsByMuscleGroup(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  fromTs?: number,
  toTs?: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _overrides?: Map<string, MuscleOverride>
): Record<string, number> {
  const filtered = workouts.filter((w) => isWorkoutInRange(w, fromTs, toTs))
  const result: Record<string, number> = {}

  for (const w of filtered) {
    if (!w.entries) continue
    for (const entry of w.entries) {
      if (!entry.sets) continue
      const ex = getExercise(entry.exerciseId, exercisesById)
      const muscle = ex?.muscleGroup || 'Otros'

      let count = 0
      for (const s of entry.sets) {
        if (isValidSet(s)) count++
      }

      if (count > 0) {
        result[muscle] = (result[muscle] || 0) + count
      }
    }
  }

  return result
}

export const FALLBACK_MUSCLE_GROUP_TO_KEYS: Record<string, MuscleKey[]> = {
  Pecho: ['chest'],
  Espalda: ['upper-back', 'lower-back'],
  'Espalda alta': ['upper-back', 'trapezius'],
  'Espalda baja': ['lower-back'],
  Dorsales: ['upper-back'],
  Dorsal: ['upper-back'],
  Pierna: ['quadriceps', 'hamstring', 'calves', 'gluteal'],
  Piernas: ['quadriceps', 'hamstring', 'calves', 'gluteal'],
  Hombro: ['front-deltoids', 'back-deltoids'],
  Hombros: ['front-deltoids', 'back-deltoids'],
  Bíceps: ['biceps'],
  Biceps: ['biceps'],
  Tríceps: ['triceps'],
  Triceps: ['triceps'],
  Core: ['abs', 'obliques'],
  Abdominales: ['abs'],
  Glúteos: ['gluteal'],
  Gluteos: ['gluteal'],
  Antebrazo: ['forearm'],
  Antebrazos: ['forearm'],
  Trapecio: ['trapezius'],
  Trapecios: ['trapezius'],
  Cuello: ['neck'],
  Cardio: [],
  Otros: [],
}

/**
 * Suma de series válidas que tocan cada músculo (usando primary [1 serie] + secondary [0.5 series]
 * de exerciseMedia[id]; si no está en exerciseMedia, usa el muscleGroup mapeado a MuscleKey aproximadas con 1 serie).
 * Aplica overrides si están disponibles para excluir músculos desactivados por el usuario.
 * Si un músculo aparece en primary y secondary, cuenta solo como primario (1).
 */
export function musclesWorkedInPeriod(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  exerciseMediaMap: Record<string, ExerciseMediaItem> = exerciseMedia,
  fromTs?: number,
  toTs?: number,
  overrides?: Map<string, MuscleOverride>
): Record<MuscleKey, number> {
  const filtered = workouts.filter((w) => isWorkoutInRange(w, fromTs, toTs))
  const result = {} as Record<MuscleKey, number>

  for (const w of filtered) {
    if (!w.entries) continue
    for (const entry of w.entries) {
      if (!entry.sets) continue
      let validSetsCount = 0
      for (const s of entry.sets) {
        if (isValidSet(s)) validSetsCount++
      }
      if (validSetsCount === 0) continue

      const baseMedia =
        (exerciseMediaMap && exerciseMediaMap[entry.exerciseId]) ||
        exerciseMedia[entry.exerciseId]

      if (baseMedia) {
        const eff = getEffectiveMedia(entry.exerciseId, overrides, exerciseMediaMap)
        const primarySet = new Set(eff.primary)

        // Primarios suman 1 serie por cada serie válida
        for (const key of primarySet) {
          result[key] = (result[key] || 0) + validSetsCount * 1
        }

        // Secundarios suman 0.5 series por cada serie válida (si no están ya en primarios)
        const secondarySet = new Set(eff.secondary.filter((k) => !primarySet.has(k)))
        for (const key of secondarySet) {
          result[key] = (result[key] || 0) + validSetsCount * 0.5
        }
      } else {
        const ex = getExercise(entry.exerciseId, exercisesById)
        const mg = ex?.muscleGroup || ''
        const keys = FALLBACK_MUSCLE_GROUP_TO_KEYS[mg] || []
        for (const key of new Set(keys)) {
          result[key] = (result[key] || 0) + validSetsCount * 1
        }
      }
    }
  }

  for (const k of Object.keys(result) as MuscleKey[]) {
    result[k] = Math.round(result[k] * 10) / 10
  }

  return result
}

export type RadarAxis = 'Espalda' | 'Pecho' | 'Core' | 'Hombros' | 'Brazos' | 'Piernas'

export function mapMuscleKeyToRadarAxis(key: MuscleKey): RadarAxis | null {
  switch (key) {
    case 'chest':
      return 'Pecho'
    case 'upper-back':
    case 'lower-back':
    case 'trapezius':
      return 'Espalda'
    case 'abs':
    case 'obliques':
      return 'Core'
    case 'front-deltoids':
    case 'back-deltoids':
      return 'Hombros'
    case 'biceps':
    case 'triceps':
    case 'forearm':
      return 'Brazos'
    case 'quadriceps':
    case 'hamstring':
    case 'calves':
    case 'gluteal':
    case 'adductor':
    case 'abductors':
      return 'Piernas'
    default:
      return null
  }
}

export function mapMuscleGroupToRadarAxis(muscleGroup?: string): RadarAxis | null {
  if (!muscleGroup) return null
  const mg = muscleGroup.trim().toLowerCase()
  if (mg.includes('pecho')) return 'Pecho'
  if (mg.includes('espalda') || mg.includes('dorsal') || mg.includes('trapecio')) return 'Espalda'
  if (mg.includes('core') || mg.includes('abdominal')) return 'Core'
  if (mg.includes('hombro')) return 'Hombros'
  if (
    mg.includes('bíceps') ||
    mg.includes('biceps') ||
    mg.includes('tríceps') ||
    mg.includes('triceps') ||
    mg.includes('brazo')
  ) {
    return 'Brazos'
  }
  if (mg.includes('pierna') || mg.includes('glúteo') || mg.includes('gluteo')) return 'Piernas'
  return null
}

export interface RadarRegionData {
  Espalda: number
  Pecho: number
  Core: number
  Hombros: number
  Brazos: number
  Piernas: number
}

/**
 * Formatea un conteo de series a un máximo de 1 decimal sin ".0"
 * (ej: 7.5 o 8, nunca 7.500000001 ni 8.0).
 */
export function formatSetsCount(val: number): string {
  const rounded = Math.round(val * 10) / 10
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
}

/**
 * Series válidas por eje del radar: Espalda, Pecho, Core, Hombros, Brazos, Piernas.
 * Usa los músculos efectivos si el ejercicio cuenta con media en catálogo (primarios 1 serie,
 * secundarios 0.5 series; si una región es tocada por primarios, cuenta como primario),
 * o el muscleGroup como fallback (1 serie).
 */
export function radarByRegion(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  fromTs?: number,
  toTs?: number,
  overrides?: Map<string, MuscleOverride>
): RadarRegionData {
  const filtered = workouts.filter((w) => isWorkoutInRange(w, fromTs, toTs))
  const result: RadarRegionData = {
    Espalda: 0,
    Pecho: 0,
    Core: 0,
    Hombros: 0,
    Brazos: 0,
    Piernas: 0,
  }

  for (const w of filtered) {
    if (!w.entries) continue
    for (const entry of w.entries) {
      if (!entry.sets) continue
      let validCount = 0
      for (const s of entry.sets) {
        if (isValidSet(s)) validCount++
      }
      if (validCount === 0) continue

      const baseMedia = exerciseMedia[entry.exerciseId]
      if (baseMedia) {
        const eff = getEffectiveMedia(entry.exerciseId, overrides)
        const primaryAxes = new Set<RadarAxis>()
        for (const k of eff.primary) {
          const ax = mapMuscleKeyToRadarAxis(k)
          if (ax) primaryAxes.add(ax)
        }
        for (const ax of primaryAxes) {
          result[ax] += validCount * 1
        }

        const primaryKeySet = new Set(eff.primary)
        const secondaryAxes = new Set<RadarAxis>()
        for (const k of eff.secondary) {
          if (!primaryKeySet.has(k)) {
            const ax = mapMuscleKeyToRadarAxis(k)
            if (ax && !primaryAxes.has(ax)) {
              secondaryAxes.add(ax)
            }
          }
        }
        for (const ax of secondaryAxes) {
          result[ax] += validCount * 0.5
        }
      } else {
        const ex = getExercise(entry.exerciseId, exercisesById)
        const axis = mapMuscleGroupToRadarAxis(ex?.muscleGroup)
        if (axis) {
          result[axis] += validCount * 1
        }
      }
    }
  }

  for (const ax of Object.keys(result) as RadarAxis[]) {
    result[ax] = Math.round(result[ax] * 10) / 10
  }

  return result
}

export interface PeriodSummary {
  workouts: number
  durationSec: number
  volume: number
  sets: number
}

/**
 * Resumen de volumen, entrenamientos, series válidas y duración en un período.
 */
export function periodSummary(
  workouts: Workout[],
  fromTs?: number,
  toTs?: number,
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  bodyweightKg?: number
): PeriodSummary {
  const filtered = workouts.filter((w) => isWorkoutInRange(w, fromTs, toTs))

  let totalDurationSec = 0
  let totalVol = 0
  let totalSets = 0

  for (const w of filtered) {
    if (w.finishedAt && w.startedAt) {
      const dur = Math.max(0, Math.round((w.finishedAt - w.startedAt) / 1000))
      totalDurationSec += dur
    }
    totalVol += workoutVolume(w, exercisesById, bodyweightKg)
    totalSets += countValidSets(w)
  }

  return {
    workouts: filtered.length,
    durationSec: totalDurationSec,
    volume: Math.round(totalVol * 10) / 10,
    sets: totalSets,
  }
}

export interface MonthlyReport {
  year: number
  month: number
  workouts: number
  volume: number
  sets: number
  durationSec: number
  top: TopExerciseItem[]
  prs?: number
}

/**
 * Genera el informe mensual con totales y ejercicios principales del mes.
 */
export function monthlyReport(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1, // 1 a 12
  bodyweightKg?: number
): MonthlyReport {
  const start = startOfMonth(new Date(year, month - 1, 1)).getTime()
  const end = endOfMonth(new Date(year, month - 1, 1)).getTime()

  const summary = periodSummary(workouts, start, end, exercisesById, bodyweightKg)
  const top = topExercises(workouts, exercisesById, start, end)

  return {
    year,
    month,
    workouts: summary.workouts,
    volume: summary.volume,
    sets: summary.sets,
    durationSec: summary.durationSec,
    top,
  }
}
