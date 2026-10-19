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

export interface HealthyWeightRangeResult {
  minKg: number
  maxKg: number
}

/**
 * Calcula el rango de peso saludable para una estatura dada (IMC entre 18.5 y 24.9).
 */
export function healthyWeightRange(heightCm: number): HealthyWeightRangeResult | null {
  if (!heightCm || heightCm <= 0) return null
  const heightM = heightCm / 100
  const h2 = heightM * heightM
  const minKg = Math.round(18.5 * h2 * 10) / 10
  const maxKg = Math.round(24.9 * h2 * 10) / 10
  return { minKg, maxKg }
}

/**
 * Estima el porcentaje de grasa corporal según la fórmula de Deurenberg:
 * % Grasa = 1.2 * IMC + 0.23 * edad - 10.8 * sexo (1 hombre, 0 mujer) - 5.4
 */
export function calculateBodyFat(
  bmiValue: number,
  age: number,
  sex: 'male' | 'female'
): number | null {
  if (!bmiValue || bmiValue <= 0 || !age || age <= 0 || (sex !== 'male' && sex !== 'female')) {
    return null
  }
  const sexFactor = sex === 'male' ? 1 : 0
  const raw = 1.2 * bmiValue + 0.23 * age - 10.8 * sexFactor - 5.4
  const clamped = Math.max(0, raw)
  return Math.round(clamped * 10) / 10
}

/**
 * Calcula la Frecuencia Cardíaca Máxima (FC máx) según la fórmula de Tanaka:
 * FC máx = 208 - 0.7 * edad
 */
export function calculateHrMax(age: number): number | null {
  if (!age || age <= 0) return null
  return Math.round(208 - 0.7 * age)
}

export interface HrZone {
  zone: string
  label: string
  minBpm: number
  maxBpm: number
  pctRange: string
}

/**
 * Calcula las 5 zonas de entrenamiento cardíaco a partir de la FC máx.
 */
export function hrZones(hrMax: number): HrZone[] {
  if (!hrMax || hrMax <= 0) return []
  return [
    {
      zone: 'Z1',
      label: 'Recuperación',
      minBpm: Math.round(hrMax * 0.5),
      maxBpm: Math.round(hrMax * 0.6),
      pctRange: '50-60%',
    },
    {
      zone: 'Z2',
      label: 'Quema de grasa',
      minBpm: Math.round(hrMax * 0.6),
      maxBpm: Math.round(hrMax * 0.7),
      pctRange: '60-70%',
    },
    {
      zone: 'Z3',
      label: 'Aeróbica',
      minBpm: Math.round(hrMax * 0.7),
      maxBpm: Math.round(hrMax * 0.8),
      pctRange: '70-80%',
    },
    {
      zone: 'Z4',
      label: 'Umbral anaeróbico',
      minBpm: Math.round(hrMax * 0.8),
      maxBpm: Math.round(hrMax * 0.9),
      pctRange: '80-90%',
    },
    {
      zone: 'Z5',
      label: 'Máximo',
      minBpm: Math.round(hrMax * 0.9),
      maxBpm: Math.round(hrMax * 1.0),
      pctRange: '90-100%',
    },
  ]
}

export interface HydrationRangeResult {
  minMl: number
  maxMl: number
}

/**
 * Calcula el rango de hidratación diaria recomendada (30 a 35 ml por kg de peso).
 */
export function hydrationRange(weightKg: number): HydrationRangeResult | null {
  if (!weightKg || weightKg <= 0) return null
  return {
    minMl: Math.round(weightKg * 30),
    maxMl: Math.round(weightKg * 35),
  }
}

export interface MacroGrams {
  min: number
  max: number
}

export interface MacrosResult {
  proteinG: MacroGrams
  fatG: MacroGrams
  carbsG: number
}

/**
 * Calcula los macronutrientes recomendados según TDEE y peso corporal:
 * - Proteína: 1.6 - 2.2 g/kg
 * - Grasa: 0.8 - 1.0 g/kg
 * - Carbohidratos: calorías restantes divididas por 4 (usando puntos medios)
 */
export function calculateMacros(tdee: number, weightKg: number): MacrosResult | null {
  if (!tdee || tdee <= 0 || !weightKg || weightKg <= 0) return null

  const proteinMin = Math.round(weightKg * 1.6)
  const proteinMax = Math.round(weightKg * 2.2)
  const fatMin = Math.round(weightKg * 0.8)
  const fatMax = Math.round(weightKg * 1.0)

  const proteinMid = (proteinMin + proteinMax) / 2
  const fatMid = (fatMin + fatMax) / 2

  const carbsG = Math.max(0, Math.round((tdee - proteinMid * 4 - fatMid * 9) / 4))

  return {
    proteinG: { min: proteinMin, max: proteinMax },
    fatG: { min: fatMin, max: fatMax },
    carbsG,
  }
}

/**
 * Estima las calorías quemadas en una sesión de entrenamiento:
 * Calorías = (MET * 3.5 * pesoKg / 200) * duraciónMin
 * Por defecto MET = 5 (fuerza moderada).
 */
export function estimateWorkoutCalories(
  durationMin: number,
  weightKg: number,
  met: number = 5
): number {
  if (!durationMin || durationMin <= 0 || !weightKg || weightKg <= 0 || met <= 0) {
    return 0
  }
  return Math.round(((met * 3.5 * weightKg) / 200) * durationMin)
}

