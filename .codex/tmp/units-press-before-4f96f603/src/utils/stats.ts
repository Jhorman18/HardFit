import {
  startOfWeek,
  subWeeks,
  format,
  isSameWeek,
  isWithinInterval,
  endOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { Exercise, ExerciseType, Workout, WorkoutSetEntry } from '../types'

/**
 * Determina si una serie es válida para el cálculo de estadísticas.
 * Regla: Se excluyen series de calentamiento (type === 'warmup')
 * y series no completadas (completed !== true).
 */
export function isValidSet(set: WorkoutSetEntry): boolean {
  return set.completed === true && set.type !== 'warmup'
}

/**
 * Fórmula de Epley para estimar el 1RM (Repetición Máxima).
 * Si reps <= 1, devuelve el peso levantado directamente.
 * Si reps > 1, calcula: peso * (1 + reps / 30).
 * Redondea a 1 decimal.
 */
export function estimated1RM(weight: number, reps: number): number {
  const w = Math.max(0, weight || 0)
  const r = Math.max(0, reps || 0)

  if (w <= 0 || r <= 0) return 0
  if (r <= 1) return Math.round(w * 10) / 10

  const est = w * (1 + r / 30)
  return Math.round(est * 10) / 10
}

/**
 * Calcula el tonelaje / volumen de una serie individual según el tipo de ejercicio.
 * Excluye series de calentamiento o incompletas (devuelve 0).
 *
 * Fórmulas:
 * - weight_reps: (weight || 0) * (reps || 0)
 * - bodyweight_reps: ((bodyweightKg || 0) + (weight || 0)) * (reps || 0)
 * - bodyweight_assisted: max(0, ((bodyweightKg || 0) - (weight || 0))) * (reps || 0)
 * - duration / distance / otros: 0
 */
export function setVolume(
  set: WorkoutSetEntry,
  exerciseType: ExerciseType,
  bodyweightKg?: number
): number {
  if (!isValidSet(set)) return 0

  const reps = Math.max(0, set.reps || 0)
  const weight = Math.max(0, set.weight || 0)
  const bw = Math.max(0, bodyweightKg || 0)

  let vol = 0
  switch (exerciseType) {
    case 'weight_reps':
      vol = weight * reps
      break
    case 'bodyweight_reps':
      vol = (bw + weight) * reps
      break
    case 'bodyweight_assisted':
      vol = Math.max(0, bw - weight) * reps
      break
    case 'duration':
    case 'distance':
    default:
      vol = 0
      break
  }

  return Math.round(vol * 10) / 10
}

/**
 * Obtiene el tipo de ejercicio a partir del mapa de ejercicios.
 */
function getExerciseType(
  exerciseId: string,
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>
): ExerciseType {
  if (!exercisesById) return 'weight_reps'
  const ex =
    exercisesById instanceof Map ? exercisesById.get(exerciseId) : exercisesById[exerciseId]
  return ex?.type ?? 'weight_reps'
}

/**
 * Suma del volumen de todas las series válidas de un entrenamiento.
 */
export function workoutVolume(
  workout: Workout,
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  bodyweightKg?: number
): number {
  if (!workout.entries || workout.entries.length === 0) return 0

  let total = 0
  for (const entry of workout.entries) {
    const exType = getExerciseType(entry.exerciseId, exercisesById)
    for (const s of entry.sets) {
      total += setVolume(s, exType, bodyweightKg)
    }
  }

  return Math.round(total * 10) / 10
}

/**
 * Calcula el número de series válidas (completadas y no calentamiento) de un entreno.
 */
export function countValidSets(workout: Workout): number {
  if (!workout.entries) return 0
  let count = 0
  for (const entry of workout.entries) {
    for (const s of entry.sets) {
      if (isValidSet(s)) count++
    }
  }
  return count
}

/**
 * Racha semanal de entrenamientos:
 * Número de semanas consecutivas (lunes a domingo según date-fns) con al menos 1 entrenamiento terminado.
 *
 * Regla de continuidad:
 * - Se toma la semana actual (lunes a domingo).
 * - Si la semana actual tiene al menos 1 entreno terminado, la racha cuenta la semana actual
 *   y sigue contando hacia atrás semana a semana consecutiva.
 * - Si la semana actual AÚN NO tiene entrenos terminados, pero la semana inmediatamente anterior sí,
 *   la racha activa NO se rompe (el usuario aún tiene días para entrenar esta semana);
 *   por lo tanto, cuenta las semanas consecutivas hacia atrás empezando desde la semana anterior.
 * - Si ni la semana actual ni la anterior tienen entrenos, la racha es 0.
 */
export function weeklyStreak(workouts: Workout[]): number {
  const finished = workouts.filter((w) => w.finishedAt != null)
  if (finished.length === 0) return 0

  // Guardamos un conjunto con la fecha inicio de cada semana (lunes 00:00) que tuvo entrenos
  const weeksWithWorkouts = new Set<number>()
  for (const w of finished) {
    const date = new Date(w.finishedAt!)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }).getTime()
    weeksWithWorkouts.add(weekStart)
  }

  const now = new Date()
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const currentWeekMs = currentWeekStart.getTime()
  const previousWeekStart = subWeeks(currentWeekStart, 1)
  const previousWeekMs = previousWeekStart.getTime()

  let streak = 0
  let checkWeek: Date

  if (weeksWithWorkouts.has(currentWeekMs)) {
    // La semana actual ya tiene entreno: contamos desde esta semana
    checkWeek = currentWeekStart
  } else if (weeksWithWorkouts.has(previousWeekMs)) {
    // La semana actual aún no tiene entreno, pero la anterior sí: la racha sigue viva
    checkWeek = previousWeekStart
  } else {
    // Ni la semana actual ni la anterior tienen entreno: racha rota
    return 0
  }

  while (weeksWithWorkouts.has(checkWeek.getTime())) {
    streak++
    checkWeek = subWeeks(checkWeek, 1)
  }

  return streak
}

