import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Scale,
  Gauge,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Cloud,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Mail,
  Lock,
  HeartPulse,
  Activity,
  Check,
  Plus,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../db'
import {
  exportJson,
  exportWorkoutsCsv,
  exportMeasurementsCsv,
  importBackupFromText,
} from '../utils/exportData'
import {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  patchAppSettings,
} from '../utils/healthMetrics'
import { useAuthStore } from '../store'
import { useSyncStore } from '../sync'
import type { Settings } from '../types'

export function SettingsPage() {
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const {
    user,
    loading: authLoading,
    message: authMessage,
    isConfigured,
    signInWithPassword,
    signUp,
    signOut,
    setMessage: setAuthMessage,
  } = useAuthStore()

  const { isSyncing, lastSyncAt, sync, lastResult, error: syncError } = useSyncStore()

  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [actionType, setActionType] = useState<'signin' | 'signup' | null>(null)

  const settings = useLiveQuery(async () => {
    const s = await db.settings.get('app')
    return s && 'units' in s ? s : undefined
  }, [])
  const currentUnits = settings?.units ?? 'kg'
  const currentRestSeconds = settings?.restSeconds ?? 120
  const currentShowRpe = settings?.showRpe ?? false
  const currentEnableHealthMetrics = settings?.enableHealthMetrics !== false

  const [newWeight, setNewWeight] = useState<string>('')
  const [weightStatus, setWeightStatus] = useState<string | null>(null)

  const latestWeightMeasurement = useLiveQuery(async () => {
    const list = await db.measurements
      .filter((m) => m.type === 'bodyweight')
      .sortBy('date')
    return list.length > 0 ? list[list.length - 1] : null
  }, [])

  // Guarda preservando los demás campos existentes.
  const patchSettings = async (patch: Partial<Omit<Settings, 'id'>>) => {
    await patchAppSettings(patch)
  }

  const handleUnitChange = (unit: 'kg' | 'lb') => patchSettings({ units: unit })
  const handleRestSecondsChange = (seconds: number) => patchSettings({ restSeconds: seconds })
  const handleShowRpeChange = (show: boolean) => patchSettings({ showRpe: show })
  const handleEnableHealthMetricsChange = (enabled: boolean) =>
    patchSettings({ enableHealthMetrics: enabled })

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedWeight = newWeight.trim() ? parseFloat(newWeight.trim()) : NaN
    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) return

    await db.measurements.add({
      id: `meas-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: Date.now(),
      type: 'bodyweight',
      value: parsedWeight,
      unit: currentUnits,
    })
    setNewWeight('')
    setWeightStatus(`Peso registrado: ${parsedWeight} ${currentUnits}.`)
    setTimeout(() => setWeightStatus(null), 3000)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail.trim() || !authPassword) {
      setAuthMessage({ type: 'error', text: 'Por favor ingresa tu correo y contraseña.' })
      return
    }
    setActionType('signin')
    await signInWithPassword(authEmail, authPassword)
    setActionType(null)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail.trim() || !authPassword) {
      setAuthMessage({ type: 'error', text: 'Por favor ingresa tu correo y contraseña.' })
      return
    }
    setActionType('signup')
    await signUp(authEmail, authPassword)
    setActionType(null)
  }

  const handleManualSync = async () => {
    await sync()
  }

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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const confirmed = window.confirm(
      'Esto REEMPLAZARÁ tus datos actuales con los de la copia. Se descargará primero una copia de tus datos actuales por seguridad. ¿Continuar?'
    )
    if (!confirmed) {
      e.target.value = ''
      return
    }

    try {
      setIsImporting(true)
      const text = await file.text()
      await importBackupFromText(text)
      alert('Copia restaurada correctamente.')
      window.location.reload()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('No se pudo importar: ' + msg)
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Ajustes</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Configuración general de la aplicación, cuenta y almacenamiento local.
        </p>
      </div>

      {/* Cuenta y sincronización */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cloud size={16} />
              Cuenta y Sincronización
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Sincroniza tus datos en la nube manteniendo local-first (opcional; RepLog funciona 100% offline).
            </p>
          </div>
          {user && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Conectado
            </span>
          )}
        </div>

        {!isConfigured ? (
          <div className="text-xs p-3 rounded-xl border bg-neutral-950 border-neutral-800 text-neutral-400 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-neutral-500" />
            <span>Sincronización en la nube no disponible (variables de entorno no configuradas).</span>
          </div>
        ) : user ? (
          /* Conectado */
          <div className="space-y-4 pt-1">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 text-neutral-300">
                  <UserIcon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user.email}</div>
                  <div className="text-[11px] text-neutral-400">
                    {lastSyncAt
                      ? `Última sincronización: ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: es })}`
                      : 'Sin sincronizar aún'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                disabled={authLoading || isSyncing}
                className="py-1.5 px-3 rounded-lg text-xs font-medium border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition flex items-center gap-1.5 shrink-0"
                title="Cerrar sesión"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>

            {syncError && (
              <div className="text-xs p-3 rounded-xl border bg-red-950/40 border-red-800/60 text-red-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{syncError}</span>
              </div>
            )}

            {lastResult && lastResult.success && !syncError && (
              <div className="text-[11px] text-neutral-400 bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800/80 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>
                  Sincronizado: {lastResult.pushed} subidos, {lastResult.pulled} recibidos, {lastResult.deleted} eliminados.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
            </button>
          </div>
        ) : (
          /* Desconectado */
          <form onSubmit={handleSignIn} className="space-y-3 pt-1">
            <div className="space-y-2">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition"
                  disabled={authLoading}
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition"
                  disabled={authLoading}
                />
              </div>
            </div>

            {authMessage && (
              <div
                className={`text-xs p-3 rounded-xl border flex items-center gap-2 transition ${
                  authMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/40 border-red-800/60 text-red-300'
                }`}
              >
                {authMessage.type === 'success' ? (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                )}
                <span>{authMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="submit"
                disabled={authLoading}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading && actionType === 'signin' && (
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                )}
                <span>Iniciar sesión</span>
              </button>

              <button
                type="button"
                onClick={handleSignUp}
                disabled={authLoading}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading && actionType === 'signup' && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Crear cuenta</span>
              </button>
            </div>

            <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              El inicio de sesión es opcional. RepLog es local-first y funciona sin cuenta.
            </div>
          </form>
        )}
      </div>

      {/* Unidades de peso */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Unidad de Peso</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Selecciona la unidad predeterminada para registrar cargas y pesos corporales.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleUnitChange('kg')}
            className={`py-3 px-4 rounded-xl text-sm font-medium border flex items-center justify-center gap-2 transition ${
              currentUnits === 'kg'
                ? 'bg-neutral-800 border-white text-white font-bold shadow-sm'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Scale size={18} />
            <span>Kilogramos (kg)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUnitChange('lb')}
            className={`py-3 px-4 rounded-xl text-sm font-medium border flex items-center justify-center gap-2 transition ${
              currentUnits === 'lb'
                ? 'bg-neutral-800 border-white text-white font-bold shadow-sm'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Scale size={18} />
            <span>Libras (lb)</span>
          </button>
        </div>

        <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
          Guardado automáticamente: <strong className="text-white uppercase">{currentUnits}</strong>
        </div>
      </div>

      {/* Temporizador de descanso predeterminado */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Temporizador de Descanso</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Tiempo de cuenta regresiva por defecto al completar una serie.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { label: '60s', val: 60 },
            { label: '90s', val: 90 },
            { label: '120s', val: 120 },
            { label: '180s', val: 180 },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => handleRestSecondsChange(item.val)}
              className={`py-2.5 rounded-xl text-xs font-semibold border text-center transition ${
                currentRestSeconds === item.val
                  ? 'bg-neutral-800 border-white text-white shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
          Duración activa: <strong className="text-white">{currentRestSeconds} segundos</strong>
        </div>
      </div>

      {/* RPE (esfuerzo percibido) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Gauge size={16} />
              Mostrar RPE
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Añade una columna de esfuerzo percibido (1–10) en cada serie del entreno. Opcional; por
              defecto está oculta.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={currentShowRpe}
            onClick={() => handleShowRpeChange(!currentShowRpe)}
            className={`relative shrink-0 w-12 h-7 rounded-full border transition ${
              currentShowRpe ? 'bg-white border-white' : 'bg-neutral-800 border-neutral-700'
            }`}
            aria-label="Activar o desactivar RPE"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                currentShowRpe ? 'translate-x-5 bg-black' : 'translate-x-0 bg-neutral-400'
              }`}
            />
          </button>
        </div>

        <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
          Estado: <strong className="text-white">{currentShowRpe ? 'Visible' : 'Oculto'}</strong>
        </div>
      </div>

      {/* Perfil y Métricas de Salud */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
        {/* Switch para activar / desactivar métricas */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <HeartPulse size={16} />
              Métricas de Salud
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Habilita el cálculo y visualización de IMC, Tasa Metabólica Basal (TMB) y Gasto Diario (TDEE). Puedes desactivarlo si no deseas ver métricas.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={currentEnableHealthMetrics}
            onClick={() => handleEnableHealthMetricsChange(!currentEnableHealthMetrics)}
            className={`relative shrink-0 w-12 h-7 rounded-full border transition ${
              currentEnableHealthMetrics ? 'bg-white border-white' : 'bg-neutral-800 border-neutral-700'
            }`}
            aria-label="Activar o desactivar métricas de salud"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                currentEnableHealthMetrics ? 'translate-x-5 bg-black' : 'translate-x-0 bg-neutral-400'
              }`}
            />
          </button>
        </div>

        <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
          Estado:{' '}
          <strong className="text-white">
            {currentEnableHealthMetrics ? 'Activas (visibles en Progreso)' : 'Desactivadas (ocultas)'}
          </strong>
        </div>

        {/* Formulario de perfil */}
        <HealthProfileForm
          key={`${settings?.sex}-${settings?.age}-${settings?.heightCm}-${settings?.activityLevel}`}
          settings={settings}
          patchSettings={patchSettings}
        />

        {/* Registro de peso actual */}
        <div className="space-y-2.5 pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Scale size={14} />
              Peso corporal actual
            </span>
            {latestWeightMeasurement && (
              <span className="text-[11px] text-neutral-400">
                Último:{' '}
                <strong className="text-white">
                  {latestWeightMeasurement.value} {latestWeightMeasurement.unit}
                </strong>{' '}
                ({format(new Date(latestWeightMeasurement.date), 'dd MMM yyyy', { locale: es })})
              </span>
            )}
          </div>

          <form onSubmit={handleSaveWeight} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.1"
                min="20"
                max="400"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Nuevo peso..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition pr-10"
              />
              <span className="absolute right-3 top-2 text-[10px] text-neutral-500 font-bold uppercase">
                {currentUnits}
              </span>
            </div>
            <button
              type="submit"
              disabled={!newWeight.trim()}
              className="py-1.5 px-3 bg-white hover:bg-neutral-200 disabled:opacity-40 text-black font-bold rounded-xl text-xs transition shrink-0 flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Registrar</span>
            </button>
          </form>

          {weightStatus && (
            <div className="text-xs p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>{weightStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* Datos y copia de seguridad */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download size={16} />
            Datos y Copia de Seguridad
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Exporta tus datos directamente desde este dispositivo. Todo el procesamiento se realiza en local sin conexión a servidores.
          </p>
        </div>

        {exportStatus && (
          <div
            className={`text-xs p-3 rounded-xl border flex items-center gap-2 transition ${
              exportStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
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

        <div className="space-y-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            type="button"
            onClick={() => handleExport('Backup JSON', exportJson)}
            disabled={isExporting || isImporting}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold border bg-neutral-950 hover:bg-neutral-800/80 border-neutral-800 text-white flex items-center justify-between transition disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5 text-left">
              <Download size={16} className="text-neutral-400 shrink-0" />
              <div>
                <div className="font-bold">Exportar JSON (backup completo)</div>
                <div className="text-[11px] text-neutral-400">
                  Todas las tablas: ejercicios, rutinas, historial, medidas y ajustes
                </div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60 shrink-0">
              JSON
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting || isImporting}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold border bg-neutral-950 hover:bg-neutral-800/80 border-neutral-800 text-white flex items-center justify-between transition disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5 text-left">
              <Upload size={16} className="text-neutral-400 shrink-0" />
              <div>
                <div className="font-bold">Importar copia (JSON)</div>
                <div className="text-[11px] text-neutral-400">
                  Restaura todas las tablas desde un archivo de copia previamente exportado
                </div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60 shrink-0">
              JSON
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('CSV de entrenamientos', exportWorkoutsCsv)}
            disabled={isExporting || isImporting}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold border bg-neutral-950 hover:bg-neutral-800/80 border-neutral-800 text-white flex items-center justify-between transition disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5 text-left">
              <Download size={16} className="text-neutral-400 shrink-0" />
              <div>
                <div className="font-bold">Exportar CSV (registro de entrenos)</div>
                <div className="text-[11px] text-neutral-400">
                  Una fila por serie con métricas y volumen para Excel
                </div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60 shrink-0">
              CSV
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('CSV de medidas', exportMeasurementsCsv)}
            disabled={isExporting || isImporting}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold border bg-neutral-950 hover:bg-neutral-800/80 border-neutral-800 text-white flex items-center justify-between transition disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5 text-left">
              <Download size={16} className="text-neutral-400 shrink-0" />
              <div>
                <div className="font-bold">Exportar CSV (medidas corporales)</div>
                <div className="text-[11px] text-neutral-400">
                  Historial cronológico de peso y perímetros corporales
                </div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60 shrink-0">
              CSV
            </span>
          </button>
        </div>

        <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
          Nota: Los archivos se descargan directamente en tu navegador o almacenamiento local.
        </div>
      </div>

      {/* Acerca de RepLog */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Acerca de RepLog</h2>
        <div className="space-y-2 text-xs text-neutral-400">
          <div className="flex justify-between py-1 border-b border-neutral-800">
            <span>Versión</span>
            <span className="text-neutral-200 font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-800">
            <span>Almacenamiento</span>
            <span className="text-neutral-200 font-medium">Local-first (Sync en la nube)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-800">
            <span>Modo</span>
            <span className="text-neutral-200">100% Local / Offline-first</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Idioma</span>
            <span className="text-neutral-200">Español</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface HealthProfileFormProps {
  settings?: Settings
  patchSettings: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>
}

function HealthProfileForm({ settings, patchSettings }: HealthProfileFormProps) {
  const [profileSex, setProfileSex] = useState<'male' | 'female' | null>(() => settings?.sex ?? null)
  const [profileAge, setProfileAge] = useState<string>(() => (settings?.age ? String(settings.age) : ''))
  const [profileHeight, setProfileHeight] = useState<string>(() =>
    settings?.heightCm ? String(settings.heightCm) : ''
  )
  const [profileActivity, setProfileActivity] = useState<ActivityLevel | ''>(() => settings?.activityLevel ?? '')
  const [profileStatus, setProfileStatus] = useState<string | null>(null)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const patch: Partial<Omit<Settings, 'id'>> = {}
    patch.sex = profileSex ?? undefined
    const parsedAge = profileAge.trim() ? parseInt(profileAge.trim(), 10) : NaN
    patch.age = !Number.isNaN(parsedAge) && parsedAge > 0 ? parsedAge : undefined
    const parsedHeight = profileHeight.trim() ? parseFloat(profileHeight.trim()) : NaN
    patch.heightCm = !Number.isNaN(parsedHeight) && parsedHeight > 0 ? parsedHeight : undefined
    patch.activityLevel = profileActivity || undefined
    patch.healthOnboarded = true

    await patchSettings(patch)
    setProfileStatus('Perfil de salud guardado.')
    setTimeout(() => setProfileStatus(null), 3000)
  }

  return (
    <form onSubmit={handleSaveProfile} className="space-y-3 pt-1 border-t border-neutral-800/80">
      <div className="text-xs font-semibold text-white flex items-center gap-1.5 pt-1">
        <Activity size={14} className="text-white" />
        <span>Datos de perfil (opcionales)</span>
      </div>

      {/* Sexo */}
      <div>
        <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
          Sexo biológico
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProfileSex(profileSex === 'male' ? null : 'male')}
            className={`py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              profileSex === 'male'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
            }`}
          >
            {profileSex === 'male' && <Check size={14} />}
            Hombre
          </button>
          <button
            type="button"
            onClick={() => setProfileSex(profileSex === 'female' ? null : 'female')}
            className={`py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              profileSex === 'female'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
            }`}
          >
            {profileSex === 'female' && <Check size={14} />}
            Mujer
          </button>
        </div>
      </div>

      {/* Edad y Estatura */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor="settings-age-input"
            className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1"
          >
            Edad (años)
          </label>
          <input
            id="settings-age-input"
            type="number"
            min="10"
            max="120"
            value={profileAge}
            onChange={(e) => setProfileAge(e.target.value)}
            placeholder="ej. 25"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition"
          />
        </div>

        <div>
          <label
            htmlFor="settings-height-input"
            className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1"
          >
            Estatura (cm)
          </label>
          <input
            id="settings-height-input"
            type="number"
            min="80"
            max="260"
            value={profileHeight}
            onChange={(e) => setProfileHeight(e.target.value)}
            placeholder="ej. 175"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition"
          />
        </div>
      </div>

      {/* Nivel de actividad */}
      <div>
        <label
          htmlFor="settings-activity-select"
          className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1"
        >
          Nivel de actividad
        </label>
        <select
          id="settings-activity-select"
          value={profileActivity}
          onChange={(e) => setProfileActivity(e.target.value as ActivityLevel | '')}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-500 transition"
        >
          <option value="" className="bg-neutral-900 text-neutral-400">
            Seleccionar nivel (opcional)...
          </option>
          {ACTIVITY_LEVELS.map((item) => (
            <option key={item.value} value={item.value} className="bg-neutral-900 text-white">
              {item.label} — {item.description}
            </option>
          ))}
        </select>
      </div>

      {profileStatus && (
        <div className="text-xs p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <span>{profileStatus}</span>
        </div>
      )}

      <button
        type="submit"
        className="w-full py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl text-xs transition border border-neutral-700 flex items-center justify-center gap-1.5"
      >
        Guardar perfil
      </button>
    </form>
  )
}
