import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { exerciseMedia } from '../data/exerciseMedia'

export interface ExerciseDemoProps {
  exerciseId?: string
  variant?: 'thumb' | 'full'
  alt?: string
  className?: string
}

export function ExerciseDemo({
  exerciseId,
  variant = 'thumb',
  alt = 'Demostración del ejercicio',
  className = '',
}: ExerciseDemoProps) {
  const gifUrl = exerciseId ? exerciseMedia[exerciseId]?.gifUrl : undefined
  const [errorId, setErrorId] = useState<string | null>(null)
  const hasError = errorId === (exerciseId ?? '')

  const sizeClasses =
    variant === 'thumb'
      ? 'w-12 h-12 rounded-xl shrink-0'
      : 'w-full aspect-square max-h-72 rounded-2xl'

  if (!gifUrl || hasError) {
    return (
      <div
        className={`bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-400 overflow-hidden ${sizeClasses} ${className}`}
        aria-hidden="true"
      >
        <Dumbbell size={variant === 'thumb' ? 22 : 48} className="text-neutral-400" />
      </div>
    )
  }

  return (
    <div
      className={`relative bg-[#f5f5f5] border border-neutral-800/20 overflow-hidden flex items-center justify-center ${sizeClasses} ${className}`}
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
