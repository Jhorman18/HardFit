import { getPressFocusDemo } from './pressFocus.ts'
import { getBasicCurl, getCurlGripDemo } from './curlGrip.ts'
import type { ExerciseMediaItem, MuscleKey } from './exerciseMedia'

export type ExerciseFocusId = 'quadriceps' | 'posterior-chain' | 'calves' | 'supinated' | 'pronated'
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
  title?: string
  description?: string
}

const PRESS_OPTIONS: readonly ExerciseFocusOption[] = [
  { id: 'quadriceps', label: 'Cuádriceps', primary: ['quadriceps'], secondary: ['gluteal', 'hamstring'] },
  { id: 'posterior-chain', label: 'Isquiotibiales y glúteo', primary: ['hamstring', 'gluteal'], secondary: ['quadriceps'] },
  { id: 'calves', label: 'Pantorrilla', primary: ['calves'], secondary: [] },
]
const CURL_OPTIONS: readonly ExerciseFocusOption[] = [
  { id: 'supinated', label: 'Supino · énfasis en bíceps', primary: ['biceps'], secondary: ['forearm'] },
  { id: 'pronated', label: 'Prono · énfasis en antebrazo', primary: ['forearm'], secondary: ['biceps'] },
]
const MUSCLE_NAMES: Partial<Record<MuscleKey, string>> = {
  quadriceps: 'Cuádriceps', hamstring: 'Isquiotibiales', gluteal: 'Glúteos', calves: 'Pantorrilla',
  biceps: 'Bíceps', forearm: 'Antebrazos',
}

/** Alcance cerrado: las dos prensas y la lista explícita de curls básicos autorizados. */
export function getExerciseFocusDefinition(exerciseId: string): ExerciseFocusDefinition | null {
  if (exerciseId === HORIZONTAL_PRESS_ID) return { options: PRESS_OPTIONS, defaultFocus: 'calves' }
  if (exerciseId === BILATERAL_PRESS_ID) return { options: PRESS_OPTIONS, defaultFocus: 'quadriceps' }
  const curl = getBasicCurl(exerciseId)
  if (curl) return {
    options: CURL_OPTIONS,
    defaultFocus: curl.defaultGrip,
    title: 'Agarre',
    description: 'Bíceps y antebrazo siguen trabajando en ambos agarres. Solo cambia el énfasis relativo; ninguno queda aislado ni desactivado.',
  }
  return null
}
export function getSelectedExerciseFocus(exerciseId: string, preferredFocus?: ExerciseFocusId) {
  const definition = getExerciseFocusDefinition(exerciseId)
  return definition?.options.find(option => option.id === preferredFocus)
    ?? definition?.options.find(option => option.id === definition.defaultFocus)
}
export function getExerciseFocusDemo(exerciseId: string, focus?: ExerciseFocusId) {
  const selected = getSelectedExerciseFocus(exerciseId, focus)
  return getCurlGripDemo(exerciseId, selected?.id) ?? getPressFocusDemo(exerciseId, selected?.id)
}
export function resolveExerciseFocus(exerciseId: string, base: ExerciseMediaItem, preferredFocus?: ExerciseFocusId): ExerciseMediaItem {
  const selected = getSelectedExerciseFocus(exerciseId, preferredFocus)
  if (!selected) return {
    ...base, primary: [...base.primary], secondary: [...base.secondary],
    primaryEs: [...base.primaryEs], secondaryEs: [...base.secondaryEs],
  }

  // El agarre cambia la contribución relativa de los brazos, sin excluir músculos auxiliares.
  const curl = getBasicCurl(exerciseId)
  const isOtherMuscle = (key: MuscleKey) => key !== 'biceps' && key !== 'forearm'
  const primary = [...new Set([...selected.primary, ...(curl ? base.primary.filter(isOtherMuscle) : [])])]
  const secondary = [...new Set([...selected.secondary, ...(curl ? base.secondary.filter(isOtherMuscle) : [])])]
    .filter(key => !primary.includes(key))
  const muscleName = (key: MuscleKey) => MUSCLE_NAMES[key]
    ?? base.primaryEs[base.primary.indexOf(key)]
    ?? base.secondaryEs[base.secondary.indexOf(key)]
    ?? key

  return {
    ...base, gifUrl: getExerciseFocusDemo(exerciseId, selected.id)?.gifUrl ?? base.gifUrl,
    primary, secondary,
    primaryEs: primary.map(muscleName),
    secondaryEs: secondary.map(muscleName),
  }
}
export function getExerciseFocusInstructions(exerciseId: string, focus?: ExerciseFocusId) {
  return getExerciseFocusDemo(exerciseId, focus)?.instructions
}
