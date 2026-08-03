import type { ContentExercise, SrsCategory } from '../content/types'
import type { AnswerResult, MasteryScore, ReviewItem, ReviewPriority } from './models'
import { REVIEW_PRIORITY_ORDER } from './models'

/**
 * Puerto de feature/review/domain, extendido con repeticion espaciada.
 *
 * El MVP guardaba solo los fallos y los devolvia todos juntos. Aqui cada item
 * lleva una caja Leitner y una fecha: acertar lo aleja en el tiempo, fallar lo
 * devuelve al presente. Un item que supera la ultima caja se gradua y sale de
 * la cola, que es lo que permite que "dominado" signifique algo.
 */

const DAY_MILLIS = 86_400_000

/**
 * Intervalos en dias por caja y familia de contenido. El kana se consolida
 * rapido y se olvida rapido; la gramatica aguanta mas entre repasos.
 * El primer valor es 0: un fallo vuelve dentro de la misma sesion del dia.
 */
export const SRS_INTERVALS_DAYS: Record<SrsCategory, number[]> = {
  KANA: [0, 1, 2, 4, 9, 20],
  CORE_VOCABULARY: [0, 1, 3, 7, 16, 35],
  FUNCTIONAL: [0, 2, 5, 12, 26, 55],
  GRAMMAR: [0, 1, 3, 8, 21, 45],
  READING_SEED_LIGHT: [0, 2, 6, 15, 35],
  NONE: [0, 1, 3, 7, 15],
}

export function intervalsFor(category: SrsCategory): number[] {
  return SRS_INTERVALS_DAYS[category] ?? SRS_INTERVALS_DAYS.NONE
}

/** La ultima caja gradua: mas alla de ella el item ya no vuelve. */
export function isGraduated(item: ReviewItem): boolean {
  return item.box >= intervalsFor(item.srsCategory).length
}

/** Cuanto peso tiene el item en la cola: los reincidentes suben. */
export function priorityForBox(box: number, lapses: number): ReviewPriority {
  if (lapses >= 3) return 'CRITICAL'
  if (box === 0) return lapses >= 1 ? 'HIGH' : 'MEDIUM'
  if (box === 1) return 'MEDIUM'
  return 'LOW'
}

export interface ReviewSessionConfig {
  maxItems: number
  includeLowPriority: boolean
  /** Adelanta items que aun no vencen, para poder repasar por gusto. */
  includeNotDue: boolean
}

export const DEFAULT_REVIEW_CONFIG: ReviewSessionConfig = {
  maxItems: 12,
  includeLowPriority: true,
  includeNotDue: false,
}

export function isDue(item: ReviewItem, now: number): boolean {
  if (item.status === 'COMPLETED') return false
  return now >= item.nextReviewAtEpochMillis
}

/** DefaultReviewScheduler.decide, ahora con fecha. */
export function shouldReviewNow(
  item: ReviewItem,
  config: ReviewSessionConfig,
  now: number,
): boolean {
  if (item.status === 'COMPLETED') return false
  if (!config.includeLowPriority && item.priority === 'LOW') return false
  return config.includeNotDue || isDue(item, now)
}

/** Prioridad descendente y, a igualdad, lo mas atrasado primero. */
export function eligibleItems(
  items: ReviewItem[],
  config: ReviewSessionConfig = DEFAULT_REVIEW_CONFIG,
  now: number = Date.now(),
): ReviewItem[] {
  return items
    .filter((item) => shouldReviewNow(item, config, now))
    .sort((a, b) => {
      const byPriority =
        REVIEW_PRIORITY_ORDER.indexOf(b.priority) - REVIEW_PRIORITY_ORDER.indexOf(a.priority)
      if (byPriority !== 0) return byPriority
      return a.nextReviewAtEpochMillis - b.nextReviewAtEpochMillis
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
  now: number = Date.now(),
): ReviewPlan {
  const selected = eligibleItems(items, config, now).slice(0, config.maxItems)
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

/**
 * Crea el item de seguimiento de un elemento.
 *
 * A diferencia del MVP, acertar tambien siembra: los ejercicios marcados
 * `entersSrs` entran en la caja 1 aunque la respuesta fuera correcta, que es
 * justo lo que el contenido declara al marcarlos.
 */
export function createReviewItem(
  answer: AnswerResult,
  exercise: ContentExercise,
  id: string,
  masteryBefore: MasteryScore,
  now: number,
): ReviewItem {
  const box = answer.isCorrect ? 1 : 0
  const intervals = intervalsFor(exercise.srsCategory)
  return {
    id,
    learningItemId: answer.learningItemId,
    learningItemType: answer.learningItemType,
    srsCategory: exercise.srsCategory,
    priority: priorityForBox(box, answer.isCorrect ? 0 : 1),
    status: box === 0 ? 'PENDING' : 'SCHEDULED',
    masteryBefore,
    mistakeType: answer.mistakeType,
    errorType: exercise.errorType && exercise.errorType !== 'NONE' ? exercise.errorType : null,
    box,
    reviewCount: 0,
    lapses: answer.isCorrect ? 0 : 1,
    createdAtEpochMillis: now,
    nextReviewAtEpochMillis: now + (intervals[box] ?? 0) * DAY_MILLIS,
    sourceExerciseId: exercise.id,
  }
}

/**
 * Reprograma un item tras responderlo. Acertar sube una caja; fallar devuelve
 * a la caja 0 en lugar de duplicar el item, para que la cola no crezca sola.
 */
export function scheduleAfterAnswer(
  item: ReviewItem,
  isCorrect: boolean,
  now: number,
): ReviewItem {
  const intervals = intervalsFor(item.srsCategory)
  const box = isCorrect ? item.box + 1 : 0
  const lapses = isCorrect ? item.lapses : item.lapses + 1
  const graduated = box >= intervals.length

  return {
    ...item,
    box,
    lapses,
    reviewCount: item.reviewCount + 1,
    status: graduated ? 'COMPLETED' : box === 0 ? 'PENDING' : 'SCHEDULED',
    priority: priorityForBox(box, lapses),
    nextReviewAtEpochMillis: graduated
      ? item.nextReviewAtEpochMillis
      : now + (intervals[box] ?? 0) * DAY_MILLIS,
  }
}

/** Cuantos items vencen y cuando: alimenta la pantalla de repaso. */
export interface ReviewForecast {
  dueNow: number
  dueTomorrow: number
  dueThisWeek: number
  tracked: number
  graduated: number
  nextDueAtEpochMillis: number | null
}

export function forecastReviews(items: ReviewItem[], now: number = Date.now()): ReviewForecast {
  const active = items.filter((item) => item.status !== 'COMPLETED')
  const tomorrow = now + DAY_MILLIS
  const week = now + 7 * DAY_MILLIS
  const upcoming = active
    .filter((item) => !isDue(item, now))
    .map((item) => item.nextReviewAtEpochMillis)
    .sort((a, b) => a - b)

  const between = (limit: number) =>
    active.filter(
      (item) => item.nextReviewAtEpochMillis > now && item.nextReviewAtEpochMillis <= limit,
    ).length

  return {
    dueNow: active.filter((item) => isDue(item, now)).length,
    dueTomorrow: between(tomorrow),
    dueThisWeek: between(week),
    tracked: active.length,
    graduated: items.length - active.length,
    nextDueAtEpochMillis: upcoming[0] ?? null,
  }
}
