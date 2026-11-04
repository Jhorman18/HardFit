import { Sheet } from '../ui'
import { useWorkoutStore } from '../../store'
import { useRestTimeLeft } from '../../utils/useRestTimeLeft'
import { formatClock } from '../../utils/format'

interface RestExpandedSheetProps {
  onClose: () => void
  nextSetLabel?: string
  beatNumber?: string
  exerciseRestSeconds?: number
}

export function RestExpandedSheet({ onClose, nextSetLabel, beatNumber, exerciseRestSeconds }: RestExpandedSheetProps) {
  const adjustRestTimer = useWorkoutStore((s) => s.adjustRestTimer)
  const skipRestTimer = useWorkoutStore((s) => s.skipRestTimer)
  const timeLeft = useRestTimeLeft()

  if (timeLeft <= 0) {
    onClose()
    return null
  }

  const adjustClass =
    'press min-h-14 flex-1 rounded-md border border-line-strong bg-elevated text-sm font-semibold text-neutral-200'

  return (
    <Sheet title="Descanso" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-4">
        <span
          className="num text-accent leading-none"
          style={{ fontSize: 'min(88px, 18vw)' }}
          role="timer"
          aria-label={`Descanso restante: ${timeLeft} segundos`}
        >
          {formatClock(timeLeft)}
        </span>

        <div className="flex gap-2 w-full">
          <button
            type="button"
            className={adjustClass}
            onClick={() => adjustRestTimer(-15)}
            aria-label="Restar 15 segundos"
          >
            −15 s
          </button>
          <button
            type="button"
            className={adjustClass}
            onClick={() => adjustRestTimer(15)}
            aria-label="Sumar 15 segundos"
          >
            +15 s
          </button>
        </div>

        <button
          type="button"
          className="press w-full min-h-12 rounded-md border border-line-strong bg-elevated text-sm font-semibold text-neutral-200"
          onClick={() => {
            skipRestTimer()
            onClose()
          }}
        >
          Saltar
        </button>

        {(nextSetLabel || beatNumber) && (
          <div className="w-full pt-3 border-t border-line space-y-1">
            {nextSetLabel && (
              <p className="text-sm text-neutral-300">{nextSetLabel}</p>
            )}
            {beatNumber && (
              <div>
                <span className="label-tech">Número a batir</span>
                <span className="num text-lg text-neutral-300 ml-2">{beatNumber}</span>
              </div>
            )}
            {exerciseRestSeconds !== undefined && (
              <p className="text-xs text-neutral-400">
                Descanso del ejercicio: {Math.floor(exerciseRestSeconds / 60)}:{String(exerciseRestSeconds % 60).padStart(2, '0')}
              </p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}
