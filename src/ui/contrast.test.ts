import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Contraste de la paleta, medido sobre el CSS real.
 *
 * Los tokens se leen de index.css en vez de copiarlos aqui: un test que
 * repitiera los hex pasaria feliz mientras la app se vuelve ilegible. Cada par
 * es una combinacion que de verdad aparece en pantalla, con el umbral que le
 * toca segun WCAG 2.1: 4,5 para texto normal y 3 para bordes que delimitan un
 * control o comunican su estado (1.4.11).
 *
 * Los petalos de sakura de illustrations.tsx no entran: son decorativos y la
 * norma los excluye expresamente.
 */

const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')
  // Fuera comentarios: llevan hex de ejemplo que no son tokens.
  .replace(/\/\*[\s\S]*?\*\//g, '')

function tokensOf(selector: string): Record<string, string> {
  const block = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)
  if (!block) throw new Error(`No se encontro el bloque ${selector} en index.css`)

  const tokens: Record<string, string> = {}
  for (const [, name, hex] of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = hex.toLowerCase()
  }
  return tokens
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** color-mix(in srgb, fg P%, transparent) compuesto sobre bg, como hace el navegador. */
function mix(fg: string, percent: number, bg: string): string {
  const [fr, fgreen, fb] = channels(fg)
  const [br, bgreen, bb] = channels(bg)
  const alpha = percent / 100
  const blend = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha))
  return `#${[blend(fr, br), blend(fgreen, bgreen), blend(fb, bb)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

const TEXT = 4.5
/** Bordes que identifican un control o su estado: WCAG 1.4.11. */
const UI = 3

function pairsOf(t: Record<string, string>): [string, string, string, number][] {
  return [
    ['texto de página', t['on-background'], t.background, TEXT],
    ['texto de tarjeta', t['on-surface'], t.surface, TEXT],
    ['texto secundario sobre tarjeta', t['on-surface-variant'], t.surface, TEXT],
    ['texto secundario sobre fondo', t['on-surface-variant'], t.background, TEXT],
    ['texto secundario sobre variante', t['on-surface-variant'], t['surface-variant'], TEXT],
    ['botón primario', t['on-primary'], t.primary, TEXT],
    ['chip primario', t['on-primary-container'], t['primary-container'], TEXT],
    ['botón secundario', t['on-secondary'], t.secondary, TEXT],
    ['chip secundario', t['on-secondary-container'], t['secondary-container'], TEXT],
    ['botón terciario', t['on-tertiary'], t.tertiary, TEXT],
    ['chip terciario', t['on-tertiary-container'], t['tertiary-container'], TEXT],
    ['enlace sobre tarjeta', t.primary, t.surface, TEXT],
    ['enlace sobre fondo', t.primary, t.background, TEXT],
    ['«Completado» sobre tarjeta', t.success, t.surface, TEXT],
    ['borde de control sobre tarjeta', t.outline, t.surface, UI],
    ['borde de control sobre fondo', t.outline, t.background, UI],
    ['anillo de foco', t.primary, t.background, UI],
    ['opción acertada: borde', t.success, t.surface, UI],
    ['opción acertada: texto', t['on-surface'], mix(t.success, 18, t.surface), TEXT],
    ['opción fallada: borde', t.secondary, t.surface, UI],
    ['opción fallada: texto', t['on-surface'], mix(t.secondary, 18, t.surface), TEXT],
  ]
}

describe.each([
  ['claro', ':root'],
  ['oscuro', '\\.dark'],
])('contraste del tema %s', (_name, selector) => {
  const tokens = tokensOf(selector)

  it('define todos los tokens que usa la interfaz', () => {
    for (const [label, foreground, background] of pairsOf(tokens)) {
      expect(foreground, `${label}: falta el token de primer plano`).toBeDefined()
      expect(background, `${label}: falta el token de fondo`).toBeDefined()
    }
  })

  it.each(pairsOf(tokens))('%s alcanza el mínimo', (label, foreground, background, min) => {
    const ratio = contrast(foreground, background)
    expect(
      Number(ratio.toFixed(2)),
      `${label}: ${foreground} sobre ${background} da ${ratio.toFixed(2)}:1 y necesita ${min}:1`,
    ).toBeGreaterThanOrEqual(min)
  })
})
