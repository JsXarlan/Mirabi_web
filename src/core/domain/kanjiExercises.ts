import type { ContentExercise, KanjiCatalog, KanjiCharacter } from '../content/types'
import { pickDistinct, seedOf, shuffle } from './seededRandom'

/**
 * Ejercicios de kanji sinteticos, calcados de kanaExercises.ts.
 *
 * Pregunta el significado, nunca la lectura: un kanji tiene varias lecturas y
 * todas son correctas segun el contexto (on'yomi en compuestos, kun'yomi en
 * palabras nativas), asi que un ejercicio de opcion unica sobre "como se lee"
 * esta mal por construccion. El significado es la unica pregunta con
 * respuesta inequivoca.
 */

export const KANJI_EXERCISE_PREFIX = 'kanji-practice-'

const OPTIONS_PER_ITEM = 4

export function isKanjiExerciseId(exerciseId: string): boolean {
  return exerciseId.startsWith(KANJI_EXERCISE_PREFIX)
}

export function buildKanjiExercise(kanji: KanjiCharacter, catalog: KanjiCatalog): ContentExercise {
  const correctAnswer = kanji.meanings[0]
  const grade = kanji.grade ?? 8

  // Se excluye cualquier significado igual al correcto: 事 y 物 son sinonimos
  // ("cosa") y una opcion identica a la correcta no se puede responder.
  const others = catalog.kanji.filter(
    (other) => other.id !== kanji.id && other.meanings[0] !== correctAnswer,
  )

  /*
   * Alternativas inteligentes: dos kanji con el mismo radical se confunden a
   * simple vista aunque sean de grados distintos -未/末, 士/土-, y esa es la
   * confusion real que vale la pena entrenar. Sin radical en comun, se cae al
   * mismo grado escolar como antes: mezclar 一 con un kanji de secundaria no
   * mide nada.
   */
  const confusablePool = kanji.radical
    ? others.filter((other) => other.radical?.number === kanji.radical!.number).map((other) => other.meanings[0])
    : []
  const fallbackPool = others.filter((other) => (other.grade ?? 8) === grade).map((other) => other.meanings[0])

  let seed = seedOf(kanji.learningItemId)
  const confusable = pickDistinct(confusablePool, OPTIONS_PER_ITEM - 1, seed)
  seed = confusable.seed
  const fallback = pickDistinct(
    fallbackPool.filter((text) => !confusable.picked.includes(text)),
    OPTIONS_PER_ITEM - 1 - confusable.picked.length,
    seed,
  )
  const distractors = [...confusable.picked, ...fallback.picked]
  const confusableSet = new Set(confusable.picked)

  const texts = shuffle([correctAnswer, ...distractors], kanji.learningItemId)

  return {
    id: `${KANJI_EXERCISE_PREFIX}${kanji.id}`,
    type: 'MULTIPLE_CHOICE',
    difficulty: 'BEGINNER',
    prompt: `¿Qué significa ${kanji.symbol}?`,
    body: null,
    correctAnswer,
    learningItemId: kanji.learningItemId,
    learningItemType: 'KANJI',
    mistakeType: 'WRONG_MEANING',
    errorType: 'KANJI_MEANING_RECALL',
    feedbackId: null,
    audioNormalId: null,
    audioSlowId: null,
    audioText: kanji.symbol,
    srsCategory: 'CORE_VOCABULARY',
    contentCategory: 'CORE',
    appearsInCheckpoint: false,
    entersSrs: true,
    isPreviewOnly: false,
    isEvaluable: true,
    tags: ['practica-kanji'],
    criticalTags: [],
    referencedItems: [{ type: 'KANJI', id: kanji.learningItemId }],
    options: texts.map((text, index) => ({
      id: `${KANJI_EXERCISE_PREFIX}${kanji.id}-${index}`,
      text,
      distractorReason:
        text === correctAnswer
          ? null
          : confusableSet.has(text)
            ? 'Comparte radical con el kanji correcto: se confunden a simple vista.'
            : 'Ese es el significado de otro kanji.',
      referencedItemId: null,
    })),
  }
}

/** Reconstruye el ejercicio desde su id, para que el repaso pueda mostrarlo. */
export function kanjiExerciseFromId(
  exerciseId: string,
  catalog: KanjiCatalog | null,
): ContentExercise | null {
  if (!catalog || !isKanjiExerciseId(exerciseId)) return null
  const kanjiId = exerciseId.slice(KANJI_EXERCISE_PREFIX.length)
  const kanji = catalog.kanji.find((item) => item.id === kanjiId)
  return kanji ? buildKanjiExercise(kanji, catalog) : null
}
