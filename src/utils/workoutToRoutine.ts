import type { Routine, RoutineItem, RoutineItemTargetSet, Workout } from '../types'
import { isValidSet } from './stats'
import { getEntryWeightUnit } from './weightUnits'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function buildRoutineFromWorkout(workout: Workout, name: string): Routine | null {
  if (!workout.entries || workout.entries.length === 0) {
    return null
  }

  const items: RoutineItem[] = []

  for (const entry of workout.entries) {
    const validSets = (entry.sets ?? []).filter(isValidSet)
    if (validSets.length === 0) {
      continue
    }

    const itemWeightUnit = getEntryWeightUnit(workout, entry)
    const restSeconds = entry.restSeconds ?? workout.restSeconds

    const targetSets: RoutineItemTargetSet[] = validSets.map((set) => {
      const ts: RoutineItemTargetSet = {
        weightUnit: set.weightUnit ?? itemWeightUnit,
      }
      if (set.reps !== undefined && !Number.isNaN(set.reps)) {
        ts.reps = set.reps
      }
      if (set.weight !== undefined && !Number.isNaN(set.weight)) {
        ts.weight = set.weight
      }
      if (set.rpe !== undefined && !Number.isNaN(set.rpe)) {
        ts.rpe = set.rpe
      }
      if (set.durationSec !== undefined && !Number.isNaN(set.durationSec)) {
        ts.durationSec = set.durationSec
      }
      if (set.distanceM !== undefined && !Number.isNaN(set.distanceM)) {
        ts.distanceM = set.distanceM
      }
      return ts
    })

    const item: RoutineItem = {
      exerciseId: entry.exerciseId,
      order: items.length,
      weightUnit: itemWeightUnit,
      ...(restSeconds !== undefined ? { restSeconds } : {}),
      targetSets,
    }

    items.push(item)
  }

  if (items.length === 0) {
    return null
  }

  return {
    id: generateId(),
    name: name.trim(),
    folderId: null,
    order: Date.now(),
    ...(workout.weightUnit ? { weightUnit: workout.weightUnit } : {}),
    ...(workout.restSeconds !== undefined ? { restSeconds: workout.restSeconds } : {}),
    items,
  }
}
