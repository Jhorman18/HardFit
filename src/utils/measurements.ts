import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { LucideIcon } from 'lucide-react'
import { Scale, Percent, Ruler, Dumbbell, BicepsFlexed } from 'lucide-react'
import type { Measurement } from '../types'

export interface MeasurementConfig {
  type: string
  label: string
  defaultUnit: string
  icon: LucideIcon
  step: string
  min: number
  max: number
  placeholder: string
}

export const MEASUREMENT_CONFIGS: Record<string, MeasurementConfig> = {
  bodyweight: {
    type: 'bodyweight',
    label: 'Peso corporal',
    defaultUnit: 'kg',
    icon: Scale,
    step: '0.1',
    min: 20,
    max: 500,
    placeholder: 'ej. 75.5',
  },
  bodyfat: {
    type: 'bodyfat',
    label: '% Grasa corporal',
    defaultUnit: '%',
    icon: Percent,
    step: '0.1',
    min: 2,
    max: 70,
    placeholder: 'ej. 15.0',
  },
  chest: {
    type: 'chest',
    label: 'Pecho',
    defaultUnit: 'cm',
    icon: Ruler,
    step: '0.5',
    min: 30,
    max: 250,
    placeholder: 'ej. 102.0',
  },
  waist: {
    type: 'waist',
    label: 'Cintura',
    defaultUnit: 'cm',
    icon: Ruler,
    step: '0.5',
    min: 30,
    max: 200,
    placeholder: 'ej. 82.0',
  },
  hip: {
    type: 'hip',
    label: 'Cadera',
    defaultUnit: 'cm',
    icon: Ruler,
    step: '0.5',
    min: 30,
    max: 200,
    placeholder: 'ej. 98.0',
  },
  arm: {
    type: 'arm',
    label: 'Brazo',
    defaultUnit: 'cm',
    icon: BicepsFlexed,
    step: '0.5',
    min: 15,
    max: 100,
    placeholder: 'ej. 38.5',
  },
  thigh: {
    type: 'thigh',
    label: 'Muslo',
    defaultUnit: 'cm',
    icon: Ruler,
    step: '0.5',
    min: 20,
    max: 150,
    placeholder: 'ej. 58.0',
  },
  calf: {
    type: 'calf',
    label: 'Pantorrilla',
    defaultUnit: 'cm',
    icon: Ruler,
    step: '0.5',
    min: 15,
    max: 100,
    placeholder: 'ej. 37.0',
  },
  shoulders: {
    type: 'shoulders',
    label: 'Hombros',
    defaultUnit: 'cm',
    icon: Dumbbell,
    step: '0.5',
    min: 30,
    max: 250,
    placeholder: 'ej. 118.0',
  },
  neck: {
    type: 'neck',
    label: 'Cuello',
    defaultUnit: 'cm',
    icon: Ruler,
    step: '0.5',
    min: 15,
    max: 100,
    placeholder: 'ej. 39.0',
  },
}

export const MEASUREMENT_TYPE_KEYS = [
  'bodyweight',
  'bodyfat',
  'chest',
  'waist',
  'hip',
  'arm',
  'thigh',
  'calf',
  'shoulders',
  'neck',
] as const

/**
 * Obtiene la configuración y metadatos de un tipo de medida,
 * adaptando la unidad predeterminada según settings si es peso corporal.
 */
export function getMeasurementConfig(type: string, weightUnit: string = 'kg'): MeasurementConfig {
  const base = MEASUREMENT_CONFIGS[type]
  if (base) {
    if (type === 'bodyweight') {
      return { ...base, defaultUnit: weightUnit }
    }
    return base
  }
  return {
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    defaultUnit: 'cm',
    icon: Ruler,
    step: '0.1',
    min: 0,
    max: 1000,
    placeholder: '0.0',
  }
}

/**
 * Obtiene la unidad predeterminada para un tipo de medida.
 */
export function getDefaultUnitForType(type: string, weightUnit: string = 'kg'): string {
  if (type === 'bodyweight') return weightUnit
  if (type === 'bodyfat') return '%'
  return 'cm'
}

