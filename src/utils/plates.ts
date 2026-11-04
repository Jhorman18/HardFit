export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5] as const
export const DEFAULT_BAR_KG = 20

export type PlateKg = (typeof PLATES_KG)[number]

export interface PlateLoad {
  totalKg: number
  barKg: number
  /** Discos de un lado, de mayor a menor. */
  plates: PlateKg[]
  perSideKg: number
  /** Kilos que no se pueden formar con los discos disponibles. */
  missingKg: number
  belowBar: boolean
}

/** Reparto voraz por lado. Trabaja en centésimas para no arrastrar errores de coma flotante. */
export function platesFor(totalKg: number, barKg: number = DEFAULT_BAR_KG): PlateLoad {
  const load: PlateLoad = {
    totalKg,
    barKg,
    plates: [],
    perSideKg: 0,
    missingKg: 0,
    belowBar: totalKg < barKg,
  }
  if (load.belowBar) return load

  let left = Math.round(((totalKg - barKg) / 2) * 100)
  load.perSideKg = left / 100
  for (const plate of PLATES_KG) {
    const cents = Math.round(plate * 100)
    while (left >= cents) {
      load.plates.push(plate)
      left -= cents
    }
  }
  load.missingKg = (left / 100) * 2
  return load
}

export function plateSummary(load: PlateLoad): string {
  if (load.belowBar) return 'Menos que la barra'
  if (load.plates.length === 0) return 'Solo la barra'
  return `${load.plates.map((p) => String(p).replace('.', ',')).join(' + ')} por lado`
}
