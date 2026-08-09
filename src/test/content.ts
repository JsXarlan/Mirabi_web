import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type {
  CharacterCatalog,
  ContentExercise,
  CoursePack,
  KanaStrokeCatalog,
  KanjiCatalog,
  WordCatalog,
} from '../core/content/types'
import { ANSWERABLE_TYPES, isRuntimeCompatible } from '../core/content/types'
import { useMirabiStore } from '../core/store/useMirabiStore'

/**
 * Los tests corren contra el pack real que sirve la app, no contra un doble.
 * Si el contenido cambia y rompe una regla, la suite tiene que enterarse.
 */

const contentDir = join(process.cwd(), 'public', 'content')

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(join(contentDir, name), 'utf8')) as T

export const coursePack = read<CoursePack>('course.json')
export const characterCatalog = read<CharacterCatalog>('characters.json')
export const wordCatalog = read<WordCatalog>('words.json')
export const kanjiCatalog = read<KanjiCatalog>('kanji.json')
export const kanaStrokeCatalog = read<KanaStrokeCatalog>('kana-strokes.json')

/** Deja el store como recien instalado, con el contenido ya cargado. */
export function freshStore() {
  localStorage.clear()
  useMirabiStore.setState({
    ...useMirabiStore.getState(),
    onboardingCompleted: true,
    displayName: 'Test',
    theme: 'system',
    audioEnabled: true,
    subscriptionType: 'FREE',
  })
  useMirabiStore.getState().resetProgress()
  useMirabiStore.getState().setContent(coursePack, characterCatalog)
  // Los catalogos entran igual que en la app: despues del curso. Asi los tests
  // que ya existen ejercitan tambien el estado nuevo.
  useMirabiStore.getState().setWordCatalog(wordCatalog)
  useMirabiStore.getState().setKanjiCatalog(kanjiCatalog)
  return useMirabiStore.getState()
}

export function lessonById(id: string) {
  const lesson = coursePack.lessons.find((item) => item.id === id)
  if (!lesson) throw new Error(`Leccion desconocida: ${id}`)
  return lesson
}

/** Pasos corregibles de una leccion, en orden. */
export function answerableSteps(lessonId: string): ContentExercise[] {
  return lessonById(lessonId)
    .exercises.filter(isRuntimeCompatible)
    .filter((exercise) => ANSWERABLE_TYPES.has(exercise.type) && exercise.correctAnswer !== null)
}

/** Una respuesta distinta de la correcta, para provocar el fallo. */
export function wrongAnswerFor(exercise: ContentExercise): string {
  const distractor = exercise.options.find((option) => option.text !== exercise.correctAnswer)
  return distractor?.text ?? `${exercise.correctAnswer}-mal`
}
