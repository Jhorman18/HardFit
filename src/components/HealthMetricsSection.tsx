import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  HeartPulse,
  ChevronRight,
  Activity,
  Flame,
  Scale,
  Sparkles,
  Heart,
  Droplets,
  Dumbbell,
  Target,
  PieChart,
} from 'lucide-react'
import { db } from '../db'
import type { Settings } from '../types'
import {
  calculateBmi,
  calculateBmr,
  calculateTdee,
  weightToKg,
  healthyWeightRange,
  calculateBodyFat,
  calculateHrMax,
  hrZones,
  hydrationRange,
  calculateMacros,
  estimateWorkoutCalories,
} from '../utils/healthMetrics'

interface HealthMetricsSectionProps {
  settings?: Settings
  latestBodyweight: number
}

export function HealthMetricsSection({ settings, latestBodyweight }: HealthMetricsSectionProps) {
  // Duración promedio y calorías estimadas por entreno (Hooks siempre incondicionales al inicio)
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])

  const finishedWorkouts = useMemo(() => {
    if (!workouts) return []
    return workouts.filter(
      (w) => typeof w.finishedAt === 'number' && w.finishedAt > w.startedAt
    )
  }, [workouts])

  const avgWorkoutDurationMin = useMemo(() => {
    if (finishedWorkouts.length === 0) return 0
    const totalMs = finishedWorkouts.reduce(
      (acc, w) => acc + ((w.finishedAt as number) - w.startedAt),
      0
    )
    return totalMs / finishedWorkouts.length / 60000
  }, [finishedWorkouts])

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

  // Métricas base
  const bmi = calculateBmi(weightKg, heightCm)
  const bmr = sex && age > 0 ? calculateBmr(weightKg, heightCm, age, sex) : null
  const tdee = bmr && activityLevel ? calculateTdee(bmr, activityLevel) : null

  // Nuevas métricas de salud
  const weightRange = healthyWeightRange(heightCm)
  const bodyFat =
    bmi && age > 0 && (sex === 'male' || sex === 'female')
      ? calculateBodyFat(bmi.value, age, sex)
      : null
  const hrMax = calculateHrMax(age)
  const zones = hrMax ? hrZones(hrMax) : []
  const hydration = hydrationRange(weightKg)
  const macros = tdee && weightKg > 0 ? calculateMacros(tdee, weightKg) : null

  const workoutCalories =
    weightKg > 0 && avgWorkoutDurationMin > 0
      ? estimateWorkoutCalories(avgWorkoutDurationMin, weightKg)
      : null

  const hasAnyMetric =
    bmi !== null ||
    bmr !== null ||
    tdee !== null ||
    weightRange !== null ||
    bodyFat !== null ||
    hrMax !== null ||
    hydration !== null ||
    finishedWorkouts.length > 0

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
            <p className="text-xs text-neutral-400">
              Composición corporal, gasto energético, zonas y nutrición
            </p>
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
            Registra tu peso, estatura, edad y sexo en tu perfil para calcular tu IMC, metabolismo basal (TMB), gasto calórico (TDEE), zonas cardíacas y macros.
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
          {/* Tarjetas principales en cuadrícula */}
          <div className="grid grid-cols-2 gap-2.5">
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

            {/* Rango de peso saludable */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1.5">
                  <Target size={14} />
                  Rango de peso saludable
                </span>
              </div>
              {weightRange ? (
                <div>
                  <div className="text-xl font-extrabold text-white">
                    {weightRange.minKg}–{weightRange.maxKg}{' '}
                    <span className="text-xs font-normal text-neutral-400">kg</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">IMC 18.5 – 24.9</div>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 italic mt-2">
                  Falta estatura
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

            {/* % grasa estimado (Deurenberg) */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1.5">
                  <Scale size={14} />
                  % grasa estimado (Deurenberg)
                </span>
              </div>
              {bodyFat !== null ? (
                <div>
                  <div className="text-xl font-extrabold text-white">{bodyFat}%</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">aproximado</div>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 italic mt-2">
                  {!bmi ? 'Falta peso/estatura' : 'Requiere edad y sexo'}
                </div>
              )}
            </div>

            {/* Hidratación diaria */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1.5">
                  <Droplets size={14} />
                  Hidratación diaria
                </span>
              </div>
              {hydration ? (
                <div>
                  <div className="text-xl font-extrabold text-white">
                    {(hydration.minMl / 1000).toFixed(1)}–{(hydration.maxMl / 1000).toFixed(1)}{' '}
                    <span className="text-xs font-normal text-neutral-400">L</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">30–35 ml/kg al día</div>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 italic mt-2">
                  Falta peso
                </div>
              )}
            </div>

            {/* Calorías por entreno (estimado) */}
            <div className="col-span-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1.5">
                  <Dumbbell size={14} />
                  Calorías por entreno (estimado)
                </span>
                {finishedWorkouts.length > 0 && avgWorkoutDurationMin > 0 && (
                  <span className="text-[10px] text-neutral-500">
                    Promedio: {Math.round(avgWorkoutDurationMin)} min ({finishedWorkouts.length}{' '}
                    {finishedWorkouts.length === 1 ? 'entreno' : 'entrenos'})
                  </span>
                )}
              </div>
              {finishedWorkouts.length === 0 ? (
                <div>
                  <div className="text-lg font-bold text-neutral-500">—</div>
                  <div className="text-[11px] text-neutral-500 italic mt-0.5">
                    registra un entreno para estimarlo
                  </div>
                </div>
              ) : weightKg <= 0 ? (
                <div>
                  <div className="text-lg font-bold text-neutral-500">—</div>
                  <div className="text-[11px] text-neutral-500 italic mt-0.5">
                    Falta peso para estimar calorías
                  </div>
                </div>
              ) : workoutCalories !== null ? (
                <div>
                  <div className="text-xl font-extrabold text-white">
                    {workoutCalories.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-neutral-400">kcal</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    Basado en fuerza moderada (MET 5)
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 italic mt-2">
                  Completa tu perfil
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

          {/* Macros objetivo */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                <PieChart size={13} className="text-white" />
                <span>Macros objetivo</span>
              </div>
              {macros && (
                <span className="text-[10px] text-neutral-500">
                  Distribución según TDEE
                </span>
              )}
            </div>
            {macros ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neutral-900 border border-neutral-800/80 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Proteína (1.6–2.2g)</div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {macros.proteinG.min}–{macros.proteinG.max} g
                  </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800/80 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Grasa (0.8–1.0g)</div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {macros.fatG.min}–{macros.fatG.max} g
                  </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800/80 p-2 rounded-lg">
                  <div className="text-[10px] text-neutral-400">Carbos</div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    ~{macros.carbsG} g
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500 italic py-1 text-center">
                {!tdee ? 'Requiere TDEE y peso corporal' : 'Falta peso corporal'}
              </div>
            )}
          </div>

          {/* FC máx (Tanaka) + 5 zonas cardíacas */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                <Heart size={13} className="text-rose-400" />
                <span>FC máx (Tanaka)</span>
              </div>
              {hrMax ? (
                <div className="text-xs font-extrabold text-white">
                  {hrMax} <span className="text-[10px] font-normal text-neutral-400">bpm</span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-500 italic">Requiere edad</span>
              )}
            </div>

            {zones.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {zones.map((zone) => (
                  <div
                    key={zone.zone}
                    className="bg-neutral-900 border border-neutral-800/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-[11px]">{zone.zone}</span>
                      <span className="text-neutral-300 text-[11px]">{zone.label}</span>
                      <span className="text-neutral-500 text-[10px]">({zone.pctRange})</span>
                    </div>
                    <div className="font-semibold text-white text-[11px]">
                      {zone.minBpm}–{zone.maxBpm}{' '}
                      <span className="text-[10px] font-normal text-neutral-400">bpm</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-neutral-500 italic text-center py-1">
                Configura tu edad en el perfil para calcular tu FC máx y zonas cardíacas.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

