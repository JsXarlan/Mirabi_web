import { describe, expect, it } from 'vitest'

import { emptyWordProgress, isWordDue, reviewWordCard, selectDueWordSession } from './wordProgress'
import type { WordCardProgress } from './wordProgress'

const DAY_MS = 24 * 60 * 60 * 1000
const T0 = 1_700_000_000_000

describe('reviewWordCard', () => {
  it('NEW pasa a LEARNING con el primer acierto', () => {
    const next = reviewWordCard(emptyWordProgress('w1'), 'good', T0)
    expect(next.state).toBe('LEARNING')
    expect(next.reviewCount).toBe(1)
    expect(next.lastReviewedAtEpochMillis).toBe(T0)
  })

  it('LEARNING se queda en LEARNING si el segundo acierto es el mismo dia', () => {
    const learning = reviewWordCard(emptyWordProgress('w1'), 'good', T0)
    const sameDay = reviewWordCard(learning, 'good', T0 + 1000)
    expect(sameDay.state).toBe('LEARNING')
  })

  it('LEARNING pasa a MASTERED con un acierto al menos un dia despues del anterior', () => {
    const learning = reviewWordCard(emptyWordProgress('w1'), 'good', T0)
    const nextDay = reviewWordCard(learning, 'good', T0 + DAY_MS)
    expect(nextDay.state).toBe('MASTERED')
    expect(nextDay.nextReviewAtEpochMillis).toBeGreaterThan(nextDay.lastReviewedAtEpochMillis as number)
  })

  it('un fallo siempre vuelve a LEARNING, incluso desde MASTERED', () => {
    const mastered = { ...emptyWordProgress('w1'), state: 'MASTERED' as const, reviewCount: 3 }
    const failed = reviewWordCard(mastered, 'again', T0)
    expect(failed.state).toBe('LEARNING')
    expect(failed.nextReviewAtEpochMillis).toBe(T0)
  })

  it('un fallo en NEW tambien pasa a LEARNING, no se queda en NEW', () => {
    const failed = reviewWordCard(emptyWordProgress('w1'), 'again', T0)
    expect(failed.state).toBe('LEARNING')
  })
})

describe('isWordDue', () => {
  it('sin progreso, siempre esta due (nunca se vio)', () => {
    expect(isWordDue(undefined, T0)).toBe(true)
  })

  it('no esta due si todavia no llego la fecha', () => {
    const progress = reviewWordCard(reviewWordCard(emptyWordProgress('w1'), 'good', T0), 'good', T0 + DAY_MS)
    expect(isWordDue(progress, progress.nextReviewAtEpochMillis - 1)).toBe(false)
  })

  it('esta due una vez pasada la fecha', () => {
    const progress = reviewWordCard(reviewWordCard(emptyWordProgress('w1'), 'good', T0), 'good', T0 + DAY_MS)
    expect(isWordDue(progress, progress.nextReviewAtEpochMillis)).toBe(true)
  })
})

describe('selectDueWordSession', () => {
  const items = [{ learningItemId: 'a' }, { learningItemId: 'b' }, { learningItemId: 'c' }]

  it('deja afuera lo que todavia no esta due', () => {
    const progress: Record<string, WordCardProgress> = {
      a: { ...emptyWordProgress('a'), nextReviewAtEpochMillis: T0 + DAY_MS },
    }
    const session = selectDueWordSession(items, (id) => progress[id], T0)
    expect(session.map((item) => item.learningItemId)).toEqual(['b', 'c'])
  })

  it('ordena lo menos avanzado primero: NEW, LEARNING, MASTERED', () => {
    const progress: Record<string, WordCardProgress> = {
      a: { ...emptyWordProgress('a'), state: 'MASTERED' },
      b: { ...emptyWordProgress('b'), state: 'NEW' },
      c: { ...emptyWordProgress('c'), state: 'LEARNING' },
    }
    const session = selectDueWordSession(items, (id) => progress[id], T0)
    expect(session.map((item) => item.learningItemId)).toEqual(['b', 'c', 'a'])
  })

  it('corta en el tamaño de sesion pedido', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ learningItemId: `w${i}` }))
    const session = selectDueWordSession(many, () => undefined, T0, 5)
    expect(session).toHaveLength(5)
  })
})
