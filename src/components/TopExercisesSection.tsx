import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import { Dumbbell } from 'lucide-react'
import type { Workout, Exercise } from '../types'
import { topExercises } from '../utils/stats'
import { ExerciseDemo } from './ExerciseDemo'

export interface TopExercisesSectionProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
  onPreviewExercise?: (exerciseId: string) => void
}

type PeriodOption = '7d' | '30d' | 'all'

export function TopExercisesSection({ workouts, exercisesById, onPreviewExercise }: TopExercisesSectionProps) {
  const [period, setPeriod] = useState<PeriodOption>('30d')
  const [now] = useState(() => new Date())

  const topList = useMemo(() => {
    let fromTs: number | undefined

    if (period === '7d') {
      fromTs = subDays(now, 7).getTime()
    } else if (period === '30d') {
      fromTs = subDays(now, 30).getTime()
    }

    const all = topExercises(workouts, exercisesById, fromTs)
    return all.slice(0, 10)
  }, [workouts, exercisesById, period, now])

  const maxSets = topList.length > 0 ? topList[0].sets : 1

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">Ejercicios principales</h2>
          <p className="text-[13px] text-neutral-400">Por sesiones y series en el período</p>
        </div>

        {/* Selector de período */}
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
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`min-h-12 px-3 text-xs font-semibold uppercase tracking-wider transition ${
              period === 'all' ? 'bg-accent text-on-accent' : 'bg-transparent text-neutral-300'
            }`}
          >
            Todo
          </button>
        </div>
      </div>

      {topList.length === 0 ? (
        <div className="text-center py-8 text-xs text-neutral-400 bg-surface rounded-lg border border-line">
          <Dumbbell size={24} className="mx-auto text-neutral-400 mb-2" strokeWidth={1.75} />
          No hay ejercicios registrados en el período seleccionado.
        </div>
      ) : (
        <ul className="border-t border-b border-line divide-y divide-line list-none">
          {topList.map((item, index) => {
            const pct = Math.max(8, Math.round((item.sets / maxSets) * 100))

            return (
              <li
                key={item.exerciseId}
                className="py-2.5 flex items-center gap-3 min-h-12"
              >
                <span className="text-xs font-bold text-neutral-400 w-4 text-center shrink-0 num">
                  {index + 1}
                </span>

                <ExerciseDemo
                  exerciseId={item.exerciseId}
                  variant="thumb"
                  className="w-10 h-10 shrink-0"
                  onClick={onPreviewExercise ? () => onPreviewExercise(item.exerciseId) : undefined}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      onClick={onPreviewExercise ? () => onPreviewExercise(item.exerciseId) : undefined}
                      className={`text-[15px] font-medium text-white truncate ${
                        onPreviewExercise ? 'cursor-pointer hover:text-neutral-300' : ''
                      }`}
                    >
                      {item.name}
                    </p>
                    <span className="text-xs text-neutral-300 shrink-0 num">
                      {item.sets} {item.sets === 1 ? 'serie' : 'series'}
                    </span>
                  </div>

                  {/* Barra proporcional en escala neutra */}
                  <div className="h-1.5 w-full bg-elevated rounded-sm overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-neutral-600 rounded-sm"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
