import { DEFAULT_BAR_KG } from '../../utils/plates'
import type { Settings } from '../../types'

interface TrainingSectionProps {
  settings?: Settings
  patchSettings: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>
}

export function TrainingSection({ settings, patchSettings }: TrainingSectionProps) {
  const currentUnits = settings?.units ?? 'kg'
  const currentRestSeconds = settings?.restSeconds ?? 120
  const currentShowRpe = settings?.showRpe ?? false
  const currentBarKg = settings?.barKg ?? DEFAULT_BAR_KG

  const handleUnitChange = (unit: 'kg' | 'lb') => {
    patchSettings({ units: unit })
  }

  const handleRestChange = (seconds: number) => {
    patchSettings({ restSeconds: seconds })
  }

  const handleRpeToggle = () => {
    patchSettings({ showRpe: !currentShowRpe })
  }

  const handleBarChange = (barKg: number) => {
    patchSettings({ barKg })
  }

  return (
    <section className="mt-5">
      <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
        Entrenamiento
      </h2>

      <div className="mt-2 mx-4 border-t border-b border-line">
        {/* Unidad de peso */}
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between gap-3">
          <span className="text-[15px] text-neutral-300">Unidad de peso</span>
          <div className="inline-flex items-center gap-1.5" role="group" aria-label="Unidad de peso">
            <button
              type="button"
              aria-pressed={currentUnits === 'kg'}
              onClick={() => handleUnitChange('kg')}
              className={`press min-w-12 min-h-12 px-3 rounded-md text-xs font-semibold flex items-center justify-center border ${
                currentUnits === 'kg'
                  ? 'bg-accent text-accent-fg border-accent font-bold'
                  : 'bg-elevated text-neutral-300 border-line-strong hover:text-white'
              }`}
            >
              kg
            </button>
            <button
              type="button"
              aria-pressed={currentUnits === 'lb'}
              onClick={() => handleUnitChange('lb')}
              className={`press min-w-12 min-h-12 px-3 rounded-md text-xs font-semibold flex items-center justify-center border ${
                currentUnits === 'lb'
                  ? 'bg-accent text-accent-fg border-accent font-bold'
                  : 'bg-elevated text-neutral-300 border-line-strong hover:text-white'
              }`}
            >
              lb
            </button>
          </div>
        </div>

        {/* Descanso por defecto */}
        <div className="min-h-12 py-2 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[15px] text-neutral-300 block">Descanso por defecto</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Tiempo activo: <strong className="text-white num">{currentRestSeconds} s</strong>
            </span>
          </div>
          <div
            className="inline-flex items-center gap-1.5 self-end sm:self-auto"
            role="group"
            aria-label="Descanso por defecto"
          >
            {[
              { label: '60s', val: 60 },
              { label: '90s', val: 90 },
              { label: '120s', val: 120 },
              { label: '180s', val: 180 },
            ].map((item) => {
              const isSelected = currentRestSeconds === item.val
              return (
                <button
                  key={item.val}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleRestChange(item.val)}
                  className={`press min-w-12 min-h-12 px-2.5 rounded-md text-xs font-semibold num flex items-center justify-center border ${
                    isSelected
                      ? 'bg-accent text-accent-fg border-accent font-bold'
                      : 'bg-elevated text-neutral-300 border-line-strong hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Mostrar RPE */}
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <span className="text-[15px] text-neutral-300 block">Mostrar RPE</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Columna de esfuerzo percibido (1–10) en cada serie
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={currentShowRpe}
            aria-label="Mostrar esfuerzo percibido RPE en las series"
            onClick={handleRpeToggle}
            className="press min-w-12 min-h-12 flex items-center justify-center shrink-0"
          >
            <span
              className={`relative inline-block w-12 h-7 rounded-full border transition-colors ${
                currentShowRpe
                  ? 'bg-accent border-accent'
                  : 'bg-elevated border-line-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                  currentShowRpe
                    ? 'translate-x-5 bg-accent-fg'
                    : 'translate-x-0 bg-neutral-400'
                }`}
              />
            </span>
          </button>
        </div>

        {/* Barra de referencia */}
        <div className="min-h-12 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[15px] text-neutral-300 block">Barra de referencia</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Peso base para el desglose de discos
            </span>
          </div>
          <div
            className="inline-flex items-center gap-1.5 self-end sm:self-auto"
            role="group"
            aria-label="Barra de referencia en kg"
          >
            {[10, 15, 20].map((kg) => {
              const isSelected = currentBarKg === kg
              return (
                <button
                  key={kg}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleBarChange(kg)}
                  className={`press min-w-12 min-h-12 px-3 rounded-md text-xs font-semibold num flex items-center justify-center border ${
                    isSelected
                      ? 'bg-accent text-accent-fg border-accent font-bold'
                      : 'bg-elevated text-neutral-300 border-line-strong hover:text-white'
                  }`}
                >
                  {kg} kg
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
