import { describe, expect, it } from 'vitest'

import {
  applyMissionProgress,
  completeMission,
  emptyMissionProgress,
  epochWeekOf,
  generateDailyMissions,
  generateWeeklyMissions,
} from './missions'
import type { MissionDefinition } from './models'

/** Progreso de misiones y su cobro, que paga Sakura solo la primera vez. */

const LESSON_MISSION: MissionDefinition = {
  id: 'daily_lesson',
  title: 'Completa una lección',
  description: 'Finaliza una lección',
  type: 'DAILY',
  targetType: 'COMPLETE_LESSON',
  targetValue: 1,
  rewardXp: 0,
  rewardSakura: 5,
}

describe('generateDailyMissions / generateWeeklyMissions', () => {
  it('genera las cuatro misiones diarias fijas del MVP', () => {
    const missions = generateDailyMissions()

    expect(missions.map((mission) => mission.id)).toEqual([
      'daily_lesson',
      'daily_review',
      'daily_xp',
      'daily_characters',
    ])
    expect(missions.every((mission) => mission.type === 'DAILY')).toBe(true)
  })

  it('genera las tres misiones semanales con objetivos por encima del diario', () => {
    const missions = generateWeeklyMissions()

    expect(missions.map((mission) => mission.id)).toEqual([
      'weekly_lessons',
      'weekly_reviews',
      'weekly_xp',
    ])
    expect(missions.every((mission) => mission.type === 'WEEKLY')).toBe(true)
  })
})

describe('applyMissionProgress', () => {
  it('suma el incremento sin pasar del objetivo', () => {
    expect(applyMissionProgress(0, LESSON_MISSION, 1)).toBe(1)
  })

  it('se detiene en targetValue aunque el incremento sea mayor', () => {
    const mission = { ...LESSON_MISSION, targetValue: 20 }

    expect(applyMissionProgress(18, mission, 50)).toBe(20)
  })
})

describe('completeMission', () => {
  it('paga la recompensa la primera vez que se alcanza el objetivo', () => {
    const result = completeMission(LESSON_MISSION, 1, false)

    expect(result.wasCompleted).toBe(true)
    expect(result.rewardResult?.sakuraEarned).toBe(LESSON_MISSION.rewardSakura)
  })

  it('no paga de nuevo si ya estaba completada', () => {
    const result = completeMission(LESSON_MISSION, 1, true)

    expect(result.wasCompleted).toBe(false)
    expect(result.rewardResult).toBeNull()
  })

  it('no paga si el progreso todavía no llega al objetivo', () => {
    const result = completeMission(LESSON_MISSION, 0, false)

    expect(result.wasCompleted).toBe(false)
    expect(result.rewardResult).toBeNull()
  })

  it('usa la fuente de recompensa semanal cuando la misión es WEEKLY', () => {
    const weekly: MissionDefinition = { ...LESSON_MISSION, type: 'WEEKLY', rewardSakura: 15 }

    const result = completeMission(weekly, 5, false)

    expect(result.rewardResult?.source).toBe('WEEKLY_MISSION_COMPLETED')
    expect(result.rewardResult?.sakuraEarned).toBe(15)
  })
})

describe('epochWeekOf', () => {
  it('agrupa días consecutivos de la misma semana ISO en el mismo número', () => {
    // El día epoch 0 fue jueves; con el ajuste de +3, la semana cambia el lunes.
    const thursday = 0
    const nextMonday = 4

    expect(epochWeekOf(thursday)).toBe(epochWeekOf(thursday + 1))
    expect(epochWeekOf(nextMonday)).not.toBe(epochWeekOf(thursday))
  })
})

describe('emptyMissionProgress', () => {
  it('crea un progreso vacío y sin reclamar para el día dado', () => {
    const progress = emptyMissionProgress('daily_lesson', 42)

    expect(progress).toEqual({
      missionId: 'daily_lesson',
      epochDay: 42,
      currentProgress: 0,
      completed: false,
      rewardClaimed: false,
      completedAtEpochMillis: null,
    })
  })
})
