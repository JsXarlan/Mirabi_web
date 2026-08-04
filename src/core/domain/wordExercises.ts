import type { ContentExercise, VocabularyWord, WordCatalog } from '../content/types'
import { nextRandom, seedOf } from './seededRandom'

/**
 * Ejercicios de palabras sinteticos, calcados de kanaExercises.ts.
 *
 * Pregunta el significado, no la lectura: una palabra tiene una unica
 * traduccion util para un ejercicio de opcion cerrada, mientras que pedir la
 * lectura de golpe (con okurigana, con kanji que todavia no se ha enseniado)
 * mediria ortografia mas que vocabulario.
 *
 * El `learningItemId` es el que ya usa el curso: acertar aqui y acertar en
 * una leccion mueven la misma fila de progreso, no dos.
 */

export const WORD_EXERCISE_PREFIX = 'word-practice-'

const OPTIONS_PER_ITEM = 4

export function isWordExerciseId(exerciseId: string): boolean {
  return exerciseId.startsWith(WORD_EXERCISE_PREFIX)
}

export function buildWordExercise(word: VocabularyWord, catalog: WordCatalog): ContentExercise {
  const correctAnswer = word.meanings[0]

  // Los distractores salen del mismo apartado: confundir una palabra de
  // hiragana con una de katakana no mide nada real. Se excluye tambien
  // cualquier significado igual al correcto: dos palabras pueden ser
  // sinonimos, y una opcion identica a la correcta no se puede responder.
  const pool = catalog.words
    .filter(
      (other) =>
        other.script === word.script && other.id !== word.id && other.meanings[0] !== correctAnswer,
    )
    .map((other) => other.meanings[0])

  const distractors: string[] = []
  let seed = seedOf(word.learningItemId)
  while (distractors.length < OPTIONS_PER_ITEM - 1 && pool.length > 0) {
    seed = nextRandom(seed)
    const [candidate] = pool.splice(seed % pool.length, 1)
    if (!distractors.includes(candidate)) distractors.push(candidate)
  }

  const texts = [correctAnswer, ...distractors]

  return {
    id: `${WORD_EXERCISE_PREFIX}${word.id}`,
    type: 'MULTIPLE_CHOICE',
    difficulty: 'BEGINNER',
    prompt: `¿Qué significa ${word.kana}?`,
    body: null,
    correctAnswer,
    learningItemId: word.learningItemId,
    learningItemType: 'VOCABULARY',
    mistakeType: 'WRONG_MEANING',
    errorType: 'VOCAB_MEANING_RECALL',
    feedbackId: null,
    audioNormalId: null,
    audioSlowId: null,
    audioText: word.audioText ?? word.kana,
    srsCategory: 'CORE_VOCABULARY',
    contentCategory: 'CORE',
    appearsInCheckpoint: false,
    entersSrs: true,
    isPreviewOnly: false,
    isEvaluable: true,
    tags: ['practica-palabras'],
    criticalTags: [],
    referencedItems: [{ type: 'VOCABULARY', id: word.learningItemId }],
    options: texts.map((text, index) => ({
      id: `${WORD_EXERCISE_PREFIX}${word.id}-${index}`,
      text,
      distractorReason: text === correctAnswer ? null : 'Ese es el significado de otra palabra.',
      referencedItemId: null,
    })),
  }
}

/** Reconstruye el ejercicio desde su id, para que el repaso pueda mostrarlo. */
export function wordExerciseFromId(
  exerciseId: string,
  catalog: WordCatalog | null,
): ContentExercise | null {
  if (!catalog || !isWordExerciseId(exerciseId)) return null
  const wordId = exerciseId.slice(WORD_EXERCISE_PREFIX.length)
  const word = catalog.words.find((item) => item.id === wordId)
  return word ? buildWordExercise(word, catalog) : null
}
