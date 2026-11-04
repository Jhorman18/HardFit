import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Workout, Exercise } from '../../types'
import { workoutVolume, countValidSets } from '../../utils/stats'
import { displayWeight } from '../../utils/weightUnits'
import { formatNumber } from '../../utils/format'

interface RecentWorkoutsProps {
  workouts: Workout[]
  exerciseMap: Map<string, Exercise>
  latestBodyweight: number
  unit: string
}

function getDurationMinutes(w: Workout): number {
  if (!w.finishedAt || !w.startedAt) return 0
  return Math.max(1, Math.round((w.finishedAt - w.startedAt) / 60000))
}

export function RecentWorkouts({
  workouts,
  exerciseMap,
  latestBodyweight,
  unit,
}: RecentWorkoutsProps) {
  if (workouts.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Últimos entrenos</h2>
        <Link
          to="/history"
          className="press text-sm font-semibold text-neutral-300 hover:text-white"
        >
          Ver todos
        </Link>
      </div>

      <div className="space-y-2">
        {workouts.map((w) => {
          const date = new Date(w.finishedAt || w.startedAt)
          const dayName = format(date, 'EEE', { locale: es })
          const dayNumber = format(date, 'd')
          const vol = displayWeight(workoutVolume(w, exerciseMap, latestBodyweight), unit)
          const validSets = countValidSets(w)
          const duration = getDurationMinutes(w)

          return (
            <Link
              key={w.id}
              to={`/history/${w.id}`}
              className="press flex items-center gap-3 p-3 bg-surface border border-line rounded-md hover:bg-elevated text-left"
            >
              <div className="w-10 shrink-0 text-center border-r border-line pr-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                  {dayName}
                </span>
                <span className="num text-xl font-bold text-white block leading-tight">
                  {dayNumber}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-base font-semibold text-white truncate block">
                  {w.name}
                </span>
                <span className="text-[13px] text-neutral-400 num mt-0.5 block truncate">
                  {duration} min · {formatNumber(vol)} {unit} · {validSets} series
                </span>
              </div>

              <ChevronRight size={18} className="text-neutral-400 shrink-0" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
