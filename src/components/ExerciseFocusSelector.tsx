import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getPressFocusDemo } from '../data/pressFocus'
import { db } from '../db/db'
import {
  getExerciseFocusDefinition,
  getSelectedExerciseFocus,
  type ExerciseFocusId,
} from '../data/exerciseFocus'

export interface ExerciseFocusSelectorProps {
  exerciseId: string
  className?: string
}

export function ExerciseFocusSelector({
  exerciseId,
  className = '',
}: ExerciseFocusSelectorProps) {
  const groupId = useId()
  const override = useLiveQuery(async () => (await db.muscleOverrides.get(exerciseId)) ?? null, [exerciseId])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const definition = getExerciseFocusDefinition(exerciseId)

  if (!definition || override === undefined) return null

  const selected = getSelectedExerciseFocus(exerciseId, override?.focus)
  const demo = getPressFocusDemo(exerciseId, selected?.id)

  const handleSelect = async (focus: ExerciseFocusId) => {
    setIsSaving(true)
    setError(null)
    try {
      await db.muscleOverrides.put({ ...override, exerciseId, focus, disabled: override?.disabled ?? [] })
    } catch (err) {
      console.error('Error al guardar el enfoque del ejercicio:', err)
      setError('No se pudo guardar el enfoque. Inténtalo de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <fieldset
      disabled={isSaving}
      className={`space-y-3 ${className}`}
      aria-describedby={`${groupId}-description`}
    >
      <legend className="label-tech text-neutral-300">
        Enfoque de la variante
      </legend>
      <p id={`${groupId}-description`} className="text-xs text-neutral-400">
        Selecciona la zona o grupo muscular con mayor énfasis en la ejecución.
      </p>

      <div className="grid grid-cols-1 gap-2">
        {definition.options.map((option) => {
          const isSelected = selected?.id === option.id
          return (
            <label
              key={option.id}
              className={`press min-h-12 flex items-center gap-3 px-3.5 py-2.5 rounded-md border text-sm cursor-pointer select-none ${
                isSelected
                  ? 'bg-surface-elevated border-accent text-white font-semibold'
                  : 'bg-surface border-line text-neutral-300 hover:border-line-strong'
              } ${isSaving ? 'opacity-60 cursor-wait' : ''}`}
            >
              <input
                type="radio"
                name={`${groupId}-focus`}
                value={option.id}
                checked={isSelected}
                onChange={() => handleSelect(option.id)}
                className="w-5 h-5 shrink-0"
              />
              <span className="leading-snug">{option.label}</span>
            </label>
          )
        })}
      </div>

      {demo && <p className="text-xs text-neutral-400 leading-relaxed pt-1">{demo.placement}</p>}
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </fieldset>
  )
}
