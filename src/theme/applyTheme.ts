import { THEMES, type ThemeId, hexToRgb, getOnAccent } from './themes'

const THEME_VARS_STORAGE_KEY = 'replog_theme_vars'
const FONT_LINK_ID = 'replog-google-fonts'

export function applyTheme(themeId: ThemeId, customAccent: string | null) {
  if (typeof document === 'undefined') return

  const theme = THEMES[themeId] || THEMES.clasico
  const root = document.documentElement
  const style = root.style

  // 1. Fuentes según el tema (inyecta Google Fonts solo si el tema es 'replog')
  let fontBody =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  let fontDisplay = 'inherit'

  if (theme.font === 'replog') {
    fontBody =
      "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontDisplay = "'Archivo', sans-serif"

    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link')
      link.id = FONT_LINK_ID
      link.rel = 'stylesheet'
      link.href =
        'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Geist:wght@400;500;600&display=swap'
      document.head.appendChild(link)
    }
  }

  // 2. Acento y on-accent
  const effectiveAccent = customAccent || theme.defaultAccent
  const accentRgb = hexToRgb(effectiveAccent)
  const onAccent = getOnAccent(effectiveAccent)

  // 3. Objeto completo de variables resueltas
  const resolvedVars: Record<string, string> = {
    ...theme.vars,
    accent: accentRgb,
    'on-accent': onAccent.rgb,
    'font-body': fontBody,
    'font-display': fontDisplay,
  }

  // 4. Aplicar variables al estilo de :root
  for (const [key, value] of Object.entries(resolvedVars)) {
    style.setProperty(`--${key}`, value)
  }

  // 5. Esquema de color, data-theme y clase dark
  style.colorScheme = theme.mode
  root.setAttribute('data-theme', theme.id)
  if (theme.mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // 6. Meta theme-color
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  const bgHex =
    theme.bgHex ||
    (theme.id === 'claro' ? '#f7f8fa' : theme.id === 'replog' ? '#0b0f14' : '#000000')
  meta.setAttribute('content', bgHex)

  // 7. Persistir objeto resuelto para el script inline de index.html
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
