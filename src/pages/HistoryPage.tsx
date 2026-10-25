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
  Pencil,
  ArrowLeftRight,
} from 'lucide-react'
import { db } from '../db'
import { ExerciseDemo } from '../components/ExerciseDemo'
import { ExercisePreviewModal } from '../components/ExercisePreviewModal'
import { ExerciseSelectorModal } from '../components/ExerciseSelectorModal'
import type { Exercise, ExerciseType, WorkoutSetEntry, Workout } from '../types'
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
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)

  const activeDetailId = routeWorkoutId || selectedIdState

  const workouts = useLiveQuery(
    () => db.workouts.filter((w) => w.finishedAt !== null).toArray(),
    []
  )

  const selectedWorkout = useMemo(() => {
    if (!activeDetailId || !workouts) return null
    return workouts.find((w) => w.id === activeDetailId) || null
  }, [activeDetailId, workouts])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  const unit = (settings && 'units' in settings && settings.units) || 'kg'
  const showRpe = !!(settings && 'showRpe' in settings && settings.showRpe)

  const [isEditing, setIsEditing] = useState(false)
  const [editWorkout, setEditWorkout] = useState<Workout | null>(null)
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false)
  const [replacingEntryIndex, setReplacingEntryIndex] = useState<number | null>(null)

  const handleStartEdit = () => {
    if (!selectedWorkout) return
    setEditWorkout(JSON.parse(JSON.stringify(selectedWorkout)))
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditWorkout(null)
  }

  const handleSaveEdit = async () => {
    if (!editWorkout) return
    await db.workouts.put(editWorkout)
    setIsEditing(false)
    setEditWorkout(null)
  }

  const handleUpdateSet = (entryIdx: number, setIdx: number, patch: Partial<WorkoutSetEntry>) => {
    if (!editWorkout) return
    const newEntries = [...editWorkout.entries]
    const currentEntry = { ...newEntries[entryIdx] }
    const newSets = [...currentEntry.sets]
    newSets[setIdx] = { ...newSets[setIdx], ...patch }
    currentEntry.sets = newSets
    newEntries[entryIdx] = currentEntry
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  const handleToggleSetWarmup = (entryIdx: number, setIdx: number) => {
    if (!editWorkout) return
    const set = editWorkout.entries[entryIdx]?.sets[setIdx]
    if (!set) return
    const nextType = set.type === 'warmup' ? 'normal' : 'warmup'
    handleUpdateSet(entryIdx, setIdx, { type: nextType })
  }

  const handleAddSet = (entryIdx: number) => {
    if (!editWorkout) return
    const newEntries = [...editWorkout.entries]
    const currentEntry = { ...newEntries[entryIdx] }
    const currentSets = currentEntry.sets || []
    const lastSet = currentSets[currentSets.length - 1]
    const newSet: WorkoutSetEntry = {
      type: 'normal',
      weight: lastSet?.weight,
      reps: lastSet?.reps,
      rpe: lastSet?.rpe,
      completed: true,
    }
    currentEntry.sets = [...currentSets, newSet]
    newEntries[entryIdx] = currentEntry
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  const handleRemoveSet = (entryIdx: number, setIdx: number) => {
    if (!editWorkout) return
    const newEntries = [...editWorkout.entries]
    const currentEntry = { ...newEntries[entryIdx] }
    currentEntry.sets = currentEntry.sets.filter((_, idx) => idx !== setIdx)
    newEntries[entryIdx] = currentEntry
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  const handleRemoveExercise = (entryIdx: number) => {
    if (!editWorkout) return
    const newEntries = editWorkout.entries.filter((_, idx) => idx !== entryIdx)
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  const handleAddExercisesToWorkout = (exerciseIds: string[]) => {
    if (!editWorkout) return
    if (replacingEntryIndex !== null) {
      if (exerciseIds.length > 0) {
        const newEntries = [...editWorkout.entries]
        newEntries[replacingEntryIndex] = {
          ...newEntries[replacingEntryIndex],
          exerciseId: exerciseIds[0],
        }
        setEditWorkout({ ...editWorkout, entries: newEntries })
      }
      setReplacingEntryIndex(null)
      return
    }
    const newEntries = [...editWorkout.entries]
    for (const id of exerciseIds) {
      newEntries.push({
        exerciseId: id,
        sets: [{ type: 'normal', weight: 0, reps: 0, completed: true }],
      })
    }
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  const handleCreatePastWorkout = async () => {
    const now = Date.now()
    const newWorkout: Workout = {
      id: `workout-past-${now}-${Math.random().toString(36).substring(2, 7)}`,
      name: 'Entrenamiento',
      startedAt: now - 3600 * 1000,
      finishedAt: now,
      routineId: null,
      notes: '',
      entries: [],
    }
    await db.workouts.add(newWorkout)
    setSelectedIdState(newWorkout.id)
    setEditWorkout(newWorkout)
    setIsEditing(true)
  }

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

  // --- VISTA EDICIÓN DEL ENTRENAMIENTO ---
  if (selectedWorkout && isEditing && editWorkout) {
    const durationMinutes = Math.max(
      1,
      Math.round(((editWorkout.finishedAt || editWorkout.startedAt) - editWorkout.startedAt) / 60000)
    )
    const startDateFormatted = format(new Date(editWorkout.startedAt), "yyyy-MM-dd'T'HH:mm")

    return (
      <div className="p-4 space-y-6 max-w-2xl mx-auto pb-28">
        {/* Cabecera de edición */}
        <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3 sticky top-0 bg-[#0b0f14]/90 backdrop-blur-md z-30 pt-1">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl"
          >
            <span>Cancelar</span>
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Editar Entrenamiento
          </span>

          <button
            type="button"
            onClick={handleSaveEdit}
            className="flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-neutral-200 text-black px-3.5 py-1.5 rounded-xl transition shadow-md active:scale-95"
          >
            <Check size={15} strokeWidth={2.5} />
            <span>Guardar</span>
          </button>
        </div>

        {/* Tarjeta de metadatos editables */}
        <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 space-y-4 shadow-sm">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
              Nombre del entrenamiento
            </label>
            <input
              type="text"
              value={editWorkout.name}
              onChange={(e) => setEditWorkout({ ...editWorkout, name: e.target.value })}
              placeholder="Nombre del entreno..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                Fecha y hora de inicio
              </label>
              <input
                type="datetime-local"
                value={startDateFormatted}
                onChange={(e) => {
                  const val = e.target.value
                  if (!val) return
                  const newStart = new Date(val).getTime()
                  if (!Number.isNaN(newStart)) {
                    const diff = (editWorkout.finishedAt || editWorkout.startedAt) - editWorkout.startedAt
                    setEditWorkout({
                      ...editWorkout,
                      startedAt: newStart,
                      finishedAt: newStart + diff,
                    })
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                Duración (minutos)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={durationMinutes}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value) || 1)
                  setEditWorkout({
                    ...editWorkout,
                    finishedAt: editWorkout.startedAt + val * 60000,
                  })
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
              Notas de la sesión
            </label>
            <textarea
              rows={2}
              value={editWorkout.notes || ''}
              onChange={(e) => setEditWorkout({ ...editWorkout, notes: e.target.value })}
              placeholder="Notas opcionales sobre cómo te sentiste, sensaciones, etc."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition resize-none"
            />
          </div>
        </div>

        {/* Lista de ejercicios con edición de series */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Ejercicios ({editWorkout.entries?.length || 0})
            </h2>
            <button
              type="button"
              onClick={() => setIsAddExerciseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-white transition"
            >
              <Plus size={14} />
              <span>Añadir ejercicio</span>
            </button>
          </div>

          {editWorkout.entries.length === 0 ? (
            <div className="text-center py-8 bg-neutral-900/60 rounded-2xl border border-dashed border-neutral-800 space-y-3 p-4">
              <Dumbbell size={28} className="mx-auto text-neutral-600" />
              <p className="text-xs text-neutral-400">No hay ejercicios en este entrenamiento.</p>
              <button
                type="button"
                onClick={() => setIsAddExerciseOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-black text-xs font-bold"
              >
                <Plus size={14} />
                <span>Añadir primer ejercicio</span>
              </button>
            </div>
          ) : (
            editWorkout.entries.map((entry, eIdx) => {
              const ex = exerciseMap.get(entry.exerciseId)

              return (
                <div
                  key={`${entry.exerciseId}-${eIdx}`}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Encabezado del ejercicio */}
                  <div className="p-3.5 bg-neutral-900/90 border-b border-neutral-800 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <ExerciseDemo
                        exerciseId={entry.exerciseId}
                        variant="thumb"
                        alt={ex?.name || 'Ejercicio'}
                        onClick={() => setPreviewExerciseId(entry.exerciseId)}
                      />
                      <div className="min-w-0">
                        <h3
                          onClick={() => setPreviewExerciseId(entry.exerciseId)}
                          className="font-bold text-white text-sm truncate hover:text-neutral-300 transition cursor-pointer"
                        >
                          {ex?.name || 'Ejercicio desconocido'}
                        </h3>
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <span className="text-white font-medium">{ex?.muscleGroup || 'General'}</span>
                          <span className="text-neutral-600">•</span>
                          <span className="text-neutral-400">{ex?.equipment || 'Equipo'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingEntryIndex(eIdx)
                          setIsAddExerciseOpen(true)
                        }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white flex items-center gap-1.5 text-xs font-medium transition border border-neutral-700/60"
                        title="Cambiar este ejercicio por otro manteniendo las series"
                      >
                        <ArrowLeftRight size={13} />
                        <span>Cambiar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(eIdx)}
                        className="w-7 h-7 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 flex items-center justify-center transition"
                        title="Eliminar ejercicio de la sesión"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Tabla de series editables */}
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800">
                          <th className="pb-2 w-10 text-center">#</th>
                          <th className="pb-2 text-center w-28">Peso ({unit})</th>
                          <th className="pb-2 text-center w-20">Reps</th>
                          {showRpe && <th className="pb-2 text-center w-16">RPE</th>}
                          <th className="pb-2 text-center w-12">Hecho</th>
                          <th className="pb-2 w-8 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/40">
                        {entry.sets.map((set, sIdx) => {
                          const isWarmup = set.type === 'warmup'

                          return (
                            <tr key={sIdx} className="hover:bg-neutral-800/20 transition">
                              <td className="py-2 px-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSetWarmup(eIdx, sIdx)}
                                  className={`w-6 h-6 rounded-md text-xs font-bold transition flex items-center justify-center mx-auto ${
                                    isWarmup
                                      ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                  }`}
                                  title="Click para alternar normal / calentamiento (C)"
                                >
                                  {isWarmup ? 'C' : sIdx + 1}
                                </button>
                              </td>

                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={set.weight !== undefined ? set.weight : ''}
                                  onChange={(e) =>
                                    handleUpdateSet(eIdx, sIdx, {
                                      weight: e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  placeholder="0"
                                  className="w-20 text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white transition"
                                />
                              </td>

                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={set.reps !== undefined ? set.reps : ''}
                                  onChange={(e) =>
                                    handleUpdateSet(eIdx, sIdx, {
                                      reps: e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  placeholder="0"
                                  className="w-16 text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white transition"
                                />
                              </td>

                              {showRpe && (
                                <td className="py-2 px-1 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    value={set.rpe !== undefined ? set.rpe : ''}
                                    onChange={(e) =>
                                      handleUpdateSet(eIdx, sIdx, {
                                        rpe: e.target.value === '' ? undefined : Number(e.target.value),
                                      })
                                    }
                                    placeholder="RPE"
                                    className="w-14 text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-xs font-semibold text-white focus:outline-none focus:border-white transition"
                                  />
                                </td>
                              )}

                              <td className="py-2 px-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSet(eIdx, sIdx, { completed: !set.completed })}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition ${
                                    set.completed
                                      ? 'bg-white text-black font-bold'
                                      : 'bg-neutral-950 border border-neutral-800 text-neutral-600 hover:text-neutral-400'
                                  }`}
                                  title={set.completed ? 'Completada' : 'No completada'}
                                >
                                  <Check size={14} strokeWidth={set.completed ? 3 : 2} />
                                </button>
                              </td>

                              <td className="py-2 px-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSet(eIdx, sIdx)}
                                  className="w-6 h-6 text-neutral-600 hover:text-red-400 transition inline-flex items-center justify-center ml-auto"
                                  title="Eliminar serie"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Botón Añadir Serie */}
                  <button
                    type="button"
                    onClick={() => handleAddSet(eIdx)}
                    className="w-full py-2.5 bg-neutral-950/60 hover:bg-neutral-800 border-t border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus size={14} />
                    <span>Añadir serie</span>
                  </button>
                </div>
              )
            })
          )}

          {editWorkout.entries.length > 0 && (
            <button
              type="button"
              onClick={() => setIsAddExerciseOpen(true)}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition"
            >
              <Plus size={16} />
              <span>Añadir otro ejercicio</span>
            </button>
          )}
        </div>

        {/* Barra inferior fija para guardar */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#0b0f14]/95 border-t border-neutral-800 backdrop-blur-md flex items-center gap-3 z-40 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold transition border border-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
            className="flex-2 py-3 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={2.5} />
            <span>Guardar cambios</span>
          </button>
        </div>

        {/* Modal de selección de ejercicios para añadir */}
        <ExerciseSelectorModal
          isOpen={isAddExerciseOpen}
          onClose={() => {
            setIsAddExerciseOpen(false)
            setReplacingEntryIndex(null)
          }}
          onSelectExercises={handleAddExercisesToWorkout}
        />

        {/* Modal de vista previa */}
        {previewExerciseId && (
          <ExercisePreviewModal
            exerciseId={previewExerciseId}
            onClose={() => setPreviewExerciseId(null)}
            onAdd={() => setPreviewExerciseId(null)}
          />
        )}
      </div>
    )
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartEdit}
              className="text-xs text-white hover:text-neutral-200 transition bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold"
              title="Editar este entrenamiento"
            >
              <Pencil size={13} />
              <span>Editar</span>
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
                <div className="p-3.5 bg-neutral-900/90 border-b border-neutral-800 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setPreviewExerciseId(entry.exerciseId)}
                      className="shrink-0 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/40 active:scale-95 transition cursor-pointer"
                      title={`Ver vista previa de ${ex?.name || 'ejercicio'}`}
                    >
                      <ExerciseDemo
                        exerciseId={entry.exerciseId}
                        variant="thumb"
                        alt={ex?.name || 'Ejercicio'}
                      />
                    </button>
                    <div className="min-w-0">
                      <h3
                        onClick={() => setPreviewExerciseId(entry.exerciseId)}
                        className="font-bold text-white text-sm truncate hover:text-neutral-300 transition cursor-pointer"
                      >
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
                  </div>
                  <span className="text-xs text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 font-mono shrink-0">
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
        {/* Modal de vista previa del ejercicio */}
        {previewExerciseId && (
          <ExercisePreviewModal
            exerciseId={previewExerciseId}
            onClose={() => setPreviewExerciseId(null)}
            onAdd={() => setPreviewExerciseId(null)}
          />
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
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCreatePastWorkout}
            className="text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            title="Registrar un entrenamiento que hiciste en el pasado"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Añadir entreno pasado</span>
            <span className="sm:hidden">Pasado</span>
          </button>
          <Link
            to="/workout"
            className="text-xs font-bold bg-white hover:bg-neutral-200 text-black px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shrink-0"
          >
            <Dumbbell size={15} />
            <span>Entrenar</span>
          </Link>
        </div>
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
