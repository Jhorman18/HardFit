// Genera todos los iconos de HardFit a partir de un único dibujo vectorial: la H hecha con una barra.
// Salidas: assets/, public/ y los recursos de Android (mipmaps, splash y color del icono adaptativo).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ACCENT = '#F2BF1D'
const INK = '#121210'
const res = (...parts) => path.join(root, 'android', 'app', 'src', 'main', 'res', ...parts)

// Marca centrada en un lienzo de 1024; `scale` deja el margen que pide cada formato.
function mark(color, scale = 1) {
  const offset = 512 * (1 - scale)
  return `<g fill="${color}" transform="translate(${offset} ${offset}) scale(${scale})">
    <rect x="282" y="212" width="130" height="600" rx="16"/>
    <rect x="612" y="212" width="130" height="600" rx="16"/>
    <rect x="178" y="322" width="80" height="380" rx="12"/>
    <rect x="766" y="322" width="80" height="380" rx="12"/>
    <rect x="412" y="462" width="200" height="100"/>
  </g>`
}

function svg({ background = ACCENT, color = INK, scale = 1 } = {}) {
  const fill = background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${fill}${mark(color, scale)}</svg>`
}

function render(source, size) {
  return sharp(Buffer.from(source)).resize(size, size).png({ compressionLevel: 9 })
}

const ICON = svg()
const MASKABLE = svg({ scale: 0.72 })
// ic_launcher.xml ya aplica un inset del 16,7 %: aquí no hace falta margen extra.
const FOREGROUND = svg({ background: null, scale: 0.9 })
const BACKGROUND = svg({ color: ACCENT })

fs.writeFileSync(path.join(root, 'assets', 'logo.svg'), `${ICON}\n`)
fs.writeFileSync(path.join(root, 'public', 'favicon.svg'), `${ICON}\n`)

for (const [file, source, size] of [
  ['public/icon-192.png', ICON, 192],
  ['public/icon-512.png', ICON, 512],
  ['public/icon-512-maskable.png', MASKABLE, 512],
  ['public/apple-touch-icon.png', ICON, 180],
  ['public/favicon.png', ICON, 64],
  ['assets/icon.png', ICON, 1024],
  ['assets/icon-foreground.png', FOREGROUND, 1024],
  ['assets/icon-background.png', BACKGROUND, 1024],
]) {
  await render(source, size).toFile(path.join(root, file))
}

const circle = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`,
  )

for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  const dir = res(`mipmap-${density}`)
  const adaptive = Math.round(size * 2.25)
  await render(svg({ scale: 0.86 }), size).toFile(path.join(dir, 'ic_launcher.png'))
  await render(svg({ scale: 0.8 }), size)
    .composite([{ input: circle(size), blend: 'dest-in' }])
    .toFile(path.join(dir, 'ic_launcher_round.png'))
  await render(FOREGROUND, adaptive).toFile(path.join(dir, 'ic_launcher_foreground.png'))
  await render(BACKGROUND, adaptive).toFile(path.join(dir, 'ic_launcher_background.png'))
}

const launcherColor = res('values', 'ic_launcher_background.xml')
fs.writeFileSync(
  launcherColor,
  fs.readFileSync(launcherColor, 'utf8').replace(/(<color name="ic_launcher_background">)[^<]*/, `$1${ACCENT}`),
)

// La pantalla de arranque conserva las medidas de cada densidad y orientación.
for (const entry of fs.readdirSync(res())) {
  const file = res(entry, 'splash.png')
  if (!entry.startsWith('drawable') || !fs.existsSync(file)) continue
  const { width, height } = await sharp(file).metadata()
  const side = Math.round(Math.min(width, height) * 0.34)
  const logo = await render(svg({ background: null, color: ACCENT }), side).toBuffer()
  const output = await sharp({
    create: { width, height, channels: 4, background: INK },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
  fs.writeFileSync(file, output)
}

console.log('Iconos generados')
