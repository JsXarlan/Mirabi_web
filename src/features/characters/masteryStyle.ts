import type { MasteryScore } from '../../core/domain/models'

/**
 * Estilo del dominio, compartido entre la rejilla de kana, la lista de
 * palabras y la de kanji. Vivia solo en CharacterScriptScreen; con un tercer
 * consumidor duplicarlo dejaba de tener sentido.
 */

export const MASTERY_STYLE: Record<MasteryScore, string> = {
  UNKNOWN: 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]',
  FAMILIAR: 'bg-[color-mix(in_srgb,var(--secondary)_20%,transparent)]',
  LEARNING: 'bg-[color-mix(in_srgb,var(--tertiary)_28%,transparent)]',
  MASTERED: 'bg-[color-mix(in_srgb,var(--success)_28%,transparent)]',
  EXPERT: 'bg-[var(--success)] text-white',
}

export const MASTERY_LABEL: Record<MasteryScore, string> = {
  UNKNOWN: 'Sin practicar',
  FAMILIAR: 'Te suena',
  LEARNING: 'En aprendizaje',
  MASTERED: 'Dominado',
  EXPERT: 'Experto',
}
