import { displayWeight } from '../utils/weightUnits'
import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { Dumbbell, Clock, Weight, Layers, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Workout, Exercise } from '../types'
import {
  radarByRegion,
  periodSummary,
  setsByMuscleGroup,
  formatSetsCount,
  type RadarAxis,
} from '../utils/stats'
import { useMuscleOverridesMap, getMuscleNameEs } from '../utils/effectiveMuscles'
import { formatNumber } from '../utils/format'

export interface RadarStatsSectionProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
  unit?: string
  bodyweightKg?: number
}

type PeriodSpan = '7d' | '30d'

const RADAR_AXES: RadarAxis[] = ['Espalda', 'Pecho', 'Core', 'Hombros', 'Brazos', 'Piernas']

function formatDurationSec(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 min'
  const totalMin = Math.round(seconds / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function renderDelta(current: number, previous: number, suffix = '') {
  const diff = current - previous
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-400">
        <Minus size={12} strokeWidth={1.75} /> <span className="num">0</span>{suffix}
      </span>
    )
  }

  const isPositive = diff > 0
  const pct =
    previous > 0 ? Math.round((Math.abs(diff) / previous) * 100) : null

  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-300">
      {isPositive ? <TrendingUp size={12} strokeWidth={1.75} /> : <TrendingDown size={12} strokeWidth={1.75} />}
      <span className="num">{isPositive ? `+${formatNumber(diff, 0, 0)}` : formatNumber(diff, 0, 0)}</span>
      {suffix}
      {pct !== null && <span className="text-neutral-400 ml-0.5 num">({pct}%)</span>}
    </span>
  )
}

