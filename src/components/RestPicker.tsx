import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Sheet } from './ui'
import type { WeightUnit } from '../utils/weightUnits'

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

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="space-y-4 py-2">
        {currentWeightUnit && onWeightUnitChange && (
          <fieldset className="space-y-2" aria-label="Unidad de peso">
            <legend className="label-tech">Unidad de peso</legend>
            <div className="flex flex-wrap gap-2">
              {allowGlobal && globalWeightUnit && (
                <label className="flex items-center gap-2 text-xs bg-elevated border border-line-strong rounded-md px-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="weight-unit"
                    value="global"
                    checked={!weightUnitOverride}
                    onChange={() => onWeightUnitChange(null)}
                  />
                  <span>Global ({globalWeightUnit})</span>
                </label>
              )}
              {(['kg', 'lb'] as const).map((unit) => (
                <label
                  key={unit}
                  className="flex items-center gap-2 text-xs bg-elevated border border-line-strong rounded-md px-3 py-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="weight-unit"
                    value={unit}
                    checked={
                      currentWeightUnit === unit && (!allowGlobal || !!weightUnitOverride)
                    }
                    onChange={() => onWeightUnitChange(unit)}
                  />
                  <span>{unit === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-neutral-400">
              Al cambiar la unidad, las cargas ya anotadas se convierten.
            </p>
          </fieldset>
        )}

        {allowGlobal && (
          <button
            type="button"
            onClick={() => {
              if (onUseGlobal) onUseGlobal()
              onClose()
            }}
            className="press w-full min-h-12 bg-elevated border border-line-strong text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} strokeWidth={1.75} className="text-neutral-400" />
            <span>Usar descanso global</span>
          </button>
        )}

        <div>
          <div className="label-tech mb-2">Opciones predefinidas</div>
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
                  className={`press min-h-12 px-2 rounded-md text-sm font-semibold border text-center ${
                    isSelected
                      ? 'bg-accent text-accent-fg border-accent'
                      : 'bg-elevated border-line-strong text-neutral-200'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleApplyCustom} className="pt-2 border-t border-line space-y-2">
          <label className="label-tech block">
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
              className={`flex-1 field ${
                customError ? 'border-red-400' : ''
              }`}
            />
            <button
              type="submit"
              className="btn-secondary whitespace-nowrap"
            >
              Aplicar
            </button>
          </div>
          {customError && (
            <p className="text-xs text-red-400">
              Formato inválido. Ingresa segundos (ej. 75) o mm:ss (ej. 1:15).
            </p>
          )}
        </form>
      </div>
    </Sheet>
  )
}