/**
 * Devuelve los exerciseId distintos que aparecen en los entrenamientos realizados
 * (con series completadas o válidas).
 */
export function exercisesPerformed(workouts: Workout[]): string[] {
  const ids = new Set<string>()
  for (const w of workouts) {
    if (!w.entries) continue
    for (const entry of w.entries) {
      if (!entry.exerciseId) continue
      const hasSets = Array.isArray(entry.sets) && entry.sets.length > 0
      if (!hasSets || entry.sets.some((s) => s.completed || isValidSet(s))) {
        ids.add(entry.exerciseId)
      }
    }
  }
  return Array.from(ids)
}

export interface PersonalRecords {
  maxWeight: number
  maxEst1RM: number
  maxVolumeSet: number
  maxReps: number
}

/**
 * Calcula los récords personales (PRs) de un ejercicio específico en todo el historial.
 * Considera únicamente series válidas (completadas y no calentamiento) de entrenos finalizados.
 */
export function personalRecords(
  workouts: Workout[],
  exerciseId: string,
  exerciseType: ExerciseType,
  bodyweightKg?: number
): PersonalRecords {
  let maxWeight = 0
  let maxEst1RM = 0
  let maxVolumeSet = 0
  let maxReps = 0

  const finished = workouts.filter((w) => w.finishedAt != null)

  for (const w of finished) {
    if (!w.entries) continue
    for (const entry of w.entries) {
      if (entry.exerciseId !== exerciseId) continue

      for (const s of entry.sets) {
        if (!isValidSet(s)) continue

        const wVal = Math.max(0, s.weight || 0)
        const rVal = Math.max(0, s.reps || 0)

        if (wVal > maxWeight) maxWeight = wVal
        if (rVal > maxReps) maxReps = rVal

        // 1RM estimado: para peso corporal se puede considerar peso corporal + lastre
        const effectiveWeight =
          exerciseType === 'bodyweight_reps'
            ? (bodyweightKg || 0) + wVal
            : exerciseType === 'bodyweight_assisted'
              ? Math.max(0, (bodyweightKg || 0) - wVal)
              : wVal

        const est = estimated1RM(effectiveWeight, rVal)
        if (est > maxEst1RM) maxEst1RM = est

        const vol = setVolume(s, exerciseType, bodyweightKg)
        if (vol > maxVolumeSet) maxVolumeSet = vol
      }
    }
  }

  return {
    maxWeight: Math.round(maxWeight * 10) / 10,
    maxEst1RM: Math.round(maxEst1RM * 10) / 10,
    maxVolumeSet: Math.round(maxVolumeSet * 10) / 10,
    maxReps,
  }
}

