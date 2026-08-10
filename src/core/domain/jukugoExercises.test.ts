import { describe, expect, it } from 'vitest'

import {
  buildJukugoExercise,
  isJukugoExerciseId,
  jukugoCompound,
  jukugoExerciseFromId,
  jukugoWords,
} from './jukugoExercises'
import { kanjiCatalog, wordCatalog } from '../../test/content'

/** Compuestos de dos kanji, contra el catalogo real (20 palabras de dos kanji). */

function wordByLemma(lemma: string) {
  const item = wordCatalog.words.find((w) => w.lemma === lemma)
  if (!item) throw new Error(`palabra no encontrada en el catálogo de prueba: ${lemma}`)
  return item
}

describe('jukugoCompound', () => {
  it('reconstruye el compuesto en el orden de kanjiIds', () => {
    expect(jukugoCompound(wordByLemma('日本'), kanjiCatalog)).toBe('日本')
  })

  it('reconstruye el compuesto aunque la palabra se muestre en kana', () => {
    // ともだち (友達) todavia se ve en kana en el resto de la app: el curso no
    // enseñó ese kanji, pero el compuesto igual se puede reconstruir.
    expect(jukugoCompound(wordByLemma('ともだち'), kanjiCatalog)).toBe('友達')
  })

  it('devuelve null para una palabra que no es de exactamente dos kanji', () => {
    const unKanji = wordCatalog.words.find((w) => w.kanjiIds.length === 1)!
    expect(jukugoCompound(unKanji, kanjiCatalog)).toBeNull()

    const sinKanji = wordCatalog.words.find((w) => w.kanjiIds.length === 0)!
    expect(jukugoCompound(sinKanji, kanjiCatalog)).toBeNull()
  })
})

describe('jukugoWords', () => {
  it('son exactamente las palabras de dos kanji del catálogo (20)', () => {
    const words = jukugoWords(wordCatalog, kanjiCatalog)
    expect(words.length).toBe(20)
    for (const word of words) expect(word.kanjiIds.length).toBe(2)
  })
})

describe('buildJukugoExercise', () => {
  it('pregunta por el compuesto, no por la lectura', () => {
    const word = wordByLemma('ともだち')
    const exercise = buildJukugoExercise(word, wordCatalog, kanjiCatalog)!

    expect(exercise).not.toBeNull()
    expect(exercise.prompt).toContain('友達')
    expect(exercise.correctAnswer).toBe(word.meanings[0])
    expect(exercise.options.map((o) => o.text)).toContain(word.meanings[0])
    expect(exercise.options).toHaveLength(4)
  })

  it('devuelve null para una palabra que no es de dos kanji', () => {
    const unKanji = wordCatalog.words.find((w) => w.kanjiIds.length === 1)!
    expect(buildJukugoExercise(unKanji, wordCatalog, kanjiCatalog)).toBeNull()
  })

  it('es determinista: la misma palabra genera siempre las mismas opciones', () => {
    const word = wordByLemma('がくせい')
    const first = buildJukugoExercise(word, wordCatalog, kanjiCatalog)
    const second = buildJukugoExercise(word, wordCatalog, kanjiCatalog)
    expect(second!.options.map((o) => o.text)).toEqual(first!.options.map((o) => o.text))
  })

  it('entra en el SRS con la categoria de vocabulario', () => {
    const exercise = buildJukugoExercise(wordByLemma('日本'), wordCatalog, kanjiCatalog)!
    expect(exercise.entersSrs).toBe(true)
    expect(exercise.srsCategory).toBe('CORE_VOCABULARY')
    expect(exercise.learningItemType).toBe('VOCABULARY')
  })

  it('el id se reconoce y se reconstruye igual que el original', () => {
    const built = buildJukugoExercise(wordByLemma('日本'), wordCatalog, kanjiCatalog)!
    expect(isJukugoExerciseId(built.id)).toBe(true)

    const rebuilt = jukugoExerciseFromId(built.id, wordCatalog, kanjiCatalog)
    expect(rebuilt).toEqual(built)
  })

  it('un id que no es de jukugo no se reconoce', () => {
    expect(isJukugoExerciseId('word-practice-x')).toBe(false)
    expect(jukugoExerciseFromId('word-practice-x', wordCatalog, kanjiCatalog)).toBeNull()
  })
})
