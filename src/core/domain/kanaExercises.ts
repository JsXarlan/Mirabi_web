import type { CharacterCatalog, ContentExercise, KanaCharacter } from '../content/types'
import { nextRandom, seedOf } from './seededRandom'

/**
 * Ejercicios de kana sinteticos.
 *
 * El catalogo de caracteres no trae ejercicios: la practica se los inventaba en
 * pantalla y escribia el progreso a mano, asi que fallar un kana practicando no
 * programaba ningun repaso mientras que fallarlo en una leccion si. Aqui se
 * fabrica un ContentExercise de verdad para que la practica entre por la misma
 * puerta que todo lo demas.
 *
 * Los distractores son deterministas a proposito: el repaso reconstruye el
 * ejercicio a partir del id, y tiene que salir la misma pregunta.
 */

export const KANA_EXERCISE_PREFIX = 'kana-practice-'

const OPTIONS_PER_ITEM = 4

export function isKanaExerciseId(exerciseId: string): boolean {
  return exerciseId.startsWith(KANA_EXERCISE_PREFIX)
}

export function buildKanaExercise(
  character: KanaCharacter,
  catalog: CharacterCatalog,
): ContentExercise {
  // Los distractores salen del mismo silabario: la confusion tiene que ser real.
  const pool = catalog.characters
    .filter((other) => other.script === character.script && other.romaji !== character.romaji)
    .map((other) => other.romaji)

  const distractors: string[] = []
  let seed = seedOf(character.learningItemId)
  while (distractors.length < OPTIONS_PER_ITEM - 1 && pool.length > 0) {
    seed = nextRandom(seed)
    const [candidate] = pool.splice(seed % pool.length, 1)
    if (!distractors.includes(candidate)) distractors.push(candidate)
  }

  const texts = [character.romaji, ...distractors]

  return {
    id: `${KANA_EXERCISE_PREFIX}${character.learningItemId}`,
    type: 'MULTIPLE_CHOICE',
    difficulty: 'BEGINNER',
    prompt: `¿Cómo se lee ${character.symbol}?`,
    body: null,
    correctAnswer: character.romaji,
    learningItemId: character.learningItemId,
    learningItemType: 'KANA',
    mistakeType: 'WRONG_READING',
    errorType: 'KANA_SOUND_ASSOCIATION',
    feedbackId: null,
    audioNormalId: null,
    audioSlowId: null,
    audioText: character.symbol,
    srsCategory: 'KANA',
    contentCategory: 'CORE',
    appearsInCheckpoint: false,
    entersSrs: true,
    isPreviewOnly: false,
    isEvaluable: true,
    tags: ['practica-kana'],
    criticalTags: [],
    referencedItems: [{ type: 'KANA', id: character.learningItemId }],
    options: texts.map((text, index) => ({
      id: `${KANA_EXERCISE_PREFIX}${character.learningItemId}-${index}`,
      text,
      distractorReason: text === character.romaji ? null : 'Ese es el sonido de otro carácter.',
      referencedItemId: null,
    })),
  }
}

/** Reconstruye el ejercicio desde su id, para que el repaso pueda mostrarlo. */
export function kanaExerciseFromId(
  exerciseId: string,
  catalog: CharacterCatalog | null,
): ContentExercise | null {
  if (!catalog || !isKanaExerciseId(exerciseId)) return null
  const learningItemId = exerciseId.slice(KANA_EXERCISE_PREFIX.length)
  const character = catalog.characters.find((item) => item.learningItemId === learningItemId)
  return character ? buildKanaExercise(character, catalog) : null
}
