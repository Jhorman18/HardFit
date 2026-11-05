import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { checkForUpdate, useUpdatePromptStore } from '../../utils/appUpdate'

export function AboutSection() {
  const [nativeVersion, setNativeVersion] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    if (isNative) {
      App.getInfo()
        .then((info) => {
          setNativeVersion(info.version)
        })
        .catch(() => {})
    }
  }, [isNative])

  const handleCheckUpdate = async () => {
    if (checking) return
    setChecking(true)
    setStatusMsg(null)
    setIsError(false)
    try {
      const update = await checkForUpdate({ throwOnError: true })
      if (update) {
        useUpdatePromptStore.getState().open(update)
      } else {
        setStatusMsg('Tienes la última versión')
      }
    } catch {
      setIsError(true)
      setStatusMsg('No se pudo comprobar. Revisa tu conexión.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <section className="mt-5 pb-8">
      <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
        Acerca de
      </h2>

      <div className="mt-2 mx-4 border-t border-b border-line text-xs">
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between">
          <span className="text-neutral-300">Versión</span>
          <span className="text-white font-mono num">
            {isNative && nativeVersion ? nativeVersion : '2.0.0'}
          </span>
        </div>
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between">
          <span className="text-neutral-300">Almacenamiento</span>
          <span className="text-white">Local-first (offline)</span>
        </div>
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between">
          <span className="text-neutral-300">Idioma</span>
          <span className="text-white">Español</span>
        </div>

        {isNative && (
          <div className="min-h-12 py-2 border-b border-line flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">Buscar actualizaciones</span>
              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={checking}
                className="press min-h-12 px-3 rounded-md text-xs font-semibold bg-elevated border border-line-strong text-white hover:bg-neutral-800 disabled:opacity-40"
              >
                {checking ? 'Comprobando…' : 'Comprobar'}
              </button>
            </div>
            {statusMsg && (
              <p
                className={`mt-1.5 text-[11px] ${
                  isError ? 'text-red-400' : 'text-neutral-400'
                }`}
              >
                {statusMsg}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-neutral-400">
        HardFit 2.0 · sin anuncios, sin suscripción
      </p>
    </section>
  )
}
