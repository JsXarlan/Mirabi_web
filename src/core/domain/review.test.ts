import { describe, expect, it } from 'vitest'

import {
  SRS_INTERVALS_DAYS,
  buildReviewPlan,
  createReviewItem,
  forecastReviews,
  intervalsFor,
  isDue,
  isGraduated,
  priorityForBox,
  scheduleAfterAnswer,
  shouldReviewNow,
} from './review'
import type { ReviewItem } from './models'
import { answerableSteps } from '../../test/content'

/**
 * Cajas Leitner con fecha: acertar aleja, fallar devuelve a la caja 0, la
 * última caja gradúa. Los intervalos vienen de SRS_INTERVALS_DAYS por
 * familia de contenido (kana se olvida rápido, gramática aguanta más).
 */

const DAY = 86_400_000
const NOW = Date.parse('2026-01-15T09:00:00Z')

function baseItem(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: 'item-1',
    learningItemId: 'kana_a',
    learningItemType: 'KANA',
    srsCategory: 'KANA',
    priority: 'MEDIUM',
    status: 'SCHEDULED',
    masteryBefore: 'LEARNING',
    mistakeType: null,
    errorType: null,
    box: 1,
    reviewCount: 1,
    lapses: 0,
    createdAtEpochMillis: NOW - DAY,
    nextReviewAtEpochMillis: NOW - 1,
    sourceExerciseId: 'ex-1',
    ...overrides,
  }
}

describe('scheduleAfterAnswer', () => {
  it('acertar sube una caja y reprograma según el intervalo de esa caja', () => {
    const item = baseItem({ box: 1 })

    const next = scheduleAfterAnswer(item, true, NOW)

    expect(next.box).toBe(2)
    expect(next.status).toBe('SCHEDULED')
    expect(next.lapses).toBe(0)
    expect(next.nextReviewAtEpochMillis).toBe(NOW + SRS_INTERVALS_DAYS.KANA[2] * DAY)
  })

  it('fallar devuelve a la caja 0 en vez de duplicar el item', () => {
    const item = baseItem({ box: 3, lapses: 1 })

    const next = scheduleAfterAnswer(item, false, NOW)

    expect(next.box).toBe(0)
    expect(next.status).toBe('PENDING')
    expect(next.lapses).toBe(2)
    expect(next.nextReviewAtEpochMillis).toBe(NOW + SRS_INTERVALS_DAYS.KANA[0] * DAY)
  })

  it('gradúa al superar la última caja y deja de reprogramar la fecha', () => {
    const lastBox = SRS_INTERVALS_DAYS.KANA.length - 1
    const item = baseItem({ box: lastBox, nextReviewAtEpochMillis: NOW - 5 * DAY })

    const next = scheduleAfterAnswer(item, true, NOW)

    expect(next.box).toBe(lastBox + 1)
    expect(next.status).toBe('COMPLETED')
    expect(next.nextReviewAtEpochMillis).toBe(item.nextReviewAtEpochMillis)
    expect(isGraduated(next)).toBe(true)
  })
})

describe('createReviewItem', () => {
  it('entra en la caja 1 cuando la respuesta es correcta', () => {
    const exercise = answerableSteps('lesson_m0_u1_l1_first_sounds')[0]
    const item = createReviewItem(
      { learningItemId: exercise.learningItemId, learningItemType: exercise.learningItemType, isCorrect: true, mistakeType: null },
      exercise,
      'item-x',
      'UNKNOWN',
      NOW,
    )

    expect(item.box).toBe(1)
    expect(item.status).toBe('SCHEDULED')
    expect(item.lapses).toBe(0)
  })

  it('entra en la caja 0 cuando la respuesta falla', () => {
    const exercise = answerableSteps('lesson_m0_u1_l1_first_sounds')[0]
    const item = createReviewItem(
      { learningItemId: exercise.learningItemId, learningItemType: exercise.learningItemType, isCorrect: false, mistakeType: exercise.mistakeType },
      exercise,
      'item-x',
      'UNKNOWN',
      NOW,
    )

    expect(item.box).toBe(0)
    expect(item.status).toBe('PENDING')
    expect(item.lapses).toBe(1)
  })
})

