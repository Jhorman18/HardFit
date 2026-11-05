#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

function fail(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`)
  process.exit(1)
}

function run(cmd, options = {}) {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`)
  execSync(cmd, { stdio: 'inherit', ...options })
}

function runCapture(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf8', ...options }).trim()
}

// 1. Validar que se pasaron las notas de la versión
const rawArgs = process.argv.slice(2)
const conNube = rawArgs.includes('--con-nube')
const notes = rawArgs.filter((a) => a !== '--con-nube').join(' ').trim()

if (!notes) {
  fail('Faltan las notas de la versión.\nUso: npm run publicar -- "Novedades de esta versión" [--con-nube]')
}

// 2. Validar que existe android/keystore.properties
const keystorePropsPath = path.resolve('android/keystore.properties')
if (!fs.existsSync(keystorePropsPath)) {
  fail('Falta android/keystore.properties. Se requiere para firmar la versión de release.')
}

// 3. Validar .env y bandera --con-nube
const envPath = path.resolve('.env')
if (fs.existsSync(envPath) && !conNube) {
  fail(
    'Existe el archivo .env y no se pasó el indicador --con-nube.\n' +
    'El APK se distribuye por enlace público y las variables VITE_* se hornearían en él.\n' +
    'Si deseas incluir las credenciales de la nube intencionalmente, añade --con-nube.\n' +
    'De lo contrario, elimina o renombra temporalmente .env antes de publicar.'
  )
}

// 4. Validar que la rama sea main
let currentBranch = ''
try {
  currentBranch = runCapture('git rev-parse --abbrev-ref HEAD')
} catch {
  fail('No se pudo verificar la rama actual de git.')
}
if (currentBranch !== 'main') {
  fail(`La rama actual es "${currentBranch}". Solo se puede publicar desde la rama "main".`)
}

// 5. Validar que no haya cambios en archivos versionados
let gitStatus = ''
try {
  gitStatus = runCapture('git status --porcelain -uno')
} catch {
  fail('No se pudo consultar el estado de git.')
}
if (gitStatus.length > 0) {
  fail('Hay cambios pendientes en archivos versionados. Realiza commit o stash antes de publicar.')
}

// 6. Hacer fetch de origin main y comprobar si HEAD va detrás
console.log('Comprobando repositorio remoto (git fetch origin main)...')
try {
  runCapture('git fetch origin main')
} catch {
  fail('No se pudo conectar con origin main. Revisa tu conexión a internet o el acceso a git.')
}

let behindCount = 0
try {
  const behindStr = runCapture('git rev-list --count HEAD..origin/main')
  behindCount = parseInt(behindStr, 10) || 0
} catch {
  fail('No se pudo comprobar la diferencia con origin/main.')
}
if (behindCount > 0) {
  fail(`Tu rama local va ${behindCount} commit(s) por detrás de origin/main. Haz "git pull origin main" antes de publicar.`)
}

// 7. Leer versionCode y versionName de android/app/build.gradle
const buildGradlePath = path.resolve('android/app/build.gradle')
if (!fs.existsSync(buildGradlePath)) {
  fail('No se encontró el archivo android/app/build.gradle.')
}

const originalBuildGradle = fs.readFileSync(buildGradlePath, 'utf8')

const versionCodeMatch = originalBuildGradle.match(/versionCode\s+(\d+)/)
if (!versionCodeMatch) {
  fail('No se pudo encontrar "versionCode" en android/app/build.gradle.')
}
const oldVersionCode = parseInt(versionCodeMatch[1], 10)
const newVersionCode = oldVersionCode + 1

const versionNameMatch = originalBuildGradle.match(/versionName\s+["']([^"']+)["']/)
if (!versionNameMatch) {
  fail('No se pudo encontrar "versionName" en android/app/build.gradle.')
}
const oldVersionName = versionNameMatch[1]

// Incrementar el menor +1 (ej: 1.1 -> 1.2, 1.2.3 -> 1.2.4)
const parts = oldVersionName.split('.')
const lastPart = parseInt(parts[parts.length - 1], 10)
if (Number.isNaN(lastPart)) {
  fail(`Formato de versionName no reconocido: "${oldVersionName}".`)
}
parts[parts.length - 1] = String(lastPart + 1)
const newVersionName = parts.join('.')

