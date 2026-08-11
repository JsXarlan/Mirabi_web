import type { VocabularyWord, WordCatalog } from '../content/types'
import { pickDistinct, seedOf, shuffle } from './seededRandom'

/**
 * Quiz propio de Palabras: no pasa por wordExercises.ts/ContentExercise -no
 * hay que reconstruirlo desde un id para el repaso de kana, porque no entra
 * en ese repaso- pero copia su idea de distractor "confundible primero"
 * (mismo tema/etiqueta), solo que aca compara etiquetas en vez de kanji.
 */

export interface WordQuizQuestion {
  id: string
  word: VocabularyWord
  options: string[]
  correctAnswer: string
}

const OPTIONS_PER_ITEM = 4

export function buildWordQuizQuestion(word: VocabularyWord, catalog: WordCatalog): WordQuizQuestion {
  const correctAnswer = word.meanings[0]
  const others = catalog.words.filter((other) => other.id !== word.id && other.meanings[0] !== correctAnswer)

  const confusablePool = others
    .filter((other) => other.tags.some((tag) => word.tags.includes(tag)))
    .map((other) => other.meanings[0])
  const fallbackPool = others.map((other) => other.meanings[0])

  let seed = seedOf(word.id)
  const confusable = pickDistinct(confusablePool, OPTIONS_PER_ITEM - 1, seed)
  seed = confusable.seed
  const fallback = pickDistinct(
    fallbackPool.filter((text) => !confusable.picked.includes(text)),
    OPTIONS_PER_ITEM - 1 - confusable.picked.length,
    seed,
  )

  const options = shuffle([correctAnswer, ...confusable.picked, ...fallback.picked], word.id)

  return { id: word.id, word, options, correctAnswer }
}
