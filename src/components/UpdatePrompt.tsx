import { useEffect, useState, useRef, useCallback } from 'react'
import { Sheet } from './ui/Sheet'
import { useWorkoutStore } from '../store/workoutStore'
import {
  checkForUpdate,
  installUpdate,
  openInstallSettings,
  useUpdatePromptStore,
  InstallPermissionError,
} from '../utils/appUpdate'

const SNOOZE_KEY = 'replog_update_snooze'

interface SnoozeData {
  versionCode: number
  until: number
}

function isSnoozed(versionCode: number): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY)
    if (!raw) return false
    const parsed: SnoozeData = JSON.parse(raw)
    if (parsed && parsed.versionCode === versionCode && typeof parsed.until === 'number') {
      return Date.now() < parsed.until
    }
  } catch {
    // Si hay error en el parseo, no bloqueamos
  }
  return false
}

function saveSnooze(versionCode: number): void {
  try {
    const data: SnoozeData = {
      versionCode,
      until: Date.now() + 24 * 60 * 60 * 1000,
    }
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(data))
  } catch {
    // ignorar fallo de almacenamiento
  }
}

type UpdateStatus = 'idle' | 'downloading' | 'needPermission' | 'error'

interface UpdatePromptModalProps {
  info: NonNullable<ReturnType<typeof useUpdatePromptStore.getState>['info']>
}

function UpdatePromptModal({ info }: UpdatePromptModalProps) {
  const close = useUpdatePromptStore((s) => s.close)
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSnooze = () => {
    saveSnooze(info.versionCode)
    close()
  }

  const handleClose = () => {
    if (status === 'downloading') return
    close()
  }

  const handleStartUpdate = async () => {
    try {
      setStatus('downloading')
      setProgress(0)
      setErrorMessage('')
      await installUpdate((pct) => {
        setProgress(pct)
      })
      // Al llamar a la instalación con ACTION_VIEW, el instalador del sistema toma el control
      close()
    } catch (err) {
      if (err instanceof InstallPermissionError) {
        setStatus('needPermission')
      } else {
        setStatus('error')
        const msg = err instanceof Error ? err.message : String(err)
        setErrorMessage(msg || 'No se pudo completar la actualización.')
      }
    }
  }

  const handleOpenSettings = async () => {
    try {
      await openInstallSettings()
    } catch (err) {
      console.error('Error al abrir ajustes de instalación:', err)
    }
  }

  let footerContent: React.ReactNode = null
  if (status === 'downloading') {
    footerContent = null
  } else if (status === 'needPermission') {
    footerContent = (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleOpenSettings}
          className="btn-secondary flex-1"
        >
          Abrir ajustes
        </button>
        <button
          type="button"
          onClick={handleStartUpdate}
          className="btn-primary flex-1"
        >
          Actualizar
        </button>
      </div>
    )
  } else if (status === 'error') {
    footerContent = (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="btn-secondary flex-1"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={handleStartUpdate}
          className="btn-primary flex-1"
        >
          Reintentar
        </button>
      </div>
    )
  } else {
    footerContent = (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSnooze}
          className="btn-secondary flex-1"
        >
          Más tarde
        </button>
        <button
          type="button"
          onClick={handleStartUpdate}
          className="btn-primary flex-1"
        >
          Actualizar
        </button>
      </div>
    )
  }

  return (
    <Sheet
      title="Actualización disponible"
      onClose={handleClose}
      dismissable={status !== 'downloading'}
      footer={footerContent}
    >
      <div className="space-y-4 pt-1">
        <div>
          <div className="text-sm font-semibold text-white">
            Versión {info.versionName}
          </div>
          <div className="mt-2 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {info.notes}
          </div>
        </div>

        {status === 'downloading' && (
          <div className="pt-2">
            <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full origin-left transition-transform duration-150 ease-out"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
              <span>Descargando…</span>
              <span className="font-mono font-semibold text-white num">{progress}%</span>
            </div>
          </div>
        )}

        {status === 'needPermission' && (
          <div className="p-3 bg-neutral-900 border border-line rounded-md text-xs text-neutral-200">
            Android necesita que permitas instalar desde HardFit. Actívalo y vuelve a tocar Actualizar.
          </div>
        )}

        {status === 'error' && (
          <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-md text-xs text-red-400">
            {errorMessage || 'Ha ocurrido un error al actualizar.'}
          </div>
        )}
      </div>
    </Sheet>
  )
}

export function UpdatePrompt() {
  const { isOpen, info } = useUpdatePromptStore()
  const hasActiveWorkout = useWorkoutStore((s) => s.activeWorkout !== null)
  const prevHadWorkout = useRef(hasActiveWorkout)

  // Comprobación automática
  const checkAuto = useCallback(async () => {
    if (useWorkoutStore.getState().activeWorkout !== null) return
    const update = await checkForUpdate()
    if (!update) return
    if (useWorkoutStore.getState().activeWorkout !== null) return
    if (isSnoozed(update.versionCode)) return

    useUpdatePromptStore.getState().open(update)
  }, [])

  // Comprobar al arrancar
  useEffect(() => {
    checkAuto()
  }, [checkAuto])

  // Comprobar si termina el entreno
  useEffect(() => {
    if (prevHadWorkout.current && !hasActiveWorkout) {
      checkAuto()
    }
    prevHadWorkout.current = hasActiveWorkout
  }, [hasActiveWorkout, checkAuto])

  if (!isOpen || !info) {
    return null
  }

  return <UpdatePromptModal key={info.versionCode} info={info} />
}
