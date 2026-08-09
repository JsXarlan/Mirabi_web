import type { KanaCharacter, KanaStrokeCatalog } from '../content/types'
import type { MasteryScore } from './models'
import { MASTERY_VALUE } from './models'

/**
 * Practica de escritura, calcada del patron de kanjiExercises.ts pero sin
 * pasar por el pipeline de ContentExercise: no hay respuesta de texto que
 * corregir, solo un trazo que la persona autoevalua.
 */

export interface WritingCard {
  id: string
  learningItemId: string
  symbol: string
  romaji: string
  strokePaths: string[]
  viewBox: string
}

/** Nulo cuando el catalogo de trazos todavia no cubre ese caracter. */
export function buildWritingCard(character: KanaCharacter, strokes: KanaStrokeCatalog): WritingCard | null {
  const entry = strokes.strokes[character.learningItemId]
  if (!entry) return null
  return {
    id: character.id,
    learningItemId: character.learningItemId,
    symbol: character.symbol,
    romaji: character.romaji,
    strokePaths: entry.paths,
    viewBox: entry.viewBox,
  }
}

const SESSION_SIZE = 8

/** Los caracteres con menos dominio primero, igual que la practica de kanji. */
export function selectWritingSession(
  characters: KanaCharacter[],
  masteryOf: (learningItemId: string) => MasteryScore,
  sessionSize: number = SESSION_SIZE,
): KanaCharacter[] {
  return [...characters]
    .sort((a, b) => MASTERY_VALUE[masteryOf(a.learningItemId)] - MASTERY_VALUE[masteryOf(b.learningItemId)])
    .slice(0, sessionSize)
}
