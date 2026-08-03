import { describe, expect, it } from 'vitest'

import { hasKana, resolveRomaji, toRomaji } from './romaji'
import { characterCatalog, coursePack } from '../../test/content'

describe('transliteración de kana', () => {
  it('lee las sílabas del catálogo', () => {
    expect(toRomaji('かお', characterCatalog)).toBe('kao')
    expect(toRomaji('こんにちは', characterCatalog)).toBe('konnichiha')
    expect(toRomaji('サカナ', characterCatalog)).toBe('sakana')
  })

  it('resuelve combinaciones, sokuon y alargamiento', () => {
    // きゃ = ki + ya menos la i.
    expect(toRomaji('きゃく', characterCatalog)).toBe('kyaku')
    // っ duplica la consonante siguiente.
    expect(toRomaji('がっこう', characterCatalog)).toBe('gakkou')
    // ー alarga la vocal anterior.
    expect(toRomaji('ケーキ', characterCatalog)).toBe('keeki')
  })

  it('deja intacto lo que no es kana y no inventa lecturas', () => {
    expect(toRomaji('hola', characterCatalog)).toBeNull()
    expect(toRomaji('かお', null)).toBeNull()
    expect(hasKana('¿Cómo se lee あ?')).toBe(true)
    expect(hasKana('Como se lee esto?')).toBe(false)
  })

  it('sabe leer todo el japonés que aparece en los ejercicios del curso', () => {
    const japaneseAnswers = coursePack.lessons
      .flatMap((lesson) => lesson.exercises)
      .flatMap((exercise) => [exercise.correctAnswer, exercise.audioText])
      .filter((text): text is string => typeof text === 'string' && hasKana(text))

    expect(japaneseAnswers.length).toBeGreaterThan(0)
    for (const text of japaneseAnswers) {
      const reading = toRomaji(text, characterCatalog)
      // Si un kana no estuviera en el catalogo, saldria tal cual en la lectura.
      expect(hasKana(reading ?? ''), `sin lectura para "${text}": ${reading}`).toBe(false)
    }
  })
})

describe('política de romaji', () => {
  it('VISIBLE_FIRST_EXPOSURE siempre muestra la lectura', () => {
    expect(resolveRomaji('VISIBLE_FIRST_EXPOSURE', 'EXPERT', false).visible).toBe(true)
  })

  it('HIDE_BY_MASTERY retira la muleta al llegar a LEARNING', () => {
    expect(resolveRomaji('HIDE_BY_MASTERY', 'UNKNOWN', false).visible).toBe(true)
    expect(resolveRomaji('HIDE_BY_MASTERY', 'FAMILIAR', false).visible).toBe(true)
    expect(resolveRomaji('HIDE_BY_MASTERY', 'LEARNING', false).visible).toBe(false)
    expect(resolveRomaji('HIDE_BY_MASTERY', 'MASTERED', false).visible).toBe(false)
  })

  it('SHOW_AFTER_ERROR solo aparece tras fallar', () => {
    expect(resolveRomaji('SHOW_AFTER_ERROR', 'UNKNOWN', false).visible).toBe(false)
    expect(resolveRomaji('SHOW_AFTER_ERROR', 'UNKNOWN', true).visible).toBe(true)
  })

  it('SPECIAL_PARTICLE_READING avisa de que は se lee wa', () => {
    const decision = resolveRomaji('SPECIAL_PARTICLE_READING', 'MASTERED', false)
    expect(decision.visible).toBe(true)
    expect(decision.note).toContain('wa')
  })

  it('NONE no muestra nada', () => {
    expect(resolveRomaji('NONE', 'UNKNOWN', true).visible).toBe(false)
  })
})
