import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Dumbbell,
  Plus,
  ClipboardList,
  Check,
  X,
  Trophy,
  AlertTriangle,
  Timer,
} from 'lucide-react'
import { db } from '../db'
import { useWorkoutStore } from '../store'
import { ExerciseSelectorModal } from '../components/ExerciseSelectorModal'
import { RestPicker } from '../components/RestPicker'
import { formatRest } from '../utils/formatRest'
import type { WorkoutSetEntry, Exercise } from '../types'

function formatDurationSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getSetNumberLabel(sets: WorkoutSetEntry[], index: number): string {
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

type PickerState = { mode: 'global' } | { mode: 'entry'; entryIndex: number } | null

export function WorkoutPage() {
  const navigate = useNavigate()

  const {
    activeWorkout,
    startEmptyWorkout,
    discardWorkout,
    finishWorkout,
    updateWorkoutName,
    updateWorkoutNotes,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    toggleSetCompleted,
    setSetType,
    removeSet,
    setWorkoutRest,
    setEntryRest,
  } = useWorkoutStore()

  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const pastWorkouts = useLiveQuery(() => db.workouts.toArray(), [])

  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [elapsedTime, setElapsedTime] = useState('00:00')
  const [restPickerState, setRestPickerState] = useState<PickerState>(null)

  const unit = (settings && 'units' in settings && settings.units) || 'kg'
  const showRpe = !!(settings && 'showRpe' in settings && settings.showRpe)
  const appRestSeconds =
    settings && 'restSeconds' in settings && typeof settings.restSeconds === 'number'
      ? settings.restSeconds
      : 120
  const efectivoGlobal = activeWorkout?.restSeconds ?? appRestSeconds

  // Map of exercise details for fast lookup
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    if (exercises) {
      for (const ex of exercises) {
        map.set(ex.id, ex)
      }
    }
    return map
  }, [exercises])

  // Map of past exercise performance (most recent finished workout for each exerciseId)
  const previousHistoryMap = useMemo(() => {
    const map = new Map<string, WorkoutSetEntry[]>()
    if (!pastWorkouts) return map

    // Sort past workouts descending by startedAt
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

  // Cronómetro de duración en vivo
  useEffect(() => {
    if (!activeWorkout) return

    const updateStopwatch = () => {
      const now = Date.now()
      const diffSec = Math.max(0, Math.floor((now - activeWorkout.startedAt) / 1000))
      const hours = Math.floor(diffSec / 3600)
      const minutes = Math.floor((diffSec % 3600) / 60)
      const seconds = diffSec % 60

      if (hours > 0) {
        setElapsedTime(
          `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      } else {
        setElapsedTime(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      }
    }

    updateStopwatch()
    const interval = setInterval(updateStopwatch, 1000)
    return () => clearInterval(interval)
  }, [activeWorkout])

  const handleFinish = async () => {
    try {
      await finishWorkout()
      navigate('/')
    } catch (err) {
      console.error('Error al terminar entrenamiento:', err)
    }
  }

  const handleDiscard = async () => {
    await discardWorkout()
    setShowDiscardConfirm(false)
  }

  const handleAddExercises = (exerciseIds: string[]) => {
    for (const id of exerciseIds) {
      addExercise(id)
    }
  }

  // Si no hay entreno activo
  if (!activeWorkout) {
    return (
      <div className="p-4 space-y-6">
        <div className="border-b border-neutral-800 pb-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">Entrenar</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Registro en vivo de series, repeticiones, cargas y descansos.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-800 text-white flex items-center justify-center mx-auto shadow-inner">
            <Dumbbell size={32} className="text-white" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">Comenzar Sesión</h2>
            <p className="text-xs text-neutral-400 mt-1.5 max-w-xs mx-auto">
              Empieza un entrenamiento libre, agrega ejercicios de la biblioteca y registra tus
              series en tiempo real con temporizador automático.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => startEmptyWorkout()}
              className="w-full py-3.5 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl text-sm font-bold transition shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>Empezar entreno vacío</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/routines')}
              className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-sm font-semibold transition border border-neutral-700 flex items-center justify-center gap-2"
            >
              <ClipboardList size={18} />
              <span>Iniciar desde una rutina</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Formato para la columna "Anterior"
  const formatPreviousSet = (
    exercise: Exercise | undefined,
    prevSet: WorkoutSetEntry | undefined
  ): string => {
    if (!prevSet) return '-'
    const type = exercise?.type ?? 'weight_reps'

    switch (type) {
      case 'weight_reps':
        return `${prevSet.weight ?? 0} ${unit} × ${prevSet.reps ?? 0}`
      case 'bodyweight_reps':
        if (prevSet.weight && prevSet.weight > 0) {
          return `+${prevSet.weight}${unit} × ${prevSet.reps ?? 0}`
        }
        return `${prevSet.reps ?? 0} reps`
      case 'bodyweight_assisted':
        return `-${prevSet.weight ?? 0}${unit} × ${prevSet.reps ?? 0}`
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

  return (
    <div className="p-4 space-y-5">
      {/* Barra superior con cronómetro y acciones */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span className="text-xs uppercase font-bold tracking-wider text-white">
              En Vivo
            </span>
            {activeWorkout.routineId && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">
                Rutina
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Duración:</span>
            <span className="text-sm font-mono font-bold text-white bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
              {elapsedTime}
            </span>
          </div>
        </div>

        {/* Título editable de la sesión */}
        <input
          type="text"
          value={activeWorkout.name}
          onChange={(e) => updateWorkoutName(e.target.value)}
          placeholder="Nombre del entreno..."
          className="w-full bg-transparent text-xl font-extrabold text-white focus:outline-none border-b border-transparent focus:border-white pb-0.5 transition"
        />

        {/* Notas del entreno */}
        <input
          type="text"
          value={activeWorkout.notes}
          onChange={(e) => updateWorkoutNotes(e.target.value)}
          placeholder="Notas de la sesión (ej. Buenas sensaciones en sentadilla)..."
          className="w-full text-xs text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-700 transition"
        />

        {/* Chip de descanso global del entreno */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setRestPickerState({ mode: 'global' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            <Timer size={14} className="text-neutral-400" />
            <span>Descanso: {formatRest(efectivoGlobal)}</span>
          </button>
        </div>
      </div>

      {/* Lista de ejercicios en el entreno */}
      <div className="space-y-4">
        {activeWorkout.entries.map((entry, entryIndex) => {
          const exercise = exerciseMap.get(entry.exerciseId)
          const exerciseType = exercise?.type ?? 'weight_reps'
          const prevSets = previousHistoryMap.get(entry.exerciseId)

          return (
            <div
              key={`${entry.exerciseId}-${entryIndex}`}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Encabezado del ejercicio */}
              <div className="p-3.5 border-b border-neutral-800 bg-neutral-900/90 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base leading-snug">
                    {exercise?.name ?? 'Ejercicio'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                    <span className="text-white font-medium">
                      {exercise?.muscleGroup ?? 'General'}
                    </span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400">{exercise?.equipment ?? 'Equipo'}</span>
                    <span className="text-neutral-600">•</span>
                    <button
                      type="button"
                      onClick={() => setRestPickerState({ mode: 'entry', entryIndex })}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[11px] font-medium text-neutral-300 hover:text-white transition"
                    >
                      <Timer size={12} className="text-neutral-400" />
                      <span>
                        {entry.restSeconds === undefined
                          ? `Descanso: Global (${formatRest(efectivoGlobal)})`
                          : `Descanso: ${formatRest(entry.restSeconds)}`}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeExercise(entryIndex)}
                  className="text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-neutral-800 transition"
                  title="Eliminar ejercicio"
                  aria-label="Eliminar ejercicio"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabla de series */}
              <div className="p-3 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800">
                      <th className="pb-2 w-10 text-center">Serie</th>
                      <th className="pb-2 min-w-[70px] text-center">Anterior</th>

                      {/* Columnas dinámicas según tipo de ejercicio */}
                      {exerciseType === 'weight_reps' && (
                        <>
                          <th className="pb-2 w-20 text-center">{unit.toUpperCase()}</th>
                          <th className="pb-2 w-16 text-center">Reps</th>
                        </>
                      )}
                      {exerciseType === 'bodyweight_reps' && (
                        <>
                          <th className="pb-2 w-20 text-center">+{unit.toUpperCase()}</th>
                          <th className="pb-2 w-16 text-center">Reps</th>
                        </>
                      )}
                      {exerciseType === 'bodyweight_assisted' && (
                        <>
                          <th className="pb-2 w-20 text-center">-{unit.toUpperCase()}</th>
                          <th className="pb-2 w-16 text-center">Reps</th>
                        </>
                      )}
                      {exerciseType === 'duration' && (
                        <>
                          <th className="pb-2 w-16 text-center">Min</th>
                          <th className="pb-2 w-16 text-center">Seg</th>
                        </>
                      )}
                      {exerciseType === 'distance' && (
                        <>
                          <th className="pb-2 w-20 text-center">Metros</th>
                          <th className="pb-2 w-20 text-center">Tiempo</th>
                        </>
                      )}

                      {showRpe && <th className="pb-2 w-14 text-center">RPE</th>}
                      <th className="pb-2 w-10 text-center">
                        <Check size={12} className="mx-auto" />
                      </th>
                      <th className="pb-2 w-7 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/40">
                    {entry.sets.map((set, setIndex) => {
                      const prevSet = prevSets ? prevSets[setIndex] : undefined
                      const isWarmup = set.type === 'warmup'
                      const setLabel = getSetNumberLabel(entry.sets, setIndex)

                      return (
                        <tr
                          key={setIndex}
                          className={`transition ${
                            set.completed ? 'bg-neutral-800/40' : 'hover:bg-neutral-800/20'
                          }`}
                        >
                          {/* Columna Serie con toggle Normal/Calentamiento */}
                          <td className="py-2 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSetType(entryIndex, setIndex, isWarmup ? 'normal' : 'warmup')
                              }
                              className={`w-6 h-6 rounded-md text-xs font-bold transition flex items-center justify-center mx-auto ${
                                isWarmup
                                  ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                              }`}
                              title={
                                isWarmup
                                  ? 'Serie de calentamiento (click para cambiar a normal)'
                                  : 'Serie normal (click para marcar como calentamiento)'
                              }
                            >
                              {setLabel}
                            </button>
                          </td>

                          {/* Columna Anterior */}
                          <td className="py-2 px-1 text-center text-[11px] text-neutral-400 font-mono whitespace-nowrap">
                            {formatPreviousSet(exercise, prevSet)}
                          </td>

                          {/* Inputs según tipo de ejercicio */}
                          {exerciseType === 'weight_reps' && (
                            <>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  placeholder={
                                    prevSet?.weight !== undefined ? String(prevSet.weight) : '-'
                                  }
                                  value={set.weight ?? ''}
                                  onChange={(e) =>
                                    updateSet(entryIndex, setIndex, {
                                      weight:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder={
                                    prevSet?.reps !== undefined ? String(prevSet.reps) : '-'
                                  }
                                  value={set.reps ?? ''}
                                  onChange={(e) =>
                                    updateSet(entryIndex, setIndex, {
                                      reps:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                            </>
                          )}

                          {exerciseType === 'bodyweight_reps' && (
                            <>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  placeholder={
                                    prevSet?.weight !== undefined ? `+${prevSet.weight}` : '+0'
                                  }
                                  value={set.weight ?? ''}
                                  onChange={(e) =>
                                    updateSet(entryIndex, setIndex, {
                                      weight:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder={
                                    prevSet?.reps !== undefined ? String(prevSet.reps) : '-'
                                  }
                                  value={set.reps ?? ''}
                                  onChange={(e) =>
                                    updateSet(entryIndex, setIndex, {
                                      reps:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                            </>
                          )}

                          {exerciseType === 'bodyweight_assisted' && (
                            <>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  placeholder={
                                    prevSet?.weight !== undefined ? `-${prevSet.weight}` : '-0'
                                  }
                                  value={set.weight ?? ''}
                                  onChange={(e) =>
                                    updateSet(entryIndex, setIndex, {
                                      weight:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder={
                                    prevSet?.reps !== undefined ? String(prevSet.reps) : '-'
                                  }
                                  value={set.reps ?? ''}
                                  onChange={(e) =>
                                    updateSet(entryIndex, setIndex, {
                                      reps:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                            </>
                          )}

                          {exerciseType === 'duration' && (
                            <>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={
                                    set.durationSec !== undefined
                                      ? Math.floor(set.durationSec / 60)
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const m = e.target.value === '' ? 0 : Number(e.target.value)
                                    const s = (set.durationSec ?? 0) % 60
                                    updateSet(entryIndex, setIndex, { durationSec: m * 60 + s })
                                  }}
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  placeholder="0"
                                  value={
                                    set.durationSec !== undefined ? set.durationSec % 60 : ''
                                  }
                                  onChange={(e) => {
                                    const s = e.target.value === '' ? 0 : Number(e.target.value)
                                    const m = Math.floor((set.durationSec ?? 0) / 60)
                                    updateSet(entryIndex, setIndex, { durationSec: m * 60 + s })
                                  }}
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                            </>
                          )}

                          {exerciseType === 'distance' && (
                            <>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="10"
                                  placeholder={
                                    prevSet?.distanceM !== undefined
                                      ? String(prevSet.distanceM)
                                      : '0'
                                  }
                                  value={set.distanceM ?? ''}
                                  onChange={(e) =>
                                    updateSet(entryIndex, setIndex, {
                                      distanceM:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                              <td className="py-2 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Seg"
                                  value={set.durationSec ?? ''}
                                  onChange={(e) =>
                                    updateSet(entryIndex, setIndex, {
                                      durationSec:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-sm font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                            </>
                          )}

                          {/* Columna RPE (opcional, según Ajustes) */}
                          {showRpe && (
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="0.5"
                                placeholder="-"
                                value={set.rpe ?? ''}
                                onChange={(e) =>
                                  updateSet(entryIndex, setIndex, {
                                    rpe: e.target.value === '' ? undefined : Number(e.target.value),
                                  })
                                }
                                className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-xs text-neutral-300 focus:outline-none focus:border-white"
                              />
                            </td>
                          )}

                          {/* Checkbox completada */}
                          <td className="py-2 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSetCompleted(entryIndex, setIndex)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition mx-auto ${
                                set.completed
                                  ? 'bg-white text-black shadow-md'
                                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
                              }`}
                              title={
                                set.completed ? 'Marcar como pendiente' : 'Marcar como completada'
                              }
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                          </td>

                          {/* Botón eliminar serie */}
                          <td className="py-2 px-1 text-center">
                            {entry.sets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSet(entryIndex, setIndex)}
                                className="text-neutral-500 hover:text-red-400 transition p-1"
                                title="Eliminar serie"
                                aria-label="Eliminar serie"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Botón añadir serie al ejercicio */}
                <button
                  type="button"
                  onClick={() => addSet(entryIndex)}
                  className="w-full mt-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Añadir serie</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón grande para añadir ejercicios */}
      <button
        type="button"
        onClick={() => setIsSelectorOpen(true)}
        className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 hover:border-neutral-500 text-white rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        <span>Añadir ejercicio</span>
      </button>

      {/* Botones de acción principales: Terminar y Descartar */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={handleFinish}
          className="w-full py-3.5 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl text-sm font-extrabold transition shadow-lg flex items-center justify-center gap-2"
        >
          <Trophy size={18} />
          <span>Terminar entreno</span>
        </button>

        <button
          type="button"
          onClick={() => setShowDiscardConfirm(true)}
          className="w-full py-2.5 px-3 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 hover:text-red-300 rounded-xl text-xs font-medium transition text-center"
        >
          Descartar entreno
        </button>
      </div>

      {/* Modal de confirmación para descartar */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 text-center shadow-2xl">
            <AlertTriangle size={32} className="text-red-400 mx-auto" />
            <div>
              <h3 className="font-bold text-white text-base">¿Descartar entrenamiento?</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Se perderá todo el progreso de la sesión actual y no se guardará en el historial.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-xs font-medium transition"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Sí, descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selector modal de ejercicios */}
      <ExerciseSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectExercises={handleAddExercises}
      />

      {/* Selector modal de descanso */}
      {restPickerState && (
        <RestPicker
          isOpen={restPickerState !== null}
          title={
            restPickerState.mode === 'global'
              ? 'Descanso global del entreno'
              : (exerciseMap.get(activeWorkout.entries[restPickerState.entryIndex]?.exerciseId)?.name ?? 'Ejercicio')
          }
          currentSeconds={
            restPickerState.mode === 'global'
              ? efectivoGlobal
              : (activeWorkout.entries[restPickerState.entryIndex]?.restSeconds ?? efectivoGlobal)
          }
          allowGlobal={restPickerState.mode === 'entry'}
          onSelect={(seconds) => {
            if (restPickerState.mode === 'global') {
              setWorkoutRest(seconds)
            } else {
              setEntryRest(restPickerState.entryIndex, seconds)
            }
          }}
          onUseGlobal={
            restPickerState.mode === 'entry'
              ? () => setEntryRest(restPickerState.entryIndex, null)
              : undefined
          }
          onClose={() => setRestPickerState(null)}
        />
      )}
    </div>
  )
}
