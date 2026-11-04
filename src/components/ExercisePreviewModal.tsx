import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { X, Plus, Trash2 } from 'lucide-react'
import { db } from '../db'
import { ExerciseDemo } from './ExerciseDemo'
import { BodyMuscleChart } from './BodyMuscleChart'
import { MuscleToggleList } from './MuscleToggleList'
import { ExerciseFocusSelector } from './ExerciseFocusSelector'
import { ExerciseHistoryTab } from './ExerciseHistoryTab'
import { ExerciseNotesTab } from './ExerciseNotesTab'
import { SegTabs } from './ui/SegTabs'
import { Sheet } from './ui/Sheet'
import { exerciseMedia } from '../data/exerciseMedia'
import { getEffectiveMedia } from '../utils/effectiveMuscles'
import { getExerciseFocusDefinition, getExerciseFocusInstructions } from '../data/exerciseFocus'
import { getLatestBodyweightKg } from '../utils/weightUnits'
import type { ExerciseType } from '../types'

export interface ExercisePreviewModalProps {
  exerciseId: string
  onClose: () => void
  onAdd?: (exerciseId: string) => void
  onDeleteCustom?: (exerciseId: string) => void
}

type PreviewTab = 'como' | 'historial' | 'musculos' | 'notas'

function formatExerciseType(type: ExerciseType): string {
  switch (type) {
    case 'weight_reps':
      return 'Carga y Reps'
    case 'bodyweight_reps':
      return 'Peso Corporal'
    case 'bodyweight_assisted':
      return 'Asistido'
    case 'duration':
      return 'Por Tiempo'
    case 'distance':
      return 'Por Distancia'
    default:
      return type
  }
}

