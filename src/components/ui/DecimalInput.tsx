import { useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { formatWeight, parseDecimal } from '../../utils/format'

interface DecimalInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  value: number | undefined
  onValueChange: (value: number | undefined) => void
}

/**
 * Campo de peso con coma decimal. Mientras se escribe conserva el texto tal cual: un campo atado
 * al número perdería la coma de «77,» antes de poder teclear el 5.
 */
export function DecimalInput({ value, onValueChange, onFocus, onBlur, ...props }: DecimalInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const display = value === undefined ? '' : formatWeight(value)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value
    if (!/^[\d.,]*$/.test(text)) return
    setDraft(text)
    onValueChange(parseDecimal(text))
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft ?? display}
      onChange={handleChange}
      onFocus={(event) => {
        setDraft(display)
        event.target.select()
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setDraft(null)
        onBlur?.(event)
      }}
    />
  )
}
