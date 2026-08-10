import { describe, expect, it } from 'vitest'

import { buildKanaWritingCard, buildKanjiWritingCard, selectWritingSession } from './writingExercises'
import type { KanaCharacter, KanaStrokeEntry, KanjiCharacter } from '../content/types'
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

function kanji(overrides: Partial<KanjiCharacter> = {}): KanjiCharacter {
  return {
    id: 'kanji-6C34',
    symbol: '水',
    learningItemId: 'kanji-6C34',
    meanings: ['agua'],
    meaningsLanguage: 'ES',
    onyomi: [],
    kunyomi: [],
    strokeCount: 4,
    radical: null,
    grade: 1,
    frequencyRank: null,
    jlptLevel: null,
    learningItemType: 'KANJI',
    wordIds: [],
    source: 'MIRABI',
    sourceRef: null,
    license: null,
    ...overrides,
  }
}

const STROKES: Record<string, KanaStrokeEntry> = {
  'kana-hiragana-a': { paths: ['M1,1 L2,2'], viewBox: '0 0 109 109' },
  'kanji-6C34': { paths: ['M3,3 L4,4'], viewBox: '0 0 109 109' },
}

describe('buildKanaWritingCard', () => {
  it('arma la tarjeta cuando el catalogo de trazos tiene el caracter', () => {
    const card = buildKanaWritingCard(kana(), STROKES)

    expect(card).toEqual({
      id: 'kana-hiragana-a',
      learningItemId: 'kana-hiragana-a',
      symbol: 'あ',
      prompt: 'a',
      strokePaths: ['M1,1 L2,2'],
      viewBox: '0 0 109 109',
    })
  })

  it('devuelve null si el catalogo de trazos no cubre ese caracter', () => {
    const card = buildKanaWritingCard(kana({ learningItemId: 'kana-hiragana-i' }), STROKES)
    expect(card).toBeNull()
  })
})

describe('buildKanjiWritingCard', () => {
  it('arma la tarjeta con el significado como pista, no la lectura', () => {
    const card = buildKanjiWritingCard(kanji(), STROKES)

    expect(card).toEqual({
      id: 'kanji-6C34',
      learningItemId: 'kanji-6C34',
      symbol: '水',
      prompt: 'agua',
      strokePaths: ['M3,3 L4,4'],
      viewBox: '0 0 109 109',
    })
  })

  it('devuelve null si el catalogo de trazos no cubre ese kanji', () => {
    const card = buildKanjiWritingCard(kanji({ learningItemId: 'kanji-9999' }), STROKES)
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

  it('funciona igual con kanji, generico sobre el tipo', () => {
    const items = [
      kanji({ id: 'a', learningItemId: 'a' }),
      kanji({ id: 'b', learningItemId: 'b' }),
    ]
    const masteryOf = masteryFor({ a: 'EXPERT', b: 'UNKNOWN' })

    expect(selectWritingSession(items, masteryOf).map((k) => k.id)).toEqual(['b', 'a'])
  })
})
