import type { CharacterCatalog, CoursePack, KanjiCatalog, WordCatalog } from './types'
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

  errors.push(...schemaErrors('El catálogo de caracteres', catalog.schemaVersion))

  return { ok: errors.length === 0, errors: errors.slice(0, 5) }
}

function schemaErrors(what: string, schemaVersion: number): string[] {
  if (typeof schemaVersion !== 'number') return [`${what} no declara schemaVersion.`]
  if (schemaVersion > SUPPORTED_SCHEMA_VERSION) {
    return [
      `${what} usa el esquema v${schemaVersion} y esta versión de Mirabi entiende hasta la v${SUPPORTED_SCHEMA_VERSION}.`,
    ]
  }
  return []
}

/*
 * Palabras y kanji se validan aparte y su fallo NO es fatal.
 *
 * El curso es el producto; la biblioteca es un complemento. Un words.json roto
 * debe apagar la biblioteca, no dejar a la persona sin poder estudiar. Por eso
 * estas dos no alimentan setContentError.
 */

export function validateWordCatalog(
  catalog: WordCatalog,
  characters: CharacterCatalog | null,
): ContentValidation {
  const errors: string[] = []

  errors.push(...schemaErrors('El catálogo de palabras', catalog.schemaVersion))
  if (catalog.words.length === 0) errors.push('El catálogo de palabras está vacío.')

  const ids = new Set(catalog.words.map((word) => word.id))
  if (ids.size !== catalog.words.length) errors.push('Hay palabras con el mismo id.')

  const learningIds = new Set(catalog.words.map((word) => word.learningItemId))
  if (learningIds.size !== catalog.words.length) {
    errors.push('Hay palabras que comparten learningItemId: su progreso se mezclaría.')
  }

  for (const word of catalog.words) {
    if (word.script === 'KANJI') {
      errors.push(`La palabra ${word.id} dice ser de script KANJI, que no es un silabario.`)
    }
    if (word.meanings.length === 0) errors.push(`La palabra ${word.id} no tiene significado.`)
  }

  // Integridad referencial con el catalogo de caracteres, cuando se puede.
  if (characters) {
    const characterIds = new Set(characters.characters.map((character) => character.id))
    for (const word of catalog.words) {
      for (const id of word.kanaCharacterIds) {
        if (!characterIds.has(id)) {
          errors.push(`La palabra ${word.id} apunta al carácter ${id}, que no existe.`)
        }
      }
    }
  }

  return { ok: errors.length === 0, errors: errors.slice(0, 5) }
}

export function validateKanjiCatalog(
  catalog: KanjiCatalog,
  words: WordCatalog | null,
): ContentValidation {
  const errors: string[] = []

  errors.push(...schemaErrors('El catálogo de kanji', catalog.schemaVersion))

  const ids = new Set(catalog.kanji.map((item) => item.id))
  if (ids.size !== catalog.kanji.length) errors.push('Hay kanji con el mismo id.')

  for (const item of catalog.kanji) {
    if (item.meanings.length === 0) errors.push(`El kanji ${item.id} no tiene significado.`)
    if (item.strokeCount < 1) errors.push(`El kanji ${item.id} declara ${item.strokeCount} trazos.`)
    if (item.onyomi.length === 0 && item.kunyomi.length === 0) {
      errors.push(`El kanji ${item.id} no tiene ninguna lectura.`)
    }
  }

  /*
   * La relacion palabra-kanji se autora en una sola direccion y el exportador
   * deriva la otra. Si dejan de coincidir, el fallo esta en el exportador y no
   * en el contenido, asi que conviene detectarlo por su nombre.
   */
  if (words) {
    const wordIds = new Set(words.words.map((word) => word.id))
    const expected = new Map<string, Set<string>>()
    for (const word of words.words) {
      for (const kanjiId of word.kanjiIds) {
        if (!expected.has(kanjiId)) expected.set(kanjiId, new Set())
        expected.get(kanjiId)!.add(word.id)
      }
    }

    for (const item of catalog.kanji) {
      for (const id of item.wordIds) {
        if (!wordIds.has(id)) errors.push(`El kanji ${item.id} apunta a la palabra ${id}, que no existe.`)
      }
      const declared = expected.get(item.id) ?? new Set<string>()
      if (declared.size !== item.wordIds.length) {
        errors.push(
          `El kanji ${item.id} lista ${item.wordIds.length} palabras y las palabras declaran ${declared.size}.`,
        )
      }
    }
  }

  return { ok: errors.length === 0, errors: errors.slice(0, 5) }
}
