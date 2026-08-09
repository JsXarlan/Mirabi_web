import { describe, expect, it } from 'vitest'

import { buildKanaExercise, isKanaExerciseId, kanaExerciseFromId } from './kanaExercises'
import { characterCatalog } from '../../test/content'

/**
 * Ejercicios de kana sinteticos, contra el catálogo real. El repaso
 * reconstruye el ejercicio desde su id cuando vuelve, asi que lo que importa
 * fijar es que salga identico cada vez.
 */

const aCharacter = characterCatalog.characters[0]

describe('ejercicio de kana', () => {
  it('la respuesta correcta siempre esta entre las opciones', () => {
    for (const character of characterCatalog.characters) {
      const exercise = buildKanaExercise(character, characterCatalog)
      expect(exercise.options.map((option) => option.text)).toContain(exercise.correctAnswer)
      expect(exercise.correctAnswer).toBe(character.romaji)
    }
  })

  it('ningun distractor coincide con la respuesta correcta', () => {
    for (const character of characterCatalog.characters) {
      const exercise = buildKanaExercise(character, characterCatalog)
      const distractores = exercise.options
        .filter((option) => option.text !== exercise.correctAnswer)
        .map((option) => option.text)
      expect(distractores).not.toContain(exercise.correctAnswer)
    }
  })

  it('es determinista: el mismo carácter genera siempre las mismas opciones', () => {
    const first = buildKanaExercise(aCharacter, characterCatalog)
    const second = buildKanaExercise(aCharacter, characterCatalog)
    expect(second.options.map((option) => option.text)).toEqual(
      first.options.map((option) => option.text),
    )
  })

  it('prefiere caracteres de la misma fila como distractores «confundibles»', () => {
    // か tiene fila K completa (き,く,け,こ): alcanza para llenar los tres
    // distractores sin caer al pool general del silabario.
    const ka = characterCatalog.characters.find((item) => item.romaji === 'ka' && item.script === 'HIRAGANA')!
    const exercise = buildKanaExercise(ka, characterCatalog)
    const distractors = exercise.options.filter((option) => option.text !== exercise.correctAnswer)

    for (const distractor of distractors) {
      expect(distractor.distractorReason).toContain('fila')
    }
  })

  it('la posición de la respuesta correcta varía entre caracteres, no siempre es la primera', () => {
    const positions = characterCatalog.characters
      .slice(0, 20)
      .map((character) => {
        const exercise = buildKanaExercise(character, characterCatalog)
        return exercise.options.findIndex((option) => option.text === exercise.correctAnswer)
      })

    expect(new Set(positions).size).toBeGreaterThan(1)
  })

  it('entra en el SRS con la categoria de kana', () => {
    const exercise = buildKanaExercise(aCharacter, characterCatalog)
    expect(exercise.entersSrs).toBe(true)
    expect(exercise.srsCategory).toBe('KANA')
    expect(exercise.learningItemId).toBe(aCharacter.learningItemId)
    expect(exercise.learningItemType).toBe('KANA')
  })

  it('el id se reconoce y se reconstruye igual que el original', () => {
    const built = buildKanaExercise(aCharacter, characterCatalog)
    expect(isKanaExerciseId(built.id)).toBe(true)

    const rebuilt = kanaExerciseFromId(built.id, characterCatalog)
    expect(rebuilt).toEqual(built)
  })

  it('un id que no es de kana no se reconoce', () => {
    expect(isKanaExerciseId('word-practice-x')).toBe(false)
    expect(kanaExerciseFromId('word-practice-x', characterCatalog)).toBeNull()
  })

  it('sin catálogo no hay reconstrucción posible', () => {
    const built = buildKanaExercise(aCharacter, characterCatalog)
    expect(kanaExerciseFromId(built.id, null)).toBeNull()
  })
})
