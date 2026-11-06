import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyCatalogAdditions } from './catalog-additions.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Lista de overrides por movimiento conocido.
// Se ordenan por longitud de patrón descendente para evaluar las frases más específicas primero.
const OVERRIDES = [
  // Bench press
  { pattern: 'incline-bench-press', base: 'Press inclinado', key: 'bench-press' },
  { pattern: 'decline-bench-press', base: 'Press declinado', key: 'bench-press' },
  { pattern: 'bench-press', base: 'Press de banca', key: 'bench-press' },
  // Shoulder press / overhead / military
  { pattern: 'shoulder-press', base: 'Press militar', key: 'shoulder-press' },
  { pattern: 'overhead-press', base: 'Press militar', key: 'shoulder-press' },
  { pattern: 'military-press', base: 'Press militar', key: 'shoulder-press' },
  // Deadlifts
  { pattern: 'romanian-deadlift', base: 'Peso muerto rumano', key: 'deadlift' },
  { pattern: 'stiff-legged-deadlift', base: 'Peso muerto piernas rígidas', key: 'deadlift' },
  { pattern: 'stiff-leg-deadlift', base: 'Peso muerto piernas rígidas', key: 'deadlift' },
  { pattern: 'sumo-deadlift', base: 'Peso muerto sumo', key: 'deadlift' },
  { pattern: 'deadlift(s)?', base: 'Peso muerto', key: 'deadlift' },
  // Squats
  { pattern: 'split-squat(s)?', base: 'Sentadilla búlgara', key: 'split-squat' },
  { pattern: 'front-squat(s)?', base: 'Sentadilla frontal', key: 'squat' },
  { pattern: 'hack-squat(s)?', base: 'Sentadilla hack', key: 'squat' },
  { pattern: 'goblet-squat(s)?', base: 'Sentadilla goblet', key: 'squat' },
  { pattern: 'squat(s)?', base: 'Sentadilla', key: 'squat' },
  // Lunge / hip-thrust / glute-bridge
  { pattern: 'hip-thrust(s)?', base: 'Empuje de cadera', key: 'hip-thrust' },
  { pattern: 'glute-bridge(s)?', base: 'Puente de glúteos', key: 'glute-bridge' },
  { pattern: 'lunge(s)?', base: 'Zancada', key: 'lunge' },
  // Calf raise / leg press / leg extension / leg curl
  { pattern: 'calf-raise(s)?', base: 'Elevación de talones', key: 'calf-raise' },
  { pattern: 'leg-press(es)?', base: 'Prensa de piernas', key: 'leg-press' },
  { pattern: 'leg-extension(s)?', base: 'Extensión de cuádriceps', key: 'leg-extension' },
  { pattern: 'lying-leg-curl(s)?', base: 'Curl femoral', key: 'leg-curl' },
  { pattern: 'seated-leg-curl(s)?', base: 'Curl femoral', key: 'leg-curl' },
  { pattern: 'leg-curl(s)?', base: 'Curl femoral', key: 'leg-curl' },
  // Lat pulldown / pull-up / chin-up / pullover / face-pull
  { pattern: 'lat-pulldown(s)?', base: 'Jalón al pecho', key: 'pulldown' },
  { pattern: 'pulldown(s)?', base: 'Jalón al pecho', key: 'pulldown' },
  { pattern: 'pull-up(s)?', base: 'Dominadas', key: 'pull-up' },
  { pattern: 'chin-up(s)?', base: 'Dominadas supinas', key: 'chin-up' },
  { pattern: 'pull-over(s)?', base: 'Pullover', key: 'pullover' },
  { pattern: 'pullover(s)?', base: 'Pullover', key: 'pullover' },
  { pattern: 'face-pull(s)?', base: 'Face pull', key: 'face-pull' },
  // Rows
  { pattern: 'bent-over-row(s)?', base: 'Remo inclinado', key: 'row' },
  { pattern: 'seated-row(s)?', base: 'Remo sentado', key: 'row' },
  { pattern: 'upright-row(s)?', base: 'Remo al mentón', key: 'row' },
  { pattern: 'row(s)?', base: 'Remo', key: 'row' },
  // Curls
  { pattern: 'hammer-curl(s)?', base: 'Curl martillo', key: 'curl' },
  { pattern: 'preacher-curl(s)?', base: 'Curl predicador', key: 'curl' },
  { pattern: 'concentration-curl(s)?', base: 'Curl concentrado', key: 'curl' },
  { pattern: 'biceps-curl(s)?', base: 'Curl de bíceps', key: 'curl' },
  { pattern: 'bicep-curl(s)?', base: 'Curl de bíceps', key: 'curl' },
  { pattern: 'curl(s)?', base: 'Curl de bíceps', key: 'curl' },
  // Triceps
  { pattern: '(?:triceps?-extension-)?skull-?crusher(s)?', base: 'Rompecráneos', key: 'skull-crusher' },
  { pattern: 'triceps-pushdown(s)?', base: 'Extensión de tríceps en polea', key: 'pushdown' },
  { pattern: 'tricep-pushdown(s)?', base: 'Extensión de tríceps en polea', key: 'pushdown' },
  { pattern: 'pushdown(s)?', base: 'Extensión de tríceps en polea', key: 'pushdown' },
  { pattern: 'triceps-extension(s)?', base: 'Extensión de tríceps', key: 'triceps-extension' },
  { pattern: 'tricep-extension(s)?', base: 'Extensión de tríceps', key: 'triceps-extension' },
  { pattern: 'triceps-dip(s)?', base: 'Fondos', key: 'dip' },
  { pattern: 'tricep-dip(s)?', base: 'Fondos', key: 'dip' },
  { pattern: 'dip(s)?', base: 'Fondos', key: 'dip' },
  // Lateral raise, front raise, flyes
  { pattern: 'lateral-raise(s)?', base: 'Elevaciones laterales', key: 'lateral-raise' },
  { pattern: 'side-raise(s)?', base: 'Elevaciones laterales', key: 'lateral-raise' },
  { pattern: 'front-raise(s)?', base: 'Elevaciones frontales', key: 'front-raise' },
  { pattern: 'rear-deltoid-fly(s|es)?', base: 'Aperturas posteriores', key: 'rear-delt-fly' },
  { pattern: 'rear-delt-fly(s|es)?', base: 'Aperturas posteriores', key: 'rear-delt-fly' },
  { pattern: 'reverse-fly(s|es)?', base: 'Aperturas posteriores', key: 'rear-delt-fly' },
  { pattern: 'flye(s)?', base: 'Aperturas', key: 'fly' },
  { pattern: 'fly(s|es)?', base: 'Aperturas', key: 'fly' },
  // Shrugs, push-ups, core
  { pattern: 'shrug(s)?', base: 'Encogimiento de hombros', key: 'shrug' },
  { pattern: 'push-up(s)?', base: 'Flexiones', key: 'push-up' },
  { pattern: 'crunch(es)?', base: 'Crunch abdominal', key: 'crunch' },
  { pattern: 'sit-up(s)?', base: 'Abdominales', key: 'sit-up' },
  { pattern: 'plank(s)?', base: 'Plancha', key: 'plank' },
  { pattern: 'russian-twist(s)?', base: 'Giro ruso', key: 'russian-twist' },
  { pattern: 'leg-raise(s)?', base: 'Elevación de piernas', key: 'leg-raise' },
  { pattern: 'hip-abduction(s)?', base: 'Abducción de cadera', key: 'hip-abduction' },
  { pattern: 'hip-adduction(s)?', base: 'Aducción de cadera', key: 'hip-adduction' }
]

