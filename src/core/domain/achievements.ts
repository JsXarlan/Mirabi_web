/** Puerto de feature/achievements/domain. */

export interface AchievementSignals {
  lessons: number
  reviews: number
  conversations: number
  streak: number
  masteredKana: number
  masteredKanji: number
}

export interface AchievementDefinition {
  id: string
  title: string
  icon: string
  check: (signals: AchievementSignals) => boolean
}

/**
 * Hitos simples y verificables con el estado local. Para agregar uno nuevo con
 * otra señal (kanji dominado, misiones cobradas, escritura practicada) alcanza
 * con sumar una entrada aca: `evaluateAchievements` ya lo detecta solo.
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first_lesson', title: 'Primer paso', icon: '👣', check: (s) => s.lessons >= 1 },
  { id: 'ten_lessons', title: '10 lecciones', icon: '📘', check: (s) => s.lessons >= 10 },
  { id: 'first_review', title: 'Primer repaso', icon: '🔁', check: (s) => s.reviews >= 1 },
  { id: 'first_conversation', title: 'Primera conversación', icon: '💬', check: (s) => s.conversations >= 1 },
  { id: 'streak_3', title: 'Racha de 3', icon: '🔥', check: (s) => s.streak >= 3 },
  { id: 'streak_7', title: 'Racha de 7', icon: '🏮', check: (s) => s.streak >= 7 },
  { id: 'kana_25', title: '25 kana dominados', icon: 'あ', check: (s) => s.masteredKana >= 25 },
  { id: 'kana_all', title: 'Hiragana completo', icon: '🌸', check: (s) => s.masteredKana >= 71 },
  { id: 'kanji_25', title: '25 kanji dominados', icon: '木', check: (s) => s.masteredKanji >= 25 },
  { id: 'kanji_100', title: '100 kanji dominados', icon: '本', check: (s) => s.masteredKanji >= 100 },
  { id: 'kanji_500', title: '500 kanji dominados', icon: '学', check: (s) => s.masteredKanji >= 500 },
]

export interface AchievementUnlock {
  achievementId: string
  unlockedAtEpochMillis: number
}

/** Devuelve solo los logros que cruzan el umbral ahora y no estaban desbloqueados. */
export function evaluateAchievements(
  signals: AchievementSignals,
  unlockedIds: ReadonlySet<string>,
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((achievement) => !unlockedIds.has(achievement.id) && achievement.check(signals))
}
