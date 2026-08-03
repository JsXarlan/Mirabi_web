import type { CharacterScript } from '../../core/content/types'

/**
 * Puente entre la ruta y el modelo.
 *
 * El mapeo vivia copiado en tres pantallas con la forma
 * `script === 'katakana' ? 'KATAKANA' : 'HIRAGANA'`, que devuelve hiragana ante
 * cualquier cosa que no reconozca. Con dos sistemas de escritura eso no se
 * notaba; con un tercero, /caracteres/kanji habria pintado hiragana sin decir
 * nada. Aqui un slug desconocido devuelve null y la pantalla puede tratarlo
 * como lo que es.
 */

export function scriptFromSlug(slug: string | undefined): CharacterScript | null {
  if (slug === 'hiragana') return 'HIRAGANA'
  if (slug === 'katakana') return 'KATAKANA'
  if (slug === 'kanji') return 'KANJI'
  return null
}

export function slugOf(script: CharacterScript): string {
  if (script === 'HIRAGANA') return 'hiragana'
  if (script === 'KATAKANA') return 'katakana'
  return 'kanji'
}

export function titleOf(script: CharacterScript): string {
  if (script === 'HIRAGANA') return 'Hiragana'
  if (script === 'KATAKANA') return 'Katakana'
  return 'Kanji'
}
