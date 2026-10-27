import type { Workout, WorkoutSetEntry, Exercise, ExerciseType } from '../types'
import { isValidSet, estimated1RM, setVolume, workoutVolume, countValidSets } from './stats'

export type RecordKind = 'weight' | 'e1rm' | 'setVolume' | 'reps'

export interface WorkoutRecord {
  exerciseId: string
  setIndex: number
  kinds: RecordKind[]
  weight?: number
  reps?: number
}

export interface WorkoutSummaryData {
  durationMs: number
  totalVolumeKg: number
  validSets: number
  exerciseCount: number
  records: WorkoutRecord[]
}

export interface VolumeEquivalent {
  emoji: string
  name: string
  plural: string
  weightKg: number
  count: number
}

/**
 * Lista exacta de objetos equivalentes ordenada de mayor a menor peso.
 */
export const EQUIVALENTS_LIST: Array<Omit<VolumeEquivalent, 'count'>> = [
  { emoji: '🐋', name: 'ballena jorobada', plural: 'ballenas jorobadas', weightKg: 30000 },
  { emoji: '🚌', name: 'buseta', plural: 'busetas', weightKg: 10000 },
  { emoji: '🦖', name: 'T. rex', plural: 'T. rex', weightKg: 8000 },
  { emoji: '🐘', name: 'elefante', plural: 'elefantes', weightKg: 6000 },
  { emoji: '🦏', name: 'rinoceronte', plural: 'rinocerontes', weightKg: 2300 },
  { emoji: '🦛', name: 'hipopótamo', plural: 'hipopótamos', weightKg: 1500 },
  { emoji: '🚙', name: 'carro', plural: 'carros', weightKg: 1200 },
  { emoji: '🚗', name: 'Renault 4', plural: 'Renault 4', weightKg: 700 },
  { emoji: '🐎', name: 'caballo', plural: 'caballos', weightKg: 500 },
  { emoji: '🎹', name: 'piano', plural: 'pianos', weightKg: 250 },
  { emoji: '🏍️', name: 'moto', plural: 'motos', weightKg: 150 },
  { emoji: '🧺', name: 'lavadora', plural: 'lavadoras', weightKg: 70 },
]

/**
 * Devuelve el artículo indeterminado adecuado ('un' o 'una') según el nombre del objeto.
 */
export function getEquivalentArticle(name: string): string {
  const feminine = ['lavadora', 'moto', 'buseta', 'ballena jorobada']
  return feminine.includes(name.toLowerCase()) ? 'una' : 'un'
}

/**
 * Devuelve la equivalencia en peso de un volumen total en kg eligiendo el objeto
 * MÁS PESADO cuyo weightKg <= volumen; count = Math.floor(volumen / weightKg).
 * Si el volumen es menor que el objeto más liviano (70 kg), devuelve null.
 */
export function volumeEquivalent(totalVolumeKg: number): VolumeEquivalent | null {
  if (totalVolumeKg < 70) {
    return null
  }

  for (const item of EQUIVALENTS_LIST) {
    if (totalVolumeKg >= item.weightKg) {
      return {
        ...item,
        count: Math.floor(totalVolumeKg / item.weightKg),
      }
    }
  }

  return null
}

/**
 * Obtiene el tipo de ejercicio de un exerciseId.
 */
function getExerciseType(
  exerciseId: string,
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>
): ExerciseType {
  if (!exercisesById) return 'weight_reps'
  const ex = exercisesById instanceof Map ? exercisesById.get(exerciseId) : exercisesById[exerciseId]
  return ex?.type ?? 'weight_reps'
}

/**
 * Obtiene el peso efectivo de una serie para cálculos de récords y 1RM,
 * siguiendo exactamente el patrón de checkSetPR.
 */
