import { useState, useMemo } from 'react'
import { useDismissable } from '../components/ui/useDismissable'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db } from '../db'
import type { Exercise, Workout } from '../types'
import { getLatestBodyweightKg, stampWorkoutWeightUnits } from '../utils/weightUnits'
import { personalRecords } from '../utils/stats'
import { ScreenHeader, HeaderIconButton } from '../components/ui'
import { HistoryList } from '../components/history/HistoryList'
import { HistoryDetail } from '../components/history/HistoryDetail'
import { HistoryEdit } from '../components/history/HistoryEdit'
import { DeleteWorkoutSheet } from '../components/history/DeleteWorkoutSheet'
import { ExercisePreviewModal } from '../components/ExercisePreviewModal'

export function HistoryPage() {
  const { id: routeWorkoutId } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const [selectedIdState, setSelectedIdState] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  // Atrás sale de la edición sin salir del entreno que se está viendo.
  useDismissable(() => setIsEditing(false), isEditing)

  const activeDetailId = routeWorkoutId || selectedIdState

  const workouts = useLiveQuery(
    () => db.workouts.filter((w) => w.finishedAt !== null).toArray(),
    []
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  const unit = (settings && 'units' in settings && settings.units) || 'kg'
  const showRpe = !!(settings && 'showRpe' in settings && settings.showRpe)

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

  // Entrenos terminados ordenados desc por fecha
  const sortedWorkouts = useMemo(() => {
    if (!workouts) return []
    return [...workouts].sort(
      (a, b) => (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt)
    )
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

  const handleCreatePastWorkout = async () => {
    const now = Date.now()
    const newWorkout: Workout = {
      id: `workout-past-${now}-${Math.random().toString(36).substring(2, 7)}`,
      name: 'Entrenamiento',
      weightUnit: unit,
      startedAt: now - 3600 * 1000,
      finishedAt: now,
      routineId: null,
      notes: '',
      entries: [],
    }
    await db.workouts.add(newWorkout)
    setSelectedIdState(newWorkout.id)
    setIsEditing(true)
  }

  const handleSaveEdit = async (updatedWorkout: Workout) => {
    await db.workouts.put(stampWorkoutWeightUnits(updatedWorkout, unit))
    setIsEditing(false)
  }

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

  const handleBackToList = () => {
    if (routeWorkoutId) {
      navigate('/history')
    } else {
      setSelectedIdState(null)
    }
    setIsEditing(false)
  }

  const handleSelectWorkout = (id: string) => {
    navigate(`/history/${id}`)
  }

  // --- MODO EDICIÓN ---
  if (selectedWorkout && isEditing) {
    return (
      <HistoryEdit
        editWorkout={selectedWorkout}
        exerciseMap={exerciseMap}
        unit={unit}
        showRpe={showRpe}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  // --- VISTA DETALLE ---
  if (selectedWorkout) {
    return (
      <>
        <HistoryDetail
          workout={selectedWorkout}
          exerciseMap={exerciseMap}
          prsByExercise={prsByExercise}
          latestBodyweight={latestBodyweight}
          unit={unit}
          showRpe={showRpe}
          onBack={handleBackToList}
          onEdit={() => setIsEditing(true)}
          onDelete={() => setDeleteConfirmId(selectedWorkout.id)}
          onPreviewExercise={(id) => setPreviewExerciseId(id)}
        />

        <DeleteWorkoutSheet
          workoutName={selectedWorkout.name}
          isOpen={deleteConfirmId === selectedWorkout.id}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => handleDeleteWorkout(selectedWorkout.id)}
        />

        {previewExerciseId && (
          <ExercisePreviewModal
            exerciseId={previewExerciseId}
            onClose={() => setPreviewExerciseId(null)}
            onAdd={() => setPreviewExerciseId(null)}
          />
        )}
      </>
    )
  }

  // --- VISTA LISTA PRINCIPAL ---
  return (
    <div className="flex-1 flex flex-col bg-black">
      <ScreenHeader
        title="Historial"
        actions={
          <HeaderIconButton
            label="Añadir entreno pasado"
            onClick={handleCreatePastWorkout}
          >
            <Plus size={20} strokeWidth={1.75} />
          </HeaderIconButton>
        }
      />

      <HistoryList
        workouts={sortedWorkouts}
        exerciseMap={exerciseMap}
        prsByExercise={prsByExercise}
        latestBodyweight={latestBodyweight}
        unit={unit}
        onSelectWorkout={handleSelectWorkout}
        onCreatePastWorkout={handleCreatePastWorkout}
      />

      <DeleteWorkoutSheet
        workoutName={
          workouts?.find((w) => w.id === deleteConfirmId)?.name || 'Entrenamiento'
        }
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDeleteWorkout(deleteConfirmId)}
      />
    </div>
  )
}
