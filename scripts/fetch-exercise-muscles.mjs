import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function slugId(name) {
  return (
    'seed-' +
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}

const SEED_MAPPING = [
  { es: 'Press de banca plano con barra', hints: ['Barbell Bench Press - Medium Grip'] },
  { es: 'Press de banca inclinado con barra', hints: ['Barbell Incline Bench Press - Medium Grip'] },
  { es: 'Press de banca plano con mancuernas', hints: ['Dumbbell Bench Press'] },
  { es: 'Press inclinado con mancuernas', hints: ['Incline Dumbbell Press'] },
  { es: 'Aperturas planas con mancuernas', hints: ['Dumbbell Flyes'] },
  { es: 'Cruces en poleas para pecho', hints: ['Cable Crossover'] },
  { es: 'Fondos en paralelas para pecho', hints: ['Dips - Chest Version', 'Chest Dip'] },
  { es: 'Sentadilla trasera con barra', hints: ['Barbell Full Squat'] },
  { es: 'Sentadilla frontal con barra', hints: ['Front Barbell Squat'] },
  { es: 'Prensa inclinada de piernas', hints: ['Leg Press'] },
  { es: 'Extensión de cuádriceps en máquina', hints: ['Leg Extensions'] },
  { es: 'Curl femoral tumbado en máquina', hints: ['Lying Leg Curls'] },
  { es: 'Peso muerto rumano con barra', hints: ['Romanian Deadlift'] },
  { es: 'Zancadas caminando con mancuernas', hints: ['Dumbbell Walking Lunge', 'Dumbbell Lunges'] },
  { es: 'Elevación de talones de pie en máquina', hints: ['Standing Calf Raises'] },
  { es: 'Peso muerto convencional con barra', hints: ['Barbell Deadlift'] },
  { es: 'Dominadas pronas', hints: ['Pullups'] },
  { es: 'Jalón al pecho en polea alta', hints: ['Wide-Grip Lat Pulldown'] },
  { es: 'Remo con barra inclinado', hints: ['Bent Over Barbell Row'] },
  { es: 'Remo en polea baja sentado', hints: ['Seated Cable Rows'] },
  { es: 'Remo con mancuerna a una mano', hints: ['One-Arm Dumbbell Row'] },
  { es: 'Pullover con polea alta', hints: ['Straight-Arm Pulldown'] },
  { es: 'Press militar de pie con barra', hints: ['Standing Military Press'] },
  { es: 'Press de hombros sentado con mancuernas', hints: ['Seated Dumbbell Press'] },
  { es: 'Elevaciones laterales con mancuernas', hints: ['Side Lateral Raise'] },
  { es: 'Elevaciones laterales en polea', hints: ['Cable Lateral Raise', 'Cable Seated Lateral Raise', 'Side Lateral Raise'] },
  { es: 'Pájaros con mancuernas (posterior)', hints: ['Bent Over Dumbbell Rear Delt Raise With Head On Bench'] },
  { es: 'Face pull con cuerda en polea', hints: ['Face Pull'] },
  { es: 'Encogimiento de hombros con barra', hints: ['Barbell Shrug'] },
  { es: 'Curl de bíceps con barra recta', hints: ['Barbell Curl'] },
  { es: 'Curl alterno con mancuernas', hints: ['Dumbbell Alternate Bicep Curl'] },
  { es: 'Curl martillo con mancuernas', hints: ['Hammer Curls'] },
  { es: 'Curl predicador en banco Scott', hints: ['Preacher Curl'] },
  { es: 'Extensión de tríceps en polea con cuerda', hints: ['Triceps Pushdown - Rope Attachment'] },
  { es: 'Press francés con barra Z', hints: ['Lying Triceps Press'] },
  { es: 'Fondos entre bancos para tríceps', hints: ['Bench Dips'] },
  { es: 'Extensión unilateral tras nuca con mancuerna', hints: ['Standing One-Arm Dumbbell Triceps Extension'] },
  { es: 'Plancha isométrica en suelo', hints: ['Plank'] },
  { es: 'Elevación de piernas suspendido en barra', hints: ['Hanging Leg Raise'] },
  { es: 'Rueda abdominal en suelo', hints: ['Barbell Ab Rollout - On Knees', 'Ab Roller'] },
  { es: 'Crunch en polea alta arrodillado', hints: ['Cable Crunch'] },
  { es: 'Carrera continua en cinta', hints: [] },
]

const DB_TO_MUSCLE_KEY = {
  chest: ['chest'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  triceps: ['triceps'],
  biceps: ['biceps'],
  forearms: ['forearm'],
  lats: ['upper-back'],
  'middle back': ['upper-back'],
  'lower back': ['lower-back'],
  traps: ['trapezius'],
  neck: ['neck'],
  quadriceps: ['quadriceps'],
  hamstrings: ['hamstring'],
  calves: ['calves'],
  glutes: ['gluteal'],
  abdominals: ['abs'],
  obliques: ['obliques'],
  abductors: ['abductors'],
  adductors: ['adductor'],
}

const MUSCLE_ES = {
  chest: 'Pecho',
  'front-deltoids': 'Deltoides anterior',
  'back-deltoids': 'Deltoides posterior',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  forearm: 'Antebrazo',
  'upper-back': 'Espalda alta/Dorsal',
  'lower-back': 'Espalda baja',
  trapezius: 'Trapecio',
  neck: 'Cuello',
  quadriceps: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  calves: 'Gemelos',
  gluteal: 'Glúteos',
  abs: 'Abdominales',
  obliques: 'Oblicuos',
  abductors: 'Abductores',
  adductor: 'Aductores',
}

function translateMuscles(dbMusclesList) {
  const keys = []
  if (!Array.isArray(dbMusclesList)) return keys

  for (const raw of dbMusclesList) {
    const norm = String(raw).toLowerCase().trim()
    const mapped = DB_TO_MUSCLE_KEY[norm]
    if (mapped) {
      for (const k of mapped) {
        if (!keys.includes(k)) {
          keys.push(k)
        }
      }
    } else {
      console.warn(`[WARN] Músculo no mapeado: "${raw}"`)
    }
  }
  return keys
}

function getSpanishNames(muscleKeys) {
  const names = []
  for (const k of muscleKeys) {
    const es = MUSCLE_ES[k] || k
    if (!names.includes(es)) {
      names.push(es)
    }
  }
  return names
}

const EXERCISES_JSON_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

async function main() {
  console.log('Descargando exercises.json desde GitHub...')
  const res = await fetch(EXERCISES_JSON_URL)
  if (!res.ok) {
    throw new Error(`Error descargando exercises.json: HTTP ${res.status}`)
  }
  const dbExercises = await res.json()
  console.log(`Catálogo cargado: ${dbExercises.length} ejercicios.`)

  const exerciseMusclesMap = {}
  let countWithData = 0
  let countWithoutData = 0
  const missingList = []

  for (const { es, hints } of SEED_MAPPING) {
    const slug = slugId(es)

    // Caso especial "Carrera continua en cinta"
    if (es === 'Carrera continua en cinta') {
      const primary = ['quadriceps', 'hamstring', 'calves', 'gluteal']
      const secondary = []
      exerciseMusclesMap[slug] = {
        primary,
        secondary,
        primaryEs: getSpanishNames(primary),
        secondaryEs: getSpanishNames(secondary),
      }
      countWithData++
      console.log(`[OK - Cardio manual] ${es}`)
      continue
    }

    let matchedItem = null
    for (const hint of hints) {
      matchedItem = dbExercises.find(
        (x) => x.name.toLowerCase().trim() === hint.toLowerCase().trim()
      )
      if (matchedItem) break
    }

    if (!matchedItem && hints.length > 0) {
      for (const hint of hints) {
        matchedItem = dbExercises.find(
          (x) =>
            x.name.toLowerCase().includes(hint.toLowerCase()) ||
            hint.toLowerCase().includes(x.name.toLowerCase())
        )
        if (matchedItem) break
      }
    }

    if (!matchedItem) {
      console.warn(`[MISSING] No match para "${es}"`)
      missingList.push(es)
      countWithoutData++
      continue
    }

    const primary = translateMuscles(matchedItem.primaryMuscles || [])
    let secondary = translateMuscles(matchedItem.secondaryMuscles || [])

    // Evitar que secondary duplique los primarios
    secondary = secondary.filter((m) => !primary.includes(m))

    const primaryEs = getSpanishNames(primary)
    const secondaryEs = getSpanishNames(secondary)

    exerciseMusclesMap[slug] = {
      primary,
      secondary,
      primaryEs,
      secondaryEs,
    }
    countWithData++
    console.log(`[OK] ${es} -> Primarios: ${primary.join(', ')} | Secundarios: ${secondary.join(', ')}`)
  }

  // Generar src/data/exerciseMuscles.ts
  const dataDir = path.join(projectRoot, 'src', 'data')
  await fs.mkdir(dataDir, { recursive: true })

  const tsContent = `// Archivo generado automáticamente por scripts/fetch-exercise-muscles.mjs
// Fuente: yuhonas/free-exercise-db (The Unlicense - Dominio Público)

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

export interface ExerciseMuscles {
  primary: MuscleKey[]
  secondary: MuscleKey[]
  primaryEs: string[]
  secondaryEs: string[]
}

export const exerciseMuscles: Record<string, ExerciseMuscles> = ${JSON.stringify(
    exerciseMusclesMap,
    null,
    2
  )}
`

  const targetTsFile = path.join(dataDir, 'exerciseMuscles.ts')
  await fs.writeFile(targetTsFile, tsContent, 'utf-8')
  console.log(`\nArchivo generado con éxito: ${targetTsFile}`)
  console.log(`Ejercicios con datos: ${countWithData} / ${SEED_MAPPING.length}`)
  if (missingList.length > 0) {
    console.log(`Ejercicios sin datos: ${missingList.join(', ')}`)
  }
}

main().catch((err) => {
  console.error('Error fatal en el script:', err)
  process.exit(1)
})
