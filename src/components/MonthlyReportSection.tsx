import { useState, useMemo } from 'react'
import {
  subMonths,
  addMonths,
  format,
  isSameMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Dumbbell, Clock, Weight, Layers } from 'lucide-react'
import type { Workout, Exercise } from '../types'
import { monthlyReport } from '../utils/stats'
import { ExerciseDemo } from './ExerciseDemo'

export interface MonthlyReportSectionProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
  unit?: string
  bodyweightKg?: number
}

function formatDurationSec(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 min'
  const totalMin = Math.round(seconds / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function capitalizeFirst(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function MonthlyReportSection({
  workouts,
  exercisesById,
  unit = 'kg',
  bodyweightKg,
}: MonthlyReportSectionProps) {
  const [today] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())

  const isCurrentMonth = useMemo(
    () => isSameMonth(today, selectedDate),
    [today, selectedDate]
  )

  const monthLabel = useMemo(() => {
    return capitalizeFirst(format(selectedDate, 'MMMM yyyy', { locale: es }))
  }, [selectedDate])

  const report = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth() + 1
    return monthlyReport(workouts, exercisesById, year, month, bodyweightKg)
  }, [workouts, exercisesById, selectedDate, bodyweightKg])

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
      {/* Cabecera y selector de mes */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Informe Mensual</h2>
          <p className="text-xs text-neutral-400">Balance del mes y ejercicios destacados</p>
        </div>

        {/* Controles de mes */}
        <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setSelectedDate((prev) => subMonths(prev, 1))}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-semibold text-neutral-200 px-1 min-w-[110px] text-center">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={() => setSelectedDate((prev) => addMonths(prev, 1))}
            disabled={isCurrentMonth}
            className={`p-1 rounded-lg transition ${
              isCurrentMonth
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {report.workouts === 0 ? (
        <div className="text-center py-10 text-xs text-neutral-500 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
          <Calendar size={24} className="mx-auto text-neutral-600 mb-2" />
          No hay entrenamientos registrados en {monthLabel}.
        </div>
      ) : (
        <>
          {/* 4 Métricas del mes */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Entrenamientos
                </span>
                <Dumbbell size={14} className="text-white" />
              </div>
              <div className="mt-1 text-xl font-extrabold text-white">
                {report.workouts}{' '}
                <span className="text-xs font-normal text-neutral-400">
                  {report.workouts === 1 ? 'sesión' : 'sesiones'}
                </span>
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Volumen Total
                </span>
                <Weight size={14} className="text-white" />
              </div>
              <div className="mt-1 text-xl font-extrabold text-white">
                {report.volume.toLocaleString()}{' '}
                <span className="text-xs font-normal text-neutral-400">{unit}</span>
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Series Válidas
                </span>
                <Layers size={14} className="text-white" />
              </div>
              <div className="mt-1 text-xl font-extrabold text-white">
                {report.sets}{' '}
                <span className="text-xs font-normal text-neutral-400">series</span>
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Tiempo Total
                </span>
                <Clock size={14} className="text-white" />
              </div>
              <div className="mt-1 text-xl font-extrabold text-white">
                {formatDurationSec(report.durationSec)}
              </div>
            </div>
          </div>

          {/* Top Ejercicios del mes */}
          <div className="space-y-2 pt-2 border-t border-neutral-800/80">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Ejercicios más trabajados del mes
            </h3>

            {report.top.length === 0 ? (
              <div className="text-xs text-neutral-500 py-3 text-center">
                Sin ejercicios registrados en este mes.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/80 bg-neutral-950/60 border border-neutral-800 rounded-xl px-3 py-1">
                {report.top.slice(0, 5).map((ex, idx) => (
                  <div key={ex.exerciseId} className="py-2.5 flex items-center gap-3">
                    <span className="text-xs font-bold text-neutral-500 w-4 text-center shrink-0">
                      #{idx + 1}
                    </span>

                    <ExerciseDemo
                      exerciseId={ex.exerciseId}
                      variant="thumb"
                      className="w-10 h-10 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{ex.name}</p>
                      <span className="text-[10px] text-neutral-400 bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {ex.muscleGroup}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-white">
                        {ex.sessions} {ex.sessions === 1 ? 'vez' : 'veces'}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {ex.sets} {ex.sets === 1 ? 'serie' : 'series'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
