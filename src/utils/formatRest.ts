export function formatRest(seconds?: number): string {
  if (seconds === undefined || seconds === null) return 'Sin descanso'
  if (seconds <= 0) return 'Sin descanso'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
