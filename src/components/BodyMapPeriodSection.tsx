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
import { musclesWorkedInPeriod, setsByMuscleGroup } from '../utils/stats'
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

  // Músculos trabajados por MuscleKey para heatmap anatómico
  const muscleCounts = useMemo(() => {
    return musclesWorkedInPeriod(
      workouts,
      exercisesById,
      undefined,
      weekStart.getTime(),
      weekEnd.getTime()
    )
  }, [workouts, exercisesById, weekStart, weekEnd])

  // Desglose de series por grupo muscular para la tabla inferior
  const muscleGroupSets = useMemo(() => {
    return setsByMuscleGroup(
      workouts,
      exercisesById,
      weekStart.getTime(),
      weekEnd.getTime()
    )
  }, [workouts, exercisesById, weekStart, weekEnd])

  const sortedMuscleGroups = useMemo(() => {
    return Object.entries(muscleGroupSets).sort((a, b) => b[1] - a[1])
  }, [muscleGroupSets])

  const totalWeeklySets = useMemo(() => {
    return sortedMuscleGroups.reduce((acc, [, count]) => acc + count, 0)
  }, [sortedMuscleGroups])

  const weekLabel = useMemo(() => {
    const startStr = format(weekStart, "d 'de' MMM", { locale: es })
    const endStr = format(weekEnd, "d 'de' MMM yyyy", { locale: es })
    return `${startStr} - ${endStr}`
  }, [weekStart, weekEnd])

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
      {/* Cabecera y selector de semana */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">
            Mapa Corporal por Período
          </h2>
          <p className="text-xs text-neutral-400">Distribución anatómica del volumen semanal</p>
        </div>

        {/* Controles de navegación de semana */}
        <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setCurrentDate((prev) => subWeeks(prev, 1))}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Semana anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-semibold text-neutral-200 px-1 capitalize min-w-[130px] text-center">
            {isCurrentWeek ? 'Esta semana' : weekLabel}
          </span>

          <button
            type="button"
            onClick={() => setCurrentDate((prev) => addWeeks(prev, 1))}
            disabled={isCurrentWeek}
            className={`p-1 rounded-lg transition ${
              isCurrentWeek
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Semana siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Subetiqueta con rango de fechas explícito si está en "Esta semana" */}
      {isCurrentWeek && (
        <div className="text-[11px] text-neutral-400 font-medium text-center capitalize">
          {weekLabel}
        </div>
      )}

      {/* Mapa anatómico */}
      <div className="bg-black/60 border border-neutral-800/80 rounded-xl p-3 flex flex-col items-center">
        {totalWeeklySets === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-500">
            <Activity size={24} className="mx-auto text-neutral-600 mb-2" />
            No hay series registradas en esta semana.
          </div>
        ) : (
          <>
            <BodyMuscleChart
              intensities={muscleCounts}
              size="lg"
            />

            {/* Leyenda del heatmap muscular */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 pt-3 text-[11px] text-neutral-400 border-t border-neutral-800/80 w-full mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] inline-block shadow-sm" />
                <span className="text-neutral-300 font-medium">Más ejercitado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] inline-block shadow-sm" />
                <span className="text-neutral-300 font-medium">Intermedio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#facc15] inline-block shadow-sm" />
                <span className="text-neutral-300 font-medium">Bajo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#374151] border border-neutral-700/50 inline-block" />
                <span className="text-neutral-500">Sin series</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabla "Músculo | Series" */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
          Distribución de Series
        </h3>

        {sortedMuscleGroups.length === 0 ? (
          <div className="text-xs text-neutral-500 text-center py-4 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
            Sin actividad muscular en el período.
          </div>
        ) : (
          <div className="overflow-hidden border border-neutral-800 rounded-xl bg-neutral-950/60 divide-y divide-neutral-800/80 text-xs">
            <div className="grid grid-cols-12 px-3 py-2 text-[11px] font-bold text-neutral-400 bg-neutral-950">
              <span className="col-span-7">Músculo</span>
              <span className="col-span-5 text-right">Series</span>
            </div>

            {sortedMuscleGroups.map(([group, count]) => {
              const pct = totalWeeklySets > 0 ? Math.round((count / totalWeeklySets) * 100) : 0
              return (
                <div key={group} className="grid grid-cols-12 px-3 py-2 items-center hover:bg-neutral-900/50 transition">
                  <div className="col-span-7 flex flex-col gap-1 pr-2">
                    <span className="font-semibold text-white truncate">{group}</span>
                    <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-white h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="col-span-5 text-right font-mono text-neutral-300">
                    <strong className="text-white font-bold">{count}</strong>{' '}
                    <span className="text-neutral-400 text-[11px]">
                      {count === 1 ? 'serie' : 'series'}
                    </span>{' '}
                    <span className="text-neutral-500 text-[10px]">({pct}%)</span>
                  </div>
                </div>
              )
            })}

            {/* Fila Total */}
            <div className="grid grid-cols-12 px-3 py-2.5 font-bold text-white bg-neutral-950">
              <span className="col-span-7 uppercase text-[11px] tracking-wider text-neutral-300">
                Total
              </span>
              <span className="col-span-5 text-right font-mono text-xs">
                {totalWeeklySets} {totalWeeklySets === 1 ? 'serie' : 'series'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
