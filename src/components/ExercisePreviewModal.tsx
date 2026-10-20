import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { X, Plus, ArrowLeft } from 'lucide-react'
import { db } from '../db'
import { ExerciseDemo } from './ExerciseDemo'
import { BodyMuscleChart } from './BodyMuscleChart'
import { MuscleToggleList } from './MuscleToggleList'
import { exerciseMedia } from '../data/exerciseMedia'
import { getEffectiveMedia } from '../utils/effectiveMuscles'
import type { ExerciseType } from '../types'

export interface ExercisePreviewModalProps {
  exerciseId: string
  onClose: () => void
  onAdd: (exerciseId: string) => void
}

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
}: ExercisePreviewModalProps) {
  const [instructionsMap, setInstructionsMap] = useState<Record<string, string[]> | null>(null)

  useEffect(() => {
    if (!instructionsMap) {
      import('../data/exerciseInstructions.json').then((module) => {
        setInstructionsMap(module.default as Record<string, string[]>)
      })
    }
  }, [instructionsMap])

  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId])
  const override = useLiveQuery(() => db.muscleOverrides.get(exerciseId), [exerciseId])

  const hasBaseMedia = Boolean(exerciseMedia[exerciseId])
  const effectiveMedia = useMemo(() => {
    return getEffectiveMedia(exerciseId, override)
  }, [exerciseId, override])

  const instructions = instructionsMap ? instructionsMap[exerciseId] : undefined

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div className="w-full max-w-md h-full sm:h-[90vh] flex flex-col bg-black sm:bg-neutral-900 sm:border border-neutral-800 sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition shrink-0 sm:hidden"
              aria-label="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h2 id="preview-title" className="text-base font-bold text-white leading-snug truncate">
                {exercise?.name ?? 'Detalle del ejercicio'}
              </h2>
              {exercise && (
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {exercise.muscleGroup} • {exercise.equipment} • {formatExerciseType(exercise.type)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition shrink-0"
            aria-label="Cerrar vista previa"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* GIF grande */}
          <div className="flex justify-center">
            <ExerciseDemo
              exerciseId={exerciseId}
              variant="full"
              alt={exercise?.name || 'Demostración del ejercicio'}
            />
          </div>

          {/* Metadatos principales */}
          {exercise && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                  Grupo
                </span>
                <span className="font-semibold text-white truncate block">
                  {exercise.muscleGroup}
                </span>
              </div>
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                  Equipo
                </span>
                <span className="font-semibold text-white truncate block">
                  {exercise.equipment}
                </span>
              </div>
              <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                  Tipo
                </span>
                <span className="font-semibold text-white truncate block">
                  {formatExerciseType(exercise.type)}
                </span>
              </div>
            </div>
          )}

          {/* Instrucciones de técnica */}
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
              Instrucciones
            </span>
            {instructions && instructions.length > 0 ? (
              <ol className="space-y-1.5 text-xs text-neutral-300 list-decimal list-inside leading-relaxed">
                {instructions.map((step, idx) => (
                  <li key={idx} className="text-neutral-300">
                    <span className="text-neutral-200">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-neutral-400">Sin instrucciones</p>
            )}
          </div>

          {/* Mapa muscular anatómico interactivo */}
          {hasBaseMedia && effectiveMedia ? (
            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  Mapa Muscular
                </span>
                <div className="flex items-center gap-3 text-[10px]">
                  {effectiveMedia.primary.length > 0 && (
                    <span className="flex items-center gap-1.5 text-neutral-300">
                      <span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block" />
                      Primario
                    </span>
                  )}
                  {effectiveMedia.secondary.length > 0 && (
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <span className="w-2 h-2 rounded-full bg-[#f97316] inline-block" />
                      Secundario
                    </span>
                  )}
                </div>
              </div>

              <BodyMuscleChart
                primary={effectiveMedia.primary}
                secondary={effectiveMedia.secondary}
                size="lg"
              />

              <div className="space-y-1 pt-1 text-xs border-t border-neutral-800/60">
                {effectiveMedia.primaryEs.length > 0 ? (
                  <div className="leading-snug">
                    <span className="font-semibold text-white">Músculos: </span>
                    <span className="text-neutral-200">
                      {effectiveMedia.primaryEs.join(', ')}
                    </span>
                  </div>
                ) : (
                  <div className="leading-snug text-neutral-500">
                    Sin músculos primarios activos
                  </div>
                )}
                {effectiveMedia.secondaryEs.length > 0 && (
                  <div className="leading-snug text-neutral-400">
                    <span className="font-medium text-neutral-400">Secundarios: </span>
                    <span className="text-neutral-400">
                      {effectiveMedia.secondaryEs.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-xs text-neutral-500">Sin datos de músculos</span>
            </div>
          )}

          {/* Ajuste interactivo de músculos trabajados (checkboxes con persistencia) */}
          <MuscleToggleList exerciseId={exerciseId} />
        </div>

        {/* Botones de acción */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-900/90 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => onAdd(exerciseId)}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-black flex items-center justify-center gap-1.5 transition shadow-sm active:scale-[0.99]"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Añadir a la rutina/entreno</span>
          </button>
        </div>
      </div>
    </div>
  )
}
