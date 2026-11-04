import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, Upload, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { ExerciseSelectorModal } from '../ExerciseSelectorModal'
import { db } from '../../db'
import {
  exportJson,
  exportWorkoutsCsv,
  exportMeasurementsCsv,
  importBackupFromText,
} from '../../utils/exportData'
import { applyHevyImport, planHevyImport, type HevyImportPlan } from '../../utils/importHevy'

export function DataSection() {
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const hevyInputRef = useRef<HTMLInputElement | null>(null)
  const [hevyPlan, setHevyPlan] = useState<HevyImportPlan | null>(null)
  // Ejercicio de Hevy sin equivalente → ejercicio de HardFit elegido a mano.
  const [hevyChoices, setHevyChoices] = useState<Record<string, { id: string; name: string }>>({})
  const [pickingFor, setPickingFor] = useState<string | null>(null)

  const handleExport = async (name: string, fn: () => Promise<void>) => {
    try {
      setIsExporting(true)
      setExportStatus(null)
      await fn()
      setExportStatus({
        type: 'success',
        message: `${name} generado y descargado con éxito.`,
      })
    } catch (err) {
      console.error(`Error al exportar ${name}:`, err)
      setExportStatus({
        type: 'error',
        message: `Error al generar la exportación de ${name}. Inténtalo de nuevo.`,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    e.target.value = ''
  }

  const handleHevySelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setExportStatus(null)
      setHevyChoices({})
      setHevyPlan(await planHevyImport(await file.text()))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setExportStatus({ type: 'error', message: 'No se pudo leer el CSV: ' + msg })
    }
  }

  const handleConfirmHevy = async () => {
    if (!hevyPlan) return
    try {
      setIsImporting(true)
      await applyHevyImport(
        hevyPlan,
        Object.fromEntries(Object.entries(hevyChoices).map(([id, choice]) => [id, choice.id]))
      )
      setExportStatus({
        type: 'success',
        message: `Importados ${hevyPlan.workouts.length} entrenos de Hevy al historial.`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setExportStatus({ type: 'error', message: 'No se pudo importar: ' + msg })
    } finally {
      setHevyPlan(null)
      setIsImporting(false)
    }
  }

  const handlePickExercise = async ([exerciseId]: string[]) => {
    const target = pickingFor
    setPickingFor(null)
    const exercise = exerciseId ? await db.exercises.get(exerciseId) : undefined
    if (target && exercise) {
      setHevyChoices((current) => ({ ...current, [target]: { id: exercise.id, name: exercise.name } }))
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingFile) return
    try {
      setIsImporting(true)
      const text = await pendingFile.text()
      await importBackupFromText(text)
      setPendingFile(null)
      setExportStatus({
        type: 'success',
        message: 'Copia restaurada correctamente. Reiniciando aplicación...',
      })
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setExportStatus({
        type: 'error',
        message: 'No se pudo importar: ' + msg,
      })
      setPendingFile(null)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className="mt-5">
      <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
        Datos y Copias de Seguridad
      </h2>

      <div className="mt-2 mx-4 border-t border-b border-line">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileSelected}
        />

        <input
          ref={hevyInputRef}
          type="file"
          accept="text/csv,.csv"
          className="hidden"
          onChange={handleHevySelected}
        />

        {/* Exportar JSON */}
        <div className="min-h-12 py-3 border-b border-line flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <span className="text-[15px] text-neutral-300 block">Exportar JSON</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Copia completa: ejercicios, rutinas, historial, medidas y ajustes
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleExport('Backup JSON', exportJson)}
            disabled={isExporting || isImporting}
            className="press min-h-12 px-3 rounded-md text-xs font-semibold bg-elevated border border-line-strong text-white hover:bg-neutral-800 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            <Download size={15} />
            <span>JSON</span>
          </button>
        </div>

        {/* Importar CSV de Hevy */}
        <div className="min-h-12 py-3 border-b border-line flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <span className="text-[15px] text-neutral-300 block">Importar desde Hevy</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              CSV de entrenamientos: se añade al historial sin borrar nada
            </span>
          </div>
          <button
            type="button"
            onClick={() => hevyInputRef.current?.click()}
            disabled={isExporting || isImporting}
            className="btn-secondary shrink-0"
          >
            <Upload size={16} aria-hidden="true" />
            <span>CSV</span>
          </button>
        </div>

        {/* Importar copia JSON */}
        <div className="min-h-12 py-3 border-b border-line flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <span className="text-[15px] text-neutral-300 block">Importar copia</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Restaura todas las tablas desde un archivo JSON previo
            </span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting || isImporting}
            className="press min-h-12 px-3 rounded-md text-xs font-semibold bg-elevated border border-line-strong text-white hover:bg-neutral-800 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            <Upload size={15} />
            <span>Restaurar</span>
          </button>
        </div>

        {/* Exportar CSV entrenamientos */}
        <div className="min-h-12 py-3 border-b border-line flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <span className="text-[15px] text-neutral-300 block">CSV de entrenamientos</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Una fila por serie con métricas y volumen para hojas de cálculo
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleExport('CSV de entrenamientos', exportWorkoutsCsv)}
            disabled={isExporting || isImporting}
            className="press min-h-12 px-3 rounded-md text-xs font-semibold bg-elevated border border-line-strong text-white hover:bg-neutral-800 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            <Download size={15} />
            <span>CSV</span>
          </button>
        </div>

        {/* Exportar CSV medidas */}
        <div className="min-h-12 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 pr-2">
            <span className="text-[15px] text-neutral-300 block">CSV de medidas corporales</span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Historial cronológico de peso y medidas de seguimiento
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleExport('CSV de medidas', exportMeasurementsCsv)}
            disabled={isExporting || isImporting}
            className="press min-h-12 px-3 rounded-md text-xs font-semibold bg-elevated border border-line-strong text-white hover:bg-neutral-800 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            <Download size={15} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Estado de exportación o importación */}
      {exportStatus && (
        <div
          className={`mx-4 mt-3 text-xs p-3 rounded-md border flex items-center gap-2 ${
            exportStatus.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          {exportStatus.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-red-400" />
          )}
          <span>{exportStatus.message}</span>
        </div>
      )}

      {/* Modal Sheet de confirmación para acción destructiva de importación */}
      {pendingFile && (
        <Sheet
          title="Confirmar importación"
          onClose={() => setPendingFile(null)}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="press flex-1 min-h-12 px-3 rounded-md border border-line-strong text-neutral-300 hover:text-white font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="press flex-1 min-h-12 px-3 rounded-md border border-red-500/60 bg-red-950/40 text-red-400 hover:text-red-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                {isImporting ? 'Restaurando...' : 'Reemplazar y restaurar'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 py-2">
            <p className="text-sm text-neutral-300 leading-relaxed">
              Esta acción <strong className="text-red-400 font-semibold">reemplazará todos tus datos actuales</strong>{' '}
              (ejercicios, rutinas, historial, medidas y ajustes) con los datos del archivo{' '}
              <span className="font-mono text-white text-xs">{pendingFile.name}</span>.
            </p>
            <p className="text-xs text-neutral-400">
              Por seguridad, antes de iniciar la restauración se descargará automáticamente una copia
              de seguridad de tus datos actuales.
            </p>
          </div>
        </Sheet>
      )}
      {pickingFor &&
        createPortal(
          <ExerciseSelectorModal
            isOpen
            title="Elegir ejercicio"
            subtitle={hevyPlan?.newExercises.find((exercise) => exercise.id === pickingFor)?.name}
            onClose={() => setPickingFor(null)}
            onSelectExercises={handlePickExercise}
          />,
          document.body
        )}

      {hevyPlan && !pickingFor && (
        <Sheet
          title="Importar desde Hevy"
          onClose={() => setHevyPlan(null)}
          footer={
            <button
              type="button"
              onClick={handleConfirmHevy}
              disabled={isImporting || hevyPlan.workouts.length === 0}
              className="btn-primary w-full"
            >
              {hevyPlan.workouts.length === 0 ? 'Nada nuevo que importar' : `Añadir ${hevyPlan.workouts.length} entrenos`}
            </button>
          }
        >
          <dl className="divide-y divide-line">
            {[
              ['Entrenos nuevos', hevyPlan.workouts.length],
              ['Series', hevyPlan.setCount],
              ['Ejercicios enlazados al catálogo', hevyPlan.matched.length + Object.keys(hevyChoices).length],
              ['Ejercicios personalizados nuevos', hevyPlan.newExercises.length - Object.keys(hevyChoices).length],
              ['Ya importados, se omiten', hevyPlan.alreadyImported],
            ].map(([label, value]) => (
              <div key={label} className="min-h-12 flex items-center justify-between gap-3">
                <dt className="text-[15px] text-neutral-300">{label}</dt>
                <dd className="num text-xl text-white">{value}</dd>
              </div>
            ))}
          </dl>
          {hevyPlan.newExercises.length > 0 && (
            <div className="mt-4">
              <span className="label-tech block mb-1">Sin equivalente en HardFit</span>
              <ul className="divide-y divide-line">
                {hevyPlan.newExercises.map((exercise) => {
                  const choice = hevyChoices[exercise.id]
                  return (
                    <li key={exercise.id} className="py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="block text-[15px] font-semibold text-white">{exercise.name}</span>
                        <span className="block text-[13px] text-neutral-400">
                          {choice ? `Se guardará como ${choice.name}` : 'Se creará automáticamente'}
                        </span>
                      </div>
                      {choice && (
                        <button
                          type="button"
                          aria-label={`Crear ${exercise.name} automáticamente`}
                          onClick={() =>
                            setHevyChoices(({ [exercise.id]: _removed, ...rest }) => rest)
                          }
                          className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-300"
                        >
                          <RotateCcw size={18} strokeWidth={1.75} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPickingFor(exercise.id)}
                        className="btn-secondary shrink-0"
                        aria-label={`Elegir de HardFit el ejercicio para ${exercise.name}`}
                      >
                        {choice ? 'Cambiar' : 'Elegir'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Sheet>
      )}
    </section>
  )
}
