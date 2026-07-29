import type { ContentExercise } from '../content/types'
import { ANSWERABLE_TYPES } from '../content/types'
import type { AnswerResult } from './models'

/**
 * DefaultAnswerValidator: comparacion exacta contra correctAnswer, sin normalizar
 * mas alla de los espacios. El contenido ya viene con la forma canonica de la
 * respuesta, asi que relajar la comparacion aqui solo escondería errores de autoria.
 */
export function validateAnswer(exercise: ContentExercise, answer: string): AnswerResult {
  if (!ANSWERABLE_TYPES.has(exercise.type)) {
    throw new Error(`La validación no está soportada para ${exercise.type}`)
  }
  if (exercise.correctAnswer === null) {
    throw new Error(`El ejercicio ${exercise.id} no tiene respuesta correcta`)
  }

  const isCorrect = answer.trim() === exercise.correctAnswer.trim()
  return {
    learningItemId: exercise.learningItemId,
    learningItemType: exercise.learningItemType,
    isCorrect,
    mistakeType: isCorrect ? null : exercise.mistakeType,
  }
}
