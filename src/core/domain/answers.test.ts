import { describe, expect, it } from 'vitest'

import { validateAnswer } from './answers'
import { answerableSteps, lessonById } from '../../test/content'

/**
 * DefaultAnswerValidator: comparación exacta salvo espacios sobrantes.
 * Se prueba contra ejercicios reales de la primera lección, igual que el
 * resto de la suite.
 */

const FIRST_LESSON = 'lesson_m0_u1_l1_first_sounds'

describe('validateAnswer', () => {
  it('acepta la respuesta correcta exacta', () => {
    const exercise = answerableSteps(FIRST_LESSON)[0]

    const result = validateAnswer(exercise, exercise.correctAnswer!)

    expect(result.isCorrect).toBe(true)
    expect(result.mistakeType).toBeNull()
    expect(result.learningItemId).toBe(exercise.learningItemId)
    expect(result.learningItemType).toBe(exercise.learningItemType)
  })

  it('ignora espacios sobrantes alrededor de la respuesta', () => {
    const exercise = answerableSteps(FIRST_LESSON)[0]

    const result = validateAnswer(exercise, `  ${exercise.correctAnswer}  `)

    expect(result.isCorrect).toBe(true)
  })

  it('no relaja la comparación por dentro: mayúsculas o acentos distintos fallan', () => {
    const exercise = answerableSteps(FIRST_LESSON).find(
      (item) => /[a-z]/.test(item.correctAnswer ?? ''),
    )
    if (!exercise) return

    const result = validateAnswer(exercise, exercise.correctAnswer!.toUpperCase())

    expect(result.isCorrect).toBe(false)
  })

  it('devuelve el mistakeType del ejercicio cuando la respuesta falla', () => {
    const exercise = answerableSteps(FIRST_LESSON)[0]

    const result = validateAnswer(exercise, `${exercise.correctAnswer}-mal`)

    expect(result.isCorrect).toBe(false)
    expect(result.mistakeType).toBe(exercise.mistakeType)
  })

  it('lanza si el tipo de ejercicio no está soportado', () => {
    const presentation = lessonById(FIRST_LESSON).exercises.find(
      (exercise) => exercise.type === 'PRESENTATION',
    )
    if (!presentation) return

    expect(() => validateAnswer(presentation, 'cualquier cosa')).toThrow()
  })

  it('lanza si el ejercicio no tiene respuesta correcta', () => {
    const exercise = answerableSteps(FIRST_LESSON)[0]

    expect(() => validateAnswer({ ...exercise, correctAnswer: null }, 'algo')).toThrow()
  })
})
