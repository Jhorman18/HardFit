import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Routine, Exercise } from '../../types'

interface NextRoutineCardProps {
  routine: Routine
  exerciseMap: Map<string, Exercise>
  onStart: (routine: Routine) => void
}

export function NextRoutineCard({ routine, exerciseMap, onStart }: NextRoutineCardProps) {
  const items = routine.items || []
  const exerciseCount = items.length
  const totalSets = items.reduce((acc, item) => acc + (item.targetSets?.length || 0), 0)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Siguiente rutina</h2>
        <Link
          to="/routines"
          className="press text-sm font-semibold text-neutral-300 hover:text-white"
        >
          Ver todas
        </Link>
      </div>

      <div className="panel p-4 space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white truncate">{routine.name}</h3>
          <p className="text-sm text-neutral-400 mt-0.5">
            {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
            <span className="num">{totalSets}</span> series
          </p>
        </div>

        {items.length > 0 && (
          <div className="border-t border-b border-line py-2 divide-y divide-line/40">
            {items.slice(0, 3).map((item, idx) => {
              const exName = exerciseMap.get(item.exerciseId)?.name || 'Ejercicio'
              const setCount = item.targetSets?.length || 0
              const setsLabel = setCount > 0 ? `${setCount} series` : 'Sin series'
              return (
                <div key={`${item.exerciseId}-${idx}`} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-neutral-300 truncate pr-2">{exName}</span>
                  <span className="text-neutral-400 num shrink-0 font-semibold">{setsLabel}</span>
                </div>
              )
            })}
            {items.length > 3 && (
              <div className="pt-1.5 text-xs text-neutral-400 font-semibold">
                + {items.length - 3} {items.length - 3 === 1 ? 'ejercicio más' : 'ejercicios más'}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onStart(routine)}
          className="btn-primary w-full"
        >
          <Play size={18} fill="currentColor" />
          <span>Empezar rutina</span>
        </button>
      </div>
    </section>
  )
}
