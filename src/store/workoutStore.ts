import { create } from 'zustand'
import { db } from '../db'
import { syncNow } from '../sync'
import type { Workout, WorkoutEntry, WorkoutSetEntry, Routine, ActiveWorkoutRecord } from '../types'

export interface RestTimerState {
  targetEnd: number
  totalSeconds: number
  startedAt: number
}

export interface WorkoutSessionState {
  activeWorkout: Workout | null
  isLoaded: boolean
  restTimer: RestTimerState | null

  // Workout lifecycle
  startEmptyWorkout: (name?: string) => void
  startWorkout: (routine?: Routine) => void
  startFromRoutine: (routineId: string, options?: { force?: boolean }) => Promise<boolean>
  discardWorkout: () => Promise<void>
  finishWorkout: () => Promise<Workout | null>
  updateWorkoutName: (name: string) => void
  updateWorkoutNotes: (notes: string) => void

  // Exercise & Set management
  addExercise: (exerciseId: string) => void
  removeExercise: (entryIndex: number) => void
  addSet: (entryIndex: number) => void
  updateSet: (entryIndex: number, setIndex: number, patch: Partial<WorkoutSetEntry>) => void
  toggleSetCompleted: (entryIndex: number, setIndex: number) => void
  setSetType: (entryIndex: number, setIndex: number, type: 'normal' | 'warmup') => void
  removeSet: (entryIndex: number, setIndex: number) => void

  // Rest Timer controls
  startRestTimer: (seconds?: number) => void
  adjustRestTimer: (deltaSeconds: number) => void
  skipRestTimer: () => void
  setWorkoutRest: (seconds: number) => void
  setEntryRest: (entryIndex: number, seconds: number | null) => void

  // Rehydration
  rehydrate: () => Promise<void>
}

