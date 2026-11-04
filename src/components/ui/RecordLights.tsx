import { useEffect, useState, type CSSProperties } from 'react'

interface RecordLightsProps {
  lit: boolean
  /** Diámetro de cada luz en px. */
  size?: number
  className?: string
}

/**
 * Las tres luces: la única celebración de la app. Se encienden en secuencia de 80 ms cuando lit
 * pasa a true. Apagadas no se ven: una serie peor nunca se castiga.
 */
export function RecordLights({ lit, size = 6, className = '' }: RecordLightsProps) {
  // Un fotograma apagadas para que la transición arranque también al montarse ya encendidas.
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!lit) return
    const frame = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(frame)
  }, [lit])

  return (
    <span
      className={`record-lights ${className}`}
      data-lit={lit && on}
      role={lit ? 'img' : undefined}
      aria-label={lit ? 'Récord batido' : undefined}
      aria-hidden={lit ? undefined : true}
      style={{ '--light-size': `${size}px` } as CSSProperties}
    >
      <span className="record-lights-dot" />
      <span className="record-lights-dot" />
      <span className="record-lights-dot" />
    </span>
  )
}
