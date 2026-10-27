// Portado de HichamELBSI/react-native-body-highlighter, MIT
import type { MuscleKey } from '../exerciseMedia'
import type { HighlighterSlug } from './types'

export * from './types'
export { bodyFront } from './bodyFront'
export { bodyBack } from './bodyBack'
export { bodyFrontOutline, bodyBackOutline } from './outlines'

/**
 * Slugs anatómicos que forman la estructura del cuerpo (cabeza, pelo, manos, pies, articulaciones).
 * Se muestran siempre en gris neutro y no son seleccionables como músculo trabajado.
 */
export const BODY_STRUCTURE_SLUGS = new Set<HighlighterSlug>([
  'head',
  'hair',
  'hands',
  'feet',
  'ankles',
  'knees',
  'tibialis',
])

/**
 * Colores base para mapa corporal adaptativos al tema.
 */
export const COLOR_STRUCTURE_HAIR = 'rgb(var(--n-500))'
export const COLOR_STRUCTURE = 'rgb(var(--n-600))'      // Cabeza, manos, pies, rodillas
export const COLOR_INACTIVE = 'rgb(var(--n-700))'       // Músculo sin trabajo visible
export const COLOR_PRIMARY = '#ef4444'        // Músculo primario (rojo)
export const COLOR_SECONDARY = '#f97316'      // Músculo secundario (naranja)

/**
 * Gradiente de calor de 10 niveles:
 * 1..3: Amarillo (#facc15 -> #fde047)
 * 4..7: Naranja (#f59e0b -> #ea580c)
 * 8..10: Rojo (#f87171 -> #dc2626)
 */
export const HEATMAP_GRADIENT = [
  '#facc15', // 1: Amarillo bajo
  '#fde047', // 2: Amarillo claro
  '#facc15', // 3: Amarillo
  '#eab308', // 4: Dorado
  '#f59e0b', // 5: Ámbar
  '#f97316', // 6: Naranja intermedio
  '#ea580c', // 7: Naranja intenso
  '#f87171', // 8: Rojo coral
  '#ef4444', // 9: Rojo
  '#dc2626', // 10: Rojo más ejercitado
]

/**
 * Mapeo explícito de MuscleKey a slugs por vista anatómica (FRENTE y ESPALDA).
 *
 * Mapeo:
 *   chest -> chest (Frente)
 *   biceps -> biceps (Frente)
 *   triceps -> triceps (Frente y Espalda)
 *   forearm -> forearm (Frente y Espalda)
 *   front-deltoids -> deltoids (solo FRENTE)
 *   back-deltoids -> deltoids (solo ESPALDA)
 *   upper-back -> upper-back (Espalda)
 *   lower-back -> lower-back (Espalda)
 *   trapezius -> trapezius (Frente y Espalda)
 *   neck -> neck (Frente y Espalda)
 *   quadriceps -> quadriceps (Frente)
 *   hamstring -> hamstring (Espalda)
 *   calves -> calves (Frente y Espalda)
 *   gluteal -> gluteal (Espalda)
 *   abs -> abs (Frente)
 *   obliques -> obliques (Frente)
 *   adductor -> adductors (Frente y Espalda)
 *   abductors -> gluteal (Espalda - aproximado anatómico a glúteo medio/abductores)
 *   head -> (Estructura neutral, no trabajable)
 */
export function getSlugMuscleKeys(
  slug: HighlighterSlug,
  side: 'front' | 'back'
): MuscleKey[] {
  if (BODY_STRUCTURE_SLUGS.has(slug)) {
    return []
  }

  if (side === 'front') {
    switch (slug) {
      case 'chest':
        return ['chest']
      case 'biceps':
        return ['biceps']
      case 'triceps':
        return ['triceps']
      case 'forearm':
        return ['forearm']
      case 'deltoids':
        return ['front-deltoids']
      case 'trapezius':
        return ['trapezius']
      case 'neck':
        return ['neck']
      case 'quadriceps':
        return ['quadriceps']
      case 'calves':
        return ['calves']
      case 'abs':
        return ['abs']
      case 'obliques':
        return ['obliques']
      case 'adductors':
        return ['adductor']
      default:
        return []
    }
  } else {
    // side === 'back'
    switch (slug) {
      case 'deltoids':
        return ['back-deltoids']
      case 'upper-back':
        return ['upper-back']
      case 'lower-back':
        return ['lower-back']
      case 'triceps':
        return ['triceps']
      case 'forearm':
        return ['forearm']
      case 'trapezius':
        return ['trapezius']
      case 'neck':
        return ['neck']
      case 'gluteal':
        // gluteal y abductors mapean aquí (abductors es aproximado en espalda)
        return ['gluteal', 'abductors']
      case 'hamstring':
        return ['hamstring']
      case 'calves':
        return ['calves']
      case 'adductors':
        return ['adductor']
      default:
        return []
    }
  }
}

/**
 * Resuelve el color de calor para una intensidad dada relativa a maxVal.
 * Normalizado:
 * - maxVal recibe #dc2626 (Rojo más ejercitado).
 * - Valores intermedios reciben gradiente naranja -> ámbar -> amarillo.
 * - Valores <= 0 reciben COLOR_INACTIVE.
 */
export function resolveHeatmapColor(val: number, maxVal: number): string {
  if (val <= 0 || maxVal <= 0) return COLOR_INACTIVE
  const ratio = Math.min(1, Math.max(0, val / maxVal))
  const index = Math.min(9, Math.max(0, Math.round(ratio * 9)))
  return HEATMAP_GRADIENT[index] ?? '#dc2626'
}

export interface ResolvePartColorOptions {
  slug: HighlighterSlug
  side: 'front' | 'back'
  intensities?: Partial<Record<MuscleKey, number>>
  primary?: MuscleKey[]
  secondary?: MuscleKey[]
  maxIntensity?: number
}

/**
 * Resuelve el color final de relleno para un BodyPart según las props del mapa.
 */
export function resolveBodyPartColor({
  slug,
  side,
  intensities,
  primary = [],
  secondary = [],
  maxIntensity = 0,
}: ResolvePartColorOptions): string {
  // 1. Estructura corporal anatómica siempre en tono neutro
  if (BODY_STRUCTURE_SLUGS.has(slug)) {
    return slug === 'hair' ? COLOR_STRUCTURE_HAIR : COLOR_STRUCTURE
  }

  // 2. Modo Heatmap por Intensidades/Series (estadísticas por período)
  if (intensities && maxIntensity > 0) {
    const keys = getSlugMuscleKeys(slug, side)
    let maxVal = 0
    for (const key of keys) {
      const v = intensities[key]
      if (typeof v === 'number' && v > maxVal) {
        maxVal = v
      }
    }
    if (maxVal > 0) {
      return resolveHeatmapColor(maxVal, maxIntensity)
    }
    return COLOR_INACTIVE
  }

  // 3. Modo Selección Primario / Secundario (detalle de ejercicio)
  if (primary.length > 0 || secondary.length > 0) {
    const keys = getSlugMuscleKeys(slug, side)
    const isPrimary = keys.some((k) => primary.includes(k))
    if (isPrimary) {
      return COLOR_PRIMARY
    }
    const isSecondary = keys.some((k) => secondary.includes(k))
    if (isSecondary) {
      return COLOR_SECONDARY
    }
    return COLOR_INACTIVE
  }

  // 4. Sin trabajo asignado
  return COLOR_INACTIVE
}
