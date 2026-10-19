// Genera el set de íconos de RepLog a partir del logo oficial SIN texto (brazo + mancuerna).
// - PWA: public/icon-192, icon-512, icon-512-maskable, apple-touch-icon, favicon.png
// - Fuentes para Android (@capacitor/assets): assets/icon.png, icon-foreground.png, icon-background.png
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const SRC = path.join(root, 'assets', 'IconoRepLog-sinletras.jpg')
const A = (f) => path.join(root, 'assets', f)
const P = (f) => path.join(root, 'public', f)
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

// 1) Recorte tight del símbolo (quita el blanco sobrante).
const trimmed = await sharp(SRC).trim({ threshold: 20 }).png().toBuffer()
const tm = await sharp(trimmed).metadata()
const longSide = Math.max(tm.width, tm.height)
console.log(`Símbolo recortado: ${tm.width}x${tm.height}`)

// Componer el símbolo centrado en un cuadrado blanco de lado `side`.
async function squareWhite(side) {
  return await sharp({ create: { width: side, height: side, channels: 4, background: WHITE } })
    .composite([{ input: trimmed, gravity: 'center' }])
    .png()
    .toBuffer()
}

// Padding moderado (símbolo ~88% del ancho) para íconos normales.
const sqModerate = await squareWhite(Math.round(longSide * 1.14))
// Padding generoso (símbolo ~64% del ancho) para maskable y adaptive (zona segura circular).
const sqSafe = await squareWhite(Math.round(longSide / 0.64))

const out = async (buf, size, file) =>
  sharp(buf).resize(size, size, { fit: 'contain', background: WHITE }).png().toFile(file)

// 2) PWA (public/)
await out(sqModerate, 192, P('icon-192.png'))
await out(sqModerate, 512, P('icon-512.png'))
await out(sqModerate, 180, P('apple-touch-icon.png'))
await out(sqSafe, 512, P('icon-512-maskable.png'))
await out(sqModerate, 64, P('favicon.png'))

// 3) Fuentes para Android adaptive (@capacitor/assets)
await out(sqSafe, 1024, A('icon.png'))
await out(sqSafe, 1024, A('icon-foreground.png'))
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } })
  .png()
  .toFile(A('icon-background.png'))

console.log('Íconos PWA y fuentes Android generados.')