export function ExercisePreviewModal({
  exerciseId,
  onClose,
  onAdd,
  onDeleteCustom,
}: ExercisePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('como')
  const [instructionsMap, setInstructionsMap] = useState<Record<string, string[]> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!instructionsMap) {
      import('../data/exerciseInstructions.json').then((module) => {
        setInstructionsMap(module.default as Record<string, string[]>)
      })
    }
  }, [instructionsMap])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [])

  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId])
  const override = useLiveQuery(() => db.muscleOverrides.get(exerciseId), [exerciseId])
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const unit = (settings && 'units' in settings && settings.units) || 'kg'

  const latestBodyweight = useMemo(() => getLatestBodyweightKg(measurements), [measurements])

  const hasBaseMedia = Boolean(exerciseMedia[exerciseId])
  const effectiveMedia = useMemo(() => {
    return getEffectiveMedia(exerciseId, override)
  }, [exerciseId, override])

  const instructions =
    getExerciseFocusInstructions(exerciseId, override?.focus) ?? instructionsMap?.[exerciseId]

  const isLegPressFocus = Boolean(getExerciseFocusDefinition(exerciseId))

  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleDelete = async () => {
    if (!exercise || !exercise.isCustom) return
    try {
      await db.exercises.delete(exercise.id)
      onDeleteCustom?.(exercise.id)
      onClose()
    } catch (err) {
      console.error('Error al eliminar ejercicio personalizado:', err)
    }
  }

  const tabOptions: { value: PreviewTab; label: string }[] = [
    { value: 'como', label: 'Cómo' },
    { value: 'historial', label: 'Historial' },
    { value: 'musculos', label: 'Músculos' },
    { value: 'notas', label: 'Notas' },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-neutral-950/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        tabIndex={-1}
        className="relative w-full max-w-md max-h-[90dvh] flex flex-col bg-surface border-t sm:border border-line-strong rounded-t-lg sm:rounded-lg outline-none pb-[env(safe-area-inset-bottom)]"
      >
        {/* Cabecera */}
        <div className="flex items-center gap-2 pl-4 pr-1 pt-2 pb-1 shrink-0 border-b border-line">
          <div className="flex-1 min-w-0 py-1">
            <h2 id="preview-title" className="text-[17px] font-semibold leading-tight text-white truncate">
              {exercise?.name ?? 'Detalle del ejercicio'}
            </h2>
            {exercise && (
              <p className="mt-0.5 text-xs text-neutral-400 truncate">
                {exercise.muscleGroup} · {exercise.equipment} · {formatExerciseType(exercise.type)}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Cerrar vista previa"
            onClick={onClose}
            className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-300 active:text-white shrink-0"
          >
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>

        {/* Pestañas de navegación */}
        <SegTabs
          value={activeTab}
          options={tabOptions}
          onChange={(tab) => setActiveTab(tab)}
          label="Secciones del ejercicio"
        />

        {/* Contenido scrolleable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          {/* Pestaña: Cómo / Resumen */}
          {activeTab === 'como' && (
            <div className="space-y-4">
              {/* Enfoque de prensa si aplica */}
              {isLegPressFocus && (
                <div className="p-3 bg-surface-elevated border border-line rounded-md">
                  <ExerciseFocusSelector exerciseId={exerciseId} />
                </div>
              )}

              {/* Demostración visual */}
              <div className="flex justify-center">
                <ExerciseDemo
                  exerciseId={exerciseId}
                  gifUrl={effectiveMedia.gifUrl}
                  variant="full"
                  alt={exercise?.name || 'Demostración'}
                />
              </div>

              {/* Instrucciones de técnica */}
              <div className="space-y-2">
                <span className="label-tech block text-neutral-400">
                  Instrucciones técnicas
                </span>
                {instructions && instructions.length > 0 ? (
                  <ol className="space-y-2 text-sm text-neutral-300 list-decimal list-inside leading-relaxed pl-1">
                    {instructions.map((step, idx) => (
                      <li key={idx} className="text-neutral-300">
                        <span className="text-neutral-200">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-neutral-400">Sin instrucciones registradas.</p>
                )}
              </div>

              {/* Mapa muscular anatómico */}
              {hasBaseMedia && (
                <div className="space-y-2 pt-2 border-t border-line">
                  <div className="flex items-center justify-between">
                    <span className="label-tech text-neutral-400">
                      Mapa muscular
                    </span>
                    <div className="flex items-center gap-3 label-tech">
                      {effectiveMedia.primary.length > 0 && (
                        <span className="text-neutral-200">
                          {effectiveMedia.primaryEs.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <BodyMuscleChart
                    primary={effectiveMedia.primary}
                    secondary={effectiveMedia.secondary}
                    size="lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Pestaña: Historial */}
          {activeTab === 'historial' && exercise && (
            <ExerciseHistoryTab
              exercise={exercise}
              workouts={workouts}
              bodyweightKg={latestBodyweight}
              unit={unit}
            />
          )}

          {/* Pestaña: Músculos */}
          {activeTab === 'musculos' && (
            <div className="space-y-4">
              {!isLegPressFocus ? (
                <MuscleToggleList exerciseId={exerciseId} />
              ) : (
                <div className="p-3 bg-surface-elevated border border-line rounded-md">
                  <ExerciseFocusSelector exerciseId={exerciseId} />
                </div>
              )}

              {hasBaseMedia && (
                <div className="pt-2 border-t border-line">
                  <span className="label-tech block mb-2 text-neutral-400">
                    Vista anatómica
                  </span>
                  <BodyMuscleChart
                    primary={effectiveMedia.primary}
                    secondary={effectiveMedia.secondary}
                    size="lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Pestaña: Notas */}
          {activeTab === 'notas' && (
            <ExerciseNotesTab exerciseId={exerciseId} />
          )}

          {/* Botón de eliminar si es ejercicio personalizado */}
          {exercise?.isCustom && (
            <div className="pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="press w-full min-h-12 flex items-center justify-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 bg-surface-elevated border border-line rounded-md"
              >
                <Trash2 size={16} />
                <span>Eliminar ejercicio personalizado</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer si se requiere añadir */}
        {onAdd && (
          <div className="shrink-0 px-4 py-3 border-t border-line bg-surface">
            <button
              type="button"
              onClick={() => onAdd(exerciseId)}
              className="btn-primary w-full text-base"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Añadir a la rutina</span>
            </button>
          </div>
        )}
      </div>

      {confirmingDelete && exercise && (
        <Sheet
          title="Eliminar ejercicio"
          onClose={() => setConfirmingDelete(false)}
          footer={
            <button type="button" onClick={handleDelete} className="btn-secondary w-full text-red-400">
              Eliminar
            </button>
          }
        >
          <p className="text-[15px] text-neutral-300">
            ¿Eliminar el ejercicio «{exercise.name}»? Esta acción no se puede deshacer.
          </p>
        </Sheet>
      )}
    </div>,
    document.body
  )
}
