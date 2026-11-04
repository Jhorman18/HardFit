import { displayWeight, getLatestBodyweightKg } from '../utils/weightUnits'
import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Flame,
  Dumbbell,
  Weight,
  History,
  BarChart3,
  ClipboardList,
  Ruler,
  Play,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { db } from '../db'
import { useWorkoutStore } from '../store'
import type { Routine, Exercise } from '../types'
import { weeklyStreak, totalVolume, workoutVolume, countValidSets } from '../utils/stats'

export function HomePage() {
  const navigate = useNavigate()
  const { activeWorkout, startFromRoutine } = useWorkoutStore()

  const workouts = useLiveQuery(() => db.workouts.toArray(), [])
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(async () => {
    const s = await db.settings.get('app')
    return s && 'units' in s ? s : undefined
  }, [])

  const [pendingRoutineToStart, setPendingRoutineToStart] = useState<Routine | null>(null)

  const unit = settings?.units ?? 'kg'

  const latestBodyweight = useMemo(() => getLatestBodyweightKg(measurements), [measurements])

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    if (exercises) {
      for (const ex of exercises) {
        map.set(ex.id, ex)
      }
    }
    return map
  }, [exercises])

  // Entrenamientos terminados ordenados descendente por fecha
  const finishedWorkouts = useMemo(() => {
    if (!workouts) return []
    return workouts
      .filter((w) => w.finishedAt !== null)
      .sort((a, b) => (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt))
  }, [workouts])

  // Estadísticas reales
  const currentStreak = useMemo(() => (workouts ? weeklyStreak(workouts) : 0), [workouts])
  const finishedCount = finishedWorkouts.length
  const totalAccumulatedVolume = useMemo(
    () => (workouts ? displayWeight(totalVolume(workouts, exerciseMap, latestBodyweight), unit) : 0),
    [workouts, exerciseMap, latestBodyweight, unit]
  )

  const handleStartRoutine = async (routine: Routine) => {
    if (activeWorkout) {
      setPendingRoutineToStart(routine)
    } else {
      const success = await startFromRoutine(routine.id)
      if (success) {
        navigate('/workout')
      }
    }
  }

  const handleConfirmStartWithActiveWorkout = async () => {
    if (!pendingRoutineToStart) return
    const success = await startFromRoutine(pendingRoutineToStart.id, { force: true })
    setPendingRoutineToStart(null)
    if (success) {
      navigate('/workout')
    }
  }

  const getExerciseSummary = (routine: Routine): string => {
    if (!routine.items || routine.items.length === 0) return '0 ejercicios'
    const count = routine.items.length
    const label = count === 1 ? '1 ejercicio' : `${count} ejercicios`
    const names = routine.items
      .slice(0, 2)
      .map((item) => exerciseMap.get(item.exerciseId)?.name || 'Ejercicio')
      .join(', ')
    return count > 2 ? `${label}: ${names}…` : `${label}: ${names}`
  }

  return (
    <div className="p-4 space-y-6">
      {/* Saludo y estado */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-300 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">
            Local • Privado
          </span>
          <span className="text-xs text-neutral-400">
            Unidades: <strong className="text-white uppercase">{unit}</strong>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Bienvenido a Kitaeru</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Tu diario de entrenamiento 100% privado y local. Sin registro ni servidores externos.
        </p>
      </div>

      {/* MÉTRICAS REALES: RACHA, ENTRENOS Y VOLUMEN */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Tu Progreso Actual
          </h2>
          <Link to="/stats" className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-medium transition">
            <span>Ver estadísticas</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Racha */}
          <Link
            to="/stats"
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 p-3.5 rounded-xl transition block text-center"
          >
            <Flame size={22} className="mx-auto text-white" />
            <div className="mt-1 text-xl font-extrabold text-white">
              {currentStreak} <span className="text-xs font-normal text-neutral-400">sem</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Racha semanal</div>
          </Link>

          {/* Entrenamientos terminados */}
          <Link
            to="/history"
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 p-3.5 rounded-xl transition block text-center"
          >
            <Dumbbell size={22} className="mx-auto text-white" />
            <div className="mt-1 text-xl font-extrabold text-white">{finishedCount}</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Entrenamientos</div>
          </Link>

          {/* Volumen Total */}
          <Link
            to="/stats"
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 p-3.5 rounded-xl transition block text-center"
          >
            <Weight size={22} className="mx-auto text-white" />
            <div className="mt-1 text-base font-extrabold text-white truncate">
              {totalAccumulatedVolume >= 10000
                ? `${(totalAccumulatedVolume / 1000).toFixed(1)}k`
                : totalAccumulatedVolume.toLocaleString()}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Volumen ({unit})</div>
          </Link>
        </div>
      </div>

      {/* ACCESO RÁPIDO AL HISTORIAL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Historial Reciente
          </h2>
          <Link to="/history" className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-medium transition">
            <span>Ver todo ({finishedCount})</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {finishedWorkouts.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-xs text-neutral-400">Aún no tienes entrenamientos completados.</p>
            <Link
              to="/workout"
              className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-white hover:underline"
            >
              <span>Comenzar una sesión ahora</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {finishedWorkouts.slice(0, 2).map((w) => {
              const finishedDate = new Date(w.finishedAt || w.startedAt)
              const dateStr = format(finishedDate, "EEEE, d 'de' MMMM", { locale: es })
              const vol = displayWeight(workoutVolume(w, exerciseMap, latestBodyweight), unit)
              const validSets = countValidSets(w)

              return (
                <Link
                  key={w.id}
                  to={`/history/${w.id}`}
                  className="p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl flex items-center justify-between gap-3 transition block"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-neutral-400 capitalize block">
                      {dateStr}
                    </span>
                    <div className="text-sm font-bold text-white truncate">{w.name}</div>
                    <div className="text-xs text-neutral-400 font-mono mt-0.5">
                      {vol.toLocaleString()} {unit} • {validSets} series
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-500 shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Rutinas Rápidas (si existen) */}
      {routines && routines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Acceso Rápido a Rutinas
            </h2>
            <Link to="/routines" className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-medium transition">
              <span>Ver todas ({routines.length})</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-2">
            {routines.slice(0, 3).map((routine) => (
              <div
                key={routine.id}
                className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 hover:border-neutral-700 transition"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{routine.name}</div>
                  <div className="text-xs text-neutral-400 truncate">
                    {getExerciseSummary(routine)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartRoutine(routine)}
                  className="py-1.5 px-3 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-lg transition shrink-0 flex items-center gap-1 shadow-sm"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Empezar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos directos generales */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-1">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 gap-2">
          <Link
            to="/workout"
            className="flex items-center justify-between p-3.5 bg-white hover:bg-neutral-200 border border-white rounded-xl text-black font-medium transition shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Play size={20} fill="currentColor" className="text-black" />
              <div>
                <div className="text-sm font-bold text-black">Iniciar Entrenamiento Libre</div>
                <div className="text-xs text-black/80">Comienza a registrar series y pesos</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-black" />
          </Link>

          <Link
            to="/history"
            className="flex items-center justify-between p-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 font-medium transition"
          >
            <div className="flex items-center gap-3">
              <History size={20} className="text-white" />
              <div>
                <div className="text-sm font-semibold text-white">Historial de Entrenamientos</div>
                <div className="text-xs text-neutral-400">
                  {finishedCount ? `${finishedCount} sesiones completadas` : 'Revisa tus sesiones pasadas'}
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-neutral-500" />
          </Link>

          <Link
            to="/stats"
            className="flex items-center justify-between p-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 font-medium transition"
          >
            <div className="flex items-center gap-3">
              <BarChart3 size={20} className="text-white" />
              <div>
                <div className="text-sm font-semibold text-white">Gráficas y Progreso (1RM)</div>
                <div className="text-xs text-neutral-400">Volumen semanal, récords y balance muscular</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-neutral-500" />
          </Link>

          <Link
            to="/routines"
            className="flex items-center justify-between p-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 font-medium transition"
          >
            <div className="flex items-center gap-3">
              <ClipboardList size={20} className="text-white" />
              <div>
                <div className="text-sm font-semibold text-white">Gestionar Rutinas y Carpetas</div>
                <div className="text-xs text-neutral-400">Crea tus plantillas de entrenamiento</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-neutral-500" />
          </Link>

          <Link
            to="/measurements"
            className="flex items-center justify-between p-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 font-medium transition"
          >
            <div className="flex items-center gap-3">
              <Ruler size={20} className="text-white" />
              <div>
                <div className="text-sm font-semibold text-white">Medidas Corporales</div>
                <div className="text-xs text-neutral-400">
                  {latestBodyweight > 0 ? `Peso actual: ${latestBodyweight} ${unit}` : 'Registra tu peso corporal'}
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-neutral-500" />
          </Link>
        </div>
      </div>

      {/* MODAL: Confirmar Reemplazo de Entreno Activo */}
      {pendingRoutineToStart && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 text-center shadow-2xl">
            <AlertTriangle size={36} className="text-white mx-auto" />
            <div>
              <h3 className="font-bold text-white text-base">Entrenamiento en curso</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Ya tienes una sesión activa ({activeWorkout?.name}). Si inicias{' '}
                <strong>&quot;{pendingRoutineToStart.name}&quot;</strong>, se descartará el progreso actual.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingRoutineToStart(null)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStartWithActiveWorkout}
                className="flex-1 py-2 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition shadow-md"
              >
                Reemplazar y empezar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
