import type { CharacterCatalog, ContentExercise, KanjiCatalog, WordCatalog } from '../content/types'
import { isKanaExerciseId, kanaExerciseFromId } from './kanaExercises'
import { isKanjiExerciseId, kanjiExerciseFromId } from './kanjiExercises'
import { isWordExerciseId, wordExerciseFromId } from './wordExercises'

/**
 * Despachador de ejercicios sinteticos por prefijo.
 *
 * Kana, palabras y kanji se practican sin pasar por el curso, asi que sus
 * ejercicios no viven en ningun ContentLesson: se reconstruyen desde su id
 * cuando vuelven en el repaso. Antes de esto, quien necesitara reconstruir uno
 * -solo ReviewSessionScreen, por ahora- tenia que conocer los tres builders y
 * probarlos en orden; aqui el orden vive en un solo sitio.
 */

export interface SyntheticExerciseSources {
  characters: CharacterCatalog | null
  words: WordCatalog | null
  kanji: KanjiCatalog | null
}

export function isSyntheticExerciseId(exerciseId: string): boolean {
  return (
    isKanaExerciseId(exerciseId) || isWordExerciseId(exerciseId) || isKanjiExerciseId(exerciseId)
  )
}

export function syntheticExerciseFromId(
  exerciseId: string,
  sources: SyntheticExerciseSources,
): ContentExercise | null {
  if (isKanaExerciseId(exerciseId)) return kanaExerciseFromId(exerciseId, sources.characters)
  if (isWordExerciseId(exerciseId)) return wordExerciseFromId(exerciseId, sources.words)
  if (isKanjiExerciseId(exerciseId)) return kanjiExerciseFromId(exerciseId, sources.kanji)
  return null
}
