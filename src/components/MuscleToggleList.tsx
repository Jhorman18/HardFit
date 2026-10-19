import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { exerciseMedia, type MuscleKey } from '../data/exerciseMedia'
import { getMuscleNameEs } from '../utils/effectiveMuscles'

export interface MuscleToggleListProps {
  exerciseId: string
  className?: string
}

interface MuscleItem {
  key: MuscleKey
  label: string
  isPrimary: boolean
}

export function MuscleToggleList({ exerciseId, className = '' }: MuscleToggleListProps) {
  const baseMedia = exerciseMedia[exerciseId]
  const override = useLiveQuery(() => db.muscleOverrides.get(exerciseId), [exerciseId])

  if (!baseMedia || (baseMedia.primary.length === 0 && baseMedia.secondary.length === 0)) {
    return (
      <div
        className={`bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 text-xs text-neutral-400 text-center ${className}`}
      >
        Este ejercicio no tiene músculos asociados en el catálogo.
      </div>
    )
  }

  // Combinar primarios y secundarios preservando la etiqueta en español original
  const items: MuscleItem[] = []
  const seen = new Set<MuscleKey>()

  baseMedia.primary.forEach((key, index) => {
    if (!seen.has(key)) {
      seen.add(key)
      items.push({
        key,
        label: baseMedia.primaryEs[index] || getMuscleNameEs(key),
        isPrimary: true,
      })
    }
  })

  baseMedia.secondary.forEach((key, index) => {
    if (!seen.has(key)) {
      seen.add(key)
      items.push({
        key,
        label: baseMedia.secondaryEs[index] || getMuscleNameEs(key),
        isPrimary: false,
      })
    }
  })

  const disabledSet = new Set(override?.disabled || [])

  const handleToggle = async (key: MuscleKey) => {
    const currentDisabled = new Set(override?.disabled || [])
    if (currentDisabled.has(key)) {
      currentDisabled.delete(key)
    } else {
      currentDisabled.add(key)
    }

    const newDisabled = Array.from(currentDisabled)
    if (newDisabled.length === 0) {
      await db.muscleOverrides.delete(exerciseId)
    } else {
      await db.muscleOverrides.put({
        exerciseId,
        disabled: newDisabled,
      })
    }
  }

  return (
    <div
      className={`bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3 ${className}`}
    >
      <div className="border-b border-neutral-800/80 pb-2">
        <h4 className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider">
          Músculos trabajados
        </h4>
        <p className="text-xs text-neutral-400 mt-0.5">
          Ajusta qué músculos trabajas realmente en este ejercicio.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item) => {
          const isActive = !disabledSet.has(item.key)

          return (
            <label
              key={item.key}
              className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                isActive
                  ? 'bg-neutral-900/90 border-neutral-700/80 text-white hover:border-neutral-500'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-500 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => handleToggle(item.key)}
                  className="rounded border-neutral-700 bg-neutral-800 text-white focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4 accent-white"
                />
                <span
                  className={`font-medium truncate ${
                    isActive ? 'text-white' : 'text-neutral-500 line-through'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 text-[10px]">
                {item.isPrimary ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-900/40 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                    Primario
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400/90 border border-amber-900/40 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                    Secundario
                  </span>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
