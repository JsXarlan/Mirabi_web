import { describe, expect, it } from 'vitest'

import { characterCatalog, kanaStrokeCatalog } from '../../test/content'
import { YOON_COMBINATIONS, yoonCombinationsByScript } from './yoon'

/** Tabla de yoon contra el catalogo real: si un id no existe, se rompe aca y no en pantalla. */

describe('YOON_COMBINATIONS', () => {
  it('tiene las 33 filas estandar x 2 scripts', () => {
    expect(YOON_COMBINATIONS).toHaveLength(66)
    expect(yoonCombinationsByScript('HIRAGANA')).toHaveLength(33)
    expect(yoonCombinationsByScript('KATAKANA')).toHaveLength(33)
  })

  it('no tiene ids repetidos', () => {
    const ids = YOON_COMBINATIONS.map((combo) => combo.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada base y kana chico resuelve a un caracter real del catalogo', () => {
    const characterIds = new Set(characterCatalog.characters.map((character) => character.id))
    for (const combo of YOON_COMBINATIONS) {
      expect(characterIds.has(combo.baseCharacterId)).toBe(true)
      expect(characterIds.has(combo.smallCharacterId)).toBe(true)
    }
  })

  it('cada base y kana chico tiene trazos cargados', () => {
    for (const combo of YOON_COMBINATIONS) {
      expect(kanaStrokeCatalog.strokes[combo.baseCharacterId]).toBeDefined()
      expect(kanaStrokeCatalog.strokes[combo.smallCharacterId]).toBeDefined()
    }
  })

  it('el kana chico pertenece al grupo COMBINATIONS', () => {
    const byId = new Map(characterCatalog.characters.map((character) => [character.id, character]))
    for (const combo of YOON_COMBINATIONS) {
      expect(byId.get(combo.smallCharacterId)?.group).toBe('COMBINATIONS')
    }
  })
})
