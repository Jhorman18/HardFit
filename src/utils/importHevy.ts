import { db } from '../db'
import type { Exercise, SetType, Workout, WorkoutEntry, WorkoutSetEntry } from '../types'
import { KG_PER_LB, type WeightUnit } from './weightUnits'

/** Cabeceras que identifican una exportación de entrenamientos de Hevy. */
const REQUIRED_COLUMNS = ['title', 'start_time', 'exercise_title', 'set_index', 'set_type']

const MONTHS: Record<string, number> = {
  ene: 0, jan: 0,
  feb: 1,
  mar: 2,
  abr: 3, apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7, aug: 7,
  sep: 8, sept: 8,
  oct: 9,
  nov: 10,
  dic: 11, dec: 11,
}

const SET_TYPES: Record<string, SetType> = {
  normal: 'normal',
  warmup: 'warmup',
  failure: 'failure',
  dropset: 'drop',
}

const CHOICES_KEY = 'replog_hevy_choices'

// Palabras que no distinguen ejercicios.
const STOP_WORDS = new Set(['de', 'del', 'con', 'en', 'a', 'al', 'la', 'el', 'los', 'las', 'para', 'y', 'un', 'una'])

// Equipo tal como lo escribe Hevy entre paréntesis, frente al campo equipment del catálogo.
const EQUIPMENT: Record<string, string[]> = {
  mancuerna: ['mancuerna'],
  barra: ['barra'],
  'barra ez': ['barra z'],
  cable: ['cable', 'polea'],
  polea: ['cable', 'polea'],
  maquina: ['maquina', 'palanca'],
  'maquina smith': ['smith'],
  'peso corporal': ['peso corporal'],
  banda: ['banda'],
  kettlebell: ['kettlebell', 'pesa rusa'],
}

// Nombres de Hevy cuya traducción no se parece a la del catálogo, por id del catálogo.
const ALIASES: Record<string, string> = {
  'press de banca inclinado (mancuerna)': 'pectorals/dumbbell-incline-bench-press',
  'press de banca (mancuerna)': 'pectorals/dumbbell-bench-press',
  'press de banca (barra)': 'pectorals/barbell-bench-press',
  'press de triceps sentado (maquina)': 'triceps/lever-seated-dip',
  'curl de muneca palmas arriba': 'forearms/dumbbell-seated-palms-up-wrist-curl',
  'curl de muneca invertido (mancuerna)': 'forearms/dumbbell-reverse-wrist-curl',
  'extension de pantorrilla (maquina)': 'calves/lever-calf-press',
  'extension de pierna': 'quads/lever-leg-extension',
  'jalon al pecho agarre cerrado (cable)': 'lats/cable-lateral-pulldown-with-v-bar',
  'press de piernas sentado': 'glutes/sled-45-leg-press-side-pov',
  'abdominal corto con cable': 'abs/cable-kneeling-crunch',
  'remo iso lateral': 'upper-back/lever-high-row',
  'jalon de dorsales con brazos rectos (polea)': 'lats/cable-straight-arm-pulldown',
  'curl con barra ez': 'biceps/ez-barbell-curl',
  'curl de pierna sentado': 'hamstrings/lever-seated-leg-curl',
  'elevacion de piernas en barras paralelas': 'abs/captains-chair-straight-leg-raise',
  'tiron a la cara': 'delts/cable-standing-rear-delt-row-with-rope',
}

// Sin equivalente en el catálogo: se crean como personalizados en su grupo muscular.
const CUSTOM_GROUPS: Record<string, string> = {
  'empuje de cadera (maquina smith)': 'Pierna',
}

export interface HevyImportPlan {
  workouts: Workout[]
  newExercises: Exercise[]
  /** Nombre en Hevy y nombre del catálogo con el que se enlazó. */
  matched: { hevyName: string; exerciseName: string }[]
  /** Entrenos que ya estaban importados: se omiten para no duplicarlos. */
  alreadyImported: number
  setCount: number
}

