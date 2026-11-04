import { useState } from 'react'
import { Check, Plus, Trash2, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import type { Workout, Exercise, WorkoutSetEntry } from '../../types'
import { getEntryWeightUnit, convertSetWeight } from '../../utils/weightUnits'
import { DecimalInput } from '../ui'
import { SetTypeSheet } from '../workout/SetTypeSheet'
import { getSetBadge, getSetTypeOption } from '../../utils/setTypes'
import { parseDecimal } from '../../utils/format'
import { ExerciseSelectorModal } from '../ExerciseSelectorModal'
import { ExercisePreviewModal } from '../ExercisePreviewModal'
import { ExerciseDemo } from '../ExerciseDemo'

interface HistoryEditProps {
  editWorkout: Workout
  exerciseMap: Map<string, Exercise>
  unit: string
  showRpe: boolean
  onSave: (updated: Workout) => void
  onCancel: () => void
}

export function HistoryEdit({
  editWorkout: initialWorkout,
  exerciseMap,
  unit,
  showRpe,
  onSave,
  onCancel,
}: HistoryEditProps) {
  const [editWorkout, setEditWorkout] = useState<Workout>(() =>
    JSON.parse(JSON.stringify(initialWorkout))
  )
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false)
  const [replacingEntryIndex, setReplacingEntryIndex] = useState<number | null>(null)
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)
  const [typeTarget, setTypeTarget] = useState<{ entryIdx: number; setIdx: number } | null>(null)

  const durationMinutes = Math.max(
    1,
    Math.round(((editWorkout.finishedAt || editWorkout.startedAt) - editWorkout.startedAt) / 60000)
  )
  const startDateFormatted = format(new Date(editWorkout.startedAt), "yyyy-MM-dd'T'HH:mm")

  const handleUpdateSet = (entryIdx: number, setIdx: number, patch: Partial<WorkoutSetEntry>) => {
    const newEntries = [...editWorkout.entries]
    const currentEntry = { ...newEntries[entryIdx] }
    const newSets = [...currentEntry.sets]
    newSets[setIdx] = {
      ...newSets[setIdx],
      ...patch,
      ...('weight' in patch
        ? { weightUnit: getEntryWeightUnit(editWorkout, currentEntry, unit as 'kg' | 'lb') }
        : {}),
    }
    currentEntry.sets = newSets
    newEntries[entryIdx] = currentEntry
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }


  const handleAddSet = (entryIdx: number) => {
    const newEntries = [...editWorkout.entries]
    const currentEntry = { ...newEntries[entryIdx] }
    const currentSets = currentEntry.sets || []
    const lastSet = currentSets[currentSets.length - 1]
    const newSet: WorkoutSetEntry = {
      type: 'normal',
      weight: lastSet?.weight,
      weightUnit: lastSet?.weightUnit ?? getEntryWeightUnit(editWorkout, currentEntry, unit as 'kg' | 'lb'),
      reps: lastSet?.reps,
      rpe: lastSet?.rpe,
      completed: true,
    }
    currentEntry.sets = [...currentSets, newSet]
    newEntries[entryIdx] = currentEntry
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  const handleRemoveSet = (entryIdx: number, setIdx: number) => {
    const newEntries = [...editWorkout.entries]
    const currentEntry = { ...newEntries[entryIdx] }
    currentEntry.sets = currentEntry.sets.filter((_, idx) => idx !== setIdx)
    newEntries[entryIdx] = currentEntry
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  const handleRemoveExercise = (entryIdx: number) => {
    const newEntries = editWorkout.entries.filter((_, idx) => idx !== entryIdx)
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  const handleAddExercisesToWorkout = (exerciseIds: string[]) => {
    if (replacingEntryIndex !== null) {
      if (exerciseIds.length > 0) {
        const newEntries = [...editWorkout.entries]
        newEntries[replacingEntryIndex] = {
          ...newEntries[replacingEntryIndex],
          exerciseId: exerciseIds[0],
        }
        setEditWorkout({ ...editWorkout, entries: newEntries })
      }
      setReplacingEntryIndex(null)
      return
    }

    const newEntries = [...editWorkout.entries]
    for (const id of exerciseIds) {
      newEntries.push({
        exerciseId: id,
        sets: [
          {
            type: 'normal',
            weight: 0,
            weightUnit: editWorkout.weightUnit ?? (unit as 'kg' | 'lb'),
            reps: 0,
            completed: true,
          },
        ],
      })
    }
    setEditWorkout({ ...editWorkout, entries: newEntries })
  }

  return (
    <div className="flex-1 flex flex-col bg-black pb-28">
      {/* Cabecera de edición */}
      <header className="sticky top-0 z-30 min-h-14 flex items-center justify-between gap-2 px-4 bg-surface border-b border-line">
        <button
          type="button"
          onClick={onCancel}
          className="press px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white rounded-md bg-elevated border border-line"
        >
          Cancelar
        </button>

        <span className="text-sm font-semibold text-white">
          Editar Entrenamiento
        </span>

        <button
          type="button"
          onClick={() => onSave(editWorkout)}
          className="press px-3.5 py-1.5 rounded-md text-xs font-bold bg-accent text-accent-fg flex items-center gap-1.5"
        >
          <Check size={15} strokeWidth={2.5} />
          <span>Guardar</span>
        </button>
      </header>

      <div className="p-4 space-y-6">
        {/* Metadatos editables */}
        <section className="panel p-4 space-y-4">
          <div>
            <label className="label-tech block mb-1.5" htmlFor="edit-workout-name">
              Nombre del entrenamiento
            </label>
            <input
              id="edit-workout-name"
              type="text"
              value={editWorkout.name}
              onChange={(e) => setEditWorkout({ ...editWorkout, name: e.target.value })}
              placeholder="Nombre del entreno…"
              className="field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-tech block mb-1.5" htmlFor="edit-workout-date">
                Fecha y hora de inicio
              </label>
              <input
                id="edit-workout-date"
                type="datetime-local"
                value={startDateFormatted}
                onChange={(e) => {
                  const val = e.target.value
                  if (!val) return
                  const newStart = new Date(val).getTime()
                  if (!Number.isNaN(newStart)) {
                    const diff =
                      (editWorkout.finishedAt || editWorkout.startedAt) - editWorkout.startedAt
                    setEditWorkout({
                      ...editWorkout,
                      startedAt: newStart,
                      finishedAt: newStart + diff,
                    })
                  }
                }}
                className="field num"
              />
            </div>

            <div>
              <label className="label-tech block mb-1.5" htmlFor="edit-workout-duration">
                Duración (minutos)
              </label>
              <input
                id="edit-workout-duration"
                type="text"
                inputMode="numeric"
                value={durationMinutes}
                onChange={(e) => {
                  const val = Math.max(1, Math.round(parseDecimal(e.target.value) || 1))
                  setEditWorkout({
                    ...editWorkout,
                    finishedAt: editWorkout.startedAt + val * 60000,
                  })
                }}
                className="field num"
              />
            </div>
          </div>

          <div>
            <label className="label-tech block mb-1.5" htmlFor="edit-workout-notes">
              Notas de la sesión
            </label>
            <textarea
              id="edit-workout-notes"
              rows={3}
              value={editWorkout.notes || ''}
              onChange={(e) => setEditWorkout({ ...editWorkout, notes: e.target.value })}
              placeholder="Notas opcionales sobre sensaciones, ajustes, etc."
              className="w-full p-3 bg-elevated border border-line-strong rounded-md text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-accent resize-none"
            />
          </div>
        </section>

        {/* Lista de ejercicios con series editables */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">
              Ejercicios ({editWorkout.entries?.length || 0})
            </h2>
            <button
              type="button"
              onClick={() => setIsAddExerciseOpen(true)}
              className="press px-3 py-1.5 rounded-md bg-elevated border border-line-strong text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Añadir ejercicio</span>
            </button>
          </div>

          {editWorkout.entries.length === 0 ? (
            <div className="panel p-6 text-center space-y-3">
              <p className="text-sm text-neutral-400">No hay ejercicios en este entrenamiento.</p>
              <button
                type="button"
                onClick={() => setIsAddExerciseOpen(true)}
                className="btn-primary"
              >
                <Plus size={16} />
                <span>Añadir primer ejercicio</span>
              </button>
            </div>
          ) : (
            editWorkout.entries.map((entry, eIdx) => {
              const entryUnit = getEntryWeightUnit(editWorkout, entry, unit as 'kg' | 'lb')
              const ex = exerciseMap.get(entry.exerciseId)

              return (
                <div key={`${entry.exerciseId}-${eIdx}`} className="panel overflow-hidden">
                  <div className="p-3.5 bg-surface border-b border-line flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ExerciseDemo
                        exerciseId={entry.exerciseId}
                        variant="thumb"
                        alt={ex?.name || 'Ejercicio'}
                        onClick={() => setPreviewExerciseId(entry.exerciseId)}
                      />
                      <div className="min-w-0">
                        <h3
                          onClick={() => setPreviewExerciseId(entry.exerciseId)}
                          className="font-semibold text-white text-sm truncate hover:text-accent cursor-pointer"
                        >
                          {ex?.name || 'Ejercicio desconocido'}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {ex?.muscleGroup || 'General'} · {ex?.equipment || 'Equipo'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingEntryIndex(eIdx)
                          setIsAddExerciseOpen(true)
                        }}
                        className="press px-2.5 py-1.5 rounded-md bg-elevated border border-line-strong text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1"
                        title="Cambiar este ejercicio"
                        aria-label="Cambiar ejercicio"
                      >
                        <ArrowLeftRight size={13} />
                        <span className="hidden sm:inline">Cambiar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(eIdx)}
                        className="press w-9 h-9 rounded-md text-neutral-400 hover:text-red-400 bg-elevated border border-line flex items-center justify-center"
                        title="Eliminar ejercicio"
                        aria-label="Eliminar ejercicio de la sesión"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto p-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-line text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                          <th className="py-2 px-1 w-10 text-center">#</th>
                          <th className="py-2 px-1 text-center w-28">Peso ({entryUnit})</th>
                          <th className="py-2 px-1 text-center w-20">Reps</th>
                          {showRpe && <th className="py-2 px-1 text-center w-16">RPE</th>}
                          <th className="py-2 px-1 text-center w-12">Hecho</th>
                          <th className="py-2 px-1 w-8 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/40">
                        {entry.sets.map((set, sIdx) => {
                          const rawWeight = convertSetWeight(set, entryUnit).weight

                          return (
                            <tr key={sIdx} className="hover:bg-elevated/30">
                              <td className="py-2 px-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => setTypeTarget({ entryIdx: eIdx, setIdx: sIdx })}
                                  className="press w-12 h-12 rounded-md num text-sm font-bold flex items-center justify-center mx-auto bg-elevated border border-line text-neutral-300 hover:text-white"
                                  aria-label={`Serie ${getSetBadge(entry.sets, sIdx)}: ${getSetTypeOption(set.type).label}. Cambiar tipo`}
                                >
                                  {getSetBadge(entry.sets, sIdx)}
                                </button>
                              </td>

                              <td className="py-2 px-1 text-center">
                                <DecimalInput
                                  value={rawWeight}
                                  onValueChange={(weight) => handleUpdateSet(eIdx, sIdx, { weight: weight ?? 0 })}
                                  placeholder="0"
                                  className="w-20 min-h-12 text-center bg-elevated border border-line-strong rounded-md px-1 num text-base text-white focus:outline-none focus:border-accent"
                                  aria-label={`Peso serie ${sIdx + 1}`}
                                />
                              </td>

                              <td className="py-2 px-1 text-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={set.reps !== undefined ? set.reps : ''}
                                  onChange={(e) => {
                                    const parsed = parseDecimal(e.target.value)
                                    handleUpdateSet(eIdx, sIdx, {
                                      reps: parsed !== undefined ? Math.round(parsed) : 0,
                                    })
                                  }}
                                  placeholder="0"
                                  className="w-16 text-center bg-elevated border border-line-strong rounded-md py-1.5 px-1 num text-sm text-white focus:outline-none focus:border-accent"
                                  aria-label={`Reps serie ${sIdx + 1}`}
                                />
                              </td>

                              {showRpe && (
                                <td className="py-2 px-1 text-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={set.rpe !== undefined ? set.rpe : ''}
                                    onChange={(e) => {
                                      const parsed = parseDecimal(e.target.value)
                                      handleUpdateSet(eIdx, sIdx, {
                                        rpe: parsed,
                                      })
                                    }}
                                    placeholder="RPE"
                                    className="w-14 text-center bg-elevated border border-line-strong rounded-md py-1.5 px-1 num text-xs text-white focus:outline-none focus:border-accent"
                                    aria-label={`RPE serie ${sIdx + 1}`}
                                  />
                                </td>
                              )}

                              <td className="py-2 px-1 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSet(eIdx, sIdx, { completed: !set.completed })
                                  }
                                  className={`w-8 h-8 rounded-md flex items-center justify-center mx-auto border ${
                                    set.completed
                                      ? 'bg-accent border-accent text-accent-fg font-bold'
                                      : 'bg-elevated border-line text-neutral-400'
                                  }`}
                                  aria-label={set.completed ? 'Serie completada' : 'Serie pendiente'}
                                >
                                  <Check size={14} strokeWidth={set.completed ? 3 : 2} />
                                </button>
                              </td>

                              <td className="py-2 px-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSet(eIdx, sIdx)}
                                  className="press w-8 h-8 text-neutral-400 hover:text-red-400 flex items-center justify-center ml-auto"
                                  title="Eliminar serie"
                                  aria-label="Eliminar serie"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSet(eIdx)}
                    className="press w-full py-2.5 bg-surface hover:bg-elevated border-t border-line text-xs font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Añadir serie</span>
                  </button>
                </div>
              )
            })
          )}
        </section>
      </div>

      {/* Barra fija inferior para guardar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-surface border-t border-line flex items-center gap-3 z-40 max-w-md mx-auto">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(editWorkout)}
          className="btn-primary flex-1"
        >
          <Check size={16} strokeWidth={2.5} />
          <span>Guardar cambios</span>
        </button>
      </div>

      <ExerciseSelectorModal
        isOpen={isAddExerciseOpen}
        onClose={() => {
          setIsAddExerciseOpen(false)
          setReplacingEntryIndex(null)
        }}
        onSelectExercises={handleAddExercisesToWorkout}
      />

      {typeTarget && (
        <SetTypeSheet
          title={`Tipo de serie ${getSetBadge(editWorkout.entries[typeTarget.entryIdx].sets, typeTarget.setIdx)}`}
          value={editWorkout.entries[typeTarget.entryIdx].sets[typeTarget.setIdx].type}
          onSelect={(type) => handleUpdateSet(typeTarget.entryIdx, typeTarget.setIdx, { type })}
          onClose={() => setTypeTarget(null)}
        />
      )}

      {previewExerciseId && (
        <ExercisePreviewModal
          exerciseId={previewExerciseId}
          onClose={() => setPreviewExerciseId(null)}
          onAdd={() => setPreviewExerciseId(null)}
        />
      )}
    </div>
  )
}
