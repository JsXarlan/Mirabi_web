import { describe, expect, it } from 'vitest'

import {
  buildKanjiReadingExercise,
  isKanjiReadingExerciseId,
  kanjiReadingExerciseFromId,
  readableInContext,
  readingInWord,
} from './kanjiReadingExercises'
import { kanjiCatalog, wordCatalog } from '../../test/content'

/**
 * Lectura de kanji en contexto, contra el catalogo real: palabras de un solo
 * kanji, algunas con okurigana (高い) y otras cuyo kanji solo aparece con
 * on'yomi (本, en katakana en KANJIDIC2 pero en hiragana en la palabra).
 */

function kanjiBySymbol(symbol: string) {
  const item = kanjiCatalog.kanji.find((k) => k.symbol === symbol)
  if (!item) throw new Error(`kanji no encontrado en el catálogo de prueba: ${symbol}`)
  return item
}

function wordByLemma(lemma: string) {
  const item = wordCatalog.words.find((w) => w.lemma === lemma)
  if (!item) throw new Error(`palabra no encontrada en el catálogo de prueba: ${lemma}`)
  return item
}

describe('readingInWord', () => {
  it('kun\'yomi sin okurigana: la palabra entera es la lectura', () => {
    expect(readingInWord(kanjiBySymbol('山'), wordByLemma('山'))).toBe('やま')
  })

  it('kun\'yomi con okurigana: solo la parte antes del punto es del kanji', () => {
    expect(readingInWord(kanjiBySymbol('高'), wordByLemma('たかい'))).toBe('たか')
  })

  it('on\'yomi: se compara en hiragana aunque KANJIDIC2 lo traiga en katakana', () => {
    expect(readingInWord(kanjiBySymbol('本'), wordByLemma('ほん'))).toBe('ほん')
  })

  it('formas honoríficas no decomponibles devuelven null en vez de adivinar', () => {
    expect(readingInWord(kanjiBySymbol('父'), wordByLemma('おとうさん'))).toBeNull()
  })
})

describe('readableInContext', () => {
  it('solo incluye palabras de un solo kanji con lectura resoluble', () => {
    const pairs = readableInContext(kanjiCatalog, wordCatalog)
    expect(pairs.length).toBeGreaterThan(0)

    for (const { kanji, word } of pairs) {
      expect(word.kanjiIds).toEqual([kanji.id])
      expect(readingInWord(kanji, word)).not.toBeNull()
    }

    // おとうさん no es decomponible: no puede colarse en el pool de práctica.
    expect(pairs.some(({ word }) => word.lemma === 'おとうさん')).toBe(false)
  })
})

describe('buildKanjiReadingExercise', () => {
  it('pregunta por la palabra, no por el kanji aislado', () => {
    const kanji = kanjiBySymbol('高')
    const word = wordByLemma('たかい')
    const exercise = buildKanjiReadingExercise(kanji, word, kanjiCatalog)!

    expect(exercise).not.toBeNull()
    expect(exercise.prompt).toContain(kanji.symbol)
    expect(exercise.prompt).toContain(word.lemma)
    expect(exercise.correctAnswer).toBe('たか')
    expect(exercise.options.map((o) => o.text)).toContain('たか')
    expect(exercise.mistakeType).toBe('WRONG_READING')
  })

  it('devuelve null cuando la palabra no tiene una lectura resoluble', () => {
    const exercise = buildKanjiReadingExercise(kanjiBySymbol('父'), wordByLemma('おとうさん'), kanjiCatalog)
    expect(exercise).toBeNull()
  })

  it('es determinista: la misma pareja genera siempre las mismas opciones', () => {
    const kanji = kanjiBySymbol('本')
    const word = wordByLemma('ほん')
    const first = buildKanjiReadingExercise(kanji, word, kanjiCatalog)
    const second = buildKanjiReadingExercise(kanji, word, kanjiCatalog)
    expect(second!.options.map((o) => o.text)).toEqual(first!.options.map((o) => o.text))
  })

  it('el id se reconoce y se reconstruye igual que el original', () => {
    const kanji = kanjiBySymbol('山')
    const word = wordByLemma('山')
    const built = buildKanjiReadingExercise(kanji, word, kanjiCatalog)!
    expect(isKanjiReadingExerciseId(built.id)).toBe(true)

    const rebuilt = kanjiReadingExerciseFromId(built.id, kanjiCatalog, wordCatalog)
    expect(rebuilt).toEqual(built)
  })

  it('un id que no es de lectura en contexto no se reconoce', () => {
    expect(isKanjiReadingExerciseId('kanji-practice-x')).toBe(false)
    expect(kanjiReadingExerciseFromId('kanji-practice-x', kanjiCatalog, wordCatalog)).toBeNull()
  })
})
