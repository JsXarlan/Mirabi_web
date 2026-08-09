import type { ContentExercise, VocabularyWord, WordCatalog } from '../content/types'
import { pickDistinct, seedOf, shuffle } from './seededRandom'

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

  // Se excluye cualquier significado igual al correcto: dos palabras pueden
  // ser sinonimos, y una opcion identica a la correcta no se puede responder.
  const others = catalog.words.filter(
    (other) => other.script === word.script && other.id !== word.id && other.meanings[0] !== correctAnswer,
  )

  /*
   * Alternativas inteligentes: una palabra que comparte kanji o etiqueta con
   * la correcta -misma familia semantica, mismo campo- se confunde de verdad;
   * cualquier otra palabra del mismo silabario mide bastante menos.
   */
  const confusablePool = others
    .filter(
      (other) =>
        other.kanjiIds.some((id) => word.kanjiIds.includes(id)) ||
        other.tags.some((tag) => word.tags.includes(tag)),
    )
    .map((other) => other.meanings[0])
  const fallbackPool = others.map((other) => other.meanings[0])

  let seed = seedOf(word.learningItemId)
  const confusable = pickDistinct(confusablePool, OPTIONS_PER_ITEM - 1, seed)
  seed = confusable.seed
  const fallback = pickDistinct(
    fallbackPool.filter((text) => !confusable.picked.includes(text)),
    OPTIONS_PER_ITEM - 1 - confusable.picked.length,
    seed,
  )
  const distractors = [...confusable.picked, ...fallback.picked]
  const confusableSet = new Set(confusable.picked)

  const texts = shuffle([correctAnswer, ...distractors], word.learningItemId)

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
      distractorReason:
        text === correctAnswer
          ? null
          : confusableSet.has(text)
            ? 'Comparte kanji o tema con la palabra correcta: se confunden fácil.'
            : 'Ese es el significado de otra palabra.',
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
