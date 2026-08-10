import type { ContentExercise, KanjiCatalog, VocabularyWord, WordCatalog } from '../content/types'
import { pickDistinct, seedOf, shuffle } from './seededRandom'

/**
 * Ejercicios de compuestos (熟語): combina los dos kanji de una palabra y
 * pregunta que significan juntos.
 *
 * El curso todavia muestra la mayoria del vocabulario en kana -el kanji
 * llega mas adelante-, asi que `word.lemma` casi nunca trae el compuesto
 * escrito: de las 20 palabras de dos kanji del catalogo, solo 日本 lo hace.
 * Por eso el compuesto no sale de `lemma` sino que se reconstruye desde
 * `kanjiIds` contra el catalogo de kanji, en el mismo orden en que aparecen
 * -日+本 da 日本, 友+達 da 友達-, aunque la palabra en si se siga viendo en
 * kana en el resto de la app. Es un adelanto de lectura, no lo que ya se
 * enseño.
 */

export const JUKUGO_EXERCISE_PREFIX = 'jukugo-practice-'

const OPTIONS_PER_ITEM = 4

export function isJukugoExerciseId(exerciseId: string): boolean {
  return exerciseId.startsWith(JUKUGO_EXERCISE_PREFIX)
}

/** El compuesto reconstruido de una palabra de dos kanji, o null si no aplica o falta algun kanji en el catálogo. */
export function jukugoCompound(word: VocabularyWord, kanjiCatalog: KanjiCatalog): string | null {
  if (word.kanjiIds.length !== 2) return null
  const kanjiById = new Map(kanjiCatalog.kanji.map((item) => [item.id, item]))
  const symbols = word.kanjiIds.map((id) => kanjiById.get(id)?.symbol)
  if (symbols.some((symbol) => symbol === undefined)) return null
  return symbols.join('')
}

/** Palabras de exactamente dos kanji cuyo compuesto se puede reconstruir. */
export function jukugoWords(wordCatalog: WordCatalog, kanjiCatalog: KanjiCatalog): VocabularyWord[] {
  return wordCatalog.words.filter((word) => jukugoCompound(word, kanjiCatalog) !== null)
}

export function buildJukugoExercise(
  word: VocabularyWord,
  wordCatalog: WordCatalog,
  kanjiCatalog: KanjiCatalog,
): ContentExercise | null {
  const compound = jukugoCompound(word, kanjiCatalog)
  if (!compound) return null

  const correctAnswer = word.meanings[0]

  // Mismo criterio que wordExercises.ts: comparte un kanji con la correcta
  // (confusion real de compuestos, como 電話 y 電車) antes que cualquier otra.
  const others = wordCatalog.words.filter(
    (other) => other.id !== word.id && other.meanings[0] !== correctAnswer,
  )
  const confusablePool = others
    .filter((other) => other.kanjiIds.some((id) => word.kanjiIds.includes(id)))
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
    id: `${JUKUGO_EXERCISE_PREFIX}${word.id}`,
    type: 'MULTIPLE_CHOICE',
    difficulty: 'BEGINNER',
    prompt: `¿Qué significa ${compound}?`,
    body: null,
    correctAnswer,
    learningItemId: word.learningItemId,
    learningItemType: 'VOCABULARY',
    mistakeType: 'WRONG_MEANING',
    errorType: 'JUKUGO_MEANING_RECALL',
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
    tags: ['practica-kanji', 'jukugo'],
    criticalTags: [],
    referencedItems: [{ type: 'VOCABULARY', id: word.learningItemId }],
    options: texts.map((text, index) => ({
      id: `${JUKUGO_EXERCISE_PREFIX}${word.id}-${index}`,
      text,
      distractorReason:
        text === correctAnswer
          ? null
          : confusableSet.has(text)
            ? 'Comparte un kanji con el compuesto correcto: se confunden fácil.'
            : 'Ese es el significado de otra palabra.',
      referencedItemId: null,
    })),
  }
}

/** Reconstruye el ejercicio desde su id, para que el repaso pueda mostrarlo. */
export function jukugoExerciseFromId(
  exerciseId: string,
  wordCatalog: WordCatalog | null,
  kanjiCatalog: KanjiCatalog | null,
): ContentExercise | null {
  if (!wordCatalog || !kanjiCatalog || !isJukugoExerciseId(exerciseId)) return null
  const wordId = exerciseId.slice(JUKUGO_EXERCISE_PREFIX.length)
  const word = wordCatalog.words.find((item) => item.id === wordId)
  return word ? buildJukugoExercise(word, wordCatalog, kanjiCatalog) : null
}
