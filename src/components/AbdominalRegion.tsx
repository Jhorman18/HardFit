import {
  ABDOMINAL_REGION_LABELS,
  ABDOMINAL_REGION_NOTE,
  getAbdominalClassification,
  type AbdominalRegionFilterValue,
} from '../data/abdominalRegions'

interface AbdominalRegionFilterProps {
  value: AbdominalRegionFilterValue
  onChange: (value: AbdominalRegionFilterValue) => void
}

const OPTIONS: { value: AbdominalRegionFilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'upper', label: 'Superior' },
  { value: 'lower', label: 'Inferior' },
  { value: 'full', label: 'Completo' },
]

export function AbdominalRegionFilter({ value, onChange }: AbdominalRegionFilterProps) {
  return (
    <div className="space-y-1">
      <span className="label-tech block text-neutral-400">Énfasis del recto abdominal</span>
      <div role="group" aria-label="Filtro de énfasis abdominal" className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            aria-label={option.value === 'all' ? 'Todos los énfasis abdominales' : ABDOMINAL_REGION_LABELS[option.value]}
            onClick={() => onChange(option.value)}
            className={`press min-h-12 px-3 rounded-md text-xs font-semibold whitespace-nowrap border shrink-0 ${value === option.value
              ? 'bg-accent border-accent text-on-accent'
              : 'bg-surface border-line text-neutral-300 hover:text-white hover:border-line-strong'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AbdominalRegionBadge({ exerciseId }: { exerciseId: string }) {
  const classification = getAbdominalClassification(exerciseId)
  if (!classification) return null
  return <span className="block text-[11px] text-neutral-300 mt-1" data-abdominal-region={classification.region}>{classification.label}</span>
}

export function AbdominalRegionInfo({ exerciseId }: { exerciseId: string }) {
  const classification = getAbdominalClassification(exerciseId)
  if (!classification) return null
  return (
    <section aria-label="Énfasis del recto abdominal" className="p-3 bg-surface-elevated border border-line rounded-md space-y-2" data-abdominal-region={classification.region}>
      <span className="label-tech block text-neutral-400">Mayor énfasis regional</span>
      <h3 className="text-sm font-semibold text-white">{classification.label}</h3>
      <p className="text-xs text-neutral-300 leading-relaxed">{classification.reason}</p>
      {classification.cue && <p className="text-xs text-neutral-300 leading-relaxed">{classification.cue}</p>}
      <p className="text-xs text-neutral-400 leading-relaxed">{ABDOMINAL_REGION_NOTE}</p>
    </section>
  )
}
