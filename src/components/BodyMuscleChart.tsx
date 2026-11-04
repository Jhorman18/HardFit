import { useState } from 'react'
import type { MuscleKey } from '../data/exerciseMedia'
import {
  bodyFront,
  bodyBack,
  bodyFrontOutline,
  bodyBackOutline,
  BODY_STRUCTURE_SLUGS,
  getSlugMuscleKeys,
  type BodyPart,
} from '../data/bodyHighlighter'
import { getMuscleNameEs } from '../utils/effectiveMuscles'

export interface BodyMuscleChartProps {
  /**
   * Mapeo de intensidades/series por músculo (para mapa corporal y heatmap de volumen).
   */
  intensities?: Partial<Record<MuscleKey, number>>
  /**
   * Músculos primarios del ejercicio (en escala neutra clara).
   */
  primary?: MuscleKey[]
  /**
   * Músculos secundarios del ejercicio (en escala neutra media).
   */
  secondary?: MuscleKey[]
  /**
   * Tamaño del contenedor visual.
   */
  size?: 'sm' | 'md' | 'lg' | 'default'
  /**
   * Habilita interactividad / tooltips.
   */
  interactive?: boolean
  /**
   * Si debe mostrar las etiquetas "FRENTE" y "ESPALDA" sobre las dos figuras.
   */
  showLabels?: boolean
  /**
   * Callback opcional invocado al hacer clic en un músculo.
   */
  onMuscleClick?: (slug: string) => void
  /**
   * Si debe mostrar el rótulo con el nombre en español del músculo seleccionado.
   */
  showMuscleLabel?: boolean
  /**
   * Clases CSS opcionales para el contenedor raíz.
   */
  className?: string
  /**
   * Usa tramas SVG por niveles (0: vacío, 1: punteado, 2: rayado, 3: rejilla, 4: sólido).
   */
  usePatterns?: boolean
}

function getPartPaths(part: BodyPart): string[] {
  const result: string[] = []
  if (part.path.common && Array.isArray(part.path.common)) {
    result.push(...part.path.common)
  }
  if (part.path.left && Array.isArray(part.path.left)) {
    result.push(...part.path.left)
  }
  if (part.path.right && Array.isArray(part.path.right)) {
    result.push(...part.path.right)
  }
  if (result.length === 0 && part.path) {
    for (const val of Object.values(part.path)) {
      if (Array.isArray(val)) {
        result.push(...(val as string[]))
      }
    }
  }
  return result
}

/**
 * Resuelve el relleno según niveles de trama o escala neutra.
 * Nivel 0: 0 series -> Cuerpo sin trabajar (rgb(var(--n-700))), distinto del panel en todos los temas
 * Nivel 1: 1–5 series -> Punteado (url(#heat-pat-1))
 * Nivel 2: 6–10 series -> Rayado (url(#heat-pat-2))
 * Nivel 3: 11–18 series -> Rejilla (url(#heat-pat-3))
 * Nivel 4: 19+ series -> Sólido neutro de alta luminancia (rgb(var(--n-100)))
 */
function resolveMuscleFill(
  seriesCount: number,
  isPrimary: boolean,
  isSecondary: boolean,
  isStructure: boolean,
  usePatterns: boolean
): string {
  if (isStructure) {
    return 'rgb(var(--n-750))'
  }

  if (isPrimary) {
    return 'rgb(var(--n-100))'
  }
  if (isSecondary) {
    return 'rgb(var(--n-400))'
  }

  if (!seriesCount || seriesCount <= 0) {
    return 'rgb(var(--n-700))'
  }

  if (!usePatterns) {
    if (seriesCount >= 19) return 'rgb(var(--n-100))'
    if (seriesCount >= 11) return 'rgb(var(--n-300))'
    if (seriesCount >= 6) return 'rgb(var(--n-500))'
    return 'rgb(var(--n-600))'
  }

  if (seriesCount >= 19) return 'rgb(var(--n-100))'
  if (seriesCount >= 11) return 'url(#heat-pat-3)'
  if (seriesCount >= 6) return 'url(#heat-pat-2)'
  return 'url(#heat-pat-1)'
}

