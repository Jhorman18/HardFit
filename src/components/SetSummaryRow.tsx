import { useId, useState, type ReactNode } from 'react'
import { Check, Trash2 } from 'lucide-react'

interface SetSummaryRowProps {
  label: ReactNode
  editLabel: string
  summary: string
  description: string
  current?: boolean
  completed?: boolean
  onLabelClick?: () => void
  labelTitle?: string
  onComplete?: () => void
  completeLabel?: string
  onRemove?: () => void
  removeLabel?: string
  status?: ReactNode
  children: ReactNode
}

/** La edición y la confirmación son acciones independientes, con áreas táctiles de 48 px. */
export function SetSummaryRow({
  label, editLabel, summary, description, current, completed,
  onLabelClick, labelTitle, onComplete, completeLabel, onRemove, removeLabel, status, children,
}: SetSummaryRowProps) {
  const [expanded, setExpanded] = useState(false)
  const editorId = useId()
  return (
    <div
      data-set-row
      data-completed={completed ? 'true' : 'false'}
      data-current={current ? 'true' : 'false'}
      className={`border-b border-line/60 ${current || expanded ? 'bg-elevated rounded-md' : ''}`}
    >
      <div className="flex items-center min-h-16 gap-1">
        {onLabelClick ? (
          <button type="button" onClick={onLabelClick} aria-label={labelTitle} className="press min-w-12 min-h-12 text-xs num text-neutral-300">
            {label}
          </button>
        ) : (
          <span className="w-8 shrink-0 text-center text-xs num text-neutral-400">{label}</span>
        )}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={editLabel}
          aria-expanded={expanded}
          aria-controls={editorId}
          className="press flex-1 min-w-0 min-h-16 py-2 pr-1 text-left"
        >
          <span className={`block text-[15px] font-semibold num leading-snug ${completed ? 'text-neutral-400' : 'text-white'}`}>{summary}</span>
          <span className="block text-[11px] leading-relaxed text-neutral-400 mt-0.5">{description}</span>
        </button>
        {onComplete && (
          <div className="shrink-0 flex flex-col items-center">
            <button
              type="button"
              onClick={() => { setExpanded(false); onComplete() }}
              aria-label={completeLabel}
              aria-pressed={Boolean(completed)}
              className="press min-w-12 min-h-12 flex items-center justify-center"
            >
              <span className={`w-7 h-7 rounded-md border flex items-center justify-center ${completed
                ? 'bg-accent border-accent text-accent-fg'
                : current ? 'border-accent/60 text-accent' : 'border-line-strong text-neutral-400'}`}>
                <Check size={16} strokeWidth={2} />
              </span>
            </button>
            {status}
          </div>
        )}
      </div>
      {expanded && (
        <div id={editorId} className="px-3 pb-2 space-y-2">
          {children}
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setExpanded(false)} className="press min-h-12 text-xs text-neutral-300">Cerrar edición</button>
            {onRemove && (
              <button type="button" onClick={() => { setExpanded(false); onRemove() }} aria-label={removeLabel} className="press min-h-12 flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-400">
                <Trash2 size={14} /> Quitar serie
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
