import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { exerciseMedia } from '../data/exerciseMedia'

export interface ExerciseDemoProps {
  exerciseId?: string
  variant?: 'thumb' | 'full'
  alt?: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export function ExerciseDemo({
  exerciseId,
  variant = 'thumb',
  alt = 'Demostración del ejercicio',
  className = '',
  onClick,
}: ExerciseDemoProps) {
  const gifUrl = exerciseId ? exerciseMedia[exerciseId]?.gifUrl : undefined
  const [errorId, setErrorId] = useState<string | null>(null)
  const hasError = errorId === (exerciseId ?? '')

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:opacity-90 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-white/40'
    : ''

  const sizeClasses =
    variant === 'thumb'
      ? 'w-12 h-12 rounded-xl shrink-0'
      : 'w-full aspect-square max-h-72 rounded-2xl'

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation()
      onClick(e)
    }
  }

  if (!gifUrl || hasError) {
    return (
      <div
        onClick={handleClick}
        className={`bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-400 overflow-hidden ${sizeClasses} ${interactiveClasses} ${className}`}
        aria-hidden="true"
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <Dumbbell size={variant === 'thumb' ? 22 : 48} className="text-neutral-400" />
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`relative bg-[#f5f5f5] border border-neutral-800/20 overflow-hidden flex items-center justify-center ${sizeClasses} ${interactiveClasses} ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img
        src={gifUrl}
        alt={alt}
        loading="lazy"
        onError={() => setErrorId(exerciseId ?? '')}
        className="w-full h-full object-contain select-none p-1"
      />
    </div>
  )
}
