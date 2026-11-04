import type { SetType, WorkoutSetEntry } from '../types'

export interface SetTypeOption {
  value: SetType
  label: string
  /** Letra de la columna Serie; las series normales muestran su número. */
  badge?: string
  description: string
}

export const SET_TYPE_OPTIONS: SetTypeOption[] = [
  { value: 'warmup', label: 'Calentamiento', badge: 'C', description: 'No cuenta para volumen ni récords' },
  { value: 'normal', label: 'Normal', description: 'Serie de trabajo' },
  { value: 'failure', label: 'Al fallo', badge: 'F', description: 'Serie de trabajo hasta no poder más' },
  { value: 'drop', label: 'Drop', badge: 'D', description: 'Serie de trabajo con peso reducido, sin descanso' },
]

export function getSetTypeOption(type: SetType): SetTypeOption {
  return SET_TYPE_OPTIONS.find((option) => option.value === type) ?? SET_TYPE_OPTIONS[1]
}

/** Lo que muestra la columna Serie: C, C1, F, D o el número de serie de trabajo. */
export function getSetBadge(sets: Pick<WorkoutSetEntry, 'type'>[], index: number): string {
  const type = sets[index].type
  if (type === 'warmup') {
    const warmups = sets.filter((set) => set.type === 'warmup').length
    if (warmups === 1) return 'C'
    return `C${sets.slice(0, index + 1).filter((set) => set.type === 'warmup').length}`
  }
  return (
    getSetTypeOption(type).badge ??
    String(sets.slice(0, index + 1).filter((set) => set.type !== 'warmup').length)
  )
}
