import { Link } from 'react-router-dom'
import { HeartPulse, ChevronRight, Activity, Flame, Scale, Sparkles } from 'lucide-react'
import type { Settings } from '../types'
import {
  calculateBmi,
  calculateBmr,
  calculateTdee,
  weightToKg,
} from '../utils/healthMetrics'

interface HealthMetricsSectionProps {
  settings?: Settings
  latestBodyweight: number
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

  const bmi = calculateBmi(weightKg, heightCm)
  const bmr = sex && age > 0 ? calculateBmr(weightKg, heightCm, age, sex) : null
  const tdee = bmr && activityLevel ? calculateTdee(bmr, activityLevel) : null

  const hasAnyMetric = bmi !== null || bmr !== null || tdee !== null

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
            <HeartPulse size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Métricas de Salud
            </h2>
            <p className="text-xs text-neutral-400">IMC, Metabolismo Basal y Gasto Diario</p>
          </div>
        </div>

        <Link
          to="/settings"
          className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 py-1 px-2 rounded-lg bg-neutral-950 border border-neutral-800 transition"
        >
          <span>Ajustes</span>
          <ChevronRight size={12} />
        </Link>
      </div>

      {!hasAnyMetric ? (
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 text-center space-y-2">
          <p className="text-xs text-neutral-400">
            Registra tu peso y estatura para calcular tu IMC, metabolismo basal (TMB) y gasto calórico diario (TDEE).
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-lg transition"
          >
            Configurar perfil
            <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* IMC */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1.5">
                  <Scale size={14} />
                  Índice Masa (IMC)
                </span>
              </div>
              {bmi ? (
                <div>
                  <div className="text-xl font-extrabold text-white">{bmi.value}</div>
                  <div className={`text-[11px] font-semibold mt-0.5 ${bmi.color}`}>
                    {bmi.category}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 italic mt-2">
                  Falta {weightKg <= 0 ? 'peso' : 'estatura'}
                </div>
              )}
            </div>

            {/* TMB / BMR */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1.5">
                  <Activity size={14} />
                  Metabolismo (TMB)
                </span>
              </div>
              {bmr ? (
                <div>
                  <div className="text-xl font-extrabold text-white">
                    {bmr.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-neutral-400">kcal</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">En reposo absoluto</div>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 italic mt-2">
                  Requiere edad y sexo
                </div>
              )}
            </div>

            {/* TDEE */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1.5">
                  <Flame size={14} />
                  Gasto Diario (TDEE)
                </span>
              </div>
              {tdee ? (
                <div>
                  <div className="text-xl font-extrabold text-white">
                    {tdee.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-neutral-400">kcal</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Mantenimiento diario</div>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 italic mt-2">
                  {bmr ? 'Falta nivel actividad' : 'Requiere TMB'}
                </div>
              )}
            </div>
          </div>

          {/* Sugerencias de calorías si hay TDEE */}
          {tdee && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-white" />
                <span>Objetivos calóricos diarios estimados:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neutral-900 border border-neutral-800/80 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Déficit (-400)</div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {(tdee - 400).toLocaleString()} kcal
                  </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800/80 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Mantenimiento</div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {tdee.toLocaleString()} kcal
                  </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800/80 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Superávit (+300)</div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {(tdee + 300).toLocaleString()} kcal
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
