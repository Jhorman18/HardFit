import { useMemo, useState } from 'react'
import { getSetBadge } from '../../utils/setTypes'
import { useNavigate } from 'react-router-dom'
import { FileText, Trophy, Trash2, ArrowLeft, ListPlus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Workout, Exercise, WorkoutSetEntry, ExerciseType } from '../../types'
import { db } from '../../db'
import { ExerciseDemo } from '../ExerciseDemo'
import { buildRoutineFromWorkout } from '../../utils/workoutToRoutine'
import {
  workoutVolume,
  countValidSets,
  checkSetPR,
  isValidSet,
  estimated1RM,
  type personalRecords,
} from '../../utils/stats'
import {
  displayWeight,
  weightInKg,
  getEntryWeightUnit,
  convertSetWeight,
  asWeightUnit,
  inputWeight,
} from '../../utils/weightUnits'
import { formatNumber, formatWeight, formatClock } from '../../utils/format'
import { ScreenHeader, HeaderIconButton, RecordLights, Sheet } from '../ui'

interface HistoryDetailProps {
  workout: Workout
  exerciseMap: Map<string, Exercise>
  prsByExercise: Map<string, ReturnType<typeof personalRecords>>
  latestBodyweight: number
  unit: string
  showRpe: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onPreviewExercise: (id: string) => void
}

function formatSetDisplay(
  set: WorkoutSetEntry,
  exerciseType: ExerciseType,
  unit: string
): { weightStr: string; repsStr: string } {
  const converted = convertSetWeight(set, asWeightUnit(unit))
  const numWeight =
    converted.weight === undefined ? 0 : Number(inputWeight(converted.weight))

  switch (exerciseType) {
    case 'bodyweight_reps': {
      const wStr = numWeight > 0 ? `+${formatWeight(numWeight)}` : 'Corporal'
      return { weightStr: wStr, repsStr: `${set.reps ?? 0}` }
    }
    case 'bodyweight_assisted': {
      return { weightStr: `-${formatWeight(numWeight)}`, repsStr: `${set.reps ?? 0}` }
    }
    case 'duration': {
      const s = set.durationSec ?? 0
      return { weightStr: '—', repsStr: `${s} s` }
    }
    case 'distance': {
      const dist = `${set.distanceM ?? 0} m`
      const s = set.durationSec ? ` · ${set.durationSec} s` : ''
      return { weightStr: dist, repsStr: s || '—' }
    }
    case 'weight_reps':
    default:
      return { weightStr: formatWeight(numWeight), repsStr: `${set.reps ?? 0}` }
  }
}

