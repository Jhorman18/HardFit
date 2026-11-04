import { displayWeight } from '../utils/weightUnits'
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
import { formatNumber } from '../utils/format'

export interface MonthlyReportSectionProps {
  workouts: Workout[]
  exercisesById: Map<string, Exercise>
  unit?: string
  bodyweightKg?: number
  onPreviewExercise?: (exerciseId: string) => void
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
  onPreviewExercise,
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
    <div className="space-y-4">
      {/* Cabecera y selector de mes */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">Informe mensual</h2>
          <p className="text-[13px] text-neutral-400">Balance y ejercicios destacados del mes</p>
        </div>

        {/* Controles de mes */}
        <div className="flex items-center gap-1 bg-surface px-1 py-0.5 rounded-md border border-line">
          <button
            type="button"
            onClick={() => setSelectedDate((prev) => subMonths(prev, 1))}
            className="press min-w-10 min-h-10 flex items-center justify-center text-neutral-400 hover:text-white"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>

          <span className="text-xs font-semibold text-neutral-200 px-2 min-w-[110px] text-center">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={() => setSelectedDate((prev) => addMonths(prev, 1))}
            disabled={isCurrentMonth}
            className={`press min-w-10 min-h-10 flex items-center justify-center ${
              isCurrentMonth
                ? 'text-neutral-600 cursor-not-allowed opacity-40'
                : 'text-neutral-400 hover:text-white'
            }`}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {report.workouts === 0 ? (
        <div className="text-center py-10 text-xs text-neutral-400 bg-surface rounded-lg border border-line">
          <Calendar size={24} className="mx-auto text-neutral-400 mb-2" strokeWidth={1.75} />
          No hay entrenamientos registrados en {monthLabel}.
        </div>
      ) : (
        <>
          {/* 4 Métricas del mes en estilo KPI grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface p-3 rounded-lg border border-line">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="label-tech">Entrenos</span>
                <Dumbbell size={14} className="text-neutral-400" strokeWidth={1.75} />
              </div>
              <div className="mt-1 text-2xl font-bold text-white num">
                {report.workouts}
              </div>
            </div>

            <div className="bg-surface p-3 rounded-lg border border-line">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="label-tech">Volumen Total</span>
                <Weight size={14} className="text-neutral-400" strokeWidth={1.75} />
              </div>
              <div className="mt-1 text-2xl font-bold text-white num">
                {formatNumber(displayWeight(report.volume, unit), 0, 0)}{' '}
                <span className="text-xs font-normal text-neutral-400">{unit}</span>
              </div>
            </div>

            <div className="bg-surface p-3 rounded-lg border border-line">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="label-tech">Series Válidas</span>
                <Layers size={14} className="text-neutral-400" strokeWidth={1.75} />
              </div>
              <div className="mt-1 text-2xl font-bold text-white num">
                {report.sets}
              </div>
            </div>

            <div className="bg-surface p-3 rounded-lg border border-line">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="label-tech">Tiempo Total</span>
                <Clock size={14} className="text-neutral-400" strokeWidth={1.75} />
              </div>
              <div className="mt-1 text-2xl font-bold text-white num">
                {formatDurationSec(report.durationSec)}
              </div>
            </div>
          </div>

          {/* Top Ejercicios del mes */}
          <div className="space-y-2 pt-2">
            <h3 className="label-tech text-neutral-400">
              Ejercicios más trabajados del mes
            </h3>

            {report.top.length === 0 ? (
              <div className="text-xs text-neutral-400 py-3 text-center bg-surface border border-line rounded-lg">
                Sin ejercicios registrados en este mes.
              </div>
            ) : (
              <ul className="border-t border-b border-line divide-y divide-line list-none">
                {report.top.slice(0, 5).map((ex, idx) => (
                  <li key={ex.exerciseId} className="py-2.5 flex items-center gap-3 min-h-12">
                    <span className="text-xs font-bold text-neutral-400 w-4 text-center shrink-0 num">
                      {idx + 1}
                    </span>

                    <ExerciseDemo
                      exerciseId={ex.exerciseId}
                      variant="thumb"
                      className="w-10 h-10 shrink-0"
                      onClick={onPreviewExercise ? () => onPreviewExercise(ex.exerciseId) : undefined}
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        onClick={onPreviewExercise ? () => onPreviewExercise(ex.exerciseId) : undefined}
                        className={`text-[15px] font-medium text-white truncate ${
                          onPreviewExercise ? 'cursor-pointer hover:text-neutral-300' : ''
                        }`}
                      >
                        {ex.name}
                      </p>
                      <span className="label-tech text-neutral-400 block mt-0.5">
                        {ex.muscleGroup}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-white num">
                        {ex.sessions} {ex.sessions === 1 ? 'vez' : 'veces'}
                      </p>
                      <p className="text-xs text-neutral-400 num">
                        {ex.sets} {ex.sets === 1 ? 'serie' : 'series'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
