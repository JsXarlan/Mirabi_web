import type { StateCreator } from 'zustand'

import type { MissionProgress } from '../../domain/models'
import { epochDayOf } from '../../domain/models'
import {
  emptyMissionProgress,
  epochWeekOf,
  generateDailyMissions,
  generateWeeklyMissions,
} from '../../domain/missions'
import type { MirabiStore } from '../useMirabiStore'

/**
 * Progreso de misiones diarias y semanales. La orquestacion de recompensas
 * (avanzar el progreso, cobrar al completar) sigue viviendo en `award`, dentro
 * de progressSlice: es una transaccion conjunta con XP/racha, no una accion
 * separada. Este slice solo posee el estado y las lecturas para pantalla.
 */
export interface MissionsState {
  missionEpochDay: number | null
  missionProgress: Record<string, MissionProgress>

  missionEpochWeek: number | null
  weeklyProgress: Record<string, MissionProgress>
}

export interface MissionsSlice extends MissionsState {
  todayMissions: () => {
    definition: ReturnType<typeof generateDailyMissions>[number]
    progress: MissionProgress
  }[]
  weekMissions: () => {
    definition: ReturnType<typeof generateWeeklyMissions>[number]
    progress: MissionProgress
  }[]
}

export const initialMissionsState: MissionsState = {
  missionEpochDay: null,
  missionProgress: {},
  missionEpochWeek: null,
  weeklyProgress: {},
}

export const createMissionsSlice: StateCreator<MirabiStore, [], [], MissionsSlice> = (_set, get) => ({
  ...initialMissionsState,

  todayMissions: () => {
    const today = epochDayOf(Date.now())
    const { missionProgress, missionEpochDay } = get()
    const fresh = missionEpochDay === today
    return generateDailyMissions().map((definition) => ({
      definition,
      progress: fresh
        ? (missionProgress[definition.id] ?? emptyMissionProgress(definition.id, today))
        : emptyMissionProgress(definition.id, today),
    }))
  },

  weekMissions: () => {
    const today = epochDayOf(Date.now())
    const { weeklyProgress, missionEpochWeek } = get()
    // Si el estado guardado es de otra semana, se muestra ya reiniciado
    // aunque todavia no haya habido actividad que dispare el rollover.
    const fresh = missionEpochWeek === epochWeekOf(today)
    return generateWeeklyMissions().map((definition) => ({
      definition,
      progress: fresh
        ? (weeklyProgress[definition.id] ?? emptyMissionProgress(definition.id, today))
        : emptyMissionProgress(definition.id, today),
    }))
  },
})
