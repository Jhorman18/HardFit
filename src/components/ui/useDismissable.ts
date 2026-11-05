import { useEffect, useRef } from 'react'

// Las hojas se abren unas sobre otras: Esc y el atrás del móvil cierran solo la de arriba.
const stack: symbol[] = []

export function hasOpenDismissable(): boolean {
  return stack.length > 0
}

/** Cierra la capa superior; el atrás de Android lo usa igual que la tecla Esc. */
export function dismissTop(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

export function useDismissable(onClose: () => void, enabled = true) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!enabled) return
    const id = Symbol('dismissable')
    stack.push(id)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stack[stack.length - 1] === id) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(id), 1)
    }
  }, [enabled])
}
