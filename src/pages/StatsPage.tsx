import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Ruler } from 'lucide-react'
import { db } from '../db'
import type { Exercise } from '../types'
import { getLatestBodyweightKg } from '../utils/weightUnits'
import { exercisesPerformed } from '../utils/stats'
import { ScreenHeader, HeaderIconButton } from '../components/ui/ScreenHeader'
import { SegTabs } from '../components/ui/SegTabs'
import { ExercisePreviewModal } from '../components/ExercisePreviewModal'
import { StatsSummaryTab } from '../components/stats/StatsSummaryTab'
import { StatsAdvancedTab } from '../components/stats/StatsAdvancedTab'
import { MuscleMapView } from '../components/stats/MuscleMapView'

export function StatsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = searchParams.get('tab') === 'avanzadas' ? 'avanzadas' : 'resumen'
  const isMuscleMapView = searchParams.get('view') === 'mapa'

  const handleTabChange = (tab: 'resumen' | 'avanzadas') => {
    if (tab === 'resumen') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: 'avanzadas' }, { replace: true })
    }
  }

  const handleOpenMuscleMap = () => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('view', 'mapa')
      return p
    })
  }

  const handleCloseMuscleMap = () => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.delete('view')
      return p
    })
  }

  const workouts = useLiveQuery(
    () => db.workouts.filter((w) => w.finishedAt !== null).toArray(),
    []
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  const unit = (settings && 'units' in settings && settings.units) || 'kg'
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

  // Ejercicios que el usuario ya entrenó (únicos, ordenados alfabéticamente)
  const trainedExercises = useMemo(() => {
    if (!workouts) return []
    const ids = exercisesPerformed(workouts)
    const list: { id: string; name: string; muscleGroup?: string }[] = []
    for (const id of ids) {
      const ex = exerciseMap.get(id)
      if (ex) {
        list.push({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup })
      } else {
        list.push({ id, name: id })
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  }, [workouts, exerciseMap])

  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)

  // Si está en la vista especializada de mapa muscular
  if (isMuscleMapView) {
    return (
      <MuscleMapView
        workouts={workouts || []}
        exercisesById={exerciseMap}
        onBack={handleCloseMuscleMap}
      />
    )
  }

  return (
    <div className="min-h-full flex flex-col bg-black">
      {/* Cabecera de la pantalla con botón a Medidas */}
      <ScreenHeader
        title="Progreso"
        actions={
          <HeaderIconButton
            label="Medidas"
            onClick={() => navigate('/measurements')}
          >
            <Ruler size={22} strokeWidth={1.75} />
          </HeaderIconButton>
        }
      />

      {/* Subpestañas Resumen / Avanzadas */}
      <SegTabs
        value={activeTab}
        options={[
          { value: 'resumen', label: 'Resumen' },
          { value: 'avanzadas', label: 'Avanzadas' },
        ]}
        onChange={handleTabChange}
        label="Secciones de progreso"
      />

      <div className="flex-1 p-4 space-y-6">
        {activeTab === 'resumen' ? (
          <StatsSummaryTab
            workouts={workouts || []}
            exercisesById={exerciseMap}
            trainedExercises={trainedExercises}
            latestBodyweight={latestBodyweight}
            unit={unit}
            onOpenMuscleMap={handleOpenMuscleMap}
            onPreviewExercise={setPreviewExerciseId}
          />
        ) : (
          <StatsAdvancedTab
            workouts={workouts || []}
            exercisesById={exerciseMap}
            settings={settings && 'units' in settings ? settings : undefined}
            latestBodyweight={latestBodyweight}
            unit={unit}
            onPreviewExercise={setPreviewExerciseId}
          />
        )}
      </div>

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

export default StatsPage
