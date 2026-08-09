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

  it('los distractores salen del mismo radical (confundibles) o del mismo grado escolar', () => {
    // Por texto y no por objeto: dos kanji distintos pueden compartir
    // significado[0] (ocurre 109 veces en el jōyō), asi que reconstruir «que
    // kanji dio este distractor» seria ambiguo. Lo que importa fijar es que
    // el texto sea alcanzable desde alguno de los dos pools del generador.
    const grade = aKanji.grade ?? 8
    const reachableMeanings = new Set(
      kanjiCatalog.kanji
        .filter((item) => item.radical?.number === aKanji.radical?.number || (item.grade ?? 8) === grade)
        .map((item) => item.meanings[0]),
    )

    const exercise = buildKanjiExercise(aKanji, kanjiCatalog)
    const distractors = exercise.options
      .filter((option) => option.text !== exercise.correctAnswer)
      .map((option) => option.text)

    for (const text of distractors) {
      expect(reachableMeanings.has(text), `distractor inalcanzable: ${text}`).toBe(true)
    }
  })

  it('prefiere kanji con el mismo radical como distractores «confundibles» antes que uno al azar', () => {
    // El radical del arbol (木) tiene decenas de kanji en el jōyō: alcanza de
    // sobra para llenar los tres distractores sin caer al pool de respaldo.
    const arbol = kanjiCatalog.kanji.find((item) => item.symbol === '未')!
    expect(arbol.radical, 'el jōyō de prueba no trae 未 con radical').toBeDefined()

    const exercise = buildKanjiExercise(arbol, kanjiCatalog)
    const distractors = exercise.options.filter((option) => option.text !== exercise.correctAnswer)
    for (const distractor of distractors) {
      expect(distractor.distractorReason).toContain('radical')
    }
  })

  it('la posición de la respuesta correcta varía entre kanji, no siempre es la primera', () => {
    const positions = kanjiCatalog.kanji.slice(0, 20).map((kanji) => {
      const exercise = buildKanjiExercise(kanji, kanjiCatalog)
      return exercise.options.findIndex((option) => option.text === exercise.correctAnswer)
    })

    expect(new Set(positions).size).toBeGreaterThan(1)
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
