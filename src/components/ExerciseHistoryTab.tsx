import { inputWeight, asWeightUnit, convertSetWeight, displayWeight, weightInKg } from '../utils/weightUnits'
import { useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trophy, Star, History } from 'lucide-react'
import type { Exercise, ExerciseType, Workout, WorkoutSetEntry } from '../types'
import { isValidSet, estimated1RM, personalRecords, checkSetPR } from '../utils/stats'

interface ExerciseHistoryTabProps {
  exercise: Exercise
  workouts: Workout[] | undefined
  bodyweightKg?: number
  unit: string
}

function capitalizeFirst(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatSetPerformance(
  set: WorkoutSetEntry,
  exerciseType: ExerciseType,
  unit: string
): string {
  const converted = convertSetWeight(set, asWeightUnit(unit))
  set = { ...converted, weight: converted.weight === undefined ? undefined : Number(inputWeight(converted.weight)) }
  switch (exerciseType) {
    case 'weight_reps':
      return `${set.weight ?? 0} ${unit} × ${set.reps ?? 0} reps`
    case 'bodyweight_reps':
      if (set.weight && set.weight > 0) {
        return `+${set.weight} ${unit} × ${set.reps ?? 0} reps`
      }
      return `${set.reps ?? 0} reps`
    case 'bodyweight_assisted':
      return `-${set.weight ?? 0} ${unit} × ${set.reps ?? 0} reps`
    case 'duration': {
      const s = set.durationSec ?? 0
      const m = Math.floor(s / 60)
      const remS = s % 60
      return m > 0 ? `${m}m ${remS}s` : `${remS}s`
    }
    case 'distance': {
      const dist = `${set.distanceM ?? 0}m`
      const time = set.durationSec ? ` en ${set.durationSec}s` : ''
      return `${dist}${time}`
    }
    default:
      return `${set.weight ?? 0} ${unit} × ${set.reps ?? 0}`
  }
}

export function ExerciseHistoryTab({
  exercise,
  workouts,
  bodyweightKg = 0,
  unit,
}: ExerciseHistoryTabProps) {
  // Récords personales globales del ejercicio
  const allTimePR = useMemo(() => {
    if (!workouts) {
      return { maxWeight: 0, maxEst1RM: 0, maxVolumeSet: 0, maxReps: 0 }
    }
    return personalRecords(workouts, exercise.id, exercise.type, bodyweightKg)
  }, [workouts, exercise.id, exercise.type, bodyweightKg])

  // Desglose de sesiones donde aparece el ejercicio con series válidas
  const sessions = useMemo(() => {
    if (!workouts) return []

    // Orden desc por fecha (finishedAt o startedAt)
    const sorted = [...workouts].sort(
      (a, b) => (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt)
    )

    const list = []

    for (const w of sorted) {
      if (!w.entries || w.entries.length === 0) continue

      const matchingEntries = w.entries.filter((e) => e.exerciseId === exercise.id)
      if (matchingEntries.length === 0) continue

      const validSets: {
        set: WorkoutSetEntry
        originalIndex: number
        est1RM: number
      }[] = []

      let indexCounter = 1
      for (const entry of matchingEntries) {
        for (const s of entry.sets) {
          if (isValidSet(s)) {
            const wVal = Math.max(0, weightInKg(s))
            const rVal = Math.max(0, s.reps || 0)

            const effectiveWeight =
              exercise.type === 'bodyweight_reps'
                ? (bodyweightKg || 0) + wVal
                : exercise.type === 'bodyweight_assisted'
                  ? Math.max(0, (bodyweightKg || 0) - wVal)
                  : wVal

            const est = estimated1RM(effectiveWeight, rVal)
            validSets.push({
              set: s,
              originalIndex: indexCounter,
              est1RM: est,
            })
          }
          indexCounter++
        }
      }

      if (validSets.length > 0) {
        const maxEst1RM = Math.max(...validSets.map((vs) => vs.est1RM))
        const firstBestIndex = validSets.findIndex(
          (vs) => vs.est1RM === maxEst1RM && maxEst1RM > 0
        )

        list.push({
          workout: w,
          validSets,
          maxEst1RM,
          firstBestIndex,
        })
      }
    }

    return list
  }, [workouts, exercise, bodyweightKg])

  return (
    <div className="space-y-4">
      {/* Resumen de récords personales */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface border border-line p-2.5 rounded-md text-center">
          <span className="label-tech block mb-1">
            Peso Máx.
          </span>
          <span className="num text-base font-bold text-white">
            {allTimePR.maxWeight > 0 ? `${displayWeight(allTimePR.maxWeight, unit)} ${unit}` : '-'}
          </span>
        </div>

        <div className="bg-surface border border-line p-2.5 rounded-md text-center">
          <span className="label-tech block mb-1">
            1RM Estimado
          </span>
          <span className="num text-base font-bold text-white flex items-center justify-center gap-1">
            {allTimePR.maxEst1RM > 0 ? (
              <>
                <Trophy size={13} strokeWidth={2} className="text-accent shrink-0" />
                <span>{displayWeight(allTimePR.maxEst1RM, unit)} {unit}</span>
              </>
            ) : (
              '-'
            )}
          </span>
        </div>

        <div className="bg-surface border border-line p-2.5 rounded-md text-center">
          <span className="label-tech block mb-1">
            Máx. Reps
          </span>
          <span className="num text-base font-bold text-white">
            {allTimePR.maxReps > 0 ? `${allTimePR.maxReps} reps` : '-'}
          </span>
        </div>
      </div>

      {/* Lista de sesiones históricas o estado vacío */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          <span className="label-tech text-neutral-400 block pt-1">
            Sesiones registradas ({sessions.length})
          </span>

          {sessions.map(({ workout, validSets, firstBestIndex }) => {
            const sessionDate = new Date(workout.finishedAt || workout.startedAt)
            const dateStr = capitalizeFirst(
              format(sessionDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
            )

            return (
              <div
                key={workout.id}
                className="bg-surface border border-line rounded-md p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-white block truncate">
                      {dateStr}
                    </span>
                    {workout.name && (
                      <span className="text-xs text-neutral-400 block truncate mt-0.5">
                        {workout.name}
                      </span>
                    )}
                  </div>
                  <span className="label-tech bg-surface-elevated border border-line px-2 py-0.5 rounded-sm shrink-0">
                    <span className="num">{validSets.length}</span> {validSets.length === 1 ? 'serie' : 'series'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {validSets.map((vs, idx) => {
                    const isBest = idx === firstBestIndex
                    const prStatus = checkSetPR(
                      vs.set,
                      exercise.type,
                      allTimePR,
                      bodyweightKg
                    )
                    const isPR = prStatus.isPR

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-2 px-2.5 rounded-sm bg-surface-elevated border border-line"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="num w-5 h-5 rounded-full bg-surface text-xs text-neutral-300 font-bold flex items-center justify-center shrink-0 border border-line">
                            {vs.originalIndex}
                          </span>
                          <span className="num font-semibold text-white truncate text-sm">
                            {formatSetPerformance(vs.set, exercise.type, unit)}
                          </span>
                          {vs.set.rpe !== undefined &&
                            vs.set.rpe !== null &&
                            vs.set.rpe > 0 && (
                              <span className="label-tech bg-surface border border-line px-1.5 py-0.5 rounded-sm shrink-0">
                                RPE <span className="num">{vs.set.rpe}</span>
                              </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isBest && (
                            <span className="label-tech inline-flex items-center gap-1 text-white bg-surface border border-line-strong px-2 py-0.5 rounded-sm">
                              <Star size={11} strokeWidth={2} className="text-accent" />
                              <span>Mejor</span>
                            </span>
                          )}
                          {isPR && (
                            <span className="label-tech inline-flex items-center gap-1 text-white bg-surface border border-line-strong px-2 py-0.5 rounded-sm">
                              <Trophy size={11} strokeWidth={2} className="text-accent" />
                              <span>PR</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-md p-6 text-center space-y-2">
          <History size={28} className="mx-auto text-neutral-400" />
          <h4 className="text-sm font-semibold text-white">
            Aún no has registrado este ejercicio
          </h4>
          <p className="text-xs text-neutral-400">
            Completa entrenamientos que incluyan este ejercicio para consultar aquí tus series, marcas y récords.
          </p>
        </div>
      )}
    </div>
  )
}
