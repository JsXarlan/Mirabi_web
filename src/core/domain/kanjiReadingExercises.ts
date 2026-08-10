import { cleanReading } from '../content/loader'
import type { ContentExercise, KanjiCatalog, KanjiCharacter, VocabularyWord, WordCatalog } from '../content/types'
import { pickDistinct, seedOf, shuffle } from './seededRandom'

/**
 * Ejercicios de lectura de kanji, pero solo dentro de una palabra concreta.
 *
 * kanjiExercises.ts explica por que un kanji aislado no tiene una lectura
 * "correcta" unica: on'yomi en compuestos, kun'yomi en palabras nativas, y las
 * dos son validas segun el contexto. Dentro de una palabra especifica esa
 * ambiguedad desaparece -高い solo se lee «たかい», nunca con on'yomi-, asi que
 * aca si hay una respuesta inequivoca que preguntar.
 *
 * Acotado a palabras de un solo kanji (word.kanjiIds.length === 1): en un
 * compuesto de dos o mas kanji (熟語) no hay forma fiable de saber, solo con
 * los datos de KANJIDIC2, que porcion de la lectura de la palabra le
 * corresponde a cada kanji por separado -eso pertenece a jukugoExercises.ts,
 * que pregunta la palabra entera, no un trozo suyo-.
 */

export const KANJI_READING_EXERCISE_PREFIX = 'kanji-reading-'

const OPTIONS_PER_ITEM = 4

export function isKanjiReadingExerciseId(exerciseId: string): boolean {
  return exerciseId.startsWith(KANJI_READING_EXERCISE_PREFIX)
}

/**
 * Katakana → hiragana por punto de código: el bloque básico de katakana esta
 * desplazado +0x60 respecto al de hiragana. Hace falta porque KANJIDIC2 marca
 * el on'yomi en katakana (ホン) y `word.kana` va en hiragana (ほん) aunque sea
 * esa misma lectura -sin esto, todo kanji que solo se usara con su on'yomi en
 * una palabra de un simbolo habria quedado fuera, no por ambiguo sino por una
 * comparacion entre alfabetos distintos-.
 */
function toHiragana(text: string): string {
  return [...text]
    .map((char) => {
      const code = char.codePointAt(0)!
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : char
    })
    .join('')
}

/** La parte de la lectura que es del kanji: KANJIDIC2 separa la okurigana con un punto (たか.い). */
function baseReading(kana: string): string {
  return toHiragana(cleanReading(kana.split('.')[0]))
}

/**
 * La lectura de `kanji` tal como aparece en `word.kana`, o null si ninguna de
 * sus lecturas registradas explica el principio de la palabra -mejor no
 * preguntar que preguntar con una respuesta inventada-. Cubre formas
 * honorificas (おとうさん) que no salen de ninguna lectura registrada: esas
 * quedan fuera a proposito, no es un caso que se le escapo a la funcion.
 */
export function readingInWord(kanji: KanjiCharacter, word: VocabularyWord): string | null {
  const wordKana = toHiragana(word.kana)
  const bases = [...kanji.kunyomi, ...kanji.onyomi].map((reading) => baseReading(reading.kana)).filter(Boolean)

  const exact = bases.find((base) => base === wordKana)
  if (exact) return exact

  // El prefijo mas largo que calza es el mejor candidato: una lectura corta
  // que coincide con el inicio por casualidad no deberia ganarle a la que de
  // verdad se está usando.
  const prefixes = bases.filter((base) => wordKana.startsWith(base))
  if (prefixes.length === 0) return null
  return [...prefixes].sort((a, b) => b.length - a.length)[0]
}

/** Palabras de un solo kanji cuya lectura en contexto se puede determinar sin ambigüedad. */
export function readableInContext(
  kanjiCatalog: KanjiCatalog,
  wordCatalog: WordCatalog,
): { kanji: KanjiCharacter; word: VocabularyWord }[] {
  const kanjiById = new Map(kanjiCatalog.kanji.map((item) => [item.id, item]))
  const pairs: { kanji: KanjiCharacter; word: VocabularyWord }[] = []

  for (const word of wordCatalog.words) {
    if (word.kanjiIds.length !== 1) continue
    const kanji = kanjiById.get(word.kanjiIds[0])
    if (!kanji) continue
    if (readingInWord(kanji, word) !== null) pairs.push({ kanji, word })
  }

  return pairs
}

