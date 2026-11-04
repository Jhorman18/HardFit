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
      className={`bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3 ${className}`}
      aria-describedby={`${groupId}-description`}
    >
      <legend className="px-1 text-[11px] uppercase font-bold text-neutral-300 tracking-wider">
        Enfoque del ejercicio
      </legend>
      <p id={`${groupId}-description`} className="text-xs text-neutral-400">
        Selecciona qué grupo muscular tendrá mayor protagonismo en esta variante.
      </p>

      <div className="grid grid-cols-1 gap-2">
        {definition.options.map((option) => {
          const isSelected = selected?.id === option.id
          return (
            <label
              key={option.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition ${isSelected
                ? 'bg-neutral-900 border-white text-white'
                : 'bg-neutral-900/50 border-neutral-800 text-neutral-300 hover:border-neutral-600'
              } ${isSaving ? 'opacity-60 cursor-wait' : ''}`}
            >
              <input
                type="radio"
                name={`${groupId}-focus`}
                value={option.id}
                checked={isSelected}
                onChange={() => handleSelect(option.id)}
                className="w-4 h-4 shrink-0"
              />
              <span className="font-semibold leading-snug">{option.label}</span>
            </label>
          )
        })}
      </div>

      {demo && <p className="text-xs text-neutral-400 leading-relaxed">{demo.placement}</p>}
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </fieldset>
  )
}
