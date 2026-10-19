import { useMemo, useState } from 'react'
import type { MuscleKey } from '../data/exerciseMedia'
import {
  bodyFront,
  bodyBack,
  bodyFrontOutline,
  bodyBackOutline,
  resolveBodyPartColor,
  type BodyPart,
} from '../data/bodyHighlighter'
import { getMuscleNameEs } from '../utils/effectiveMuscles'

export interface BodyMuscleChartProps {
  /**
   * Mapeo de intensidades/series por músculo (para mapa corporal y heatmap de volumen).
   */
  intensities?: Partial<Record<MuscleKey, number>>
  /**
   * Músculos primarios del ejercicio (intensidad alta / rojo #ef4444).
   */
  primary?: MuscleKey[]
  /**
   * Músculos secundarios del ejercicio (intensidad media / naranja #f97316).
   */
  secondary?: MuscleKey[]
  /**
   * Tamaño del contenedor visual.
   */
  size?: 'sm' | 'md' | 'lg' | 'default'
  /**
   * Habilita interactividad / tooltips. Por defecto falso para fluidez en móvil.
   */
  interactive?: boolean
  /**
   * Si debe mostrar las etiquetas "FRENTE" y "ESPALDA" sobre las dos vistas anatómicas.
   */
  showLabels?: boolean
  /**
   * Callback opcional invocado al hacer clic en un músculo.
   */
  onMuscleClick?: (slug: string) => void
  /**
   * Si debe mostrar el rótulo con el nombre en español del músculo tocado debajo de la figura.
   */
  showMuscleLabel?: boolean
  /**
   * Clases CSS opcionales para el contenedor raíz.
   */
  className?: string
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
  // Soporte de respaldo por si existiese alguna otra clave con paths
  if (result.length === 0 && part.path) {
    for (const val of Object.values(part.path)) {
      if (Array.isArray(val)) {
        result.push(...(val as string[]))
      }
    }
  }
  return result
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
}: BodyMuscleChartProps) {
  const [clickedSlug, setClickedSlug] = useState<string | null>(null)

  const handleMuscleClick = (slug: string) => {
    setClickedSlug(slug)
    onMuscleClick?.(slug)
  }

  // Calcular el valor máximo de series/intensidad para normalización del heatmap
  const maxIntensity = useMemo(() => {
    if (!intensities) return 0
    let max = 0
    for (const val of Object.values(intensities)) {
      if (typeof val === 'number' && val > max) {
        max = val
      }
    }
    return max
  }, [intensities])

  const dimensionsClass =
    size === 'sm'
      ? 'max-w-[200px] h-[190px]'
      : size === 'md'
        ? 'max-w-[250px] h-[230px]'
        : 'max-w-[290px] h-[270px]'

  return (
    <div className={`flex flex-col items-center justify-center select-none w-full ${className}`}>
      {showLabels && (
        <div className="w-full max-w-[280px] grid grid-cols-2 text-center mb-1 pointer-events-none">
          <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
            Frente
          </span>
          <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
            Espalda
          </span>
        </div>
      )}

      <div
        className={`w-full ${dimensionsClass} grid grid-cols-2 gap-2 items-center justify-center`}
      >
        {/* Vista Frontal */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 724 1448"
            className="w-full h-full max-h-full object-contain"
            aria-label="Cuerpo anatómico - Vista frontal"
            role="img"
          >
            {/* Contorno exterior del cuerpo */}
            <path
              d={bodyFrontOutline}
              fill="none"
              stroke="#262626"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Músculos y estructuras anatómicas */}
            {bodyFront.map((part) => {
              const fill = resolveBodyPartColor({
                slug: part.slug,
                side: 'front',
                intensities,
                primary,
                secondary,
                maxIntensity,
              })
              const paths = getPartPaths(part)

              return (
                <g key={`front-${part.slug}`} id={`front-${part.slug}`}>
                  {interactive && <title>{part.slug}</title>}
                  {paths.map((d, i) => (
                    <path
                      key={`f-${part.slug}-${i}`}
                      d={d}
                      fill={fill}
                      stroke="#171717"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() => handleMuscleClick(part.slug)}
                    />
                  ))}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Vista Posterior (Espalda) */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <svg
            viewBox="724 0 724 1448"
            className="w-full h-full max-h-full object-contain"
            aria-label="Cuerpo anatómico - Vista dorsal"
            role="img"
          >
            {/* Contorno exterior del cuerpo */}
            <path
              d={bodyBackOutline}
              fill="none"
              stroke="#262626"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Músculos y estructuras anatómicas */}
            {bodyBack.map((part) => {
              const fill = resolveBodyPartColor({
                slug: part.slug,
                side: 'back',
                intensities,
                primary,
                secondary,
                maxIntensity,
              })
              const paths = getPartPaths(part)

              return (
                <g key={`back-${part.slug}`} id={`back-${part.slug}`}>
                  {interactive && <title>{part.slug}</title>}
                  {paths.map((d, i) => (
                    <path
                      key={`b-${part.slug}-${i}`}
                      d={d}
                      fill={fill}
                      stroke="#171717"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer transition-opacity hover:opacity-80"
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
        <div className="mt-2 text-center animate-fadeIn">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-900 border border-neutral-800 text-neutral-200 shadow-sm">
            <span className="text-neutral-400 font-normal">Músculo:</span>
            {getMuscleNameEs(clickedSlug)}
          </span>
        </div>
      )}
    </div>
  )
}

export default BodyMuscleChart
