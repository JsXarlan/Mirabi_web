import { useEffect } from 'react'

import { ACHIEVEMENTS } from '../../core/domain/achievements'
import { DEFAULT_REWARD_CONFIG } from '../../core/domain/rewards'
import { useMirabiStore } from '../../core/store/useMirabiStore'

const AUTO_DISMISS_MS = 4000

/**
 * Aviso flotante de logro desbloqueado. Vive montado una sola vez en App;
 * se dispara solo con lo que `award()` va encolando en achievementToastQueue.
 */
export function AchievementToast() {
  const unlock = useMirabiStore((state) => state.achievementToastQueue[0] ?? null)
  const dismiss = useMirabiStore((state) => state.dismissAchievementToast)

  useEffect(() => {
    if (!unlock) return
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [unlock, dismiss])

  if (!unlock) return null

  const definition = ACHIEVEMENTS.find((achievement) => achievement.id === unlock.achievementId)
  if (!definition) return null

  return (
    <button
      type="button"
      onClick={dismiss}
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 z-30 flex w-max max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-[22px] border border-[color-mix(in_srgb,var(--outline)_35%,transparent)] bg-[var(--primary-container)] px-4 py-3 text-left text-[var(--on-primary-container)] shadow-[var(--shadow-card)]"
    >
      <span aria-hidden className="font-jp text-2xl">
        {definition.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold opacity-80">Logro desbloqueado</span>
        <span className="block truncate text-sm font-bold">{definition.title}</span>
      </span>
      <span className="shrink-0 text-sm font-bold">+{DEFAULT_REWARD_CONFIG.achievementUnlockedSakura} 🌸</span>
    </button>
  )
}
