import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { Workout, Exercise, Settings } from '../../types'
import { weeklyHistory } from '../../utils/stats'
import { displayWeight } from '../../utils/weightUnits'
import { formatNumber } from '../../utils/format'
import { MonthlyReportSection } from '../MonthlyReportSection'
import { BodyMapPeriodSection } from '../BodyMapPeriodSection'
import { HealthMetricsSection } from '../HealthMetricsSection'

interface StatsAdvancedTabProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
  settings?: Settings
  latestBodyweight: number
  unit: string
  onPreviewExercise: (exerciseId: string) => void
}

export function StatsAdvancedTab({
  workouts,
  exercisesById,
  settings,
  latestBodyweight,
  unit,
  onPreviewExercise,
}: StatsAdvancedTabProps) {
  // Gráfica semanal: volumen de las últimas 12 semanas
  const weeklyData = useMemo(() => {
    if (!workouts) return []
    return weeklyHistory(workouts, exercisesById, 12, latestBodyweight).map((point) => ({
      ...point,
      volume: displayWeight(point.volume, unit),
    }))
  }, [workouts, exercisesById, latestBodyweight, unit])

  const totalRecentVol = weeklyData.reduce((acc, p) => acc + p.volume, 0)

  return (
    <div className="space-y-6">
      {/* 1. Informe mensual */}
      <div className="bg-surface border border-line rounded-lg p-4">
        <MonthlyReportSection
          workouts={workouts}
          exercisesById={exercisesById}
          unit={unit}
          bodyweightKg={latestBodyweight}
          onPreviewExercise={onPreviewExercise}
        />
      </div>

      {/* 2. Volumen por semana (escala neutra, sin acento en datos) */}
      <div className="bg-surface border border-line rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Volumen por semana
            </h2>
            <p className="text-[13px] text-neutral-400">Toneladas acumuladas (últimas 12 semanas)</p>
          </div>
          <span className="text-xs font-semibold text-neutral-300 num">
            {formatNumber(totalRecentVol / 1000, 1, 1)} t total
          </span>
        </div>

        <div className="w-full h-48 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
              <XAxis
                dataKey="weekLabel"
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
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val))}
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
                  `${formatNumber(Number(val ?? 0), 0, 0)} ${unit}`,
                  'Volumen',
                ]}
              />
              <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
                {weeklyData.map((_, index) => {
                  const isCurrent = index === weeklyData.length - 1
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isCurrent ? 'rgb(var(--n-300))' : 'rgb(var(--n-600))'}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Reparto muscular por periodo */}
      <div className="bg-surface border border-line rounded-lg p-4">
        <BodyMapPeriodSection
          workouts={workouts}
          exercisesById={exercisesById}
        />
      </div>

      {/* 4. Métricas de salud */}
      <div className="bg-surface border border-line rounded-lg p-4">
        <HealthMetricsSection
          settings={settings}
          latestBodyweight={latestBodyweight}
        />
      </div>
    </div>
  )
}