// Ordenar por longitud de patrón descendente (más largas primero)
OVERRIDES.sort((a, b) => b.pattern.length - a.pattern.length)

// Modificadores (con regla de omisión si ya están implícitos en la base)
const MODIFIERS = [
  {
    pattern: /(?:^|-)(?:single-leg|one-leg)(?:-|$)/,
    text: 'a una pierna',
    skipIf: (base) => base === 'Sentadilla búlgara' || base.includes('pierna')
  },
  {
    pattern: /(?:^|-)(?:single-arm|one-arm)(?:-|$)/,
    text: 'a un brazo',
    skipIf: (base) => base.includes('brazo')
  },
  {
    pattern: /(?:^|-)seated(?:-|$)/,
    text: 'sentado',
    skipIf: (base) => base.toLowerCase().includes('sentad')
  },
  {
    pattern: /(?:^|-)standing(?:-|$)/,
    text: 'de pie',
    skipIf: (base) => base.toLowerCase().includes('de pie')
  },
  {
    pattern: /(?:^|-)lying(?:-|$)/,
    text: 'tumbado',
    skipIf: (base) => base.toLowerCase().includes('tumbad')
  },
  {
    pattern: /(?:^|-)incline(?:-|$)/,
    text: 'inclinado',
    skipIf: (base) => base.toLowerCase().includes('inclinad')
  },
  {
    pattern: /(?:^|-)decline(?:-|$)/,
    text: 'declinado',
    skipIf: (base) => base.toLowerCase().includes('declinad')
  },
  {
    pattern: /(?:^|-)reverse(?:-|$)/,
    text: 'inverso',
    skipIf: (base) =>
      base.toLowerCase().includes('invers') ||
      base.toLowerCase().includes('supina') ||
      base.toLowerCase().includes('posterior')
  },
  {
    pattern: /(?:^|-)(?:close-grip|narrow-grip)(?:-|$)/,
    text: 'agarre cerrado',
    skipIf: (base) => base.toLowerCase().includes('agarre')
  },
  {
    pattern: /(?:^|-)wide-grip(?:-|$)/,
    text: 'agarre abierto',
    skipIf: (base) => base.toLowerCase().includes('agarre')
  },
  {
    pattern: /(?:^|-)(?:behind-the-neck|behind-neck)(?:-|$)/,
    text: 'tras nuca',
    skipIf: (base) => base.toLowerCase().includes('tras nuca')
  }
]

