import type { Measurement, Routine, RoutineItem, Workout, WorkoutEntry } from '../types'

export type WeightUnit = 'kg' | 'lb'
export const KG_PER_LB = 0.45359237

export function asWeightUnit(value: unknown, fallback: WeightUnit = 'kg'): WeightUnit {
  return value === 'kg' || value === 'lb' ? value : fallback
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (!Number.isFinite(value)) return 0
  if (from === to) return value
  return from === 'lb' ? value * KG_PER_LB : value / KG_PER_LB
}

export function weightInKg(set: { weight?: number; weightUnit?: WeightUnit }): number {
  return Math.round(convertWeight(set.weight ?? 0, set.weightUnit ?? 'kg', 'kg') * 1e8) / 1e8
}

export function displayWeight(kg: number, unit: string): number {
  return Math.round(convertWeight(kg, 'kg', asWeightUnit(unit)) * 10) / 10
}

export function inputWeight(value: number | undefined): number | '' {
  return value === undefined ? '' : Math.round(value * 1000) / 1000
}

export function convertSetWeight<T extends { weight?: number; weightUnit?: WeightUnit }>(
  set: T, to: WeightUnit, fallback: WeightUnit = 'kg',
): T {
  return {
    ...set,
    weight: set.weight === undefined ? undefined : convertWeight(set.weight, set.weightUnit ?? fallback, to),
    weightUnit: to,
  }
}

export function getEntryWeightUnit(
  workout: Pick<Workout, 'weightUnit'>,
  entry: Pick<WorkoutEntry, 'weightUnit'>,
  fallback: WeightUnit = 'kg',
): WeightUnit {
  return entry.weightUnit ?? workout.weightUnit ?? fallback
}

/** Los registros antiguos no tenían unidad: se conserva su valor y se identifica con su ajuste original. */
export function stampWorkoutWeightUnits(workout: Workout, fallback: WeightUnit): Workout {
  const weightUnit = asWeightUnit(workout.weightUnit, fallback)
  return {
    ...workout, weightUnit,
    entries: (workout.entries ?? []).map(entry => ({
      ...entry,
      sets: (entry.sets ?? []).map(set => ({ ...set, weightUnit: asWeightUnit(set.weightUnit, entry.weightUnit ?? weightUnit) })),
    })),
  }
}

export function stampRoutineWeightUnits(routine: Routine, fallback: WeightUnit): Routine {
  const weightUnit = asWeightUnit(routine.weightUnit, fallback)
  return {
    ...routine, weightUnit,
    items: (routine.items ?? []).map(item => ({
      ...item,
      targetSets: (item.targetSets ?? []).map(set => ({ ...set, weightUnit: asWeightUnit(set.weightUnit, item.weightUnit ?? weightUnit) })),
    })),
  }
}

/** Cambiar la unidad convierte el peso físico; no cambia repeticiones, descansos ni finalización. */
export function changeWorkoutWeightUnit(workout: Workout, unit: WeightUnit): Workout {
  const previous = workout.weightUnit ?? 'kg'
  return {
    ...workout, weightUnit: unit,
    entries: workout.entries.map(entry => entry.weightUnit ? entry : ({
      ...entry, sets: entry.sets.map(set => convertSetWeight(set, unit, previous)),
    })),
  }
}

export function changeEntryWeightUnit(workout: Workout, entryIndex: number, unit: WeightUnit | null): Workout {
  return {
    ...workout,
    entries: workout.entries.map((entry, index) => {
      if (index !== entryIndex) return entry
      const target = unit ?? workout.weightUnit ?? 'kg'
      const { weightUnit: _previous, ...rest } = entry
      return {
        ...rest, ...(unit ? { weightUnit: unit } : {}),
        sets: entry.sets.map(set => convertSetWeight(set, target, getEntryWeightUnit(workout, entry))),
      }
    }),
  }
}

export function changeRoutineItemWeightUnit(item: RoutineItem, globalUnit: WeightUnit, unit: WeightUnit | null): RoutineItem {
  const { weightUnit: _previous, ...rest } = item
  return {
    ...rest, ...(unit ? { weightUnit: unit } : {}),
    targetSets: item.targetSets.map(set => convertSetWeight(set, unit ?? globalUnit, item.weightUnit ?? globalUnit)),
  }
}

export function getLatestBodyweightKg(measurements?: Measurement[]): number {
  const latest = measurements?.filter(item => item.type === 'bodyweight').sort((a, b) => b.date - a.date)[0]
  return latest ? convertWeight(latest.value, asWeightUnit(latest.unit), 'kg') : 0
}
