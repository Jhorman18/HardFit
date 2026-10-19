import { db } from '../db'
import type { Workout, WorkoutEntry, WorkoutSetEntry, Measurement, Exercise } from '../types'

// Prefijo para identificar (y poder borrar) los datos de prueba.
const DEMO_PREFIX = 'demo-'
const WEEKS = 4 // ~1 mes de datos de prueba

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
function randint(min: number, max: number): number {
  return Math.round(rand(min, max))
}
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}
function round2_5(n: number): number {
  return Math.max(2.5, Math.round(n / 2.5) * 2.5)
}

export async function hasDemoData(): Promise<boolean> {
  const all = await db.workouts.toArray()
  return all.some((w) => w.id.startsWith(DEMO_PREFIX))
}

export async function clearDemoData(): Promise<void> {
  const [ws, ms] = await Promise.all([db.workouts.toArray(), db.measurements.toArray()])
  const wIds = ws.filter((w) => w.id.startsWith(DEMO_PREFIX)).map((w) => w.id)
  const mIds = ms.filter((m) => m.id.startsWith(DEMO_PREFIX)).map((m) => m.id)
  if (wIds.length) await db.workouts.bulkDelete(wIds)
  if (mIds.length) await db.measurements.bulkDelete(mIds)
}

/**
 * Genera ~12 semanas de entrenos realistas (3 por semana, con sobrecarga progresiva)
 * y un historial de medidas corporales, para poblar las gráficas de Estadísticas.
 * Reemplaza cualquier dato de prueba previo. No toca datos reales del usuario.
 */
export async function generateDemoData(): Promise<{ workouts: number; measurements: number }> {
  await clearDemoData()

  const allExercises = await db.exercises.toArray()
  const weightReps = allExercises.filter((e) => e.type === 'weight_reps')

  // Elegir ejercicios variados por grupo muscular.
  const byGroup = new Map<string, Exercise[]>()
  for (const e of weightReps) {
    const arr = byGroup.get(e.muscleGroup) ?? []
    arr.push(e)
    byGroup.set(e.muscleGroup, arr)
  }
  const chosen: Exercise[] = []
  for (const group of ['Pecho', 'Pierna', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps']) {
    const arr = byGroup.get(group)
    if (arr && arr.length) chosen.push(arr[randint(0, arr.length - 1)])
  }
  if (chosen.length < 4) {
    chosen.push(...shuffle(weightReps).slice(0, 6 - chosen.length))
  }
  if (chosen.length === 0) {
    return { workouts: 0, measurements: 0 }
  }

  const baseWeight = new Map<string, number>()
  for (const e of chosen) baseWeight.set(e.id, randint(20, 80))

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  const WEEK = 7 * DAY

  const workouts: Workout[] = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    const weekStart = now - w * WEEK
    const progress = WEEKS - 1 - w // 0..11
    for (const d of [0, 2, 4]) {
      // sesión por la tarde
      const started = weekStart - (6 - d) * DAY + randint(17, 20) * 60 * 60 * 1000
      const todays = shuffle(chosen).slice(0, randint(3, Math.min(4, chosen.length)))
      const entries: WorkoutEntry[] = todays.map((ex) => {
        const base = baseWeight.get(ex.id) ?? 40
        const workW = round2_5(base + progress * 1.5 + rand(-2, 2)) // sobrecarga progresiva + ruido
        const nSets = randint(3, 4)
        const sets: WorkoutSetEntry[] = [
          { type: 'warmup', weight: round2_5(workW * 0.5), reps: 10, completed: true },
        ]
        for (let s = 0; s < nSets; s++) {
          sets.push({
            type: 'normal',
            weight: workW,
            reps: randint(6, 12),
            rpe: randint(7, 9),
            completed: true,
          })
        }
        return { exerciseId: ex.id, sets }
      })
      workouts.push({
        id: `${DEMO_PREFIX}wk-${w}-${d}-${Math.random().toString(36).slice(2, 7)}`,
        name: '[Demo] Entrenamiento',
        startedAt: started,
        finishedAt: started + randint(45, 75) * 60 * 1000,
        routineId: null,
        notes: 'demo-seed',
        entries,
      })
    }
  }

  // Medidas corporales semanales (recomposición ligera).
  const measurements: Measurement[] = []
  const startBW = rand(78, 85)
  for (let w = WEEKS - 1; w >= 0; w--) {
    const date = now - w * WEEK
    const t = WEEKS - 1 - w
    measurements.push(
      { id: `${DEMO_PREFIX}ms-bw-${w}`, date, type: 'bodyweight', value: +(startBW - t * 0.2 + rand(-0.3, 0.3)).toFixed(1), unit: 'kg' },
      { id: `${DEMO_PREFIX}ms-chest-${w}`, date, type: 'chest', value: +(100 + t * 0.15 + rand(-0.5, 0.5)).toFixed(1), unit: 'cm' },
      { id: `${DEMO_PREFIX}ms-waist-${w}`, date, type: 'waist', value: +(85 - t * 0.2 + rand(-0.4, 0.4)).toFixed(1), unit: 'cm' },
      { id: `${DEMO_PREFIX}ms-arm-${w}`, date, type: 'arm', value: +(36 + t * 0.1 + rand(-0.3, 0.3)).toFixed(1), unit: 'cm' },
    )
  }

  await db.workouts.bulkAdd(workouts)
  await db.measurements.bulkAdd(measurements)
  return { workouts: workouts.length, measurements: measurements.length }
}
