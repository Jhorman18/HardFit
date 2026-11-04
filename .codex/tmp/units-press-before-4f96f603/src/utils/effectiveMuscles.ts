import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  exerciseMedia,
  type ExerciseMediaItem,
  type MuscleKey,
} from '../data/exerciseMedia'
import type { MuscleOverride } from '../types'

export const MUSCLE_NAME_ES: Record<string, string> = {
  chest: 'Pecho',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearm: 'Antebrazos',
  'front-deltoids': 'Hombros',
  'back-deltoids': 'Hombros',
  deltoids: 'Hombros',
  'upper-back': 'Espalda alta',
  'lower-back': 'Lumbares',
  trapezius: 'Trapecio',
  neck: 'Cuello',
  quadriceps: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  calves: 'Pantorrillas',
  gluteal: 'Glúteos',
  abs: 'Abdominales',
  obliques: 'Oblicuos',
  adductor: 'Aductores',
  adductors: 'Aductores',
  abductors: 'Abductores',
  head: 'Cabeza',
}

/**
 * Devuelve el nombre en español para un MuscleKey o slug de silueta.
 */
export function getMuscleNameEs(slugOrKey: string): string {
  return MUSCLE_NAME_ES[slugOrKey] || slugOrKey
}

/**
 * Devuelve la información de media (gifs y músculos) efectiva tras aplicar
 * los overrides configurados por el usuario.
 *
 * Función pura: recibe los overrides directamente, sin consultar Dexie internamente.
 */
export function getEffectiveMedia(
  exerciseId: string,
  overrides?: Map<string, MuscleOverride> | MuscleOverride | null,
  customMediaMap?: Record<string, ExerciseMediaItem>
): ExerciseMediaItem {
  const baseMap = customMediaMap || exerciseMedia
  const base = baseMap[exerciseId]
  if (!base) {
    return {
      gifUrl: '',
      primary: [],
      secondary: [],
      primaryEs: [],
      secondaryEs: [],
    }
  }

  let override: MuscleOverride | undefined | null
  if (overrides) {
    if (overrides instanceof Map) {
      override = overrides.get(exerciseId)
    } else if ('exerciseId' in overrides && 'disabled' in overrides) {
      override = overrides.exerciseId === exerciseId ? overrides : undefined
    }
  }

  const disabledSet = new Set(override?.disabled || [])
  if (disabledSet.size === 0) {
    return {
      gifUrl: base.gifUrl,
      primary: [...base.primary],
      secondary: [...base.secondary],
      primaryEs: [...base.primaryEs],
      secondaryEs: [...base.secondaryEs],
    }
  }

  const primary: MuscleKey[] = []
  const primaryEs: string[] = []
  for (let i = 0; i < base.primary.length; i++) {
    const key = base.primary[i]
    if (!disabledSet.has(key)) {
      primary.push(key)
      primaryEs.push(base.primaryEs[i] ?? key)
    }
  }

  const secondary: MuscleKey[] = []
  const secondaryEs: string[] = []
  for (let i = 0; i < base.secondary.length; i++) {
    const key = base.secondary[i]
    if (!disabledSet.has(key)) {
      secondary.push(key)
      secondaryEs.push(base.secondaryEs[i] ?? key)
    }
  }

  return {
    gifUrl: base.gifUrl,
    primary,
    secondary,
    primaryEs,
    secondaryEs,
  }
}

/**
 * Hook reactivo que devuelve un Map<exerciseId, MuscleOverride> con todos
 * los overrides guardados en IndexedDB vía Dexie.
 */
export function useMuscleOverridesMap(): Map<string, MuscleOverride> {
  const overridesList = useLiveQuery(() => db.muscleOverrides.toArray(), [])

  return useMemo(() => {
    const map = new Map<string, MuscleOverride>()
    if (overridesList) {
      for (const item of overridesList) {
        map.set(item.exerciseId, item)
      }
    }
    return map
  }, [overridesList])
}