// Si el otro publicó sin subir su número de versión, aquí se repetiría: lo publicado manda.
const appUpdateSource = fs.readFileSync(path.resolve('src/utils/appUpdate.ts'), 'utf8')
const versionUrl = appUpdateSource.match(/VERSION_URL =\s*'([^']+)'/)?.[1]
if (!versionUrl) {
  fail('No se encontró VERSION_URL en src/utils/appUpdate.ts.')
}
let publishedVersionCode = null
try {
  const response = await fetch(versionUrl, { signal: AbortSignal.timeout(15000) })
  if (response.ok) publishedVersionCode = (await response.json()).versionCode
} catch {
  // Se avisa abajo: no poder leer Dropbox no impide compilar.
}
if (typeof publishedVersionCode !== 'number') {
  console.warn('\x1b[33m[AVISO]\x1b[0m No se pudo leer la versión publicada. Confirma que nadie más esté publicando.')
} else if (publishedVersionCode >= newVersionCode) {
  fail(
    `En Dropbox ya está publicado el código ${publishedVersionCode} y aquí se generaría el ${newVersionCode}.\n` +
    'Quien publicó debe subir su cambio de build.gradle; haz "git pull origin main" y vuelve a intentarlo.'
  )
}

console.log(`Incrementando versión: ${oldVersionName} (código ${oldVersionCode}) -> ${newVersionName} (código ${newVersionCode})`)

let updatedBuildGradle = originalBuildGradle.replace(
  /versionCode\s+\d+/,
  `versionCode ${newVersionCode}`
)
updatedBuildGradle = updatedBuildGradle.replace(
  /versionName\s+["'][^"']+["']/,
  `versionName "${newVersionName}"`
)

fs.writeFileSync(buildGradlePath, updatedBuildGradle, 'utf8')

// 8. Correr builds con restauración automática ante fallo
try {
  console.log('\n[1/3] Compilando web (npm run build)...')
  run('npm run build')

  console.log('\n[2/3] Sincronizando Capacitor (npx cap sync android)...')
  run('npx cap sync android')

  console.log('\n[3/3] Compilando APK Release con Gradle...')
  const isWin = process.platform === 'win32'
  const gradlewCmd = isWin ? '.\\gradlew.bat assembleRelease' : './gradlew assembleRelease'
  run(gradlewCmd, { cwd: path.resolve('android'), shell: true })
} catch {
  console.error('\n\x1b[31mError durante la compilación. Restaurando build.gradle...\x1b[0m')
  fs.writeFileSync(buildGradlePath, originalBuildGradle, 'utf8')
  fail('La compilación falló. Se ha restaurado android/app/build.gradle.')
}

// 9. Copiar APK y escribir version.json en release/
const releaseApkSource = path.resolve('android/app/build/outputs/apk/release/app-release.apk')
if (!fs.existsSync(releaseApkSource)) {
  fs.writeFileSync(buildGradlePath, originalBuildGradle, 'utf8')
  fail('No se encontró el archivo generado: ' + releaseApkSource)
}

const releaseDir = path.resolve('release')
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true })
}

const targetApk = path.join(releaseDir, 'HardFit.apk')
fs.copyFileSync(releaseApkSource, targetApk)

const versionJsonPath = path.join(releaseDir, 'version.json')
const versionData = {
  versionCode: newVersionCode,
  versionName: newVersionName,
  notes,
}
fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8')

// 10. Imprimir instrucciones finales
console.log('\n======================================================================')
console.log('\x1b[32m✔ ¡Compilación de versión finalizada con éxito!\x1b[0m')
console.log(`Versión generada: ${newVersionName} (código ${newVersionCode})`)
console.log(`Archivos listos en:`)
console.log(`  - ${path.relative(process.cwd(), targetApk)}`)
console.log(`  - ${path.relative(process.cwd(), versionJsonPath)}`)
console.log('----------------------------------------------------------------------')
console.log('PASOS OBLIGATORIOS PARA PUBLICAR:')
console.log('1. Reemplazar ambos archivos en Dropbox con la opción «Actualizar» / «Subir versión»')
console.log('   (NO borrar los archivos de Dropbox para no romper los enlaces de descarga directa).')
console.log('2. Hacer commit y push del cambio en build.gradle:')
console.log(`   git add android/app/build.gradle`)
console.log(`   git commit -m "build: actualizar a versión ${newVersionName} (${newVersionCode})"`)
console.log(`   git push origin main`)
console.log('======================================================================\n')
