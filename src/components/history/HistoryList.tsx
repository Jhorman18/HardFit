import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, History, Dumbbell } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Workout, Exercise } from '../../types'
import { workoutVolume, countValidSets, checkSetPR, type personalRecords } from '../../utils/stats'
import { displayWeight } from '../../utils/weightUnits'
import { formatNumber } from '../../utils/format'
import { RecordLights } from '../ui'

interface HistoryListProps {
  workouts: Workout[]
  exerciseMap: Map<string, Exercise>
  prsByExercise: Map<string, ReturnType<typeof personalRecords>>
  latestBodyweight: number
  unit: string
  onSelectWorkout: (id: string) => void
  onCreatePastWorkout: () => void
}

interface MonthGroup {
  monthKey: string
  monthTitle: string
  workouts: Workout[]
  totalVolume: number
  count: number
}

const TRANCHE_SIZE = 20

function getDurationMinutes(w: Workout): number {
  if (!w.finishedAt || !w.startedAt) return 0
  return Math.max(1, Math.round((w.finishedAt - w.startedAt) / 60000))
}

function countWorkoutPRs(
  w: Workout,
  exerciseMap: Map<string, Exercise>,
  prsByExercise: Map<string, ReturnType<typeof personalRecords>>,
  latestBodyweight: number
): number {
  let count = 0
  if (!w.entries) return 0
  for (const entry of w.entries) {
    const ex = exerciseMap.get(entry.exerciseId)
    const pr = prsByExercise.get(entry.exerciseId)
    if (!ex || !pr) continue
    for (const s of entry.sets) {
      if (checkSetPR(s, ex.type, pr, latestBodyweight).isPR) {
        count++
      }
    }
  }
  return count
}

export function HistoryList({
  workouts,
  exerciseMap,
  prsByExercise,
  latestBodyweight,
  unit,
  onSelectWorkout,
  onCreatePastWorkout,
}: HistoryListProps) {
  const [displayedCount, setDisplayedCount] = useState(TRANCHE_SIZE)

  const visibleWorkouts = useMemo(
    () => workouts.slice(0, displayedCount),
    [workouts, displayedCount]
  )

  const monthGroups = useMemo<MonthGroup[]>(() => {
    const groups: MonthGroup[] = []
    let currentKey = ''
    let currentGroup: MonthGroup | null = null

    for (const w of visibleWorkouts) {
      const date = new Date(w.finishedAt || w.startedAt)
      const key = format(date, 'yyyy-MM')
      const vol = displayWeight(workoutVolume(w, exerciseMap, latestBodyweight), unit)

      if (key !== currentKey) {
        currentKey = key
        const rawTitle = format(date, 'MMMM yyyy', { locale: es })
        const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)
        currentGroup = {
          monthKey: key,
          monthTitle: title,
          workouts: [w],
          totalVolume: vol,
          count: 1,
        }
        groups.push(currentGroup)
      } else if (currentGroup) {
        currentGroup.workouts.push(w)
        currentGroup.totalVolume += vol
        currentGroup.count += 1
      }
    }

    return groups
  }, [visibleWorkouts, exerciseMap, latestBodyweight, unit])

  if (workouts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-surface border border-line flex items-center justify-center text-neutral-400">
          <History size={28} />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Aún no hay entrenos</h2>
          <p className="text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
            Cuando termines tu primera sesión aparecerá aquí con su duración, su volumen y sus récords.
          </p>
        </div>
        <Link to="/workout" className="btn-primary">
          <Dumbbell size={18} />
          <span>Empezar un entreno</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-line flex items-center justify-between gap-3">
        <div>
          <span className="text-xs text-neutral-400 num">
            {workouts.length} {workouts.length === 1 ? 'entreno guardado' : 'entrenos guardados'}
          </span>
        </div>
        <button
          type="button"
          onClick={onCreatePastWorkout}
          className="press px-3 py-1.5 bg-surface border border-line rounded-md text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span>Añadir entreno pasado</span>
        </button>
      </div>

      <div className="flex-1">
        {monthGroups.map((group) => {
          const volInTons = group.totalVolume / 1000
          const tonnageStr =
            group.totalVolume >= 1000
              ? `${formatNumber(volInTons, 1)} t`
              : `${formatNumber(group.totalVolume)} ${unit}`

          return (
            <div key={group.monthKey}>
              <div className="sticky top-14 z-20 flex items-center justify-between px-4 py-2 bg-black border-b border-line text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                <span>{group.monthTitle}</span>
                <span className="num">
                  {group.count} {group.count === 1 ? 'entreno' : 'entrenos'} · {tonnageStr}
                </span>
              </div>

              <ul className="divide-y divide-line">
                {group.workouts.map((w) => {
                  const date = new Date(w.finishedAt || w.startedAt)
                  const dayName = format(date, 'EEE', { locale: es })
                  const dayNumber = format(date, 'd')
                  const duration = getDurationMinutes(w)
                  const vol = displayWeight(workoutVolume(w, exerciseMap, latestBodyweight), unit)
                  const validSets = countValidSets(w)
                  const prsCount = countWorkoutPRs(w, exerciseMap, prsByExercise, latestBodyweight)
                  const hasNotes = Boolean(w.notes && w.notes.trim().length > 0)

                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        onClick={() => onSelectWorkout(w.id)}
                        className="press w-full min-h-[56px] flex items-center gap-3 px-4 py-2 text-left hover:bg-surface/50"
                      >
                        <div className="w-9 shrink-0 text-center border-r border-line pr-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                            {dayName}
                          </span>
                          <span className="num text-2xl font-bold text-white block leading-tight">
                            {dayNumber}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-base font-semibold text-white truncate block">
                            {w.name}
                          </span>
                          <span className="num text-[13px] text-neutral-300 mt-0.5 block truncate">
                            {duration} min · {formatNumber(vol)} {unit} · {validSets} series
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {prsCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[13px] text-neutral-300"
                              role="img"
                              aria-label={`${prsCount} ${prsCount === 1 ? 'récord' : 'récords'}`}
                            >
                              <span className="num">{prsCount}</span>
                              <RecordLights lit={true} size={4} />
                            </span>
                          )}
                          {hasNotes && (
                            <span className="text-neutral-400" title="Con nota">
                              <FileText size={14} />
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        {displayedCount < workouts.length && (
          <div className="p-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setDisplayedCount((c) => c + TRANCHE_SIZE)}
              className="btn-secondary w-full"
            >
              <span>Cargar más entrenos ({workouts.length - displayedCount} restantes)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
