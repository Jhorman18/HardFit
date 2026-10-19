import Dexie, { type Table } from 'dexie'
import type { Exercise, Folder, Routine, Workout, Measurement, SettingsRecord, SyncMetaItem, ExerciseNote } from '../types'

export class RepLogDatabase extends Dexie {
  exercises!: Table<Exercise, string>
  folders!: Table<Folder, string>
  routines!: Table<Routine, string>
  workouts!: Table<Workout, string>
  measurements!: Table<Measurement, string>
  settings!: Table<SettingsRecord, string>
  syncMeta!: Table<SyncMetaItem, string>
  exerciseNotes!: Table<ExerciseNote, string>

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
  }
}

export const db = new RepLogDatabase()
