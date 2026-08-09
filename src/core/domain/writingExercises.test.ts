import { describe, expect, it } from 'vitest'

import { buildWritingCard, selectWritingSession } from './writingExercises'
import type { KanaCharacter, KanaStrokeCatalog } from '../content/types'
import type { MasteryScore } from './models'

/** Seleccion y armado de la sesion de escritura, sin la UI ni el catalogo real. */

function kana(overrides: Partial<KanaCharacter> = {}): KanaCharacter {
  return {
    id: 'kana-hiragana-a',
    symbol: 'あ',
    romaji: 'a',
    script: 'HIRAGANA',
    group: 'VOWELS',
    learningItemId: 'kana-hiragana-a',
    learningItemType: 'KANA',
    examples: [],
    ...overrides,
  }
}

const STROKES: KanaStrokeCatalog = {
  schemaVersion: 1,
  version: 'test',
  source: 'KanjiVG',
  license: 'CC BY-SA 3.0',
  strokes: {
    'kana-hiragana-a': { paths: ['M1,1 L2,2'], viewBox: '0 0 109 109' },
  },
}

describe('buildWritingCard', () => {
  it('arma la tarjeta cuando el catalogo de trazos tiene el caracter', () => {
    const card = buildWritingCard(kana(), STROKES)

    expect(card).toEqual({
      id: 'kana-hiragana-a',
      learningItemId: 'kana-hiragana-a',
      symbol: 'あ',
      romaji: 'a',
      strokePaths: ['M1,1 L2,2'],
      viewBox: '0 0 109 109',
    })
  })

  it('devuelve null si el catalogo de trazos no cubre ese caracter', () => {
    const card = buildWritingCard(kana({ learningItemId: 'kana-hiragana-i' }), STROKES)
    expect(card).toBeNull()
  })
})

describe('selectWritingSession', () => {
  const masteryFor = (levels: Record<string, MasteryScore>) => (id: string) => levels[id] ?? 'UNKNOWN'

  it('ordena los caracteres de menor a mayor dominio', () => {
    const characters = [
      kana({ id: 'a', learningItemId: 'a' }),
      kana({ id: 'b', learningItemId: 'b' }),
      kana({ id: 'c', learningItemId: 'c' }),
    ]
    const masteryOf = masteryFor({ a: 'EXPERT', b: 'UNKNOWN', c: 'LEARNING' })

    const session = selectWritingSession(characters, masteryOf)

    expect(session.map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })

  it('corta en el tamaño de sesion pedido', () => {
    const characters = Array.from({ length: 20 }, (_, i) => kana({ id: `k${i}`, learningItemId: `k${i}` }))
    const masteryOf = () => 'UNKNOWN' as MasteryScore

    expect(selectWritingSession(characters, masteryOf, 5)).toHaveLength(5)
  })

  it('sin caracteres, devuelve una sesion vacia', () => {
    expect(selectWritingSession([], () => 'UNKNOWN')).toEqual([])
  })
})
