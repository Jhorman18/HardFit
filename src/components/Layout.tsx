import { Outlet, NavLink } from 'react-router-dom'
import {
  Home,
  Dumbbell,
  History,
  ClipboardList,
  BookOpen,
  BarChart3,
  Settings,
} from 'lucide-react'
import { RestTimerBar } from './RestTimerBar'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', Icon: Home },
  { to: '/workout', label: 'Entrenar', Icon: Dumbbell },
  { to: '/history', label: 'Historial', Icon: History },
  { to: '/routines', label: 'Rutinas', Icon: ClipboardList },
  { to: '/exercises', label: 'Ejercicios', Icon: BookOpen },
  { to: '/stats', label: 'Progreso', Icon: BarChart3 },
  { to: '/settings', label: 'Ajustes', Icon: Settings },
]

export function Layout() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center">
      {/* Marco contenedor móvil centrado */}
      <div className="w-full max-w-md min-h-screen flex flex-col bg-black border-x border-neutral-800 shadow-2xl relative">
        {/* Barra superior */}
        <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="RepLog"
              className="w-8 h-8 rounded-lg border border-neutral-800 bg-white object-contain shadow-sm"
            />
            <div>
              <span className="font-extrabold tracking-tight text-white text-base">RepLog</span>
              <span className="ml-1.5 text-[10px] uppercase font-semibold text-neutral-300 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded">
                Local
              </span>
            </div>
          </div>
          <div className="text-xs text-neutral-400 font-mono">v0.1</div>
        </header>

        {/* Contenido de ruta con espacio inferior para el footer fijo */}
        <main className="flex-1 pb-24">
          <Outlet />
        </main>

        {/* Temporizador de descanso flotante */}
        <RestTimerBar />

        {/* Barra de navegación inferior fija estilo app móvil */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-full max-w-md bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 px-1 py-1.5 flex justify-around items-center pointer-events-auto shadow-lg">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition duration-150 ${
                    isActive
                      ? 'text-white font-bold bg-neutral-800'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} className="mb-0.5" />
                <span className="text-[10px] tracking-tight">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
