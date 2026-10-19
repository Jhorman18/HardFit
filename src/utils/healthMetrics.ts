import { db } from '../db'
import type { Settings } from '../types'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export interface ActivityLevelConfig {
  value: ActivityLevel
  label: string
  description: string
  multiplier: number
}

export const ACTIVITY_LEVELS: ActivityLevelConfig[] = [
  {
    value: 'sedentary',
    label: 'Sedentario',
    description: 'Poco o nada de ejercicio',
    multiplier: 1.2,
  },
  {
    value: 'light',
    label: 'Ligero',
    description: '1-3 días por semana',
    multiplier: 1.375,
  },
  {
    value: 'moderate',
    label: 'Moderado',
    description: '3-5 días por semana',
    multiplier: 1.55,
  },
  {
    value: 'active',
    label: 'Activo',
    description: '6-7 días por semana',
    multiplier: 1.725,
  },
  {
    value: 'very_active',
    label: 'Muy activo',
    description: 'Ejercicio intenso diario o trabajo físico',
    multiplier: 1.9,
  },
]

/**
 * Convierte un peso dado a kilogramos según su unidad.
 */
export function weightToKg(weight: number, unit: string): number {
  if (unit.toLowerCase() === 'lb') {
    return weight * 0.45359237
  }
  return weight
}

export interface BmiResult {
  value: number
  category: string
  color: string
}

/**
 * Calcula el Índice de Masa Corporal (IMC / BMI).
 */
export function calculateBmi(weightKg: number, heightCm: number): BmiResult | null {
  if (weightKg <= 0 || heightCm <= 0) return null
  const heightM = heightCm / 100
  const rawBmi = weightKg / (heightM * heightM)
  const value = Math.round(rawBmi * 10) / 10

  let category = 'Peso saludable'
  let color = 'text-emerald-400'

  if (value < 18.5) {
    category = 'Bajo peso'
    color = 'text-amber-400'
  } else if (value >= 18.5 && value <= 24.9) {
    category = 'Peso saludable'
    color = 'text-emerald-400'
  } else if (value >= 25.0 && value <= 29.9) {
    category = 'Sobrepeso'
    color = 'text-amber-400'
  } else {
    category = 'Obesidad'
    color = 'text-rose-400'
  }

  return { value, category, color }
}

/**
 * Calcula la Tasa Metabólica Basal (TMB / BMR) según la fórmula de Mifflin-St Jeor.
 */
export function calculateBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female'
): number | null {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return null
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

/**
 * Calcula el Gasto Energético Diario Total (TDEE).
 */
export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  const config = ACTIVITY_LEVELS.find((l) => l.value === activityLevel)
  const multiplier = config ? config.multiplier : 1.2
  return Math.round(bmr * multiplier)
}

/**
 * Actualiza los ajustes de la aplicación en Dexie preservando todos los campos existentes.
 */
export async function patchAppSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const existing = await db.settings.get('app')
  const existingSettings = existing && 'units' in existing ? existing : undefined

  await db.settings.put({
    id: 'app',
    units: 'kg',
    restSeconds: 120,
    showRpe: false,
    createdAt: Date.now(),
    ...existingSettings,
    ...patch,
  })
}