export function RadarStatsSection({
  workouts,
  exercisesById,
  unit = 'kg',
  bodyweightKg,
}: RadarStatsSectionProps) {
  const [period, setPeriod] = useState<PeriodSpan>('30d')
  const [now] = useState(() => Date.now())

  // Intervalos actual y anterior equivalente
  const { actualFrom, actualTo, anteriorFrom, anteriorTo } = useMemo(() => {
    const days = period === '7d' ? 7 : 30
    const actualFromTs = subDays(now, days).getTime()
    const anteriorFromTs = subDays(actualFromTs, days).getTime()

    return {
      actualFrom: actualFromTs,
      actualTo: now,
      anteriorFrom: anteriorFromTs,
      anteriorTo: actualFromTs,
    }
  }, [period, now])

  const overridesMap = useMuscleOverridesMap()

  // Datos para los 6 ejes del radar
  const radarActual = useMemo(
    () => radarByRegion(workouts, exercisesById, actualFrom, actualTo, overridesMap),
    [workouts, exercisesById, actualFrom, actualTo, overridesMap]
  )

  const radarAnterior = useMemo(
    () => radarByRegion(workouts, exercisesById, anteriorFrom, anteriorTo, overridesMap),
    [workouts, exercisesById, anteriorFrom, anteriorTo, overridesMap]
  )

  const radarData = useMemo(() => {
    return RADAR_AXES.map((axis) => ({
      region: axis,
      Actual: radarActual[axis] || 0,
      Anterior: radarAnterior[axis] || 0,
    }))
  }, [radarActual, radarAnterior])

  // Resumen del período actual y anterior
  const actualSummary = useMemo(
    () => periodSummary(workouts, actualFrom, actualTo, exercisesById, bodyweightKg),
    [workouts, actualFrom, actualTo, exercisesById, bodyweightKg]
  )

  const anteriorSummary = useMemo(
    () => periodSummary(workouts, anteriorFrom, anteriorTo, exercisesById, bodyweightKg),
    [workouts, anteriorFrom, anteriorTo, exercisesById, bodyweightKg]
  )

  // Desglose de series por grupo para el período actual
  const actualSetsByGroup = useMemo(
    () => setsByMuscleGroup(workouts, exercisesById, actualFrom, actualTo, overridesMap),
    [workouts, exercisesById, actualFrom, actualTo, overridesMap]
  )

  const sortedGroups = useMemo(() => {
    return Object.entries(actualSetsByGroup).sort((a, b) => b[1] - a[1])
  }, [actualSetsByGroup])

  const hasData =
    actualSummary.workouts > 0 || anteriorSummary.workouts > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Distribución por músculo
          </h2>
          <p className="text-[13px] text-neutral-400">
            Equilibrio por región: actual vs período anterior
          </p>
        </div>

        {/* Selector 7 días / 30 días */}
        <div className="inline-flex border border-line-strong rounded-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`min-h-12 px-3 text-xs font-semibold uppercase tracking-wider transition ${
              period === '7d' ? 'bg-accent text-on-accent' : 'bg-transparent text-neutral-300'
            }`}
          >
            7 días
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30d')}
            className={`min-h-12 px-3 text-xs font-semibold uppercase tracking-wider transition ${
              period === '30d' ? 'bg-accent text-on-accent' : 'bg-transparent text-neutral-300'
            }`}
          >
            30 días
          </button>
        </div>
      </div>

      {/* Gráfico Radar monocromo con variables CSS */}
      <div className="w-full h-64 bg-surface border border-line rounded-lg p-2 flex items-center justify-center">
        {!hasData ? (
          <div className="text-center text-xs text-neutral-400 py-6">
            Sin actividad en el período seleccionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="rgb(var(--line))" />
              <PolarAngleAxis
                dataKey="region"
                stroke="rgb(var(--n-400))"
                tick={{ fill: 'rgb(var(--n-300))', fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                stroke="rgb(var(--line))"
                tick={{ fill: 'rgb(var(--n-400))', fontSize: 10 }}
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
                labelStyle={{ color: 'rgb(var(--fg))', fontWeight: 'bold' }}
                formatter={(val: unknown, name: unknown) => {
                  const num = typeof val === 'number' ? val : Number(val) || 0
                  return [
                    `${formatSetsCount(num)} ${num === 1 ? 'serie' : 'series'}`,
                    String(name),
                  ]
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                formatter={(val) => <span className="text-neutral-300">{val}</span>}
              />
              <Radar
                name="Actual"
                dataKey="Actual"
                stroke="rgb(var(--n-200))"
                fill="rgb(var(--n-200))"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Radar
                name="Anterior"
                dataKey="Anterior"
                stroke="rgb(var(--n-500))"
                fill="rgb(var(--n-500))"
                fillOpacity={0.12}
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 4 Métricas con deltas vs período anterior */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface p-3 rounded-lg border border-line">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="label-tech">Entrenamientos</span>
            <Dumbbell size={14} className="text-neutral-400" strokeWidth={1.75} />
          </div>
          <div className="mt-1 text-2xl font-bold text-white num">
            {actualSummary.workouts}
          </div>
          <div className="mt-1">
            {renderDelta(actualSummary.workouts, anteriorSummary.workouts)}
          </div>
        </div>

        <div className="bg-surface p-3 rounded-lg border border-line">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="label-tech">Volumen Total</span>
            <Weight size={14} className="text-neutral-400" strokeWidth={1.75} />
          </div>
          <div className="mt-1 text-2xl font-bold text-white num">
            {formatNumber(displayWeight(actualSummary.volume, unit), 0, 0)}{' '}
            <span className="text-xs font-normal text-neutral-400">{unit}</span>
          </div>
          <div className="mt-1">
            {renderDelta(
              displayWeight(actualSummary.volume, unit),
              displayWeight(anteriorSummary.volume, unit),
              ` ${unit}`
            )}
          </div>
        </div>

        <div className="bg-surface p-3 rounded-lg border border-line">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="label-tech">Series Válidas</span>
            <Layers size={14} className="text-neutral-400" strokeWidth={1.75} />
          </div>
          <div className="mt-1 text-2xl font-bold text-white num">
            {actualSummary.sets}
          </div>
          <div className="mt-1">
            {renderDelta(actualSummary.sets, anteriorSummary.sets)}
          </div>
        </div>

        <div className="bg-surface p-3 rounded-lg border border-line">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="label-tech">Tiempo Total</span>
            <Clock size={14} className="text-neutral-400" strokeWidth={1.75} />
          </div>
          <div className="mt-1 text-2xl font-bold text-white num">
            {formatDurationSec(actualSummary.durationSec)}
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            vs {formatDurationSec(anteriorSummary.durationSec)} anterior
          </div>
        </div>
      </div>

      {/* Desglose de series por grupo muscular en el período */}
      {sortedGroups.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="label-tech text-neutral-400">
            Detalle por grupo muscular
          </h3>
          <ul className="border-t border-b border-line divide-y divide-line list-none">
            {sortedGroups.map(([group, count]) => (
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
        </div>
      )}
    </div>
  )
}
