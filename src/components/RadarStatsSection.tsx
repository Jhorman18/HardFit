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
import { useMuscleOverridesMap } from '../utils/effectiveMuscles'

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
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-neutral-400">
        <Minus size={11} /> 0{suffix}
      </span>
    )
  }

  const isPositive = diff > 0
  const pct =
    previous > 0 ? Math.round((Math.abs(diff) / previous) * 100) : null

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
        isPositive ? 'text-emerald-400' : 'text-neutral-400'
      }`}
    >
      {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isPositive ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
      {suffix}
      {pct !== null && <span className="opacity-80 ml-0.5">({pct}%)</span>}
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
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">
            Distribución por Músculo
          </h2>
          <p className="text-xs text-neutral-400">
            Equilibrio por región: actual vs período anterior
          </p>
        </div>

        {/* Selector 7 días / 30 días */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              period === '7d' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            7 días
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30d')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              period === '30d' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            30 días
          </button>
        </div>
      </div>

      {/* Gráfico Radar monocromo */}
      <div className="w-full h-64 bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-2 flex items-center justify-center">
        {!hasData ? (
          <div className="text-center text-xs text-neutral-500 py-6">
            Sin actividad en el período seleccionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="rgb(var(--n-800))" />
              <PolarAngleAxis
                dataKey="region"
                stroke="rgb(var(--n-400))"
                tick={{ fill: 'rgb(var(--n-200))', fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                stroke="rgb(var(--n-700))"
                tick={{ fill: 'rgb(var(--n-500))', fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(var(--n-950))',
                  borderColor: 'rgb(var(--n-800))',
                  borderRadius: '0.75rem',
                  color: 'rgb(var(--fg))',
                  fontSize: '12px',
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
                wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                formatter={(val) => <span className="text-neutral-300">{val}</span>}
              />
              <Radar
                name="Actual"
                dataKey="Actual"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.35}
                strokeWidth={2}
              />
              <Radar
                name="Anterior"
                dataKey="Anterior"
                stroke="#6b7280"
                fill="#6b7280"
                fillOpacity={0.15}
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 4 TARJETAS CON DELTAS vs PERÍODO ANTERIOR */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Entrenamientos */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Entrenamientos
            </span>
            <Dumbbell size={14} className="text-white" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-white">
            {actualSummary.workouts}
          </div>
          <div className="mt-1">
            {renderDelta(actualSummary.workouts, anteriorSummary.workouts)}
          </div>
        </div>

        {/* Duración */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Duración
            </span>
            <Clock size={14} className="text-white" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-white">
            {formatDurationSec(actualSummary.durationSec)}
          </div>
          <div className="mt-1">
            {(() => {
              const diffMin = Math.round(
                (actualSummary.durationSec - anteriorSummary.durationSec) / 60
              )
              return renderDelta(diffMin, 0, ' min')
            })()}
          </div>
        </div>

        {/* Volumen */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Volumen
            </span>
            <Weight size={14} className="text-white" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-white">
            {displayWeight(actualSummary.volume, unit).toLocaleString()}{' '}
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

        {/* Series */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Series
            </span>
            <Layers size={14} className="text-white" />
          </div>
          <div className="mt-1 text-xl font-extrabold text-white">
            {actualSummary.sets}
          </div>
          <div className="mt-1">
            {renderDelta(actualSummary.sets, anteriorSummary.sets)}
          </div>
        </div>
      </div>

      {/* Mini-lista: Recuento de series por grupo */}
      <div className="space-y-2 pt-1 border-t border-neutral-800/80">
        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
          Recuento de series por grupo ({period === '7d' ? 'últimos 7 días' : 'últimos 30 días'})
        </h3>

        {sortedGroups.length === 0 ? (
          <div className="text-xs text-neutral-500 py-3 text-center bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
            Sin series en el período actual.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {sortedGroups.map(([group, count]) => (
              <div
                key={group}
                className="bg-neutral-950 border border-neutral-800/80 px-2.5 py-1.5 rounded-xl flex items-center justify-between"
              >
                <span className="font-semibold text-neutral-300 truncate pr-1">{group}</span>
                <span className="font-mono text-white font-bold shrink-0">
                  {formatSetsCount(count)} <span className="text-[10px] text-neutral-500 font-normal">{count === 1 ? 'serie' : 'series'}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
