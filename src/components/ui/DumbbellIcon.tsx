interface DumbbellIconProps {
  size?: number
  strokeWidth?: number
  className?: string
}

/** Mancuerna en diagonal: el icono de Entrenar y el marcador de ejercicio sin imagen. */
export function DumbbellIcon({ size = 24, strokeWidth = 2, className }: DumbbellIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="m5.5 12.5 6 6" />
      <path d="m12.5 5.5 6 6" />
      <path d="m3.5 14.5 6 6" />
      <path d="m14.5 3.5 6 6" />
    </svg>
  )
}
