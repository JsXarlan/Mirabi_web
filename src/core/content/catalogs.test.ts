import { describe, expect, it } from 'vitest'

import { validateCatalog, validateKanjiCatalog, validateWordCatalog } from './validate'
import {
  buildKanjiIndex,
  buildWordIndex,
  cleanReading,
  findKanji,
  findWords,
  wordsByScript,
} from './loader'
import { characterCatalog, coursePack, kanjiCatalog, wordCatalog } from '../../test/content'

/**
 * Los catalogos de palabras y kanji, comprobados contra los ficheros reales que
 * sirve la app.
 *
 * Buena parte de lo que hay aqui vigila al exportador de Kotlin, no al
 * contenido: relaciones derivadas que tienen que cuadrar con las autoradas, e
 * ids que tienen que seguir siendo los mismos que usa el curso. Si un dia dejan
 * de cuadrar, el fallo estara alli y conviene que lo diga por su nombre.
 */

describe('catálogos servidos', () => {
  it('los tres pasan su validación', () => {
    expect(validateCatalog(characterCatalog).errors).toEqual([])
    expect(validateWordCatalog(wordCatalog, characterCatalog).errors).toEqual([])
    expect(validateKanjiCatalog(kanjiCatalog, wordCatalog).errors).toEqual([])
  })

  it('viajan versionados, para poder detectar uno servido a medias', () => {
    for (const catalog of [characterCatalog, wordCatalog, kanjiCatalog]) {
      expect(typeof catalog.schemaVersion).toBe('number')
      expect(catalog.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(catalog.checksum.length).toBeGreaterThan(0)
    }
  })
})

describe('palabras', () => {
  it('ninguna dice ser de un script que no es un silabario', () => {
    for (const word of wordCatalog.words) {
      expect(word.script, `${word.id} declara KANJI`).not.toBe('KANJI')
    }
  })

  it('el script sale de la lectura, no de la forma escrita', () => {
    const katakana = /[゠-ヿ]/
    for (const word of wordCatalog.words) {
      const esperado = katakana.test(word.kana) ? 'KATAKANA' : 'HIRAGANA'
      expect(word.script, `${word.id} (${word.kana})`).toBe(esperado)
    }
  })

  it('cada palabra reparte en un solo apartado', () => {
    const hiragana = wordsByScript(wordCatalog, 'HIRAGANA')
    const katakana = wordsByScript(wordCatalog, 'KATAKANA')

    expect(hiragana.length + katakana.length).toBe(wordCatalog.words.length)
    expect(hiragana.some((word) => katakana.includes(word))).toBe(false)
  })

  it('los kana que declara existen en el catálogo de caracteres', () => {
    const ids = new Set(characterCatalog.characters.map((character) => character.id))
    let comprobados = 0

    for (const word of wordCatalog.words) {
      for (const id of word.kanaCharacterIds) {
        expect(ids.has(id), `${word.id} apunta a ${id}`).toBe(true)
        comprobados += 1
      }
    }
    // Si el exportador dejara de derivarlos, esto quedaria en cero sin fallar.
    expect(comprobados).toBeGreaterThan(0)
  })

  it('los kanji que declara existen en el catálogo de kanji', () => {
    const ids = new Set(kanjiCatalog.kanji.map((item) => item.id))
    for (const word of wordCatalog.words) {
      for (const id of word.kanjiIds) {
        expect(ids.has(id), `${word.id} apunta a ${id}`).toBe(true)
      }
    }
  })

  it('ningún learningItemId se repite: dos palabras no pueden compartir progreso', () => {
    const ids = wordCatalog.words.map((word) => word.learningItemId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('la palabra que comparte id con el curso comparte también el elemento', () => {
    const delCurso = new Set(
      coursePack.lessons
        .flatMap((lesson) => lesson.exercises)
        .filter((exercise) => exercise.learningItemType === 'VOCABULARY')
        .map((exercise) => exercise.learningItemId),
    )

    const compartidas = wordCatalog.words.filter((word) => delCurso.has(word.learningItemId))
    // La semilla incluye neko y anime justamente para ejercitar este camino.
    expect(compartidas.length).toBeGreaterThan(0)
  })

  it('se busca por japonés, por romaji y por significado', () => {
    const porRomaji = findWords(wordCatalog, 'yama')
    expect(porRomaji.map((word) => word.id)).toContain('word-yama')

    const porSignificado = findWords(wordCatalog, 'agua')
    expect(porSignificado.map((word) => word.id)).toContain('word-mizu')

    const porKana = findWords(wordCatalog, 'やま')
    expect(porKana.map((word) => word.id)).toContain('word-yama')

    // Sin consulta se devuelve todo, que es lo que espera una lista al abrirse.
    expect(findWords(wordCatalog, '  ')).toHaveLength(wordCatalog.words.length)
  })

  it('el índice encuentra por sus dos identidades', () => {
    const index = buildWordIndex(wordCatalog)
    const word = wordCatalog.words[0]

    expect(index.byId.get(word.id)).toBe(word)
    expect(index.byLearningItemId.get(word.learningItemId)).toBe(word)
  })
})

describe('kanji', () => {
  it('todos traen trazos, significado y alguna lectura', () => {
    for (const item of kanjiCatalog.kanji) {
      expect(item.strokeCount, item.id).toBeGreaterThanOrEqual(1)
      expect(item.meanings.length, item.id).toBeGreaterThan(0)
      expect(item.onyomi.length + item.kunyomi.length, item.id).toBeGreaterThan(0)
    }
  })

  it('el id es el punto de código de su símbolo', () => {
    for (const item of kanjiCatalog.kanji) {
      const esperado = `kanji-${item.symbol.codePointAt(0)!.toString(16)}`
      expect(item.id).toBe(esperado)
    }
  })

  it('las lecturas on van siempre en katakana', () => {
    // cleanReading quita las marcas de KANJIDIC2: el punto separa la okurigana
    // (ひと.つ) y el guion marca la posicion de un afijo (-び).
    const katakana = /^[゠-ヿ]+$/

    for (const item of kanjiCatalog.kanji) {
      for (const lectura of item.onyomi) {
        expect(katakana.test(cleanReading(lectura.kana)), `${item.symbol} on ${lectura.kana}`).toBe(
          true,
        )
      }
    }
  })

  it('las lecturas kun van en hiragana salvo un puñado de ateji', () => {
    const hiragana = /^[぀-ゟー]+$/
    const kana = /^[぀-ゟ゠-ヿー]+$/

    const excepciones: string[] = []
    for (const item of kanjiCatalog.kanji) {
      for (const lectura of item.kunyomi) {
        const limpia = cleanReading(lectura.kana)
        // Kana siempre; el silabario concreto admite excepciones.
        expect(kana.test(limpia), `${item.symbol} kun ${lectura.kana}`).toBe(true)
        if (!hiragana.test(limpia)) excepciones.push(`${item.symbol} ${lectura.kana}`)
      }
    }

    /*
     * KANJIDIC2 marca como kun algunas lecturas en katakana: son ateji de
     * unidades extranjeras (志 shilling, 粉 decimetro). Se fija el numero en vez
     * de afirmar que no existen, que era falso, para enterarse si un dia crecen.
     */
    expect(excepciones.length).toBeLessThanOrEqual(5)
  })

  it('el catálogo importado es el jōyō completo, agrupado por grado escolar', () => {
    // Las cifras oficiales del joyo: 1.026 de primaria y 1.110 de secundaria.
    const porGrado = new Map<number, number>()
    for (const item of kanjiCatalog.kanji) {
      if (item.grade === null) continue
      porGrado.set(item.grade, (porGrado.get(item.grade) ?? 0) + 1)
    }

    expect(kanjiCatalog.kanji.length).toBe(2136)
    expect([...porGrado.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 8])
    expect(porGrado.get(1)).toBe(80)
    expect(porGrado.get(8)).toBe(1110)
  })

  it('lo importado declara su procedencia y su licencia', () => {
    const importados = kanjiCatalog.kanji.filter((item) => item.source === 'JMDICT')
    expect(importados.length).toBeGreaterThan(0)

    for (const item of importados) {
      // La licencia de KANJIDIC2 exige reconocimiento: si viaja por entrada, no
      // se puede perder al recortar el catalogo.
      expect(item.license, item.id).toBeTruthy()
      expect(item.sourceRef, item.id).toBeTruthy()
    }
  })

  it('el significado en español cubre casi todo, y lo que no queda marcado', () => {
    const enEspanol = kanjiCatalog.kanji.filter((item) => item.meaningsLanguage === 'ES')
    const enIngles = kanjiCatalog.kanji.filter((item) => item.meaningsLanguage === 'EN')

    expect(enEspanol.length + enIngles.length).toBe(kanjiCatalog.kanji.length)
    // Medido sobre el fichero real: 2.063 de 2.136.
    expect(enEspanol.length / kanjiCatalog.kanji.length).toBeGreaterThan(0.95)
    // Los que caen al inglés quedan marcados para poder repasarlos.
    for (const item of enIngles) expect(item.meaningsLanguage).toBe('EN')
  })

  it('wordIds es el inverso exacto de kanjiIds', () => {
    const esperado = new Map<string, Set<string>>()
    for (const word of wordCatalog.words) {
      for (const kanjiId of word.kanjiIds) {
        if (!esperado.has(kanjiId)) esperado.set(kanjiId, new Set())
        esperado.get(kanjiId)!.add(word.id)
      }
    }

    for (const item of kanjiCatalog.kanji) {
      const declarado = [...(esperado.get(item.id) ?? [])].sort()
      expect([...item.wordIds].sort(), `${item.symbol} (${item.id})`).toEqual(declarado)
    }
  })

  it('se busca por símbolo, por significado y por lectura en kana', () => {
    expect(findKanji(kanjiCatalog, '山').map((item) => item.id)).toContain('kanji-5c71')
    expect(findKanji(kanjiCatalog, 'agua').map((item) => item.id)).toContain('kanji-6c34')
    expect(findKanji(kanjiCatalog, 'やま').map((item) => item.id)).toContain('kanji-5c71')
  })

  it('se busca también por romaji, que KANJIDIC2 no trae y la app deriva', () => {
    const index = buildKanjiIndex(kanjiCatalog, characterCatalog)

    // Sin el índice no hay romaji que buscar: KANJIDIC2 solo da kana.
    expect(findKanji(kanjiCatalog, 'yama').map((item) => item.id)).not.toContain('kanji-5c71')
    expect(findKanji(kanjiCatalog, 'yama', index.romajiById).map((item) => item.id)).toContain(
      'kanji-5c71',
    )
    expect(index.romajiById.size).toBeGreaterThan(kanjiCatalog.kanji.length * 0.9)
  })

  it('el índice agrupa por grado escolar, en orden', () => {
    const index = buildKanjiIndex(kanjiCatalog)

    expect(index.grades).toEqual([...index.grades].sort((a, b) => a - b))
    for (const grade of index.grades) expect(grade).toBeGreaterThanOrEqual(1)

    const item = kanjiCatalog.kanji[0]
    expect(index.byId.get(item.id)).toBe(item)
    expect(index.bySymbol.get(item.symbol)).toBe(item)
  })
})
