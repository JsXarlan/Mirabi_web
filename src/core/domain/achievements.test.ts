import { describe, expect, it } from 'vitest'

import { ACHIEVEMENTS, evaluateAchievements } from './achievements'
import type { AchievementSignals } from './achievements'

/** Logros: se disparan una sola vez, en el momento exacto en que se cruza el umbral. */

const ZERO: AchievementSignals = { lessons: 0, reviews: 0, conversations: 0, streak: 0, masteredKana: 0 }

describe('evaluateAchievements', () => {
  it('sin señales, no desbloquea nada', () => {
    expect(evaluateAchievements(ZERO, new Set())).toEqual([])
  })

  it('cruzar un umbral por primera vez lo devuelve como recien desbloqueado', () => {
    const signals = { ...ZERO, lessons: 1 }

    const unlocked = evaluateAchievements(signals, new Set())

    expect(unlocked.map((a) => a.id)).toEqual(['first_lesson'])
  })

  it('no vuelve a devolver un logro que ya esta en unlockedIds', () => {
    const signals = { ...ZERO, lessons: 1 }

    const unlocked = evaluateAchievements(signals, new Set(['first_lesson']))

    expect(unlocked).toEqual([])
  })

  it('cruzar varios umbrales a la vez los devuelve todos juntos', () => {
    const signals: AchievementSignals = {
      lessons: 10,
      reviews: 1,
      conversations: 0,
      streak: 3,
      masteredKana: 0,
    }

    const unlocked = evaluateAchievements(signals, new Set())

    expect(unlocked.map((a) => a.id).sort()).toEqual(
      ['first_lesson', 'ten_lessons', 'first_review', 'streak_3'].sort(),
    )
  })

  it('el umbral es inclusivo (>=), no estricto', () => {
    expect(evaluateAchievements({ ...ZERO, streak: 7 }, new Set()).map((a) => a.id)).toContain('streak_7')
    expect(evaluateAchievements({ ...ZERO, masteredKana: 71 }, new Set()).map((a) => a.id)).toContain('kana_all')
  })

  it('todos los logros tienen id unico', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
