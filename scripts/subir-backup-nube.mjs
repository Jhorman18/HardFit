// Sube una copia de Kitaeru (JSON exportado o generado) a la nube de una cuenta,
// igual que lo haría el botón "Sincronizar" de la app. Después basta con iniciar
// sesión en la app para que todo se descargue.
//
// Uso (desde la carpeta replog):
//   node --env-file=.env scripts/subir-backup-nube.mjs <archivo.json> <email> [--dry-run]
//
// La contraseña se pide por consola y no se muestra ni se guarda.

import fs from 'node:fs'
import readline from 'node:readline'
import { createClient } from '@supabase/supabase-js'

const COLLECTIONS = ['exercises', 'folders', 'routines', 'workouts', 'measurements', 'settings']

const [file, email] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const dryRun = process.argv.includes('--dry-run')

if (!file || !email) {
  console.error('Uso: node --env-file=.env scripts/subir-backup-nube.mjs <archivo.json> <email> [--dry-run]')
  process.exit(1)
}

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env')
  process.exit(1)
}

const backup = JSON.parse(fs.readFileSync(file, 'utf8'))
if (!['Kitaeru', 'RepLog'].includes(backup.app) || !backup.data) {
  console.error('El archivo no es una copia de Kitaeru')
  process.exit(1)
}

// Mismas reglas que getLocalRecords() en src/sync/sync.ts
function recordsOf(collection) {
  const list = Array.isArray(backup.data[collection]) ? backup.data[collection] : []
  if (collection === 'exercises') return list.filter((e) => e.isCustom === true).map((e) => ({ docId: e.id, data: e }))
  if (collection === 'settings') return list.filter((s) => s.id === 'app').map((s) => ({ docId: 'app', data: s }))
  return list.map((r) => ({ docId: r.id, data: r }))
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

const rows = COLLECTIONS.flatMap((c) => recordsOf(c).map((r) => ({ collection: c, ...r })))
for (const c of COLLECTIONS) {
  const n = rows.filter((r) => r.collection === c).length
  if (n) console.log(`  ${c}: ${n}`)
}

const password = await askHidden(`Contraseña de ${email}: `)
const supabase = createClient(url, anonKey, { auth: { persistSession: false } })
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password })
if (authError || !auth.user) {
  console.error(`No se pudo iniciar sesión: ${authError?.message ?? 'sin usuario'}`)
  process.exit(1)
}
console.log(`Sesión iniciada como ${auth.user.email}`)

if (dryRun) {
  console.log(`--dry-run: se subirían ${rows.length} registros. No se escribió nada.`)
  process.exit(0)
}

const nowIso = new Date().toISOString()
const { error } = await supabase.from('replog_records').upsert(
  rows.map((r) => ({
    user_id: auth.user.id,
    collection: r.collection,
    doc_id: r.docId,
    data: r.data,
    updated_at: nowIso,
    deleted: false,
  })),
  { onConflict: 'user_id,collection,doc_id' }
)
if (error) {
  console.error(`Error al subir: ${error.message}`)
  process.exit(1)
}

const { count } = await supabase
  .from('replog_records')
  .select('doc_id', { count: 'exact', head: true })
  .eq('user_id', auth.user.id)
  .eq('collection', 'workouts')
  .eq('deleted', false)
console.log(`Listo: ${rows.length} registros subidos. Entrenos en tu cuenta: ${count}`)
await supabase.auth.signOut()
