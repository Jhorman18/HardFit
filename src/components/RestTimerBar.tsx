import { useWorkoutStore } from '../store'
import { formatClock } from '../utils/format'
import { useRestTimeLeft } from '../utils/useRestTimeLeft'

const adjustClass =
  'press min-h-12 min-w-12 px-1 whitespace-nowrap rounded-md text-xs font-medium text-neutral-300 hover:bg-elevated'

interface RestTimerBarProps {
  onExpand?: () => void
}

/** Barra de descanso acoplada al entreno. No flota: va en flujo, justo encima de la acción principal. */
export function RestTimerBar({ onExpand }: RestTimerBarProps) {
  const restTimer = useWorkoutStore((state) => state.restTimer)
  const adjustRestTimer = useWorkoutStore((state) => state.adjustRestTimer)
  const skipRestTimer = useWorkoutStore((state) => state.skipRestTimer)
  const timeLeft = useRestTimeLeft()

  if (!restTimer || timeLeft <= 0) return null

  return (
    <div className="relative shrink-0 border-t border-line bg-surface px-2 py-1 flex items-center justify-between gap-2">
      <span
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-accent"
        style={{
          transform: `scaleX(${Math.min(1, timeLeft / restTimer.totalSeconds)})`,
          transition: 'transform 300ms linear',
        }}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onExpand}
        className="press flex flex-col shrink-0 min-h-12 justify-center text-left"
        role="timer"
        aria-label="Descanso restante. Tocar para expandir"
      >
        <span className="label-tech">Descanso</span>
        <span className="num text-lg font-semibold leading-none text-accent">{formatClock(timeLeft)}</span>
      </button>
      <div className="flex items-center gap-1 min-w-0">
        <button
          type="button"
          className={adjustClass}
          onClick={(e) => {
            e.stopPropagation()
            adjustRestTimer(-15)
          }}
          aria-label="Restar 15 segundos"
        >
          −15 s
        </button>
        <button
          type="button"
          className={adjustClass}
          onClick={(e) => {
            e.stopPropagation()
            adjustRestTimer(15)
          }}
          aria-label="Sumar 15 segundos"
        >
          +15 s
        </button>
        <button
          type="button"
          className={adjustClass}
          onClick={(e) => {
            e.stopPropagation()
            skipRestTimer()
          }}
        >
          Saltar
        </button>
      </div>
    </div>
  )
}
