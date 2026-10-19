import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Timer,
  Trophy,
  Check,
  History,
  Dumbbell,
  Plus,
  Weight,
} from 'lucide-react'
import { db } from '../db'
import type { Exercise, ExerciseType, WorkoutSetEntry } from '../types'
import {
  workoutVolume,
  countValidSets,
  personalRecords,
  checkSetPR,
  isValidSet,
  estimated1RM,
} from '../utils/stats'

function formatDuration(startedAt: number, finishedAt: number | null): string {
  if (!finishedAt) return 'En curso'
  const diffSec = Math.max(0, Math.floor((finishedAt - startedAt) / 1000))
  const hours = Math.floor(diffSec / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  const seconds = diffSec % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes} min`
  }
  return `${seconds} s`
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
  switch (exerciseType) {
    case 'weight_reps':
      return `${set.weight ?? 0} ${unit} × ${set.reps ?? 0} reps`
    case 'bodyweight_reps':
      if (set.weight && set.weight > 0) {
        return `+${set.weight} ${unit} × ${set.reps ?? 0} reps`
      }
      return `${set.reps ?? 0} reps (corporal)`
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

export function HistoryPage() {
  const { id: routeWorkoutId } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const [selectedIdState, setSelectedIdState] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const activeDetailId = routeWorkoutId || selectedIdState

  const workouts = useLiveQuery(
    () => db.workouts.filter((w) => w.finishedAt !== null).toArray(),
    []
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  const unit = (settings && 'units' in settings && settings.units) || 'kg'

  // Peso corporal más reciente registrado en medidas
  const latestBodyweight = useMemo(() => {
    if (!measurements) return 0
    const bwList = measurements
      .filter((m) => m.type === 'bodyweight')
      .sort((a, b) => b.date - a.date)
    return bwList.length > 0 ? bwList[0].value : 0
  }, [measurements])

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    if (exercises) {
      for (const ex of exercises) {
        map.set(ex.id, ex)
      }
    }
    return map
  }, [exercises])

  // Entrenos terminados ordenados desc por fecha
  const sortedWorkouts = useMemo(() => {
    if (!workouts) return []
    return [...workouts].sort((a, b) => (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt))
  }, [workouts])

  // PRs históricos globales por ejercicio
  const prsByExercise = useMemo(() => {
    const map = new Map<string, ReturnType<typeof personalRecords>>()
    if (!workouts || !exercises) return map

    for (const ex of exercises) {
      map.set(ex.id, personalRecords(workouts, ex.id, ex.type, latestBodyweight))
    }
    return map
  }, [workouts, exercises, latestBodyweight])

  const selectedWorkout = useMemo(() => {
    if (!activeDetailId || !workouts) return null
    return workouts.find((w) => w.id === activeDetailId) || null
  }, [activeDetailId, workouts])

  const handleDeleteWorkout = async (id: string) => {
    try {
      await db.workouts.delete(id)
      setDeleteConfirmId(null)
      if (activeDetailId === id) {
        if (routeWorkoutId) {
          navigate('/history')
        } else {
          setSelectedIdState(null)
        }
      }
    } catch (err) {
      console.error('Error al eliminar entrenamiento:', err)
    }
  }

  // --- VISTA DETALLE DEL ENTRENAMIENTO ---
  if (selectedWorkout) {
    const finishedDate = new Date(selectedWorkout.finishedAt || selectedWorkout.startedAt)
    const formattedFullDate = capitalizeFirst(
      format(finishedDate, "EEEE, d 'de' MMMM 'de' yyyy • HH:mm", { locale: es })
    )
    const totalVol = workoutVolume(selectedWorkout, exerciseMap, latestBodyweight)
    const validSetsNum = countValidSets(selectedWorkout)
    const durationText = formatDuration(selectedWorkout.startedAt, selectedWorkout.finishedAt)

    // Contar PRs logrados en este entrenamiento
    let totalWorkoutPRs = 0
    if (selectedWorkout.entries) {
      for (const entry of selectedWorkout.entries) {
        const ex = exerciseMap.get(entry.exerciseId)
        const pr = prsByExercise.get(entry.exerciseId)
        if (!ex || !pr) continue
        for (const s of entry.sets) {
          if (checkSetPR(s, ex.type, pr, latestBodyweight).isPR) {
            totalWorkoutPRs++
          }
        }
      }
    }

    return (
      <div className="p-4 space-y-6">
        {/* Cabecera con botón de retroceso */}
        <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <button
            type="button"
            onClick={() => {
              if (routeWorkoutId) {
                navigate('/history')
              } else {
                setSelectedIdState(null)
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-neutral-300 transition bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl"
          >
            <ChevronLeft size={16} />
            <span>Volver al historial</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteConfirmId(selectedWorkout.id)}
            className="text-xs text-red-400 hover:text-red-300 transition bg-red-950/30 border border-red-900/40 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5"
            title="Eliminar este entreno"
          >
            <Trash2 size={14} />
            <span>Eliminar</span>
          </button>
        </div>

        {/* Título y metadatos */}
        <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300 bg-neutral-800 border border-neutral-700 px-2.5 py-0.5 rounded-full">
              Entrenamiento completado
            </span>
            <span className="text-xs text-neutral-400 font-mono flex items-center gap-1">
              <Timer size={14} className="text-neutral-400" />
              <span>{durationText}</span>
            </span>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">{selectedWorkout.name}</h1>
            <p className="text-xs text-neutral-400 mt-1">{formattedFullDate}</p>
          </div>

          {selectedWorkout.notes && (
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300">
              <strong className="text-neutral-400 block mb-0.5">Notas de la sesión:</strong>
              {selectedWorkout.notes}
            </div>
          )}

          {/* Tarjetas resumen del entreno */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Volumen</span>
              <span className="text-base font-extrabold text-white">
                {totalVol.toLocaleString()} <span className="text-[10px] font-normal text-neutral-400">{unit}</span>
              </span>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Series</span>
              <span className="text-base font-extrabold text-white">{validSetsNum}</span>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Récords</span>
              <span className="text-base font-extrabold text-white flex items-center justify-center gap-1">
                {totalWorkoutPRs > 0 ? (
                  <>
                    <Trophy size={14} className="text-white" />
                    <span>{totalWorkoutPRs}</span>
                  </>
                ) : (
                  '0'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Ejercicios y series realizadas */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Ejercicios Realizados ({selectedWorkout.entries?.length || 0})
          </h2>

          {selectedWorkout.entries?.map((entry, eIdx) => {
            const ex = exerciseMap.get(entry.exerciseId)
            const exType = ex?.type ?? 'weight_reps'
            const pr = prsByExercise.get(entry.exerciseId)

            return (
              <div
                key={`${entry.exerciseId}-${eIdx}`}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="p-3.5 bg-neutral-900/90 border-b border-neutral-800 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {ex?.name || 'Ejercicio desconocido'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span className="text-white font-medium">
                        {ex?.muscleGroup || 'General'}
                      </span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-neutral-400">{ex?.equipment || 'Equipo'}</span>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 font-mono">
                    {entry.sets.length} {entry.sets.length === 1 ? 'serie' : 'series'}
                  </span>
                </div>

                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800">
                        <th className="pb-2 w-8 text-center">#</th>
                        <th className="pb-2 text-left">Rendimiento</th>
                        <th className="pb-2 w-16 text-center">1RM Est.</th>
                        <th className="pb-2 w-12 text-center">RPE</th>
                        <th className="pb-2 text-right">Récord / PR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/40">
                      {entry.sets.map((set, sIdx) => {
                        const isWarmup = set.type === 'warmup'
                        const isValid = isValidSet(set)
                        const prStatus = pr
                          ? checkSetPR(set, exType, pr, latestBodyweight)
                          : { isPR: false, isWeightPR: false, is1RMPR: false, isRepsPR: false }

                        const wVal = Math.max(0, set.weight || 0)
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
                            className={`transition ${
                              !isValid ? 'opacity-40' : prStatus.isPR ? 'bg-neutral-800/30' : ''
                            }`}
                          >
                            <td className="py-2.5 px-1 text-center font-bold">
                              {isWarmup ? (
                                <span className="text-neutral-300 bg-neutral-800 px-1 rounded text-[10px]">
                                  C
                                </span>
                              ) : (
                                <span className="text-neutral-400">{sIdx + 1}</span>
                              )}
                            </td>

                            <td className="py-2.5 px-1 font-semibold text-white">
                              {formatSetPerformance(set, exType, unit)}
                              {!set.completed && (
                                <span className="ml-1 text-[10px] text-red-400 font-normal">
                                  (No completada)
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-1 text-center text-neutral-300 font-mono">
                              {est1rm > 0 ? `${est1rm} ${unit}` : '-'}
                            </td>

                            <td className="py-2.5 px-1 text-center text-neutral-400">
                              {set.rpe ?? '-'}
                            </td>

                            <td className="py-2.5 px-1 text-right">
                              {prStatus.isPR ? (
                                <span className="inline-flex items-center gap-1 bg-neutral-800 text-white border border-neutral-700 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                                  <Trophy size={11} className="text-white" />
                                  <span>
                                    {prStatus.is1RMPR
                                      ? 'PR 1RM'
                                      : prStatus.isWeightPR
                                        ? 'PR Peso'
                                        : 'PR Reps'}
                                  </span>
                                </span>
                              ) : isValid ? (
                                <Check size={14} className="text-white font-bold ml-auto" strokeWidth={2.5} />
                              ) : (
                                <span className="text-neutral-600 text-xs">-</span>
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

        {/* Modal de confirmación para eliminar */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 text-center shadow-2xl">
              <Trash2 size={32} className="text-red-400 mx-auto" />
              <div>
                <h3 className="font-bold text-white text-base">¿Eliminar entrenamiento?</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Esta acción eliminará esta sesión y sus datos de las estadísticas.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteWorkout(deleteConfirmId)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-md"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- VISTA LISTA DEL HISTORIAL ---
  return (
    <div className="p-4 space-y-6">
      <div className="border-b border-neutral-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Historial</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Registro cronológico de todos tus entrenamientos completados.
          </p>
        </div>
        <Link
          to="/workout"
          className="text-xs font-bold bg-white hover:bg-neutral-200 text-black px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shrink-0"
        >
          <Dumbbell size={15} />
          <span>Entrenar</span>
        </Link>
      </div>

      {sortedWorkouts.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-800 text-white flex items-center justify-center mx-auto">
            <History size={32} className="text-neutral-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Sin entrenamientos terminados</h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
              Aún no has registrado ninguna sesión completa. Termina un entrenamiento y aquí
              podrás ver su duración, tonelaje y récords.
            </p>
          </div>
          <Link
            to="/workout"
            className="inline-flex items-center gap-2 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-md"
          >
            <Plus size={16} />
            <span>Iniciar primer entreno</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-neutral-400 flex items-center justify-between px-1">
            <span>{sortedWorkouts.length} entrenamientos guardados</span>
            <span>Toca para ver detalle y PRs</span>
          </div>

          {sortedWorkouts.map((w) => {
            const finishedDate = new Date(w.finishedAt || w.startedAt)
            const dateStr = capitalizeFirst(
              format(finishedDate, "EEEE, d 'de' MMMM", { locale: es })
            )
            const vol = workoutVolume(w, exerciseMap, latestBodyweight)
            const validSets = countValidSets(w)
            const duration = formatDuration(w.startedAt, w.finishedAt)

            // Contar PRs logrados en este entrenamiento
            let workoutPRs = 0
            if (w.entries) {
              for (const entry of w.entries) {
                const ex = exerciseMap.get(entry.exerciseId)
                const pr = prsByExercise.get(entry.exerciseId)
                if (!ex || !pr) continue
                for (const s of entry.sets) {
                  if (checkSetPR(s, ex.type, pr, latestBodyweight).isPR) {
                    workoutPRs++
                  }
                }
              }
            }

            return (
              <div
                key={w.id}
                onClick={() => setSelectedIdState(w.id)}
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 p-4 rounded-2xl transition cursor-pointer space-y-3 shadow-sm group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-neutral-400 block">
                      {dateStr}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-neutral-200 transition">
                      {w.name}
                    </h3>
                  </div>
                  <ChevronRight size={16} className="text-neutral-500 group-hover:text-neutral-300 transition" />
                </div>

                <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono pt-1 border-t border-neutral-800">
                  <span className="flex items-center gap-1">
                    <Timer size={13} className="text-neutral-400" />
                    <span>{duration}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Weight size={13} className="text-neutral-400" />
                    <strong className="text-white">{vol.toLocaleString()}</strong> {unit}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-white">{validSets}</strong> series
                  </span>
                  {workoutPRs > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-white font-bold flex items-center gap-1">
                        <Trophy size={13} className="text-white" />
                        <span>{workoutPRs} PR</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
