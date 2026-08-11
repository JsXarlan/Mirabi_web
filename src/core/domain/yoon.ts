import type { CharacterScript } from '../content/types'

/**
 * Tabla de yoon (きゃ, しゃ, ちゃ...): un kana consonante + や/ゆ/よ pequeño.
 *
 * No existen como filas propias del catalogo (ver isPracticableGroup en
 * content/types.ts) porque no tienen trazos propios: se practican como el par
 * de un kana base ya existente + uno de los 4 kana pequenos agregados en
 * characters.json (small-ya/yu/yo). El romaji combinado no es la
 * concatenacion de los dos romaji sueltos -shi+ya da "sha", no "shiya"-, asi
 * que la tabla esta curada a mano fila por fila.
 */

interface YoonRow {
  baseRomaji: string
  ya: string
  yu: string
  yo: string
}

/** Las 11 filas estandar del yoon: seion, dakuten (g/z/b) y handakuten (p). */
const YOON_ROWS: YoonRow[] = [
  { baseRomaji: 'ki', ya: 'kya', yu: 'kyu', yo: 'kyo' },
  { baseRomaji: 'shi', ya: 'sha', yu: 'shu', yo: 'sho' },
  { baseRomaji: 'chi', ya: 'cha', yu: 'chu', yo: 'cho' },
  { baseRomaji: 'ni', ya: 'nya', yu: 'nyu', yo: 'nyo' },
  { baseRomaji: 'hi', ya: 'hya', yu: 'hyu', yo: 'hyo' },
  { baseRomaji: 'mi', ya: 'mya', yu: 'myu', yo: 'myo' },
  { baseRomaji: 'ri', ya: 'rya', yu: 'ryu', yo: 'ryo' },
  { baseRomaji: 'gi', ya: 'gya', yu: 'gyu', yo: 'gyo' },
  { baseRomaji: 'ji', ya: 'ja', yu: 'ju', yo: 'jo' },
  { baseRomaji: 'bi', ya: 'bya', yu: 'byu', yo: 'byo' },
  { baseRomaji: 'pi', ya: 'pya', yu: 'pyu', yo: 'pyo' },
]

const SMALL_Y: Array<{ key: 'ya' | 'yu' | 'yo'; symbolName: 'ya' | 'yu' | 'yo' }> = [
  { key: 'ya', symbolName: 'ya' },
  { key: 'yu', symbolName: 'yu' },
  { key: 'yo', symbolName: 'yo' },
]

const SCRIPTS: CharacterScript[] = ['HIRAGANA', 'KATAKANA']

export interface YoonCombination {
  id: string
  baseCharacterId: string
  smallCharacterId: string
  romaji: string
  script: CharacterScript
}

function scriptSlug(script: CharacterScript): 'hiragana' | 'katakana' {
  return script === 'HIRAGANA' ? 'hiragana' : 'katakana'
}

function buildYoonCombinations(): YoonCombination[] {
  const combinations: YoonCombination[] = []
  for (const script of SCRIPTS) {
    const slug = scriptSlug(script)
    for (const row of YOON_ROWS) {
      for (const { key, symbolName } of SMALL_Y) {
        combinations.push({
          id: `yoon-${slug}-${row[key]}`,
          baseCharacterId: `kana-${slug}-${row.baseRomaji}`,
          smallCharacterId: `kana-${slug}-small-${symbolName}`,
          romaji: row[key],
          script,
        })
      }
    }
  }
  return combinations
}

/** 11 filas x 3 (ya/yu/yo) x 2 scripts = 66 combinaciones. */
export const YOON_COMBINATIONS: YoonCombination[] = buildYoonCombinations()

export function yoonCombinationsByScript(script: CharacterScript): YoonCombination[] {
  return YOON_COMBINATIONS.filter((combo) => combo.script === script)
}
