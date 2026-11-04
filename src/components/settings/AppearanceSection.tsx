import { Check, RotateCcw, Pipette } from 'lucide-react'
import {
  useTheme,
  THEMES,
  getVisiblePresets,
  resolveAccent,
  getLuminance,
  type ThemeId,
} from '../../theme'

const THEME_CARDS: {
  id: ThemeId
  name: string
  modeLabel: string
  swatches: [string, string, string]
}[] = [
  {
    id: 'clasico',
    name: 'Clásico',
    modeLabel: 'Goma y tiza',
    swatches: ['#121210', '#262622', '#EFEBE1'],
  },
  {
    id: 'replog',
    name: 'Carbón',
    modeLabel: 'Más profundo',
    swatches: ['#0F0F0E', '#232322', '#F2F1EC'],
  },
  {
    id: 'claro',
    name: 'Claro',
    modeLabel: 'Limpio',
    swatches: ['#FFFFFF', '#EBEBEB', '#171717'],
  },
]

export function AppearanceSection() {
  const { themeId, accent, setThemeId, setAccent } = useTheme()
  const currentThemeDef = THEMES[themeId] || THEMES.clasico
  const themeMode = currentThemeDef.mode

  // Obtenemos los 9 presets visibles según el modo claro/oscuro
  const visiblePresets = getVisiblePresets(themeMode)

  // Resolvemos el acento activo
  const resolvedCurrentAccent = resolveAccent(
    accent || currentThemeDef.defaultAccent,
    themeMode
  )

  // Encontramos el preset activo o determinamos si es personalizado
  const matchedPreset = visiblePresets.find(
    (p) => p.hex.toLowerCase() === resolvedCurrentAccent.toLowerCase()
  )
  const isCustomAccent = accent !== null && !matchedPreset

  const selectedAccentName = matchedPreset
    ? matchedPreset.name
    : isCustomAccent
      ? 'Personalizado'
      : `${visiblePresets.find((p) => p.hex.toLowerCase() === currentThemeDef.defaultAccent.toLowerCase())?.name ?? 'Predeterminado'} (por defecto)`

  return (
    <section className="mt-5">
      <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
        Aspecto
      </h2>

      <div className="mt-2 mx-4 border-t border-b border-line">
        {/* Selector de tema */}
        <div className="py-3 border-b border-line">
          <span className="text-[15px] text-neutral-300 block mb-2">Tema</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema visual">
            {THEME_CARDS.map((t) => {
              const isSelected = themeId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setThemeId(t.id)}
                  className={`press min-h-16 p-2 rounded-md border text-left flex flex-col justify-between ${
                    isSelected
                      ? 'border-accent bg-elevated'
                      : 'border-line-strong bg-surface hover:bg-elevated'
                  }`}
                >
                  <div
                    className="w-full h-6 rounded-sm flex overflow-hidden border border-line"
                    aria-hidden="true"
                  >
                    <span className="flex-1" style={{ backgroundColor: t.swatches[0] }} />
                    <span className="flex-1" style={{ backgroundColor: t.swatches[1] }} />
                    <span className="flex-1" style={{ backgroundColor: t.swatches[2] }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block leading-tight">
                        {t.name}
                      </span>
                      <span className="text-[11px] text-neutral-400 block mt-0.5">
                        {t.modeLabel}
                      </span>
                    </div>
                    {isSelected && (
                      <span
                        className="w-4 h-4 rounded-full bg-accent text-accent-fg flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selector de acento */}
        <div className="py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[15px] text-neutral-300 block">Color de acento</span>
              <span className="text-[11px] text-neutral-400 block mt-0.5">
                Seleccionado: <strong className="text-white">{selectedAccentName}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAccent(null)}
              className={`press min-h-12 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border ${
                accent === null
                  ? 'border-accent text-white bg-elevated'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
              title="Restablecer al acento por defecto del tema"
            >
              <RotateCcw size={13} />
              <span>Por defecto</span>
            </button>
          </div>

          <div
            className="flex flex-wrap items-center gap-2 pt-1"
            role="radiogroup"
            aria-label="Color de acento"
          >
            {visiblePresets.map((preset) => {
              const isSelected =
                resolvedCurrentAccent.toLowerCase() === preset.hex.toLowerCase()
              const isLightColor = getLuminance(preset.hex) > 0.35
              const checkColor = isLightColor ? '#121210' : '#ffffff'

              return (
                <button
                  key={preset.hex}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${preset.name} (${preset.hex})`}
                  title={`${preset.name} (${preset.hex})`}
                  onClick={() => setAccent(preset.hex)}
                  className={`press min-w-12 min-h-12 w-12 h-12 rounded-md flex items-center justify-center border ${
                    isSelected
                      ? 'border-white ring-2 ring-accent'
                      : 'border-line-strong hover:border-neutral-400'
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-sm flex items-center justify-center"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && (
                      <Check
                        size={16}
                        strokeWidth={3}
                        style={{ color: checkColor }}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              )
            })}

            {/* Selector de color personalizado con área táctil de 48x48 px */}
            <label
              title="Color personalizado"
              aria-label="Elegir color personalizado"
              className={`press min-w-12 min-h-12 w-12 h-12 rounded-md cursor-pointer flex items-center justify-center border ${
                isCustomAccent
                  ? 'border-white ring-2 ring-accent'
                  : 'border-line-strong hover:border-neutral-400'
              }`}
            >
              <input
                type="color"
                value={resolvedCurrentAccent}
                onChange={(e) => setAccent(e.target.value)}
                className="sr-only"
                aria-label="Elegir color personalizado"
              />
              <span
                className="w-7 h-7 rounded-sm flex items-center justify-center"
                style={{
                  backgroundColor: isCustomAccent ? resolvedCurrentAccent : undefined,
                  background: !isCustomAccent
                    ? 'conic-gradient(from 180deg at 50% 50%, #ef4444, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)'
                    : undefined,
                }}
              >
                {isCustomAccent ? (
                  <Check
                    size={16}
                    strokeWidth={3}
                    style={{
                      color: getLuminance(resolvedCurrentAccent) > 0.35 ? '#121210' : '#ffffff',
                    }}
                    aria-hidden="true"
                  />
                ) : (
                  <Pipette size={14} className="text-white drop-shadow-sm pointer-events-none" />
                )}
              </span>
            </label>
          </div>
        </div>
      </div>
    </section>
  )
}
