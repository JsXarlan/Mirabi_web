import type { MissionDefinition, MissionProgress } from './models'
import type { RewardPolicyConfig, RewardResult } from './rewards'
import { DEFAULT_REWARD_CONFIG, calculateReward } from './rewards'

/** Puerto de feature/missions/domain. */

/** DefaultDailyMissionGenerator: cuatro misiones fijas, una por eje del MVP. */
export function generateDailyMissions(
  config: RewardPolicyConfig = DEFAULT_REWARD_CONFIG,
): MissionDefinition[] {
  const reward = config.dailyMissionSakura
  return [
    {
      id: 'daily_lesson',
      title: 'Completa una lección',
      description: 'Finaliza una lección',
      type: 'DAILY',
      targetType: 'COMPLETE_LESSON',
      targetValue: 1,
      rewardXp: 0,
      rewardSakura: reward,
    },
    {
      id: 'daily_review',
      title: 'Completa un repaso',
      description: 'Finaliza un repaso',
      type: 'DAILY',
      targetType: 'COMPLETE_REVIEW',
      targetValue: 1,
      rewardXp: 0,
      rewardSakura: reward,
    },
    {
      id: 'daily_xp',
      title: 'Gana 20 XP',
      description: 'Acumula XP motivacional',
      type: 'DAILY',
      targetType: 'EARN_XP',
      targetValue: 20,
      rewardXp: 0,
      rewardSakura: reward,
    },
    {
      id: 'daily_characters',
      title: 'Practica 5 caracteres',
      description: 'Practica kana disponibles',
      type: 'DAILY',
      targetType: 'PRACTICE_CHARACTERS',
      targetValue: 5,
      rewardXp: 0,
      rewardSakura: reward,
    },
  ]
}

/**
 * Misiones semanales.
 *
 * El modelo ya traia el tipo WEEKLY, su recompensa y su politica de cobro; solo
 * faltaba quien las emitiera. Piden mas de lo que cabe en un dia a proposito:
 * son el motivo para volver el jueves, no para hacer mas hoy.
 */
export function generateWeeklyMissions(
  config: RewardPolicyConfig = DEFAULT_REWARD_CONFIG,
): MissionDefinition[] {
  const reward = config.weeklyMissionSakura
  return [
    {
      id: 'weekly_lessons',
      title: 'Completa 5 lecciones',
      description: 'Avanza en el curso durante la semana',
      type: 'WEEKLY',
      targetType: 'COMPLETE_LESSON',
      targetValue: 5,
      rewardXp: 0,
      rewardSakura: reward,
    },
    {
      id: 'weekly_reviews',
      title: 'Haz 3 repasos',
      description: 'Vuelve sobre lo que se te resiste',
      type: 'WEEKLY',
      targetType: 'COMPLETE_REVIEW',
      targetValue: 3,
      rewardXp: 0,
      rewardSakura: reward,
    },
    {
      id: 'weekly_xp',
      title: 'Gana 150 XP',
      description: 'Constancia a lo largo de la semana',
      type: 'WEEKLY',
      targetType: 'EARN_XP',
      targetValue: 150,
      rewardXp: 0,
      rewardSakura: reward,
    },
  ]
}

/** Semana ISO a la que pertenece un dia epoch (lunes como primer dia). */
export function epochWeekOf(epochDay: number): number {
  // El dia epoch 0 fue jueves; se corrige para que la semana empiece el lunes.
  return Math.floor((epochDay + 3) / 7)
}

/** DefaultMissionProgressCalculator: nunca pasa del objetivo. */
export function applyMissionProgress(
  currentProgress: number,
  definition: MissionDefinition,
  incrementBy: number,
): number {
  return Math.min(currentProgress + incrementBy, definition.targetValue)
}

export interface MissionCompletionResult {
  missionId: string
  wasCompleted: boolean
  rewardResult: RewardResult | null
}

/** DefaultMissionCompletionPolicy: la recompensa se entrega una sola vez. */
export function completeMission(
  definition: MissionDefinition,
  currentProgress: number,
  alreadyCompleted: boolean,
  config: RewardPolicyConfig = DEFAULT_REWARD_CONFIG,
): MissionCompletionResult {
  const completed = !alreadyCompleted && currentProgress >= definition.targetValue
  if (!completed) {
    return { missionId: definition.id, wasCompleted: false, rewardResult: null }
  }

  const source =
    definition.type === 'DAILY' ? 'DAILY_MISSION_COMPLETED' : 'WEEKLY_MISSION_COMPLETED'
  const adjusted: RewardPolicyConfig =
    definition.type === 'DAILY'
      ? { ...config, dailyMissionSakura: definition.rewardSakura }
      : { ...config, weeklyMissionSakura: definition.rewardSakura }

  return {
    missionId: definition.id,
    wasCompleted: true,
    rewardResult: calculateReward(source, adjusted, 'NONE'),
  }
}

export function emptyMissionProgress(missionId: string, epochDay: number): MissionProgress {
  return {
    missionId,
    epochDay,
    currentProgress: 0,
    completed: false,
    rewardClaimed: false,
    completedAtEpochMillis: null,
  }
}
