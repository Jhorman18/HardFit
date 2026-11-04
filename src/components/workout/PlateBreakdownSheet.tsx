import { Sheet } from '../ui'
import { formatNumber } from '../../utils/format'
import { plateSummary, type PlateLoad } from '../../utils/plates'

const PLATE_COLORS: Record<number, { name: string; bg: string }> = {
  25: { name: 'Rojo', bg: '#E5483C' },
  20: { name: 'Azul', bg: '#4C80EA' },
  15: { name: 'Amarillo', bg: '#F2BF1D' },
  10: { name: 'Verde', bg: '#3DB06E' },
  5: { name: 'Blanco', bg: '#EFEBE1' },
  2.5: { name: 'Rojo', bg: '#E5483C' },
  1.25: { name: 'Azul', bg: '#4C80EA' },
  0.5: { name: 'Verde', bg: '#3DB06E' },
}

interface PlateBreakdownSheetProps {
  load: PlateLoad
  onClose: () => void
}

export function PlateBreakdownSheet({ load, onClose }: PlateBreakdownSheetProps) {
  const grouped = new Map<number, number>()
  for (const p of load.plates) {
    grouped.set(p, (grouped.get(p) ?? 0) + 1)
  }

  return (
    <Sheet title="Desglose de discos" onClose={onClose}>
      <div className="space-y-3 py-2">
        <div className="p-3 rounded-md bg-elevated border border-line">
          <span className="label-tech block mb-1">Por lado</span>
          <p className="text-base font-semibold text-white">{plateSummary(load)}</p>
        </div>

        <div className="flex items-baseline justify-between border-b border-line pb-2">
          <span className="label-tech">Barra</span>
          <span className="num text-lg">{formatNumber(load.barKg, 0)} kg</span>
        </div>

        {load.plates.length === 0 && !load.belowBar && (
          <p className="text-sm text-neutral-300">Solo la barra</p>
        )}

        {load.belowBar && (
          <p className="text-sm text-neutral-300">El peso es menor que la barra</p>
        )}

        {[...grouped.entries()].map(([plate, count]) => {
          const info = PLATE_COLORS[plate]
          return (
            <div key={plate} className="flex items-center gap-3 py-1">
              <span
                className="w-4 h-4 rounded-sm shrink-0"
                style={{ backgroundColor: info?.bg ?? 'rgb(var(--n-400))' }}
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-neutral-200">
                {count} × {formatNumber(plate, 0, 2)} kg
                <span className="text-neutral-400 ml-1">({info?.name})</span>
              </span>
              <span className="label-tech">por lado</span>
            </div>
          )
        })}

        {load.missingKg > 0 && (
          <div className="pt-2 border-t border-line">
            <p className="text-sm text-amber-400">
              {formatNumber(load.missingKg, 1)} kg no alcanzables con los discos disponibles
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-line flex items-baseline justify-between">
          <span className="label-tech">Total</span>
          <span className="num text-lg">{formatNumber(load.totalKg, 1)} kg</span>
        </div>
      </div>
    </Sheet>
  )
}