// Equipamiento (detectado en el slug, en orden de especificidad)
const EQUIPMENTS = [
  { pattern: /(?:^|-)(?:ez-barbell|ez-bar)(?:-|$)/, text: 'con barra Z', keyword: 'barra z' },
  { pattern: /(?:^|-)smith(?:-machine)?(?:-|$)/, text: 'en máquina Smith', keyword: 'smith' },
  { pattern: /(?:^|-)(?:resistance-band|band)(?:-|$)/, text: 'con banda', keyword: 'banda' },
  { pattern: /(?:^|-)dumbbell(?:-|$)/, text: 'con mancuernas', keyword: 'mancuerna' },
  { pattern: /(?:^|-)barbell(?:-|$)/, text: 'con barra', keyword: 'barra' },
  { pattern: /(?:^|-)cable(?:-|$)/, text: 'en polea', keyword: 'polea' },
  { pattern: /(?:^|-)(?:lever|machine)(?:-|$)/, text: 'en máquina', keyword: 'máquina' },
  { pattern: /(?:^|-)kettlebell(?:-|$)/, text: 'con kettlebell', keyword: 'kettlebell' },
  { pattern: /(?:^|-)weighted(?:-|$)/, text: 'con peso', keyword: 'peso' },
  { pattern: /(?:^|-)plate(?:-|$)/, text: 'con disco', keyword: 'disco' }
]

