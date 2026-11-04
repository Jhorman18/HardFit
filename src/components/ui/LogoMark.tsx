interface LogoMarkProps {
  size?: number
  className?: string
}

/** La H de HardFit: una barra cargada vista de frente. Mismo dibujo que scripts/generate-logo.mjs. */
export function LogoMark({ size = 24, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="178 212 668 600"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="282" y="212" width="130" height="600" rx="16" />
      <rect x="612" y="212" width="130" height="600" rx="16" />
      <rect x="178" y="322" width="80" height="380" rx="12" />
      <rect x="766" y="322" width="80" height="380" rx="12" />
      <rect x="412" y="462" width="200" height="100" />
    </svg>
  )
}
