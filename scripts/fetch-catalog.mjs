import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const CATALOG_URL = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/api/es/exercises.json'

const MUSCLE_GROUP_MAP = {
  'abs': 'Core',
  'pectorals': 'Pecho',
  'biceps': 'Bíceps',
  'glutes': 'Pierna',
  'delts': 'Hombro',
  'triceps': 'Tríceps',
  'upper-back': 'Espalda',
  'lats': 'Espalda',
  'calves': 'Pierna',
  'quads': 'Pierna',
  'forearms': 'Bíceps',
  'hamstrings': 'Pierna',
  'spine': 'Espalda',
  'traps': 'Espalda',
  'adductors': 'Pierna',
  'serratus-anterior': 'Core',
  'abductors': 'Pierna',
  'levator-scapulae': 'Espalda',
  'cardio': 'Cardio',
}

const EQUIPMENT_MAP = {
  'band': 'Banda',
  'barbell': 'Barra',
  'bodyweight': 'Peso corporal',
  'cable': 'Polea',
  'dumbbell': 'Mancuerna',
  'ez-bar': 'Barra Z',
  'kettlebell': 'Kettlebell',
  'lever': 'Máquina',
  'machine': 'Máquina',
  'other': 'Otro',
  'sled': 'Máquina',
  'smith': 'Máquina (Smith)',
}

const MUSCLE_TO_BH = {
  'abs': ['abs'],
  'pectorals': ['chest'],
  'biceps': ['biceps'],
  'glutes': ['gluteal'],
  'delts': ['front-deltoids', 'back-deltoids'],
  'triceps': ['triceps'],
  'upper-back': ['upper-back'],
  'lats': ['upper-back'],
  'calves': ['calves'],
  'quads': ['quadriceps'],
  'forearms': ['forearm'],
  'hamstrings': ['hamstring'],
  'spine': ['lower-back'],
  'traps': ['trapezius'],
  'adductors': ['adductor'],
  'serratus-anterior': ['chest'],
  'abductors': ['abductors'],
  'levator-scapulae': ['trapezius'],
  'cardio': [],
}

const MUSCLE_TO_ES = {
  'abs': 'Abdominales',
  'pectorals': 'Pecho',
  'biceps': 'Bíceps',
  'glutes': 'Glúteos',
  'delts': 'Hombros',
  'triceps': 'Tríceps',
  'upper-back': 'Espalda alta',
  'lats': 'Dorsales',
  'calves': 'Gemelos',
  'quads': 'Cuádriceps',
  'forearms': 'Antebrazos',
  'hamstrings': 'Isquiotibiales',
  'spine': 'Zona lumbar',
  'traps': 'Trapecio',
  'adductors': 'Aductores',
  'serratus-anterior': 'Serrato',
  'abductors': 'Abductores',
  'levator-scapulae': 'Cuello',
  'cardio': 'Cardio',
}

function inferType(item) {
  if (item.category === 'cardio' || item.muscle === 'cardio') {
    return 'duration'
  }
  if (item.category === 'stretching') {
    return 'duration'
  }
  if (item.equipment === 'bodyweight' || item.equipment === 'other') {
    const text = `${item.slug || ''} ${item.name || ''}`.toLowerCase()
    if (text.includes('assist')) {
      return 'bodyweight_assisted'
    }
    return 'bodyweight_reps'
  }
  return 'weight_reps'
}

function getBhKeys(muscleList) {
  const result = []
  for (const m of muscleList) {
    const keys = MUSCLE_TO_BH[m] || []
    for (const k of keys) {
      if (!result.includes(k)) {
        result.push(k)
      }
    }
  }
  return result
}

function getEsNames(muscleList) {
  const result = []
  for (const m of muscleList) {
    const name = MUSCLE_TO_ES[m]
    if (name && !result.includes(name)) {
      result.push(name)
    }
  }
  return result
}