export function buildKanjiReadingExercise(
  kanji: KanjiCharacter,
  word: VocabularyWord,
  kanjiCatalog: KanjiCatalog,
): ContentExercise | null {
  const correctAnswer = readingInWord(kanji, word)
  if (!correctAnswer) return null

  // Distractor preferido: otra lectura del mismo kanji (on en vez de kun, o
  // viceversa). Es la confusion real -saber que 高 tiene dos lecturas y no
  // saber cual toca aca- y vale mas entrenarla que una lectura cualquiera.
  const ownOtherReadings = [
    ...new Set(
      [...kanji.onyomi, ...kanji.kunyomi]
        .map((reading) => baseReading(reading.kana))
        .filter((base) => base && base !== correctAnswer),
    ),
  ]

  const otherReadings = [
    ...new Set(
      kanjiCatalog.kanji
        .filter((other) => other.id !== kanji.id)
        .flatMap((other) => [...other.onyomi, ...other.kunyomi])
        .map((reading) => baseReading(reading.kana))
        .filter((base) => base && base !== correctAnswer),
    ),
  ]

  let seed = seedOf(`${kanji.learningItemId}-${word.id}`)
  const own = pickDistinct(ownOtherReadings, OPTIONS_PER_ITEM - 1, seed)
  seed = own.seed
  const fallback = pickDistinct(
    otherReadings.filter((text) => !own.picked.includes(text)),
    OPTIONS_PER_ITEM - 1 - own.picked.length,
    seed,
  )
  const distractors = [...own.picked, ...fallback.picked]
  const ownSet = new Set(own.picked)

  const texts = shuffle([correctAnswer, ...distractors], `${kanji.learningItemId}-${word.id}`)

  return {
    id: `${KANJI_READING_EXERCISE_PREFIX}${kanji.id}-${word.id}`,
    type: 'MULTIPLE_CHOICE',
    difficulty: 'BEGINNER',
    prompt: `¿Cómo se lee ${kanji.symbol} en ${word.lemma}?`,
    body: null,
    correctAnswer,
    learningItemId: kanji.learningItemId,
    learningItemType: 'KANJI',
    mistakeType: 'WRONG_READING',
    errorType: 'KANJI_READING_IN_CONTEXT',
    feedbackId: null,
    audioNormalId: null,
    audioSlowId: null,
    audioText: word.audioText ?? word.lemma,
    srsCategory: 'CORE_VOCABULARY',
    contentCategory: 'CORE',
    appearsInCheckpoint: false,
    entersSrs: true,
    isPreviewOnly: false,
    isEvaluable: true,
    tags: ['practica-kanji', 'lectura-en-contexto'],
    criticalTags: [],
    referencedItems: [
      { type: 'KANJI', id: kanji.learningItemId },
      { type: 'VOCABULARY', id: word.learningItemId },
    ],
    options: texts.map((text, index) => ({
      id: `${KANJI_READING_EXERCISE_PREFIX}${kanji.id}-${word.id}-${index}`,
      text,
      distractorReason:
        text === correctAnswer
          ? null
          : ownSet.has(text)
            ? 'Es otra lectura del mismo kanji, pero no la que usa esta palabra.'
            : 'Es la lectura de otro kanji.',
      referencedItemId: null,
    })),
  }
}

/** Reconstruye el ejercicio desde su id, para que el repaso pueda mostrarlo. */
export function kanjiReadingExerciseFromId(
  exerciseId: string,
  kanjiCatalog: KanjiCatalog | null,
  wordCatalog: WordCatalog | null,
): ContentExercise | null {
  if (!kanjiCatalog || !wordCatalog || !isKanjiReadingExerciseId(exerciseId)) return null
  const rest = exerciseId.slice(KANJI_READING_EXERCISE_PREFIX.length)
  // El id de la palabra puede traer guiones, asi que se ubica el kanji-id
  // buscando el prefijo comun a ambos catalogos en vez de partir por «-».
  const kanji = kanjiCatalog.kanji.find((item) => rest.startsWith(`${item.id}-`))
  if (!kanji) return null
  const wordId = rest.slice(kanji.id.length + 1)
  const word = wordCatalog.words.find((item) => item.id === wordId)
  if (!word) return null
  return buildKanjiReadingExercise(kanji, word, kanjiCatalog)
}
