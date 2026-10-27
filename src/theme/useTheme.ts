import { create } from 'zustand'
import { THEMES, type ThemeId } from './themes'
import { applyTheme } from './applyTheme'

const STORAGE_KEY = 'replog_theme'

interface PersistedTheme {
  theme?: ThemeId
  accent?: string | null
}

function loadInitialTheme(): { themeId: ThemeId; accent: string | null } {
  if (typeof window === 'undefined') {
    return { themeId: 'clasico', accent: null }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: PersistedTheme = JSON.parse(raw)
      const validThemeId: ThemeId =
        parsed.theme && parsed.theme in THEMES ? parsed.theme : 'clasico'
      const accent =
        typeof parsed.accent === 'string' && /^#[0-9a-fA-F]{6}$/i.test(parsed.accent)
          ? parsed.accent
          : null
      return { themeId: validThemeId, accent }
    }
  } catch {
    // Si localStorage falla o está corrupto, usar valores predeterminados
  }
  return { themeId: 'clasico', accent: null }
}

function persistTheme(themeId: ThemeId, accent: string | null) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: themeId, accent }))
  } catch {
    // Protección contra cuota excedida o modo privado estricto
  }
}

export interface ThemeStore {
  themeId: ThemeId
  accent: string | null
  setThemeId: (id: ThemeId) => void
  setAccent: (accent: string | null) => void
}

const initial = loadInitialTheme()
// Aplica el tema inmediatamente al cargar el módulo
applyTheme(initial.themeId, initial.accent)

export const useTheme = create<ThemeStore>((set, get) => ({
  themeId: initial.themeId,
  accent: initial.accent,
  setThemeId: (themeId: ThemeId) => {
    const { accent } = get()
    persistTheme(themeId, accent)
    applyTheme(themeId, accent)
    set({ themeId })
  },
  setAccent: (accent: string | null) => {
    const { themeId } = get()
    persistTheme(themeId, accent)
    applyTheme(themeId, accent)
    set({ accent })
  },
}))
