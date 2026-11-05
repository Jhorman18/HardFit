import { useState, type ChangeEvent } from 'react'
import { formatNumber } from '../../utils/format'
import {
  Check,
  X,
  Plus,
  ArrowLeftRight,
  Timer,
  StickyNote,
  Minus,
} from 'lucide-react'
import { useWorkoutStore } from '../../store'
import { ExerciseDemo } from '../ExerciseDemo'
import { ExerciseNotesTab } from '../ExerciseNotesTab'
import { RecordLights, BarGlyph, Sheet, DecimalInput } from '../ui'
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
import { SetTypeSheet } from './SetTypeSheet'
import { getSetBadge, getSetTypeOption } from '../../utils/setTypes'
import { formatRest } from '../../utils/formatRest'
import type { Exercise, WorkoutSetEntry, Workout } from '../../types'

interface SheetViewProps {
  workout: Workout
  exerciseMap: Map<string, Exercise>
  previousHistoryMap: Map<string, WorkoutSetEntry[]>
  appUnit: WeightUnit
  efectivoGlobal: number
  barKg: number
  showBarGlyph: boolean
  onOpenFoco: (entryIndex: number, setIndex: number) => void
  onOpenSelector: () => void
  onOpenReplace: (entryIndex: number) => void
  onOpenRestPicker: (mode: 'global' | { entryIndex: number }) => void
  onOpenPreview: (exerciseId: string) => void
  onToggleUnit: (entryIndex: number) => void
}

