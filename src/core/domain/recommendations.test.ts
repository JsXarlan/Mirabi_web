import { describe, expect, it } from 'vitest'

import { buildHomeRecommendation } from './recommendations'
import type { WeakPoint } from './weakpoints'

function weakPoint(overrides: Partial<WeakPoint> = {}): WeakPoint {
  return {
    key: 'PARTICLE_OMISSION',
    title: 'Partículas que se caen',
    advice: 'advice',
    wrong: 4,
    total: 5,
    severity: 70,
    pendingReviews: 0,
    ...overrides,
  }
}

describe('buildHomeRecommendation', () => {
  it('recomienda repasar cuando el punto débil más severo tiene repasos pendientes', () => {
    const rec = buildHomeRecommendation([weakPoint({ pendingReviews: 2 })], 2, true)
    expect(rec).toEqual({
      type: 'REVIEW_ITEM',
      title: 'Repasa: Partículas que se caen',
      reason: 'Fallaste 4 de 5 — es tu punto más débil ahora mismo.',
    })
  })

  it('recomienda practicar cuando el punto débil más severo no tiene repasos pendientes', () => {
    const rec = buildHomeRecommendation([weakPoint({ pendingReviews: 0 })], 0, true)
    expect(rec?.type).toBe('PRACTICE_CATEGORY')
  })

  it('ignora puntos débiles por debajo del umbral de severidad', () => {
    const rec = buildHomeRecommendation([weakPoint({ severity: 30 })], 3, true)
    expect(rec?.type).toBe('REVIEW_ITEM')
    expect(rec?.title).toBe('Repasa lo pendiente')
  })

  it('recomienda repasos pendientes cuando no hay puntos débiles severos', () => {
    const rec = buildHomeRecommendation([], 3, true)
    expect(rec).toEqual({
      type: 'REVIEW_ITEM',
      title: 'Repasa lo pendiente',
      reason: '3 elementos listos para reforzar.',
    })
  })

  it('usa singular cuando queda un solo repaso pendiente', () => {
    const rec = buildHomeRecommendation([], 1, true)
    expect(rec?.reason).toBe('1 elemento listo para reforzar.')
  })

  it('recomienda continuar el curso sin puntos débiles ni repasos', () => {
    const rec = buildHomeRecommendation([], 0, true)
    expect(rec).toEqual({
      type: 'CONTINUE_COURSE',
      title: 'Sigue con el curso',
      reason: 'Sin errores pendientes que reforzar — buen momento para avanzar.',
    })
  })

  it('recomienda descansar sin nada pendiente ni lección siguiente', () => {
    const rec = buildHomeRecommendation([], 0, false)
    expect(rec).toEqual({
      type: 'REST',
      title: 'Vas al día',
      reason: 'No hay nada urgente que practicar ahora mismo.',
    })
  })
})
