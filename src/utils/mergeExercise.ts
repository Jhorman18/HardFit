import { db } from '../db'
import { useWorkoutStore } from '../store/workoutStore'
import { rememberHevyReplacement } from './importHevy'

export async function getExerciseUsage(
  exerciseId: string
): Promise<{ workouts: number; routines: number }> {
  const [workouts, routines] = await Promise.all([
    db.workouts.toArray(),
    db.routines.toArray(),
  ])

  const workoutCount = workouts.filter((workout) =>
    workout.entries?.some((entry) => entry.exerciseId === exerciseId)
  ).length

  const routineCount = routines.filter((routine) =>
    routine.items?.some((item) => item.exerciseId === exerciseId)
  ).length

  return { workouts: workoutCount, routines: routineCount }
}

export async function mergeExercise(fromId: string, toId: string): Promise<void> {
  if (fromId === toId) return

  const fromExercise = await db.exercises.get(fromId)
  if (!fromExercise || !fromExercise.isCustom) return

  const now = Date.now()

  await db.transaction(
    'rw',
    [db.workouts, db.routines, db.exercises, db.exerciseNotes, db.muscleOverrides],
    async () => {
      // 1. Workouts: cambia exerciseId en cada entry y pone updatedAt solo en los modificados
      const workouts = await db.workouts.toArray()
      for (const workout of workouts) {
        let modified = false
        const updatedEntries = workout.entries.map((entry) => {
          if (entry.exerciseId === fromId) {
            modified = true
            return { ...entry, exerciseId: toId }
          }
          return entry
        })

        if (modified) {
          await db.workouts.put({
            ...workout,
            entries: updatedEntries,
            updatedAt: now,
          })
        }
      }

      // 2. Routines: cambia exerciseId en cada item
      const routines = await db.routines.toArray()
      for (const routine of routines) {
        let modified = false
        const updatedItems = routine.items.map((item) => {
          if (item.exerciseId === fromId) {
            modified = true
            return { ...item, exerciseId: toId }
          }
          return item
        })

        if (modified) {
          await db.routines.put({
            ...routine,
            items: updatedItems,
          })
        }
      }

      // 3. ExerciseNotes: si el destino no tiene nota, la del origen pasa al destino;
      // si ambos tienen, concatena destino + "\n\n" + origen. Borra la nota del origen.
      const fromNote = await db.exerciseNotes.get(fromId)
      if (fromNote) {
        const toNote = await db.exerciseNotes.get(toId)
        if (!toNote) {
          await db.exerciseNotes.put({
            exerciseId: toId,
            text: fromNote.text,
            updatedAt: now,
          })
        } else {
          const mergedText =
            toNote.text && fromNote.text
              ? `${toNote.text}\n\n${fromNote.text}`
              : toNote.text || fromNote.text
          await db.exerciseNotes.put({
            ...toNote,
            text: mergedText,
            updatedAt: now,
          })
        }
        await db.exerciseNotes.delete(fromId)
      }

      // 4. MuscleOverrides: borra el del origen; no toques el del destino
      await db.muscleOverrides.delete(fromId)

      // 5. Exercises: borra el origen
      await db.exercises.delete(fromId)
    }
  )

  // Entreno activo: si contiene el origen, sustituirlo también
  useWorkoutStore.getState().remapExercise(fromId, toId)

  // Recordar reemplazo para futuras importaciones de Hevy
  rememberHevyReplacement(fromExercise.name, fromId, toId)
}
