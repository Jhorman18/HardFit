import { useState, useMemo } from 'react'
import type { Workout, Exercise } from '../../types'
import { workoutVolume } from '../../utils/stats'
import { displayWeight } from '../../utils/weightUnits'
import { formatNumber } from '../../utils/format'

interface WeekStreakProps {
  workouts: Workout[]
  exerciseMap: Map<string, Exercise>
  latestBodyweight: number
  unit: string
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function WeekStreak({
  workouts,
  exerciseMap,
  latestBodyweight,
  unit,
}: WeekStreakProps) {
  const [now] = useState(() => new Date())
  const { weekDays, thisWeekCount, thisWeekVolume } = useMemo(() => {
    const currentDay = now.getDay()
    const distanceToMonday = (currentDay + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - distanceToMonday)
    monday.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(monday)
    endOfWeek.setDate(monday.getDate() + 7)

    const thisWeek = workouts.filter((w) => {
      const time = w.finishedAt || w.startedAt
      return time >= monday.getTime() && time < endOfWeek.getTime()
    })

    const days = DAY_LABELS.map((label, idx) => {
      const dayDate = new Date(monday)
      dayDate.setDate(monday.getDate() + idx)
      const isToday = dayDate.toDateString() === now.toDateString()
      const hasWorkout = thisWeek.some((w) => {
        const wDate = new Date(w.finishedAt || w.startedAt)
        return wDate.toDateString() === dayDate.toDateString()
      })
      return { label, isToday, hasWorkout }
    })

    let vol = 0
    for (const w of thisWeek) {
      vol += displayWeight(workoutVolume(w, exerciseMap, latestBodyweight), unit)
    }

    return {
      weekDays: days,
      thisWeekCount: thisWeek.length,
      thisWeekVolume: vol,
    }
  }, [now, workouts, exerciseMap, latestBodyweight, unit])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Esta semana</h2>
      </div>

      <div className="flex gap-2">
        {weekDays.map(({ label, isToday, hasWorkout }) => {
          let indicatorClasses = 'w-10 h-10 rounded-full flex items-center justify-center border-2 '
          if (isToday) {
            indicatorClasses += 'bg-surface border-accent'
          } else if (hasWorkout) {
            indicatorClasses += 'bg-elevated border-neutral-400'
          } else {
            indicatorClasses += 'bg-surface border-line'
          }

          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="label-tech">{label}</span>
              <div className={indicatorClasses} aria-label={`${label}${isToday ? ', hoy' : ''}: ${hasWorkout ? 'entrenado' : 'sin entreno'}`}>
                {hasWorkout && <span className="w-3 h-3 rounded-full bg-neutral-300" />}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-around py-3 px-4 bg-surface border border-line rounded-md">
        <div className="flex flex-col items-center">
          <span className="num text-2xl text-white">{thisWeekCount}</span>
          <span className="label-tech mt-0.5">
            {thisWeekCount === 1 ? 'ENTRENO' : 'ENTRENOS'}
          </span>
        </div>
        <div className="w-px h-8 bg-line" aria-hidden="true" />
        <div className="flex flex-col items-center">
          <span className="num text-2xl text-white">{formatNumber(thisWeekVolume)}</span>
          <span className="label-tech mt-0.5">{unit.toUpperCase()} TOTALES</span>
        </div>
      </div>
    </section>
  )
}
