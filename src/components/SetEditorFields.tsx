import { DecimalInput } from './ui/DecimalInput'
import type { ExerciseType, RoutineItemTargetSet } from '../types'
import type { WeightUnit } from '../utils/weightUnits'

interface SetEditorFieldsProps {
  set: RoutineItemTargetSet
  type: ExerciseType
  unit: WeightUnit
  label: string
  showRpe?: boolean
  onChange: (patch: Partial<RoutineItemTargetSet>) => void
}

const inputClass = 'w-full min-w-0 min-h-12 px-1 rounded-md border border-line-strong bg-surface text-center num text-base text-white focus:outline-none focus:ring-2 focus:ring-accent'

function WholeNumberInput({ value, label, onChange }: {
  value?: number
  label: string
  onChange: (value: number | undefined) => void
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value ?? ''}
      placeholder="—"
      aria-label={label}
      className={inputClass}
      onChange={event => {
        if (!/^\d*$/.test(event.target.value)) return
        onChange(event.target.value === '' ? undefined : Number(event.target.value))
      }}
    />
  )
}

export function SetEditorFields({ set, type, unit, label, showRpe, onChange }: SetEditorFieldsProps) {
  const weightLabel = type === 'bodyweight_assisted' ? 'Asistencia' : type === 'bodyweight_reps' ? 'Lastre' : 'Peso'
  const hasRpe = showRpe || set.rpe !== undefined
  return (
    <div className={`grid gap-2 ${hasRpe ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {type === 'duration' ? (
        <>
          <label className="min-w-0 text-[11px] text-neutral-400 space-y-1">
            <span className="block">Minutos</span>
            <WholeNumberInput label={`Minutos ${label}`} value={set.durationSec === undefined ? undefined : Math.floor(set.durationSec / 60)}
              onChange={minutes => onChange({ durationSec: minutes === undefined && !((set.durationSec ?? 0) % 60) ? undefined : (minutes ?? 0) * 60 + (set.durationSec ?? 0) % 60 })} />
          </label>
          <label className="min-w-0 text-[11px] text-neutral-400 space-y-1">
            <span className="block">Segundos</span>
            <WholeNumberInput label={`Segundos ${label}`} value={set.durationSec === undefined ? undefined : set.durationSec % 60}
              onChange={seconds => onChange({ durationSec: seconds === undefined && !Math.floor((set.durationSec ?? 0) / 60) ? undefined : Math.floor((set.durationSec ?? 0) / 60) * 60 + (seconds ?? 0) })} />
          </label>
        </>
      ) : type === 'distance' ? (
        <>
          <label className="min-w-0 text-[11px] text-neutral-400 space-y-1">
            <span className="block">Metros</span>
            <DecimalInput aria-label={`Metros ${label}`} placeholder="—" className={inputClass} value={set.distanceM} onValueChange={distanceM => onChange({ distanceM })} />
          </label>
          <label className="min-w-0 text-[11px] text-neutral-400 space-y-1">
            <span className="block">Tiempo (s)</span>
            <WholeNumberInput label={`Tiempo ${label}`} value={set.durationSec} onChange={durationSec => onChange({ durationSec })} />
          </label>
        </>
      ) : (
        <>
          <label className="min-w-0 text-[11px] text-neutral-400 space-y-1">
            <span className="block">{weightLabel} ({unit})</span>
            <DecimalInput aria-label={`${weightLabel} ${label}`} placeholder="—" className={inputClass} value={set.weight} onValueChange={weight => onChange({ weight })} />
          </label>
          <label className="min-w-0 text-[11px] text-neutral-400 space-y-1">
            <span className="block">Repeticiones</span>
            <WholeNumberInput label={`Reps ${label}`} value={set.reps} onChange={reps => onChange({ reps })} />
          </label>
        </>
      )}
      {hasRpe && (
        <label className="min-w-0 text-[11px] text-neutral-400 space-y-1">
          <span className="block">RPE (opcional)</span>
          <DecimalInput aria-label={`RPE ${label}`} placeholder="—" className={inputClass} value={set.rpe} onValueChange={rpe => onChange({ rpe })} />
        </label>
      )}
    </div>
  )
}
