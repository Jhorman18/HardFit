import { formatClock, formatNumber } from './format.ts'
import type { ExerciseType, RoutineItemTargetSet } from '../types'
import type { WeightUnit } from './weightUnits'

function number(value: number | undefined): string {
  return value === undefined ? '—' : formatNumber(value, 0, 2)
}

/** Recibe valores ya convertidos a la unidad visible; no altera cargas ni completa huecos. */
export function formatSetSummary(set: RoutineItemTargetSet, type: ExerciseType, unit: WeightUnit): string {
  const reps = number(set.reps) + ' reps'
  if (type === 'duration') return set.durationSec === undefined ? '— s' : formatClock(set.durationSec)
  if (type === 'distance') {
    const distance = number(set.distanceM) + ' m'
    return set.durationSec === undefined ? distance : distance + ' · ' + formatClock(set.durationSec)
  }
  if (type === 'bodyweight_reps') {
    return set.weight ? '+' + number(set.weight) + ' ' + unit + ' × ' + reps : reps + ' · Peso corporal'
  }
  if (type === 'bodyweight_assisted') return number(set.weight) + ' ' + unit + ' asistencia × ' + reps
  return number(set.weight) + ' ' + unit + ' × ' + reps
}
