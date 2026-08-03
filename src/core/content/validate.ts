import type { CharacterCatalog, CoursePack } from './types'
import { ANSWERABLE_TYPES, isTeachingExercise } from './types'

/**
 * Validacion del contenido al cargarlo.
 *
 * El pack lo genera otro repo y se sirve como fichero suelto: puede llegar
 * truncado por una cache a medias, o de una version del exportador que la app
 * todavia no entiende. Comprobarlo al entrar convierte un fallo raro y tardio
 * ("esta leccion no tiene pasos") en un mensaje claro en el arranque.
 */

/** Version de esquema que esta app sabe leer. */
export const SUPPORTED_SCHEMA_VERSION = 1

export interface ContentValidation {
  ok: boolean
  errors: string[]
}

export function validateCoursePack(pack: CoursePack): ContentValidation {
  const errors: string[] = []

  if (typeof pack.schemaVersion !== 'number') {
    errors.push('El pack no declara schemaVersion.')
  } else if (pack.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
    errors.push(
      `El contenido usa el esquema v${pack.schemaVersion} y esta versión de Mirabi entiende hasta la v${SUPPORTED_SCHEMA_VERSION}.`,
    )
  }

  if (pack.worlds.length === 0) errors.push('El pack no tiene mundos.')

  const unitById = new Map(pack.units.map((unit) => [unit.id, unit]))
  const lessonById = new Map(pack.lessons.map((lesson) => [lesson.id, lesson]))

  if (unitById.size !== pack.units.length) errors.push('Hay unidades con el mismo id.')
  if (lessonById.size !== pack.lessons.length) errors.push('Hay lecciones con el mismo id.')

  // Integridad referencial: un id roto se manifestaria mucho mas tarde, como
  // una unidad vacia o un camino que se corta sin motivo.
  for (const world of pack.worlds) {
    for (const unitId of world.unitIds) {
      if (!unitById.has(unitId)) errors.push(`El mundo ${world.id} apunta a la unidad ${unitId}, que no existe.`)
    }
  }
  for (const unit of pack.units) {
    for (const lessonId of unit.lessonIds) {
      if (!lessonById.has(lessonId)) {
        errors.push(`La unidad ${unit.id} apunta a la lección ${lessonId}, que no existe.`)
      }
    }
  }

  // Un ejercicio corregible sin respuesta correcta rompe la sesion al llegar.
  for (const lesson of pack.lessons) {
    for (const exercise of lesson.exercises) {
      if (isTeachingExercise(exercise)) continue
      if (ANSWERABLE_TYPES.has(exercise.type) && exercise.correctAnswer === null) {
        errors.push(`El ejercicio ${exercise.id} es corregible pero no tiene respuesta.`)
      }
    }
  }

  // Solo los primeros: una lista de trescientos errores no ayuda a nadie.
  return { ok: errors.length === 0, errors: errors.slice(0, 5) }
}

export function validateCatalog(catalog: CharacterCatalog): ContentValidation {
  const errors: string[] = []
  if (catalog.characters.length === 0) errors.push('El catálogo de caracteres está vacío.')

  const ids = new Set(catalog.characters.map((character) => character.learningItemId))
  if (ids.size !== catalog.characters.length) {
    errors.push('Hay caracteres con el mismo learningItemId.')
  }

  return { ok: errors.length === 0, errors: errors.slice(0, 5) }
}
