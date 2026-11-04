export type ThemeId = 'clasico' | 'replog' | 'claro'

export interface ThemeDef {
  id: ThemeId
  name: string
  mode: 'dark' | 'light'
  vars: Record<string, string>
  defaultAccent: string
  bgHex: string
}

export interface AccentPreset {
  name: string
  /** Variante para temas oscuros. */
  hex: string
  /** Variante para el tema claro: el acento también se usa como texto sobre fondo claro. */
  lightHex: string
}

export function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '').trim()
  const bigint = parseInt(clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `${r} ${g} ${b}`
}

export function getLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim()
  const bigint = parseInt(clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function getOnAccent(accentHex: string): { hex: string; rgb: string } {
  const isLight = getLuminance(accentHex) > 0.3
  return isLight
    ? { hex: '#141310', rgb: '20 19 16' }
    : { hex: '#ffffff', rgb: '255 255 255' }
}

export const STATE_FAMILIES = [
  'red',
  'emerald',
  'green',
  'amber',
  'orange',
  'yellow',
  'blue',
] as const

export type StateFamily = (typeof STATE_FAMILIES)[number]

export const STATE_TONES = [200, 300, 400, 700, 800, 900, 950] as const
export type StateTone = (typeof STATE_TONES)[number]

export const LIGHT_STATE_TONE_MAP: Record<StateTone, number> = {
  200: 800,
  300: 700,
  400: 600,
  700: 300,
  800: 200,
  900: 100,
  950: 50,
}

export const TAILWIND_STATE_PALETTE: Record<StateFamily, Record<number, string>> = {
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
}

export function getStateColorVars(mode: 'dark' | 'light'): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const family of STATE_FAMILIES) {
    const palette = TAILWIND_STATE_PALETTE[family]
    for (const tone of STATE_TONES) {
      const sourceTone = mode === 'dark' ? tone : LIGHT_STATE_TONE_MAP[tone]
      vars[`${family}-${tone}`] = hexToRgb(palette[sourceTone])
    }
  }
  return vars
}

function neutralScale(hexes: string[]): Record<string, string> {
  const tones = [50, 100, 200, 300, 400, 500, 600, 700, 750, 800, 850, 900, 950]
  return Object.fromEntries(tones.map((tone, index) => [`n-${tone}`, hexToRgb(hexes[index])]))
}

/*
 * La escala de la app es la del sistema HardFit con un matiz: bg-black es el fondo de pantalla
 * y bg-neutral-900 la superficie (#1B1B18), para que las clases existentes sigan significando lo mismo.
 */
export const THEMES: Record<ThemeId, ThemeDef> = {
  clasico: {
    id: 'clasico',
    name: 'Clásico',
    mode: 'dark',
    defaultAccent: '#F2BF1D',
    bgHex: '#121210',
    vars: {
      bg: hexToRgb('#121210'),
      fg: hexToRgb('#EFEBE1'),
      ...neutralScale(['#EFEBE1', '#E5E0D4', '#D1CBC0', '#B3AFA3', '#918D82', '#6E6A60', '#57544C', '#3D3A34', '#32302B', '#262622', '#20201C', '#1B1B18', '#0A0A09']),
      surface: hexToRgb('#1B1B18'),
      elevated: hexToRgb('#262622'),
      line: hexToRgb('#262622'),
      'line-strong': hexToRgb('#3D3A34'),
      ...getStateColorVars('dark'),
    },
  },
  // 'replog' es un identificador interno: en la interfaz este tema se llama Carbón.
  replog: {
    id: 'replog',
    name: 'Carbón',
    mode: 'dark',
    defaultAccent: '#F2BF1D',
    bgHex: '#0F0F0E',
    vars: {
      bg: hexToRgb('#0F0F0E'),
      fg: hexToRgb('#F2F1EC'),
      ...neutralScale(['#F2F1EC', '#E4E3DD', '#C9C8C1', '#ACABA4', '#8A8983', '#6A6964', '#504F4B', '#383835', '#2D2D2B', '#232322', '#1D1D1C', '#181817', '#080808']),
      surface: hexToRgb('#181817'),
      elevated: hexToRgb('#232322'),
      line: hexToRgb('#383835'),
      'line-strong': hexToRgb('#504F4B'),
      ...getStateColorVars('dark'),
    },
  },
  claro: {
    id: 'claro',
    name: 'Claro',
    mode: 'light',
    defaultAccent: '#8A6400',
    bgHex: '#FFFFFF',
    vars: {
      bg: hexToRgb('#FFFFFF'),
      fg: hexToRgb('#171717'),
      ...neutralScale(['#171717', '#262626', '#3A3A3A', '#525252', '#6B6B6B', '#8F8F8F', '#B0B0B0', '#D4D4D4', '#E0E0E0', '#EBEBEB', '#F2F2F2', '#F7F7F7', '#FFFFFF']),
      surface: hexToRgb('#F7F7F7'),
      elevated: hexToRgb('#EBEBEB'),
      line: hexToRgb('#E0E0E0'),
      'line-strong': hexToRgb('#B0B0B0'),
      ...getStateColorVars('light'),
    },
  },
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Disco de 15 kg', hex: '#F2BF1D', lightHex: '#8A6400' },
  { name: 'Tiza', hex: '#EFEBE1', lightHex: '#4A463D' },
  { name: 'Óxido', hex: '#FF7A45', lightHex: '#9C3B10' },
  { name: 'Disco de 25 kg', hex: '#FF6459', lightHex: '#AE2A20' },
  { name: 'Magnesio', hex: '#B9E34A', lightHex: '#4F6309' },
  { name: 'Plataforma', hex: '#7FD4B8', lightHex: '#116A54' },
  { name: 'Acero', hex: '#9FB3C8', lightHex: '#3C5873' },
  { name: 'Disco de 20 kg', hex: '#8FB2FF', lightHex: '#2B55C4' },
  { name: 'Cinta', hex: '#E7A3C8', lightHex: '#9B2C68' },
]

/** Un acento guardado se adapta al modo del tema; los colores antiguos fuera de la lista se respetan. */
export function resolveAccent(hex: string, mode: 'dark' | 'light'): string {
  const wanted = hex.toLowerCase()
  const preset = ACCENT_PRESETS.find(
    (p) => p.hex.toLowerCase() === wanted || p.lightHex.toLowerCase() === wanted
  )
  if (!preset) return hex
  return mode === 'light' ? preset.lightHex : preset.hex
}

export function getVisiblePresets(themeMode: 'dark' | 'light'): AccentPreset[] {
  return ACCENT_PRESETS.map((p) => ({
    ...p,
    hex: themeMode === 'light' ? p.lightHex : p.hex,
  }))
}
