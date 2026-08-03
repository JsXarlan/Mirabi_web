import { beforeEach, describe, expect, it } from 'vitest'

import type { ProfileSignalContext, ProfileSignalType } from './profile'
import { calculateLearningStats, resolveProfileSignals } from './profile'
import { useMirabiStore } from '../store/useMirabiStore'
import { coursePack, freshStore, wrongAnswerFor } from '../../test/content'

/**
 * Las senales del perfil son el resumen que lee la persona al abrir su ficha.
 * Son puras y con umbrales cerrados, asi que lo que hay que fijar son los
 * bordes: justo por encima y justo por debajo de cada corte.
 */

const store = () => useMirabiStore.getState()

function contextOf(overrides: Partial<ProfileSignalContext> = {}): ProfileSignalContext {
  return {
    pendingReviewItems: 0,
    criticalWeaknesses: 0,
    dailyActivity: {
      lessonsCompletedToday: 0,
      reviewsCompletedToday: 0,
      conversationsCompletedToday: 0,
      xpEarnedToday: 0,
      sakuraEarnedToday: 0,
      dailyGoalCompleted: false,
    },
    learningStats: calculateLearningStats(0, 0, 0),
    streakActive: false,
    ...overrides,
  }
}

const typesOf = (overrides: Partial<ProfileSignalContext> = {}): ProfileSignalType[] =>
  resolveProfileSignals(contextOf(overrides)).map((signal) => signal.type)

describe('estadísticas de aprendizaje', () => {
  it('deduce los fallos y el porcentaje de acierto', () => {
    const stats = calculateLearningStats(40, 30, 5)

    expect(stats.wrongAnswers).toBe(10)
    expect(stats.accuracyPercentage).toBe(75)
    expect(stats.activeDays).toBe(5)
  })

  it('sin respuestas no divide por cero', () => {
    const stats = calculateLearningStats(0, 0, 0)

    expect(stats.accuracyPercentage).toBe(0)
    expect(stats.wrongAnswers).toBe(0)
  })
})

describe('señales del perfil', () => {
  it('quien no tiene nada pendiente lo tiene todo al día', () => {
    const types = typesOf()

    expect(types).toContain('ALL_CAUGHT_UP')
    expect(types).not.toContain('REVIEW_RECOMMENDED')
  })

  it('un repaso pendiente pide reforzar y retira el «todo al día»', () => {
    const types = typesOf({ pendingReviewItems: 1 })

    expect(types).toContain('REVIEW_RECOMMENDED')
    expect(types).not.toContain('ALL_CAUGHT_UP')
  })

  it('una confusión crítica basta por sí sola', () => {
    const types = typesOf({ criticalWeaknesses: 1 })

    expect(types).toContain('REVIEW_RECOMMENDED')
    expect(types).not.toContain('ALL_CAUGHT_UP')
  })

  it('reforzar es lo más urgente que se dice', () => {
    const signals = resolveProfileSignals(contextOf({ pendingReviewItems: 3 }))
    const review = signals.find((signal) => signal.type === 'REVIEW_RECOMMENDED')

    expect(review?.priority).toBe('HIGH')
  })

  it('celebra el objetivo diario y la racha viva', () => {
    const types = typesOf({
      dailyActivity: { ...contextOf().dailyActivity, dailyGoalCompleted: true },
      streakActive: true,
    })

    expect(types).toContain('DAILY_GOAL_COMPLETED')
    expect(types).toContain('STREAK_CONTINUED')
  })

  it('la precisión alta y la baja nunca conviven', () => {
    // El corte de arriba es 80 inclusive.
    expect(typesOf({ learningStats: calculateLearningStats(10, 8, 1) })).toContain('GREAT_ACCURACY')
    // El de abajo es 50 exclusive.
    expect(typesOf({ learningStats: calculateLearningStats(10, 4, 1) })).toContain('NEEDS_PRACTICE')

    const middle = typesOf({ learningStats: calculateLearningStats(10, 5, 1) })
    expect(middle).not.toContain('GREAT_ACCURACY')
    expect(middle).not.toContain('NEEDS_PRACTICE')
  })

  it('sin haber respondido nada no juzga la precisión', () => {
    // Sin el guardia de totalAnswers, un 0% recien instalado diria «practica mas».
    const types = typesOf({ learningStats: calculateLearningStats(0, 0, 0) })

    expect(types).not.toContain('NEEDS_PRACTICE')
    expect(types).not.toContain('GREAT_ACCURACY')
  })

  it('sugiere descansar a partir de cinco actividades del día', () => {
    const activity = (lessons: number) => ({
      dailyActivity: { ...contextOf().dailyActivity, lessonsCompletedToday: lessons },
    })

    expect(typesOf(activity(4))).not.toContain('REST_RECOMMENDED')
    expect(typesOf(activity(5))).toContain('REST_RECOMMENDED')
  })

  it('cuenta lecciones, repasos y conversaciones juntos para el descanso', () => {
    const types = typesOf({
      dailyActivity: {
        ...contextOf().dailyActivity,
        lessonsCompletedToday: 2,
        reviewsCompletedToday: 2,
        conversationsCompletedToday: 1,
      },
    })

    expect(types).toContain('REST_RECOMMENDED')
  })
})

describe('el perfil de quien acaba de fallar', () => {
  beforeEach(() => {
    freshStore()
  })

  it('pide reforzar con lo que el store deja pendiente', () => {
    const exercise = coursePack.lessons
      .flatMap((lesson) => lesson.exercises)
      .find((item) => item.options.length > 0 && item.correctAnswer !== null)!

    store().answerExercise(exercise, wrongAnswerFor(exercise))

    const state = store()
    const pending = state.dueReviewItems()
    expect(pending.length).toBeGreaterThan(0)

    const types = typesOf({
      pendingReviewItems: pending.length,
      criticalWeaknesses: pending.filter((item) => item.priority === 'CRITICAL').length,
      learningStats: calculateLearningStats(state.totalAnswers, state.correctAnswers, 1),
    })

    expect(types).toContain('REVIEW_RECOMMENDED')
    // Una sola respuesta y fallada: 0% de acierto.
    expect(types).toContain('NEEDS_PRACTICE')
    expect(types).not.toContain('ALL_CAUGHT_UP')
  })
})
