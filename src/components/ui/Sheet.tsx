import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDismissable } from './useDismissable'

interface SheetProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** Zona fija inferior, normalmente la acción principal. */
  footer?: ReactNode
  /** Si es false, no se puede cerrar con fondo, Esc ni muestra la X. */
  dismissable?: boolean
}

/** Hoja modal inferior: se cierra con el fondo, con Esc o con la X. */
export function Sheet({ title, onClose, children, footer, dismissable = true }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useDismissable(onClose, dismissable)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div
        className="sheet-scrim absolute inset-0 bg-neutral-950/60"
        onClick={dismissable ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="sheet-panel relative w-full max-w-md max-h-[86dvh] flex flex-col bg-surface border-t border-line-strong rounded-t-lg outline-none pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center gap-2 pl-4 pr-1 pt-1 shrink-0">
          <h2 className="flex-1 min-w-0 text-xl font-semibold text-white truncate">{title}</h2>
          {dismissable && (
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-300"
            >
              <X size={22} strokeWidth={1.75} />
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="shrink-0 px-4 py-3 border-t border-line">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
