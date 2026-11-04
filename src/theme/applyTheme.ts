import { THEMES, type ThemeId, hexToRgb, getOnAccent, resolveAccent } from './themes'

const THEME_VARS_STORAGE_KEY = 'replog_theme_vars'
const FONT_STACK = "'Archivo Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export function applyTheme(themeId: ThemeId, customAccent: string | null) {
  if (typeof document === 'undefined') return

  const theme = THEMES[themeId] || THEMES.clasico
  const root = document.documentElement
  const style = root.style

  // 1. Acento y on-accent
  const effectiveAccent = resolveAccent(customAccent || theme.defaultAccent, theme.mode)
  const accentRgb = hexToRgb(effectiveAccent)
  const onAccent = getOnAccent(effectiveAccent)

  // 2. Objeto completo de variables resueltas
  const resolvedVars: Record<string, string> = {
    ...theme.vars,
    accent: accentRgb,
    'on-accent': onAccent.rgb,
    'font-body': FONT_STACK,
    'font-display': FONT_STACK,
  }

  // 3. Aplicar variables al estilo de :root
  for (const [key, value] of Object.entries(resolvedVars)) {
    style.setProperty(`--${key}`, value)
  }

  // 4. Esquema de color, data-theme y clase dark
  style.colorScheme = theme.mode
  root.setAttribute('data-theme', theme.id)
  if (theme.mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // 5. Meta theme-color
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  const bgHex = theme.bgHex
  meta.setAttribute('content', bgHex)

  // 6. Persistir objeto resuelto para el script inline de index.html
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        THEME_VARS_STORAGE_KEY,
        JSON.stringify({
          themeId: theme.id,
          mode: theme.mode,
          bgHex,
          vars: resolvedVars,
        })
      )
    } catch {
      // Manejar posibles errores de localStorage (quota, private mode)
    }
  }
}
