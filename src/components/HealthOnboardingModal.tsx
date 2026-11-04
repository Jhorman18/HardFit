import { useState } from 'react'
import { db } from '../db'
import type { Settings } from '../types'
import {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  patchAppSettings,
} from '../utils/healthMetrics'
import { parseDecimal } from '../utils/format'
import { Sheet } from './ui/Sheet'

interface HealthOnboardingModalProps {
  settings?: Settings
  onClose?: () => void
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `meas-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function HealthOnboardingModal({ settings, onClose }: HealthOnboardingModalProps) {
  const currentUnits = settings?.units ?? 'kg'

  const [sex, setSex] = useState<'male' | 'female' | null>(settings?.sex ?? null)
  const [age, setAge] = useState<string>(settings?.age ? String(settings.age) : '')
  const [heightCm, setHeightCm] = useState<string>(settings?.heightCm ? String(settings.heightCm) : '')
  const [weight, setWeight] = useState<string>('')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>(settings?.activityLevel ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleDismiss = async () => {
    setIsSaving(true)
    try {
      await patchAppSettings({ healthOnboarded: true })
      onClose?.()
    } catch (err) {
      console.error('Error al omitir onboarding:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const patch: Partial<Omit<Settings, 'id'>> = {
        healthOnboarded: true,
        enableHealthMetrics: true,
      }

      if (sex) patch.sex = sex
      const parsedAge = age.trim() ? parseInt(age.trim(), 10) : NaN
      if (!Number.isNaN(parsedAge) && parsedAge > 0) patch.age = parsedAge

      const parsedHeight = heightCm.trim() ? parseDecimal(heightCm.trim()) : undefined
      if (parsedHeight !== undefined && parsedHeight > 0) patch.heightCm = parsedHeight

      if (activityLevel) patch.activityLevel = activityLevel

      await patchAppSettings(patch)

      // Si ingresó peso, guardarlo en el historial de mediciones
      const parsedWeight = weight.trim() ? parseDecimal(weight.trim()) : undefined
      if (parsedWeight !== undefined && parsedWeight > 0) {
        await db.measurements.add({
          id: generateId(),
          date: Date.now(),
          type: 'bodyweight',
          value: parsedWeight,
          unit: currentUnits,
        })
      }

      onClose?.()
    } catch (err) {
      console.error('Error al guardar perfil de salud:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title="Perfil de salud"
      onClose={handleDismiss}
      footer={
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary w-full"
          >
            Guardar perfil
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSaving}
            className="w-full min-h-11 text-xs text-neutral-400 hover:text-white transition flex items-center justify-center"
          >
            Omitir por ahora
          </button>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4 pt-1">
        <p className="text-xs text-neutral-400">
          Datos opcionales para calcular IMC, TMB y TDEE. Puedes cambiarlos en cualquier momento en Ajustes.
        </p>

        {/* Sexo biológico */}
        <div>
          <label className="label-tech block mb-1.5">
            Sexo biológico <span className="text-neutral-400 font-normal lowercase">(opcional)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSex(sex === 'male' ? null : 'male')}
              className={`press min-h-12 rounded-md border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                sex === 'male'
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-elevated text-neutral-300 border-line-strong'
              }`}
            >
              Hombre
            </button>
            <button
              type="button"
              onClick={() => setSex(sex === 'female' ? null : 'female')}
              className={`press min-h-12 rounded-md border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                sex === 'female'
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-elevated text-neutral-300 border-line-strong'
              }`}
            >
              Mujer
            </button>
          </div>
        </div>

        {/* Edad y Estatura */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="health-age" className="label-tech block mb-1.5">
              Edad <span className="text-neutral-400 font-normal lowercase">(años)</span>
            </label>
            <input
              id="health-age"
              type="text"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="34"
              className="field num"
            />
          </div>

          <div>
            <label htmlFor="health-height" className="label-tech block mb-1.5">
              Estatura <span className="text-neutral-400 font-normal lowercase">(cm)</span>
            </label>
            <input
              id="health-height"
              type="text"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="178"
              className="field num"
            />
          </div>
        </div>

        {/* Peso inicial */}
        <div>
          <label htmlFor="health-weight" className="label-tech block mb-1.5">
            Peso actual <span className="text-neutral-400 font-normal lowercase">({currentUnits})</span>
          </label>
          <div className="relative">
            <input
              id="health-weight"
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="78,4"
              className="field num pr-12"
            />
            <span className="absolute right-3 top-3 text-xs text-neutral-400 font-bold uppercase pointer-events-none">
              {currentUnits}
            </span>
          </div>
        </div>

        {/* Nivel de actividad */}
        <div>
          <label htmlFor="health-activity" className="label-tech block mb-1.5">
            Nivel de actividad <span className="text-neutral-400 font-normal lowercase">(opcional)</span>
          </label>
          <select
            id="health-activity"
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel | '')}
            className="field"
          >
            <option value="">Seleccionar nivel...</option>
            {ACTIVITY_LEVELS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} — {item.description}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Sheet>
  )
}
