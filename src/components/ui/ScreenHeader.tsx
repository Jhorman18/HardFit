import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ScreenHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Ruta de retorno; true vuelve atrás en el historial; sin valor no hay botón. */
  back?: string | true
  /** Sustituye al botón de atrás, por ejemplo una X que cierra. */
  leading?: ReactNode
  /** Botones a la derecha, cada uno de 48 px. Usar HeaderIconButton. */
  actions?: ReactNode
}

export function ScreenHeader({ title, subtitle, back, leading, actions }: ScreenHeaderProps) {
  const navigate = useNavigate()
  const hasLeading = leading !== undefined || back !== undefined

  return (
    <header className="sticky top-0 z-30 shrink-0 min-h-14 flex items-center gap-1 px-1 pt-[env(safe-area-inset-top)] bg-surface border-b border-line">
      {leading ??
        (back !== undefined && (
          <HeaderIconButton
            label="Atrás"
            onClick={() => (back === true ? navigate(-1) : navigate(back))}
          >
            <ArrowLeft size={22} strokeWidth={1.75} />
          </HeaderIconButton>
        ))}
      <div className={`flex-1 min-w-0 py-2 ${hasLeading ? '' : 'pl-3'}`}>
        <h1 className="text-[17px] font-semibold leading-tight text-white truncate">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[13px] text-neutral-400 truncate">{subtitle}</div>}
      </div>
      {actions}
    </header>
  )
}

interface HeaderIconButtonProps {
  label: string
  onClick?: () => void
  children: ReactNode
}

export function HeaderIconButton({ label, onClick, children }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="press min-w-12 min-h-12 flex items-center justify-center text-neutral-300 active:text-white"
    >
      {children}
    </button>
  )
}
