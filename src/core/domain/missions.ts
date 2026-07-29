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
