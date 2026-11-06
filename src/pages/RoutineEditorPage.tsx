import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle,
  Dumbbell,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react'
import { db } from '../db'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { Sheet } from '../components/ui/Sheet'
import { RestPicker } from '../components/RestPicker'
import { ExerciseSelectorModal } from '../components/ExerciseSelectorModal'
import { ExerciseDemo } from '../components/ExerciseDemo'
import { ExercisePreviewModal } from '../components/ExercisePreviewModal'
import { formatRest } from '../utils/formatRest'
import { formatNumber } from '../utils/format'
import { formatSetSummary } from '../utils/setSummary'
import { SetSummaryRow } from '../components/SetSummaryRow'
import { SetEditorFields } from '../components/SetEditorFields'
import {
  asWeightUnit,
  convertSetWeight,
  changeRoutineItemWeightUnit,
  type WeightUnit,
} from '../utils/weightUnits'
import type { Routine, RoutineItem, RoutineItemTargetSet, Exercise } from '../types'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function RoutineEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const isEditing = Boolean(id)

  const [name, setName] = useState('')
  const [folderId, setFolderId] = useState<string>(() => searchParams.get('folderId') || '')
  const [items, setItems] = useState<RoutineItem[]>([])
  const [routineUnit, setRoutineUnit] = useState<WeightUnit | null>(null)
  const [routineRest, setRoutineRest] = useState<number | undefined>()
  const [picker, setPicker] = useState<'global' | number | null>(null)
  const [existingOrder, setExistingOrder] = useState<number>(0)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [replacingItemIndex, setReplacingItemIndex] = useState<number | null>(null)
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(id))

  const folders = useLiveQuery(() => db.folders.orderBy('order').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const appUnit = (settings && 'units' in settings && settings.units) || 'kg'
  const unit = routineUnit ?? appUnit
  const defaultRest = settings && 'restSeconds' in settings ? settings.restSeconds ?? 120 : 120

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    if (exercises) {
      for (const ex of exercises) {
        map.set(ex.id, ex)
      }
    }
    return map
  }, [exercises])

  // Cargar rutina existente si estamos editando
  useEffect(() => {
    if (!id) return

    let isMounted = true
    db.routines.get(id).then((routine) => {
      if (!isMounted) return
      if (routine) {
        setName(routine.name)
        setRoutineUnit(asWeightUnit(routine.weightUnit))
        setRoutineRest(routine.restSeconds)
        setFolderId(routine.folderId ?? '')
        setExistingOrder(routine.order)
        const sorted = [...(routine.items || [])].sort((a, b) => a.order - b.order)
        setItems(sorted)
      } else {
        navigate('/routines', { replace: true })
      }
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [id, navigate])

  const handleAddExercises = (exerciseIds: string[]) => {
    setRoutineUnit((previous) => previous ?? unit)
    if (replacingItemIndex !== null) {
      if (exerciseIds.length > 0) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === replacingItemIndex ? { ...item, exerciseId: exerciseIds[0] } : item
          )
        )
      }
      setReplacingItemIndex(null)
      return
    }

    const newItems: RoutineItem[] = exerciseIds.map((exId, idx) => {
      const ex = exerciseMap.get(exId)
      const type = ex?.type ?? 'weight_reps'

      let initialTargetSets: RoutineItemTargetSet[]
      if (type === 'duration') {
        initialTargetSets = [{ durationSec: 60 }, { durationSec: 60 }, { durationSec: 60 }]
      } else if (type === 'distance') {
        initialTargetSets = [{ distanceM: 1000 }]
      } else {
        initialTargetSets = [
          { reps: 10, weight: undefined },
          { reps: 10, weight: undefined },
          { reps: 10, weight: undefined },
        ]
      }

      return {
        exerciseId: exId,
        order: items.length + idx,
        targetSets: initialTargetSets,
      }
    })

    setItems((prev) => [...prev, ...newItems])
  }

  const handleRemoveExercise = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return

    setItems((prev) => {
      const updated = [...prev]
      const temp = updated[index]
      updated[index] = updated[targetIndex]
      updated[targetIndex] = temp
      return updated
    })
  }

  const handleAddTargetSet = (itemIndex: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item
        const lastSet = item.targetSets[item.targetSets.length - 1]
        const newSet: RoutineItemTargetSet = lastSet
          ? { ...lastSet }
          : { reps: 10, weight: undefined }
        return {
          ...item,
          targetSets: [...item.targetSets, newSet],
        }
      })
    )
  }

  const handleRemoveTargetSet = (itemIndex: number, setIndex: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item
        if (item.targetSets.length <= 1) return item
        return {
          ...item,
          targetSets: item.targetSets.filter((_, sIdx) => sIdx !== setIndex),
        }
      })
    )
  }

  const handleUpdateTargetSet = (
    itemIndex: number,
    setIndex: number,
    patch: Partial<RoutineItemTargetSet>
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item
        const updatedSets = item.targetSets.map((s, sIdx) => {
          if (sIdx !== setIndex) return s
          return {
            ...s,
            ...patch,
            ...('weight' in patch ? { weightUnit: item.weightUnit ?? unit } : {}),
          }
        })
        return { ...item, targetSets: updatedSets }
      })
    )
  }

  const handleSave = async () => {
    setErrorMsg(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorMsg('Ingresa un nombre para la rutina.')
      return
    }

    if (items.length === 0) {
      setErrorMsg('Añade al menos un ejercicio a la rutina antes de guardar.')
      return
    }

    const routineToSave: Routine = {
      id: id || generateId(),
      name: trimmedName,
      weightUnit: unit,
      restSeconds: routineRest,
      folderId: folderId.trim() ? folderId.trim() : null,
      order: isEditing ? existingOrder : Date.now(),
      items: items.map((it, idx) => ({
        exerciseId: it.exerciseId,
        weightUnit: it.weightUnit,
        restSeconds: it.restSeconds,
        order: idx,
        targetSets:
          it.targetSets.length > 0
            ? it.targetSets.map((ts) => ({
                weightUnit: ts.weightUnit ?? it.weightUnit ?? unit,
                weight: ts.weight !== undefined && !isNaN(ts.weight) ? ts.weight : undefined,
                reps: ts.reps !== undefined && !isNaN(ts.reps) ? ts.reps : undefined,
                rpe: ts.rpe !== undefined && !isNaN(ts.rpe) ? ts.rpe : undefined,
                durationSec:
                  ts.durationSec !== undefined && !isNaN(ts.durationSec)
                    ? ts.durationSec
                    : undefined,
                distanceM:
                  ts.distanceM !== undefined && !isNaN(ts.distanceM) ? ts.distanceM : undefined,
              }))
            : [{ reps: 10 }],
      })),
    }

    try {
      await db.routines.put(routineToSave)
      navigate('/routines')
    } catch (err) {
      console.error('Error guardando rutina en Dexie:', err)
      setErrorMsg('Ocurrió un error al guardar la rutina.')
    }
  }

  const handleDeleteCurrentRoutine = async () => {
    if (!id) return
    try {
      await db.routines.delete(id)
      navigate('/routines')
    } catch (err) {
      console.error('Error al eliminar rutina:', err)
    }
  }

  const totalSets = items.reduce((acc, it) => acc + (it.targetSets?.length || 0), 0)

  if (isLoading) {
    return (
      <div className="p-8 text-center text-neutral-400">
        <p className="text-sm">Cargando plantilla...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-black">
      {/* Cabecera ScreenHeader */}
      <ScreenHeader
        back="/routines"
        title={name.trim() || (isEditing ? 'Editar rutina' : 'Nueva rutina')}
        subtitle={
          items.length > 0 ? (
            <span className="num">
              {items.length} {items.length === 1 ? 'ejercicio' : 'ejercicios'} · {totalSets}{' '}
              {totalSets === 1 ? 'serie' : 'series'}
            </span>
          ) : undefined
        }
        actions={
          <button
            type="button"
            onClick={handleSave}
            className="press min-h-12 px-3 text-sm font-bold text-accent active:opacity-80 flex items-center"
          >
            Guardar
          </button>
        }
      />

      <div className="flex-1 p-4 space-y-5">
        {errorMsg && (
          <div className="p-3 bg-surface-elevated border border-red-400 rounded-md text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Campos básicos: Nombre y Carpeta */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="routine-name" className="label-tech block">
              Nombre de la rutina <span className="text-accent">*</span>
            </label>
            <input
              id="routine-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errorMsg) setErrorMsg(null)
              }}
              placeholder="Ej. Empuje A, Torso Fuerza, Pierna..."
              className="field"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="routine-folder" className="label-tech block">
              Carpeta
            </label>
            <select
              id="routine-folder"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="field"
            >
              <option value="">(Sin carpeta)</option>
              {folders?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Configuración global de descanso y unidad */}
          <div>
            <button
              type="button"
              onClick={() => setPicker('global')}
              aria-label="Configurar descanso y unidad global"
              className="press min-h-12 w-full flex items-center justify-between px-3.5 bg-surface border border-line rounded-md text-xs text-neutral-300 hover:text-white"
            >
              <span className="label-tech">Descanso predeterminado</span>
              <span className="font-semibold text-white">
                <span className="num">{formatRest(routineRest ?? defaultRest)}</span> · {unit.toUpperCase()}
              </span>
            </button>
          </div>
        </div>

        {/* Sección de Ejercicios */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h2 className="section-title">
              Ejercicios (<span className="num">{items.length}</span>)
            </h2>
            <span className="label-tech">Series objetivo</span>
          </div>

          {items.length === 0 ? (
            <div className="panel p-8 text-center space-y-3 border-dashed">
              <div className="w-12 h-12 rounded-md bg-surface-elevated border border-line text-neutral-400 flex items-center justify-center mx-auto">
                <Dumbbell size={24} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Sin ejercicios en la rutina</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                  Añade movimientos de la biblioteca para definir series, repeticiones y cargas objetivo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectorOpen(true)}
                className="btn-primary"
              >
                <Plus size={16} strokeWidth={2} />
                <span>Añadir ejercicios</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, itemIdx) => {
                const exercise = exerciseMap.get(item.exerciseId)
                const exType = exercise?.type ?? 'weight_reps'
                const itemWeightUnit = item.weightUnit ?? routineUnit ?? appUnit

                return (
                  <div
                    key={`${item.exerciseId}-${itemIdx}`}
                    className="border border-line rounded-md overflow-hidden bg-surface"
                  >
                    {/* Encabezado del ejercicio */}
                    <div className="p-3 border-b border-line bg-surface-elevated flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ExerciseDemo
                          exerciseId={item.exerciseId}
                          variant="thumb"
                          className="shrink-0"
                          onClick={() => setPreviewExerciseId(item.exerciseId)}
                        />
                        <div className="min-w-0">
                          <h3
                            onClick={() => setPreviewExerciseId(item.exerciseId)}
                            className="font-semibold text-white text-sm leading-snug truncate cursor-pointer hover:text-accent"
                          >
                            {exercise?.name ?? 'Ejercicio desconocido'}
                          </h3>
                          <div className="label-tech text-neutral-400 mt-0.5 truncate">
                            {exercise?.muscleGroup ?? 'General'} · {exercise?.equipment ?? 'Equipo'}
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción del ejercicio (al menos 48x48 px táctiles) */}
                      <div className="flex items-center shrink-0">
                        <button
                          type="button"
                          disabled={itemIdx === 0}
                          onClick={() => handleMoveExercise(itemIdx, 'up')}
                          className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 active:text-white disabled:opacity-20 disabled:pointer-events-none"
                          aria-label={`Subir posición de ${exercise?.name ?? 'ejercicio'}`}
                        >
                          <ChevronUp size={18} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          disabled={itemIdx === items.length - 1}
                          onClick={() => handleMoveExercise(itemIdx, 'down')}
                          className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 active:text-white disabled:opacity-20 disabled:pointer-events-none"
                          aria-label={`Bajar posición de ${exercise?.name ?? 'ejercicio'}`}
                        >
                          <ChevronDown size={18} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReplacingItemIndex(itemIdx)
                            setIsSelectorOpen(true)
                          }}
                          className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 active:text-white"
                          aria-label={`Cambiar ${exercise?.name ?? 'ejercicio'}`}
                        >
                          <ArrowLeftRight size={16} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(itemIdx)}
                          className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-400 active:text-red-400"
                          aria-label={`Eliminar ${exercise?.name ?? 'ejercicio'} de la rutina`}
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>

                    {/* Barra de descanso y unidad por ejercicio */}
                    <div className="px-3 py-2 border-b border-line bg-surface flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPicker(itemIdx)}
                        aria-label={`Configurar descanso y unidad de ${exercise?.name ?? 'ejercicio'}`}
                        className="press min-h-12 flex items-center gap-2 text-xs text-neutral-300 hover:text-white"
                      >
                        <span className="label-tech text-neutral-400">Descanso:</span>
                        <span className="font-semibold text-white">
                          <span className="num">
                            {formatRest(item.restSeconds ?? routineRest ?? defaultRest)}
                          </span>
                          {exType !== 'duration' && exType !== 'distance' && (
                            <> · {itemWeightUnit.toUpperCase()}</>
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Series objetivo resumidas; la confirmación pertenece al entrenamiento. */}
                    <div className="px-3 pb-1">
                      {item.targetSets.map((ts, sIdx) => (
                        <SetSummaryRow
                          key={sIdx}
                          label={sIdx + 1}
                          editLabel={`Editar serie objetivo ${sIdx + 1} de ${exercise?.name ?? 'ejercicio'}`}
                          summary={formatSetSummary(convertSetWeight(ts, itemWeightUnit), exType, itemWeightUnit)}
                          description={ts.rpe === undefined ? 'Objetivo · Toca para editar' : `Objetivo · RPE ${formatNumber(ts.rpe, 0, 1)}`}
                          onRemove={item.targetSets.length > 1 ? () => handleRemoveTargetSet(itemIdx, sIdx) : undefined}
                          removeLabel={`Quitar serie objetivo ${sIdx + 1} de ${exercise?.name ?? 'ejercicio'}`}
                        >
                          <SetEditorFields
                            set={convertSetWeight(ts, itemWeightUnit)}
                            type={exType}
                            unit={itemWeightUnit}
                            label={`serie objetivo ${sIdx + 1}`}
                            showRpe
                            onChange={patch => handleUpdateTargetSet(itemIdx, sIdx, patch)}
                          />
                        </SetSummaryRow>
                      ))}
                      <button type="button" onClick={() => handleAddTargetSet(itemIdx)} className="press min-h-12 px-1 flex items-center gap-1 text-xs text-neutral-300">
                        <Plus size={14} /> Añadir serie objetivo
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Botón para añadir más ejercicios */}
              <button
                type="button"
                onClick={() => setIsSelectorOpen(true)}
                className="btn-secondary w-full"
              >
                <Plus size={18} strokeWidth={2} />
                <span>Añadir ejercicios a la rutina</span>
              </button>
            </div>
          )}
        </div>

        {/* Botón de eliminar rutina si estamos editando */}
        {isEditing && (
          <div className="pt-4 border-t border-line">
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="press w-full min-h-12 flex items-center justify-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 bg-surface border border-line rounded-md"
            >
              <Trash2 size={16} />
              <span>Eliminar rutina</span>
            </button>
          </div>
        )}
      </div>

      {/* RestPicker para descanso y unidad */}
      {picker !== null && (
        <RestPicker
          isOpen
          title={
            picker === 'global'
              ? 'Descanso y unidad global'
              : (exerciseMap.get(items[picker]?.exerciseId)?.name ?? 'Ejercicio')
          }
          currentSeconds={
            picker === 'global'
              ? routineRest ?? defaultRest
              : items[picker]?.restSeconds ?? routineRest ?? defaultRest
          }
          allowGlobal={picker !== 'global'}
          currentWeightUnit={
            picker === 'global'
              ? unit
              : ['duration', 'distance'].includes(
                    exerciseMap.get(items[picker]?.exerciseId)?.type ?? ''
                  )
                ? undefined
                : items[picker]?.weightUnit ?? unit
          }
          globalWeightUnit={unit}
          weightUnitOverride={picker === 'global' ? undefined : items[picker]?.weightUnit}
          onWeightUnitChange={(selected) => {
            if (picker === 'global') {
              const next = selected ?? appUnit
              setItems((prev) =>
                prev.map((item) => {
                  if (
                    item.weightUnit ||
                    ['duration', 'distance'].includes(
                      exerciseMap.get(item.exerciseId)?.type ?? ''
                    )
                  )
                    return item
                  const converted = changeRoutineItemWeightUnit(item, unit, next)
                  const { weightUnit: _unit, ...inherited } = converted
                  return inherited
                })
              )
              setRoutineUnit(next)
            } else {
              setItems((prev) =>
                prev.map((item, index) =>
                  index === picker ? changeRoutineItemWeightUnit(item, unit, selected) : item
                )
              )
            }
          }}
          onSelect={(seconds) => {
            if (picker === 'global') setRoutineRest(seconds)
            else
              setItems((prev) =>
                prev.map((item, index) =>
                  index === picker ? { ...item, restSeconds: seconds } : item
                )
              )
          }}
          onUseGlobal={() => {
            if (picker !== 'global')
              setItems((prev) =>
                prev.map((item, index) => {
                  if (index !== picker) return item
                  const { restSeconds: _rest, ...remaining } = item
                  return remaining
                })
              )
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Selector modal reutilizado */}
      <ExerciseSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(false)
          setReplacingItemIndex(null)
        }}
        onSelectExercises={handleAddExercises}
      />

      {/* Vista previa del ejercicio */}
      {previewExerciseId && (
        <ExercisePreviewModal
          exerciseId={previewExerciseId}
          onClose={() => setPreviewExerciseId(null)}
        />
      )}

      {/* Sheet de confirmación de eliminación de rutina */}
      {isDeleteConfirmOpen && (
        <Sheet
          title="¿Eliminar rutina?"
          onClose={() => setIsDeleteConfirmOpen(false)}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentRoutine}
                className="press flex-1 min-h-12 bg-red-800 text-white font-semibold rounded-md flex items-center justify-center gap-2"
              >
                Eliminar
              </button>
            </div>
          }
        >
          <div className="space-y-2 pt-1 text-sm text-neutral-300">
            <p>
              ¿Seguro que deseas eliminar <strong>&quot;{name}&quot;</strong>?
            </p>
            <p className="text-xs text-neutral-400">
              Esta acción no se puede deshacer. Los registros de entrenamientos anteriores se conservan intactos.
            </p>
          </div>
        </Sheet>
      )}
    </div>
  )
}
