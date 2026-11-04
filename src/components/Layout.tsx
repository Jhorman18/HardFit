import { useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, History, Home, LineChart } from 'lucide-react'
import { useWorkoutStore } from '../store/workoutStore'
import { db } from '../db'
import { formatClock } from '../utils/format'
import { useRestTimeLeft } from '../utils/useRestTimeLeft'
import { HealthOnboardingModal } from './HealthOnboardingModal'
import { RestAlarm } from './RestAlarm'
import { DumbbellIcon } from './ui'

const NAV_ITEMS = [
  { to: '/', label: 'Hoy', Icon: Home },
  { to: '/routines', label: 'Rutinas', Icon: FileText },
  { to: '/history', label: 'Historial', Icon: History },
  { to: '/stats', label: 'Progreso', Icon: LineChart },
]

function navItemClass({ isActive }: { isActive: boolean }) {
  return `press flex-1 min-h-[72px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
    isActive ? 'text-accent' : 'text-neutral-400'
  }`
}

function ResumeBar({ name }: { name: string }) {
  const navigate = useNavigate()
  const timeLeft = useRestTimeLeft()

  return (
    <button
      type="button"
      onClick={() => navigate('/workout')}
      className="press w-full min-h-12 flex items-center gap-3 px-4 py-1 text-left bg-elevated border-t border-accent"
    >
      <span className="w-2 h-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <span className="flex-1 min-w-0">
        <span className="label-tech block">Entreno en curso</span>
        <span className="block text-sm font-semibold text-white truncate">{name}</span>
      </span>
      {timeLeft > 0 && <span className="num text-xl text-accent">{formatClock(timeLeft)}</span>}
    </button>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout)
  const settings = useLiveQuery(async () => {
    const s = await db.settings.get('app')
    return s && 'units' in s ? s : undefined
  }, [])

  useEffect(() => {
    if (settings) useWorkoutStore.getState().setDefaultWeightUnit(settings.units)
  }, [settings])

  const showHealthOnboarding = settings !== undefined && settings.healthOnboarded !== true
  // Durante el entreno, la pantalla es toda para la serie.
  const immersive = pathname === '/workout' && activeWorkout !== null

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center">
      <div className="w-full max-w-md min-h-[100dvh] flex flex-col bg-black relative">
        <main
          className={`flex-1 flex flex-col ${immersive ? '' : 'pb-[calc(128px+env(safe-area-inset-bottom))]'}`}
        >
          <Outlet />
        </main>

        <RestAlarm />

        {showHealthOnboarding && <HealthOnboardingModal settings={settings} />}

        {!immersive && (
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto">
              {activeWorkout && <ResumeBar name={activeWorkout.name} />}
              <nav
                aria-label="Navegación principal"
                className="flex bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]"
              >
                {NAV_ITEMS.slice(0, 2).map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} end={to === '/'} className={navItemClass}>
                    <Icon size={24} strokeWidth={1.75} />
                    <span>{label}</span>
                  </NavLink>
                ))}
                <NavLink to="/workout" className={(state) => `${navItemClass(state)} relative`}>
                  <span className="absolute -top-5 left-1/2 -ml-7 w-14 h-14 flex items-center justify-center rounded-full bg-accent text-accent-fg">
                    <DumbbellIcon size={28} />
                  </span>
                  {/* Hueco del icono: deja «Entrenar» a la altura de las demás etiquetas. */}
                  <span className="h-6" aria-hidden="true" />
                  <span>Entrenar</span>
                </NavLink>
                {NAV_ITEMS.slice(2).map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} className={navItemClass}>
                    <Icon size={24} strokeWidth={1.75} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