export interface MeasurementSummaryItem {
  type: string
  label: string
  icon: LucideIcon
  latestValue: number
  latestDate: number
  latestUnit: string
  previousValue: number | null
  delta: number | null
  count: number
  isBodyweight: boolean
}

/**
 * Genera el resumen más reciente por cada tipo que contenga registros,
 * calculando el delta respecto al registro anterior.
 * "Peso corporal" se sitúa de forma prioritaria en primer lugar.
 */
export function getMeasurementsSummary(
  measurements: Measurement[],
  weightUnit: string = 'kg'
): MeasurementSummaryItem[] {
  if (!measurements || measurements.length === 0) return []

  const byType = new Map<string, Measurement[]>()
  for (const m of measurements) {
    const list = byType.get(m.type) || []
    list.push(m)
    byType.set(m.type, list)
  }

  const summaries: MeasurementSummaryItem[] = []

  for (const [type, list] of byType.entries()) {
    // Ordenar de más reciente a más antiguo
    const sorted = [...list].sort((a, b) => b.date - a.date)
    const latest = sorted[0]
    const previous = sorted.length > 1 ? sorted[1] : null
    const delta =
      previous != null ? Math.round((latest.value - previous.value) * 10) / 10 : null
    const config = getMeasurementConfig(type, weightUnit)

    summaries.push({
      type,
      label: config.label,
      icon: config.icon,
      latestValue: latest.value,
      latestDate: latest.date,
      latestUnit: latest.unit,
      previousValue: previous ? previous.value : null,
      delta,
      count: sorted.length,
      isBodyweight: type === 'bodyweight',
    })
  }

  // Ordenar: 'bodyweight' siempre primero, luego por el orden estándar en MEASUREMENT_TYPE_KEYS
  return summaries.sort((a, b) => {
    if (a.isBodyweight) return -1
    if (b.isBodyweight) return 1
    const idxA = MEASUREMENT_TYPE_KEYS.indexOf(a.type as any)
    const idxB = MEASUREMENT_TYPE_KEYS.indexOf(b.type as any)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return b.latestDate - a.latestDate
  })
}

export interface MeasurementPoint {
  id: string
  date: number
  formattedDate: string
  fullDate: string
  value: number
  unit: string
}

/**
 * Genera la serie temporal ordenada cronológicamente (más antiguo a más reciente)
 * para representar en la gráfica de evolución de Recharts.
 */
export function getTimeSeriesData(
  measurements: Measurement[],
  type: string
): MeasurementPoint[] {
  if (!measurements || measurements.length === 0) return []

  return measurements
    .filter((m) => m.type === type)
    .sort((a, b) => a.date - b.date)
    .map((m) => {
      const d = new Date(m.date)
      return {
        id: m.id,
        date: m.date,
        formattedDate: format(d, 'd MMM', { locale: es }),
        fullDate: format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
        value: m.value,
        unit: m.unit,
      }
    })
}

/**
 * Formatea el cambio delta con signo, icono y clases de color Tailwind.
 */
export function formatDelta(
  delta: number | null,
  unit: string
): { text: string; colorClass: string; bgClass: string; icon: string } {
  if (delta === null) {
    return {
      text: 'Primer registro',
      colorClass: 'text-neutral-400',
      bgClass: 'bg-neutral-900 border-neutral-800',
      icon: '—',
    }
  }

  if (delta > 0) {
    return {
      text: `+${delta} ${unit}`,
      colorClass: 'text-white',
      bgClass: 'bg-neutral-800 border-neutral-700',
      icon: '↑',
    }
  }

  if (delta < 0) {
    return {
      text: `${delta} ${unit}`,
      colorClass: 'text-neutral-400',
      bgClass: 'bg-neutral-900 border-neutral-800',
      icon: '↓',
    }
  }

  return {
    text: `0.0 ${unit}`,
    colorClass: 'text-neutral-400',
    bgClass: 'bg-neutral-900 border-neutral-800',
    icon: '—',
  }
}
