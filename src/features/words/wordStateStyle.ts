import type { WordState } from '../../core/domain/wordProgress'

/** Estilo del estado propio de Palabras (NEW/LEARNING/MASTERED), distinto del dominio SRS de kana. */

export const WORD_STATE_STYLE: Record<WordState, string> = {
  NEW: 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]',
  LEARNING: 'bg-[color-mix(in_srgb,var(--tertiary)_28%,transparent)]',
  MASTERED: 'bg-[var(--success)] text-white',
}

export const WORD_STATE_LABEL: Record<WordState, string> = {
  NEW: 'Nueva',
  LEARNING: 'Aprendiendo',
  MASTERED: 'Dominada',
}
