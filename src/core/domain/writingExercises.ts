import type { CharacterCatalog, KanaCharacter, KanaStrokeEntry, KanjiCharacter } from '../content/types'
import type { MasteryScore } from './models'
import { MASTERY_VALUE } from './models'
import type { YoonCombination } from './yoon'

/**
 * Practica de escritura, calcada del patron de kanjiExercises.ts pero sin
 * pasar por el pipeline de ContentExercise: no hay respuesta de texto que
 * corregir, solo un trazo que la persona autoevalua.
 */

/** El kana chico de un yoon (ゃゅょ): se traza aparte, junto a la base. */
export interface WritingCardPair {
  learningItemId: string
  symbol: string
  strokePaths: string[]
  viewBox: string
}

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
  /** Presente solo en un yoon (きゃ...): el kana chico que acompana a la base. */
  pair?: WritingCardPair
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

/**
 * Tarjeta de un yoon (きゃ...): la base lleva el progreso propio de la
 * combinacion (id sintetico `yoon-*`, no el de la base ni el del kana chico,
 * que no se tocan), y el kana chico viaja en `pair` para que la UI lo dibuje
 * al lado. Nulo si falta el catalogo o el trazo de cualquiera de los dos.
 */
export function buildYoonWritingCard(
  combo: YoonCombination,
  catalog: CharacterCatalog,
  strokes: Record<string, KanaStrokeEntry>,
): WritingCard | null {
  const base = catalog.characters.find((character) => character.id === combo.baseCharacterId)
  const small = catalog.characters.find((character) => character.id === combo.smallCharacterId)
  if (!base || !small) return null

  const baseStrokes = strokes[base.learningItemId]
  const smallStrokes = strokes[small.learningItemId]
  if (!baseStrokes || !smallStrokes) return null

  return {
    id: combo.id,
    learningItemId: combo.id,
    symbol: base.symbol,
    prompt: combo.romaji,
    strokePaths: baseStrokes.paths,
    viewBox: baseStrokes.viewBox,
    pair: {
      learningItemId: small.learningItemId,
      symbol: small.symbol,
      strokePaths: smallStrokes.paths,
      viewBox: smallStrokes.viewBox,
    },
  }
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
