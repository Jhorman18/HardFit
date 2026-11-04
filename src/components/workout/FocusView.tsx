import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { Minus, Plus, ChevronLeft, ChevronRight, StickyNote, Gauge, ArrowRight, Check, Trash2, ArrowLeftRight } from 'lucide-react'
import { useWorkoutStore } from '../../store'
import { ExerciseDemo } from '../ExerciseDemo'
import { ExerciseNotesTab } from '../ExerciseNotesTab'
import { RecordLights, BarGlyph, DecimalInput, Sheet } from '../ui'
import { SetTypeSheet } from './SetTypeSheet'
import { getSetBadge, getSetTypeOption } from '../../utils/setTypes'
import { RestTimerBar } from '../RestTimerBar'
import { RestExpandedSheet } from './RestExpandedSheet'
import {
  getSetNumberLabel,
  formatPreviousSet,
  isSetRecord,
  isBarExercise,
  findNextPendingSet,
} from './useWorkoutData'
import {
  getEntryWeightUnit,
  convertSetWeight,
  weightInKg,
  type WeightUnit,
} from '../../utils/weightUnits'
import { platesFor, type PlateLoad } from '../../utils/plates'
import { PlateBreakdownSheet } from './PlateBreakdownSheet'
import type { Exercise, WorkoutSetEntry, Workout } from '../../types'

interface FocusViewProps {
  workout: Workout
  exerciseMap: Map<string, Exercise>
  previousHistoryMap: Map<string, WorkoutSetEntry[]>
  appUnit: WeightUnit
  showRpe: boolean
  barKg: number
  focusEntry: number
  focusSet: number
  onChangeFocus: (entryIndex: number, setIndex: number) => void
  onFinishWorkout: () => void
  onToggleUnit: (entryIndex: number) => void
}

const RPE_OPTIONS = [6, 7, 8, 9, 10] as const

