import type { YukiState } from './models'

/** Puerto de feature/yuki/domain. */

export type YukiReactionTrigger =
  | 'LESSON_COMPLETED'
  | 'PERFECT_LESSON'
  | 'REVIEW_COMPLETED'
  | 'CONVERSATION_COMPLETED'
  | 'DAILY_MISSION_COMPLETED'
  | 'STREAK_CONTINUED'
  | 'STREAK_LOST'
  | 'MANY_ERRORS'
  | 'LOW_ACCURACY'
  | 'HIGH_ACCURACY'
  | 'RETURNING_USER'
  | 'IDLE_USER'
  | 'ALL_CAUGHT_UP'

export type YukiMessageTone =
  | 'ENCOURAGING'
  | 'CELEBRATING'
  | 'COMFORTING'
  | 'NEUTRAL'
  | 'RESTING'

export interface YukiMessage {
  text: string
  tone: YukiMessageTone
}

export interface YukiReaction extends YukiMessage {
  state: YukiState
  trigger: YukiReactionTrigger
}

/** DefaultYukiStateResolver. */
export function resolveYukiState(trigger: YukiReactionTrigger): YukiState {
  switch (trigger) {
    case 'LESSON_COMPLETED':
    case 'CONVERSATION_COMPLETED':
    case 'STREAK_CONTINUED':
    case 'RETURNING_USER':
      return 'HAPPY'
    case 'PERFECT_LESSON':
    case 'REVIEW_COMPLETED':
    case 'DAILY_MISSION_COMPLETED':
    case 'HIGH_ACCURACY':
      return 'PROUD'
    case 'MANY_ERRORS':
    case 'LOW_ACCURACY':
      return 'THINKING'
    case 'STREAK_LOST':
      return 'SAD'
    case 'IDLE_USER':
    case 'ALL_CAUGHT_UP':
      return 'SLEEPING'
  }
}

/** DefaultYukiMessageProvider: textos exactos del proyecto Android. */
const MESSAGES: Record<YukiReactionTrigger, YukiMessage> = {
  PERFECT_LESSON: { text: '¡Excelente! Hoy avanzaste con mucha claridad.', tone: 'CELEBRATING' },
  STREAK_LOST: {
    text: 'Nuestra racha terminó, pero podemos empezar otra con calma.',
    tone: 'COMFORTING',
  },
  MANY_ERRORS: { text: 'Estos puntos nos muestran qué practicar después.', tone: 'ENCOURAGING' },
  LOW_ACCURACY: { text: 'Podemos reforzar esto paso a paso.', tone: 'ENCOURAGING' },
  IDLE_USER: {
    text: 'Yuki está descansando. Cuando vuelvas, seguimos juntos.',
    tone: 'RESTING',
  },
  ALL_CAUGHT_UP: { text: 'Todo está al día. Buen trabajo.', tone: 'RESTING' },
  LESSON_COMPLETED: { text: '¡Lección completada! Seguimos avanzando juntos.', tone: 'CELEBRATING' },
  REVIEW_COMPLETED: { text: 'Ese repaso hizo más fuerte lo aprendido.', tone: 'CELEBRATING' },
  CONVERSATION_COMPLETED: { text: '¡Usaste japonés en una conversación!', tone: 'CELEBRATING' },
  DAILY_MISSION_COMPLETED: { text: '¡Objetivo diario completado!', tone: 'CELEBRATING' },
  STREAK_CONTINUED: { text: 'Un día más de constancia. Buen trabajo.', tone: 'ENCOURAGING' },
  HIGH_ACCURACY: { text: 'Tu práctica de hoy fue muy clara.', tone: 'CELEBRATING' },
  RETURNING_USER: { text: 'Qué bueno verte. Continuemos a tu ritmo.', tone: 'ENCOURAGING' },
}

export function yukiReaction(trigger: YukiReactionTrigger): YukiReaction {
  return { ...MESSAGES[trigger], state: resolveYukiState(trigger), trigger }
}

export interface HomeYukiContext {
  /** Dias desde la ultima actividad; null si nunca ha habido ninguna. */
  daysSinceLastActivity: number | null
  streakLost: boolean
  streakDays: number
  pendingReviews: number
  lessonsCompleted: number
  dailyGoalCompleted: boolean
}

/**
 * Que dice Yuki al abrir la app.
 *
 * Sin esto Yuki solo aparecia al terminar algo: nunca reaccionaba a volver tras
 * tres dias ni a perder la racha, que son justo los momentos en los que una
 * compañera sirve para algo. La ausencia manda sobre el resto.
 */
export function resolveHomeTrigger(context: HomeYukiContext): YukiReactionTrigger {
  const days = context.daysSinceLastActivity

  if (context.lessonsCompleted === 0) return 'RETURNING_USER'
  if (days !== null && days >= 5) return 'IDLE_USER'
  if (context.streakLost) return 'STREAK_LOST'
  if (days !== null && days >= 1) return 'RETURNING_USER'

  if (context.dailyGoalCompleted) return 'DAILY_MISSION_COMPLETED'
  if (context.pendingReviews > 0) return 'MANY_ERRORS'
  if (context.streakDays > 1) return 'STREAK_CONTINUED'
  return 'ALL_CAUGHT_UP'
}

/** Cara de Yuki por estado. El sprite real llega con los assets de arte. */
export const YUKI_FACE: Record<YukiState, string> = {
  HAPPY: '🦊',
  PROUD: '✨',
  THINKING: '🤔',
  SAD: '💧',
  SLEEPING: '💤',
}
