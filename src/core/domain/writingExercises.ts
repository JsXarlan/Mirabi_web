import type { KanaCharacter, KanaStrokeEntry, KanjiCharacter } from '../content/types'
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
  /**
   * Lo que se pide escribir antes de trazar. Para kana es el romaji ("a"); para
   * kanji es el significado ("agua"), nunca la lectura -kanjiExercises.ts ya
   * documenta por que un kanji aislado no tiene una lectura correcta unica-.
   */
  prompt: string
  strokePaths: string[]
  viewBox: string
}

function cardFrom(
  id: string,
  learningItemId: string,
  symbol: string,
  prompt: string,
  strokes: Record<string, KanaStrokeEntry>,
): WritingCard | null {
  const entry = strokes[learningItemId]
  if (!entry) return null
  return { id, learningItemId, symbol, prompt, strokePaths: entry.paths, viewBox: entry.viewBox }
}

/** Nulo cuando el catalogo de trazos todavia no cubre ese caracter. */
export function buildKanaWritingCard(
  character: KanaCharacter,
  strokes: Record<string, KanaStrokeEntry>,
): WritingCard | null {
  return cardFrom(character.id, character.learningItemId, character.symbol, character.romaji, strokes)
}

/** Nulo cuando el catalogo de trazos todavia no cubre ese kanji. */
export function buildKanjiWritingCard(
  kanji: KanjiCharacter,
  strokes: Record<string, KanaStrokeEntry>,
): WritingCard | null {
  return cardFrom(kanji.id, kanji.learningItemId, kanji.symbol, kanji.meanings[0], strokes)
}

const SESSION_SIZE = 8

/** Los elementos con menos dominio primero, igual que la practica de kanji. */
export function selectWritingSession<T extends { learningItemId: string }>(
  items: T[],
  masteryOf: (learningItemId: string) => MasteryScore,
  sessionSize: number = SESSION_SIZE,
): T[] {
  return [...items]
    .sort((a, b) => MASTERY_VALUE[masteryOf(a.learningItemId)] - MASTERY_VALUE[masteryOf(b.learningItemId)])
    .slice(0, sessionSize)
}
