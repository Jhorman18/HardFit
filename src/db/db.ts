import { asWeightUnit, stampWorkoutWeightUnits, stampRoutineWeightUnits } from '../utils/weightUnits'
import Dexie, { type Table } from 'dexie'
import type { Exercise, Folder, Routine, Workout, Measurement, SettingsRecord, SyncMetaItem, ExerciseNote, MuscleOverride } from '../types'

export class RepLogDatabase extends Dexie {
  exercises!: Table<Exercise, string>
  folders!: Table<Folder, string>
  routines!: Table<Routine, string>
  workouts!: Table<Workout, string>
  measurements!: Table<Measurement, string>
  settings!: Table<SettingsRecord, string>
  syncMeta!: Table<SyncMetaItem, string>
  exerciseNotes!: Table<ExerciseNote, string>
  muscleOverrides!: Table<MuscleOverride, string>

  constructor() {
    super('replog')
    this.version(1).stores({
      exercises: 'id, name, muscleGroup, equipment, type, isCustom',
      folders: 'id, name, order',
      routines: 'id, name, folderId, order',
      workouts: 'id, name, startedAt, finishedAt, routineId',
      measurements: 'id, date, type',
      settings: 'id',
    })

    this.version(2)
      .stores({
        syncMeta: 'key',
      })
      .upgrade(() => {
        // Upgrade vacío: preserva todas las tablas y datos existentes
      })

    this.version(3)
      .stores({
        exerciseNotes: 'exerciseId',
      })
      .upgrade(() => {
        // Upgrade vacío: preserva todas las tablas y datos existentes
      })

    this.version(4)
      .stores({
        muscleOverrides: 'exerciseId',
      })
      .upgrade(() => {
        // Upgrade vacío: preserva todas las tablas y datos existentes
      })

    this.version(5).stores({}).upgrade(async (tx) => {
      const app = await tx.table('settings').get('app')
      const originalUnit = asWeightUnit(app?.units)
      await tx.table('workouts').toCollection().modify((workout: Workout) => {
        Object.assign(workout, stampWorkoutWeightUnits(workout, originalUnit))
      })
      await tx.table('routines').toCollection().modify((routine: Routine) => {
        Object.assign(routine, stampRoutineWeightUnits(routine, originalUnit))
      })
      const active = await tx.table('settings').get('active_workout')
      if (active?.workout) {
        await tx.table('settings').put({ ...active, workout: stampWorkoutWeightUnits(active.workout, originalUnit) })
      }
      if (app) await tx.table('settings').put({ ...app, legacyWeightUnit: app.legacyWeightUnit ?? originalUnit })
    })
  }
}

export const db = new RepLogDatabase()
