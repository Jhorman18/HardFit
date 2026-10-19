import { db } from '../db'
import type { ExerciseNote } from '../types'

/**
 * Obtiene la nota local de un ejercicio si existe.
 */
export async function getExerciseNote(exerciseId: string): Promise<ExerciseNote | undefined> {
  return await db.exerciseNotes.get(exerciseId)
}

/**
 * Guarda o actualiza la nota de un ejercicio.
 * Si el texto está vacío, elimina la nota existente.
 */
export async function saveExerciseNote(exerciseId: string, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) {
    await db.exerciseNotes.delete(exerciseId)
  } else {
    await db.exerciseNotes.put({
      exerciseId,
      text: trimmed,
      updatedAt: Date.now(),
    })
  }
}
