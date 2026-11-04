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
  Share2,
  X,
  Download,
  AlertCircle,
  Pencil,
} from 'lucide-react'
import { db } from '../db'
import type { Exercise } from '../types'
import {
  displayWeight,
  weightInKg,
  getLatestBodyweightKg,
} from '../utils/weightUnits'
import { isValidSet } from '../utils/stats'
import {
  summarizeWorkout,
  volumeEquivalent,
  getEquivalentArticle,
  type RecordKind,
  type WorkoutRecord,
} from '../utils/workoutSummary'
import { formatNumber, formatWeight, formatClock } from '../utils/format'
import { ScreenHeader, HeaderIconButton, RecordLights, LogoMark } from '../components/ui'

interface RecordComparison {
  exerciseName: string
  prevText: string
  newText: string
  kinds: RecordKind[]
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
  const latestBodyweight = useMemo(() => getLatestBodyweightKg(measurements), [measurements])

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

  // Calcular filas anterior → nuevo para cada récord
  const recordComparisons = useMemo<RecordComparison[]>(() => {
    if (!workout || !allWorkouts || !summary) return []

    const previousWorkouts = allWorkouts.filter(
      (w) => w.finishedAt != null && w.id !== workout.id && w.startedAt < workout.startedAt
    )

    return summary.records.map((rec: WorkoutRecord) => {
      const ex = exerciseMap.get(rec.exerciseId)
      const exName = ex?.name || 'Ejercicio'
      const newW = rec.weight !== undefined ? displayWeight(rec.weight, unit) : 0
      const newR = rec.reps ?? 0
      const newText = `${formatWeight(newW)} ${unit} × ${newR}`

      // Buscar mejor marca previa de este ejercicio
      let prevBestWeight = 0
      let prevBestReps = 0

      for (const pw of previousWorkouts) {
        if (!pw.entries) continue
        for (const entry of pw.entries) {
          if (entry.exerciseId !== rec.exerciseId || !entry.sets) continue
          for (const s of entry.sets) {
            if (!isValidSet(s)) continue
            const w = displayWeight(weightInKg(s), unit)
            const r = s.reps || 0
            if (w > prevBestWeight || (w === prevBestWeight && r > prevBestReps)) {
              prevBestWeight = w
              prevBestReps = r
            }
          }
        }
      }

      const prevText =
        prevBestWeight > 0
          ? `${formatWeight(prevBestWeight)} ${unit} × ${prevBestReps}`
          : '—'

      return {
        exerciseName: exName,
        prevText,
        newText,
        kinds: rec.kinds,
      }
    })
  }, [workout, allWorkouts, summary, exerciseMap, unit])

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
        backgroundColor: '#121210',
        cacheBust: true,
      })

      const dateStr = format(new Date(workout.finishedAt || workout.startedAt), 'yyyy-MM-dd')
      const fileName = `hardfit-entreno-${dateStr}.png`

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

  if (workout === undefined || summary === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-neutral-400">Cargando resumen del entreno…</p>
      </div>
    )
  }

  if (workout === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-base font-bold text-white">No encontramos este entreno</h2>
        <p className="text-sm text-neutral-400 max-w-xs">
          Es posible que el entrenamiento haya sido eliminado o el enlace no sea válido.
        </p>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="btn-secondary"
        >
          Ir al historial
        </button>
      </div>
    )
  }

  const workoutDate = new Date(workout.finishedAt || workout.startedAt)
  const rawDateStr = format(workoutDate, "EEEE, d 'de' MMMM · HH:mm", { locale: es })
  const formattedDate = rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1)
  const durationSeconds = Math.max(0, Math.floor(summary.durationMs / 1000))
  const displayTotalVol = displayWeight(summary.totalVolumeKg, unit)

  return (
    <div className="flex-1 flex flex-col bg-black">
      <ScreenHeader
        title="Resumen"
        leading={
          <HeaderIconButton label="Cerrar" onClick={() => navigate('/')}>
            <X size={20} strokeWidth={1.75} />
          </HeaderIconButton>
        }
        actions={
          <HeaderIconButton
            label="Compartir tarjeta del entreno"
            onClick={handleShare}
          >
            <Share2 size={20} strokeWidth={1.75} />
          </HeaderIconButton>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Estadísticas dominantes (Hero) */}
        <section className="p-6 bg-surface border-b border-line text-center space-y-4">
          <h2 className="text-2xl font-bold text-white truncate">{workout.name || 'Entrenamiento'}</h2>
          <p className="text-sm text-neutral-400 -mt-2">{formattedDate}</p>

          <div className="flex flex-col items-center pt-2">
            <span className="label-tech">Volumen total</span>
            <div className="flex items-baseline justify-center gap-1.5 mt-1">
              <span className="num text-5xl font-bold text-white leading-none">
                {formatNumber(displayTotalVol)}
              </span>
              <span className="text-xl font-semibold text-neutral-400">{unit}</span>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2 p-3 bg-elevated border border-line rounded-md text-center">
            <div className="flex flex-col items-center">
              <dt className="label-tech">Duración</dt>
              <dd className="num text-xl text-white mt-1">{formatClock(durationSeconds)}</dd>
            </div>
            <div className="flex flex-col items-center border-l border-r border-line px-1">
              <dt className="label-tech">Series</dt>
              <dd className="num text-xl text-white mt-1">{summary.validSets}</dd>
            </div>
            <div className="flex flex-col items-center">
              <dt className="label-tech">Récords</dt>
              <dd className="flex items-center gap-1.5 mt-1">
                <span className="num text-xl text-white">{summary.records.length}</span>
                <RecordLights lit={summary.records.length > 0} size={5} />
              </dd>
            </div>
          </dl>

          {equivalent && (
            <div className="p-3 bg-elevated border border-line rounded-md text-left flex items-center gap-3">
              <span className="text-3xl select-none" aria-hidden="true">{equivalent.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-snug">
                  Levantaste el peso de {equivalent.count >= 2 ? `${equivalent.count} ${equivalent.plural}` : `${getEquivalentArticle(equivalent.name)} ${equivalent.name}`}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Cada {equivalent.name} pesa ~{formatNumber(displayWeight(equivalent.weightKg, unit))} {unit}
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="p-4 space-y-6">
          {/* Récords batidos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Récords batidos</h3>
              <span className="label-tech">{summary.records.length} en total</span>
            </div>

            {recordComparisons.length === 0 ? (
              <div className="p-4 bg-surface border border-line rounded-md text-center text-sm text-neutral-400">
                Sin récords esta vez. La próxima sesión será tu oportunidad de batir marcas.
              </div>
            ) : (
              <div className="space-y-2">
                {recordComparisons.map((item, idx) => (
                  <div
                    key={`${item.exerciseName}-${idx}`}
                    className="flex items-center justify-between gap-3 p-3.5 bg-surface border border-line rounded-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RecordLights lit={true} size={5} />
                      <span className="text-sm font-semibold text-white truncate">
                        {item.exerciseName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-sm">
                      <span className="num text-neutral-400">{item.prevText}</span>
                      <span className="text-neutral-400">→</span>
                      <span className="num text-white font-bold">{item.newText}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Tarjeta para compartir */}
          <section className="space-y-3">
            <h3 className="section-title">Compartir</h3>

            <div className="flex flex-col gap-3">
              <div
                id="workout-summary-card"
                className="w-full max-w-sm mx-auto bg-surface border border-line-strong rounded-lg p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-accent" aria-hidden="true">
                      <LogoMark size={24} />
                    </span>
                    <span className="text-lg font-bold text-white tracking-tight">HardFit</span>
                  </div>
                  <span className="label-tech">Registro local</span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-2xl font-bold text-white leading-tight truncate">
                    {workout.name || 'Entrenamiento'}
                  </h4>
                  <p className="text-sm text-neutral-400">{formattedDate}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-line text-center">
                  <div>
                    <span className="label-tech block">Duración</span>
                    <span className="num text-xl font-bold text-white mt-0.5 block">
                      {formatClock(durationSeconds)}
                    </span>
                  </div>
                  <div className="border-l border-r border-line">
                    <span className="label-tech block">{unit.toUpperCase()}</span>
                    <span className="num text-xl font-bold text-white mt-0.5 block">
                      {formatNumber(displayTotalVol)}
                    </span>
                  </div>
                  <div>
                    <span className="label-tech block">Series</span>
                    <span className="num text-xl font-bold text-white mt-0.5 block">
                      {summary.validSets}
                    </span>
                  </div>
                </div>

                {recordComparisons.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RecordLights lit={true} size={6} />
                      <span className="text-sm font-semibold text-white">
                        {recordComparisons.length} {recordComparisons.length === 1 ? 'récord' : 'récords'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {recordComparisons.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1">
                          <span className="text-neutral-300 truncate pr-2">{item.exerciseName}</span>
                          <span className="num text-white font-bold shrink-0">{item.newText}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-line text-center">
                  <span className="text-xs text-neutral-400 font-medium">
                    Cada serie es un intento
                  </span>
                </div>
              </div>

              {shareError && (
                <div className="p-3 bg-elevated border border-line rounded-md flex items-center gap-2 text-xs text-neutral-300">
                  <AlertCircle size={16} className="text-neutral-400 shrink-0" />
                  <span>{shareError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleShare}
                disabled={isGenerating}
                className="btn-primary w-full"
              >
                <Download size={18} />
                <span>{isGenerating ? 'Generando imagen…' : 'Descargar imagen'}</span>
              </button>
            </div>
          </section>

          {/* Acciones finales */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/history/${workout.id}`)}
              className="btn-secondary w-full"
            >
              <Pencil size={16} />
              <span>Editar entreno</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-primary w-full"
            >
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