const LOCAL_STORAGE_KEY = 'replog_active_workout'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `wk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

async function persistActiveWorkout(workout: Workout | null): Promise<void> {
  try {
    if (workout) {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workout))
      }
      await db.settings.put({
        id: 'active_workout',
        workout,
      })
    } else {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
      await db.settings.delete('active_workout')
    }
  } catch (err) {
    console.error('Error al persistir entreno activo en Dexie:', err)
  }
}

function getInitialWorkout(): Workout | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Workout
  } catch {
    return null
  }
}

export const useWorkoutStore = create<WorkoutSessionState>((set, get) => ({
  activeWorkout: getInitialWorkout(),
  isLoaded: false,
  restTimer: null,

  startEmptyWorkout: (name?: string) => {
    const newWorkout: Workout = {
      id: generateId(),
      name: name && name.trim() ? name.trim() : 'Entrenamiento libre',
      startedAt: Date.now(),
      finishedAt: null,
      routineId: null,
      notes: '',
      entries: [],
    }
    set({ activeWorkout: newWorkout })
    persistActiveWorkout(newWorkout)
  },

  startWorkout: (routine?: Routine) => {
    if (routine) {
      const sortedItems = [...routine.items].sort((a, b) => a.order - b.order)
      const newWorkout: Workout = {
        id: generateId(),
        name: routine.name,
        startedAt: Date.now(),
        finishedAt: null,
        routineId: routine.id,
        notes: '',
        entries: sortedItems.map((item) => ({
          exerciseId: item.exerciseId,
          sets:
            item.targetSets && item.targetSets.length > 0
              ? item.targetSets.map((ts) => ({
                  type: 'normal',
                  weight: ts.weight,
                  reps: ts.reps,
                  rpe: ts.rpe,
                  durationSec: ts.durationSec,
                  distanceM: ts.distanceM,
                  completed: false,
                }))
              : [{ type: 'normal', completed: false }],
        })),
      }
      set({ activeWorkout: newWorkout, restTimer: null })
      persistActiveWorkout(newWorkout)
    } else {
      get().startEmptyWorkout()
    }
  },

  startFromRoutine: async (routineId: string, options?: { force?: boolean }): Promise<boolean> => {
    const { activeWorkout } = get()
    if (activeWorkout && !options?.force) {
      return false
    }

    try {
      const routine = await db.routines.get(routineId)
      if (!routine) {
        console.warn('Rutina no encontrada en la base de datos:', routineId)
        return false
      }

      const exercises = await db.exercises.toArray()
      const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
      const sortedItems = [...routine.items].sort((a, b) => a.order - b.order)

      const entries: WorkoutEntry[] = sortedItems.map((item) => {
        const exercise = exerciseMap.get(item.exerciseId)
        const exerciseType = exercise?.type ?? 'weight_reps'

        const sets: WorkoutSetEntry[] =
          item.targetSets && item.targetSets.length > 0
            ? item.targetSets.map((ts) => {
                const s: WorkoutSetEntry = {
                  type: 'normal',
                  completed: false,
                  rpe: ts.rpe,
                }

                if (exerciseType === 'duration') {
                  s.durationSec = ts.durationSec ?? (ts.reps ? ts.reps * 60 : undefined)
                } else if (exerciseType === 'distance') {
                  s.distanceM = ts.distanceM ?? ts.weight
                  s.durationSec = ts.durationSec ?? ts.reps
                } else {
                  s.weight = ts.weight
                  s.reps = ts.reps
                }

                return s
              })
            : [{ type: 'normal', completed: false }]

        return {
          exerciseId: item.exerciseId,
          sets,
        }
      })

      const newWorkout: Workout = {
        id: generateId(),
        name: routine.name,
        startedAt: Date.now(),
        finishedAt: null,
        routineId: routine.id,
        notes: '',
        entries,
      }

      set({ activeWorkout: newWorkout, restTimer: null })
      await persistActiveWorkout(newWorkout)
      return true
    } catch (err) {
      console.error('Error al iniciar entreno desde rutina:', err)
      return false
    }
  },

  updateWorkoutName: (name: string) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return
    const updated = { ...activeWorkout, name }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  updateWorkoutNotes: (notes: string) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return
    const updated = { ...activeWorkout, notes }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  discardWorkout: async () => {
    set({ activeWorkout: null, restTimer: null })
    await persistActiveWorkout(null)
  },

  finishWorkout: async () => {
    const { activeWorkout } = get()
    if (!activeWorkout) return null

    const finished: Workout = {
      ...activeWorkout,
      finishedAt: Date.now(),
    }

    try {
      await db.workouts.put(finished)
    } catch (err) {
      console.error('Error guardando entrenamiento en Dexie:', err)
      throw err
    }

    set({ activeWorkout: null, restTimer: null })
    await persistActiveWorkout(null)

    // Sincronización en segundo plano si hay sesión activa (no bloquea UI)
    syncNow().catch((err) => {
      console.error('Error sincronizando tras finalizar entrenamiento:', err)
    })

    return finished
  },

  addExercise: (exerciseId: string) => {
    let { activeWorkout } = get()
    if (!activeWorkout) {
      get().startEmptyWorkout()
      activeWorkout = get().activeWorkout!
    }

    const newEntry = {
      exerciseId,
      sets: [
        {
          type: 'normal' as const,
          completed: false,
        },
      ],
    }

    const updated = {
      ...activeWorkout,
      entries: [...activeWorkout.entries, newEntry],
    }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  removeExercise: (entryIndex: number) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return

    const updated = {
      ...activeWorkout,
      entries: activeWorkout.entries.filter((_, idx) => idx !== entryIndex),
    }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  addSet: (entryIndex: number) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return

    const targetEntry = activeWorkout.entries[entryIndex]
    if (!targetEntry) return

    const prevSet =
      targetEntry.sets.length > 0 ? targetEntry.sets[targetEntry.sets.length - 1] : undefined

    const newSet: WorkoutSetEntry = {
      type: 'normal',
      completed: false,
      weight: prevSet?.weight,
      reps: prevSet?.reps,
      durationSec: prevSet?.durationSec,
      distanceM: prevSet?.distanceM,
    }

    const updatedEntries = activeWorkout.entries.map((entry, idx) => {
      if (idx !== entryIndex) return entry
      return {
        ...entry,
        sets: [...entry.sets, newSet],
      }
    })

    const updated = { ...activeWorkout, entries: updatedEntries }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  updateSet: (entryIndex: number, setIndex: number, patch: Partial<WorkoutSetEntry>) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return

    const updatedEntries = activeWorkout.entries.map((entry, eIdx) => {
      if (eIdx !== entryIndex) return entry
      const updatedSets = entry.sets.map((s, sIdx) => {
        if (sIdx !== setIndex) return s
        return { ...s, ...patch }
      })
      return { ...entry, sets: updatedSets }
    })

    const updated = { ...activeWorkout, entries: updatedEntries }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  toggleSetCompleted: (entryIndex: number, setIndex: number) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return

    const targetEntry = activeWorkout.entries[entryIndex]
    if (!targetEntry) return

    const targetSet = targetEntry.sets[setIndex]
    if (!targetSet) return

    const nextCompleted = !targetSet.completed

    const updatedEntries = activeWorkout.entries.map((entry, eIdx) => {
      if (eIdx !== entryIndex) return entry
      const updatedSets = entry.sets.map((s, sIdx) => {
        if (sIdx !== setIndex) return s
        return { ...s, completed: nextCompleted }
      })
      return { ...entry, sets: updatedSets }
    })

    const updated = { ...activeWorkout, entries: updatedEntries }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)

    if (nextCompleted) {
      db.settings
        .get('app')
        .then((s) => {
          const entryRest = targetEntry.restSeconds
          const workoutRest = activeWorkout.restSeconds
          const appRest =
            s && 'restSeconds' in s && typeof s.restSeconds === 'number' ? s.restSeconds : undefined
          const rest = entryRest ?? workoutRest ?? appRest ?? 120
          if (rest > 0) {
            get().startRestTimer(rest)
          }
        })
        .catch(() => {
          const entryRest = targetEntry.restSeconds
          const workoutRest = activeWorkout.restSeconds
          const rest = entryRest ?? workoutRest ?? 120
          if (rest > 0) {
            get().startRestTimer(rest)
          }
        })
    }
  },

  setSetType: (entryIndex: number, setIndex: number, type: 'normal' | 'warmup') => {
    const { activeWorkout } = get()
    if (!activeWorkout) return

    const updatedEntries = activeWorkout.entries.map((entry, eIdx) => {
      if (eIdx !== entryIndex) return entry
      const updatedSets = entry.sets.map((s, sIdx) => {
        if (sIdx !== setIndex) return s
        return { ...s, type }
      })
      return { ...entry, sets: updatedSets }
    })

    const updated = { ...activeWorkout, entries: updatedEntries }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  removeSet: (entryIndex: number, setIndex: number) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return

    const targetEntry = activeWorkout.entries[entryIndex]
    if (!targetEntry || targetEntry.sets.length <= 1) return

    const updatedEntries = activeWorkout.entries.map((entry, eIdx) => {
      if (eIdx !== entryIndex) return entry
      return {
        ...entry,
        sets: entry.sets.filter((_, sIdx) => sIdx !== setIndex),
      }
    })

    const updated = { ...activeWorkout, entries: updatedEntries }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  setWorkoutRest: (seconds: number) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return

    const updated = {
      ...activeWorkout,
      restSeconds: Math.max(0, seconds),
    }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  setEntryRest: (entryIndex: number, seconds: number | null) => {
    const { activeWorkout } = get()
    if (!activeWorkout) return

    const updatedEntries = activeWorkout.entries.map((entry, eIdx) => {
      if (eIdx !== entryIndex) return entry
      if (seconds === null) {
        const { restSeconds: _, ...rest } = entry
        return rest
      }
      return {
        ...entry,
        restSeconds: Math.max(0, seconds),
      }
    })

    const updated = { ...activeWorkout, entries: updatedEntries }
    set({ activeWorkout: updated })
    persistActiveWorkout(updated)
  },

  startRestTimer: (seconds = 120) => {
    const duration = Math.max(5, seconds)
    set({
      restTimer: {
        totalSeconds: duration,
        targetEnd: Date.now() + duration * 1000,
        startedAt: Date.now(),
      },
    })
  },

  adjustRestTimer: (deltaSeconds: number) => {
    const { restTimer } = get()
    if (!restTimer) return
    const newTarget = restTimer.targetEnd + deltaSeconds * 1000
    const now = Date.now()
    if (newTarget <= now) {
      set({ restTimer: null })
      return
    }
    const remaining = Math.ceil((newTarget - now) / 1000)
    set({
      restTimer: {
        ...restTimer,
        targetEnd: newTarget,
        totalSeconds: Math.max(restTimer.totalSeconds, remaining),
      },
    })
  },

  skipRestTimer: () => {
    set({ restTimer: null })
  },

  rehydrate: async () => {
    try {
      const record = (await db.settings.get('active_workout')) as ActiveWorkoutRecord | undefined
      if (record && record.workout) {
        set({ activeWorkout: record.workout, isLoaded: true })
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(record.workout))
        }
      } else {
        const raw =
          typeof window !== 'undefined' && window.localStorage
            ? localStorage.getItem(LOCAL_STORAGE_KEY)
            : null
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Workout
            set({ activeWorkout: parsed, isLoaded: true })
            await db.settings.put({ id: 'active_workout', workout: parsed })
          } catch {
            set({ isLoaded: true })
          }
        } else {
          set({ activeWorkout: null, isLoaded: true })
        }
      }
    } catch (err) {
      console.error('Error al rehidratar entreno activo desde Dexie:', err)
      set({ isLoaded: true })
    }
  },
}))