// Mapa de sinónimos comunes de gimnasio por clave de movimiento
const SYNONYM_MAP = {
  'split-squat': ['búlgara', 'búlgaras', 'bulgara', 'sentadilla bulgara'],
  'bench-press': ['press pecho', 'press banca', 'pecho plano'],
  'shoulder-press': ['press hombro', 'press militar'],
  'deadlift': ['peso muerto'],
  'squat': ['sentadilla', 'sentadillas'],
  'hip-thrust': ['hip thrust', 'empuje de cadera'],
  'glute-bridge': ['puente de glúteos', 'puente de gluteos'],
  'lunge': ['zancadas', 'estocadas', 'desplantes'],
  'calf-raise': ['pantorrilla', 'gemelos', 'pantorrillas'],
  'leg-press': ['prensa'],
  'leg-extension': ['extensión de cuádriceps', 'extension de cuadriceps'],
  'leg-curl': ['curl femoral', 'femoral', 'isquios'],
  'pulldown': ['jalón', 'jalon', 'dominadas en polea'],
  'pull-up': ['dominadas'],
  'chin-up': ['dominadas supinas'],
  'pullover': ['pull over'],
  'face-pull': ['face pull'],
  'row': ['remo'],
  'curl': ['curl de bíceps', 'curl biceps'],
  'skull-crusher': ['rompecráneos', 'rompecraneos', 'press francés', 'press frances'],
  'pushdown': ['extensión de tríceps en polea', 'extension de triceps en polea'],
  'triceps-extension': ['extensión de tríceps', 'extension de triceps'],
  'dip': ['fondos', 'paralelas'],
  'lateral-raise': ['elevaciones laterales', 'laterales', 'vuelos laterales'],
  'front-raise': ['elevaciones frontales', 'frontales'],
  'rear-delt-fly': ['aperturas posteriores', 'pájaros', 'pajaros'],
  'fly': ['aperturas', 'contractor'],
  'shrug': ['encogimiento de hombros', 'encogimientos'],
  'push-up': ['flexiones', 'lagartijas'],
  'crunch': ['crunch', 'abdominales'],
  'sit-up': ['abdominales', 'sit up'],
  'plank': ['plancha', 'plancha abdominal'],
  'russian-twist': ['giro ruso', 'twist ruso'],
  'leg-raise': ['elevación de piernas', 'elevacion de piernas'],
  'hip-abduction': ['abducción de cadera', 'abduccion de cadera', 'abductores'],
  'hip-adduction': ['aducción de cadera', 'aduccion de cadera', 'aductores']
}

function generateNewName(slug, originalName) {
  let matchedOverride = null
  for (const o of OVERRIDES) {
    const rx = new RegExp('(?:^|-)' + o.pattern + '(?:-|$)')
    if (rx.test(slug)) {
      matchedOverride = o
      break
    }
  }

  // Fallback seguro: mantener nombre original
  if (!matchedOverride) {
    return { name: originalName, isOverride: false, key: null }
  }

  const base = matchedOverride.base

  // Modificadores
  const mods = []
  for (const m of MODIFIERS) {
    if (m.pattern.test(slug)) {
      if (!m.skipIf(base)) {
        mods.push(m.text)
      }
    }
  }

  // Equipamiento
  let eq = ''
  for (const e of EQUIPMENTS) {
    if (e.pattern.test(slug)) {
      if (!base.toLowerCase().includes(e.keyword)) {
        eq = e.text
      }
      break
    }
  }

  // Ensamblar: "<Base> [modificadores] [equipo]"
  const parts = [base, ...mods, eq].filter(Boolean)
  let assembled = parts.join(' ').replace(/\s+/g, ' ').trim()
  assembled = assembled.charAt(0).toUpperCase() + assembled.slice(1)

  return { name: assembled, isOverride: true, key: matchedOverride.key }
}

