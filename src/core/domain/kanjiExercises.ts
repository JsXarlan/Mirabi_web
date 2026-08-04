import type { ContentExercise, KanjiCatalog, KanjiCharacter } from '../content/types'
import { nextRandom, seedOf } from './seededRandom'

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

  // Los distractores salen del mismo grado escolar: mezclar 一 con un kanji de
  // secundaria no confunde a nadie, no mide nada. Se excluye ademas cualquier
  // significado igual al correcto: 事 y 物 son sinonimos ("cosa") y una opcion
  // identica a la correcta no se puede responder.
  const pool = catalog.kanji
    .filter(
      (other) =>
        (other.grade ?? 8) === grade && other.id !== kanji.id && other.meanings[0] !== correctAnswer,
    )
    .map((other) => other.meanings[0])

  const distractors: string[] = []
  let seed = seedOf(kanji.learningItemId)
  while (distractors.length < OPTIONS_PER_ITEM - 1 && pool.length > 0) {
    seed = nextRandom(seed)
    const [candidate] = pool.splice(seed % pool.length, 1)
    if (!distractors.includes(candidate)) distractors.push(candidate)
  }

  const texts = [correctAnswer, ...distractors]

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
      distractorReason: text === correctAnswer ? null : 'Ese es el significado de otro kanji.',
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
