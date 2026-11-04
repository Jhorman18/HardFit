import { useNavigate } from 'react-router-dom'
import { Check, Play, Search } from 'lucide-react'

interface FirstRunViewProps {
  unit: string
}

export function FirstRunView({ unit }: FirstRunViewProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <span className="label-tech">Primer uso</span>
        <h2 className="text-2xl font-semibold text-white leading-tight">
          Tu primera serie es el primer número a batir.
        </h2>
        <p className="text-base text-neutral-300 leading-relaxed">
          Todavía no hay nada que superar. Empieza un entreno vacío y la app guardará cada serie
          como referencia para la próxima vez.
        </p>
      </div>

      <ol className="divide-y divide-line border-t border-b border-line">
        <li className="flex items-center gap-3 py-3.5">
          <span className="w-7 h-7 rounded-full bg-elevated border border-line flex items-center justify-center num text-sm text-neutral-300 shrink-0">
            1
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-white block">Elige kilos o libras</span>
            <span className="text-xs text-neutral-400 block mt-0.5">
              Ahora mismo: {unit === 'lb' ? 'libras' : 'kilos'}. Lo cambias en Ajustes.
            </span>
          </div>
          <span className="w-8 h-8 rounded-full bg-accent text-accent-fg flex items-center justify-center shrink-0">
            <Check size={16} strokeWidth={2.5} />
          </span>
        </li>

        <li className="flex items-center gap-3 py-3.5">
          <span className="w-7 h-7 rounded-full bg-elevated border border-line flex items-center justify-center num text-sm text-neutral-300 shrink-0">
            2
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-white block">Crea tu primera rutina</span>
            <span className="text-xs text-neutral-400 block mt-0.5">
              O entra directo y añade ejercicios sobre la marcha.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/routines')}
            className="press px-3 py-1.5 bg-elevated border border-line-strong hover:bg-surface text-xs font-semibold text-white rounded-md shrink-0"
          >
            Crear
          </button>
        </li>

        <li className="flex items-center gap-3 py-3.5">
          <span className="w-7 h-7 rounded-full bg-elevated border border-line flex items-center justify-center num text-sm text-neutral-300 shrink-0">
            3
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-white block">Registra tu primer entreno</span>
            <span className="text-xs text-neutral-400 block mt-0.5">
              Al terminar verás tu resumen y tus primeros récords.
            </span>
          </div>
        </li>
      </ol>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/workout')}
          className="btn-primary w-full"
        >
          <Play size={18} fill="currentColor" />
          <span>Empezar entreno vacío</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/routines')}
          className="btn-secondary w-full"
        >
          <Search size={18} />
          <span>Explorar los ejercicios</span>
        </button>
      </div>
    </div>
  )
}
