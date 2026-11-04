import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, CheckCircle2, Plus } from 'lucide-react'
import { db } from '../../db'
import { ACTIVITY_LEVELS, type ActivityLevel } from '../../utils/healthMetrics'
import { parseDecimal, formatNumber } from '../../utils/format'
import type { Settings } from '../../types'

interface HealthSectionProps {
  settings?: Settings
  patchSettings: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>
}

export function HealthSection({ settings, patchSettings }: HealthSectionProps) {
  const currentUnits = settings?.units ?? 'kg'
  const currentEnableHealthMetrics = settings?.enableHealthMetrics !== false

  const [newWeight, setNewWeight] = useState<string>('')
  const [weightStatus, setWeightStatus] = useState<string | null>(null)

  const latestWeightMeasurement = useLiveQuery(async () => {
    const list = await db.measurements
      .filter((m) => m.type === 'bodyweight')
      .sortBy('date')
    return list.length > 0 ? list[list.length - 1] : null
  }, [])

  const handleToggleMetrics = () => {
    patchSettings({ enableHealthMetrics: !currentEnableHealthMetrics })
  }

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedWeight = parseDecimal(newWeight)
    if (parsedWeight === undefined || parsedWeight <= 0) return

    await db.measurements.add({
      id: `meas-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: Date.now(),
      type: 'bodyweight',
      value: parsedWeight,
      unit: currentUnits,
    })
    setNewWeight('')
    setWeightStatus(`Peso registrado: ${formatNumber(parsedWeight, 1, 2)} ${currentUnits}.`)
    setTimeout(() => setWeightStatus(null), 3000)
  }

  return (
    <section className="mt-5">
      <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
        Salud y Perfil
      </h2>

      <div className="mt-2 mx-4 border-t border-b border-line">
        {/* Interruptor de métricas de salud */}
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <span className="text-[15px] text-neutral-300 block">Métricas de salud</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Cálculo y visualización de IMC, TMB y TDEE en Progreso
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={currentEnableHealthMetrics}
            aria-label="Activar o desactivar métricas de salud"
            onClick={handleToggleMetrics}
            className="press min-w-12 min-h-12 flex items-center justify-center shrink-0"
          >
            <span
              className={`relative inline-block w-12 h-7 rounded-full border transition-colors ${
                currentEnableHealthMetrics
                  ? 'bg-accent border-accent'
                  : 'bg-elevated border-line-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                  currentEnableHealthMetrics
                    ? 'translate-x-5 bg-accent-fg'
                    : 'translate-x-0 bg-neutral-400'
                }`}
              />
            </span>
          </button>
        </div>

        {/* Registro de peso corporal actual */}
        <div className="py-3 border-b border-line">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
            <span className="text-[15px] text-neutral-300">Peso corporal actual</span>
            {latestWeightMeasurement && (
              <span className="text-[11px] text-neutral-400">
                Último:{' '}
                <strong className="text-white num">
                  {formatNumber(latestWeightMeasurement.value, 1, 2)} {latestWeightMeasurement.unit}
                </strong>{' '}
                ({format(new Date(latestWeightMeasurement.date), 'dd MMM yyyy', { locale: es })})
              </span>
            )}
          </div>

          <form onSubmit={handleSaveWeight} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Nuevo peso corporal..."
                aria-label="Nuevo peso corporal"
                className="w-full min-h-12 bg-elevated border border-line-strong rounded-md px-3 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-accent pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 uppercase pointer-events-none">
                {currentUnits}
              </span>
            </div>
            <button
              type="submit"
              disabled={!newWeight.trim()}
              className="press min-h-12 px-4 bg-accent disabled:opacity-40 text-accent-fg font-bold rounded-md text-xs shrink-0 flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Registrar</span>
            </button>
          </form>

          {weightStatus && (
            <div className="mt-2 text-xs p-2.5 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{weightStatus}</span>
            </div>
          )}
        </div>

        {/* Formulario de perfil biológico */}
        <div className="py-3">
          <HealthProfileForm
            key={`${settings?.sex}-${settings?.age}-${settings?.heightCm}-${settings?.activityLevel}`}
            settings={settings}
            patchSettings={patchSettings}
          />
        </div>
      </div>
    </section>
  )
}

interface HealthProfileFormProps {
  settings?: Settings
  patchSettings: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>
}

function HealthProfileForm({ settings, patchSettings }: HealthProfileFormProps) {
  const [profileSex, setProfileSex] = useState<'male' | 'female' | null>(() => settings?.sex ?? null)
  const [profileAge, setProfileAge] = useState<string>(() => (settings?.age ? String(settings.age) : ''))
  const [profileHeight, setProfileHeight] = useState<string>(() =>
    settings?.heightCm ? String(settings.heightCm) : ''
  )
  const [profileActivity, setProfileActivity] = useState<ActivityLevel | ''>(() => settings?.activityLevel ?? '')
  const [profileStatus, setProfileStatus] = useState<string | null>(null)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const patch: Partial<Omit<Settings, 'id'>> = {}
    patch.sex = profileSex ?? undefined
    const parsedAge = parseDecimal(profileAge)
    patch.age = parsedAge !== undefined && parsedAge > 0 ? Math.round(parsedAge) : undefined
    const parsedHeight = parseDecimal(profileHeight)
    patch.heightCm = parsedHeight !== undefined && parsedHeight > 0 ? parsedHeight : undefined
    patch.activityLevel = profileActivity || undefined
    patch.healthOnboarded = true

    await patchSettings(patch)
    setProfileStatus('Perfil de salud guardado.')
    setTimeout(() => setProfileStatus(null), 3000)
  }

  return (
    <form onSubmit={handleSaveProfile} className="space-y-3">
      <span className="text-[13px] font-semibold text-neutral-300 block">
        Datos de perfil (opcionales)
      </span>

      {/* Sexo */}
      <div>
        <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
          Sexo biológico
        </label>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Sexo biológico">
          <button
            type="button"
            aria-pressed={profileSex === 'male'}
            onClick={() => setProfileSex(profileSex === 'male' ? null : 'male')}
            className={`press min-h-12 px-3 rounded-md border text-xs font-semibold flex items-center justify-center gap-1.5 ${
              profileSex === 'male'
                ? 'bg-accent text-accent-fg border-accent font-bold'
                : 'bg-elevated text-neutral-300 border-line-strong hover:text-white'
            }`}
          >
            {profileSex === 'male' && <Check size={16} strokeWidth={2.5} />}
            Hombre
          </button>
          <button
            type="button"
            aria-pressed={profileSex === 'female'}
            onClick={() => setProfileSex(profileSex === 'female' ? null : 'female')}
            className={`press min-h-12 px-3 rounded-md border text-xs font-semibold flex items-center justify-center gap-1.5 ${
              profileSex === 'female'
                ? 'bg-accent text-accent-fg border-accent font-bold'
                : 'bg-elevated text-neutral-300 border-line-strong hover:text-white'
            }`}
          >
            {profileSex === 'female' && <Check size={16} strokeWidth={2.5} />}
            Mujer
          </button>
        </div>
      </div>

      {/* Edad y Estatura */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor="settings-age-input"
            className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1"
          >
            Edad (años)
          </label>
          <input
            id="settings-age-input"
            type="text"
            inputMode="numeric"
            value={profileAge}
            onChange={(e) => setProfileAge(e.target.value)}
            placeholder="ej. 25"
            className="w-full min-h-12 bg-elevated border border-line-strong rounded-md px-3 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label
            htmlFor="settings-height-input"
            className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1"
          >
            Estatura (cm)
          </label>
          <input
            id="settings-height-input"
            type="text"
            inputMode="decimal"
            value={profileHeight}
            onChange={(e) => setProfileHeight(e.target.value)}
            placeholder="ej. 175"
            className="w-full min-h-12 bg-elevated border border-line-strong rounded-md px-3 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Nivel de actividad */}
      <div>
        <label
          htmlFor="settings-activity-select"
          className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1"
        >
          Nivel de actividad
        </label>
        <select
          id="settings-activity-select"
          value={profileActivity}
          onChange={(e) => setProfileActivity(e.target.value as ActivityLevel | '')}
          className="w-full min-h-12 bg-elevated border border-line-strong rounded-md px-3 text-xs text-white focus:outline-none focus:border-accent"
        >
          <option value="" className="bg-surface text-neutral-400">
            Seleccionar nivel (opcional)...
          </option>
          {ACTIVITY_LEVELS.map((item) => (
            <option key={item.value} value={item.value} className="bg-surface text-white">
              {item.label} — {item.description}
            </option>
          ))}
        </select>
      </div>

      {profileStatus && (
        <div className="text-xs p-2.5 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{profileStatus}</span>
        </div>
      )}

      <button
        type="submit"
        className="press w-full min-h-12 px-3 bg-elevated hover:bg-neutral-800 text-white font-semibold rounded-md text-xs border border-line-strong flex items-center justify-center"
      >
        Guardar perfil
      </button>
    </form>
  )
}
