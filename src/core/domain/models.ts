import type { LearningItemType, MistakeType, SrsCategory } from '../content/types'

/** Espejo de core/model del proyecto Android. */

export const XP_PER_LEVEL = 100

export type MasteryScore = 'UNKNOWN' | 'FAMILIAR' | 'LEARNING' | 'MASTERED' | 'EXPERT'

export const MASTERY_VALUE: Record<MasteryScore, number> = {
  UNKNOWN: 0,
  FAMILIAR: 25,
  LEARNING: 50,
  MASTERED: 75,
  EXPERT: 100,
}

const MASTERY_LADDER: MasteryScore[] = [
  'UNKNOWN',
  'FAMILIAR',
  'LEARNING',
  'MASTERED',
  'EXPERT',
]

/**
 * El dominio sube un escalon por acierto y baja uno por fallo.
 * Se mantiene monotono a proposito: un solo error no borra el progreso.
 */
export function nextMastery(current: MasteryScore, isCorrect: boolean): MasteryScore {
  const index = MASTERY_LADDER.indexOf(current)
  const target = isCorrect ? index + 1 : index - 1
  return MASTERY_LADDER[Math.min(MASTERY_LADDER.length - 1, Math.max(0, target))]
}

export type ReviewPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ReviewStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED'

export const REVIEW_PRIORITY_ORDER: ReviewPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export interface ReviewItem {
  id: string
  learningItemId: string
  learningItemType: LearningItemType
  /** Familia de contenido: decide la tabla de intervalos del SRS. */
  srsCategory: SrsCategory
  priority: ReviewPriority
  status: ReviewStatus
  masteryBefore: MasteryScore
  mistakeType: MistakeType | null
  /** Tipificacion editorial del fallo (PARTICLE_WA_HA, AUDIO_SU_TSU...). */
  errorType: string | null
  /** Caja Leitner: 0 es "recien fallado", la ultima gradua el item. */
  box: number
  reviewCount: number
  lapses: number
  createdAtEpochMillis: number
  /** Momento a partir del cual el item vuelve a entrar en una sesion. */
  nextReviewAtEpochMillis: number
  /** Ejercicio que origino el item; permite reconstruir la pregunta en el repaso. */
  sourceExerciseId: string | null
}

export interface LearningProgress {
  learningItemId: string
  learningItemType: LearningItemType
  mastery: MasteryScore
  correctAnswers: number
  wrongAnswers: number
  lastAnsweredAtEpochMillis: number | null
  updatedAtEpochMillis: number
}

export type YukiState = 'HAPPY' | 'PROUD' | 'THINKING' | 'SAD' | 'SLEEPING'

export type SubscriptionType = 'FREE' | 'PLUS'

export type MissionType = 'DAILY' | 'WEEKLY'

export type MissionTargetType =
  | 'COMPLETE_LESSON'
  | 'COMPLETE_REVIEW'
  | 'COMPLETE_CONVERSATION'
  | 'EARN_XP'
  | 'PRACTICE_CHARACTERS'

export interface MissionDefinition {
  id: string
  title: string
  description: string
  type: MissionType
  targetType: MissionTargetType
  targetValue: number
  rewardXp: number
  rewardSakura: number
}

export interface MissionProgress {
  missionId: string
  epochDay: number
  currentProgress: number
  completed: boolean
  rewardClaimed: boolean
  completedAtEpochMillis: number | null
}

export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export interface LessonProgress {
  lessonId: string
  status: LessonProgressStatus
  bestAccuracyPercentage: number
  attempts: number
  completedAtEpochMillis: number | null
}

export interface DailyActivitySummary {
  lessonsCompletedToday: number
  reviewsCompletedToday: number
  conversationsCompletedToday: number
  xpEarnedToday: number
  sakuraEarnedToday: number
  dailyGoalCompleted: boolean
}

export interface AnswerResult {
  learningItemId: string
  learningItemType: LearningItemType
  isCorrect: boolean
  mistakeType: MistakeType | null
}

/** Dia epoch en hora local: es la unidad con la que se cuenta racha y misiones. */
export function epochDayOf(timestampMillis: number): number {
  const date = new Date(timestampMillis)
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(localMidnight.getTime() / 86_400_000)
}

export function levelFromXp(totalXp: number): number {
  return Math.max(1, Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1)
}

export function xpIntoLevel(totalXp: number): number {
  return totalXp >= 0 ? totalXp % XP_PER_LEVEL : 0
}
