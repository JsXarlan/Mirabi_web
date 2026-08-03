import type { CharacterCatalog, RomajiPolicy } from '../content/types'
import type { MasteryScore } from './models'

/**
 * Romaji progresivo.
 *
 * El curso declara en cada leccion cuanto romaji debe verse (`romajiPolicy`),
 * porque la muleta que ayuda el primer dia impide leer el decimo. Aqui vive esa
 * decision y la transliteracion que la alimenta, construida con el propio
 * catalogo de kana en vez de con una tabla paralela que pueda desincronizarse.
 */

const KANA_RANGE = /[぀-ヿ]/
const SMALL_VOWELS: Record<string, string> = { ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ャ: 'ya', ュ: 'yu', ョ: 'yo' }
const SMALL_TSU = new Set(['っ', 'ッ'])
const LONG_MARK = 'ー'

export function hasKana(text: string | null | undefined): boolean {
  return typeof text === 'string' && KANA_RANGE.test(text)
}

let cachedCatalog: CharacterCatalog | null = null
let cachedMap: Map<string, string> | null = null

function symbolMap(catalog: CharacterCatalog): Map<string, string> {
  if (cachedCatalog === catalog && cachedMap) return cachedMap
  cachedMap = new Map(catalog.characters.map((character) => [character.symbol, character.romaji]))
  cachedCatalog = catalog
  return cachedMap
}

/**
 * Transcribe kana a romaji. Devuelve null si el texto no tiene kana, para que
 * quien llama no tenga que comprobarlo antes.
 *
 * Cubre lo que el MVP usa: silabas del catalogo, combinaciones con ya/yu/yo,
 * sokuon (っ duplica la consonante siguiente) y alargamiento con ー.
 */
export function toRomaji(text: string, catalog: CharacterCatalog | null): string | null {
  if (!catalog || !hasKana(text)) return null
  const map = symbolMap(catalog)
  const characters = [...text]
  let out = ''

  for (let i = 0; i < characters.length; i += 1) {
    const character = characters[i]
    const next = characters[i + 1]

    if (SMALL_TSU.has(character)) {
      const following = next ? map.get(next) : undefined
      if (following) out += following[0]
      continue
    }

    if (character === LONG_MARK) {
      const previous = out.at(-1)
      if (previous && 'aiueo'.includes(previous)) out += previous
      continue
    }

    const syllable = map.get(character)
    if (!syllable) {
      out += character
      continue
    }

    // Combinacion: きゃ = ki + ya menos la i.
    if (next && SMALL_VOWELS[next] && syllable.length > 1 && syllable.endsWith('i')) {
      out += syllable.slice(0, -1) + SMALL_VOWELS[next]
      i += 1
      continue
    }

    out += syllable
  }

  return out
}

export interface RomajiDecision {
  visible: boolean
  /** Aviso editorial cuando la lectura no es la literal (は como partícula). */
  note: string | null
}

/**
 * Resuelve la politica de la leccion contra lo que la persona ya domina.
 *
 * HIDE_BY_MASTERY es la unica que mira el progreso: mientras el elemento no
 * llega a LEARNING la muleta sigue; a partir de ahi se retira sola.
 */
export function resolveRomaji(
  policy: RomajiPolicy,
  mastery: MasteryScore,
  hasFailedHere: boolean,
): RomajiDecision {
  switch (policy) {
    case 'VISIBLE_FIRST_EXPOSURE':
      return { visible: true, note: null }
    case 'SHOW_AFTER_ERROR':
      return { visible: hasFailedHere, note: null }
    case 'HIDE_BY_MASTERY':
      return { visible: mastery === 'UNKNOWN' || mastery === 'FAMILIAR', note: null }
    case 'SPECIAL_PARTICLE_READING':
      return {
        visible: true,
        note: 'Como partícula, は se lee «wa» y へ se lee «e».',
      }
    case 'NONE':
      return { visible: false, note: null }
  }
}
