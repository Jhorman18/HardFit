import { useMemo } from 'react'
import { formatNumber } from '../../utils/format'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { weightInKg, type WeightUnit } from '../../utils/weightUnits'
import type { Exercise, WorkoutSetEntry, Workout } from '../../types'

export function useExerciseMap() {
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => {
    const map = new Map<string, Exercise>()
    if (exercises) for (const ex of exercises) map.set(ex.id, ex)
    return map
  }, [exercises])
}

export function usePreviousHistoryMap() {
  const pastWorkouts = useLiveQuery(() => db.workouts.toArray(), [])
  return useMemo(() => {
    const map = new Map<string, WorkoutSetEntry[]>()
    if (!pastWorkouts) return map
    const finished = pastWorkouts
      .filter((w) => w.finishedAt !== null)
      .sort((a, b) => b.startedAt - a.startedAt)
    for (const w of finished) {
      if (!w.entries) continue
      for (const entry of w.entries) {
        if (!map.has(entry.exerciseId) && entry.sets && entry.sets.length > 0) {
          map.set(entry.exerciseId, entry.sets)
        }
      }
    }
    return map
  }, [pastWorkouts])
}

export function useAppSettings() {
  return useLiveQuery(() => db.settings.get('app'), [])
}

export function getSetNumberLabel(sets: WorkoutSetEntry[], index: number): string {
  const currentSet = sets[index]
  if (currentSet.type === 'warmup') {
    let warmupCount = 0
    for (let i = 0; i <= index; i++) {
      if (sets[i].type === 'warmup') warmupCount++
    }
    const totalWarmups = sets.filter((s) => s.type === 'warmup').length
    return totalWarmups > 1 ? `C${warmupCount}` : 'C'
  } else {
    let normalCount = 0
    for (let i = 0; i <= index; i++) {
      if (sets[i].type !== 'warmup') normalCount++
    }
    return String(normalCount)
  }
}

export function formatDurationSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatPreviousSet(
  exercise: Exercise | undefined,
  prevSet: WorkoutSetEntry | undefined,
  unit: WeightUnit,
): string {
  if (!prevSet) return '-'
  const type = exercise?.type ?? 'weight_reps'
  const w = formatNumber(prevSet.weight ?? 0, 0, 1)

  switch (type) {
    case 'weight_reps':
      return `${w} ${unit} × ${prevSet.reps ?? 0}`
    case 'bodyweight_reps':
      if (prevSet.weight && prevSet.weight > 0) {
        return `+${w}${unit} × ${prevSet.reps ?? 0}`
      }
      return `${prevSet.reps ?? 0} reps`
    case 'bodyweight_assisted':
      return `-${w}${unit} × ${prevSet.reps ?? 0}`
    case 'duration':
      return formatDurationSec(prevSet.durationSec ?? 0)
    case 'distance': {
      const distStr = `${prevSet.distanceM ?? 0}m`
      const timeStr = prevSet.durationSec ? ` (${formatDurationSec(prevSet.durationSec)})` : ''
      return `${distStr}${timeStr}`
    }
    default:
      return '-'
  }
}

/** Determina si una serie confirmada es récord frente a la serie anterior correspondiente. */
export function isSetRecord(
  set: WorkoutSetEntry,
  prevSet: WorkoutSetEntry | undefined,
): boolean {
  if (!prevSet) return false
  if (set.type === 'warmup') return false
  if (!set.completed) return false
  const curW = weightInKg(set)
  const prevW = weightInKg(prevSet)
  const curR = set.reps ?? 0
  const prevR = prevSet.reps ?? 0
  if (curW < prevW || curR < prevR) return false
  return curW > prevW || curR > prevR
}

/** Siguiente serie pendiente después de la dada; si no queda ninguna detrás, la primera pendiente. */
export function findNextPendingSet(
  workout: Workout,
  after?: { entryIndex: number; setIndex: number },
): { entryIndex: number; setIndex: number } | null {
  const pending: { entryIndex: number; setIndex: number }[] = []
  workout.entries.forEach((entry, entryIndex) => {
    entry.sets.forEach((set, setIndex) => {
      if (!set.completed) pending.push({ entryIndex, setIndex })
    })
  })
  const ahead =
    after &&
    pending.find(
      (p) =>
        p.entryIndex > after.entryIndex ||
        (p.entryIndex === after.entryIndex && p.setIndex > after.setIndex),
    )
  return ahead ?? pending[0] ?? null
}

/** Barbell equipment strings that show bar glyph. */
export const BARBELL_EQUIPMENT = new Set(['Barra', 'Barra Z', 'Máquina (Smith)'])

export function isBarExercise(exercise: Exercise | undefined): boolean {
  if (!exercise) return false
  return BARBELL_EQUIPMENT.has(exercise.equipment)
}
