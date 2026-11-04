import { getPressFocusDemo } from './pressFocus.ts'
import type { ExerciseMediaItem, MuscleKey } from './exerciseMedia'

export type ExerciseFocusId = 'quadriceps' | 'posterior-chain' | 'calves'
export const HORIZONTAL_PRESS_ID = 'calves/lever-seated-squat-calf-raise-on-leg-press-machine'
export const BILATERAL_PRESS_ID = 'glutes/sled-45-leg-press-side-pov'

export interface ExerciseFocusOption {
  id: ExerciseFocusId
  label: string
  primary: MuscleKey[]
  secondary: MuscleKey[]
}
export interface ExerciseFocusDefinition {
  options: readonly ExerciseFocusOption[]
  defaultFocus: ExerciseFocusId
}

const OPTIONS: readonly ExerciseFocusOption[] = [
  { id: 'quadriceps', label: 'Cuádriceps', primary: ['quadriceps'], secondary: ['gluteal', 'hamstring'] },
  { id: 'posterior-chain', label: 'Isquiotibiales y glúteo', primary: ['hamstring', 'gluteal'], secondary: ['quadriceps'] },
  { id: 'calves', label: 'Pantorrilla', primary: ['calves'], secondary: [] },
]
const MUSCLE_NAMES: Partial<Record<MuscleKey, string>> = {
  quadriceps: 'Cuádriceps', hamstring: 'Isquiotibiales', gluteal: 'Glúteos', calves: 'Pantorrilla',
}

/** Alcance cerrado: únicamente estas dos prensas bilaterales; ninguna unilateral ni búlgara. */
export function getExerciseFocusDefinition(exerciseId: string): ExerciseFocusDefinition | null {
  if (exerciseId === HORIZONTAL_PRESS_ID) return { options: OPTIONS, defaultFocus: 'calves' }
  if (exerciseId === BILATERAL_PRESS_ID) return { options: OPTIONS, defaultFocus: 'quadriceps' }
  return null
}
export function getSelectedExerciseFocus(exerciseId: string, preferredFocus?: ExerciseFocusId) {
  const definition = getExerciseFocusDefinition(exerciseId)
  return definition?.options.find(option => option.id === preferredFocus)
    ?? definition?.options.find(option => option.id === definition.defaultFocus)
}
export function resolveExerciseFocus(exerciseId: string, base: ExerciseMediaItem, preferredFocus?: ExerciseFocusId): ExerciseMediaItem {
  const selected = getSelectedExerciseFocus(exerciseId, preferredFocus)
  if (!selected) return {
    ...base, primary: [...base.primary], secondary: [...base.secondary],
    primaryEs: [...base.primaryEs], secondaryEs: [...base.secondaryEs],
  }
  return {
    ...base, gifUrl: getPressFocusDemo(exerciseId, selected.id)?.gifUrl ?? base.gifUrl,
    primary: [...selected.primary], secondary: [...selected.secondary],
    primaryEs: selected.primary.map(key => MUSCLE_NAMES[key] ?? key),
    secondaryEs: selected.secondary.map(key => MUSCLE_NAMES[key] ?? key),
  }
}
export function getExerciseFocusInstructions(exerciseId: string, focus?: ExerciseFocusId) {
  return getPressFocusDemo(exerciseId, getSelectedExerciseFocus(exerciseId, focus)?.id)?.instructions
}
