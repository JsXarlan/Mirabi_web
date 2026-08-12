import type { WeakPoint } from './weakpoints'

/**
 * Que estudiar ahora, para la tarjeta de recomendacion de Inicio.
 *
 * Espejo reducido de `DefaultRecommendationEngine` (Kotlin): alli la senal es
 * `Weakness` con severidad HIGH/CRITICAL mas la precision de la ultima sesion.
 * Web no guarda precision por sesion (solo `errorTallies` acumuladas via
 * `buildWeakPoints`), asi que la senal de "sesion floja" se sustituye por el
 * punto debil de mayor severidad -ambas apuntan a lo mismo: que practicar a
 * continuacion-. El umbral de severidad reusa el que ya usa WeakPointsScreen
 * para el tono "Alta" (60).
 */

export type RecommendationType = 'REVIEW_ITEM' | 'PRACTICE_CATEGORY' | 'CONTINUE_COURSE' | 'REST'

export interface Recommendation {
  type: RecommendationType
  title: string
  reason: string
}

const SEVERITY_HIGH = 60

export function buildHomeRecommendation(
  weakPoints: WeakPoint[],
  pendingReviewsCount: number,
  hasNextLesson: boolean,
): Recommendation | null {
  const top = weakPoints[0]

  if (top && top.severity >= SEVERITY_HIGH) {
    return top.pendingReviews > 0
      ? {
          type: 'REVIEW_ITEM',
          title: `Repasa: ${top.title}`,
          reason: `Fallaste ${top.wrong} de ${top.total} — es tu punto más débil ahora mismo.`,
        }
      : {
          type: 'PRACTICE_CATEGORY',
          title: `Practica: ${top.title}`,
          reason: `Fallaste ${top.wrong} de ${top.total} — vale la pena reforzarlo.`,
        }
  }

  if (pendingReviewsCount > 0) {
    return {
      type: 'REVIEW_ITEM',
      title: 'Repasa lo pendiente',
      reason: `${pendingReviewsCount} ${pendingReviewsCount === 1 ? 'elemento listo' : 'elementos listos'} para reforzar.`,
    }
  }

  if (hasNextLesson) {
    return {
      type: 'CONTINUE_COURSE',
      title: 'Sigue con el curso',
      reason: 'Sin errores pendientes que reforzar — buen momento para avanzar.',
    }
  }

  return {
    type: 'REST',
    title: 'Vas al día',
    reason: 'No hay nada urgente que practicar ahora mismo.',
  }
}
