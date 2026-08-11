import type { StateCreator } from 'zustand'

import { emptyWordProgress, isWordDue, reviewWordCard, type WordCardProgress } from '../../domain/wordProgress'
import type { MirabiStore } from '../useMirabiStore'

/**
 * Progreso propio de la seccion Palabras: NEW/LEARNING/MASTERED por palabra,
 * separado del Leitner box de review.ts a proposito (ver wordProgress.ts).
 */
export interface WordsProgressState {
  wordProgress: Record<string, WordCardProgress>
}

export interface WordsProgressSlice extends WordsProgressState {
  reviewWordCard: (wordId: string, outcome: 'again' | 'good') => void
  /** De la lista dada, las que ya se pueden repasar (nunca vistas o con fecha cumplida). */
  dueWordCards: (wordIds: string[]) => string[]
}

export const initialWordsProgressState: WordsProgressState = {
  wordProgress: {},
}

export const createWordsProgressSlice: StateCreator<MirabiStore, [], [], WordsProgressSlice> = (set, get) => ({
  ...initialWordsProgressState,

  reviewWordCard: (wordId, outcome) => {
    const current = get().wordProgress[wordId] ?? emptyWordProgress(wordId)
    const next = reviewWordCard(current, outcome, Date.now())
    set((state) => ({ wordProgress: { ...state.wordProgress, [wordId]: next } }))
  },

  dueWordCards: (wordIds) => {
    const { wordProgress } = get()
    const now = Date.now()
    return wordIds.filter((id) => isWordDue(wordProgress[id], now))
  },
})
