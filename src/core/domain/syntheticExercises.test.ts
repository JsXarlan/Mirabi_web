import { describe, expect, it } from 'vitest'

import { buildKanaExercise } from './kanaExercises'
import { buildKanjiExercise } from './kanjiExercises'
import { buildWordExercise } from './wordExercises'
import { isSyntheticExerciseId, syntheticExerciseFromId } from './syntheticExercises'
import { characterCatalog, kanjiCatalog, wordCatalog } from '../../test/content'

/**
 * El despachador es solo enrutamiento por prefijo; lo que hay que fijar es
 * que cada prefijo llegue al builder que le toca y que uno ajeno no encuentre
 * nada, en vez de reventar.
 */

const sources = { characters: characterCatalog, words: wordCatalog, kanji: kanjiCatalog }

describe('despachador de ejercicios sintéticos', () => {
  it('reconoce los tres prefijos', () => {
    const kana = buildKanaExercise(characterCatalog.characters[0], characterCatalog)
    const word = buildWordExercise(wordCatalog.words[0], wordCatalog)
    const kanji = buildKanjiExercise(kanjiCatalog.kanji[0], kanjiCatalog)

    for (const id of [kana.id, word.id, kanji.id]) {
      expect(isSyntheticExerciseId(id)).toBe(true)
    }
  })

  it('reconstruye cada uno con el catálogo que le corresponde', () => {
    const kana = buildKanaExercise(characterCatalog.characters[0], characterCatalog)
    const word = buildWordExercise(wordCatalog.words[0], wordCatalog)
    const kanji = buildKanjiExercise(kanjiCatalog.kanji[0], kanjiCatalog)

    expect(syntheticExerciseFromId(kana.id, sources)).toEqual(kana)
    expect(syntheticExerciseFromId(word.id, sources)).toEqual(word)
    expect(syntheticExerciseFromId(kanji.id, sources)).toEqual(kanji)
  })

  it('un id de curso normal no es sintético y no se reconstruye', () => {
    expect(isSyntheticExerciseId('ex_m0_u1_l1_01')).toBe(false)
    expect(syntheticExerciseFromId('ex_m0_u1_l1_01', sources)).toBeNull()
  })

  it('sin el catálogo que le toca, ese prefijo no se reconstruye aunque los otros dos estén', () => {
    const word = buildWordExercise(wordCatalog.words[0], wordCatalog)
    expect(syntheticExerciseFromId(word.id, { ...sources, words: null })).toBeNull()
  })
})
