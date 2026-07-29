/** Puerto de feature/rewards/domain. */

export type RewardSource =
  | 'LESSON_COMPLETED'
  | 'PERFECT_LESSON'
  | 'REVIEW_COMPLETED'
  | 'CONVERSATION_COMPLETED'
  | 'UNIT_COMPLETED'
  | 'WORLD_COMPLETED'
  | 'DAILY_MISSION_COMPLETED'
  | 'WEEKLY_MISSION_COMPLETED'

export type RewardMultiplier = 'NONE' | 'PLUS_X2' | 'AD_REWARD_X2'

export const MULTIPLIER_FACTOR: Record<RewardMultiplier, number> = {
  NONE: 1,
  PLUS_X2: 2,
  AD_REWARD_X2: 2,
}

export interface RewardPolicyConfig {
  lessonCompletedXp: number
  lessonCompletedSakura: number
  perfectLessonBonusSakura: number
  reviewCompletedXp: number
  reviewCompletedSakura: number
  conversationCompletedXp: number
  conversationCompletedSakura: number
  unitCompletedSakura: number
  worldCompletedSakura: number
  dailyMissionSakura: number
  weeklyMissionSakura: number
}

export const DEFAULT_REWARD_CONFIG: RewardPolicyConfig = {
  lessonCompletedXp: 10,
  lessonCompletedSakura: 1,
  perfectLessonBonusSakura: 1,
  reviewCompletedXp: 8,
  reviewCompletedSakura: 1,
  conversationCompletedXp: 12,
  conversationCompletedSakura: 2,
  unitCompletedSakura: 5,
  worldCompletedSakura: 15,
  dailyMissionSakura: 5,
  weeklyMissionSakura: 15,
}

export interface RewardBreakdown {
  baseXp: number
  bonusXp: number
  baseSakura: number
  bonusSakura: number
  reason: string
}

export interface RewardResult {
  xpEarned: number
  sakuraEarned: number
  source: RewardSource
  breakdown: RewardBreakdown
  multiplierApplied: RewardMultiplier
}

/** Espejo de DefaultRewardCalculator: [baseXp, bonusXp, baseSakura, bonusSakura]. */
function valuesFor(source: RewardSource, config: RewardPolicyConfig): [number, number, number, number] {
  switch (source) {
    case 'LESSON_COMPLETED':
      return [config.lessonCompletedXp, 0, config.lessonCompletedSakura, 0]
    case 'PERFECT_LESSON':
      return [
        config.lessonCompletedXp,
        0,
        config.lessonCompletedSakura,
        config.perfectLessonBonusSakura,
      ]
    case 'REVIEW_COMPLETED':
      return [config.reviewCompletedXp, 0, config.reviewCompletedSakura, 0]
    case 'CONVERSATION_COMPLETED':
      return [config.conversationCompletedXp, 0, config.conversationCompletedSakura, 0]
    case 'UNIT_COMPLETED':
      return [0, 0, config.unitCompletedSakura, 0]
    case 'WORLD_COMPLETED':
      return [0, 0, config.worldCompletedSakura, 0]
    case 'DAILY_MISSION_COMPLETED':
      return [0, 0, config.dailyMissionSakura, 0]
    case 'WEEKLY_MISSION_COMPLETED':
      return [0, 0, config.weeklyMissionSakura, 0]
  }
}

export function calculateReward(
  source: RewardSource,
  config: RewardPolicyConfig = DEFAULT_REWARD_CONFIG,
  multiplier: RewardMultiplier = 'NONE',
): RewardResult {
  const [baseXp, bonusXp, baseSakura, bonusSakura] = valuesFor(source, config)
  const factor = MULTIPLIER_FACTOR[multiplier]
  return {
    xpEarned: (baseXp + bonusXp) * factor,
    sakuraEarned: (baseSakura + bonusSakura) * factor,
    source,
    breakdown: { baseXp, bonusXp, baseSakura, bonusSakura, reason: source.toLowerCase() },
    multiplierApplied: multiplier,
  }
}

export interface StreakUpdateResult {
  consecutiveDays: number
  previousEpochDay: number | null
  activityEpochDay: number
  wasReset: boolean
}

/** DefaultStreakPolicy: mismo dia no suma, dia siguiente suma, hueco reinicia. */
export function updateStreak(
  currentDays: number,
  lastActivityEpochDay: number | null,
  activityEpochDay: number,
): StreakUpdateResult {
  let days: number
  if (lastActivityEpochDay === null) days = 1
  else if (activityEpochDay === lastActivityEpochDay) days = currentDays
  else if (activityEpochDay === lastActivityEpochDay + 1) days = currentDays + 1
  else days = 1

  return {
    consecutiveDays: days,
    previousEpochDay: lastActivityEpochDay,
    activityEpochDay,
    wasReset: lastActivityEpochDay !== null && activityEpochDay > lastActivityEpochDay + 1,
  }
}