function UnitToggle({
  unit,
  prefix,
  onToggle,
}: {
  unit: WeightUnit
  prefix: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Unidad ${unit}. Cambiar a ${unit === 'kg' ? 'lb' : 'kg'}`}
      className="press min-h-12 w-full inline-flex items-center justify-center gap-1 rounded-md"
    >
      <span className="label-tech text-neutral-200">
        {prefix}
        {unit.toUpperCase()}
      </span>
      <ArrowLeftRight size={12} strokeWidth={2} className="text-neutral-400" aria-hidden="true" />
    </button>
  )
}

export function SheetView({
  workout,
  exerciseMap,
  previousHistoryMap,
  appUnit,
  efectivoGlobal,
  barKg,
  showBarGlyph,
  onOpenFoco,
  onOpenSelector,
  onOpenReplace,
  onOpenRestPicker,
  onOpenPreview,
  onToggleUnit,
}: SheetViewProps) {
  const {
    addSet,
    updateSet,
    toggleSetCompleted,
    setSetType,
    removeSet,
    removeExercise,
  } = useWorkoutStore()

  const [plateSheet, setPlateSheet] = useState<PlateLoad | null>(null)
  const [setTypeTarget, setSetTypeTarget] = useState<{ entryIndex: number; setIndex: number } | null>(null)
  const [noteExerciseId, setNoteExerciseId] = useState<string | null>(null)
  const typeTargetSet = setTypeTarget
    ? workout.entries[setTypeTarget.entryIndex]?.sets[setTypeTarget.setIndex]
    : undefined

  const nextPending = findNextPendingSet(workout)

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {workout.entries.map((entry, entryIndex) => {
          const exercise = exerciseMap.get(entry.exerciseId)
          const exerciseType = exercise?.type ?? 'weight_reps'
          const unit = getEntryWeightUnit(workout, entry, appUnit)
          const prevSets = previousHistoryMap
            .get(entry.exerciseId)
            ?.map((set) => convertSetWeight(set, unit))
          const isBar = isBarExercise(exercise) && unit === 'kg'

          // Get latest working weight for bar glyph
          const lastSetWithWeight = [...entry.sets].reverse().find((s) => s.weight !== undefined && s.weight > 0)
          const displayLoad = showBarGlyph && lastSetWithWeight && isBar ? platesFor(weightInKg(lastSetWithWeight), barKg) : null

          return (
            <div key={`${entry.exerciseId}-${entryIndex}`} className="border-b border-line pb-3">
              {/* Encabezado del ejercicio */}
              <div className="flex items-center gap-3 py-3">
                <ExerciseDemo
                  exerciseId={entry.exerciseId}
                  variant="thumb"
                  alt={exercise?.name ?? 'Ejercicio'}
                  onClick={() => onOpenPreview(entry.exerciseId)}
                />
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenPreview(entry.exerciseId)}
                    className="text-base font-semibold text-white truncate block w-full text-left"
                  >
                    {exercise?.name ?? 'Ejercicio'}
                  </button>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="label-tech">{exercise?.muscleGroup ?? 'General'}</span>
                    <span className="text-neutral-400 text-xs">·</span>
                    <button
                      type="button"
                      onClick={() => onOpenRestPicker({ entryIndex })}
                      aria-label={`Descanso de ${exercise?.name ?? 'ejercicio'}`}
                      className="label-tech text-neutral-300 hover:text-white"
                    >
                      <Timer size={12} className="inline -mt-px mr-0.5" />
                      {entry.restSeconds === undefined
                        ? formatRest(efectivoGlobal)
                        : formatRest(entry.restSeconds)}
                      {exerciseType !== 'duration' && exerciseType !== 'distance' && <> · {unit}</>}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenReplace(entryIndex)}
                    className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 hover:text-white"
                    aria-label="Cambiar ejercicio"
                  >
                    <ArrowLeftRight size={18} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExercise(entryIndex)}
                    className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 hover:text-red-400"
                    aria-label="Eliminar ejercicio"
                  >
                    <X size={18} strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {/* Cabecera de columnas */}
              <div
                className="grid items-center gap-2 px-1 pb-1 border-b border-line text-center"
                style={{ gridTemplateColumns: '40px 80px 1fr 1fr 56px' }}
              >
                <span className="label-tech">Serie</span>
                <span className="label-tech">Anterior</span>
                {exerciseType === 'weight_reps' && (
                  <>
                    <UnitToggle unit={unit} prefix="" onToggle={() => onToggleUnit(entryIndex)} />
                    <span className="label-tech">Reps</span>
                  </>
                )}
                {exerciseType === 'bodyweight_reps' && (
                  <>
                    <UnitToggle unit={unit} prefix="+" onToggle={() => onToggleUnit(entryIndex)} />
                    <span className="label-tech">Reps</span>
                  </>
                )}
                {exerciseType === 'bodyweight_assisted' && (
                  <>
                    <UnitToggle unit={unit} prefix="-" onToggle={() => onToggleUnit(entryIndex)} />
                    <span className="label-tech">Reps</span>
                  </>
                )}
                {exerciseType === 'duration' && (
                  <>
                    <span className="label-tech">Min</span>
                    <span className="label-tech">Seg</span>
                  </>
                )}
                {exerciseType === 'distance' && (
                  <>
                    <span className="label-tech">Metros</span>
                    <span className="label-tech">Tiempo</span>
                  </>
                )}
                <span className="label-tech">
                  <Check size={14} className="mx-auto" />
                </span>
              </div>

              {/* Filas de series */}
              {entry.sets.map((set, setIndex) => {
                const prevSet = prevSets?.[setIndex]
                const isWarmup = set.type === 'warmup'
                const setLabel = getSetNumberLabel(entry.sets, setIndex)
                const isCurrent =
                  nextPending?.entryIndex === entryIndex &&
                  nextPending?.setIndex === setIndex
                const record = set.completed && isSetRecord(set, prevSet)
                const converted = convertSetWeight(set, unit)

                return (
                  <div
                    key={setIndex}
                    onClick={() => onOpenFoco(entryIndex, setIndex)}
                    className={`grid items-center gap-2 px-1 py-1 border-b border-line/40 cursor-pointer transition-colors duration-150 ${
                      isWarmup ? 'opacity-60' : ''
                    } ${isCurrent ? 'bg-elevated rounded-md' : ''} ${
                      set.completed
                        ? 'bg-accent/20 rounded-md [&_input]:bg-transparent [&_input]:border-accent/40'
                        : ''
                    }`}
                    style={{ gridTemplateColumns: '40px 80px 1fr 1fr 56px' }}
                  >
                    {/* Serie label + type toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSetTypeTarget({ entryIndex, setIndex })
                      }}
                      className="press min-h-12 flex items-center justify-center num text-lg text-neutral-200"
                      aria-label={`Serie ${getSetBadge(entry.sets, setIndex)}: ${getSetTypeOption(set.type).label}. Cambiar tipo`}
                    >
                      {getSetBadge(entry.sets, setIndex)}
                    </button>

                    {/* Anterior */}
                    <div className="min-h-12 flex items-center justify-center text-xs num text-neutral-400 whitespace-nowrap truncate">
                      {formatPreviousSet(exercise, prevSet, unit)}
                    </div>

                    {/* Inputs según tipo */}
                    {(exerciseType === 'weight_reps' ||
                      exerciseType === 'bodyweight_reps' ||
                      exerciseType === 'bodyweight_assisted') && (
                      <>
                        <div className="py-0.5" onClick={(e) => e.stopPropagation()}>
                          <DecimalInput
                            placeholder={prevSet?.weight !== undefined ? formatNumber(prevSet.weight, 0, 1) : '-'}
                            value={converted.weight}
                            onValueChange={(weight) => updateSet(entryIndex, setIndex, { weight })}
                            className="w-full min-h-12 rounded-md bg-elevated border border-line-strong text-center num text-xl text-white focus:outline-none focus:ring-2 focus:ring-accent px-1"
                            aria-label={`Peso serie ${setLabel}`}
                          />
                        </div>
                        <div className="py-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={prevSet?.reps !== undefined ? String(prevSet.reps) : '-'}
                            value={set.reps ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                              if (v !== undefined && isNaN(v)) return
                              updateSet(entryIndex, setIndex, { reps: v })
                            }}
                            className="w-full min-h-12 rounded-md bg-elevated border border-line-strong text-center num text-xl text-white focus:outline-none focus:ring-2 focus:ring-accent px-1"
                            aria-label={`Reps serie ${setLabel}`}
                          />
                        </div>
                      </>
                    )}

                    {exerciseType === 'duration' && (
                      <>
                        <div className="py-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={set.durationSec !== undefined ? Math.floor(set.durationSec / 60) : ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const m = e.target.value === '' ? 0 : Number(e.target.value)
                              const s = (set.durationSec ?? 0) % 60
                              updateSet(entryIndex, setIndex, { durationSec: m * 60 + s })
                            }}
                            className="w-full min-h-12 rounded-md bg-elevated border border-line-strong text-center num text-xl text-white focus:outline-none focus:ring-2 focus:ring-accent px-1"
                            aria-label={`Minutos serie ${setLabel}`}
                          />
                        </div>
                        <div className="py-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={set.durationSec !== undefined ? set.durationSec % 60 : ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const s = e.target.value === '' ? 0 : Number(e.target.value)
                              const m = Math.floor((set.durationSec ?? 0) / 60)
                              updateSet(entryIndex, setIndex, { durationSec: m * 60 + s })
                            }}
                            className="w-full min-h-12 rounded-md bg-elevated border border-line-strong text-center num text-xl text-white focus:outline-none focus:ring-2 focus:ring-accent px-1"
                            aria-label={`Segundos serie ${setLabel}`}
                          />
                        </div>
                      </>
                    )}

                    {exerciseType === 'distance' && (
                      <>
                        <div className="py-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={prevSet?.distanceM !== undefined ? String(prevSet.distanceM) : '0'}
                            value={set.distanceM ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const v = e.target.value === '' ? undefined : Number(e.target.value)
                              updateSet(entryIndex, setIndex, { distanceM: v })
                            }}
                            className="w-full min-h-12 rounded-md bg-elevated border border-line-strong text-center num text-xl text-white focus:outline-none focus:ring-2 focus:ring-accent px-1"
                            aria-label={`Metros serie ${setLabel}`}
                          />
                        </div>
                        <div className="py-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Seg"
                            value={set.durationSec ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const v = e.target.value === '' ? undefined : Number(e.target.value)
                              updateSet(entryIndex, setIndex, { durationSec: v })
                            }}
                            className="w-full min-h-12 rounded-md bg-elevated border border-line-strong text-center num text-xl text-white focus:outline-none focus:ring-2 focus:ring-accent px-1"
                            aria-label={`Tiempo serie ${setLabel}`}
                          />
                        </div>
                      </>
                    )}

                    {/* Check de 56px redondeado */}
                    <div
                      className="flex flex-col items-center justify-center py-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSetCompleted(entryIndex, setIndex)}
                        className={`press w-14 h-14 rounded-full flex items-center justify-center ${
                          set.completed
                            ? 'bg-accent text-accent-fg'
                            : isCurrent
                              ? 'border-2 border-accent text-accent'
                              : 'border-2 border-line-strong text-neutral-400'
                        }`}
                        aria-label={set.completed ? 'Marcar como pendiente' : 'Confirmar serie'}
                      >
                        <Check size={20} strokeWidth={2.5} />
                      </button>
                      {record && <RecordLights lit size={6} className="mt-1" />}
                    </div>
                  </div>
                )
              })}

              {/* Glifo de barra bajo la tabla si procede */}
              {displayLoad && (
                <div className="mt-2 flex justify-start pl-2">
                  <button
                    type="button"
                    onClick={() => setPlateSheet(displayLoad)}
                    className="press flex items-center gap-2 py-1 px-2 rounded-md bg-surface border border-line"
                    aria-label="Ver desglose de discos"
                  >
                    <BarGlyph load={displayLoad} barWidth={50} />
                    <span className="label-tech text-neutral-300">Desglose</span>
                  </button>
                </div>
              )}

              {/* Botones de acción del ejercicio */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => addSet(entryIndex)}
                  className="press flex-1 min-h-12 flex items-center justify-center gap-1.5 rounded-md bg-elevated border border-line-strong text-sm font-semibold text-neutral-200"
                >
                  <Plus size={16} strokeWidth={2} />
                  <span>Añadir serie</span>
                </button>
                {entry.sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(entryIndex, entry.sets.length - 1)}
                    className="press min-h-12 px-3 flex items-center justify-center gap-1 rounded-md bg-elevated border border-line-strong text-xs font-semibold text-neutral-400 hover:text-red-400"
                    title="Quitar última serie"
                    aria-label="Quitar última serie"
                  >
                    <Minus size={14} strokeWidth={2} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNoteExerciseId(entry.exerciseId)}
                  className="press min-h-12 px-3 flex items-center justify-center gap-1.5 rounded-md bg-elevated border border-line-strong text-sm font-semibold text-neutral-200"
                  aria-label="Notas del ejercicio"
                >
                  <StickyNote size={16} strokeWidth={1.75} />
                  <span>Notas</span>
                </button>
              </div>
            </div>
          )
        })}

        {/* Añadir ejercicio */}
        <button
          type="button"
          onClick={onOpenSelector}
          className="press w-full min-h-14 flex items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-sm font-semibold text-neutral-300 bg-surface hover:bg-elevated"
        >
          <Plus size={18} strokeWidth={2} />
          <span>Añadir ejercicio</span>
        </button>
      </div>

      {typeTargetSet && setTypeTarget && (
        <SetTypeSheet
          title={`Tipo de serie ${getSetBadge(workout.entries[setTypeTarget.entryIndex].sets, setTypeTarget.setIndex)}`}
          value={typeTargetSet.type}
          onSelect={(type) => setSetType(setTypeTarget.entryIndex, setTypeTarget.setIndex, type)}
          onClose={() => setSetTypeTarget(null)}
        />
      )}

      {plateSheet && (
        <PlateBreakdownSheet load={plateSheet} onClose={() => setPlateSheet(null)} />
      )}

      {noteExerciseId && (
        <Sheet
          title={`Notas · ${exerciseMap.get(noteExerciseId)?.name ?? 'Ejercicio'}`}
          onClose={() => setNoteExerciseId(null)}
        >
          <ExerciseNotesTab exerciseId={noteExerciseId} />
        </Sheet>
      )}
    </>
  )
}
