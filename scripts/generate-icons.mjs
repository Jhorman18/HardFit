import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.resolve(rootDir, 'assets');
const publicDir = path.resolve(rootDir, 'public');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG:
// - withBackground: whether to include rich dark radial gradient background or transparent
// - maskable: whether to scale with ~20% safe-zone margin (0.74 scale vs 0.88 scale)
function getSvg({ withBackground = true, maskable = false } = {}) {
  const scale = maskable ? 0.74 : 0.88;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Background: Deepest rich black with very subtle luxury center lift -->
    <radialGradient id="appBg" cx="50%" cy="50%" r="68%">
      <stop offset="0%" stop-color="#141414"/>
      <stop offset="55%" stop-color="#090909"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>

    <!-- Front plate face: Brilliant pure white with micro-gradient -->
    <linearGradient id="plateWhite" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#eeeeee"/>
    </linearGradient>

    <!-- Plate bevel / secondary tier: Soft metallic silver -->
    <linearGradient id="plateSilver" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f2f2f2"/>
      <stop offset="100%" stop-color="#cccccc"/>
    </linearGradient>

    <!-- Collar ring: Darker steel -->
    <linearGradient id="collarSteel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e0e0e0"/>
      <stop offset="100%" stop-color="#a8a8a8"/>
    </linearGradient>

    <!-- Handle: Solid stainless steel bar -->
    <linearGradient id="handleSteel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#f5f5f5"/>
      <stop offset="100%" stop-color="#d0d0d0"/>
    </linearGradient>

    <!-- Subtle drop shadow / ambient glow for the dumbbell -->
    <filter id="dumbbellShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="24" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  ${withBackground ? '<rect width="1024" height="1024" fill="url(#appBg)"/>' : ''}

  <!-- Centered Content -->
  <g transform="translate(512, 512) scale(${scale})">
    <!-- Centered Dumbbell rotated at dynamic -45 degrees -->
    <g transform="rotate(-45)" ${withBackground ? 'filter="url(#dumbbellShadow)"' : ''}>
      <!-- 1. Handle (Solid knurled steel bar) -->
      <rect x="-140" y="-36" width="280" height="72" rx="16" fill="url(#handleSteel)"/>

      <!-- Knurling bands on grip (high-contrast, perfectly spaced) -->
      <rect x="-70" y="-34" width="14" height="68" rx="4" fill="#141414" opacity="0.22"/>
      <rect x="-35" y="-34" width="14" height="68" rx="4" fill="#141414" opacity="0.22"/>
      <rect x="0" y="-34" width="14" height="68" rx="4" fill="#141414" opacity="0.22"/>
      <rect x="35" y="-34" width="14" height="68" rx="4" fill="#141414" opacity="0.22"/>
      <rect x="56" y="-34" width="14" height="68" rx="4" fill="#141414" opacity="0.22"/>

      <!-- 2. Left Weight Stack -->
      <!-- Inner Collar Ring -->
      <rect x="-166" y="-80" width="26" height="160" rx="10" fill="url(#collarSteel)"/>
      <!-- Main Heavy Plate (Brilliant White) -->
      <rect x="-286" y="-200" width="120" height="400" rx="44" fill="url(#plateWhite)"/>
      <!-- Outer Plate (Silver accent) -->
      <rect x="-370" y="-160" width="84" height="320" rx="36" fill="url(#plateSilver)"/>
      <!-- Outer End Bevel / Rim -->
      <rect x="-392" y="-120" width="22" height="240" rx="10" fill="url(#plateWhite)"/>

      <!-- 3. Right Weight Stack -->
      <!-- Inner Collar Ring -->
      <rect x="140" y="-80" width="26" height="160" rx="10" fill="url(#collarSteel)"/>
      <!-- Main Heavy Plate (Brilliant White) -->
      <rect x="166" y="-200" width="120" height="400" rx="44" fill="url(#plateWhite)"/>
      <!-- Outer Plate (Silver accent) -->
      <rect x="286" y="-160" width="84" height="320" rx="36" fill="url(#plateSilver)"/>
      <!-- Outer End Bevel / Rim -->
      <rect x="370" y="-120" width="22" height="240" rx="10" fill="url(#plateWhite)"/>
    </g>
  </g>
</svg>`;
}

async function main() {
  console.log('Generating Kitaeru app icons...');

  const svgStandard = getSvg({ withBackground: true, maskable: false });
  const svgMaskable = getSvg({ withBackground: true, maskable: true });
  const svgForeground = getSvg({ withBackground: false, maskable: true });

  // 1. Save SVGs to assets/
  fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgStandard, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'icon-foreground.svg'), svgForeground, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'icon-maskable.svg'), svgMaskable, 'utf8');
  console.log('Saved SVG files in assets/');

  // 2. Generate Master PNGs in assets/
  // assets/icon.png (1024x1024 master)
  await sharp(Buffer.from(svgStandard))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('Generated assets/icon.png (1024x1024)');

  // assets/icon-only.png (1024x1024 master)
  await sharp(Buffer.from(svgStandard))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-only.png'));
  console.log('Generated assets/icon-only.png (1024x1024)');

  // assets/icon-foreground.png (1024x1024 transparent foreground)
  await sharp(Buffer.from(svgForeground))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon-foreground.png'));
  console.log('Generated assets/icon-foreground.png (1024x1024)');

  // assets/icon-background.png (1024x1024 solid black background)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .png()
    .toFile(path.join(assetsDir, 'icon-background.png'));
  console.log('Generated assets/icon-background.png (1024x1024)');

  // 3. Generate PWA Assets in public/
  // public/icon-512.png (512x512)
  await sharp(Buffer.from(svgStandard))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated public/icon-512.png (512x512)');

  // public/icon-192.png (192x192)
  await sharp(Buffer.from(svgStandard))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Generated public/icon-192.png (192x192)');

  // public/icon-512-maskable.png (512x512, safe-zone padded)
  await sharp(Buffer.from(svgMaskable))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512-maskable.png'));
  console.log('Generated public/icon-512-maskable.png (512x512)');

  // public/apple-touch-icon.png (180x180)
  await sharp(Buffer.from(svgStandard))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png (180x180)');

  // public/favicon.svg (vector favicon)
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgStandard, 'utf8');
  console.log('Updated public/favicon.svg');

  // public/favicon.png (48x48)
  await sharp(Buffer.from(svgStandard))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated public/favicon.png (48x48)');

  console.log('All master and PWA icons generated successfully.');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
