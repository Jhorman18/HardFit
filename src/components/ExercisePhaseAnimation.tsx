import { useId } from 'react'
import type { ExercisePhaseLayout } from '../data/exercisePhases'

export interface ExercisePhaseAnimationProps {
  src: string
  alt: string
  layout: ExercisePhaseLayout
  onError: () => void
}

/** Funde dos imágenes completas sobre superficies blancas independientes. */
export function ExercisePhaseAnimation({ src, alt, layout, onError }: ExercisePhaseAnimationProps) {
  const clipId = useId()
  return (
    <div
      role="img"
      aria-label={alt}
      className="exercise-phase-animation relative w-full h-full overflow-hidden"
      style={{ backgroundColor: '#ffffff' }}
    >
      {layout.frames.map((frame, index) => (
        <div
          key={index}
          aria-hidden="true"
          data-phase={index === 0 ? 'initial' : 'contracted'}
          className={`exercise-phase-pose exercise-phase-pose-${index} absolute inset-0 w-full h-full`}
          style={{ backgroundColor: '#ffffff' }}
        >
          <svg
            viewBox={`0 0 ${layout.frameWidth} ${layout.frameHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
          >
            {(frame.clip || frame.clipPoints) && (
              <defs>
                <clipPath id={`${clipId}-${index}`}>
                  {frame.clipPoints ? <polygon points={frame.clipPoints} /> : <rect {...frame.clip} />}
                </clipPath>
              </defs>
            )}
            <rect data-phase-paper="true" width={layout.frameWidth} height={layout.frameHeight} fill="#ffffff" />
            <g clipPath={frame.clip || frame.clipPoints ? `url(#${clipId}-${index})` : undefined}>
              <image
                href={src}
                width={layout.sourceWidth}
                height={layout.sourceHeight}
                x={-frame.x}
                y={-frame.y}
                style={layout.imageFilter ? { filter: layout.imageFilter } : undefined}
                onError={onError}
              />
            </g>
          </svg>
        </div>
      ))}
    </div>
  )
}
