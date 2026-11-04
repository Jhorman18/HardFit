import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  Dumbbell,
  TrendingUp,
  Activity,
  ChevronRight,
} from 'lucide-react'
import type { Workout, Exercise } from '../../types'
import {
  seriesOverTime,
  personalRecords,
  type SeriesMetric,
} from '../../utils/stats'
import { displayWeight } from '../../utils/weightUnits'
import { formatNumber, formatWeight } from '../../utils/format'
import { SearchableSelect } from '../SearchableSelect'
import { ExerciseDemo } from '../ExerciseDemo'
import { RadarStatsSection } from '../RadarStatsSection'
import { TopExercisesSection } from '../TopExercisesSection'
import { RecordLights } from '../ui/RecordLights'

interface StatsSummaryTabProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
  trainedExercises: { id: string; name: string; muscleGroup?: string }[]
  latestBodyweight: number
  unit: string
  onOpenMuscleMap: () => void
  onPreviewExercise: (exerciseId: string) => void
}

export function StatsSummaryTab({
  workouts,
  exercisesById,
  trainedExercises,
  latestBodyweight,
  unit,
  onOpenMuscleMap,
  onPreviewExercise,
}: StatsSummaryTabProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [selectedMetric, setSelectedMetric] = useState<SeriesMetric>('1rm')

  const exerciseSelectOptions = useMemo(() => {
    return trainedExercises.map((ex) => ({
      value: ex.id,
      label: ex.name,
      subtitle: ex.muscleGroup,
    }))
  }, [trainedExercises])

  const activeExerciseId = useMemo(() => {
    if (trainedExercises.length === 0) return ''
    if (selectedExerciseId && trainedExercises.some((e) => e.id === selectedExerciseId)) {
      return selectedExerciseId
    }
    return trainedExercises[0].id
  }, [selectedExerciseId, trainedExercises])

  const activeExercise = activeExerciseId ? exercisesById.get(activeExerciseId) : undefined

  // Récords personales del ejercicio activo
  const activePRs = useMemo(() => {
    if (!workouts || !activeExercise) return null
    return personalRecords(workouts, activeExercise.id, activeExercise.type, latestBodyweight)
  }, [workouts, activeExercise, latestBodyweight])

  // Gráfica de evolución del ejercicio activo
  const exerciseProgressData = useMemo(() => {
    if (!workouts || !activeExerciseId) return []
    return seriesOverTime(
      workouts,
      activeExerciseId,
      selectedMetric,
      exercisesById,
      latestBodyweight
    ).map((point) => ({
      ...point,
      value: selectedMetric === 'reps' ? point.value : displayWeight(point.value, unit),
    }))
  }, [workouts, activeExerciseId, selectedMetric, exercisesById, latestBodyweight, unit])

  const lastProgressVal = exerciseProgressData.length > 0 ? exerciseProgressData[exerciseProgressData.length - 1].value : 0
  const firstProgressVal = exerciseProgressData.length > 0 ? exerciseProgressData[0].value : 0
  const progressDelta = lastProgressVal - firstProgressVal

  return (
    <div className="space-y-6">
      {/* 1. Selector de ejercicio + Récords + Gráfica */}
      <div className="bg-surface border border-line rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white tracking-tight">
            Progreso por ejercicio
          </h2>
          {activeExercise && (
            <span className="label-tech text-neutral-400">
              {activeExercise.muscleGroup}
            </span>
          )}
        </div>

        {trainedExercises.length === 0 ? (
          <div className="text-center py-6 text-xs text-neutral-400 bg-black/40 rounded-lg border border-line space-y-2">
            <Dumbbell size={24} className="mx-auto text-neutral-400" strokeWidth={1.75} />
            <p className="font-semibold text-white">
              Entrena para ver tu progreso por ejercicio
            </p>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Completa tus primeras sesiones para visualizar tus récords personales y curvas de evolución.
            </p>
          </div>
        ) : (
          <>
            {/* Buscador de ejercicio */}
            <div className="flex items-center gap-2.5">
              {activeExerciseId && (
                <ExerciseDemo
                  exerciseId={activeExerciseId}
                  variant="thumb"
                  className="w-10 h-10 shrink-0"
                  onClick={() => onPreviewExercise(activeExerciseId)}
                />
              )}
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  options={exerciseSelectOptions}
                  value={activeExerciseId}
                  onChange={setSelectedExerciseId}
                  placeholder="Buscar ejercicio entrenado..."
                  emptyMessage="No se encontraron ejercicios entrenados"
                />
              </div>
            </div>

            {/* Tarjetas de Récords Personales */}
            {activePRs && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-black/60 p-3 rounded-md border border-line text-center">
                  <span className="label-tech block text-neutral-400">
                    Peso máximo
                  </span>
                  <span className="text-lg font-bold text-white num">
                    {activePRs.maxWeight > 0 ? `${formatWeight(displayWeight(activePRs.maxWeight, unit))} ${unit}` : '—'}
                  </span>
                </div>

                <div className="bg-black/60 p-3 rounded-md border border-line text-center">
                  <span className="label-tech block text-neutral-400">
                    1RM estimado
                  </span>
                  <div className="text-lg font-bold text-white num flex items-center justify-center gap-1.5">
                    {activePRs.maxEst1RM > 0 ? (
                      <>
                        <span>{formatWeight(displayWeight(activePRs.maxEst1RM, unit))} {unit}</span>
                        <RecordLights lit={true} />
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>

                <div className="bg-black/60 p-3 rounded-md border border-line text-center">
                  <span className="label-tech block text-neutral-400">
                    Máx. repeticiones
                  </span>
                  <span className="text-lg font-bold text-white num">
                    {activePRs.maxReps > 0 ? `${activePRs.maxReps} reps` : '—'}
                  </span>
                </div>

                <div className="bg-black/60 p-3 rounded-md border border-line text-center">
                  <span className="label-tech block text-neutral-400">
                    Volumen máx. serie
                  </span>
                  <span className="text-lg font-bold text-white num">
                    {activePRs.maxVolumeSet > 0 ? `${formatNumber(displayWeight(activePRs.maxVolumeSet, unit), 0, 0)} ${unit}` : '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Selector de métrica */}
            <div className="space-y-3 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <div>
                  <span className="label-tech block text-neutral-400">
                    {selectedMetric === '1rm'
                      ? '1RM estimado'
                      : selectedMetric === 'volume'
                        ? 'Volumen por sesión'
                        : selectedMetric === 'weight'
                          ? 'Peso máximo'
                          : 'Repeticiones máximas'}
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-bold text-white num">
                      {formatNumber(lastProgressVal, selectedMetric === 'reps' ? 0 : 1, selectedMetric === 'reps' ? 0 : 1)}
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold">
                      {selectedMetric === 'reps' ? 'reps' : unit}
                    </span>
                  </div>
                </div>

                {exerciseProgressData.length > 1 && (
                  <div className="text-xs font-semibold text-neutral-300 border border-line rounded-sm px-2 py-1 num">
                    {progressDelta >= 0 ? `+${formatNumber(progressDelta, 1, 1)}` : formatNumber(progressDelta, 1, 1)} {selectedMetric === 'reps' ? 'reps' : unit}
                  </div>
                )}
              </div>

              {/* Botones de métrica */}
              <div className="inline-flex border border-line-strong rounded-sm overflow-hidden w-full">
                {(['1rm', 'volume', 'weight', 'reps'] as const).map((m) => {
                  const label = m === '1rm' ? '1RM est.' : m === 'volume' ? 'Volumen' : m === 'weight' ? 'Peso' : 'Reps'
                  const active = selectedMetric === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMetric(m)}
                      className={`flex-1 min-h-12 text-xs font-semibold uppercase tracking-wider transition ${
                        active ? 'bg-accent text-on-accent' : 'bg-transparent text-neutral-300'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Gráfica Recharts en escala neutra (sin acento en datos) */}
              <div className="w-full h-48 pt-2">
                {exerciseProgressData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-black/40 rounded-lg border border-line">
                    <TrendingUp size={24} className="text-neutral-400 mb-1" strokeWidth={1.75} />
                    <p className="text-xs text-neutral-400">
                      Sin registros válidos de este ejercicio aún.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={exerciseProgressData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
                      <XAxis
                        dataKey="formattedDate"
                        stroke="rgb(var(--n-400))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: 'rgb(var(--line))' }}
                      />
                      <YAxis
                        stroke="rgb(var(--n-400))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: 'rgb(var(--line))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(var(--surface))',
                          borderColor: 'rgb(var(--line-strong))',
                          borderRadius: '6px',
                          color: 'rgb(var(--fg))',
                          fontSize: '12px',
                          boxShadow: 'none',
                        }}
                        labelStyle={{ color: 'rgb(var(--n-300))', fontWeight: 'bold' }}
                        formatter={(val: unknown) => [
                          `${formatNumber(Number(val ?? 0), selectedMetric === 'reps' ? 0 : 1, selectedMetric === 'reps' ? 0 : 1)} ${
                            selectedMetric === 'reps' ? 'reps' : unit
                          }`,
                          selectedMetric === '1rm'
                            ? '1RM est.'
                            : selectedMetric === 'volume'
                              ? 'Volumen'
                              : selectedMetric === 'weight'
                                ? 'Peso máx'
                                : 'Reps máx',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="rgb(var(--n-200))"
                        strokeWidth={2.5}
                        dot={{ fill: 'rgb(var(--surface))', stroke: 'rgb(var(--n-200))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. Distribución muscular */}
      <div className="bg-surface border border-line rounded-lg p-4">
        <RadarStatsSection
          workouts={workouts}
          exercisesById={exercisesById}
          unit={unit}
          bodyweightKg={latestBodyweight}
        />
      </div>

      {/* 3. Ejercicios principales */}
      <div className="bg-surface border border-line rounded-lg p-4">
        <TopExercisesSection
          workouts={workouts}
          exercisesById={exercisesById}
          onPreviewExercise={onPreviewExercise}
        />
      </div>

      {/* 4. Botón de acceso a Mapa Muscular */}
      <button
        type="button"
        onClick={onOpenMuscleMap}
        className="btn-secondary w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Activity size={18} strokeWidth={1.75} />
          <span>Mapa muscular</span>
        </div>
        <ChevronRight size={18} strokeWidth={1.75} />
      </button>
    </div>
  )
}
