import { useState } from 'react'
import { HeartPulse, Check, X } from 'lucide-react'
import { db } from '../db'
import type { Settings } from '../types'
import {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  patchAppSettings,
} from '../utils/healthMetrics'

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

      const parsedHeight = heightCm.trim() ? parseFloat(heightCm.trim()) : NaN
      if (!Number.isNaN(parsedHeight) && parsedHeight > 0) patch.heightCm = parsedHeight

      if (activityLevel) patch.activityLevel = activityLevel

      await patchAppSettings(patch)

      // Si ingresó peso, guardarlo en el historial de mediciones
      const parsedWeight = weight.trim() ? parseFloat(weight.trim()) : NaN
      if (!Number.isNaN(parsedWeight) && parsedWeight > 0) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="p-5 pb-3 border-b border-neutral-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
              <HeartPulse size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Perfil de Salud</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Datos opcionales para calcular tu IMC y gasto calórico
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSaving}
            className="text-neutral-400 hover:text-white p-1 rounded-lg transition"
            title="Omitir por ahora"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario con scroll si la pantalla es chica */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Sexo */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Sexo biológico <span className="text-neutral-500 font-normal lowercase">(opcional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSex(sex === 'male' ? null : 'male')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sex === 'male'
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                {sex === 'male' && <Check size={14} />}
                Hombre
              </button>
              <button
                type="button"
                onClick={() => setSex(sex === 'female' ? null : 'female')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sex === 'female'
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                {sex === 'female' && <Check size={14} />}
                Mujer
              </button>
            </div>
          </div>

          {/* Edad y Estatura */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="age-input"
                className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5"
              >
                Edad <span className="text-neutral-500 font-normal lowercase">(años)</span>
              </label>
              <input
                id="age-input"
                type="number"
                min="10"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="ej. 25"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition"
              />
            </div>

            <div>
              <label
                htmlFor="height-input"
                className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5"
              >
                Estatura <span className="text-neutral-500 font-normal lowercase">(cm)</span>
              </label>
              <input
                id="height-input"
                type="number"
                min="80"
                max="260"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="ej. 175"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition"
              />
            </div>
          </div>

          {/* Peso inicial */}
          <div>
            <label
              htmlFor="weight-input"
              className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5"
            >
              Peso actual <span className="text-neutral-500 font-normal lowercase">({currentUnits})</span>
            </label>
            <div className="relative">
              <input
                id="weight-input"
                type="number"
                step="0.1"
                min="20"
                max="400"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="ej. 75.5"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition pr-10"
              />
              <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-bold uppercase">
                {currentUnits}
              </span>
            </div>
          </div>

          {/* Nivel de actividad */}
          <div>
            <label
              htmlFor="activity-select"
              className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5"
            >
              Nivel de actividad <span className="text-neutral-500 font-normal lowercase">(opcional)</span>
            </label>
            <select
              id="activity-select"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel | '')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500 transition"
            >
              <option value="" className="bg-neutral-900 text-neutral-400">
                Seleccionar nivel (opcional)...
              </option>
              {ACTIVITY_LEVELS.map((item) => (
                <option key={item.value} value={item.value} className="bg-neutral-900 text-white">
                  {item.label} — {item.description}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed pt-1">
            * Ningún dato es obligatorio. Puedes omitir o completar más adelante desde Ajustes. Las métricas se pueden desactivar en cualquier momento.
          </p>

          {/* Botones de acción */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-4 bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
            >
              Guardar perfil
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isSaving}
              className="w-full py-2 px-4 bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 font-medium rounded-xl text-xs transition"
            >
              Omitir por ahora
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