function buildAliases(originalName, newName, key) {
  const aliases = []
  const seen = new Set()

  function add(str) {
    if (!str) return
    const trimmed = str.trim()
    if (!trimmed) return
    const lower = trimmed.toLowerCase()
    if (seen.has(lower)) return
    // Evitar duplicar el nombre nuevo (a menos que sea el nombre viejo preservado)
    if (aliases.length > 0 && lower === newName.toLowerCase()) return
    seen.add(lower)
    aliases.push(trimmed)
  }

  // 1) Nombre original (viejo)
  add(originalName)

  // 2) Sinónimos comunes del movimiento si aplica
  if (key && SYNONYM_MAP[key]) {
    for (const syn of SYNONYM_MAP[key]) {
      add(syn)
    }
  }

  return aliases
}

async function main() {
  const catalogPath = path.join(rootDir, 'src', 'data', 'catalog.ts')
  const content = await fs.readFile(catalogPath, 'utf-8')

  const startMarker = 'export const catalog: CatalogExercise[] = ['
  const startIndex = content.indexOf(startMarker)
  if (startIndex === -1) {
    throw new Error(`No se encontró el array catalog en ${catalogPath}`)
  }

  const jsonStart = startIndex + startMarker.length - 1
  const jsonEnd = content.lastIndexOf(']') + 1
  const rawJson = content.slice(jsonStart, jsonEnd)
  const existingCatalog = JSON.parse(rawJson)

  console.log(`Leídos ${existingCatalog.length} ejercicios de catalog.ts`)

  let renamedCount = 0
  let fallbackCount = 0
  const sampleChanges = []

  const updatedCatalog = existingCatalog.map((entry) => {
    const slug = entry.id.split('/')[1]
    // Preservar nombre original viejo para que la ejecución sea idempotente
    const originalName = (entry.aliases && entry.aliases[0]) || entry.name

    const { name: newName, isOverride, key } = generateNewName(slug, originalName)
    const aliases = buildAliases(originalName, newName, key)

    if (isOverride && newName !== originalName) {
      renamedCount++
      if (sampleChanges.length < 5) {
        sampleChanges.push({
          id: entry.id,
          before: originalName,
          after: newName,
          aliases
        })
      }
    } else {
      fallbackCount++
    }

    const updated = {
      id: entry.id,
      name: newName,
      muscleGroup: entry.muscleGroup,
      equipment: entry.equipment,
      type: entry.type
    }

    if (aliases.length > 0) {
      updated.aliases = aliases
    }

    if (entry.id === 'calves/lever-seated-squat-calf-raise-on-leg-press-machine') {
      updated.name = 'Prensa horizontal'
      updated.aliases = [...new Set([...(entry.aliases || []), entry.name, ...(updated.aliases || []), 'Prensa horizontal', 'Prensa horizontal de piernas'])]
    }

    return updated
  })

  applyCatalogAdditions(updatedCatalog)

  const newCatalogContent = `// Archivo generado automáticamente por scripts/fetch-catalog.mjs
// Fuente: JahelCuadrado/ExerciseGymGifsDB (ExerciseDB en español)
import type { ExerciseType } from '../types'

export interface CatalogExercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  type: ExerciseType
  aliases?: string[]
}

export const catalog: CatalogExercise[] = ${JSON.stringify(updatedCatalog, null, 2)}
`

  await fs.writeFile(catalogPath, newCatalogContent, 'utf-8')

  console.log('\n--- RESULTADOS DEL RENOMBRADO ---')
  console.log(`Total ejercicios: ${updatedCatalog.length}`)
  console.log(`Nombres actualizados: ${renamedCount}`)
  console.log(`Nombres mantenidos (fallback o sin cambios): ${fallbackCount}`)
  console.log('\n5 Ejemplos Antes -> Después:')
  for (const s of sampleChanges) {
    console.log(`- [${s.id}]`)
    console.log(`  Antes:   "${s.before}"`)
    console.log(`  Después: "${s.after}"`)
    console.log(`  Aliases: ${JSON.stringify(s.aliases.slice(0, 4))}`)
  }
}

main().catch((err) => {
  console.error('Error en rename-catalog:', err)
  process.exit(1)
})
