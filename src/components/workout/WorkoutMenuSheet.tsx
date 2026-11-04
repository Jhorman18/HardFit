import { Sheet } from '../ui'
import { Plus, Timer, FileText, Check } from 'lucide-react'
import { formatRest } from '../../utils/formatRest'
import { DiscardButton } from './DiscardButton'
import type { WeightUnit } from '../../utils/weightUnits'

interface WorkoutMenuSheetProps {
  onClose: () => void
  onAddExercise: () => void
  onOpenRestPicker: () => void
  onOpenNotes: () => void
  onFinishWorkout: () => void
  onDiscarded: () => void
  workoutName: string
  restSeconds: number
  unit: WeightUnit
}

export function WorkoutMenuSheet({
  onClose,
  onAddExercise,
  onOpenRestPicker,
  onOpenNotes,
  onFinishWorkout,
  onDiscarded,
  workoutName,
  restSeconds,
  unit,
}: WorkoutMenuSheetProps) {
  return (
    <Sheet title={workoutName || 'Entreno en curso'} onClose={onClose}>
      <div className="space-y-4 py-2">
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => {
                onClose()
                onAddExercise()
              }}
              className="press w-full min-h-12 flex items-center gap-3 px-3 rounded-md text-left text-sm text-neutral-200 bg-surface hover:bg-elevated border border-line"
            >
              <Plus size={18} strokeWidth={1.75} className="text-neutral-400 shrink-0" />
              <span className="flex-1">Añadir ejercicio</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenRestPicker()
              }}
              className="press w-full min-h-12 flex items-center gap-3 px-3 rounded-md text-left text-sm text-neutral-200 bg-surface hover:bg-elevated border border-line"
            >
              <Timer size={18} strokeWidth={1.75} className="text-neutral-400 shrink-0" />
              <span className="flex-1">Descanso y unidad</span>
              <span className="label-tech text-neutral-400">
                {formatRest(restSeconds)} · {unit}
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenNotes()
              }}
              className="press w-full min-h-12 flex items-center gap-3 px-3 rounded-md text-left text-sm text-neutral-200 bg-surface hover:bg-elevated border border-line"
            >
              <FileText size={18} strokeWidth={1.75} className="text-neutral-400 shrink-0" />
              <span className="flex-1">Notas de la sesión</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onClose()
                onFinishWorkout()
              }}
              className="press w-full min-h-12 flex items-center gap-3 px-3 rounded-md text-left text-sm text-neutral-200 bg-surface hover:bg-elevated border border-line"
            >
              <Check size={18} strokeWidth={2} className="text-neutral-400 shrink-0" />
              <span className="flex-1">Terminar entreno</span>
            </button>
          </li>
        </ul>

        <div className="pt-2 border-t border-line space-y-2">
          <DiscardButton
            onDiscarded={() => {
              onClose()
              onDiscarded()
            }}
          />
          <p className="text-xs text-neutral-400 text-center">
            Descartar borra las series de esta sesión. Hay que mantener 1,5 s a propósito.
          </p>
        </div>
      </div>
    </Sheet>
  )
}
