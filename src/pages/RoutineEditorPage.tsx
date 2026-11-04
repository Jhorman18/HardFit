import { RestPicker } from '../components/RestPicker'
import { formatRest } from '../utils/formatRest'
import { asWeightUnit, convertSetWeight, changeRoutineItemWeightUnit, inputWeight, type WeightUnit } from '../utils/weightUnits'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronLeft,
  Check,
  AlertTriangle,
  Dumbbell,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  ArrowLeftRight,
} from 'lucide-react'
import { db } from '../db'
import { ExerciseSelectorModal } from '../components/ExerciseSelectorModal'
import { ExerciseDemo } from '../components/ExerciseDemo'
import { ExercisePreviewModal } from '../components/ExercisePreviewModal'
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
    setRoutineUnit(previous => previous ?? unit)
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
        // default 3 series de 10 reps
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
          return { ...s, ...patch, ...('weight' in patch ? { weightUnit: item.weightUnit ?? unit } : {}) }
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

  if (isLoading) {
    return (
      <div className="p-8 text-center text-neutral-400">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Cargando plantilla...</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Barra superior con volver y título */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/routines')}
            className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition"
            title="Volver a Rutinas"
            aria-label="Volver a Rutinas"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isEditing ? 'Editar Rutina' : 'Nueva Rutina'}
            </h1>
            <p className="text-xs text-neutral-400">
              {isEditing ? 'Modifica ejercicios y series objetivo' : 'Crea una plantilla de entrenamiento'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
        >
          <Check size={15} />
          <span>Guardar</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Datos básicos: Nombre y Carpeta */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3.5">
        <div>
          <label htmlFor="routine-name" className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
            Nombre de la rutina <span className="text-white">*</span>
          </label>
          <input
            id="routine-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Pecho y Tríceps, Pierna Fuerza, Full Body A..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
          />
        </div>

        <div>
          <label htmlFor="routine-folder" className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
            Carpeta de organización
          </label>
          <select
            id="routine-folder"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-200 focus:outline-none focus:border-white transition"
          >
            <option value="">(Sin carpeta / Suelta)</option>
            {folders?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="button" onClick={() => setPicker('global')} aria-label="Configurar descanso y unidad global" className="px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-900 text-xs text-neutral-300">
        Descanso: {formatRest(routineRest ?? defaultRest)} · {unit}
      </button>

      {/* Lista de Ejercicios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
            Ejercicios ({items.length})
          </h2>
          <span className="text-xs text-neutral-500">Configura las series objetivo</span>
        </div>

        {items.length === 0 ? (
          <div className="bg-neutral-900 border border-dashed border-neutral-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
              <Dumbbell size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sin ejercicios en la rutina</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                Añade movimientos de la biblioteca para definir las series, repeticiones y cargas objetivo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSelectorOpen(true)}
              className="py-2.5 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>Añadir ejercicios</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {items.map((item, itemIdx) => {
              const exercise = exerciseMap.get(item.exerciseId)
              const exType = exercise?.type ?? 'weight_reps'
              const unit = item.weightUnit ?? routineUnit ?? appUnit

              return (
                <div
                  key={`${item.exerciseId}-${itemIdx}`}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Encabezado del Ejercicio */}
                  <div className="p-3.5 border-b border-neutral-800 bg-neutral-900/95 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {itemIdx + 1}
                      </span>
                      <ExerciseDemo
                        exerciseId={item.exerciseId}
                        variant="thumb"
                        className="w-10 h-10 shrink-0"
                        onClick={() => setPreviewExerciseId(item.exerciseId)}
                      />
                      <div className="min-w-0">
                        <h3
                          onClick={() => setPreviewExerciseId(item.exerciseId)}
                          className="font-bold text-white text-sm leading-snug truncate cursor-pointer hover:text-neutral-300 transition"
                        >
                          {exercise?.name ?? 'Ejercicio desconocido'}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                          <span className="text-white font-medium">{exercise?.muscleGroup ?? 'General'}</span>
                          <span>•</span>
                          <span>{exercise?.equipment ?? 'Equipo'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones de reordenar y eliminar */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingItemIndex(itemIdx)
                          setIsSelectorOpen(true)
                        }}
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white flex items-center gap-1 text-xs font-medium transition border border-neutral-700/60 mr-1"
                        title="Cambiar este ejercicio por otro manteniendo las series"
                        aria-label="Cambiar ejercicio"
                      >
                        <ArrowLeftRight size={13} />
                        <span>Cambiar</span>
                      </button>
                      <button
                        type="button"
                        disabled={itemIdx === 0}
                        onClick={() => handleMoveExercise(itemIdx, 'up')}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                          itemIdx === 0
                            ? 'text-neutral-700 bg-neutral-950/40 cursor-not-allowed'
                            : 'text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white'
                        }`}
                        title="Subir posición"
                        aria-label="Subir posición"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={itemIdx === items.length - 1}
                        onClick={() => handleMoveExercise(itemIdx, 'down')}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                          itemIdx === items.length - 1
                            ? 'text-neutral-700 bg-neutral-950/40 cursor-not-allowed'
                            : 'text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white'
                        }`}
                        title="Bajar posición"
                        aria-label="Bajar posición"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(itemIdx)}
                        className="w-7 h-7 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 flex items-center justify-center transition ml-1"
                        title="Eliminar ejercicio de la rutina"
                        aria-label="Eliminar ejercicio de la rutina"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <button type="button" onClick={() => setPicker(itemIdx)} aria-label={'Configurar descanso y unidad de ' + (exercise?.name ?? 'ejercicio')} className="mx-3 mt-2 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-xs text-neutral-300">
                    Descanso: {formatRest(item.restSeconds ?? routineRest ?? defaultRest)}
                    {exType !== 'duration' && exType !== 'distance' && <> · {unit}</>}
                  </button>

                  {/* Tabla de Series Objetivo */}
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800">
                          <th className="pb-2 w-10 text-center">Serie</th>
                          {exType === 'duration' ? (
                            <th className="pb-2 text-center">Segundos obj.</th>
                          ) : exType === 'distance' ? (
                            <>
                              <th className="pb-2 text-center">Metros obj.</th>
                              <th className="pb-2 text-center">Segundos obj.</th>
                            </>
                          ) : (
                            <>
                              <th className="pb-2 w-24 text-center">{unit.toUpperCase()} obj.</th>
                              <th className="pb-2 w-20 text-center">Reps obj.</th>
                            </>
                          )}
                          <th className="pb-2 w-16 text-center">RPE</th>
                          <th className="pb-2 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/40">
                        {item.targetSets.map((ts, sIdx) => (
                          <tr key={sIdx} className="hover:bg-neutral-800/30 transition">
                            <td className="py-1.5 px-1 text-center text-xs font-mono font-semibold text-neutral-400">
                              {sIdx + 1}
                            </td>

                            {exType === 'duration' ? (
                              <td className="py-1.5 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  placeholder="60"
                                  value={ts.durationSec ?? ''}
                                  onChange={(e) =>
                                    handleUpdateTargetSet(itemIdx, sIdx, {
                                      durationSec:
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                    })
                                  }
                                  className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-xs font-semibold text-white focus:outline-none focus:border-white"
                                />
                              </td>
                            ) : exType === 'distance' ? (
                              <>
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    placeholder="1000"
                                    value={ts.distanceM ?? ''}
                                    onChange={(e) =>
                                      handleUpdateTargetSet(itemIdx, sIdx, {
                                        distanceM:
                                          e.target.value === '' ? undefined : Number(e.target.value),
                                      })
                                    }
                                    className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-xs font-semibold text-white focus:outline-none focus:border-white"
                                  />
                                </td>
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="5"
                                    placeholder="300"
                                    value={ts.durationSec ?? ''}
                                    onChange={(e) =>
                                      handleUpdateTargetSet(itemIdx, sIdx, {
                                        durationSec:
                                          e.target.value === '' ? undefined : Number(e.target.value),
                                      })
                                    }
                                    className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-xs font-semibold text-white focus:outline-none focus:border-white"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0"
                                    value={inputWeight(convertSetWeight(ts, unit).weight)}
                                    onChange={(e) =>
                                      handleUpdateTargetSet(itemIdx, sIdx, {
                                        weight:
                                          e.target.value === '' ? undefined : Number(e.target.value),
                                      })
                                    }
                                    className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-xs font-semibold text-white focus:outline-none focus:border-white"
                                  />
                                </td>
                                <td className="py-1.5 px-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="10"
                                    value={ts.reps ?? ''}
                                    onChange={(e) =>
                                      handleUpdateTargetSet(itemIdx, sIdx, {
                                        reps:
                                          e.target.value === '' ? undefined : Number(e.target.value),
                                      })
                                    }
                                    className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-xs font-semibold text-white focus:outline-none focus:border-white"
                                  />
                                </td>
                              </>
                            )}

                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="0.5"
                                placeholder="8"
                                value={ts.rpe ?? ''}
                                onChange={(e) =>
                                  handleUpdateTargetSet(itemIdx, sIdx, {
                                    rpe: e.target.value === '' ? undefined : Number(e.target.value),
                                  })
                                }
                                className="w-full text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 px-1 text-xs font-semibold text-neutral-300 focus:outline-none focus:border-white"
                              />
                            </td>

                            <td className="py-1.5 px-1 text-center">
                              {item.targetSets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTargetSet(itemIdx, sIdx)}
                                  className="text-neutral-500 hover:text-red-400 p-1 transition"
                                  title="Quitar serie objetivo"
                                  aria-label="Quitar serie objetivo"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <button
                      type="button"
                      onClick={() => handleAddTargetSet(itemIdx)}
                      className="w-full mt-2.5 py-1.5 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-medium text-neutral-300 hover:text-white transition flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Añadir serie objetivo</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Botón para añadir más ejercicios */}
        <button
          type="button"
          onClick={() => setIsSelectorOpen(true)}
          className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 hover:border-neutral-500 text-white rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
        >
          <Plus size={16} />
          <span>Añadir ejercicio a la rutina</span>
        </button>
      </div>

      {/* Botones de acción inferiores */}
      <div className="pt-2 flex gap-2">
        <button
          type="button"
          onClick={() => navigate('/routines')}
          className="flex-1 py-3 px-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-2 py-3 px-4 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5"
        >
          <Check size={16} />
          <span>Guardar rutina</span>
        </button>
      </div>

      {picker !== null && (
        <RestPicker
          isOpen
          title={picker === 'global' ? 'Descanso y unidad global' : (exerciseMap.get(items[picker].exerciseId)?.name ?? 'Ejercicio')}
          currentSeconds={picker === 'global' ? routineRest ?? defaultRest : items[picker].restSeconds ?? routineRest ?? defaultRest}
          allowGlobal={picker !== 'global'}
          currentWeightUnit={picker === 'global' ? unit : ['duration', 'distance'].includes(exerciseMap.get(items[picker].exerciseId)?.type ?? '') ? undefined : items[picker].weightUnit ?? unit}
          globalWeightUnit={unit}
          weightUnitOverride={picker === 'global' ? undefined : items[picker].weightUnit}
          onWeightUnitChange={(selected) => {
            if (picker === 'global') {
              const next = selected ?? appUnit
              setItems(prev => prev.map(item => {
                if (item.weightUnit || ['duration', 'distance'].includes(exerciseMap.get(item.exerciseId)?.type ?? '')) return item
                const converted = changeRoutineItemWeightUnit(item, unit, next)
                const { weightUnit: _unit, ...inherited } = converted
                return inherited
              }))
              setRoutineUnit(next)
            } else {
              setItems(prev => prev.map((item,index) => index === picker ? changeRoutineItemWeightUnit(item, unit, selected) : item))
            }
          }}
          onSelect={(seconds) => {
            if (picker === 'global') setRoutineRest(seconds)
            else setItems(prev => prev.map((item,index) => index === picker ? { ...item, restSeconds: seconds } : item))
          }}
          onUseGlobal={() => {
            if (picker !== 'global') setItems(prev => prev.map((item,index) => {
              if (index !== picker) return item
              const { restSeconds: _rest, ...remaining } = item
              return remaining
            }))
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

      {/* Modal de vista previa del ejercicio */}
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
