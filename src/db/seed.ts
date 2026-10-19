import { db } from './db'
import { catalog } from '../data/catalog'
import type { Exercise, Settings } from '../types'

export async function seedIfEmpty(): Promise<void> {
  // A single rw transaction serializes concurrent calls (e.g. React StrictMode's
  // double effect invocation in dev), so the second run sees the rows the first wrote.
  await db.transaction('rw', db.exercises, db.settings, db.workouts, db.measurements, async () => {
    // Purga segura e idempotente de datos demo previos (prefijo 'demo-')
    const demoWorkoutIds = (await db.workouts.toArray())
      .filter((w) => w.id.startsWith('demo-'))
      .map((w) => w.id)
    if (demoWorkoutIds.length > 0) {
      await db.workouts.bulkDelete(demoWorkoutIds)
    }

    const demoMeasurementIds = (await db.measurements.toArray())
      .filter((m) => m.id.startsWith('demo-'))
      .map((m) => m.id)
    if (demoMeasurementIds.length > 0) {
      await db.measurements.bulkDelete(demoMeasurementIds)
    }

    let appSettings = (await db.settings.get('app')) as Settings | undefined
    if (!appSettings) {
      appSettings = {
        id: 'app',
        units: 'kg',
        restSeconds: 120,
        createdAt: Date.now(),
        seedVersion: 0,
      }
      await db.settings.add(appSettings)
    }

    const currentSeedVersion = appSettings.seedVersion ?? 0

    if (currentSeedVersion < 3) {
      // Borra SOLO los exercises con isCustom === false (los de fábrica viejos)
      const oldBuiltinIds = (await db.exercises.toArray())
        .filter((ex) => !ex.isCustom)
        .map((ex) => ex.id)

      if (oldBuiltinIds.length > 0) {
        await db.exercises.bulkDelete(oldBuiltinIds)
      }

      // Siembra el catálogo completo nuevo (isCustom: false)
      const records: Exercise[] = catalog.map((exercise) => ({
        ...exercise,
        isCustom: false,
      }))
      await db.exercises.bulkPut(records)

      // Marca la versión de seed migrada
      await db.settings.put({ ...appSettings, seedVersion: 3 })
    }
  })
}
