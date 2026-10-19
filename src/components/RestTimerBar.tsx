import { useEffect, useState, useRef } from 'react'
import { Timer } from 'lucide-react'
import { useWorkoutStore } from '../store'
import { notifyTimerFinished } from '../utils/sound'
import { updateRestCountdown } from '../utils/restNotifications'

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function RestTimerBar() {
  const restTimer = useWorkoutStore((state) => state.restTimer)
  const adjustRestTimer = useWorkoutStore((state) => state.adjustRestTimer)
  const skipRestTimer = useWorkoutStore((state) => state.skipRestTimer)

  const [timeLeft, setTimeLeft] = useState(() => {
    const timer = useWorkoutStore.getState().restTimer
    if (!timer) return 0
    return Math.max(0, Math.ceil((timer.targetEnd - Date.now()) / 1000))
  })
  const hasAlertedRef = useRef(false)
  const lastSecondsRef = useRef<number | null>(null)

  useEffect(() => {
    if (!restTimer) {
      hasAlertedRef.current = false
      lastSecondsRef.current = null
      return
    }

    hasAlertedRef.current = false
    lastSecondsRef.current = null

    const updateTimer = () => {
      const now = Date.now()
      const diff = restTimer.targetEnd - now
      const remaining = Math.max(0, Math.ceil(diff / 1000))
      setTimeLeft(remaining)

      if (remaining > 0 && lastSecondsRef.current !== remaining) {
        lastSecondsRef.current = remaining
        updateRestCountdown(remaining).catch(() => {})
      }

      if (remaining <= 0) {
        if (!hasAlertedRef.current) {
          hasAlertedRef.current = true
          notifyTimerFinished()
        }
        skipRestTimer()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 300)
    return () => clearInterval(interval)
  }, [restTimer, skipRestTimer])

  if (!restTimer || timeLeft <= 0) return null

  const progress = Math.min(100, Math.max(0, (timeLeft / restTimer.totalSeconds) * 100))

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
      <div className="w-full max-w-md bg-neutral-900/95 border border-neutral-700 shadow-2xl rounded-2xl p-3 backdrop-blur-md pointer-events-auto space-y-2">
        {/* Barra superior del timer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer size={20} className="text-white animate-pulse" />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Descanso
              </div>
              <div className="text-xl font-mono font-extrabold text-white leading-tight">
                {formatSeconds(timeLeft)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustRestTimer(-15)}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition"
              title="Restar 15 segundos"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => adjustRestTimer(15)}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition"
              title="Sumar 15 segundos"
            >
              +15s
            </button>
            <button
              type="button"
              onClick={skipRestTimer}
              className="px-3 py-1 bg-white hover:bg-neutral-200 text-black border border-white rounded-lg text-xs font-bold transition"
            >
              Saltar
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden border border-neutral-800">
          <div
            className="bg-white h-full transition-all duration-300 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