export function BodyMuscleChart({
  intensities,
  primary = [],
  secondary = [],
  size = 'lg',
  interactive = false,
  showLabels = true,
  onMuscleClick,
  showMuscleLabel = true,
  className = '',
  usePatterns = true,
}: BodyMuscleChartProps) {
  const [clickedSlug, setClickedSlug] = useState<string | null>(null)

  const handleMuscleClick = (slug: string) => {
    setClickedSlug(slug)
    onMuscleClick?.(slug)
  }

  const dimensionsClass =
    size === 'sm'
      ? 'max-w-[200px] h-[190px]'
      : size === 'md'
        ? 'max-w-[250px] h-[230px]'
        : 'max-w-[360px] h-[400px]'

  // Función para obtener las series máximas del slug
  const getSlugSeries = (slug: string, side: 'front' | 'back') => {
    if (!intensities) return 0
    const keys = getSlugMuscleKeys(slug as any, side)
    let max = 0
    for (const k of keys) {
      const v = intensities[k]
      if (typeof v === 'number' && v > max) {
        max = v
      }
    }
    return max
  }

  return (
    <div className={`flex flex-col items-center justify-center select-none w-full ${className}`}>
      {/* Definición de patrones SVG de trama para el mapa de calor anatómico */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          {/* Nivel 1: Punteado (1–5 series) */}
          <pattern id="heat-pat-1" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="rgb(var(--n-700))" />
            <circle cx="15" cy="15" r="7" fill="rgb(var(--n-100))" />
          </pattern>
          {/* Nivel 2: Rayado diagonal (6–10 series) */}
          <pattern id="heat-pat-2" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="26" height="26" fill="rgb(var(--n-600))" />
            <rect width="11" height="26" fill="rgb(var(--n-100))" />
          </pattern>
          {/* Nivel 3: Rejilla cuadrícula (11–18 series) */}
          <pattern id="heat-pat-3" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="26" height="26" fill="rgb(var(--n-200))" />
            <rect width="7" height="26" fill="rgb(var(--n-700))" />
            <rect width="26" height="7" fill="rgb(var(--n-700))" />
          </pattern>
        </defs>
      </svg>

      {showLabels && (
        <div className="w-full max-w-[280px] grid grid-cols-2 text-center mb-1.5 pointer-events-none">
          <span className="label-tech text-neutral-400">
            Frente
          </span>
          <span className="label-tech text-neutral-400">
            Espalda
          </span>
        </div>
      )}

      <div className={`w-full ${dimensionsClass} grid grid-cols-2 gap-3 items-center justify-center`}>
        {/* Vista Frontal */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 724 1448"
            className="w-full h-full max-h-full object-contain"
            aria-label="Cuerpo anatómico - Vista frontal"
            role="img"
          >
            {/* Contorno exterior */}
            <path
              d={bodyFrontOutline}
              fill="none"
              stroke="rgb(var(--n-500))"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Músculos */}
            {bodyFront.map((part) => {
              const isStructure = BODY_STRUCTURE_SLUGS.has(part.slug)
              const series = getSlugSeries(part.slug, 'front')
              const keys = getSlugMuscleKeys(part.slug, 'front')
              const isPrim = keys.some((k) => primary.includes(k))
              const isSec = keys.some((k) => secondary.includes(k))
              const fill = resolveMuscleFill(series, isPrim, isSec, isStructure, usePatterns)
              const paths = getPartPaths(part)

              return (
                <g key={`front-${part.slug}`} id={`front-${part.slug}`}>
                  {interactive && <title>{part.slug}</title>}
                  {paths.map((d, i) => (
                    <path
                      key={`f-${part.slug}-${i}`}
                      d={d}
                      fill={fill}
                      stroke="rgb(var(--surface))"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer"
                      onClick={() => handleMuscleClick(part.slug)}
                    />
                  ))}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Vista Dorsal (Espalda) */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <svg
            viewBox="724 0 724 1448"
            className="w-full h-full max-h-full object-contain"
            aria-label="Cuerpo anatómico - Vista posterior"
            role="img"
          >
            {/* Contorno exterior */}
            <path
              d={bodyBackOutline}
              fill="none"
              stroke="rgb(var(--n-500))"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Músculos */}
            {bodyBack.map((part) => {
              const isStructure = BODY_STRUCTURE_SLUGS.has(part.slug)
              const series = getSlugSeries(part.slug, 'back')
              const keys = getSlugMuscleKeys(part.slug, 'back')
              const isPrim = keys.some((k) => primary.includes(k))
              const isSec = keys.some((k) => secondary.includes(k))
              const fill = resolveMuscleFill(series, isPrim, isSec, isStructure, usePatterns)
              const paths = getPartPaths(part)

              return (
                <g key={`back-${part.slug}`} id={`back-${part.slug}`}>
                  {interactive && <title>{part.slug}</title>}
                  {paths.map((d, i) => (
                    <path
                      key={`b-${part.slug}-${i}`}
                      d={d}
                      fill={fill}
                      stroke="rgb(var(--surface))"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer"
                      onClick={() => handleMuscleClick(part.slug)}
                    />
                  ))}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {showMuscleLabel && clickedSlug && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-surface border border-line text-neutral-200">
            <span className="text-neutral-400 font-normal">Músculo:</span>
            {getMuscleNameEs(clickedSlug)}
          </span>
        </div>
      )}
    </div>
  )
}

export default BodyMuscleChart