function getEffectiveWeight(
  exerciseType: ExerciseType,
  weight: number = 0,
  bodyweightKg: number = 0
): number {
  const w = Math.max(0, weight || 0)
  const bw = Math.max(0, bodyweightKg || 0)

  if (exerciseType === 'bodyweight_reps') {
    return bw + w
  }
  if (exerciseType === 'bodyweight_assisted') {
    return Math.max(0, bw - w)
  }
  return w
}

interface PrevSetData {
  weight: number
  reps: number
  e1rm: number
  volume: number
}

/**
 * Calcula el resumen de un entrenamiento terminado y los récords personales rotos.
 *
 * - Historial de comparación = workouts con finishedAt != null, id distinto al actual y startedAt < workout.startedAt.
 * - Récords por ejercicio (solo series válidas, isValidSet). SOLO si el ejercicio tiene historial previo.
 * - Comparación estricta (>), no empates.
 * - Si varias series rompen el mismo tipo de récord, se queda con la mejor y agrupa por serie.
 */
export function summarizeWorkout(
  workout: Workout,
  allWorkouts: Workout[],
  exercisesById?: Map<string, Exercise> | Record<string, Exercise>,
  bodyweightKg?: number
): WorkoutSummaryData {
  const durationMs =
    workout.finishedAt && workout.startedAt
      ? Math.max(0, workout.finishedAt - workout.startedAt)
      : 0

  const totalVolumeKg = workoutVolume(workout, exercisesById, bodyweightKg)
  const validSets = countValidSets(workout)

  const activeExercises = new Set<string>()
  if (workout.entries) {
    for (const entry of workout.entries) {
      if (entry.sets && entry.sets.some(isValidSet)) {
        activeExercises.add(entry.exerciseId)
      }
    }
  }
  const exerciseCount = activeExercises.size

  // Historial previo cronológicamente anterior al entreno actual
  const previousWorkouts = allWorkouts.filter(
    (w) => w.finishedAt != null && w.id !== workout.id && w.startedAt < workout.startedAt
  )

  const records: WorkoutRecord[] = []

  // Calcular récords por cada ejercicio presente en el entreno actual
  for (const exerciseId of activeExercises) {
    const exType = getExerciseType(exerciseId, exercisesById)

    // Para tipos duration/distance no calculamos récords
    if (exType === 'duration' || exType === 'distance') {
      continue
    }

    // 1. Recopilar todas las series válidas previas de este ejercicio
    const prevSets: PrevSetData[] = []
    for (const pw of previousWorkouts) {
      if (!pw.entries) continue
      for (const entry of pw.entries) {
        if (entry.exerciseId !== exerciseId || !entry.sets) continue
        for (const s of entry.sets) {
          if (!isValidSet(s)) continue
          const w = Math.max(0, s.weight || 0)
          const r = Math.max(0, s.reps || 0)
          const effW = getEffectiveWeight(exType, w, bodyweightKg)
          const weightForRecord =
            exType === 'bodyweight_reps' || exType === 'bodyweight_assisted' ? effW : w
          const e1rm = estimated1RM(effW, r)
          const vol = setVolume(s, exType, bodyweightKg)

          prevSets.push({
            weight: weightForRecord,
            reps: r,
            e1rm,
            volume: vol,
          })
        }
      }
    }

    // SOLO si el ejercicio tiene historial previo (si es la primera vez que se hace, no hay récords)
    if (prevSets.length === 0) {
      continue
    }

    let prevMaxWeight = 0
    let prevMaxE1RM = 0
    let prevMaxVolume = 0

    for (const ps of prevSets) {
      if (ps.weight > prevMaxWeight) prevMaxWeight = ps.weight
      if (ps.e1rm > prevMaxE1RM) prevMaxE1RM = ps.e1rm
      if (ps.volume > prevMaxVolume) prevMaxVolume = ps.volume
    }

    // 2. Evaluar series válidas del entreno actual
    interface CandidateSet {
      setIndex: number
      set: WorkoutSetEntry
      weightVal: number
      reps: number
      e1rm: number
      volume: number
      breaksWeight: boolean
      breaksE1RM: boolean
      breaksVolume: boolean
      breaksReps: boolean
    }

    const candidateSets: CandidateSet[] = []

    for (const entry of workout.entries || []) {
      if (entry.exerciseId !== exerciseId || !entry.sets) continue

      entry.sets.forEach((s, setIndex) => {
        if (!isValidSet(s)) return

        const w = Math.max(0, s.weight || 0)
        const r = Math.max(0, s.reps || 0)
        const effW = getEffectiveWeight(exType, w, bodyweightKg)
        const weightVal =
          exType === 'bodyweight_reps' || exType === 'bodyweight_assisted' ? effW : w
        const e1rm = estimated1RM(effW, r)
        const vol = setVolume(s, exType, bodyweightKg)

        const breaksWeight = weightVal > prevMaxWeight
        const breaksE1RM = e1rm > prevMaxE1RM
        const breaksVolume = vol > prevMaxVolume

        // Más repeticiones: reps > máximo de reps previo hecho con un peso >= al de esta serie
        const prevSetsAtOrAbove = prevSets.filter((ps) => ps.weight >= weightVal)
        let breaksReps = false
        if (prevSetsAtOrAbove.length > 0) {
          const maxPrevReps = Math.max(...prevSetsAtOrAbove.map((ps) => ps.reps))
          if (r > maxPrevReps) {
            breaksReps = true
          }
        }

        candidateSets.push({
          setIndex,
          set: s,
          weightVal,
          reps: r,
          e1rm,
          volume: vol,
          breaksWeight,
          breaksE1RM,
          breaksVolume,
          breaksReps,
        })
      })
    }

    // 3. Quedarse solo con la mejor serie para cada tipo de récord
    let bestWeightCand: CandidateSet | null = null
    for (const c of candidateSets) {
      if (!c.breaksWeight) continue
      if (!bestWeightCand || c.weightVal > bestWeightCand.weightVal) {
        bestWeightCand = c
      }
    }

    let bestE1RMCand: CandidateSet | null = null
    for (const c of candidateSets) {
      if (!c.breaksE1RM) continue
      if (!bestE1RMCand || c.e1rm > bestE1RMCand.e1rm) {
        bestE1RMCand = c
      }
    }

    let bestVolumeCand: CandidateSet | null = null
    for (const c of candidateSets) {
      if (!c.breaksVolume) continue
      if (!bestVolumeCand || c.volume > bestVolumeCand.volume) {
        bestVolumeCand = c
      }
    }

    let bestRepsCand: CandidateSet | null = null
    for (const c of candidateSets) {
      if (!c.breaksReps) continue
      if (!bestRepsCand || c.reps > bestRepsCand.reps) {
        bestRepsCand = c
      }
    }

    // 4. Agrupar por serie los tipos que coincidan
    const kindsBySetIndex = new Map<
      number,
      { set: WorkoutSetEntry; kinds: RecordKind[] }
    >()

    const addKindToSet = (cand: CandidateSet, kind: RecordKind) => {
      const existing = kindsBySetIndex.get(cand.setIndex)
      if (existing) {
        if (!existing.kinds.includes(kind)) {
          existing.kinds.push(kind)
        }
      } else {
        kindsBySetIndex.set(cand.setIndex, {
          set: cand.set,
          kinds: [kind],
        })
      }
    }

    if (bestWeightCand) addKindToSet(bestWeightCand, 'weight')
    if (bestE1RMCand) addKindToSet(bestE1RMCand, 'e1rm')
    if (bestVolumeCand) addKindToSet(bestVolumeCand, 'setVolume')
    if (bestRepsCand) addKindToSet(bestRepsCand, 'reps')

    for (const [setIndex, item] of kindsBySetIndex.entries()) {
      records.push({
        exerciseId,
        setIndex,
        kinds: item.kinds,
        weight: item.set.weight,
        reps: item.set.reps,
      })
    }
  }

  return {
    durationMs,
    totalVolumeKg,
    validSets,
    exerciseCount,
    records,
  }
}