/**
 * Hevy exporta todo en kg aunque se registrara en lb: 50 lb llegan como 22,68. Si ningún peso del
 * ejercicio es redondo en kg y todos lo son en lb, se recupera la unidad con la que se registró.
 */
function recoverPounds(sets: WorkoutSetEntry[]): { sets: WorkoutSetEntry[]; weightUnit?: WeightUnit } {
  const weights = sets.flatMap((set) => (set.weight ? [set.weight] : []))
  const toPounds = (kg: number) => Math.round((kg / KG_PER_LB) / 1.25) * 1.25
  const isRoundInPounds = (kg: number) => Math.abs(kg / KG_PER_LB - toPounds(kg)) < 0.03
  const isRoundInKilos = (kg: number) => Math.abs(kg * 4 - Math.round(kg * 4)) < 0.001

  if (weights.length === 0 || !weights.every(isRoundInPounds) || weights.some(isRoundInKilos)) {
    return { sets }
  }
  return {
    weightUnit: 'lb',
    sets: sets.map((set) => ({
      ...set,
      weight: set.weight ? toPounds(set.weight) : set.weight,
      weightUnit: 'lb',
    })),
  }
}

interface Session {
  row: string[]
  byExercise: Map<string, WorkoutSetEntry[]>
  notes: string[]
}

export function isHevyCsv(text: string): boolean {
  const header = parseCsv(text)[0] ?? []
  return REQUIRED_COLUMNS.every((column) => header.includes(column))
}

function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char !== '"') field += char
      else if (text[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = false
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((cell) => cell !== ''))
}

/** Hevy escribe «3 nov 2026, 18:13» en el idioma del móvil. La hora es local. */
export function parseHevyDate(value: string): number | undefined {
  const match = value.trim().match(/^(\d{1,2})\s+([\p{L}.]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/u)
  if (!match) return undefined
  const month = MONTHS[match[2].toLowerCase().replace('.', '')]
  if (month === undefined) return undefined
  return new Date(+match[3], month, +match[1], +match[4], +match[5]).getTime()
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9()\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(text: string): Set<string> {
  return new Set(
    normalize(text)
      .replace(/[()]/g, ' ')
      .split(' ')
      .filter((word) => word && !STOP_WORDS.has(word))
      .map((word) => (word.length > 3 ? word.replace(/(es|s)$/, '') : word))
  )
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  for (const word of a) if (!b.has(word)) return false
  return true
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const word of a) if (b.has(word)) shared++
  return (2 * shared) / (a.size + b.size)
}

function splitEquipment(name: string): { base: string; equipment?: string } {
  const match = normalize(name).match(/^(.*)\(([^)]*)\)\s*$/)
  return match ? { base: match[1].trim(), equipment: match[2].trim() } : { base: normalize(name) }
}

function findCatalogMatch(hevyName: string, catalog: Exercise[]): Exercise | undefined {
  const alias = ALIASES[normalize(hevyName)]
  if (alias) return catalog.find((exercise) => exercise.id === alias)

  const { base, equipment } = splitEquipment(hevyName)
  const accepted = equipment ? EQUIPMENT[equipment] : undefined
  const wanted = tokens(base)
  let best: Exercise | undefined
  let bestScore = 0

  for (const exercise of catalog) {
    const exerciseEquipment = normalize(exercise.equipment ?? '')
    if (accepted && !accepted.some((option) => exerciseEquipment.includes(option))) continue
    // Todas las palabras deben aparecer: «inclinado» o «muñeca» distinguen ejercicios distintos.
    const names = [exercise.name, ...(exercise.aliases ?? [])].map(tokens).filter((name) => isSubset(wanted, name))
    const score = Math.max(0, ...names.map((name) => similarity(wanted, name)))
    if (score > bestScore) {
      best = exercise
      bestScore = score
    }
  }
  // Mejor un ejercicio personalizado que enlazar mal y ensuciar las estadísticas.
  return bestScore >= 0.6 ? best : undefined
}

