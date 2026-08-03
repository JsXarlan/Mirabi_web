/**
 * Motivo por el que se aprende.
 *
 * El onboarding lo pregunta y prometia "nos ayuda a acompañarte mejor", pero
 * nadie leia la respuesta. No cambia el curso —el contenido es el mismo para
 * todo el mundo— y si el motivo por el que Yuki te habla: la meta que se
 * recuerda cuando cuesta seguir.
 */

export type LearningMotivation =
  | 'ANIME_CULTURE'
  | 'TRAVEL'
  | 'STUDIES'
  | 'WORK'
  | 'PERSONAL_CHALLENGE'
  | 'CURIOSITY'

export interface MotivationCopy {
  /** Como se nombra la meta en la interfaz. */
  goal: string
  /** Lo que Yuki recuerda al empezar el dia. */
  encouragement: string
  icon: string
}

const COPY: Record<LearningMotivation, MotivationCopy> = {
  ANIME_CULTURE: {
    goal: 'entender el anime sin subtítulos',
    encouragement: 'Cada palabra que aprendes es una frase menos que leer en subtítulos.',
    icon: '🎌',
  },
  TRAVEL: {
    goal: 'moverte por Japón',
    encouragement: 'Lo de hoy es lo que dirás en una estación o en un restaurante.',
    icon: '✈️',
  },
  STUDIES: {
    goal: 'tus estudios',
    encouragement: 'Poco y todos los días vale más que una tarde entera cada quince.',
    icon: '📚',
  },
  WORK: {
    goal: 'usar japonés en el trabajo',
    encouragement: 'La cortesía que practicas hoy es la que se espera en una reunión.',
    icon: '💼',
  },
  PERSONAL_CHALLENGE: {
    goal: 'tu reto personal',
    encouragement: 'Te lo propusiste tú. Hoy toca un paso más.',
    icon: '🔥',
  },
  CURIOSITY: {
    goal: 'curiosidad',
    encouragement: 'Sin prisa y sin meta: aprender por gusto también cuenta.',
    icon: '🌱',
  },
}

export function motivationCopy(motivation: LearningMotivation | null): MotivationCopy {
  return COPY[motivation ?? 'CURIOSITY']
}
