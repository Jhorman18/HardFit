/** Cifras con coma decimal y punto de miles, también en números de cuatro dígitos. */
export function formatNumber(value: number, minDecimals = 0, maxDecimals = minDecimals): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: Math.max(minDecimals, maxDecimals),
    useGrouping: 'always',
  }).format(value)
}

/** Peso de una serie: siempre un decimal, 80,0. */
export function formatWeight(value: number): string {
  return formatNumber(value, 1, 2)
}

/** Acepta coma o punto: la entrada numérica del móvil depende de su idioma. */
export function parseDecimal(text: string): number | undefined {
  const value = Number.parseFloat(text.trim().replace(',', '.'))
  return Number.isFinite(value) ? value : undefined
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
