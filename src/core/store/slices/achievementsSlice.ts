import type { StateCreator } from 'zustand'

import type { AchievementDefinition, AchievementUnlock } from '../../domain/achievements'
import { ACHIEVEMENTS } from '../../domain/achievements'
import type { MirabiStore } from '../useMirabiStore'

/**
 * Estado de logros. La deteccion (que se acaba de desbloquear) vive en
 * `award`, dentro de progressSlice, junto al resto de recompensas — este
 * slice solo posee el estado persistido, la cola de aviso en pantalla y la
 * lectura para el perfil.
 */
export interface AchievementsState {
  achievementUnlocks: Record<string, AchievementUnlock>
}

export interface AchievementsSlice extends AchievementsState {
  /** No se persiste: si se recarga la pagina con un aviso pendiente, no pasa nada. */
  achievementToastQueue: AchievementUnlock[]
  dismissAchievementToast: () => void
  achievementsList: () => { definition: AchievementDefinition; unlock: AchievementUnlock | null }[]
}

export const initialAchievementsState: AchievementsState = {
  achievementUnlocks: {},
}

export const createAchievementsSlice: StateCreator<MirabiStore, [], [], AchievementsSlice> = (set, get) => ({
  ...initialAchievementsState,
  achievementToastQueue: [],

  dismissAchievementToast: () =>
    set((state) => ({ achievementToastQueue: state.achievementToastQueue.slice(1) })),

  achievementsList: () => {
    const { achievementUnlocks } = get()
    return ACHIEVEMENTS.map((definition) => ({
      definition,
      unlock: achievementUnlocks[definition.id] ?? null,
    }))
  },
})
