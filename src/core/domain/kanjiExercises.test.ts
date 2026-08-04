import { describe, expect, it } from 'vitest'

import { buildKanjiExercise, isKanjiExerciseId, kanjiExerciseFromId } from './kanjiExercises'
import { kanjiCatalog } from '../../test/content'

/**
 * Ejercicios de kanji sinteticos, contra el catalogo real (jōyō completo:
 * grados con duplicados de significado de sobra para probar que el pool
 * excluye sinonimos, no solo el propio kanji).
 */

const aKanji = kanjiCatalog.kanji[0]

describe('ejercicio de kanji', () => {
  it('pregunta el significado, nunca la lectura', () => {
    for (const kanji of kanjiCatalog.kanji.slice(0, 30)) {
      const exercise = buildKanjiExercise(kanji, kanjiCatalog)
      expect(exercise.prompt).toContain(kanji.symbol)
      expect(exercise.correctAnswer).toBe(kanji.meanings[0])
      expect(exercise.options.map((option) => option.text)).toContain(exercise.correctAnswer)
    }
  })

  it('ningun distractor coincide con la respuesta, ni siquiera un sinónimo', () => {
    // 事 y 物 son sinonimos ("cosa") en el mismo grado: el caso real que
    // rompería un pool que solo excluyera por id.
    const cosa = kanjiCatalog.kanji.find((item) => item.symbol === '事')!
    const exercise = buildKanjiExercise(cosa, kanjiCatalog)
    const distractores = exercise.options
      .filter((option) => option.text !== exercise.correctAnswer)
      .map((option) => option.text)

    expect(distractores).not.toContain(exercise.correctAnswer)
    expect(distractores).not.toContain('cosa')
  })

  it('los distractores salen del mismo grado escolar', () => {
    // Por texto y no por objeto: dos kanji de grados distintos pueden
    // compartir significado[0] (ocurre 109 veces en el jōyō), asi que
    // reconstruir «que kanji dio este distractor» seria ambiguo. Lo que
    // importa fijar es que el texto sea alcanzable desde el grado correcto,
    // que es justo lo que declara el pool del generador.
    const grade = aKanji.grade ?? 8
    const sameGradeMeanings = new Set(
      kanjiCatalog.kanji
        .filter((item) => (item.grade ?? 8) === grade)
        .map((item) => item.meanings[0]),
    )

    const exercise = buildKanjiExercise(aKanji, kanjiCatalog)
    const distractors = exercise.options
      .filter((option) => option.text !== exercise.correctAnswer)
      .map((option) => option.text)

    for (const text of distractors) {
      expect(sameGradeMeanings.has(text), `distractor ajeno al grado ${grade}: ${text}`).toBe(true)
    }
  })

  it('es determinista: el mismo kanji genera siempre las mismas opciones', () => {
    const first = buildKanjiExercise(aKanji, kanjiCatalog)
    const second = buildKanjiExercise(aKanji, kanjiCatalog)
    expect(second.options.map((option) => option.text)).toEqual(
      first.options.map((option) => option.text),
    )
  })

  it('entra en el SRS con la categoria de vocabulario', () => {
    const exercise = buildKanjiExercise(aKanji, kanjiCatalog)
    expect(exercise.entersSrs).toBe(true)
    expect(exercise.srsCategory).toBe('CORE_VOCABULARY')
    expect(exercise.learningItemId).toBe(aKanji.learningItemId)
    expect(exercise.learningItemType).toBe('KANJI')
  })

  it('el id se reconoce y se reconstruye igual que el original', () => {
    const built = buildKanjiExercise(aKanji, kanjiCatalog)
    expect(isKanjiExerciseId(built.id)).toBe(true)

    const rebuilt = kanjiExerciseFromId(built.id, kanjiCatalog)
    expect(rebuilt).toEqual(built)
  })

  it('un id que no es de kanji no se reconoce', () => {
    expect(isKanjiExerciseId('word-practice-x')).toBe(false)
    expect(kanjiExerciseFromId('word-practice-x', kanjiCatalog)).toBeNull()
  })
})
