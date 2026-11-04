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
      <div className={`p-4 text-xs text-neutral-400 text-center ${className}`}>
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
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between pt-1">
        <div>
          <h4 className="text-sm font-semibold text-white">Músculos</h4>
          <p className="text-xs text-neutral-400 mt-0.5">
            Desactiva los músculos que no quieras contar en estadísticas.
          </p>
        </div>
      </div>

      <ul className="border-t border-line divide-y divide-line">
        {items.map((item) => {
          const isActive = !disabledSet.has(item.key)

          return (
            <li
              key={item.key}
              className="flex items-center gap-3 py-2 min-h-12"
            >
              <div className="flex-1 min-w-0">
                <span
                  className={`text-[15px] font-medium block truncate ${
                    isActive ? 'text-white' : 'text-neutral-400 line-through'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              <span className="shrink-0 label-tech px-2 py-0.5 rounded-sm border border-line-strong text-neutral-300">
                {item.isPrimary ? 'Principal' : 'Secundario'}
              </span>

              {/* Interruptor con área pulsable mínima de 48 × 48 px */}
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                aria-label={`Contar ${item.label}`}
                onClick={() => handleToggle(item.key)}
                className="press min-w-12 min-h-12 flex items-center justify-center shrink-0"
              >
                <span
                  className={`relative inline-flex items-center h-6 w-11 rounded-full border transition-colors ${
                    isActive
                      ? 'bg-accent border-accent'
                      : 'bg-surface-elevated border-line-strong'
                  }`}
                >
                  <span
                    className={`inline-block w-4 h-4 rounded-full transition-transform ${
                      isActive
                        ? 'translate-x-6 bg-on-accent'
                        : 'translate-x-1 bg-neutral-400'
                    }`}
                  />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
