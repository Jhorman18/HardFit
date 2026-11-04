import { useState, useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  addWeeks,
  format,
  isSameWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import type { Workout, Exercise } from '../types'
import { musclesWorkedInPeriod, setsByMuscleGroup, formatSetsCount } from '../utils/stats'
import { useMuscleOverridesMap, getMuscleNameEs } from '../utils/effectiveMuscles'
import { BodyMuscleChart } from './BodyMuscleChart'

export interface BodyMapPeriodSectionProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
}

export function BodyMapPeriodSection({
  workouts,
  exercisesById,
}: BodyMapPeriodSectionProps) {
  const [today] = useState(() => new Date())
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date()
    if (!workouts || workouts.length === 0) return now
    const startThisWeek = startOfWeek(now, { weekStartsOn: 1 }).getTime()
    const endThisWeek = endOfWeek(now, { weekStartsOn: 1 }).getTime()
    const hasWorkoutThisWeek = workouts.some((w) => {
      const ts = w.finishedAt ?? w.startedAt
      return ts >= startThisWeek && ts <= endThisWeek
    })
    if (hasWorkoutThisWeek) return now

    const sorted = [...workouts].sort(
      (a, b) => (b.finishedAt ?? b.startedAt) - (a.finishedAt ?? a.startedAt)
    )
    const latest = sorted[0]
    return latest ? new Date(latest.finishedAt ?? latest.startedAt) : now
  })

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  )
  const weekEnd = useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  )

  const isCurrentWeek = useMemo(
    () => isSameWeek(today, currentDate, { weekStartsOn: 1 }),
    [today, currentDate]
  )

  const overridesMap = useMuscleOverridesMap()

  // Músculos trabajados por MuscleKey para heatmap anatómico
  const muscleCounts = useMemo(() => {
    return musclesWorkedInPeriod(
      workouts,
      exercisesById,
      undefined,
      weekStart.getTime(),
      weekEnd.getTime(),
      overridesMap
    )
  }, [workouts, exercisesById, weekStart, weekEnd, overridesMap])

  // Desglose de series por grupo muscular para la tabla inferior
  const muscleGroupSets = useMemo(() => {
    return setsByMuscleGroup(
      workouts,
      exercisesById,
      weekStart.getTime(),
      weekEnd.getTime(),
      overridesMap
    )
  }, [workouts, exercisesById, weekStart, weekEnd, overridesMap])

  const sortedMuscleGroups = useMemo(() => {
    return Object.entries(muscleGroupSets).sort((a, b) => b[1] - a[1])
  }, [muscleGroupSets])

  const totalWeeklySets = useMemo(() => {
    return sortedMuscleGroups.reduce((acc, [, count]) => acc + count, 0)
  }, [sortedMuscleGroups])

  const weekLabel = useMemo(() => {
    const startStr = format(weekStart, "d 'de' MMM", { locale: es })
    const endStr = format(weekEnd, "d 'de' MMM yyyy", { locale: es })
    return `${startStr} – ${endStr}`
  }, [weekStart, weekEnd])

  return (
    <div className="space-y-4">
      {/* Cabecera y selector de semana */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Reparto muscular por período
          </h2>
          <p className="text-[13px] text-neutral-400">Distribución anatómica de series en la semana</p>
        </div>

        {/* Controles de navegación de semana */}
        <div className="flex items-center gap-1 bg-surface px-1 py-0.5 rounded-md border border-line">
          <button
            type="button"
            onClick={() => setCurrentDate((prev) => subWeeks(prev, 1))}
            className="press min-w-10 min-h-10 flex items-center justify-center text-neutral-400 hover:text-white"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>

          <span className="text-xs font-semibold text-neutral-200 px-2 capitalize min-w-[120px] text-center">
            {isCurrentWeek ? 'Esta semana' : weekLabel}
          </span>

          <button
            type="button"
            onClick={() => setCurrentDate((prev) => addWeeks(prev, 1))}
            disabled={isCurrentWeek}
            className={`press min-w-10 min-h-10 flex items-center justify-center ${
              isCurrentWeek
                ? 'text-neutral-600 cursor-not-allowed opacity-40'
                : 'text-neutral-400 hover:text-white'
            }`}
            aria-label="Semana siguiente"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Subetiqueta con rango de fechas explícito si está en "Esta semana" */}
      {isCurrentWeek && (
        <div className="text-xs text-neutral-400 font-medium text-center capitalize">
          {weekLabel}
        </div>
      )}

      {/* Mapa anatómico */}
      <div className="bg-surface border border-line rounded-lg p-3 flex flex-col items-center">
        {totalWeeklySets === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-400">
            <Activity size={24} className="mx-auto text-neutral-400 mb-2" strokeWidth={1.75} />
            No hay series registradas en esta semana.
          </div>
        ) : (
          <>
            <BodyMuscleChart
              intensities={muscleCounts}
              size="lg"
              usePatterns={true}
            />

            {/* Leyenda del heatmap muscular con tramas SVG */}
            <div className="pt-3 border-t border-line w-full mt-3">
              <span className="label-tech block mb-2">Series por semana</span>
              <ul className="flex items-center justify-between gap-2 flex-wrap list-none">
                <li className="flex items-center gap-1.5 text-xs text-neutral-300">
                  <svg className="w-4 h-4 rounded-sm border border-line-strong shrink-0" viewBox="0 0 60 60" aria-hidden="true">
                    <rect x="0" y="0" width="60" height="60" fill="rgb(var(--n-700))" />
                  </svg>
                  <span className="num">0</span>
                </li>
                <li className="flex items-center gap-1.5 text-xs text-neutral-300">
                  <svg className="w-4 h-4 rounded-sm border border-line-strong shrink-0" viewBox="0 0 60 60" aria-hidden="true">
                    <rect x="0" y="0" width="60" height="60" fill="url(#heat-pat-1)" />
                  </svg>
                  <span className="num">1–5</span>
                </li>
                <li className="flex items-center gap-1.5 text-xs text-neutral-300">
                  <svg className="w-4 h-4 rounded-sm border border-line-strong shrink-0" viewBox="0 0 60 60" aria-hidden="true">
                    <rect x="0" y="0" width="60" height="60" fill="url(#heat-pat-2)" />
                  </svg>
                  <span className="num">6–10</span>
                </li>
                <li className="flex items-center gap-1.5 text-xs text-neutral-300">
                  <svg className="w-4 h-4 rounded-sm border border-line-strong shrink-0" viewBox="0 0 60 60" aria-hidden="true">
                    <rect x="0" y="0" width="60" height="60" fill="url(#heat-pat-3)" />
                  </svg>
                  <span className="num">11–18</span>
                </li>
                <li className="flex items-center gap-1.5 text-xs text-neutral-300">
                  <svg className="w-4 h-4 rounded-sm border border-line-strong shrink-0" viewBox="0 0 60 60" aria-hidden="true">
                    <rect x="0" y="0" width="60" height="60" fill="rgb(var(--n-100))" />
                  </svg>
                  <span className="num">19+</span>
                </li>
              </ul>
              <p className="hint text-[11px] text-neutral-400 mt-2">
                Vacío, punteado, rayado, rejilla y sólido: cada nivel se distingue por su trama.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Lista de series por grupo muscular */}
      <div className="space-y-2">
        <h3 className="label-tech text-neutral-400">
          Por grupo muscular
        </h3>

        {sortedMuscleGroups.length === 0 ? (
          <div className="text-xs text-neutral-400 text-center py-4 bg-surface rounded-lg border border-line">
            Sin actividad muscular en el período.
          </div>
        ) : (
          <ul className="border-t border-b border-line divide-y divide-line list-none">
            {sortedMuscleGroups.map(([group, count]) => (
              <li
                key={group}
                className="flex items-center justify-between py-2 min-h-11 text-xs"
              >
                <span className="text-white font-medium">{getMuscleNameEs(group)}</span>
                <span className="num text-neutral-300 font-semibold">
                  {formatSetsCount(count)} {count === 1 ? 'serie' : 'series'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
