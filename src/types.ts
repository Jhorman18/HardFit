import type { WeightUnit } from './utils/weightUnits'
import type { MuscleKey } from './data/exerciseMedia'
import type { ExerciseFocusId } from './data/exerciseFocus'

export type ExerciseType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'bodyweight_assisted'
  | 'duration'
  | 'distance'

export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  type: ExerciseType
  isCustom: boolean
  aliases?: string[]
}

export interface Folder {
  id: string
  name: string
  order: number
}

export interface RoutineItemTargetSet {
  weightUnit?: WeightUnit
  reps?: number
  weight?: number
  rpe?: number
  durationSec?: number
  distanceM?: number
}

export interface RoutineItem {
  weightUnit?: WeightUnit
  restSeconds?: number
  exerciseId: string
  order: number
  targetSets: RoutineItemTargetSet[]
}

export interface Routine {
  weightUnit?: WeightUnit
  restSeconds?: number
  id: string
  name: string
  folderId: string | null
  order: number
  items: RoutineItem[]
}

export type SetType = 'normal' | 'warmup' | string

export interface WorkoutSetEntry {
  weightUnit?: WeightUnit
  type: SetType
  weight?: number
  reps?: number
  rpe?: number
  durationSec?: number
  distanceM?: number
  completed: boolean
}

export interface WorkoutEntry {
  weightUnit?: WeightUnit
  exerciseId: string
  sets: WorkoutSetEntry[]
  restSeconds?: number
}

export interface Workout {
  weightUnit?: WeightUnit
  updatedAt?: number
  id: string
  name: string
  startedAt: number
  finishedAt: number | null
  routineId: string | null
  notes: string
  entries: WorkoutEntry[]
  restSeconds?: number
}

export type MeasurementType =
  | 'bodyweight'
  | 'bodyfat'
  | 'chest'
  | 'waist'
  | 'hip'
  | 'arm'
  | 'thigh'
  | 'calf'
  | 'shoulders'
  | 'neck'
  | string

export interface Measurement {
  id: string
  date: number
  type: MeasurementType
  value: number
  unit: string
}

export interface Settings {
  id: 'app'
  units: WeightUnit
  legacyWeightUnit?: WeightUnit
  restSeconds?: number
  showRpe?: boolean
  /** Barra de referencia para el desglose de discos; 20 kg si no se ha elegido. */
  barKg?: number
  createdAt: number
  seedVersion?: number
  sex?: 'male' | 'female'
  age?: number
  heightCm?: number
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  healthOnboarded?: boolean
  enableHealthMetrics?: boolean
}

export interface ActiveWorkoutRecord {
  id: 'active_workout'
  workout: Workout
}

export type SettingsRecord = Settings | ActiveWorkoutRecord

export interface SyncMetaItem {
  key: string
  hash?: string
  syncedAt?: number
  val?: string | number | null
}

export interface ExerciseNote {
  exerciseId: string
  text: string
  updatedAt: number
}

export interface MuscleOverride {
  exerciseId: string
  focus?: ExerciseFocusId
  /** Los demás ejercicios conservan sus exclusiones originales. */
  disabled: MuscleKey[]
}
