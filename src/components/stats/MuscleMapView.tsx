import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import type { Workout, Exercise } from '../../types'
import { musclesWorkedInPeriod, setsByMuscleGroup, formatSetsCount } from '../../utils/stats'
import { useMuscleOverridesMap, getMuscleNameEs } from '../../utils/effectiveMuscles'
import { BodyMuscleChart } from '../BodyMuscleChart'
import { ScreenHeader } from '../ui/ScreenHeader'
import { SegTabs } from '../ui/SegTabs'

interface MuscleMapViewProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
  onBack: () => void
}

type PeriodOption = '7' | '28' | '90'

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: '7', label: '7 días' },
  { value: '28', label: '4 sem' },
  { value: '90', label: '3 meses' },
]

export function MuscleMapView({ workouts, exercisesById, onBack }: MuscleMapViewProps) {
  const [period, setPeriod] = useState<PeriodOption>('7')
  const [now] = useState(() => Date.now())

  const fromTs = useMemo(() => {
    const days = period === '7' ? 7 : period === '28' ? 28 : 90
    return subDays(now, days).getTime()
  }, [period, now])

  const overridesMap = useMuscleOverridesMap()

  // Músculos trabajados por MuscleKey para heatmap anatómico respetando overridesMap
  const muscleCounts = useMemo(() => {
    return musclesWorkedInPeriod(
      workouts,
      exercisesById,
      undefined,
      fromTs,
      now,
      overridesMap
    )
  }, [workouts, exercisesById, fromTs, now, overridesMap])

  // Desglose de series por grupo para la lista
  const muscleGroupSets = useMemo(() => {
    return setsByMuscleGroup(
      workouts,
      exercisesById,
      fromTs,
      now,
      overridesMap
    )
  }, [workouts, exercisesById, fromTs, now, overridesMap])

  const sortedGroups = useMemo(() => {
    return Object.entries(muscleGroupSets).sort((a, b) => b[1] - a[1])
  }, [muscleGroupSets])

  const periodLabel = period === '7' ? 'Últimos 7 días' : period === '28' ? 'Últimas 4 semanas' : 'Últimos 3 meses'

  return (
    <div className="min-h-full flex flex-col bg-black">
      <ScreenHeader
        title="Mapa muscular"
        leading={
          <button
            type="button"
            onClick={onBack}
            aria-label="Atrás"
            className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-300 active:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        }
      />

      <SegTabs
        value={period}
        options={PERIOD_OPTIONS}
        onChange={(val) => setPeriod(val)}
        label="Periodo"
      />

      <div className="flex-1 p-4 space-y-6">
        {/* Siluetas anatómicas con tramas SVG */}
        <div className="bg-surface border border-line rounded-lg p-4 flex flex-col items-center">
          <BodyMuscleChart
            intensities={muscleCounts}
            size="lg"
            usePatterns={true}
          />

          {/* Leyenda con tramas reales */}
          <div className="pt-4 border-t border-line w-full mt-4">
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
        </div>

        {/* Sección "Por músculo" */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white tracking-tight">Por músculo</h2>
            <span className="text-xs text-neutral-400">{periodLabel}</span>
          </div>

          {sortedGroups.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-6 bg-surface border border-line rounded-lg">
              Sin actividad registrada en este período.
            </div>
          ) : (
            <ul className="border-t border-b border-line divide-y divide-line list-none">
              {sortedGroups.map(([group, count]) => (
                <li
                  key={group}
                  className="flex items-center justify-between py-2 min-h-12 text-sm"
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
    </div>
  )
}
