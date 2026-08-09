import { describe, expect, it } from 'vitest'

import { buildWordExercise, isWordExerciseId, wordExerciseFromId } from './wordExercises'
import { wordCatalog } from '../../test/content'

/**
 * Ejercicios de palabras sinteticos, contra el catalogo real. El repaso
 * reconstruye el ejercicio desde su id cuando vuelve, asi que lo que importa
 * fijar es que salga identico cada vez.
 */

const aWord = wordCatalog.words[0]

describe('ejercicio de palabra', () => {
  it('la respuesta correcta siempre esta entre las opciones', () => {
    for (const word of wordCatalog.words) {
      const exercise = buildWordExercise(word, wordCatalog)
      expect(exercise.options.map((option) => option.text)).toContain(exercise.correctAnswer)
      expect(exercise.correctAnswer).toBe(word.meanings[0])
    }
  })

  it('ningun distractor coincide con la respuesta correcta', () => {
    for (const word of wordCatalog.words) {
      const exercise = buildWordExercise(word, wordCatalog)
      const distractores = exercise.options
        .filter((option) => option.text !== exercise.correctAnswer)
        .map((option) => option.text)
      expect(distractores).not.toContain(exercise.correctAnswer)
    }
  })

  it('es determinista: la misma palabra genera siempre las mismas opciones', () => {
    const first = buildWordExercise(aWord, wordCatalog)
    const second = buildWordExercise(aWord, wordCatalog)
    expect(second.options.map((option) => option.text)).toEqual(
      first.options.map((option) => option.text),
    )
  })

  it('entra en el SRS con la categoria de vocabulario', () => {
    const exercise = buildWordExercise(aWord, wordCatalog)
    expect(exercise.entersSrs).toBe(true)
    expect(exercise.srsCategory).toBe('CORE_VOCABULARY')
    expect(exercise.learningItemId).toBe(aWord.learningItemId)
    expect(exercise.learningItemType).toBe('VOCABULARY')
  })

  it('cuatro opciones cuando el apartado tiene con qué confundirse', () => {
    // El catálogo real tiene de sobra en ambos scripts para completar el pool.
    const exercise = buildWordExercise(aWord, wordCatalog)
    expect(exercise.options).toHaveLength(4)
  })

  it('la posición de la respuesta correcta varía entre palabras, no siempre es la primera', () => {
    const positions = wordCatalog.words.slice(0, 20).map((word) => {
      const exercise = buildWordExercise(word, wordCatalog)
      return exercise.options.findIndex((option) => option.text === exercise.correctAnswer)
    })

    expect(new Set(positions).size).toBeGreaterThan(1)
  })

  it('prefiere una palabra que comparte kanji o etiqueta como distractor «confundible»', () => {
    const withKanji = wordCatalog.words.find((word) => word.kanjiIds.length > 0)
    if (!withKanji) return // el catálogo de prueba puede no traer kanji enlazados

    const sameKanji = wordCatalog.words.some(
      (other) =>
        other.id !== withKanji.id &&
        other.meanings[0] !== withKanji.meanings[0] &&
        other.kanjiIds.some((id) => withKanji.kanjiIds.includes(id)),
    )
    if (!sameKanji) return // sin otra palabra que comparta kanji, no hay nada que preferir

    const exercise = buildWordExercise(withKanji, wordCatalog)
    const reasons = exercise.options
      .filter((option) => option.text !== exercise.correctAnswer)
      .map((option) => option.distractorReason)
    expect(reasons.some((reason) => reason?.includes('kanji') || reason?.includes('tema'))).toBe(true)
  })

  it('el id se reconoce y se reconstruye igual que el original', () => {
    const built = buildWordExercise(aWord, wordCatalog)
    expect(isWordExerciseId(built.id)).toBe(true)

    const rebuilt = wordExerciseFromId(built.id, wordCatalog)
    expect(rebuilt).toEqual(built)
  })

  it('un id que no es de palabra no se reconoce', () => {
    expect(isWordExerciseId('kana-practice-x')).toBe(false)
    expect(wordExerciseFromId('kana-practice-x', wordCatalog)).toBeNull()
  })

  it('sin catálogo no hay reconstrucción posible', () => {
    const built = buildWordExercise(aWord, wordCatalog)
    expect(wordExerciseFromId(built.id, null)).toBeNull()
  })
})
