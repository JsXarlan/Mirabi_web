import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REWARD_CONFIG,
  applyStreakShield,
  applyXpBoost,
  calculateReward,
  streakStatus,
  updateStreak,
} from './rewards'

/**
 * Corazón de XP, Sakura y racha. Sin estos casos, un cambio en el
 * calculador o en la política de racha puede alterar el progreso guardado
 * de una persona sin que ningún test lo note.
 */

describe('calculateReward', () => {
  it('lección completada da XP y Sakura base, sin bonus', () => {
    const reward = calculateReward('LESSON_COMPLETED')

    expect(reward.xpEarned).toBe(DEFAULT_REWARD_CONFIG.lessonCompletedXp)
    expect(reward.sakuraEarned).toBe(DEFAULT_REWARD_CONFIG.lessonCompletedSakura)
    expect(reward.breakdown.bonusSakura).toBe(0)
  })

  it('lección perfecta añade el bonus de Sakura por acertar todo', () => {
    const reward = calculateReward('PERFECT_LESSON')

    expect(reward.sakuraEarned).toBe(
      DEFAULT_REWARD_CONFIG.lessonCompletedSakura + DEFAULT_REWARD_CONFIG.perfectLessonBonusSakura,
    )
    expect(reward.xpEarned).toBe(DEFAULT_REWARD_CONFIG.lessonCompletedXp)
  })

  it('unidad y mundo completados no dan XP, solo Sakura', () => {
    expect(calculateReward('UNIT_COMPLETED').xpEarned).toBe(0)
    expect(calculateReward('UNIT_COMPLETED').sakuraEarned).toBe(DEFAULT_REWARD_CONFIG.unitCompletedSakura)
    expect(calculateReward('WORLD_COMPLETED').sakuraEarned).toBe(DEFAULT_REWARD_CONFIG.worldCompletedSakura)
  })

  it('el multiplicador PLUS_X2 duplica XP y Sakura por igual', () => {
    const base = calculateReward('REVIEW_COMPLETED')
    const doubled = calculateReward('REVIEW_COMPLETED', DEFAULT_REWARD_CONFIG, 'PLUS_X2')

    expect(doubled.xpEarned).toBe(base.xpEarned * 2)
    expect(doubled.sakuraEarned).toBe(base.sakuraEarned * 2)
    expect(doubled.multiplierApplied).toBe('PLUS_X2')
  })

  it('respeta una configuración de recompensas personalizada', () => {
    const config = { ...DEFAULT_REWARD_CONFIG, conversationCompletedXp: 99 }

    expect(calculateReward('CONVERSATION_COMPLETED', config).xpEarned).toBe(99)
  })
})

describe('updateStreak', () => {
  it('primera actividad registrada empieza la racha en 1', () => {
    const result = updateStreak(0, null, 100)

    expect(result.consecutiveDays).toBe(1)
    expect(result.wasReset).toBe(false)
  })

  it('actividad el mismo día no incrementa la racha', () => {
    const result = updateStreak(5, 100, 100)

    expect(result.consecutiveDays).toBe(5)
    expect(result.wasReset).toBe(false)
  })

  it('actividad al día siguiente suma uno', () => {
    const result = updateStreak(5, 100, 101)

    expect(result.consecutiveDays).toBe(6)
    expect(result.wasReset).toBe(false)
  })

  it('un hueco de más de un día reinicia la racha a 1 y marca wasReset', () => {
    const result = updateStreak(5, 100, 103)

    expect(result.consecutiveDays).toBe(1)
    expect(result.wasReset).toBe(true)
  })
})

describe('streakStatus', () => {
  it('sin actividad previa, la racha no existe', () => {
    expect(streakStatus(0, null, 100)).toEqual({ days: 0, atRisk: false, lost: false })
  })

  it('con actividad hoy, la racha está activa y sin riesgo', () => {
    expect(streakStatus(5, 100, 100)).toEqual({ days: 5, atRisk: false, lost: false })
  })

  it('con actividad ayer, la racha sigue viva pero en riesgo', () => {
    expect(streakStatus(5, 99, 100)).toEqual({ days: 5, atRisk: true, lost: false })
  })

  it('con un hueco de más de un día, la racha se muestra perdida', () => {
    expect(streakStatus(5, 90, 100)).toEqual({ days: 0, atRisk: false, lost: true })
  })
})

describe('applyStreakShield', () => {
  it('con escudos disponibles, evita el reinicio y continúa desde la racha anterior', () => {
    const streak = updateStreak(5, 100, 103) // hueco de 3 días: se habría reiniciado a 1

    const result = applyStreakShield(5, streak, 2)

    expect(result.shielded).toBe(true)
    expect(result.streakDays).toBe(6)
  })

  it('sin escudos, la racha se reinicia igual', () => {
    const streak = updateStreak(5, 100, 103)

    const result = applyStreakShield(5, streak, 0)

    expect(result.shielded).toBe(false)
    expect(result.streakDays).toBe(1)
  })

  it('no gasta el escudo si la racha no se habría perdido', () => {
    const streak = updateStreak(5, 100, 101) // día siguiente, sin hueco

    const result = applyStreakShield(5, streak, 3)

    expect(result.shielded).toBe(false)
    expect(result.streakDays).toBe(6)
  })
})

describe('applyXpBoost', () => {
  it('duplica el XP cuando la sesión consume boost y hay sesiones disponibles', () => {
    const result = applyXpBoost(10, 2, true)

    expect(result.boosted).toBe(true)
    expect(result.xpEarned).toBe(20)
  })

  it('no duplica si no quedan sesiones de boost', () => {
    const result = applyXpBoost(10, 0, true)

    expect(result.boosted).toBe(false)
    expect(result.xpEarned).toBe(10)
  })

  it('no duplica si la actividad no consume boost, aunque haya sesiones', () => {
    const result = applyXpBoost(10, 3, false)

    expect(result.boosted).toBe(false)
    expect(result.xpEarned).toBe(10)
  })

  it('sin XP ganado no marca boosted aunque haya sesiones disponibles', () => {
    const result = applyXpBoost(0, 3, true)

    expect(result.boosted).toBe(false)
    expect(result.xpEarned).toBe(0)
  })
})
