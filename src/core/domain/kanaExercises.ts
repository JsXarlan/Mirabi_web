import { isPracticableGroup, type CharacterCatalog, type ContentExercise, type KanaCharacter } from '../content/types'
import { pickDistinct, seedOf, shuffle } from './seededRandom'

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
  const others = catalog.characters.filter(
    (other) =>
      other.script === character.script &&
      other.romaji !== character.romaji &&
      isPracticableGroup(other.group),
  )

  /*
   * Alternativas inteligentes: dentro de una fila del silabario (か-き-く-け-こ)
   * la unica diferencia es la vocal, que es exactamente donde se confunde de
   * verdad -el mismo patron que ya usan las lecciones curadas para "e" vs "i".
   * Fuera de la fila, cualquier otro caracter mide mucho menos.
   */
  const confusablePool = others
    .filter((other) => other.group === character.group)
    .map((other) => other.romaji)
  const fallbackPool = others.map((other) => other.romaji)

  let seed = seedOf(character.learningItemId)
  const confusable = pickDistinct(confusablePool, OPTIONS_PER_ITEM - 1, seed)
  seed = confusable.seed
  const fallback = pickDistinct(
    fallbackPool.filter((text) => !confusable.picked.includes(text)),
    OPTIONS_PER_ITEM - 1 - confusable.picked.length,
    seed,
  )
  const distractors = [...confusable.picked, ...fallback.picked]
  const confusableSet = new Set(confusable.picked)

  const texts = shuffle([character.romaji, ...distractors], character.learningItemId)

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
      distractorReason:
        text === character.romaji
          ? null
          : confusableSet.has(text)
            ? 'Comparte fila con el correcto: solo cambia la vocal.'
            : 'Ese es el sonido de otro carácter.',
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
