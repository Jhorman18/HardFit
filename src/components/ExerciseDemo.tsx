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
  const hasError = failedUrl === gifUrl
  const isAtlas = isAnatomicalPressAtlas(gifUrl)
  const isLocalCalf = gifUrl?.startsWith('/animations/leg-press-anatomical/') && gifUrl.endsWith('.gif')

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:opacity-90 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-white/40'
    : ''
  const sizeClasses = variant === 'thumb'
    ? 'w-12 h-12 rounded-xl shrink-0'
    : isAtlas ? 'w-full max-w-80 aspect-square rounded-2xl' : 'w-full aspect-square max-h-72 rounded-2xl'
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation()
      onClick(e)
    }
  }

  if (!gifUrl || hasError) {
    return (
      <div onClick={handleClick}
        className={`bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-400 overflow-hidden ${sizeClasses} ${interactiveClasses} ${className}`}
        aria-hidden="true" role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
        <Dumbbell size={variant === 'thumb' ? 22 : 48} className="text-neutral-400" />
      </div>
    )
  }
  return (
    <div onClick={handleClick}
      className={`relative bg-[#f5f5f5] border border-neutral-800/20 overflow-hidden flex items-center justify-center ${sizeClasses} ${interactiveClasses} ${className}`}
      role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {isAtlas ? (
        <AnatomicalPressAnimation key={gifUrl} src={gifUrl} alt={alt} onError={() => setFailedUrl(gifUrl)} />
      ) : (
        <picture className="contents">
          {isLocalCalf && <source media="(prefers-reduced-motion: reduce)" srcSet={gifUrl.replace('.gif', '-still.png')} />}
          <img src={gifUrl} alt={alt} loading="lazy" onError={() => setFailedUrl(gifUrl)}
            className="w-full h-full object-contain select-none p-1" />
        </picture>
      )}
    </div>
  )
}
