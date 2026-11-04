import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { TopExercisesSection } from '../components/TopExercisesSection'
import { BodyMapPeriodSection } from '../components/BodyMapPeriodSection'
import { RadarStatsSection } from '../components/RadarStatsSection'
import { MonthlyReportSection } from '../components/MonthlyReportSection'
import { SearchableSelect } from '../components/SearchableSelect'
import { HealthMetricsSection } from '../components/HealthMetricsSection'
import { ExerciseDemo } from '../components/ExerciseDemo'
import { ExercisePreviewModal } from '../components/ExercisePreviewModal'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  Scale,
  Flame,
  Dumbbell,
  Weight,
  Timer,
  BarChart3,
  Trophy,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { db } from '../db'
import type { Exercise } from '../types'
import {
  weeklyStreak,
  totalVolume,
  thisWeekVolume,
  weeklyHistory,
  personalRecords,
  exercisesPerformed,
  seriesOverTime,
  type SeriesMetric,
} from '../utils/stats'

export function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'avanzadas' ? 'avanzadas' : 'resumen'

  const handleTabChange = (tab: 'resumen' | 'avanzadas') => {
    if (tab === 'resumen') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: 'avanzadas' }, { replace: true })
    }
  }

  const workouts = useLiveQuery(
    () => db.workouts.filter((w) => w.finishedAt !== null).toArray(),
    []
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  const unit = (settings && 'units' in settings && settings.units) || 'kg'

  // Obtener el peso corporal más reciente de la tabla de medidas
  const latestBodyweight = useMemo(() => {
    if (!measurements) return 0
    const bwList = measurements
      .filter((m) => m.type === 'bodyweight')
      .sort((a, b) => b.date - a.date)
    return bwList.length > 0 ? bwList[0].value : 0
  }, [measurements])

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    if (exercises) {
      for (const ex of exercises) {
        map.set(ex.id, ex)
      }
    }
    return map
  }, [exercises])

  // Ejercicios que el usuario ya entrenó (únicos, ordenados alfabéticamente)
  const trainedExercises = useMemo(() => {
    if (!workouts) return []
    const ids = exercisesPerformed(workouts)
    const list: { id: string; name: string; muscleGroup?: string }[] = []
    for (const id of ids) {
      const ex = exerciseMap.get(id)
      if (ex) {
        list.push({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup })
      } else {
        list.push({ id, name: id })
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  }, [workouts, exerciseMap])

  // Opciones para el SearchableSelect
  const exerciseSelectOptions = useMemo(() => {
    return trainedExercises.map((ex) => ({
      value: ex.id,
      label: ex.name,
      subtitle: ex.muscleGroup,
    }))
  }, [trainedExercises])

  // Estado para el selector de ejercicio
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<SeriesMetric>('1rm')
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')

  // Auto-seleccionar el primer ejercicio entrenado si aún no hay ninguno seleccionado
  const activeExerciseId = useMemo(() => {
    if (trainedExercises.length === 0) return ''
    if (selectedExerciseId && trainedExercises.some((e) => e.id === selectedExerciseId)) {
      return selectedExerciseId
    }
    return trainedExercises[0].id
  }, [selectedExerciseId, trainedExercises])

  const activeExercise = activeExerciseId ? exerciseMap.get(activeExerciseId) : undefined

  // Cálculos globales
  const currentStreak = useMemo(() => (workouts ? weeklyStreak(workouts) : 0), [workouts])
  const totalWorkoutsCount = workouts ? workouts.length : 0
  const accumulatedVolume = useMemo(
    () => (workouts ? totalVolume(workouts, exerciseMap, latestBodyweight) : 0),
    [workouts, exerciseMap, latestBodyweight]
  )
  const currentWeekVol = useMemo(
    () => (workouts ? thisWeekVolume(workouts, exerciseMap, latestBodyweight) : 0),
    [workouts, exerciseMap, latestBodyweight]
  )

  // Gráfica semanal: volumen y entrenos (últimas 12 semanas)
  const weeklyData = useMemo(
    () => (workouts ? weeklyHistory(workouts, exerciseMap, 12, latestBodyweight) : []),
    [workouts, exerciseMap, latestBodyweight]
  )

  // Récords personales del ejercicio activo
  const activePRs = useMemo(() => {
    if (!workouts || !activeExercise) return null
    return personalRecords(workouts, activeExercise.id, activeExercise.type, latestBodyweight)
  }, [workouts, activeExercise, latestBodyweight])

  // Gráfica de progreso temporal del ejercicio seleccionado
  const exerciseProgressData = useMemo(() => {
    if (!workouts || !activeExerciseId) return []
    return seriesOverTime(
      workouts,
      activeExerciseId,
      selectedMetric,
      exerciseMap,
      latestBodyweight
    )
  }, [workouts, activeExerciseId, selectedMetric, exerciseMap, latestBodyweight])

  const hasAnyData = totalWorkoutsCount > 0

  return (
    <div className="p-4 space-y-6">
      {/* Cabecera */}
      <div className="border-b border-neutral-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Estadísticas</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Progreso, volumen acumulado y récords personales (1RM).
          </p>
        </div>
        <Link
          to="/history"
          className="text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
        >
          <span>Historial</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Subpestañas Resumen / Avanzadas */}
      <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
        <button
          type="button"
          onClick={() => handleTabChange('resumen')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'resumen'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Resumen
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('avanzadas')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'avanzadas'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Avanzadas
        </button>
      </div>

      {activeTab === 'resumen' ? (
        <div className="space-y-6">
          {/* Indicador de peso corporal base utilizado */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-white shrink-0" />
          <span className="text-neutral-400">
            Peso corporal de referencia:{' '}
            <strong className="text-white">
              {latestBodyweight > 0 ? `${latestBodyweight} ${unit}` : '0 kg'}
            </strong>
            {latestBodyweight === 0 && (
              <span className="text-[11px] text-neutral-500 ml-1">
                (Registra tu peso en Medidas)
              </span>
            )}
          </span>
        </div>
        <Link
          to="/measurements"
          className="text-white hover:underline font-medium text-[11px] flex items-center gap-0.5"
        >
          <span>{latestBodyweight > 0 ? 'Actualizar' : 'Añadir peso'}</span>
          <ChevronRight size={13} />
        </Link>
      </div>

      {/* 4 TARJETAS RESUMEN */}
      <div className="grid grid-cols-2 gap-3">
        {/* Racha semanal */}
        <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Racha semanal</span>
            <Flame size={18} className="text-white" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {currentStreak}{' '}
            <span className="text-xs font-semibold text-neutral-400">
              {currentStreak === 1 ? 'semana' : 'semanas'}
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            {currentStreak > 0 ? '¡Mantén el ritmo!' : 'Entrena para iniciar racha'}
          </div>
        </div>

        {/* Entrenamientos totales */}
        <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Entrenamientos</span>
            <Dumbbell size={18} className="text-white" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">{totalWorkoutsCount}</div>
          <div className="text-[10px] text-neutral-500 mt-1">Sesiones completadas</div>
        </div>

        {/* Volumen total */}
        <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Volumen total</span>
            <Weight size={18} className="text-white" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {accumulatedVolume.toLocaleString()}{' '}
            <span className="text-xs font-normal text-neutral-400">{unit}</span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Tonelaje acumulado histórico</div>
        </div>

        {/* Volumen de esta semana */}
        <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Esta semana</span>
            <Timer size={18} className="text-white" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {currentWeekVol.toLocaleString()}{' '}
            <span className="text-xs font-normal text-neutral-400">{unit}</span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Lunes a domingo actual</div>
        </div>
      </div>

      {/* MÉTRICAS DE SALUD (IMC, TMB, TDEE) */}
      <HealthMetricsSection
        settings={settings && 'units' in settings ? settings : undefined}
        latestBodyweight={latestBodyweight}
      />

      {/* ESTADO VACÍO SI NO HAY ENTRENOS */}
      {!hasAnyData && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center mx-auto">
            <BarChart3 size={24} />
          </div>
          <h2 className="text-base font-semibold text-white">Comienza tu viaje</h2>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Completa tus primeras sesiones para visualizar gráficas interactivas de volumen,
            frecuencia y evolución de 1RM.
          </p>
          <div className="pt-2">
            <Link
              to="/workout"
              className="inline-block py-2 px-4 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-xl transition shadow-md"
            >
              Comenzar a entrenar
            </Link>
          </div>
        </div>
      )}

      {/* GRÁFICA 1: VOLUMEN SEMANAL (ÚLTIMAS 12 SEMANAS) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Volumen Semanal (Últimas 12 Semanas)
            </h2>
            <p className="text-xs text-neutral-400">Tonelaje total por semana ({unit})</p>
          </div>
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                chartType === 'area'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Área
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                chartType === 'bar'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Barras
            </button>
          </div>
        </div>

        <div className="w-full h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--n-800))" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  stroke="rgb(var(--n-500))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(var(--n-700))' }}
                />
                <YAxis
                  stroke="rgb(var(--n-500))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(var(--n-700))' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(var(--n-950))',
                    borderColor: 'rgb(var(--n-800))',
                    borderRadius: '0.75rem',
                    color: 'rgb(var(--fg))',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: 'rgb(var(--fg))' }}
                  labelStyle={{ color: 'rgb(var(--n-400))', fontWeight: 'bold' }}
                  formatter={(val: unknown) => [
                    `${Number(val ?? 0).toLocaleString()} ${unit}`,
                    'Volumen',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="rgb(var(--accent))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#volGradient)"
                />
              </AreaChart>
            ) : (
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--n-800))" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  stroke="rgb(var(--n-500))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(var(--n-700))' }}
                />
                <YAxis
                  stroke="rgb(var(--n-500))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgb(var(--n-700))' }}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(var(--n-950))',
                    borderColor: 'rgb(var(--n-800))',
                    borderRadius: '0.75rem',
                    color: 'rgb(var(--fg))',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: 'rgb(var(--fg))' }}
                  labelStyle={{ color: 'rgb(var(--n-400))', fontWeight: 'bold' }}
                  formatter={(val: unknown) => [
                    `${Number(val ?? 0).toLocaleString()} ${unit}`,
                    'Volumen',
                  ]}
                />
                <Bar dataKey="volume" fill="rgb(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICA 2: ENTRENAMIENTOS POR SEMANA */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Frecuencia de Entrenos</h2>
          <p className="text-xs text-neutral-400">Sesiones completadas por semana (últimas 12 sem)</p>
        </div>

        <div className="w-full h-44 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--n-800))" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                stroke="rgb(var(--n-500))"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgb(var(--n-700))' }}
              />
              <YAxis
                allowDecimals={false}
                stroke="rgb(var(--n-500))"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgb(var(--n-700))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(var(--n-950))',
                  borderColor: 'rgb(var(--n-800))',
                  borderRadius: '0.75rem',
                  color: 'rgb(var(--fg))',
                  fontSize: '12px',
                }}
                itemStyle={{ color: 'rgb(var(--fg))' }}
                labelStyle={{ color: 'rgb(var(--n-400))', fontWeight: 'bold' }}
                formatter={(val: unknown) => [`${val} entrenos`, 'Frecuencia']}
              />
              <Bar dataKey="workoutsCount" fill="rgb(var(--n-400))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECCIÓN 3: SELECTOR DE EJERCICIO + PRs + PROGRESO 1RM */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">Progreso por Ejercicio</h2>
          {activeExercise && (
            <span className="text-[10px] text-neutral-300 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full font-semibold">
              {activeExercise.muscleGroup}
            </span>
          )}
        </div>

        {trainedExercises.length === 0 ? (
          <div className="text-center py-6 text-xs text-neutral-400 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800 space-y-2">
            <Dumbbell size={24} className="mx-auto text-neutral-500" />
            <p className="font-semibold text-white">
              Entrena para ver tu progreso por ejercicio
            </p>
            <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
              Completa tus primeras sesiones para visualizar tus récords personales y curvas de evolución.
            </p>
          </div>
        ) : (
          <>
            {/* Selector de ejercicio con buscador y miniatura interactiva */}
            <div className="flex items-center gap-2.5">
              {activeExerciseId && (
                <ExerciseDemo
                  exerciseId={activeExerciseId}
                  variant="thumb"
                  className="w-10 h-10 shrink-0"
                  onClick={() => setPreviewExerciseId(activeExerciseId)}
                />
              )}
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  options={exerciseSelectOptions}
                  value={activeExerciseId}
                  onChange={setSelectedExerciseId}
                  placeholder="Buscar ejercicio entrenado..."
                  emptyMessage="No se encontraron ejercicios entrenados"
                />
              </div>
            </div>

        {/* TARJETAS DE RÉCORDS PERSONALES DEL EJERCICIO */}
        {activePRs && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                Peso Máximo
              </span>
              <span className="text-lg font-extrabold text-white">
                {activePRs.maxWeight > 0 ? `${activePRs.maxWeight} ${unit}` : '-'}
              </span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                1RM Estimado (Epley)
              </span>
              <span className="text-lg font-extrabold text-white flex items-center justify-center gap-1">
                {activePRs.maxEst1RM > 0 ? (
                  <>
                    <Trophy size={14} className="text-white" />
                    <span>{activePRs.maxEst1RM} {unit}</span>
                  </>
                ) : (
                  '-'
                )}
              </span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                Máx. Repeticiones
              </span>
              <span className="text-lg font-extrabold text-white">
                {activePRs.maxReps > 0 ? `${activePRs.maxReps} reps` : '-'}
              </span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                Volumen Máx. Serie
              </span>
              <span className="text-lg font-extrabold text-white">
                {activePRs.maxVolumeSet > 0 ? `${activePRs.maxVolumeSet} ${unit}` : '-'}
              </span>
            </div>
          </div>
        )}

        {/* SELECTOR DE MÉTRICA DE LA GRÁFICA */}
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">Evolución en el tiempo</span>
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setSelectedMetric('1rm')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  selectedMetric === '1rm'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                1RM
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric('volume')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  selectedMetric === 'volume'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Volumen
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric('weight')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  selectedMetric === 'weight'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Peso
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric('reps')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  selectedMetric === 'reps'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Reps
              </button>
            </div>
          </div>

          {/* GRÁFICA DE LÍNEA DE PROGRESO */}
          <div className="w-full h-52 pt-1">
            {exerciseProgressData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
                <TrendingUp size={24} className="text-neutral-500 mb-1" />
                <p className="text-xs text-neutral-400">
                  Sin registros válidos de este ejercicio aún.
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Completa series en tus entrenos para visualizar la curva.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={exerciseProgressData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--n-800))" vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    stroke="rgb(var(--n-500))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: 'rgb(var(--n-700))' }}
                  />
                  <YAxis
                    stroke="rgb(var(--n-500))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: 'rgb(var(--n-700))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(var(--n-950))',
                      borderColor: 'rgb(var(--n-800))',
                      borderRadius: '0.75rem',
                      color: 'rgb(var(--fg))',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'rgb(var(--n-400))', fontWeight: 'bold' }}
                    formatter={(val: unknown) => [
                      `${val} ${
                        selectedMetric === 'reps' ? 'reps' : unit
                      }`,
                      selectedMetric === '1rm'
                        ? '1RM Est.'
                        : selectedMetric === 'volume'
                          ? 'Volumen'
                          : selectedMetric === 'weight'
                            ? 'Peso máx'
                            : 'Reps máx',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="rgb(var(--accent))"
                    strokeWidth={2.5}
                    dot={{ fill: 'rgb(var(--bg))', stroke: 'rgb(var(--accent))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {/* SECCIÓN 4: DISTRIBUCIÓN POR MÚSCULO (RADAR ACTUAL VS ANTERIOR + TARJETAS) */}
      <RadarStatsSection
        workouts={workouts || []}
        exercisesById={exerciseMap}
        unit={unit}
        bodyweightKg={latestBodyweight}
      />
    </div>
  ) : (
    <div className="space-y-6">
      <TopExercisesSection
        workouts={workouts || []}
        exercisesById={exerciseMap}
        onPreviewExercise={setPreviewExerciseId}
      />

      <BodyMapPeriodSection
        workouts={workouts || []}
        exercisesById={exerciseMap}
      />

      <MonthlyReportSection
        workouts={workouts || []}
        exercisesById={exerciseMap}
        unit={unit}
        bodyweightKg={latestBodyweight}
        onPreviewExercise={setPreviewExerciseId}
      />
    </div>
  )}

  {previewExerciseId && (
    <ExercisePreviewModal
      exerciseId={previewExerciseId}
      onClose={() => setPreviewExerciseId(null)}
      onAdd={() => setPreviewExerciseId(null)}
    />
  )}
</div>
)
}
