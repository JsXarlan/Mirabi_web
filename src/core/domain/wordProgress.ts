/**
 * Progreso de la seccion Palabras: deliberadamente no es el Leitner box de
 * review.ts (kana/kanji/gramatica). Palabras es una biblioteca para hojear
 * con tarjetas y quiz propio, no una cola de repaso por fecha, asi que le
 * alcanza con tres estados y una regla simple para pasar de uno a otro.
 */

export type WordState = 'NEW' | 'LEARNING' | 'MASTERED'

export interface WordCardProgress {
  wordId: string
  state: WordState
  reviewCount: number
  lastReviewedAtEpochMillis: number | null
  /** Antes de esta fecha, la tarjeta no vuelve a salir en la sesion de flashcards. */
  nextReviewAtEpochMillis: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const MASTERED_REST_MS = 7 * DAY_MS
const LEARNING_REST_MS = DAY_MS

export function emptyWordProgress(wordId: string): WordCardProgress {
  return {
    wordId,
    state: 'NEW',
    reviewCount: 0,
    lastReviewedAtEpochMillis: null,
    nextReviewAtEpochMillis: 0,
  }
}

/**
 * NEW pasa a LEARNING con el primer acierto. LEARNING pasa a MASTERED con un
 * acierto que no sea el mismo dia que el anterior -asi "dominar" una palabra
 * pide volver a encontrarla en otra sesion, no repetirla dos veces seguidas
 * en la misma-. Un fallo siempre vuelve a LEARNING, nunca mas abajo: MASTERED
 * no es un compromiso perpetuo, pero tampoco castiga tanto como perder cajas.
 */
export function reviewWordCard(
  progress: WordCardProgress,
  outcome: 'again' | 'good',
  now: number,
): WordCardProgress {
  const reviewCount = progress.reviewCount + 1

  if (outcome === 'again') {
    return {
      ...progress,
      state: 'LEARNING',
      reviewCount,
      lastReviewedAtEpochMillis: now,
      nextReviewAtEpochMillis: now,
    }
  }

  const reviewedOtherDay =
    progress.lastReviewedAtEpochMillis === null || now - progress.lastReviewedAtEpochMillis >= DAY_MS

  const state: WordState =
    progress.state === 'NEW' ? 'LEARNING' : progress.state === 'LEARNING' && reviewedOtherDay ? 'MASTERED' : progress.state

  const restMs = state === 'MASTERED' ? MASTERED_REST_MS : state === 'LEARNING' ? LEARNING_REST_MS : 0

  return {
    ...progress,
    state,
    reviewCount,
    lastReviewedAtEpochMillis: now,
    nextReviewAtEpochMillis: now + restMs,
  }
}

/** Sin progreso todavia, la tarjeta esta due: es la primera vez que se ve. */
export function isWordDue(progress: WordCardProgress | undefined, now: number): boolean {
  return !progress || progress.nextReviewAtEpochMillis <= now
}

const STATE_RANK: Record<WordState, number> = { NEW: 0, LEARNING: 1, MASTERED: 2 }

const SESSION_SIZE = 10

/**
 * Sesion de flashcards: solo lo que ya esta due, con lo menos avanzado
 * primero (mismo criterio que selectWritingSession, adaptado a tres estados
 * en vez de una escala de dominio continua).
 */
export function selectDueWordSession<T extends { learningItemId: string }>(
  items: T[],
  progressOf: (learningItemId: string) => WordCardProgress | undefined,
  now: number,
  sessionSize: number = SESSION_SIZE,
): T[] {
  return items
    .filter((item) => isWordDue(progressOf(item.learningItemId), now))
    .sort(
      (a, b) =>
        STATE_RANK[progressOf(a.learningItemId)?.state ?? 'NEW'] -
        STATE_RANK[progressOf(b.learningItemId)?.state ?? 'NEW'],
    )
    .slice(0, sessionSize)
}
