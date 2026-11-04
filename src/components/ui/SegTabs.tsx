interface SegTabsProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}

/** Pestañas subrayadas como cabecera de hoja técnica. */
export function SegTabs<T extends string>({ value, options, onChange, label }: SegTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex px-4 border-b border-line bg-black shrink-0">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`press flex-1 min-h-12 px-2 text-[13px] font-semibold uppercase tracking-[0.08em] border-b-2 ${
              active ? 'text-white border-accent' : 'text-neutral-400 border-transparent'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
