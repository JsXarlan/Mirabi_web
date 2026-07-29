import type { CharacterCatalog, CoursePack, KanaCharacter } from './types'

/**
 * Carga del contenido versionado. Equivalente web de CourseContentLoader:
 * el contenido vive fuera del bundle para poder regenerarlo desde Kotlin
 * sin recompilar la app.
 */

const base = import.meta.env.BASE_URL

let coursePromise: Promise<CoursePack> | null = null
let charactersPromise: Promise<CharacterCatalog> | null = null

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${base}content/${path}`)
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path} (${response.status})`)
  }
  return (await response.json()) as T
}

export function loadCoursePack(): Promise<CoursePack> {
  coursePromise ??= fetchJson<CoursePack>('course.json')
  return coursePromise
}

export function loadCharacterCatalog(): Promise<CharacterCatalog> {
  charactersPromise ??= fetchJson<CharacterCatalog>('characters.json')
  return charactersPromise
}

export interface CourseIndex {
  pack: CoursePack
  worldById: Map<string, CoursePack['worlds'][number]>
  unitById: Map<string, CoursePack['units'][number]>
  lessonById: Map<string, CoursePack['lessons'][number]>
  /** Lecciones en orden de curso: mundo -> unidad -> leccion. */
  orderedLessonIds: string[]
}

export function buildCourseIndex(pack: CoursePack): CourseIndex {
  const worldById = new Map(pack.worlds.map((world) => [world.id, world]))
  const unitById = new Map(pack.units.map((unit) => [unit.id, unit]))
  const lessonById = new Map(pack.lessons.map((lesson) => [lesson.id, lesson]))

  const orderedLessonIds: string[] = []
  for (const world of pack.worlds) {
    for (const unitId of world.unitIds) {
      const unit = unitById.get(unitId)
      if (!unit) continue
      for (const lessonId of unit.lessonIds) {
        if (lessonById.has(lessonId)) orderedLessonIds.push(lessonId)
      }
    }
  }

  return { pack, worldById, unitById, lessonById, orderedLessonIds }
}

export function charactersByScript(
  catalog: CharacterCatalog,
  script: KanaCharacter['script'],
): KanaCharacter[] {
  return catalog.characters.filter((character) => character.script === script)
}
