import { Link } from 'react-router-dom'
import type { Settings } from '../types'
import {
  calculateBmi,
  calculateBmr,
  calculateTdee,
  weightToKg,
} from '../utils/healthMetrics'
import { formatNumber } from '../utils/format'

interface HealthMetricsSectionProps {
  settings?: Settings
  latestBodyweight: number
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'sedentaria',
  light: 'ligera',
  moderate: 'moderada',
  very_active: 'alta',
  extra_active: 'muy alta',
}

export function HealthMetricsSection({ settings, latestBodyweight }: HealthMetricsSectionProps) {
  // Si el usuario desactivó las métricas en los ajustes, no mostrar la sección
  if (settings && settings.enableHealthMetrics === false) {
    return null
  }

  const unit = settings?.units ?? 'kg'
  const weightKg = latestBodyweight > 0 ? weightToKg(latestBodyweight, unit) : 0
  const heightCm = settings?.heightCm ?? 0
  const age = settings?.age ?? 0
  const sex = settings?.sex
  const activityLevel = settings?.activityLevel

  // Métricas calculadas por la app
  const bmi = weightKg > 0 && heightCm > 0 ? calculateBmi(weightKg, heightCm) : null
  const bmr = weightKg > 0 && heightCm > 0 && sex && age > 0 ? calculateBmr(weightKg, heightCm, age, sex) : null
  const tdee = bmr && activityLevel ? calculateTdee(bmr, activityLevel) : null

  const isComplete = weightKg > 0 && bmi !== null && bmr !== null && tdee !== null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Métricas de salud
          </h2>
          <p className="text-[13px] text-neutral-400">Calculadas por la app</p>
        </div>
        <Link
          to="/settings"
          className="text-xs text-neutral-400 hover:text-white transition"
        >
          Ajustes
        </Link>
      </div>

      {isComplete ? (
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <ul className="divide-y divide-line list-none px-4">
            <li className="flex items-center justify-between min-h-12 py-2">
              <span className="text-[15px] text-neutral-300">Peso corporal</span>
              <span className="text-[15px] font-semibold text-white num">
                {formatNumber(latestBodyweight, 1, 1)} {unit}
              </span>
            </li>
            <li className="flex items-center justify-between min-h-12 py-2">
              <span className="text-[15px] text-neutral-300">IMC</span>
              <span className="text-[15px] font-semibold text-white num">
                {formatNumber(bmi.value, 1, 1)}
              </span>
            </li>
            <li className="flex items-center justify-between min-h-12 py-2">
              <span className="text-[15px] text-neutral-300">TMB</span>
              <span className="text-[15px] font-semibold text-white num">
                {formatNumber(bmr, 0, 0)} kcal
              </span>
            </li>
            <li className="flex items-center justify-between min-h-12 py-2">
              <span className="text-[15px] text-neutral-300">TDEE</span>
              <span className="text-[15px] font-semibold text-white num">
                {formatNumber(tdee, 0, 0)} kcal
              </span>
            </li>
          </ul>
          <p className="hint border-t border-line text-xs text-neutral-400">
            Con tu último peso, {heightCm} cm, {age} años y actividad {activityLevel ? ACTIVITY_LABELS[activityLevel] || activityLevel : 'moderada'}.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-lg p-4 text-center space-y-2">
          <h3 className="text-sm font-semibold text-white">Faltan datos para calcular</h3>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            {weightKg <= 0
              ? 'IMC, TMB y TDEE necesitan tu peso de hoy. Regístralo en Medidas y aparecerán aquí.'
              : 'Configura tu estatura, edad, sexo y actividad en Ajustes para calcular tu IMC, TMB y TDEE.'}
          </p>
          <div className="pt-2">
            {weightKg <= 0 ? (
              <Link
                to="/measurements"
                className="btn-secondary text-xs"
              >
                Registrar peso
              </Link>
            ) : (
              <Link
                to="/settings"
                className="btn-secondary text-xs"
              >
                Configurar perfil
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
