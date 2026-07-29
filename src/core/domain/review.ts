import type { AnswerResult, MasteryScore, ReviewItem, ReviewPriority } from './models'
import { REVIEW_PRIORITY_ORDER } from './models'

/** Puerto de feature/review/domain. */

export interface ReviewSessionConfig {
  maxItems: number
  includeLowPriority: boolean
  includeCompleted: boolean
}

export const DEFAULT_REVIEW_CONFIG: ReviewSessionConfig = {
  maxItems: 12,
  includeLowPriority: true,
  includeCompleted: false,
}

/** DefaultReviewScheduler.decide */
export function shouldReviewNow(item: ReviewItem, config: ReviewSessionConfig): boolean {
  const priorityAllowed = config.includeLowPriority || item.priority !== 'LOW'
  switch (item.status) {
    case 'PENDING':
      return priorityAllowed
    case 'COMPLETED':
      return config.includeCompleted && priorityAllowed
    case 'SCHEDULED':
      return false
  }
}

/** Prioridad descendente y, a igualdad, el error mas antiguo primero. */
export function eligibleItems(
  items: ReviewItem[],
  config: ReviewSessionConfig = DEFAULT_REVIEW_CONFIG,
): ReviewItem[] {
  return items
    .filter((item) => shouldReviewNow(item, config))
    .sort((a, b) => {
      const byPriority =
        REVIEW_PRIORITY_ORDER.indexOf(b.priority) - REVIEW_PRIORITY_ORDER.indexOf(a.priority)
      return byPriority !== 0 ? byPriority : a.createdAtEpochMillis - b.createdAtEpochMillis
    })
}

export interface ReviewPlan {
  items: ReviewItem[]
  estimatedDurationMinutes: number
  prioritySummary: Record<ReviewPriority, number>
}

export function buildReviewPlan(
  items: ReviewItem[],
  config: ReviewSessionConfig = DEFAULT_REVIEW_CONFIG,
): ReviewPlan {
  const selected = eligibleItems(items, config).slice(0, config.maxItems)
  const prioritySummary: Record<ReviewPriority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  }
  for (const item of selected) prioritySummary[item.priority] += 1

  return {
    items: selected,
    // DefaultReviewSessionBuilder: ~3 items por minuto, redondeando hacia arriba.
    estimatedDurationMinutes: selected.length === 0 ? 0 : Math.floor((selected.length + 2) / 3),
    prioritySummary,
  }
}

/** DefaultReviewItemFactory.fromAnswer: solo los fallos generan ReviewItem. */
export function reviewItemFromAnswer(
  answer: AnswerResult,
  id: string,
  masteryBefore: MasteryScore,
  createdAtEpochMillis: number,
  sourceExerciseId: string | null,
): ReviewItem | null {
  if (answer.isCorrect) return null
  return {
    id,
    learningItemId: answer.learningItemId,
    learningItemType: answer.learningItemType,
    priority: 'MEDIUM',
    status: 'PENDING',
    masteryBefore,
    mistakeType: answer.mistakeType,
    createdAtEpochMillis,
    sourceExerciseId,
  }
}
