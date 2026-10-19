import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import { Dumbbell } from 'lucide-react'
import type { Workout, Exercise } from '../types'
import { topExercises } from '../utils/stats'
import { ExerciseDemo } from './ExerciseDemo'

export interface TopExercisesSectionProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
}

type PeriodOption = '7d' | '30d' | 'all'

export function TopExercisesSection({ workouts, exercisesById }: TopExercisesSectionProps) {
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

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Ejercicios Principales</h2>
          <p className="text-xs text-neutral-400">Top 10 más frecuentes por sesiones y series</p>
        </div>

        {/* Selector de período */}
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
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              period === 'all' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todo
          </button>
        </div>
      </div>

      {topList.length === 0 ? (
        <div className="text-center py-8 text-xs text-neutral-500 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
          <Dumbbell size={24} className="mx-auto text-neutral-600 mb-2" />
          No hay ejercicios registrados en el período seleccionado.
        </div>
      ) : (
        <div className="divide-y divide-neutral-800/80">
          {topList.map((item, index) => (
            <div key={item.exerciseId} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
              <span className="text-xs font-bold text-neutral-500 w-4 text-center shrink-0">
                {index + 1}
              </span>

              <ExerciseDemo
                exerciseId={item.exerciseId}
                variant="thumb"
                className="w-11 h-11 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                <span className="text-[10px] text-neutral-400 bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                  {item.muscleGroup}
                </span>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-white">
                  {item.sessions} {item.sessions === 1 ? 'vez' : 'veces'}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {item.sets} {item.sets === 1 ? 'serie' : 'series'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
