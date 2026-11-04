import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toPng } from 'html-to-image'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import {
  Trophy,
  Share2,
  Home,
  Timer,
  Weight,
  Layers,
  Dumbbell,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { db } from '../db'
import type { Exercise, WorkoutSetEntry } from '../types'
import { isValidSet, estimated1RM } from '../utils/stats'
import {
  summarizeWorkout,
  volumeEquivalent,
  getEquivalentArticle,
  type RecordKind,
} from '../utils/workoutSummary'

const RECORD_KIND_LABELS: Record<RecordKind, string> = {
  weight: 'Mejor peso',
  e1rm: 'Mejor 1RM',
  setVolume: 'Mejor volumen',
  reps: 'Más reps',
}

function formatDurationHMin(durationMs: number): string {
  const diffSec = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(diffSec / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes} min`
  }
  const seconds = diffSec % 60
  return `${seconds} s`
}

export function WorkoutSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [isGenerating, setIsGenerating] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const workout = useLiveQuery(
    () => (id ? db.workouts.get(id) : undefined),
    [id]
  )
  const allWorkouts = useLiveQuery(() => db.workouts.toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const measurements = useLiveQuery(() => db.measurements.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  const unit = (settings && 'units' in settings && settings.units) || 'kg'

  const latestBodyweight = useMemo(() => {
    if (!measurements) return 0
    const bwList = measurements
      .filter((m) => m.type === 'bodyweight')
      .sort((a, b) => b.date - a.date)
    return bwList.length > 0 ? bwList[0].value : 0
  }, [measurements])

  const exerciseMap = useMemo(() => {
    if (!exercises) return new Map<string, Exercise>()
    return new Map(exercises.map((e) => [e.id, e]))
  }, [exercises])

  const summary = useMemo(() => {
    if (!workout || !allWorkouts) return null
    return summarizeWorkout(workout, allWorkouts, exerciseMap, latestBodyweight)
  }, [workout, allWorkouts, exerciseMap, latestBodyweight])

  const equivalent = useMemo(() => {
    if (!summary) return null
    return volumeEquivalent(summary.totalVolumeKg)
  }, [summary])

  const handleShare = async () => {
    if (isGenerating || !workout) return
    setIsGenerating(true)
    setShareError(null)

    try {
      const cardNode = document.getElementById('workout-summary-card')
      if (!cardNode) {
        throw new Error('Elemento de resumen no encontrado')
      }

      const dataUrl = await toPng(cardNode, {
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
        cacheBust: true,
      })

      const dateStr = format(new Date(workout.finishedAt || workout.startedAt), 'yyyy-MM-dd')
      const fileName = `kitaeru-entreno-${dateStr}.png`

      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        })

        await Share.share({
          title: `Resumen de entreno - ${workout.name}`,
          files: [fileResult.uri],
          dialogTitle: 'Compartir resumen de entrenamiento',
        })
      } else {
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        const file = new File([blob], fileName, { type: 'image/png' })

        if (
          typeof navigator !== 'undefined' &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({
              files: [file],
              title: `Resumen de entreno - ${workout.name}`,
            })
            return
          } catch (shareErr) {
            const msg = shareErr instanceof Error ? shareErr.message : String(shareErr)
            if (msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('cancel')) {
              return
            }
          }
        }

        // Descarga tradicional en navegador
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Error al generar resumen para compartir:', err)
      setShareError('No se pudo generar la imagen para compartir.')
    } finally {
      setIsGenerating(false)
    }
  }

  // 1. Estado de carga de la base de datos
  if (workout === undefined || summary === null) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-neutral-400">Cargando resumen del entreno…</p>
      </div>
    )
  }

  // 2. Si no existe el entrenamiento
  if (workout === null) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Dumbbell size={36} className="text-neutral-600" />
        <h2 className="text-base font-bold text-white">No encontramos este entreno</h2>
        <p className="text-xs text-neutral-400 max-w-xs">
          Es posible que el entrenamiento haya sido eliminado o el enlace no sea válido.
        </p>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Ir al historial
        </button>
      </div>
    )
  }

  const workoutDate = new Date(workout.finishedAt || workout.startedAt)
  const rawDateStr = format(workoutDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
  const formattedDate = rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1)

  // Equivalencia
  const eqHeadline = equivalent
    ? equivalent.count >= 2
      ? `Levantaste el peso de ${equivalent.count} ${equivalent.plural}`
      : `Levantaste el peso de ${getEquivalentArticle(equivalent.name)} ${equivalent.name}`
    : ''

  const objWeightFormatted = equivalent
    ? unit === 'lb'
      ? Math.round(equivalent.weightKg * 2.20462).toLocaleString('es-ES')
      : equivalent.weightKg.toLocaleString('es-ES')
    : ''

  const totalVolFormatted = summary.totalVolumeKg.toLocaleString('es-ES')

  const eqSubtitle = equivalent
    ? `Volumen total: ${totalVolFormatted} ${unit} · ${getEquivalentArticle(equivalent.name)} ${equivalent.name} pesa ~${objWeightFormatted} ${unit}`
    : ''

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      {/* TARJETA DE RESUMEN (capturada por html-to-image) */}
      <div
        id="workout-summary-card"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-5 shadow-sm text-left"
      >
        {/* Encabezado */}
        <div className="space-y-1 border-b border-neutral-800/80 pb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-1">
            <Sparkles size={12} />
            <span>¡Entreno terminado!</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {workout.name || 'Entrenamiento'}
          </h1>
          <p className="text-xs text-neutral-400">{formattedDate}</p>
        </div>

        {/* 4 Métricas en Grid 2x2 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Duración</span>
              <Timer size={14} className="text-neutral-400" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {formatDurationHMin(summary.durationMs)}
            </div>
          </div>

          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Volumen</span>
              <Weight size={14} className="text-neutral-400" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {summary.totalVolumeKg.toLocaleString()}{' '}
              <span className="text-xs font-normal text-neutral-400">{unit}</span>
            </div>
          </div>

          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Series</span>
              <Layers size={14} className="text-neutral-400" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {summary.validSets}
            </div>
          </div>

          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Ejercicios</span>
              <Dumbbell size={14} className="text-neutral-400" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {summary.exerciseCount}
            </div>
          </div>
        </div>

        {/* Tarjeta de Equivalencia (si no es null) */}
        {equivalent && (
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center gap-3.5">
            <div className="text-4xl shrink-0 select-none">{equivalent.emoji}</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-snug">{eqHeadline}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{eqSubtitle}</p>
            </div>
          </div>
        )}

        {/* Récords */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-400" />
              <span>Récords ({summary.records.length})</span>
            </h2>
          </div>

          {summary.records.length === 0 ? (
            <div className="p-4 bg-neutral-950 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-400">
              Sin récords esta vez. ¡A por ellos en el próximo!
            </div>
          ) : (
            <div className="space-y-2">
              {summary.records.map((rec) => {
                const ex = exerciseMap.get(rec.exerciseId)
                const exName = ex?.name || rec.exerciseId
                const weightStr =
                  rec.weight !== undefined && rec.weight !== null
                    ? `${rec.weight} ${unit}`
                    : `0 ${unit}`
                const repsStr = `${rec.reps ?? 0} reps`

                return (
                  <div
                    key={`${rec.exerciseId}-${rec.setIndex}`}
                    className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{exName}</p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {weightStr} × {repsStr}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {rec.kinds.map((kind) => (
                        <span
                          key={kind}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full"
                        >
                          <Trophy size={11} className="text-amber-400" />
                          <span>{RECORD_KIND_LABELS[kind]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Lista compacta de ejercicios */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Ejercicios ({summary.exerciseCount})
          </h2>

          <div className="space-y-2">
            {(workout.entries || []).map((entry, idx) => {
              const validSets = (entry.sets || []).filter(isValidSet)
              if (validSets.length === 0) return null

              const ex = exerciseMap.get(entry.exerciseId)
              const exName = ex?.name || entry.exerciseId

              // Mejor serie según 1RM estimado o mayor peso
              let bestSet: WorkoutSetEntry | null = null
              let bestScore = -1

              for (const s of validSets) {
                const w = s.weight || 0
                const r = s.reps || 0
                const score = estimated1RM(w, r)
                if (score > bestScore) {
                  bestScore = score
                  bestSet = s
                }
              }

              const bestWeightStr =
                bestSet && bestSet.weight !== undefined && bestSet.weight !== null
                  ? `${bestSet.weight} ${unit}`
                  : `0 ${unit}`

              return (
                <div
                  key={`${entry.exerciseId}-${idx}`}
                  className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-white truncate">{exName}</p>
                    <p className="text-[11px] text-neutral-400">
                      {validSets.length} {validSets.length === 1 ? 'serie válida' : 'series válidas'}
                    </p>
                  </div>

                  <div className="text-right shrink-0 font-mono text-[11px] text-neutral-300">
                    {bestSet ? (
                      <>
                        <span className="text-neutral-500 text-[10px] block">Mejor serie</span>
                        <strong className="text-white font-bold">
                          {bestWeightStr} × {bestSet.reps ?? 0}
                        </strong>
                      </>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Firma discreta en la tarjeta para compartir */}
        <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500">
          <span>Kitaeru · Registro de entrenamiento</span>
          <span>kitaeru.app</span>
        </div>
      </div>

      {/* Alerta de error si falla compartir */}
      {shareError && (
        <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-300">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <span>{shareError}</span>
        </div>
      )}

      {/* BOTONES (fuera de la tarjeta que se comparte) */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={handleShare}
          disabled={isGenerating}
          className="w-full py-3.5 px-4 bg-white text-black font-bold text-xs rounded-xl hover:bg-neutral-200 active:bg-neutral-300 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Share2 size={15} />
          <span>{isGenerating ? 'Generando...' : 'Compartir'}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-semibold text-xs rounded-xl border border-neutral-800 transition flex items-center justify-center gap-2"
        >
          <Home size={15} />
          <span>Ir al inicio</span>
        </button>
      </div>
    </div>
  )
}
