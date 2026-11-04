import { createPortal } from 'react-dom'
import type { WeightUnit } from '../utils/weightUnits'
import { useState } from 'react'
import { Timer, X, RotateCcw } from 'lucide-react'

export interface RestPickerProps {
  isOpen: boolean
  title: string
  currentSeconds: number
  allowGlobal?: boolean
  currentWeightUnit?: WeightUnit
  globalWeightUnit?: WeightUnit
  weightUnitOverride?: WeightUnit
  onWeightUnitChange?: (unit: WeightUnit | null) => void
  onSelect: (seconds: number) => void
  onUseGlobal?: () => void
  onClose: () => void
}

const PRESETS = [
  { label: 'Sin descanso', seconds: 0 },
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1:00', seconds: 60 },
  { label: '1:30', seconds: 90 },
  { label: '2:00', seconds: 120 },
  { label: '2:30', seconds: 150 },
  { label: '3:00', seconds: 180 },
  { label: '4:00', seconds: 240 },
  { label: '5:00', seconds: 300 },
]

function parseCustomTime(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10)
      const s = parseInt(parts[1], 10)
      if (!isNaN(m) && !isNaN(s) && m >= 0 && s >= 0 && s < 60) {
        return m * 60 + s
      }
    }
    return null
  }
  const num = parseInt(trimmed, 10)
  if (!isNaN(num) && num >= 0 && num <= 3600) {
    return num
  }
  return null
}

export function RestPicker({
  isOpen,
  title,
  currentSeconds,
  allowGlobal = false,
  currentWeightUnit,
  globalWeightUnit,
  weightUnitOverride,
  onWeightUnitChange,
  onSelect,
  onUseGlobal,
  onClose,
}: RestPickerProps) {
  const [customValue, setCustomValue] = useState('')
  const [customError, setCustomError] = useState(false)

  if (!isOpen) return null

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseCustomTime(customValue)
    if (parsed !== null) {
      setCustomError(false)
      onSelect(parsed)
      onClose()
    } else {
      setCustomError(true)
    }
  }

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label={title}
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Timer size={20} className="text-white" />
            <h2 className="text-base font-bold text-white truncate max-w-[260px]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {currentWeightUnit && onWeightUnitChange && (
          <fieldset className="space-y-2" aria-label="Unidad de peso">
            <legend className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">Unidad de peso</legend>
            <div className="flex flex-wrap gap-2">
              {allowGlobal && globalWeightUnit && (
                <label className="flex items-center gap-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2">
                  <input type="radio" name="weight-unit" value="global" checked={!weightUnitOverride} onChange={() => onWeightUnitChange(null)} />
                  Global ({globalWeightUnit})
                </label>
              )}
              {(['kg', 'lb'] as const).map(unit => (
                <label key={unit} className="flex items-center gap-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2">
                  <input type="radio" name="weight-unit" value={unit} checked={currentWeightUnit === unit && (!allowGlobal || !!weightUnitOverride)} onChange={() => onWeightUnitChange(unit)} />
                  {unit === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400">Al cambiar la unidad, las cargas ya anotadas se convierten.</p>
          </fieldset>
        )}

        {/* Botón opcional para usar descanso global */}
        {allowGlobal && (
          <button
            type="button"
            onClick={() => {
              if (onUseGlobal) onUseGlobal()
              onClose()
            }}
            className="w-full py-2.5 px-3 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} className="text-neutral-400" />
            <span>Usar descanso global</span>
          </button>
        )}

        {/* Presets */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 mb-2">
            Opciones predefinidas
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRESETS.map((preset) => {
              const isSelected = preset.seconds === currentSeconds
              return (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => {
                    onSelect(preset.seconds)
                    onClose()
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition ${
                    isSelected
                      ? 'bg-white text-black font-bold border-white shadow-sm'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Input personalizado */}
        <form onSubmit={handleApplyCustom} className="pt-2 border-t border-neutral-800 space-y-2">
          <label className="block text-[11px] uppercase tracking-wider font-bold text-neutral-400">
            Tiempo personalizado (segundos o mm:ss)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customValue}
              onChange={(e) => {
                setCustomValue(e.target.value)
                if (customError) setCustomError(false)
              }}
              placeholder="Ej. 75 o 1:15"
              className={`flex-1 bg-neutral-950 border rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition ${
                customError ? 'border-red-500' : 'border-neutral-800 focus:border-white'
              }`}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-800 hover:bg-white hover:text-black border border-neutral-700 hover:border-white text-white text-xs font-semibold rounded-xl transition"
            >
              Aplicar
            </button>
          </div>
          {customError && (
            <p className="text-[11px] text-red-400">
              Formato inválido. Ingresa segundos (ej. 75) o mm:ss (ej. 1:15).
            </p>
          )}
        </form>
      </div>
    </div>,
    document.body,
  )
}
