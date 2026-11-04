import { useEffect, useState } from 'react'
import { useWorkoutStore } from '../store'

function secondsLeft(targetEnd: number | undefined): number {
  if (targetEnd === undefined) return 0
  return Math.max(0, Math.ceil((targetEnd - Date.now()) / 1000))
}

/** Segundos de descanso restantes; 0 si no hay descanso en marcha. Solo lee: el fin lo gestiona RestAlarm. */
export function useRestTimeLeft(): number {
  const targetEnd = useWorkoutStore((state) => state.restTimer?.targetEnd)
  const [timeLeft, setTimeLeft] = useState(() => secondsLeft(targetEnd))

  useEffect(() => {
    const update = () => setTimeLeft(secondsLeft(targetEnd))
    update()
    if (targetEnd === undefined) return
    const interval = setInterval(update, 300)
    return () => clearInterval(interval)
  }, [targetEnd])

  return timeLeft
}
