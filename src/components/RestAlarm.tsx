import { useEffect } from 'react'
import { useWorkoutStore } from '../store'
import { notifyTimerFinished } from '../utils/sound'

/** Siempre montado en Layout: el aviso de fin de descanso no depende de la pantalla visible. */
export function RestAlarm() {
  const targetEnd = useWorkoutStore((state) => state.restTimer?.targetEnd)
  const skipRestTimer = useWorkoutStore((state) => state.skipRestTimer)

  useEffect(() => {
    if (targetEnd === undefined) return
    const timeout = setTimeout(() => {
      notifyTimerFinished()
      skipRestTimer()
    }, Math.max(0, targetEnd - Date.now()))
    return () => clearTimeout(timeout)
  }, [targetEnd, skipRestTimer])

  return null
}
