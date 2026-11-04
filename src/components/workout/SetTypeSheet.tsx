import { Check } from 'lucide-react'
import { Sheet } from '../ui'
import { SET_TYPE_OPTIONS, getSetTypeOption } from '../../utils/setTypes'
import type { SetType } from '../../types'

interface SetTypeSheetProps {
  title: string
  value: SetType
  onSelect: (type: SetType) => void
  onClose: () => void
}

export function SetTypeSheet({ title, value, onSelect, onClose }: SetTypeSheetProps) {
  const selected = getSetTypeOption(value).value

  return (
    <Sheet title={title} onClose={onClose}>
      <div role="radiogroup" aria-label="Tipo de serie" className="divide-y divide-line">
        {SET_TYPE_OPTIONS.map((option) => {
          const isSelected = option.value === selected
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                onSelect(option.value)
                onClose()
              }}
              className="press w-full min-h-14 py-2 flex items-center gap-3 text-left"
            >
              <span className="num w-10 h-10 shrink-0 flex items-center justify-center rounded-md border border-line-strong bg-elevated text-lg text-white">
                {option.badge ?? '1'}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-base font-semibold text-white">{option.label}</span>
                <span className="block text-[13px] text-neutral-400">{option.description}</span>
              </span>
              {isSelected && <Check size={20} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