export function FocusView({
  workout,
  exerciseMap,
  previousHistoryMap,
  appUnit,
  showRpe,
  barKg,
  focusEntry,
  focusSet,
  onChangeFocus,
  onFinishWorkout,
  onToggleUnit,
}: FocusViewProps) {
  const { updateSet, toggleSetCompleted, removeSet, setSetType } = useWorkoutStore()

  const [recordLabel, setRecordLabel] = useState<string | null>(null)
  const [plateSheet, setPlateSheet] = useState<PlateLoad | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [rpeOpen, setRpeOpen] = useState(false)
  const [restExpanded, setRestExpanded] = useState(false)
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current)
    }
  }, [])

  const entry = workout.entries[focusEntry]
  if (!entry) return null

  const exercise = exerciseMap.get(entry.exerciseId)
  const exerciseType = exercise?.type ?? 'weight_reps'
  const unit = getEntryWeightUnit(workout, entry, appUnit)
  const prevSets = previousHistoryMap
    .get(entry.exerciseId)
    ?.map((set) => convertSetWeight(set, unit))
  const set = entry.sets[focusSet]
  if (!set) return null

  const prevSet = prevSets?.[focusSet]
  const converted = convertSetWeight(set, unit)
  const isWarmup = set.type === 'warmup'
  const setLabel = getSetNumberLabel(entry.sets, focusSet)
  const totalSetsInEntry = entry.sets.filter((s) => s.type !== 'warmup').length
  const typeLabel = set.type === 'normal' ? '' : ` · ${getSetTypeOption(set.type).label}`
  const workingSetsLabel = isWarmup ? `Calentamiento ${setLabel}` : `Serie ${setLabel} de ${totalSetsInEntry}${typeLabel}`
  const isBar = isBarExercise(exercise) && unit === 'kg'
  const weightKg = weightInKg(set)

  const weightStep = unit === 'lb' ? 5 : 2.5
  const repsStep = 1

  const stepWeight = (delta: number) => {
    const cur = converted.weight ?? 0
    const next = Math.max(0, cur + delta)
    updateSet(focusEntry, focusSet, { weight: next })
  }

  const stepReps = (delta: number) => {
    const cur = set.reps ?? 0
    const next = Math.max(0, cur + delta)
    updateSet(focusEntry, focusSet, { reps: next })
  }

  const handleConfirm = () => {
    toggleSetCompleted(focusEntry, focusSet)

    if (!set.completed) {
      const record = isSetRecord({ ...set, completed: true }, prevSet)
      if (record) {
        setRecordLabel(setLabel)
        if (recordTimerRef.current) clearTimeout(recordTimerRef.current)
        recordTimerRef.current = setTimeout(() => setRecordLabel(null), 2400)
      }

      const next = findNextPendingSet({
        ...workout,
        entries: workout.entries.map((e, ei) =>
          ei === focusEntry
            ? {
                ...e,
                sets: e.sets.map((s, si) =>
                  si === focusSet ? { ...s, completed: true } : s
                ),
              }
            : e
        ),
      }, { entryIndex: focusEntry, setIndex: focusSet })

      if (next) {
        setTimeout(() => onChangeFocus(next.entryIndex, next.setIndex), 200)
      }
    }
  }

  const allWorkoutDone = workout.entries.every((e) => e.sets.every((s) => s.completed))
  const currentExerciseDone = entry.sets.every((s) => s.completed)
  const nextEntry = workout.entries[focusEntry + 1]
  const nextExercise = nextEntry ? exerciseMap.get(nextEntry.exerciseId) : undefined

  const navigateSet = (dir: -1 | 1) => {
    let ei = focusEntry
    let si = focusSet + dir
    while (ei >= 0 && ei < workout.entries.length) {
      if (si >= 0 && si < workout.entries[ei].sets.length) {
        onChangeFocus(ei, si)
        return
      }
      ei += dir
      si = dir === 1 ? 0 : (workout.entries[ei]?.sets.length ?? 1) - 1
    }
  }

  const hasPrev = focusEntry > 0 || focusSet > 0
  const hasNext =
    focusEntry < workout.entries.length - 1 ||
    focusSet < entry.sets.length - 1

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
        {/* Cabecera: serie N de M + cronómetro */}
        <div className="flex items-center justify-between py-2 border-b border-line">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigateSet(-1)}
              disabled={!hasPrev}
              className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-300 disabled:opacity-20"
              aria-label="Serie anterior"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setTypeOpen(true)}
              aria-label={`${workingSetsLabel}. Cambiar tipo de serie`}
              className="press min-h-12 text-base font-semibold text-white"
            >
              {workingSetsLabel}
            </button>
            <button
              type="button"
              onClick={() => navigateSet(1)}
              disabled={!hasNext}
              className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-300 disabled:opacity-20"
              aria-label="Serie siguiente"
            >
              <ChevronRight size={22} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Miniatura + nombre */}
        <div className="flex items-center gap-3 py-3">
          <ExerciseDemo
            exerciseId={entry.exerciseId}
            variant="thumb"
            alt={exercise?.name ?? 'Ejercicio'}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white truncate">
              {exercise?.name ?? 'Ejercicio'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="label-tech">{exercise?.muscleGroup ?? 'General'}</span>
              <span className="text-neutral-400 text-xs">·</span>
              <span className="label-tech text-neutral-400">{exercise?.equipment ?? 'Equipo'}</span>
            </div>
          </div>
        </div>

        {/* Número a batir */}
        {prevSet && (
          <div className="rounded-md bg-surface border border-line p-3">
            <span className="label-tech block mb-0.5">Número a batir</span>
            <span className="num text-[28px] text-neutral-300 leading-tight">
              {formatPreviousSet(exercise, prevSet, unit)}
            </span>
          </div>
        )}

        {recordLabel ? (
          <div className="flex items-center justify-center gap-3 mt-3" role="status">
            <RecordLights lit size={10} />
            <span className="label-tech text-white">Récord · serie {recordLabel}</span>
          </div>
        ) : (
          set.completed &&
          isSetRecord(set, prevSet) && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <RecordLights lit size={8} />
              <span className="label-tech">Récord</span>
            </div>
          )
        )}

        {/* Peso + Reps gigantes */}
        {(exerciseType === 'weight_reps' ||
          exerciseType === 'bodyweight_reps' ||
          exerciseType === 'bodyweight_assisted') && (
          <div className="mt-4 space-y-4">
            {/* Peso */}
            <div>
              <button
                type="button"
                onClick={() => onToggleUnit(focusEntry)}
                aria-label={`Unidad ${unit}. Cambiar a ${unit === 'kg' ? 'lb' : 'kg'}`}
                className="press mx-auto min-h-12 px-3 flex items-center justify-center gap-1"
              >
                <span className="label-tech text-neutral-200">
                  {exerciseType === 'bodyweight_reps' ? '+' : exerciseType === 'bodyweight_assisted' ? '-' : ''}
                  {unit.toUpperCase()}
                </span>
                <ArrowLeftRight size={12} strokeWidth={2} className="text-neutral-400" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepWeight(-weightStep)}
                  className="press min-w-14 min-h-14 rounded-md bg-elevated border border-line-strong flex items-center justify-center text-neutral-200"
                  aria-label={`Restar ${weightStep} ${unit}`}
                >
                  <Minus size={24} strokeWidth={2} />
                </button>
                <DecimalInput
                  value={converted.weight}
                  onValueChange={(weight) => updateSet(focusEntry, focusSet, { weight })}
                  className="w-0 min-w-0 flex-1 h-[72px] rounded-md bg-elevated border border-line-strong text-[40px] min-[375px]:text-[56px] text-center num text-white focus:outline-none focus:ring-2 focus:ring-accent px-2"
                  aria-label="Peso"
                />
                <button
                  type="button"
                  onClick={() => stepWeight(weightStep)}
                  className="press min-w-14 min-h-14 rounded-md bg-elevated border border-line-strong flex items-center justify-center text-neutral-200"
                  aria-label={`Sumar ${weightStep} ${unit}`}
                >
                  <Plus size={24} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Reps */}
            <div>
              <span className="label-tech block mb-1 text-center">Reps</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepReps(-repsStep)}
                  className="press min-w-14 min-h-14 rounded-md bg-elevated border border-line-strong flex items-center justify-center text-neutral-200"
                  aria-label="Restar 1 repetición"
                >
                  <Minus size={24} strokeWidth={2} />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={set.reps ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    if (v !== undefined && isNaN(v)) return
                    updateSet(focusEntry, focusSet, { reps: v })
                  }}
                  className="w-0 min-w-0 flex-1 h-[72px] rounded-md bg-elevated border border-line-strong text-[40px] min-[375px]:text-[56px] text-center num text-white focus:outline-none focus:ring-2 focus:ring-accent px-2"
                  aria-label="Repeticiones"
                />
                <button
                  type="button"
                  onClick={() => stepReps(repsStep)}
                  className="press min-w-14 min-h-14 rounded-md bg-elevated border border-line-strong flex items-center justify-center text-neutral-200"
                  aria-label="Sumar 1 repetición"
                >
                  <Plus size={24} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Glifo de barra */}
        {isBar && converted.weight !== undefined && converted.weight > 0 && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setPlateSheet(platesFor(weightKg, barKg))}
              className="press flex items-center gap-2 px-3 py-1.5 rounded-md border border-line bg-surface"
              aria-label="Ver desglose de discos"
            >
              <BarGlyph load={platesFor(weightKg, barKg)} barWidth={56} />
              <span className="label-tech text-neutral-300">Discos</span>
            </button>
          </div>
        )}

        {/* Nota + RPE + Quitar serie */}
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="press flex-1 min-h-12 flex items-center justify-center gap-2 rounded-md bg-elevated border border-line-strong text-sm font-semibold text-neutral-200"
          >
            <StickyNote size={16} strokeWidth={1.75} />
            <span>Nota</span>
          </button>
          {showRpe && (
            <button
              type="button"
              onClick={() => setRpeOpen(true)}
              className="press flex-1 min-h-12 flex items-center justify-center gap-2 rounded-md bg-elevated border border-line-strong text-sm font-semibold text-neutral-200"
            >
              <Gauge size={16} strokeWidth={1.75} />
              <span>RPE {set.rpe !== undefined ? set.rpe : '—'}</span>
            </button>
          )}
          {entry.sets.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const newLen = entry.sets.length - 1
                removeSet(focusEntry, focusSet)
                const safeSet = Math.min(focusSet, newLen - 1)
                if (safeSet !== focusSet) {
                  onChangeFocus(focusEntry, safeSet)
                }
              }}
              className="press min-h-12 px-3 flex items-center justify-center gap-1.5 rounded-md bg-elevated border border-line-strong text-sm font-semibold text-neutral-400 hover:text-red-400"
              aria-label="Quitar esta serie"
            >
              <Trash2 size={16} strokeWidth={1.75} />
              <span>Quitar</span>
            </button>
          )}
        </div>

        {/* Tarjeta de siguiente ejercicio si este ejercicio ya está completado */}
        {currentExerciseDone && nextEntry && nextExercise && (
          <div className="mt-4 p-3 rounded-md bg-surface border border-line flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="label-tech block">Siguiente ejercicio</span>
              <p className="text-sm font-semibold text-white truncate">{nextExercise.name}</p>
            </div>
            <button
              type="button"
              onClick={() => onChangeFocus(focusEntry + 1, 0)}
              className="press min-w-12 min-h-12 flex items-center justify-center text-accent"
              aria-label={`Ir a ${nextExercise.name}`}
            >
              <ArrowRight size={20} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {typeOpen && (
        <SetTypeSheet
          title={`Tipo de serie ${getSetBadge(entry.sets, focusSet)}`}
          value={set.type}
          onSelect={(type) => setSetType(focusEntry, focusSet, type)}
          onClose={() => setTypeOpen(false)}
        />
      )}

      {/* Zona inferior fija */}
      <div className="shrink-0 pb-[env(safe-area-inset-bottom)] bg-black">
        <RestTimerBar onExpand={() => setRestExpanded(true)} />

        <div className="px-4 py-2 border-t border-line">
          {allWorkoutDone ? (
            <button
              type="button"
              onClick={onFinishWorkout}
              className="btn-primary w-full"
            >
              <Check size={18} strokeWidth={2} />
              <span>Terminar entreno</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className={`w-full min-h-14 rounded-md font-semibold text-base ${
                set.completed
                  ? 'btn-secondary'
                  : 'btn-primary'
              }`}
            >
              {set.completed ? 'Desmarcar serie' : 'Confirmar serie'}
            </button>
          )}
        </div>
      </div>

      {/* Sheet de Notas del ejercicio */}
      {noteOpen && (
        <Sheet
          title={`Notas · ${exercise?.name ?? 'Ejercicio'}`}
          onClose={() => setNoteOpen(false)}
        >
          <ExerciseNotesTab exerciseId={entry.exerciseId} />
        </Sheet>
      )}

      {/* Sheet de RPE */}
      {rpeOpen && (
        <Sheet title="RPE (Esfuerzo percibido)" onClose={() => setRpeOpen(false)}>
          <div className="space-y-2 py-2">
            {RPE_OPTIONS.map((rpe) => (
              <button
                key={rpe}
                type="button"
                onClick={() => {
                  updateSet(focusEntry, focusSet, { rpe })
                  setRpeOpen(false)
                }}
                className={`press w-full min-h-12 rounded-md text-left px-4 text-sm font-semibold flex items-center justify-between ${
                  set.rpe === rpe
                    ? 'bg-accent text-accent-fg'
                    : 'bg-elevated border border-line-strong text-neutral-200'
                }`}
              >
                <span>RPE {rpe}</span>
                <span className="label-tech text-neutral-400">
                  {rpe === 6 && '4+ reps en reserva'}
                  {rpe === 7 && '3 reps en reserva'}
                  {rpe === 8 && '2 reps en reserva'}
                  {rpe === 9 && '1 rep en reserva'}
                  {rpe === 10 && 'Al fallo'}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                updateSet(focusEntry, focusSet, { rpe: undefined })
                setRpeOpen(false)
              }}
              className="press w-full min-h-12 rounded-md border border-line-strong text-sm text-neutral-400"
            >
              Sin RPE
            </button>
          </div>
        </Sheet>
      )}

      {/* Sheet de Desglose de discos */}
      {plateSheet && (
        <PlateBreakdownSheet load={plateSheet} onClose={() => setPlateSheet(null)} />
      )}

      {/* Sheet de Descanso expandido */}
      {restExpanded && (
        <RestExpandedSheet
          onClose={() => setRestExpanded(false)}
          nextSetLabel={workingSetsLabel}
          beatNumber={prevSet ? formatPreviousSet(exercise, prevSet, unit) : undefined}
          exerciseRestSeconds={entry.restSeconds}
        />
      )}
    </>
  )
}
