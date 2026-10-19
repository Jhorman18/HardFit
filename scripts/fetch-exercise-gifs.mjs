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

function parseCSV(text) {
  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentField)
        currentField = ''
      } else if (char === '\r') {
        // ignore CR
      } else if (char === '\n') {
        currentRow.push(currentField)
        currentField = ''
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
      } else {
        currentField += char
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }
  return rows
}

const SEED_MAPPING = [
  { es: 'Press de banca plano con barra', hints: ['barbell bench press'] },
  { es: 'Press de banca inclinado con barra', hints: ['barbell incline bench press'] },
  { es: 'Press de banca plano con mancuernas', hints: ['dumbbell bench press'] },
  { es: 'Press inclinado con mancuernas', hints: ['dumbbell incline bench press'] },
  { es: 'Aperturas planas con mancuernas', hints: ['dumbbell fly', 'dumbbell flyes'] },
  { es: 'Cruces en poleas para pecho', hints: ['cable cross-over variation', 'cable cross-over', 'cable standing up straight crossovers', 'cable chest press'], target: 'pectorals' },
  { es: 'Fondos en paralelas para pecho', hints: ['chest dip'] },
  { es: 'Sentadilla trasera con barra', hints: ['barbell full squat', 'barbell squat'] },
  { es: 'Sentadilla frontal con barra', hints: ['barbell front squat'] },
  { es: 'Prensa inclinada de piernas', hints: ['sled 45в° leg press', 'sled 45° leg press', 'sled 45 leg press', 'lever leg press'] },
  { es: 'Extensión de cuádriceps en máquina', hints: ['lever leg extension', 'leg extension'] },
  { es: 'Curl femoral tumbado en máquina', hints: ['lever lying leg curl', 'lying leg curl'] },
  { es: 'Peso muerto rumano con barra', hints: ['barbell romanian deadlift'] },
  { es: 'Zancadas caminando con mancuernas', hints: ['dumbbell walking lunge', 'dumbbell lunge'] },
  { es: 'Elevación de talones de pie en máquina', hints: ['lever standing calf raise', 'standing calf raise'] },
  { es: 'Peso muerto convencional con barra', hints: ['barbell deadlift'] },
  { es: 'Dominadas pronas', hints: ['pull-up'], filter: (it) => !it.name.includes('assisted') },
  { es: 'Jalón al pecho en polea alta', hints: ['cable pulldown', 'lat pulldown'] },
  { es: 'Remo con barra inclinado', hints: ['barbell bent over row'] },
  { es: 'Remo en polea baja sentado', hints: ['cable seated row'] },
  { es: 'Remo con mancuerna a una mano', hints: ['dumbbell one arm bent-over row', 'dumbbell one arm row', 'dumbbell bent over row'] },
  { es: 'Pullover con polea alta', hints: ['cable straight arm pulldown', 'cable lying extension pullover', 'cable pullover', 'dumbbell pullover'] },
  { es: 'Press militar de pie con barra', hints: ['barbell standing close grip military press', 'barbell standing wide military press', 'barbell standing military press', 'barbell overhead press'] },
  { es: 'Press de hombros sentado con mancuernas', hints: ['dumbbell seated shoulder press'] },
  { es: 'Elevaciones laterales con mancuernas', hints: ['dumbbell lateral raise'] },
  { es: 'Elevaciones laterales en polea', hints: ['cable lateral raise'] },
  { es: 'Pájaros con mancuernas (posterior)', hints: ['dumbbell rear delt row_shoulder', 'dumbbell rear delt row', 'dumbbell rear lateral raise', 'dumbbell bent over lateral raise'] },
  { es: 'Face pull con cuerda en polea', hints: ['cable rear delt row (with rope)', 'cable face pull', 'cable rear delt row'] },
  { es: 'Encogimiento de hombros con barra', hints: ['barbell shrug'] },
  { es: 'Curl de bíceps con barra recta', hints: ['barbell curl'] },
  { es: 'Curl alterno con mancuernas', hints: ['dumbbell alternate biceps curl'] },
  { es: 'Curl martillo con mancuernas', hints: ['dumbbell hammer curl', 'dumbbell alternate hammer curl'] },
  { es: 'Curl predicador en banco Scott', hints: ['barbell preacher curl', 'dumbbell preacher curl'] },
  { es: 'Extensión de tríceps en polea con cuerda', hints: ['cable pushdown', 'cable rope pushdown'] },
  { es: 'Press francés con barra Z', hints: ['ez barbell lying triceps extension', 'barbell lying triceps extension', 'barbell lying triceps extension skull crusher'] },
  { es: 'Fondos entre bancos para tríceps', hints: ['triceps dip', 'bench dip'] },
  { es: 'Extensión unilateral tras nuca con mancuerna', hints: ['dumbbell one arm triceps extension (on bench)', 'dumbbell one arm triceps extension'] },
  { es: 'Plancha isométrica en suelo', hints: ['front plank', 'plank'] },
  { es: 'Elevación de piernas suspendido en barra', hints: ['hanging leg raise', 'hanging straight leg raise'] },
  { es: 'Rueda abdominal en suelo', hints: ['wheel rollerout', 'wheel rollout'] },
  { es: 'Crunch en polea alta arrodillado', hints: ['cable kneeling crunch', 'cable crunch'] },
  { es: 'Carrera continua en cinta', hints: ['run', 'treadmill running'] },
]

