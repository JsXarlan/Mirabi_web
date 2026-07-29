import type { DailyActivitySummary } from './models'

/** Puerto de feature/profile/domain. */

export interface LearningStats {
  totalAnswers: number
  correctAnswers: number
  wrongAnswers: number
  accuracyPercentage: number
  activeDays: number
}

export function calculateLearningStats(
  totalAnswers: number,
  correctAnswers: number,
  activeDays: number,
): LearningStats {
  return {
    totalAnswers,
    correctAnswers,
    wrongAnswers: totalAnswers - correctAnswers,
    accuracyPercentage: totalAnswers === 0 ? 0 : (correctAnswers * 100) / totalAnswers,
    activeDays,
  }
}

export type ProfileSignalType =
  | 'KEEP_GOING'
  | 'REVIEW_RECOMMENDED'
  | 'DAILY_GOAL_COMPLETED'
  | 'STREAK_AT_RISK'
  | 'STREAK_CONTINUED'
  | 'GREAT_ACCURACY'
  | 'NEEDS_PRACTICE'
  | 'ALL_CAUGHT_UP'
  | 'REST_RECOMMENDED'

export type ProfileSignalPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ProfileSignal {
  type: ProfileSignalType
  priority: ProfileSignalPriority
  message: string
}

export interface ProfileSignalContext {
  pendingReviewItems: number
  criticalWeaknesses: number
  dailyActivity: DailyActivitySummary
  learningStats: LearningStats
  streakActive: boolean
}

/** DefaultProfileSignalResolver, con los mismos umbrales y textos. */
export function resolveProfileSignals(context: ProfileSignalContext): ProfileSignal[] {
  const signals: ProfileSignal[] = []
  const push = (type: ProfileSignalType, priority: ProfileSignalPriority, message: string) =>
    signals.push({ type, priority, message })

  if (context.pendingReviewItems > 0 || context.criticalWeaknesses > 0) {
    push('REVIEW_RECOMMENDED', 'HIGH', 'Hay puntos listos para reforzar.')
  }
  if (context.dailyActivity.dailyGoalCompleted) {
    push('DAILY_GOAL_COMPLETED', 'MEDIUM', 'Objetivo diario completado.')
  }
  if (context.streakActive) {
    push('STREAK_CONTINUED', 'LOW', 'Tu constancia continúa.')
  }
  if (context.learningStats.totalAnswers > 0 && context.learningStats.accuracyPercentage >= 80) {
    push('GREAT_ACCURACY', 'MEDIUM', 'Gran precisión hoy.')
  } else if (
    context.learningStats.totalAnswers > 0 &&
    context.learningStats.accuracyPercentage < 50
  ) {
    push('NEEDS_PRACTICE', 'HIGH', 'Un poco de práctica ayudará.')
  }
  if (context.pendingReviewItems === 0 && context.criticalWeaknesses === 0) {
    push('ALL_CAUGHT_UP', 'LOW', 'Todo está al día.')
  }

  const activity =
    context.dailyActivity.lessonsCompletedToday +
    context.dailyActivity.reviewsCompletedToday +
    context.dailyActivity.conversationsCompletedToday
  if (activity >= 5) {
    push('REST_RECOMMENDED', 'LOW', 'Ya avanzaste bastante; descansar también ayuda.')
  }

  return signals
}
