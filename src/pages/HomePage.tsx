import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Settings, Plus } from 'lucide-react'
import { db } from '../db'
import { useWorkoutStore } from '../store'
import type { Routine, Exercise } from '../types'
import { getLatestBodyweightKg } from '../utils/weightUnits'
import { ScreenHeader, HeaderIconButton, Sheet } from '../components/ui'
import { WeekStreak } from '../components/home/WeekStreak'
import { NextRoutineCard } from '../components/home/NextRoutineCard'
import { RecentWorkouts } from '../components/home/RecentWorkouts'
import { FirstRunView } from '../components/home/FirstRunView'

export function HomePage() {
  const navigate = useNavigate()
  const { activeWorkout, startFromRoutine, startWorkout } = useWorkoutStore()

  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(async () => {
    const s = await db.settings.get('app')
    return s && 'units' in s ? s : undefined
  }, [])

  const [pendingRoutineToStart, setPendingRoutineToStart] = useState<Routine | null>(null)

  const unit = settings?.units ?? 'kg'
  const latestBodyweight = useMemo(() => getLatestBodyweightKg(measurements), [measurements])

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    if (exercises) {
      for (const ex of exercises) {
        map.set(ex.id, ex)
      }
    }
    return map
  }, [exercises])

  // Entrenamientos terminados ordenados descendente por fecha
  const finishedWorkouts = useMemo(() => {
    if (!workouts) return []
    return workouts
      .filter((w) => w.finishedAt !== null)
      .sort((a, b) => (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt))
  }, [workouts])

  // Determinar siguiente rutina
  const nextRoutine = useMemo(() => {
    if (!routines || routines.length === 0) return null
    if (finishedWorkouts.length === 0) return routines[0]

    const lastRoutineId = finishedWorkouts.find((w) => w.routineId)?.routineId
    if (!lastRoutineId) return routines[0]

    const lastIdx = routines.findIndex((r) => r.id === lastRoutineId)
    if (lastIdx === -1 || lastIdx === routines.length - 1) return routines[0]
    return routines[lastIdx + 1]
  }, [routines, finishedWorkouts])

  const handleStartRoutine = async (routine: Routine) => {
    if (activeWorkout) {
      setPendingRoutineToStart(routine)
    } else {
      const success = await startFromRoutine(routine.id)
      if (success) {
        navigate('/workout')
      }
    }
  }

  const handleConfirmStartWithActiveWorkout = async () => {
    if (!pendingRoutineToStart) return
    const success = await startFromRoutine(pendingRoutineToStart.id, { force: true })
    setPendingRoutineToStart(null)
    if (success) {
      navigate('/workout')
    }
  }

  const isFirstRun = finishedWorkouts.length === 0 && (!routines || routines.length === 0)

  return (
    <div className="flex-1 flex flex-col bg-black">
      <ScreenHeader
        title="HardFit"
        actions={
          <HeaderIconButton
            label="Ajustes"
            onClick={() => navigate('/settings')}
          >
            <Settings size={20} strokeWidth={1.75} />
          </HeaderIconButton>
        }
      />

      <div className="flex-1 p-4 space-y-6">
        {isFirstRun ? (
          <FirstRunView unit={unit} />
        ) : (
          <>
            <WeekStreak
              workouts={finishedWorkouts}
              exerciseMap={exerciseMap}
              latestBodyweight={latestBodyweight}
              unit={unit}
            />

            {nextRoutine && (
              <NextRoutineCard
                routine={nextRoutine}
                exerciseMap={exerciseMap}
                onStart={handleStartRoutine}
              />
            )}

            {finishedWorkouts.length > 0 && (
              <RecentWorkouts
                workouts={finishedWorkouts.slice(0, 3)}
                exerciseMap={exerciseMap}
                latestBodyweight={latestBodyweight}
                unit={unit}
              />
            )}

            {!activeWorkout && (
              <button
                type="button"
                onClick={() => {
                  startWorkout()
                  navigate('/workout')
                }}
                className="btn-secondary w-full"
              >
                <Plus size={18} />
                <span>Empezar entreno libre</span>
              </button>
            )}
          </>
        )}
      </div>

      {pendingRoutineToStart && (
        <Sheet
          title="Entrenamiento en curso"
          onClose={() => setPendingRoutineToStart(null)}
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-neutral-300 leading-relaxed">
              Ya tienes una sesión activa ({activeWorkout?.name}). Si inicias{' '}
              <strong className="text-white">&quot;{pendingRoutineToStart.name}&quot;</strong>, se descartará el progreso actual.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingRoutineToStart(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStartWithActiveWorkout}
                className="btn-primary flex-1"
              >
                Reemplazar y empezar
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