/**
 * Calcula el volumen total agrupado por grupo muscular (Pecho, Espalda, Pierna, etc.).
 * Únicamente sobre entrenos finalizados y series válidas.
 */
export function volumeByMuscle(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  bodyweightKg?: number
): Record<string, number> {
  const result: Record<string, number> = {}
  const finished = workouts.filter((w) => w.finishedAt != null)

  for (const w of finished) {
    if (!w.entries) continue
    for (const entry of w.entries) {
      const ex =
        exercisesById instanceof Map
          ? exercisesById.get(entry.exerciseId)
          : exercisesById?.[entry.exerciseId]
      const muscle = ex?.muscleGroup || 'Otros'
      const exType = ex?.type ?? 'weight_reps'

      let entryVol = 0
      for (const s of entry.sets) {
        entryVol += setVolume(s, exType, bodyweightKg)
      }

      if (entryVol > 0) {
        result[muscle] = (result[muscle] || 0) + entryVol
      }
    }
  }

  // Redondea cada grupo a 1 decimal
  for (const k of Object.keys(result)) {
    result[k] = Math.round(result[k] * 10) / 10
  }

  return result
}

export type SeriesMetric = '1rm' | 'volume' | 'weight' | 'reps'

export interface SeriesDataPoint {
  date: number
  formattedDate: string
  value: number
  workoutName: string
}

/**
 * Puntos para graficar el progreso de un ejercicio en el tiempo (ordenados cronológicamente).
 * Métricas:
 * - '1rm': el mejor 1RM estimado alcanzado en la sesión.
 * - 'volume': el volumen total de ese ejercicio en la sesión.
 * - 'weight': el peso máximo levantado en la sesión.
 * - 'reps': las repeticiones máximas en una serie de la sesión.
 */
export function seriesOverTime(
  workouts: Workout[],
  exerciseId: string,
  metric: SeriesMetric = '1rm',
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  bodyweightKg?: number
): SeriesDataPoint[] {
  const finished = workouts
    .filter((w) => w.finishedAt != null)
    .sort((a, b) => (a.finishedAt || a.startedAt) - (b.finishedAt || b.startedAt))

  const points: SeriesDataPoint[] = []

  for (const w of finished) {
    if (!w.entries) continue
    const matchingEntries = w.entries.filter((e) => e.exerciseId === exerciseId)
    if (matchingEntries.length === 0) continue

    const exType = getExerciseType(exerciseId, exercisesById)
    let bestValue = 0
    let sessionVolume = 0
    let hasValidSets = false

    for (const entry of matchingEntries) {
      for (const s of entry.sets) {
        if (!isValidSet(s)) continue
        hasValidSets = true

        const wVal = Math.max(0, s.weight || 0)
        const rVal = Math.max(0, s.reps || 0)

        const effectiveWeight =
          exType === 'bodyweight_reps'
            ? (bodyweightKg || 0) + wVal
            : exType === 'bodyweight_assisted'
              ? Math.max(0, (bodyweightKg || 0) - wVal)
              : wVal

        const est1rm = estimated1RM(effectiveWeight, rVal)
        const vol = setVolume(s, exType, bodyweightKg)
        sessionVolume += vol

        if (metric === '1rm' && est1rm > bestValue) bestValue = est1rm
        if (metric === 'weight' && wVal > bestValue) bestValue = wVal
        if (metric === 'reps' && rVal > bestValue) bestValue = rVal
      }
    }

    if (!hasValidSets) continue

    const finalVal = metric === 'volume' ? sessionVolume : bestValue
    const timestamp = w.finishedAt || w.startedAt

    points.push({
      date: timestamp,
      formattedDate: format(new Date(timestamp), 'd MMM', { locale: es }),
      value: Math.round(finalVal * 10) / 10,
      workoutName: w.name,
    })
  }

  return points
}

