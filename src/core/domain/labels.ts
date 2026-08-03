import type { CharacterCatalog, CoursePack } from '../content/types'
import { hasKana, toRomaji } from './romaji'

/**
 * Nombre legible de un elemento de aprendizaje.
 *
 * El progreso se guarda por `learningItemId` (`vocab_kao`, `kana-hiragana-a`),
 * que sirve para el dominio pero no para enseñarselo a nadie. Este indice
 * traduce esos ids a lo que la persona reconoce: el kana, la palabra o, como
 * ultimo recurso, el id limpiado.
 */

export interface ItemLabel {
  primary: string
  secondary: string | null
}

/** `vocab_kao` -> `kao`; `kana-hiragana-a` -> `hiragana a`. */
function prettify(id: string): string {
  return id
    .replace(/^(vocab|kana|gram|grammar|conv|conversation|listening)[-_]/i, '')
    .replaceAll(/[-_]/g, ' ')
    .trim()
}

export function buildItemLabels(
  pack: CoursePack,
  catalog: CharacterCatalog | null,
): Map<string, ItemLabel> {
  const labels = new Map<string, ItemLabel>()

  // El catalogo manda para el kana: ahi el simbolo es el nombre.
  for (const character of catalog?.characters ?? []) {
    labels.set(character.learningItemId, {
      primary: character.symbol,
      secondary: character.romaji,
    })
  }

  for (const lesson of pack.lessons) {
    for (const exercise of lesson.exercises) {
      const id = exercise.learningItemId
      const existing = labels.get(id)
      const candidate = exercise.audioText ?? exercise.correctAnswer
      if (!candidate) continue

      // Se prefiere el texto japones al romaji suelto, y lo primero que aparece
      // en el curso a lo que venga despues.
      if (existing && !(hasKana(candidate) && !hasKana(existing.primary))) continue

      labels.set(id, {
        primary: candidate,
        secondary: hasKana(candidate) ? toRomaji(candidate, catalog) : null,
      })
    }
  }

  return labels
}

export function labelFor(
  labels: Map<string, ItemLabel> | null,
  learningItemId: string,
): ItemLabel {
  return labels?.get(learningItemId) ?? { primary: prettify(learningItemId), secondary: null }
}
