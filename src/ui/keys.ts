import { useEffect } from 'react'

/**
 * Atajos de sesion.
 *
 * La app nacio en movil, donde solo hay dedos. En un teclado, encadenar veinte
 * ejercicios a golpe de raton es la mayor friccion que tiene la web: con Enter
 * y los digitos, una sesion se responde sin soltar las manos.
 */

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

/** Enter avanza. Funciona tambien desde el campo de texto libre. */
export function useEnterKey(onEnter: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat) return
      // Enter sobre un boton ya lo activa: no se dispara dos veces.
      if (event.target instanceof HTMLButtonElement) return
      event.preventDefault()
      onEnter()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEnter, enabled])
}

/** 1-9 elige la opcion n-esima, salvo mientras se escribe. */
export function useDigitKeys(onDigit: (index: number) => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      const digit = Number.parseInt(event.key, 10)
      if (!Number.isInteger(digit) || digit < 1 || digit > 9) return
      event.preventDefault()
      onDigit(digit - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onDigit, enabled])
}

/** Retroceso deshace el ultimo token del banco de palabras. */
export function useBackspaceKey(onBackspace: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' || event.repeat) return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      onBackspace()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onBackspace, enabled])
}
