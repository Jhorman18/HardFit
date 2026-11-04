import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Dumbbell } from 'lucide-react'
import { exerciseMedia } from '../data/exerciseMedia'
import { AnatomicalPressAnimation } from './AnatomicalPressAnimation'
import { isAnatomicalPressAtlas, isFocusPress } from '../data/pressFocus'
import { db } from '../db/db'
import { getEffectiveMedia } from '../utils/effectiveMuscles'

export interface ExerciseDemoProps {
  exerciseId?: string
  gifUrl?: string
  variant?: 'thumb' | 'full'
  alt?: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

function PressExerciseDemo(props: ExerciseDemoProps & { exerciseId: string }) {
  const override = useLiveQuery(() => db.muscleOverrides.get(props.exerciseId), [props.exerciseId])
  return <ExerciseDemoImage {...props} gifUrl={getEffectiveMedia(props.exerciseId, override).gifUrl} />
}

export function ExerciseDemo(props: ExerciseDemoProps) {
  // Solo estas prensas necesitan consultar la preferencia en sus miniaturas.
  if (!props.gifUrl && props.exerciseId && isFocusPress(props.exerciseId)) {
    return <PressExerciseDemo {...props} exerciseId={props.exerciseId} />
  }
  return <ExerciseDemoImage {...props} />
}

function ExerciseDemoImage({
  exerciseId,
  gifUrl: preferredGifUrl,
  variant = 'thumb',
  alt = 'Demostración del ejercicio',
  className = '',
  onClick,
}: ExerciseDemoProps) {
  const gifUrl = preferredGifUrl ?? (exerciseId ? exerciseMedia[exerciseId]?.gifUrl : undefined)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const hasError = Boolean(gifUrl && failedUrl === gifUrl)
  const isAtlas = isAnatomicalPressAtlas(gifUrl)
  const isLocalCalf = Boolean(
    gifUrl?.startsWith('/animations/leg-press-anatomical/') && gifUrl.endsWith('.gif')
  )

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:opacity-90 active:scale-95 press focus:outline-none focus:ring-2 focus:ring-accent'
    : ''
  const sizeClasses =
    variant === 'thumb'
      ? 'w-10 h-10 rounded-sm shrink-0'
      : isAtlas
        ? 'w-full max-w-80 aspect-square rounded-md'
        : 'w-full aspect-square max-h-72 rounded-md'

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation()
      onClick(e)
    }
  }

  // Si no hay gif o si falló la carga (por ejemplo /animations/leg-press-anatomical/), mostramos estado neutro
  if (!gifUrl || hasError) {
    return (
      <div
        onClick={handleClick}
        className={`bg-surface-elevated border border-line flex items-center justify-center text-neutral-400 overflow-hidden ${sizeClasses} ${interactiveClasses} ${className}`}
        aria-hidden="true"
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <Dumbbell size={variant === 'thumb' ? 18 : 40} strokeWidth={1.5} className="text-neutral-400" />
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`relative bg-surface-elevated border border-line overflow-hidden flex items-center justify-center ${sizeClasses} ${interactiveClasses} ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {isAtlas ? (
        <AnatomicalPressAnimation
          key={gifUrl}
          src={gifUrl}
          alt={alt}
          onError={() => setFailedUrl(gifUrl)}
        />
      ) : (
        <picture className="contents">
          {isLocalCalf && (
            <source
              media="(prefers-reduced-motion: reduce)"
              srcSet={gifUrl.replace('.gif', '-still.png')}
            />
          )}
          <img
            src={gifUrl}
            alt={alt}
            loading="lazy"
            onError={() => setFailedUrl(gifUrl)}
            className="w-full h-full object-contain select-none p-1"
          />
        </picture>
      )}
    </div>
  )
}
