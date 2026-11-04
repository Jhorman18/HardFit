import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  RefreshCw,
  LogOut,
  User as UserIcon,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../../store'
import { useSyncStore } from '../../sync'

export function AccountSection() {
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

  return (
    <section className="mt-5">
      <div className="px-4 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
          Cuenta y Sincronización
        </h2>
        {user && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Conectado
          </span>
        )}
      </div>

      <div className="mt-2 mx-4 border-t border-b border-line">
        {!isConfigured ? (
          <div className="py-4 text-xs text-neutral-400 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-neutral-400" />
            <span>
              Sincronización en la nube no disponible (variables de entorno no configuradas).
            </span>
          </div>
        ) : user ? (
          /* Conectado */
          <div className="py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-md bg-elevated border border-line-strong flex items-center justify-center shrink-0 text-neutral-300">
                  <UserIcon size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white truncate block">
                    {user.email}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">
                    {lastSyncAt
                      ? `Sincronizado ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: es })}`
                      : 'Sin sincronizar aún'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                disabled={authLoading || isSyncing}
                className="press min-h-12 px-3 rounded-md text-xs font-semibold border border-line-strong bg-elevated hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1.5 shrink-0"
                title="Cerrar sesión"
              >
                <LogOut size={14} />
                <span>Salir</span>
              </button>
            </div>

            {syncError && (
              <div className="text-xs p-3 rounded-md border bg-red-950/60 border-red-800 text-red-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{syncError}</span>
              </div>
            )}

            {lastResult && lastResult.success && !syncError && (
              <div className="text-[11px] text-neutral-400 bg-elevated px-3 py-2 rounded-md border border-line flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>
                  Sincronizado: {lastResult.pushed} subidos, {lastResult.pulled} recibidos,{' '}
                  {lastResult.deleted} eliminados.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => sync()}
              disabled={isSyncing}
              className="press w-full min-h-12 px-4 rounded-md text-xs font-bold bg-accent text-accent-fg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
            </button>
          </div>
        ) : (
          /* Desconectado */
          <form onSubmit={handleSignIn} className="py-3 space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  aria-label="Correo electrónico"
                  className="w-full min-h-12 bg-elevated border border-line-strong rounded-md pl-10 pr-3.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-accent"
                  disabled={authLoading}
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  aria-label="Contraseña"
                  className="w-full min-h-12 bg-elevated border border-line-strong rounded-md pl-10 pr-3.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-accent"
                  disabled={authLoading}
                />
              </div>
            </div>

            {authMessage && (
              <div
                className={`text-xs p-3 rounded-md border flex items-center gap-2 ${
                  authMessage.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border-red-800 text-red-300'
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

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={authLoading}
                className="press min-h-12 px-3 rounded-md text-xs font-bold bg-accent text-accent-fg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading && actionType === 'signin' && (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                <span>Iniciar sesión</span>
              </button>

              <button
                type="button"
                onClick={handleSignUp}
                disabled={authLoading}
                className="press min-h-12 px-3 rounded-md text-xs font-semibold border border-line-strong bg-elevated hover:bg-neutral-800 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading && actionType === 'signup' && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Crear cuenta</span>
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 pt-1 leading-normal">
              El inicio de sesión es opcional. HardFit funciona 100% sin conexión y sincroniza cuando hay red.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