const CSV_URL = 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/exercises.csv'
const ASSET_BASE_URL = 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/'

async function main() {
  console.log('1. Descargando exercises.csv desde GitHub...')
  const csvRes = await fetch(CSV_URL)
  if (!csvRes.ok) {
    throw new Error(`Error descargando exercises.csv: HTTP ${csvRes.status}`)
  }
  const csvText = await csvRes.text()
  const rows = parseCSV(csvText)
  const items = rows.slice(1).map((r) => ({
    bodyPart: r[0],
    equipment: r[1],
    id: r[2],
    name: r[3],
    target: r[4],
  }))
  console.log(`Catálogo CSV cargado con éxito: ${items.length} ejercicios disponibles.`)

  const publicExercisesDir = path.join(projectRoot, 'public', 'exercises')
  await fs.mkdir(publicExercisesDir, { recursive: true })

  const exerciseGifsMap = {}
  const summaryMatches = []
  const withoutGif = []

  console.log('\n2. Buscando coincidencias y descargando animaciones GIF...')

  for (const seed of SEED_MAPPING) {
    const slug = slugId(seed.es)
    let match = null

    // Exact hint match
    for (const hint of seed.hints) {
      match = items.find((it) => {
        if (seed.filter && !seed.filter(it)) return false
        if (seed.target && it.target !== seed.target) return false
        return it.name.toLowerCase().trim() === hint.toLowerCase().trim()
      })
      if (match) break
    }

    // Substring hint match
    if (!match) {
      for (const hint of seed.hints) {
        match = items.find((it) => {
          if (seed.filter && !seed.filter(it)) return false
          if (seed.target && it.target !== seed.target) return false
          const itName = it.name.toLowerCase().trim()
          const h = hint.toLowerCase().trim()
          return itName.includes(h) || h.includes(itName)
        })
        if (match) break
      }
    }

    // Fallback without target constraint
    if (!match && seed.target) {
      for (const hint of seed.hints) {
        match = items.find((it) => {
          if (seed.filter && !seed.filter(it)) return false
          const itName = it.name.toLowerCase().trim()
          const h = hint.toLowerCase().trim()
          return itName === h || itName.includes(h)
        })
        if (match) break
      }
    }

    if (!match) {
      console.warn(`[SIN MATCH] ${seed.es}`)
      withoutGif.push({ es: seed.es, reason: 'Sin coincidencia en CSV' })
      continue
    }

    const targetDir = path.join(publicExercisesDir, slug)
    await fs.mkdir(targetDir, { recursive: true })

    const gifUrl = `${ASSET_BASE_URL}${match.id}.gif`
    const targetGifPath = path.join(targetDir, 'demo.gif')

    try {
      const gifRes = await fetch(gifUrl)
      if (gifRes.ok) {
        const buffer = Buffer.from(await gifRes.arrayBuffer())
        if (buffer.length > 0) {
          await fs.writeFile(targetGifPath, buffer)
          exerciseGifsMap[slug] = `/exercises/${slug}/demo.gif`
          summaryMatches.push({
            es: seed.es,
            en: match.name,
            id: match.id,
            slug,
            sizeKb: Math.round(buffer.length / 1024),
          })
          console.log(
            `[OK] ${seed.es} -> "${match.name}" (id: ${match.id}, ${Math.round(buffer.length / 1024)} KB)`
          )
        } else {
          console.warn(`[ERROR] Archivo vacío recibido para ${gifUrl}`)
          withoutGif.push({ es: seed.es, reason: 'Archivo GIF vacío' })
        }
      } else {
        console.warn(`[HTTP ${gifRes.status}] Error descargando ${gifUrl}`)
        withoutGif.push({ es: seed.es, reason: `HTTP ${gifRes.status} al descargar GIF` })
      }
    } catch (err) {
      console.warn(`Error de red descargando ${gifUrl}:`, err.message)
      withoutGif.push({ es: seed.es, reason: `Error de red: ${err.message}` })
    }
  }

  // 3. Eliminar JPGs viejos en public/exercises
  console.log('\n3. Limpiando JPGs antiguos de public/exercises...')
  try {
    const entries = await fs.readdir(publicExercisesDir, { withFileTypes: true })
    let deletedJpgs = 0
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(publicExercisesDir, entry.name)
        const subFiles = await fs.readdir(subDir)
        for (const f of subFiles) {
          if (f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg')) {
            await fs.unlink(path.join(subDir, f))
            deletedJpgs++
          }
        }
      } else if (entry.isFile()) {
        if (entry.name.toLowerCase().endsWith('.jpg') || entry.name.toLowerCase().endsWith('.jpeg')) {
          await fs.unlink(path.join(publicExercisesDir, entry.name))
          deletedJpgs++
        }
      }
    }
    console.log(`Eliminados ${deletedJpgs} archivos JPG viejos.`)
  } catch (err) {
    console.warn('Advertencia al limpiar JPGs viejos:', err.message)
  }

  // 4. Generar src/data/exerciseGifs.ts
  console.log('\n4. Generando src/data/exerciseGifs.ts...')
  const dataDir = path.join(projectRoot, 'src', 'data')
  await fs.mkdir(dataDir, { recursive: true })

  const tsContent = `// Archivo generado automáticamente por scripts/fetch-exercise-gifs.mjs
// Fuente: omercotkd/exercises-gifs (ExerciseDB dataset - uso personal local)

export const exerciseGifs: Record<string, string> = ${JSON.stringify(
    exerciseGifsMap,
    null,
    2
  )}
`

  const targetGifsTs = path.join(dataDir, 'exerciseGifs.ts')
  await fs.writeFile(targetGifsTs, tsContent, 'utf-8')
  console.log(`Archivo generado con éxito: ${targetGifsTs}`)

  // 5. Eliminar src/data/exerciseImages.ts
  const oldImagesTs = path.join(dataDir, 'exerciseImages.ts')
  try {
    await fs.unlink(oldImagesTs)
    console.log(`Eliminado archivo antiguo: ${oldImagesTs}`)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('No se pudo borrar exerciseImages.ts:', err.message)
    }
  }

  // 6. Resumen de ejecución
  console.log('\n======================================================')
  console.log('            RESUMEN DE DESCARGA DE GIFS               ')
  console.log('======================================================')
  console.log(`Total ejercicios semilla evaluados: ${SEED_MAPPING.length}`)
  console.log(`Ejercicios con GIF descargado OK:   ${summaryMatches.length}`)
  console.log(`Ejercicios sin GIF:                 ${withoutGif.length}`)

  console.log('\nLista de ejercicios CON GIF (ES -> EN [ID, TAMAÑO]):')
  for (const m of summaryMatches) {
    console.log(`  - ${m.es} -> "${m.en}" [id: ${m.id}, ${m.sizeKb} KB]`)
  }

  if (withoutGif.length > 0) {
    console.log('\nLista de ejercicios SIN GIF:')
    for (const w of withoutGif) {
      console.log(`  - ${w.es}: ${w.reason}`)
    }
  }
  console.log('======================================================\n')
}

main().catch((err) => {
  console.error('Error fatal en el script:', err)
  process.exit(1)
})