describe('priorityForBox', () => {
  it('tres o más fallos es siempre crítico, sin importar la caja', () => {
    expect(priorityForBox(3, 3)).toBe('CRITICAL')
    expect(priorityForBox(0, 3)).toBe('CRITICAL')
  })

  it('caja 0 con algún fallo es alta, sin fallos es media', () => {
    expect(priorityForBox(0, 1)).toBe('HIGH')
    expect(priorityForBox(0, 0)).toBe('MEDIUM')
  })

  it('caja 1 es media y de ahí en adelante es baja', () => {
    expect(priorityForBox(1, 0)).toBe('MEDIUM')
    expect(priorityForBox(2, 0)).toBe('LOW')
  })
})

describe('isDue / shouldReviewNow', () => {
  it('un item completado nunca está vencido ni entra en sesión', () => {
    const item = baseItem({ status: 'COMPLETED', nextReviewAtEpochMillis: NOW - DAY })

    expect(isDue(item, NOW)).toBe(false)
    expect(shouldReviewNow(item, { maxItems: 12, includeLowPriority: true, includeNotDue: false }, NOW)).toBe(false)
  })

  it('excluye prioridad baja cuando includeLowPriority es falso', () => {
    const item = baseItem({ priority: 'LOW', nextReviewAtEpochMillis: NOW - DAY })

    expect(
      shouldReviewNow(item, { maxItems: 12, includeLowPriority: false, includeNotDue: false }, NOW),
    ).toBe(false)
  })

  it('includeNotDue adelanta items que todavía no vencen', () => {
    const item = baseItem({ nextReviewAtEpochMillis: NOW + DAY })

    expect(isDue(item, NOW)).toBe(false)
    expect(
      shouldReviewNow(item, { maxItems: 12, includeLowPriority: true, includeNotDue: true }, NOW),
    ).toBe(true)
  })
})

describe('buildReviewPlan', () => {
  it('ordena por prioridad descendente y respeta maxItems', () => {
    const items = [
      baseItem({ id: 'low', priority: 'LOW', nextReviewAtEpochMillis: NOW - 1 }),
      baseItem({ id: 'critical', priority: 'CRITICAL', nextReviewAtEpochMillis: NOW - 1 }),
      baseItem({ id: 'high', priority: 'HIGH', nextReviewAtEpochMillis: NOW - 1 }),
    ]

    const plan = buildReviewPlan(items, { maxItems: 2, includeLowPriority: true, includeNotDue: false }, NOW)

    expect(plan.items.map((item) => item.id)).toEqual(['critical', 'high'])
    expect(plan.prioritySummary.CRITICAL).toBe(1)
    expect(plan.prioritySummary.HIGH).toBe(1)
    expect(plan.prioritySummary.LOW).toBe(0)
  })

  it('a igualdad de prioridad, ordena por lo más atrasado primero', () => {
    const items = [
      baseItem({ id: 'recent', priority: 'MEDIUM', nextReviewAtEpochMillis: NOW - 1 }),
      baseItem({ id: 'stale', priority: 'MEDIUM', nextReviewAtEpochMillis: NOW - 5 * DAY }),
    ]

    const plan = buildReviewPlan(items, { maxItems: 12, includeLowPriority: true, includeNotDue: false }, NOW)

    expect(plan.items.map((item) => item.id)).toEqual(['stale', 'recent'])
  })
})

describe('forecastReviews', () => {
  it('cuenta lo vencido, lo de mañana y lo de la semana por separado', () => {
    const items = [
      baseItem({ id: 'due-now', status: 'SCHEDULED', nextReviewAtEpochMillis: NOW - DAY }),
      baseItem({ id: 'tomorrow', status: 'SCHEDULED', nextReviewAtEpochMillis: NOW + 12 * 3_600_000 }),
      baseItem({ id: 'this-week', status: 'SCHEDULED', nextReviewAtEpochMillis: NOW + 5 * DAY }),
      baseItem({ id: 'graduated', status: 'COMPLETED', nextReviewAtEpochMillis: NOW - 10 * DAY }),
    ]

    const forecast = forecastReviews(items, NOW)

    expect(forecast.dueNow).toBe(1)
    expect(forecast.dueTomorrow).toBe(1)
    expect(forecast.dueThisWeek).toBe(2)
    expect(forecast.tracked).toBe(3)
    expect(forecast.graduated).toBe(1)
  })
})

describe('intervalsFor', () => {
  it('cae a NONE para una categoría desconocida', () => {
    expect(intervalsFor('UNKNOWN' as never)).toEqual(SRS_INTERVALS_DAYS.NONE)
  })
})
