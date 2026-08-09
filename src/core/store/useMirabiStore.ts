import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { RewardResult } from '../domain/rewards'
import { createContentSlice, type ContentSlice } from './slices/contentSlice'
import {
  createMissionsSlice,
  initialMissionsState,
  type MissionsSlice,
  type MissionsState,
} from './slices/missionsSlice'
import {
  createProgressSlice,
  initialPreferences,
  initialProgressOnly,
  XP_PER_GOAL_MINUTE,
  type ProgressOnlyState,
  type ProgressSlice,
} from './slices/progressSlice'

/**
 * Store combinado a partir de slices de Zustand: cada archivo en `slices/`
 * posee su propio trozo de estado y acciones, y este fichero solo los junta,
 * ademas de las acciones que de verdad son de todo el store (persistencia,
 * export/import, reset) y no encajan en un slice concreto.
 */

export type ThemePreference = 'light' | 'dark' | 'system'

// Los tipos viven con la regla que los usa; el store solo los reexporta para
// que las pantallas sigan teniendo un unico sitio del que importar.
export type { LearningMotivation } from '../domain/motivation'
export type { InitialLevel } from '../domain/placement'
export { XP_PER_GOAL_MINUTE }

/** Articulos de la tienda que tienen efecto real en el juego. */
export type ShopItemId = 'streak_shield' | 'streak_repair' | 'xp_boost' | 'yuki_gift'

export interface LessonOutcome {
  lessonId: string
  correctAnswers: number
  wrongAnswers: number
  accuracyPercentage: number
  reward: RewardResult
  unitBonus: RewardResult | null
  worldBonus: RewardResult | null
  reviewItemsGenerated: number
  isPerfect: boolean
  streakDays: number
  levelUp: boolean
}

export interface SessionOutcome {
  correctAnswers: number
  wrongAnswers: number
  accuracyPercentage: number
  reward: RewardResult
  streakDays: number
  levelUp: boolean
}

interface RootActions {
  resetProgress: () => void
  exportProgress: () => string
  importProgress: (raw: string) => boolean
}

export type MirabiStore = ContentSlice & ProgressSlice & MissionsSlice & RootActions

/** Lo que se guarda en localStorage: todo salvo el contenido, que se recarga del JSON. */
type PersistedState = ProgressOnlyState & MissionsState & typeof initialPreferences

const initialPersisted: PersistedState = {
  ...initialPreferences,
  ...initialProgressOnly,
  ...initialMissionsState,
}

export const useMirabiStore = create<MirabiStore>()(
  persist(
    (set, get, store) => {
      return {
        ...createContentSlice(set, get, store),
        ...createProgressSlice(set, get, store),
        ...createMissionsSlice(set, get, store),

        // Borra el aprendizaje, no la configuracion: el tema, el nombre y el
        // objetivo diario no son progreso y volver al onboarding sorprende.
        resetProgress: () => set({ ...initialProgressOnly, ...initialMissionsState }),

        exportProgress: () => {
          const state = get()
          const persisted = Object.fromEntries(
            Object.entries(state).filter(([key]) => key in initialPersisted),
          )
          return JSON.stringify({ version: 2, exportedAt: Date.now(), state: persisted }, null, 2)
        },

        importProgress: (raw) => {
          try {
            const parsed = JSON.parse(raw) as { state?: Record<string, unknown> }
            if (!parsed.state || typeof parsed.state !== 'object') return false
            // Solo se aceptan claves conocidas: un fichero manipulado no puede
            // inyectar campos nuevos en el estado.
            const accepted = Object.fromEntries(
              Object.entries(parsed.state).filter(([key]) => key in initialPersisted),
            )
            if (Object.keys(accepted).length === 0) return false
            set({ ...initialPersisted, ...accepted } as Partial<MirabiStore>)
            return true
          } catch {
            return false
          }
        },
      }
    },
    {
      name: 'mirabi-state-v1',
      version: 2,
      // pack/catalog/index/labels se recargan del JSON en cada arranque.
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => key in initialPersisted),
        ) as PersistedState,
      /*
       * v1 no tenia repeticion espaciada: sus items no llevan caja ni fecha.
       * Se adoptan como recien fallados para que vuelvan hoy, en vez de tirarlos.
       */
      migrate: (persisted, version) => {
        const state = persisted as Partial<PersistedState>
        if (version >= 2) return state as PersistedState
        const now = Date.now()
        return {
          ...initialPersisted,
          ...state,
          reviewItems: (state.reviewItems ?? []).map((item) => ({
            ...item,
            srsCategory: item.srsCategory ?? 'NONE',
            errorType: item.errorType ?? null,
            box: item.box ?? 0,
            reviewCount: item.reviewCount ?? 0,
            lapses: item.lapses ?? 1,
            nextReviewAtEpochMillis: item.nextReviewAtEpochMillis ?? now,
          })),
        } as PersistedState
      },
      /*
       * Si `mirabi-state-v1` tiene un JSON corrupto (edicion manual, truncado
       * a medio escribir), zustand no aplica el parche y el store se queda
       * con los valores por defecto de la fabrica de arriba, que ya son un
       * estado valido. Lo unico que faltaba era que el fallo quedara visible
       * en vez de silencioso.
       */
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('No se pudo restaurar el progreso guardado; se empieza de cero.', error)
        }
      },
    },
  ),
)
