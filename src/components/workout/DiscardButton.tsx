import { useState, useRef, useCallback, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { useWorkoutStore } from '../../store'

interface DiscardButtonProps {
  onDiscarded: () => void
}

/**
 * Mantener pulsado 1,5 s con relleno progresivo y cancelación al soltar.
 * Sin window.confirm.
 */
export function DiscardButton({ onDiscarded }: DiscardButtonProps) {
  const discardWorkout = useWorkoutStore((s) => s.discardWorkout)
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState(false)
  const holdStart = useRef<number | null>(null)
  const raf = useRef<number>(0)

  const HOLD_MS = 1500

  const onDown = useCallback(() => {
    if (completed) return
    holdStart.current = Date.now()
    const step = () => {
      if (holdStart.current === null) return
      const elapsed = Date.now() - holdStart.current
      const pct = Math.min(elapsed / HOLD_MS, 1)
      setProgress(pct)
      if (pct >= 1) {
        holdStart.current = null
        setCompleted(true)
        if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50])
        discardWorkout().then(() => onDiscarded())
        return
      }
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }, [completed, discardWorkout, onDiscarded])

  const onUp = useCallback(() => {
    holdStart.current = null
    cancelAnimationFrame(raf.current)
    if (!completed) setProgress(0)
  }, [completed])

  useEffect(() => {
    return () => cancelAnimationFrame(raf.current)
  }, [])

  return (
    <button
      type="button"
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      className={`relative w-full min-h-14 rounded-md border border-red-400/40 text-sm font-semibold overflow-hidden select-none touch-none flex items-center justify-center gap-2 ${
        completed ? 'text-white' : 'text-red-400'
      }`}
      aria-label="Mantener pulsado 1,5 segundos para descartar entreno"
    >
      <span
        className="absolute inset-0 bg-red-400/20"
        style={{
          transform: `scaleX(${progress})`,
          transformOrigin: 'left',
          transition: progress === 0 ? 'transform 120ms' : 'none',
        }}
        aria-hidden="true"
      />
      <Trash2 size={18} strokeWidth={1.75} className="relative z-10 shrink-0" />
      <span className="relative z-10">
        {completed ? 'Entreno descartado' : 'Mantén pulsado para descartar'}
      </span>
    </button>
  )
}
