export type ThemeId = 'clasico' | 'replog' | 'claro'

export interface ThemeDef {
  id: ThemeId
  name: string
  mode: 'dark' | 'light'
  vars: Record<string, string>
  defaultAccent: string
  bgHex: string
  font?: 'system' | 'replog'
}

export interface AccentPreset {
  name: string
  hex: string
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
    return s <= 0.03928 ? s / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function getOnAccent(accentHex: string): { hex: string; rgb: string } {
  // Orange #f97316 (L ~0.33), white #ffffff (L 1.0), yellow (L ~0.45), green (L ~0.40) -> dark text #0b0f14
  // Blue #3b82f6 (L ~0.23), black #0b0f14 (L 0.003), red, purple, pink -> white text #ffffff
  const isLight = getLuminance(accentHex) > 0.3
  return isLight
    ? { hex: '#0b0f14', rgb: '11 15 20' }
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

export const THEMES: Record<ThemeId, ThemeDef> = {
  clasico: {
    id: 'clasico',
    name: 'Clásico oscuro',
    mode: 'dark',
    defaultAccent: '#ffffff',
    bgHex: '#000000',
    font: 'system',
    vars: {
      bg: '0 0 0',
      fg: '255 255 255',
      'n-50': '250 250 250',
      'n-100': '245 245 245',
      'n-200': '229 229 229',
      'n-300': '212 212 212',
      'n-400': '163 163 163',
      'n-500': '115 115 115',
      'n-600': '82 82 82',
      'n-700': '64 64 64',
      'n-750': '51 51 51',
      'n-800': '38 38 38',
      'n-900': '23 23 23',
      'n-950': '10 10 10',
      ...getStateColorVars('dark'),
    },
  },
  replog: {
    id: 'replog',
    name: 'Kitaeru',
    mode: 'dark',
    defaultAccent: '#f97316',
    bgHex: '#0b0f14',
    font: 'replog',
    vars: {
      bg: hexToRgb('#0b0f14'),
      fg: hexToRgb('#f2f4f7'),
      'n-50': hexToRgb('#f8fafc'),
      'n-100': hexToRgb('#eef1f5'),
      'n-200': hexToRgb('#dce1e8'),
      'n-300': hexToRgb('#c9d0da'),
      'n-400': hexToRgb('#a3acb9'),
      'n-500': hexToRgb('#7b8594'),
      'n-600': hexToRgb('#5a6372'),
      'n-700': hexToRgb('#2b3340'),
      'n-750': hexToRgb('#252d38'),
      'n-800': hexToRgb('#1f2630'),
      'n-900': hexToRgb('#171d26'),
      'n-950': hexToRgb('#11161d'),
      ...getStateColorVars('dark'),
    },
  },
  claro: {
    id: 'claro',
    name: 'Claro',
    mode: 'light',
    defaultAccent: '#0b0f14',
    bgHex: '#f7f8fa',
    font: 'system',
    vars: {
      bg: hexToRgb('#f7f8fa'),
      fg: hexToRgb('#0b0f14'),
      'n-50': hexToRgb('#0b0f14'),
      'n-100': hexToRgb('#151920'),
      'n-200': hexToRgb('#1f252d'),
      'n-300': hexToRgb('#343b45'),
      'n-400': hexToRgb('#4f5864'),
      'n-500': hexToRgb('#6b7480'),
      'n-600': hexToRgb('#9aa3ae'),
      'n-700': hexToRgb('#cfd5dc'),
      'n-750': hexToRgb('#d9dde4'),
      'n-800': hexToRgb('#e2e6eb'),
      'n-900': hexToRgb('#eef1f4'),
      'n-950': hexToRgb('#ffffff'),
      ...getStateColorVars('light'),
    },
  },
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Negro', hex: '#0b0f14' },
  { name: 'Naranja', hex: '#f97316' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Morado', hex: '#8b5cf6' },
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Amarillo', hex: '#eab308' },
]

export function getVisiblePresets(themeMode: 'dark' | 'light'): AccentPreset[] {
  return ACCENT_PRESETS.filter((p) => {
    if (themeMode === 'light') return p.hex.toLowerCase() !== '#ffffff'
    return p.hex.toLowerCase() !== '#0b0f14'
  })
}
