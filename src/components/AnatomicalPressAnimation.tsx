import { useId } from 'react'
import { getAnatomicalPressLayout } from '../data/pressFocus'

export interface AnatomicalPressAnimationProps {
  src: string
  alt: string
  onError: () => void
}

/** Recorta una sola posición del original y respeta su proporción al reproducirla. */
export function AnatomicalPressAnimation({ src, alt, onError }: AnatomicalPressAnimationProps) {
  const clipId = useId()
  const layout = getAnatomicalPressLayout(src)
  if (!layout) return null
  const { columns, rows, frameAspectRatio } = layout
  const poseCount = columns * rows

  return (
    <svg role="img" aria-label={alt} viewBox={`0 0 ${frameAspectRatio} 1`}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full h-full overflow-hidden bg-white ${poseCount === 2 ? 'press-anatomy-two-poses' : ''}`}>
      <defs>
        <clipPath id={clipId}>
          <rect width={frameAspectRatio} height={1} />
        </clipPath>
        {layout.frames?.map((frame, pose) => (
          <clipPath key={pose} id={`${clipId}-${pose}`}>
            <polygon points={frame.clipPoints} />
          </clipPath>
        ))}
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {Array.from({ length: poseCount }, (_, pose) => (
          <g key={pose} aria-hidden="true" className={`press-anatomy-pose press-anatomy-pose-${pose}`}
            clipPath={layout.frames?.[pose] ? `url(#${clipId}-${pose})` : undefined}>
            <image href={src} onError={onError}
              width={frameAspectRatio * columns} height={rows}
              x={-(layout.frames?.[pose]?.x ?? (pose % columns) * frameAspectRatio)} y={-Math.floor(pose / columns)} />
          </g>
        ))}
      </g>
    </svg>
  )
}
