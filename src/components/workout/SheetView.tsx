import { useState } from 'react'
import { formatNumber } from '../../utils/format'
import {
  X,
  Plus,
  ArrowLeftRight,
  Timer,
  StickyNote,
} from 'lucide-react'
import { useWorkoutStore } from '../../store'
import { ExerciseDemo } from '../ExerciseDemo'
import { ExerciseNotesTab } from '../ExerciseNotesTab'
import { RecordLights, BarGlyph, Sheet } from '../ui'
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
import { SetSummaryRow } from '../SetSummaryRow'
import { SetEditorFields } from '../SetEditorFields'
import { formatSetSummary } from '../../utils/setSummary'
import type { Exercise, WorkoutSetEntry, Workout } from '../../types'

interface SheetViewProps {
  workout: Workout
  exerciseMap: Map<string, Exercise>
  previousHistoryMap: Map<string, WorkoutSetEntry[]>
  appUnit: WeightUnit
  efectivoGlobal: number
  barKg: number
  showBarGlyph: boolean
  showRpe?: boolean
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
      className="press min-h-12 px-2 inline-flex items-center justify-center gap-1 rounded-md"
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
  showRpe,
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

              {/* Series resumidas: tocar datos edita; el check confirma y activa el descanso. */}
              <div className="space-y-0.5">
                {entry.sets.map((set, setIndex) => {
                  const prevSet = prevSets?.[setIndex]
                  const setLabel = getSetNumberLabel(entry.sets, setIndex)
                  const isCurrent = nextPending?.entryIndex === entryIndex && nextPending?.setIndex === setIndex
                  const record = set.completed && isSetRecord(set, prevSet)
                  const converted = convertSetWeight(set, unit)
                  const rpe = set.rpe === undefined ? '' : `RPE ${formatNumber(set.rpe, 0, 1)} · `
                  return (
                    <SetSummaryRow
                      key={setIndex}
                      label={getSetBadge(entry.sets, setIndex)}
                      labelTitle={`Serie ${getSetBadge(entry.sets, setIndex)}: ${getSetTypeOption(set.type).label}. Cambiar tipo`}
                      onLabelClick={() => setSetTypeTarget({ entryIndex, setIndex })}
                      editLabel={`Editar serie ${setLabel} de ${exercise?.name ?? 'ejercicio'}`}
                      summary={formatSetSummary(converted, exerciseType, unit)}
                      description={set.completed ? 'Completada' : rpe + 'Toca para editar'}
                      current={isCurrent}
                      completed={set.completed}
                      completeLabel={set.completed ? `Marcar serie ${setLabel} de ${exercise?.name ?? 'ejercicio'} como pendiente` : `Confirmar serie ${setLabel} de ${exercise?.name ?? 'ejercicio'}`}
                      onComplete={() => toggleSetCompleted(entryIndex, setIndex)}
                      onRemove={entry.sets.length > 1 ? () => removeSet(entryIndex, setIndex) : undefined}
                      removeLabel={`Quitar serie ${setLabel} de ${exercise?.name ?? 'ejercicio'}`}
                      status={record ? <RecordLights lit size={6} className="mb-1" /> : undefined}
                    >
                      {prevSet && <p className="text-xs text-neutral-400">Anterior: {formatPreviousSet(exercise, prevSet, unit)}</p>}
                      <SetEditorFields
                        set={converted}
                        type={exerciseType}
                        unit={unit}
                        label={`serie ${setLabel}`}
                        showRpe={showRpe}
                        onChange={patch => updateSet(entryIndex, setIndex, patch)}
                      />
                      <button type="button" onClick={() => onOpenFoco(entryIndex, setIndex)} className="press min-h-12 text-xs text-neutral-300">
                        Ver en foco
                      </button>
                    </SetSummaryRow>
                  )
                })}
              </div>

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

              {/* Acciones secundarias sin botones de ancho completo. */}
              <div className="flex items-center justify-between gap-1 mt-1 flex-wrap">
                <button type="button" onClick={() => addSet(entryIndex)} className="press min-h-12 px-1 flex items-center gap-1 text-xs text-neutral-300">
                  <Plus size={14} /> Añadir serie
                </button>
                <div className="flex items-center gap-1">
                  {exerciseType !== 'duration' && exerciseType !== 'distance' && (
                    <UnitToggle unit={unit} prefix={exerciseType === 'bodyweight_reps' ? '+' : exerciseType === 'bodyweight_assisted' ? '−' : ''} onToggle={() => onToggleUnit(entryIndex)} />
                  )}
                  <button type="button" onClick={() => setNoteExerciseId(entry.exerciseId)} className="press min-h-12 px-2 flex items-center gap-1 text-xs text-neutral-300" aria-label="Notas del ejercicio">
                    <StickyNote size={14} /> Notas
                  </button>
                </div>
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
