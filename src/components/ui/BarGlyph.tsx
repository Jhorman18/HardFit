import type { PlateKg, PlateLoad } from '../../utils/plates'

// Altura y grosor por disco; el color es el código de competición y no cambia con el tema.
const PLATE_STYLE: Record<PlateKg, { height: number; width: number; color: string; outline?: boolean }> = {
  25: { height: 40, width: 8, color: '#E5483C' },
  20: { height: 40, width: 7, color: '#4C80EA' },
  15: { height: 34, width: 7, color: '#F2BF1D' },
  10: { height: 28, width: 6, color: '#3DB06E' },
  5: { height: 22, width: 5, color: '#EFEBE1', outline: true },
  2.5: { height: 16, width: 4, color: '#E5483C' },
  1.25: { height: 12, width: 4, color: '#4C80EA' },
  0.5: { height: 10, width: 3, color: '#3DB06E' },
}

interface BarGlyphProps {
  load: PlateLoad
  /** Largo de la barra visible en px. */
  barWidth?: number
  className?: string
}

/** Medio glifo de barra: un lado cargado, leído de dentro hacia fuera. Dato, no adorno. */
export function BarGlyph({ load, barWidth = 72, className = '' }: BarGlyphProps) {
  return (
    <span className={`inline-flex items-center gap-px h-10 ${className}`} aria-hidden="true">
      <span className="h-1.5 rounded-sm bg-neutral-400" style={{ width: barWidth }} />
      {load.plates.map((plate, index) => {
        const style = PLATE_STYLE[plate]
        return (
          <span
            key={`${plate}-${index}`}
            className={`rounded-sm shrink-0 ${style.outline ? 'ring-1 ring-inset ring-neutral-500' : ''}`}
            style={{ width: style.width, height: style.height, backgroundColor: style.color }}
          />
        )
      })}
    </span>
  )
}