async function main() {
  console.log(`Descargando catálogo desde ${CATALOG_URL}...`)
  const res = await fetch(CATALOG_URL)
  if (!res.ok) {
    throw new Error(`Error al descargar catálogo: ${res.status} ${res.statusText}`)
  }

  const raw = await res.json()
  const items = raw.exercises || []
  console.log(`Descargados ${items.length} ejercicios. Procesando (dedup por nombre)...`)

  const catalog = []
  const exerciseMedia = {}
  const exerciseInstructions = {}

  // Dedup por nombre (ES): el dataset trae variantes distintas que traducen al mismo nombre.
  // Conservamos la primera aparición y descartamos las repetidas.
  const seenNames = new Set()
  let skippedDup = 0

  for (const item of items) {
    const id = item.id
    const name = item.name
    const nameKey = (name || '').trim().toLowerCase()
    if (nameKey && seenNames.has(nameKey)) {
      skippedDup++
      continue
    }
    if (nameKey) seenNames.add(nameKey)
    const muscleGroup = MUSCLE_GROUP_MAP[item.muscle] || 'Core'
    const equipment = EQUIPMENT_MAP[item.equipment] || 'Otro'
    const type = inferType(item)

    catalog.push({
      id,
      name,
      muscleGroup,
      equipment,
      type,
    })

    const primaryBh = getBhKeys([item.muscle])
    const secondaryBh = getBhKeys(item.secondaryMuscles || []).filter((k) => !primaryBh.includes(k))
    const primaryEs = getEsNames([item.muscle])
    const secondaryEs = getEsNames(item.secondaryMuscles || [])

    exerciseMedia[id] = {
      gifUrl: item.gifUrl,
      primary: primaryBh,
      secondary: secondaryBh,
      primaryEs,
      secondaryEs,
    }

    if (Array.isArray(item.instructions) && item.instructions.length > 0) {
      exerciseInstructions[id] = item.instructions
    }
  }

  const catalogFilePath = path.join(rootDir, 'src', 'data', 'catalog.ts')
  const catalogContent = `// Archivo generado automáticamente por scripts/fetch-catalog.mjs
// Fuente: JahelCuadrado/ExerciseGymGifsDB (ExerciseDB en español)
import type { ExerciseType } from '../types'

export interface CatalogExercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  type: ExerciseType
}

export const catalog: CatalogExercise[] = ${JSON.stringify(catalog, null, 2)}
`

  const exerciseMediaFilePath = path.join(rootDir, 'src', 'data', 'exerciseMedia.ts')
  const exerciseMediaContent = `// Archivo generado automáticamente por scripts/fetch-catalog.mjs
// Fuente: JahelCuadrado/ExerciseGymGifsDB (ExerciseDB en español)

export type MuscleKey =
  | 'trapezius'
  | 'upper-back'
  | 'lower-back'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'back-deltoids'
  | 'front-deltoids'
  | 'abs'
  | 'obliques'
  | 'adductor'
  | 'abductors'
  | 'hamstring'
  | 'quadriceps'
  | 'calves'
  | 'gluteal'
  | 'head'
  | 'neck'

export interface ExerciseMediaItem {
  gifUrl: string
  primary: MuscleKey[]
  secondary: MuscleKey[]
  primaryEs: string[]
  secondaryEs: string[]
}

export const exerciseMedia: Record<string, ExerciseMediaItem> = ${JSON.stringify(exerciseMedia, null, 2)}
`

  const instructionsFilePath = path.join(rootDir, 'src', 'data', 'exerciseInstructions.json')
  const instructionsContent = JSON.stringify(exerciseInstructions, null, 2)

  await fs.writeFile(catalogFilePath, catalogContent, 'utf-8')
  console.log(`Guardado catálogo en ${catalogFilePath} (${catalog.length} ejercicios, ${skippedDup} duplicados por nombre descartados)`)

  await fs.writeFile(exerciseMediaFilePath, exerciseMediaContent, 'utf-8')
  console.log(`Guardado media en ${exerciseMediaFilePath} (${Object.keys(exerciseMedia).length} elementos)`)

  await fs.writeFile(instructionsFilePath, instructionsContent, 'utf-8')
  console.log(`Guardadas instrucciones separadas en ${instructionsFilePath} (${Object.keys(exerciseInstructions).length} ejercicios)`)

  const catStat = await fs.stat(catalogFilePath)
  const mediaStat = await fs.stat(exerciseMediaFilePath)
  const instStat = await fs.stat(instructionsFilePath)
  console.log(`Tamaño catalog.ts: ${(catStat.size / 1024).toFixed(1)} KB`)
  console.log(`Tamaño exerciseMedia.ts: ${(mediaStat.size / 1024).toFixed(1)} KB`)
  console.log(`Tamaño exerciseInstructions.json: ${(instStat.size / 1024).toFixed(1)} KB`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
