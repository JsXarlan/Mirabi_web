import { describe, expect, it } from 'vitest'

import type { CharacterScript } from '../../core/content/types'
import { scriptFromSlug, slugOf, titleOf } from './scriptSlug'

/**
 * El puente ruta <-> modelo. Antes de existir, un slug desconocido caía en
 * hiragana en silencio (`script === 'katakana' ? 'KATAKANA' : 'HIRAGANA'`
 * copiado en tres pantallas). Lo que importa fijar es justo lo contrario:
 * que lo desconocido no se confunda con hiragana.
 */

const SCRIPTS: CharacterScript[] = ['HIRAGANA', 'KATAKANA', 'KANJI']

describe('scriptFromSlug', () => {
  it('reconoce los tres sistemas de escritura', () => {
    expect(scriptFromSlug('hiragana')).toBe('HIRAGANA')
    expect(scriptFromSlug('katakana')).toBe('KATAKANA')
    expect(scriptFromSlug('kanji')).toBe('KANJI')
  })

  it('un slug desconocido no cae en hiragana: devuelve null', () => {
    expect(scriptFromSlug('kotoba')).toBeNull()
    expect(scriptFromSlug('')).toBeNull()
    expect(scriptFromSlug(undefined)).toBeNull()
  })

  it('es estricto con mayúsculas: el slug de la ruta va en minúsculas', () => {
    expect(scriptFromSlug('Hiragana')).toBeNull()
    expect(scriptFromSlug('KANJI')).toBeNull()
  })
})

describe('slugOf y titleOf', () => {
  it('hacen el viaje de ida y vuelta con scriptFromSlug', () => {
    for (const script of SCRIPTS) {
      expect(scriptFromSlug(slugOf(script))).toBe(script)
    }
  })

  it('cada script tiene un título distinto', () => {
    const titles = SCRIPTS.map(titleOf)
    expect(new Set(titles).size).toBe(SCRIPTS.length)
  })
})