export interface WeeklyHistoryItem {
  weekLabel: string
  startDate: number
  volume: number
  workoutsCount: number
}

/**
 * Genera el desglose semanal de volumen y cantidad de entrenos de las últimas N semanas
 * (de lunes a domingo), ideal para gráficos de barras o área en Recharts.
 */
export function weeklyHistory(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  weeksCount = 12,
  bodyweightKg?: number
): WeeklyHistoryItem[] {
  const finished = workouts.filter((w) => w.finishedAt != null)
  const now = new Date()
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })

  const weeks: WeeklyHistoryItem[] = []

  // De hace (weeksCount - 1) semanas hasta la actual
  for (let i = weeksCount - 1; i >= 0; i--) {
    const wStart = subWeeks(currentWeekStart, i)
    const wEnd = endOfWeek(wStart, { weekStartsOn: 1 })

    // Filtrar entrenos en este intervalo
    const inWeek = finished.filter((w) => {
      const d = new Date(w.finishedAt || w.startedAt)
      return isWithinInterval(d, { start: wStart, end: wEnd })
    })

    let vol = 0
    for (const w of inWeek) {
      vol += workoutVolume(w, exercisesById, bodyweightKg)
    }

    // Formato ej. "14 Oct" o "S1"
    const label = format(wStart, 'd MMM', { locale: es })

    weeks.push({
      weekLabel: label,
      startDate: wStart.getTime(),
      volume: Math.round(vol * 10) / 10,
      workoutsCount: inWeek.length,
    })
  }

  return weeks
}

/**
 * Calcula el volumen total de todos los entrenos finalizados.
 */
export function totalVolume(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  bodyweightKg?: number
): number {
  const finished = workouts.filter((w) => w.finishedAt != null)
  let sum = 0
  for (const w of finished) {
    sum += workoutVolume(w, exercisesById, bodyweightKg)
  }
  return Math.round(sum * 10) / 10
}

/**
 * Calcula el volumen de entrenamientos realizados en la semana actual (lunes a domingo).
 */
export function thisWeekVolume(
  workouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  bodyweightKg?: number
): number {
  const finished = workouts.filter((w) => w.finishedAt != null)
  const now = new Date()
  let sum = 0
  for (const w of finished) {
    const d = new Date(w.finishedAt || w.startedAt)
    if (isSameWeek(d, now, { weekStartsOn: 1 })) {
      sum += workoutVolume(w, exercisesById, bodyweightKg)
    }
  }
  return Math.round(sum * 10) / 10
}

/**
 * Evalúa si una serie específica representa un récord personal histórico (PR)
 * en peso levantado, 1RM estimado o repeticiones para su ejercicio.
 */
export function checkSetPR(
  set: WorkoutSetEntry,
  exerciseType: ExerciseType,
  allTimePR: PersonalRecords,
  bodyweightKg?: number
): { isWeightPR: boolean; is1RMPR: boolean; isRepsPR: boolean; isPR: boolean } {
  if (!isValidSet(set)) {
    return { isWeightPR: false, is1RMPR: false, isRepsPR: false, isPR: false }
  }

  const w = Math.max(0, set.weight || 0)
  const r = Math.max(0, set.reps || 0)

  const effectiveWeight =
    exerciseType === 'bodyweight_reps'
      ? (bodyweightKg || 0) + w
      : exerciseType === 'bodyweight_assisted'
        ? Math.max(0, (bodyweightKg || 0) - w)
        : w

  const est = estimated1RM(effectiveWeight, r)

  const isWeightPR = allTimePR.maxWeight > 0 && w >= allTimePR.maxWeight
  const is1RMPR = allTimePR.maxEst1RM > 0 && est >= allTimePR.maxEst1RM
  const isRepsPR = allTimePR.maxReps > 0 && r >= allTimePR.maxReps

  return {
    isWeightPR,
    is1RMPR,
    isRepsPR,
    isPR: isWeightPR || is1RMPR || isRepsPR,
  }
}

export * from './statsAdvanced'