function loadRememberedChoices(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CHOICES_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

// La próxima exportación de Hevy repetirá estos nombres: no hace falta volver a preguntar.
function rememberChoices(plan: HevyImportPlan, choices: Record<string, string>) {
  try {
    const remembered = loadRememberedChoices()
    for (const exercise of plan.newExercises) {
      if (choices[exercise.id]) remembered[normalize(exercise.name)] = choices[exercise.id]
    }
    localStorage.setItem(CHOICES_KEY, JSON.stringify(remembered))
  } catch {
    // Sin almacenamiento disponible se volverá a preguntar en la próxima importación.
  }
}

export function rememberHevyReplacement(name: string, fromId: string, toId: string): void {
  try {
    const remembered = loadRememberedChoices()
    remembered[normalize(name)] = toId
    for (const key of Object.keys(remembered)) {
      if (remembered[key] === fromId) {
        remembered[key] = toId
      }
    }
    localStorage.setItem(CHOICES_KEY, JSON.stringify(remembered))
  } catch {
    // Sin almacenamiento disponible se volverá a preguntar en la próxima importación.
  }
}

function hashText(text: string): string {
  let hash = 5381
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0
  return hash.toString(36)
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

function createCustomExercise(name: string, sets: WorkoutSetEntry[]): Exercise {
  const { equipment } = splitEquipment(name)
  const type: Exercise['type'] = sets.some((set) => set.weight !== undefined)
    ? 'weight_reps'
    : sets.some((set) => set.distanceM !== undefined)
      ? 'distance'
      : sets.some((set) => set.durationSec !== undefined)
        ? 'duration'
        : 'bodyweight_reps'

  return {
    id: `hevy-${hashText(normalize(name))}`,
    name,
    muscleGroup: CUSTOM_GROUPS[normalize(name)] ?? 'General',
    equipment: equipment ? equipment[0].toUpperCase() + equipment.slice(1) : 'Otro',
    type,
    isCustom: true,
  }
}

/** Lee el archivo y prepara lo que se va a añadir, sin escribir nada. */
export async function planHevyImport(text: string): Promise<HevyImportPlan> {
  const rows = parseCsv(text)
  const header = rows[0] ?? []
  if (!REQUIRED_COLUMNS.every((column) => header.includes(column))) {
    throw new Error('El archivo no es una exportación de entrenamientos de Hevy')
  }

  const column = (row: string[], name: string) => {
    const index = header.indexOf(name)
    return index < 0 ? undefined : row[index]
  }
  const unit: WeightUnit = header.includes('weight_lbs') ? 'lb' : 'kg'
  const weightColumn = unit === 'lb' ? 'weight_lbs' : 'weight_kg'

  // El orden del archivo es el de la sesión: los mapas conservan el de inserción.
  const sessions = new Map<string, Session>()
  const setsByExercise = new Map<string, WorkoutSetEntry[]>()
  let setCount = 0

  for (const row of rows.slice(1)) {
    const exerciseName = column(row, 'exercise_title')?.trim()
    const title = column(row, 'title') ?? ''
    const start = column(row, 'start_time') ?? ''
    if (!exerciseName || parseHevyDate(start) === undefined) continue

    const key = `${title}|${start}`
    const session: Session = sessions.get(key) ?? { row, byExercise: new Map(), notes: [] }
    sessions.set(key, session)

    const distanceKm = toNumber(column(row, 'distance_km'))
    const set: WorkoutSetEntry = {
      type: SET_TYPES[column(row, 'set_type') ?? ''] ?? 'normal',
      weight: toNumber(column(row, weightColumn)),
      weightUnit: unit,
      reps: toNumber(column(row, 'reps')),
      rpe: toNumber(column(row, 'rpe')),
      durationSec: toNumber(column(row, 'duration_seconds')),
      distanceM: distanceKm === undefined ? undefined : distanceKm * 1000,
      completed: true,
    }

    const sets = session.byExercise.get(exerciseName) ?? []
    if (sets.length === 0) {
      const note = column(row, 'exercise_notes')?.trim()
      if (note) session.notes.push(`${exerciseName}: ${note}`)
    }
    sets.push(set)
    session.byExercise.set(exerciseName, sets)
    setsByExercise.set(exerciseName, [...(setsByExercise.get(exerciseName) ?? []), set])
    setCount++
  }

  if (sessions.size === 0) throw new Error('El archivo no contiene entrenamientos')

  const allExercises = await db.exercises.toArray()
  const catalog = allExercises.filter((exercise) => !exercise.isCustom)
  const customByName = new Map(
    allExercises.filter((exercise) => exercise.isCustom).map((exercise) => [normalize(exercise.name), exercise])
  )

  const remembered = loadRememberedChoices()
  const idByName = new Map<string, string>()
  const newExercises: Exercise[] = []
  const matched: HevyImportPlan['matched'] = []

  for (const [name, sets] of setsByExercise) {
    const custom = customByName.get(normalize(name))
    const chosen = allExercises.find((exercise) => exercise.id === remembered[normalize(name)])
    const match = custom ?? chosen ?? findCatalogMatch(name, catalog)
    if (match) {
      idByName.set(name, match.id)
      if (!custom) matched.push({ hevyName: name, exerciseName: match.name })
    } else {
      const created = createCustomExercise(name, sets)
      newExercises.push(created)
      idByName.set(name, created.id)
    }
  }

  const candidates: Workout[] = []
  for (const [key, session] of sessions) {
    const startedAt = parseHevyDate(column(session.row, 'start_time') ?? '') as number
    const description = column(session.row, 'description')?.trim()
    const entries: WorkoutEntry[] = [...session.byExercise].map(([name, sets]) => {
      const recovered = unit === 'kg' ? recoverPounds(sets) : { sets }
      return {
        exerciseId: idByName.get(name) as string,
        weightUnit: recovered.weightUnit ?? unit,
        sets: recovered.sets,
      }
    })
    candidates.push({
      id: `hevy-${hashText(key)}`,
      name: column(session.row, 'title') || 'Entrenamiento',
      startedAt,
      finishedAt: parseHevyDate(column(session.row, 'end_time') ?? '') ?? startedAt,
      routineId: null,
      notes: [description, ...session.notes].filter(Boolean).join('\n'),
      weightUnit: unit,
      entries,
    })
  }

  const existing = new Set(await db.workouts.where('id').anyOf(candidates.map((w) => w.id)).primaryKeys())
  const workouts = candidates.filter((workout) => !existing.has(workout.id))
  const usedIds = new Set(workouts.flatMap((workout) => workout.entries.map((entry) => entry.exerciseId)))

  return {
    workouts,
    newExercises: newExercises.filter((exercise) => usedIds.has(exercise.id)),
    matched,
    alreadyImported: candidates.length - workouts.length,
    setCount: workouts.reduce(
      (total, workout) => total + workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0),
      0
    ),
  }
}

/**
 * Solo añade: nunca borra ni sustituye entrenos existentes. `choices` asocia cada ejercicio sin
 * equivalente con el elegido en HardFit; los que no estén en `choices` se crean como personalizados.
 */
export async function applyHevyImport(plan: HevyImportPlan, choices: Record<string, string> = {}): Promise<void> {
  const workouts = plan.workouts.map((workout) => ({
    ...workout,
    entries: workout.entries.map((entry) => ({
      ...entry,
      exerciseId: choices[entry.exerciseId] ?? entry.exerciseId,
    })),
  }))
  await db.transaction('rw', db.exercises, db.workouts, async () => {
    await db.exercises.bulkPut(plan.newExercises.filter((exercise) => !choices[exercise.id]))
    await db.workouts.bulkPut(workouts)
  })
  rememberChoices(plan, choices)
}
