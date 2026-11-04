import { Sheet } from '../ui'

interface DeleteWorkoutSheetProps {
  workoutName: string
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteWorkoutSheet({
  workoutName,
  isOpen,
  onClose,
  onConfirm,
}: DeleteWorkoutSheetProps) {
  if (!isOpen) return null

  return (
    <Sheet title="¿Eliminar entrenamiento?" onClose={onClose}>
      <div className="p-4 space-y-4">
        <p className="text-sm text-neutral-300 leading-relaxed">
          Esta acción eliminará de forma permanente el entreno{' '}
          <strong className="text-white">&quot;{workoutName}&quot;</strong> y sus datos se
          descontarán de tus estadísticas y récords.
        </p>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="press flex-1 min-h-[48px] px-4 rounded-md font-semibold text-sm bg-red-700 hover:bg-red-800 text-white flex items-center justify-center"
          >
            Eliminar
          </button>
        </div>
      </div>
    </Sheet>
  )
}