export function HistoryDetail({
  workout,
  exerciseMap,
  prsByExercise,
  latestBodyweight,
  unit,
  showRpe,
  onBack,
  onEdit,
  onDelete,
  onPreviewExercise,
}: HistoryDetailProps) {
  const navigate = useNavigate()

  const [isSaveRoutineOpen, setIsSaveRoutineOpen] = useState(false)
  const [routineName, setRoutineName] = useState(workout.name)

  const previewRoutine = useMemo(
    () => buildRoutineFromWorkout(workout, workout.name),
    [workout]
  )

  const hasWarmups = useMemo(() => {
    return (workout.entries ?? []).some((e) => (e.sets ?? []).some((s) => s.type === 'warmup'))
  }, [workout])

  const exercisesText = useMemo(() => {
    if (!previewRoutine) return ''
    const count = previewRoutine.items.length
    const phrase =
      count === 1
        ? 'Se copia 1 ejercicio con sus pesos y repeticiones.'
        : `Se copian ${count} ejercicios con sus pesos y repeticiones.`
    return hasWarmups ? `${phrase} Los calentamientos no se incluyen.` : phrase
  }, [previewRoutine, hasWarmups])

  const handleCreateRoutine = async () => {
    const trimmed = routineName.trim()
    if (!trimmed) return
    const routine = buildRoutineFromWorkout(workout, trimmed)
    if (!routine) return
    try {
      await db.routines.add(routine)
      navigate(`/routines/${routine.id}/edit`)
    } catch (err) {
      console.error('Error guardando rutina:', err)
    }
  }

  const workoutDate = new Date(workout.finishedAt || workout.startedAt)
  const dateStr = format(workoutDate, "EEEE d 'de' MMMM", { locale: es })
  const timeStr = format(workoutDate, 'HH:mm')
  const formattedSubtitle = `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} · ${timeStr}`

  const durationSec =
    workout.finishedAt && workout.startedAt
      ? Math.max(0, Math.floor((workout.finishedAt - workout.startedAt) / 1000))
      : 0
  const totalVol = displayWeight(workoutVolume(workout, exerciseMap, latestBodyweight), unit)
  const validSetsNum = countValidSets(workout)

  // Contar PRs logrados en este entrenamiento
  const totalWorkoutPRs = useMemo(() => {
    let prs = 0
    if (!workout.entries) return 0
    for (const entry of workout.entries) {
      const ex = exerciseMap.get(entry.exerciseId)
      const pr = prsByExercise.get(entry.exerciseId)
      if (!ex || !pr) continue
      for (const s of entry.sets) {
        if (checkSetPR(s, ex.type, pr, latestBodyweight).isPR) {
          prs++
        }
      }
    }
    return prs
  }, [workout, exerciseMap, prsByExercise, latestBodyweight])

  return (
    <div className="flex-1 flex flex-col bg-black">
      <ScreenHeader
        title={workout.name}
        subtitle={formattedSubtitle}
        leading={
          <HeaderIconButton label="Atrás" onClick={onBack}>
            <ArrowLeft size={20} strokeWidth={1.75} />
          </HeaderIconButton>
        }
        actions={
          <button
            type="button"
            onClick={onEdit}
            className="press px-3.5 py-1.5 rounded-md text-xs font-bold bg-accent text-accent-fg mr-2"
          >
            Editar
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Datos resumen (4 filas limpias) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-surface border border-line rounded-md text-center">
          <div className="p-2">
            <span className="label-tech block">Duración</span>
            <span className="num text-xl font-bold text-white mt-0.5 block">
              {formatClock(durationSec)}
            </span>
          </div>
          <div className="p-2 border-l border-line">
            <span className="label-tech block">Volumen</span>
            <span className="num text-xl font-bold text-white mt-0.5 block">
              {formatNumber(totalVol)} <span className="text-xs font-normal text-neutral-400">{unit}</span>
            </span>
          </div>
          <div className="p-2 border-t sm:border-t-0 sm:border-l border-line">
            <span className="label-tech block">Series</span>
            <span className="num text-xl font-bold text-white mt-0.5 block">{validSetsNum}</span>
          </div>
          <div className="p-2 border-t sm:border-t-0 border-l border-line">
            <span className="label-tech block">Récords</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className="num text-xl font-bold text-white">{totalWorkoutPRs}</span>
              <RecordLights lit={totalWorkoutPRs > 0} size={5} />
            </div>
          </div>
        </section>

        {/* Nota del entreno si existe */}
        {workout.notes && workout.notes.trim().length > 0 && (
          <div className="p-3 bg-surface border border-line rounded-md flex items-start gap-2.5">
            <FileText size={16} className="text-neutral-400 shrink-0 mt-0.5" />
            <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {workout.notes}
            </div>
          </div>
        )}

        {/* Ejercicios realizados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Ejercicios</h2>
            <span className="label-tech">
              {workout.entries?.length || 0} {workout.entries?.length === 1 ? 'ejercicio' : 'ejercicios'}
            </span>
          </div>

          {workout.entries?.map((entry, eIdx) => {
            const entryUnit = getEntryWeightUnit(workout, entry, asWeightUnit(unit))
            const ex = exerciseMap.get(entry.exerciseId)
            const exType = ex?.type ?? 'weight_reps'
            const pr = prsByExercise.get(entry.exerciseId)
            const validSets = (entry.sets || []).filter(isValidSet)

            return (
              <div
                key={`${entry.exerciseId}-${eIdx}`}
                className="panel overflow-hidden"
              >
                <div className="p-3.5 bg-surface border-b border-line flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onPreviewExercise(entry.exerciseId)}
                    className="press text-left min-w-0"
                  >
                    <h3 className="font-semibold text-white text-base truncate hover:text-accent">
                      {ex?.name || 'Ejercicio desconocido'}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {ex?.muscleGroup || 'General'} · {ex?.equipment || 'Equipo'}
                    </p>
                  </button>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ExerciseDemo
                      exerciseId={entry.exerciseId}
                      variant="thumb"
                      alt={ex?.name ?? 'Ejercicio'}
                      onClick={() => onPreviewExercise(entry.exerciseId)}
                    />
                    <span className="num text-xs text-neutral-400">
                      {validSets.length} {validSets.length === 1 ? 'serie' : 'series'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-surface/50 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3 text-left">
                          {exType === 'duration' ? 'Tiempo' : exType === 'distance' ? 'Distancia' : `Peso (${entryUnit})`}
                        </th>
                        <th className="py-2 px-3 text-left">Reps</th>
                        {showRpe && <th className="py-2 px-3 text-center w-14">RPE</th>}
                        <th className="py-2 px-3 text-center w-20">1RM Est.</th>
                        <th className="py-2 px-3 text-right">PR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {entry.sets.map((set, sIdx) => {
                        const isValid = isValidSet(set)
                        const prStatus = pr
                          ? checkSetPR(set, exType, pr, latestBodyweight)
                          : { isPR: false, isWeightPR: false, is1RMPR: false, isRepsPR: false }

                        const { weightStr, repsStr } = formatSetDisplay(set, exType, entryUnit)
                        const wVal = Math.max(0, weightInKg(set))
                        const rVal = Math.max(0, set.reps || 0)
                        const effectiveW =
                          exType === 'bodyweight_reps'
                            ? (latestBodyweight || 0) + wVal
                            : exType === 'bodyweight_assisted'
                              ? Math.max(0, (latestBodyweight || 0) - wVal)
                              : wVal
                        const est1rm = isValid ? estimated1RM(effectiveW, rVal) : 0

                        return (
                          <tr
                            key={sIdx}
                            className={`hover:bg-elevated/40 ${!isValid ? 'opacity-40' : ''}`}
                          >
                            <td className="py-2.5 px-3 text-center num text-neutral-400">
                              {getSetBadge(entry.sets, sIdx)}
                            </td>

                            <td className="py-2.5 px-3 num text-white font-semibold">
                              {weightStr}
                            </td>

                            <td className="py-2.5 px-3 num text-neutral-300">
                              {repsStr}
                            </td>

                            {showRpe && (
                              <td className="py-2.5 px-3 text-center num text-neutral-400">
                                {set.rpe ?? '—'}
                              </td>
                            )}

                            <td className="py-2.5 px-3 text-center num text-neutral-400">
                              {est1rm > 0 ? `${formatNumber(displayWeight(est1rm, entryUnit))}` : '—'}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              {prStatus.isPR ? (
                                <span className="inline-flex items-center gap-1">
                                  <Trophy size={13} className="text-white" />
                                  <RecordLights lit={true} size={4} />
                                </span>
                              ) : isValid ? (
                                <span className="text-neutral-400 num">✓</span>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>

        {/* Acciones inferiores */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setRoutineName(workout.name)
              setIsSaveRoutineOpen(true)
            }}
            className="btn-secondary w-full"
          >
            <ListPlus size={18} strokeWidth={1.75} />
            <span>Guardar como rutina</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/workout/summary/${workout.id}`)}
            className="btn-secondary w-full"
          >
            <span>Ver resumen de este entreno</span>
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="press flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-md text-sm font-semibold text-red-400 hover:text-red-300 bg-surface border border-line"
          >
            <Trash2 size={16} />
            <span>Eliminar entrenamiento</span>
          </button>
        </div>
      </div>

      {isSaveRoutineOpen && (
        <Sheet
          title="Guardar como rutina"
          onClose={() => setIsSaveRoutineOpen(false)}
          footer={
            previewRoutine ? (
              <button
                type="button"
                disabled={!routineName.trim()}
                onClick={handleCreateRoutine}
                className="btn-primary w-full"
              >
                Crear rutina
              </button>
            ) : undefined
          }
        >
          {previewRoutine ? (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="save-routine-name" className="label-tech block">
                  Nombre
                </label>
                <input
                  id="save-routine-name"
                  type="text"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  className="field"
                  autoFocus
                />
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {exercisesText}
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-400 py-2">
              Este entreno no tiene series completadas.
            </p>
          )}
        </Sheet>
      )}
    </div>
  )
}
