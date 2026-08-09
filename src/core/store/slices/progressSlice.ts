import type { StateCreator } from 'zustand'

import type { ContentExercise } from '../../content/types'
import type {
  AnswerResult,
  DailyActivitySummary,
  LearningProgress,
  LessonProgress,
  MasteryScore,
  MissionProgress,
  MissionTargetType,
  ReviewItem,
  SubscriptionType,
} from '../../domain/models'
import { epochDayOf, levelFromXp, nextMastery } from '../../domain/models'
import { evaluateAchievements, type AchievementSignals, type AchievementUnlock } from '../../domain/achievements'
import { validateAnswer } from '../../domain/answers'
import { canonicalLearningItemId } from '../../domain/kanaIds'
import type { LearningMotivation } from '../../domain/motivation'
import type { InitialLevel } from '../../domain/placement'
import { createReviewItem, isDue, scheduleAfterAnswer } from '../../domain/review'
import type { ErrorTally } from '../../domain/weakpoints'
import {
  DEFAULT_REWARD_CONFIG,
  applyStreakShield,
  applyXpBoost,
  calculateReward,
  updateStreak,
  type RewardResult,
} from '../../domain/rewards'
import {
  applyMissionProgress,
  completeMission,
  emptyMissionProgress,
  epochWeekOf,
  generateDailyMissions,
  generateWeeklyMissions,
} from '../../domain/missions'
import type { MirabiStore, LessonOutcome, SessionOutcome, ShopItemId, ThemePreference } from '../useMirabiStore'

/** Preferencias del usuario: no son progreso, `resetProgress` no las toca. */
export interface Preferences {
  onboardingCompleted: boolean
  displayName: string | null
  motivation: LearningMotivation | null
  initialLevel: InitialLevel | null
  dailyGoalMinutes: number
  dailyGoalXp: number

  theme: ThemePreference
  audioEnabled: boolean
  subscriptionType: SubscriptionType

  reminderEnabled: boolean
  /** Hora local a partir de la cual se avisa si aun no se ha estudiado. */
  reminderHour: number
}

/** Progreso de aprendizaje, XP, racha y compras. Sin los campos de misiones: esos son de missionsSlice. */
export interface ProgressOnlyState {
  totalXp: number
  sakura: number
  streakDays: number
  lastActivityEpochDay: number | null
  activeDays: number[]
  /** Hora local de la primera actividad de cada dia, para sugerir un horario de recordatorio. */
  recentActivityHours: number[]

  lessonProgress: Record<string, LessonProgress>
  learningProgress: Record<string, LearningProgress>
  reviewItems: ReviewItem[]

  /** Fallos y respuestas por errorType y por confusion critica del contenido. */
  errorTallies: Record<string, ErrorTally>
  criticalTallies: Record<string, ErrorTally>

  activityEpochDay: number | null
  dailyActivity: DailyActivitySummary

  totalLessonsCompleted: number
  totalReviewsCompleted: number
  totalConversationsCompleted: number
  totalAnswers: number
  correctAnswers: number

  /** Bonus de unidad/mundo ya entregados: evita pagar dos veces al repetir una leccion. */
  awardedUnitBonuses: string[]
  awardedWorldBonuses: string[]
  completedConversationLessonIds: string[]
  passedExamWorldIds: string[]

  /** Mundos dados por sabidos en la colocacion inicial, y si ya se decidio. */
  placementDecided: boolean
  placementWorldIds: string[]

  /** Compras con efecto: escudos de racha y sesiones de XP doble pendientes. */
  streakShields: number
  xpBoostSessions: number
  yukiGifts: number
}

export interface ProgressActions {
  completeOnboarding: (input: {
    displayName: string | null
    motivation: LearningMotivation
    initialLevel: InitialLevel
    dailyGoalMinutes: number
  }) => void

  setTheme: (theme: ThemePreference) => void
  setAudioEnabled: (enabled: boolean) => void
  setDisplayName: (name: string) => void
  setDailyGoalMinutes: (minutes: number) => void
  setSubscription: (type: SubscriptionType) => void
  setReminder: (enabled: boolean, hour?: number) => void

  /** Corrige, actualiza dominio y programa el repaso. Devuelve el resultado. */
  answerExercise: (exercise: ContentExercise, answer: string) => AnswerResult
  completeLesson: (lessonId: string, correct: number, wrong: number) => LessonOutcome
  completeReviewSession: (results: { item: ReviewItem; isCorrect: boolean }[]) => SessionOutcome
  completeCharacterPractice: (correct: number, wrong: number) => SessionOutcome
  /**
   * Cierra una sesion de escritura: mueve el dominio del kana escrito, igual
   * que cualquier otra practica, pero sin tocar reviewItems/SRS todavia (no
   * hay ContentExercise reconstruible para un trazo fallado).
   */
  completeWritingPractice: (results: { learningItemId: string; gotIt: boolean }[]) => SessionOutcome
  completeConversation: (lessonId: string, correct: number, wrong: number) => SessionOutcome
  completeWorldExam: (worldId: string, correct: number, wrong: number) => SessionOutcome

  /** Da por sabidos esos mundos sin pagar XP: no se han estudiado aqui. */
  applyPlacement: (worldIds: string[]) => void

  buyShopItem: (item: ShopItemId, cost: number) => boolean

  masteryOf: (learningItemId: string) => MasteryScore
  dueReviewItems: () => ReviewItem[]
}

export type ProgressSlice = Preferences & ProgressOnlyState & ProgressActions

const EMPTY_DAILY: DailyActivitySummary = {
  lessonsCompletedToday: 0,
  reviewsCompletedToday: 0,
  conversationsCompletedToday: 0,
  xpEarnedToday: 0,
  sakuraEarnedToday: 0,
  dailyGoalCompleted: false,
}

/** El objetivo diario se expresa en minutos; 1 minuto ~ 4 XP en el ritmo del MVP. */
export const XP_PER_GOAL_MINUTE = 4

export const initialPreferences: Preferences = {
  onboardingCompleted: false,
  displayName: null,
  motivation: null,
  initialLevel: null,
  dailyGoalMinutes: 10,
  dailyGoalXp: 10 * XP_PER_GOAL_MINUTE,

  theme: 'system',
  audioEnabled: true,
  subscriptionType: 'FREE',

  reminderEnabled: false,
  reminderHour: 20,
}

export const initialProgressOnly: ProgressOnlyState = {
  totalXp: 0,
  sakura: 0,
  streakDays: 0,
  lastActivityEpochDay: null,
  activeDays: [],
  recentActivityHours: [],

  lessonProgress: {},
  learningProgress: {},
  reviewItems: [],

  errorTallies: {},
  criticalTallies: {},

  activityEpochDay: null,
  dailyActivity: EMPTY_DAILY,

  totalLessonsCompleted: 0,
  totalReviewsCompleted: 0,
  totalConversationsCompleted: 0,
  totalAnswers: 0,
  correctAnswers: 0,

  awardedUnitBonuses: [],
  awardedWorldBonuses: [],
  completedConversationLessonIds: [],
  passedExamWorldIds: [],

  placementDecided: false,
  placementWorldIds: [],

  streakShields: 0,
  xpBoostSessions: 0,
  yukiGifts: 0,
}

/** Multiplicador activo: Plus duplica Sakura, y solo Sakura, segun la spec del MVP. */
function multiplierFor(subscription: SubscriptionType) {
  return subscription === 'PLUS' ? ('PLUS_X2' as const) : ('NONE' as const)
}

function bumpTally(
  tallies: Record<string, ErrorTally>,
  key: string,
  isCorrect: boolean,
): Record<string, ErrorTally> {
  const current = tallies[key] ?? { wrong: 0, total: 0 }
  return {
    ...tallies,
    [key]: { wrong: current.wrong + (isCorrect ? 0 : 1), total: current.total + 1 },
  }
}

export const createProgressSlice: StateCreator<MirabiStore, [], [], ProgressSlice> = (set, get) => {
  /** Reinicia contadores diarios y misiones cuando cambia el dia. */
  function rolledOver(
    state: MirabiStore,
    today: number,
    now: number,
  ): Partial<ProgressOnlyState> & {
    missionEpochDay?: number
    missionProgress?: Record<string, MissionProgress>
    missionEpochWeek?: number
    weeklyProgress?: Record<string, MissionProgress>
  } {
    const patch: ReturnType<typeof rolledOver> = {}
    if (state.activityEpochDay !== today) {
      patch.activityEpochDay = today
      patch.dailyActivity = { ...EMPTY_DAILY }
      // Para sugerir un horario de recordatorio: solo la primera actividad
      // del dia cuenta, no cada leccion/repaso que se haga despues.
      patch.recentActivityHours = [...state.recentActivityHours, new Date(now).getHours()].slice(-60)
    }
    if (state.missionEpochDay !== today) {
      patch.missionEpochDay = today
      patch.missionProgress = Object.fromEntries(
        generateDailyMissions().map((mission) => [mission.id, emptyMissionProgress(mission.id, today)]),
      )
    }
    const week = epochWeekOf(today)
    if (state.missionEpochWeek !== week) {
      patch.missionEpochWeek = week
      patch.weeklyProgress = Object.fromEntries(
        generateWeeklyMissions().map((mission) => [mission.id, emptyMissionProgress(mission.id, today)]),
      )
    }
    return patch
  }

  /**
   * Aplica XP/Sakura, racha, actividad diaria y avance de misiones en una sola
   * transicion. Todas las pantallas de resultado pasan por aqui para que no haya
   * dos caminos distintos de otorgar recompensas.
   */
  function award(
    reward: RewardResult,
    activity: Partial<DailyActivitySummary>,
    missionIncrements: Partial<Record<MissionTargetType, number>>,
    /** Solo las sesiones consumen el XP Boost; los bonus de unidad no. */
    consumesBoost = false,
  ): { streakDays: number; levelUp: boolean; bonusSakura: number; boosted: boolean } {
    const now = Date.now()
    const today = epochDayOf(now)
    const state = get()
    const rollover = rolledOver(state, today, now)

    const baseActivity = rollover.dailyActivity ?? state.dailyActivity
    const baseMissions = rollover.missionProgress ?? state.missionProgress

    const { xpEarned, boosted } = applyXpBoost(reward.xpEarned, state.xpBoostSessions, consumesBoost)

    const streak = updateStreak(state.streakDays, state.lastActivityEpochDay, today)
    const { streakDays, shielded } = applyStreakShield(state.streakDays, streak, state.streakShields)

    const levelBefore = levelFromXp(state.totalXp)
    const totalXp = state.totalXp + xpEarned

    const xpEarnedToday = baseActivity.xpEarnedToday + xpEarned
    const nextActivity: DailyActivitySummary = {
      lessonsCompletedToday: baseActivity.lessonsCompletedToday + (activity.lessonsCompletedToday ?? 0),
      reviewsCompletedToday: baseActivity.reviewsCompletedToday + (activity.reviewsCompletedToday ?? 0),
      conversationsCompletedToday:
        baseActivity.conversationsCompletedToday + (activity.conversationsCompletedToday ?? 0),
      xpEarnedToday,
      sakuraEarnedToday: baseActivity.sakuraEarnedToday + reward.sakuraEarned,
      dailyGoalCompleted: xpEarnedToday >= state.dailyGoalXp,
    }

    // Las misiones se resuelven despues de sumar XP para que "Gana 20 XP"
    // pueda completarse con la misma leccion que la disparo.
    const increments: Partial<Record<MissionTargetType, number>> = {
      ...missionIncrements,
      EARN_XP: (missionIncrements.EARN_XP ?? 0) + xpEarned,
    }

    const baseWeekly = rollover.weeklyProgress ?? state.weeklyProgress
    let missionSakura = 0

    /** Mismo avance para las diarias y las semanales; solo cambia el cajon. */
    const advance = (
      definitions: ReturnType<typeof generateDailyMissions>,
      base: Record<string, MissionProgress>,
    ): Record<string, MissionProgress> => {
      const next: Record<string, MissionProgress> = { ...base }
      for (const definition of definitions) {
        const increment = increments[definition.targetType] ?? 0
        const current = next[definition.id] ?? emptyMissionProgress(definition.id, today)
        if (increment === 0 && current.completed) continue

        const progress = applyMissionProgress(current.currentProgress, definition, increment)
        const completion = completeMission(definition, progress, current.completed)
        if (completion.wasCompleted && completion.rewardResult) {
          missionSakura += completion.rewardResult.sakuraEarned
        }
        next[definition.id] = {
          ...current,
          currentProgress: progress,
          completed: current.completed || completion.wasCompleted,
          rewardClaimed: current.rewardClaimed || completion.wasCompleted,
          completedAtEpochMillis: completion.wasCompleted ? now : current.completedAtEpochMillis,
        }
      }
      return next
    }

    const nextMissions = advance(generateDailyMissions(), baseMissions)
    const nextWeekly = advance(generateWeeklyMissions(), baseWeekly)

    const activeDays = state.activeDays.includes(today)
      ? state.activeDays
      : [...state.activeDays, today].slice(-60)

    // Logros: se detectan aca, con el estado ya al dia (XP, racha y misiones
    // de esta misma transaccion), para que un hito no tarde una pantalla mas
    // en aparecer de lo que tarda en cumplirse.
    const masteredKana = Object.values(state.learningProgress).filter(
      (item) => item.learningItemType === 'KANA' && (item.mastery === 'MASTERED' || item.mastery === 'EXPERT'),
    ).length
    const signals: AchievementSignals = {
      lessons: state.totalLessonsCompleted,
      reviews: state.totalReviewsCompleted,
      conversations: state.totalConversationsCompleted,
      streak: streakDays,
      masteredKana,
    }
    const newlyUnlocked = evaluateAchievements(signals, new Set(Object.keys(state.achievementUnlocks)))
    let achievementSakura = 0
    const achievementUnlocks = { ...state.achievementUnlocks }
    const newUnlockRecords: AchievementUnlock[] = []
    for (const achievement of newlyUnlocked) {
      achievementSakura += calculateReward('ACHIEVEMENT_UNLOCKED', DEFAULT_REWARD_CONFIG).sakuraEarned
      const unlock: AchievementUnlock = { achievementId: achievement.id, unlockedAtEpochMillis: now }
      achievementUnlocks[achievement.id] = unlock
      newUnlockRecords.push(unlock)
    }

    set({
      ...rollover,
      totalXp,
      sakura: state.sakura + reward.sakuraEarned + missionSakura + achievementSakura,
      streakDays,
      streakShields: shielded ? state.streakShields - 1 : state.streakShields,
      xpBoostSessions: boosted ? state.xpBoostSessions - 1 : state.xpBoostSessions,
      lastActivityEpochDay: today,
      activeDays,
      dailyActivity: {
        ...nextActivity,
        sakuraEarnedToday: nextActivity.sakuraEarnedToday + missionSakura + achievementSakura,
      },
      missionProgress: nextMissions,
      missionEpochDay: today,
      weeklyProgress: nextWeekly,
      missionEpochWeek: epochWeekOf(today),
      achievementUnlocks,
      achievementToastQueue: [...state.achievementToastQueue, ...newUnlockRecords],
    })

    return {
      streakDays,
      levelUp: levelFromXp(totalXp) > levelBefore,
      bonusSakura: missionSakura,
      boosted,
    }
  }

  /** Cierre comun de repaso, practica de kana, conversacion y examen. */
  function sessionOutcome(
    correct: number,
    wrong: number,
    reward: RewardResult,
    activity: Partial<DailyActivitySummary>,
    missions: Partial<Record<MissionTargetType, number>>,
  ): SessionOutcome {
    const total = correct + wrong
    const { streakDays, levelUp } = award(reward, activity, missions, true)
    return {
      correctAnswers: correct,
      wrongAnswers: wrong,
      accuracyPercentage: total === 0 ? 0 : (correct * 100) / total,
      reward,
      streakDays,
      levelUp,
    }
  }

  return {
    ...initialPreferences,
    ...initialProgressOnly,

    completeOnboarding: ({ displayName, motivation, initialLevel, dailyGoalMinutes }) =>
      set({
        onboardingCompleted: true,
        displayName,
        motivation,
        initialLevel,
        dailyGoalMinutes,
        dailyGoalXp: dailyGoalMinutes * XP_PER_GOAL_MINUTE,
      }),

    setTheme: (theme) => set({ theme }),
    setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
    setDisplayName: (displayName) => set({ displayName }),
    setDailyGoalMinutes: (dailyGoalMinutes) =>
      set({ dailyGoalMinutes, dailyGoalXp: dailyGoalMinutes * XP_PER_GOAL_MINUTE }),
    setSubscription: (subscriptionType) => set({ subscriptionType }),
    setReminder: (reminderEnabled, hour) =>
      set(hour === undefined ? { reminderEnabled } : { reminderEnabled, reminderHour: hour }),

    answerExercise: (exercise, answer) => {
      const raw = validateAnswer(exercise, answer)
      // El kana del curso y el del catalogo son el mismo elemento: se guarda
      // siempre con el id del catalogo para que los dos progresos coincidan.
      const key = canonicalLearningItemId(raw.learningItemId)
      const result: AnswerResult = { ...raw, learningItemId: key }
      const now = Date.now()
      const state = get()

      const previous: LearningProgress = state.learningProgress[key] ?? {
        learningItemId: key,
        learningItemType: result.learningItemType,
        mastery: 'UNKNOWN',
        correctAnswers: 0,
        wrongAnswers: 0,
        lastAnsweredAtEpochMillis: null,
        updatedAtEpochMillis: now,
      }

      const updated: LearningProgress = {
        ...previous,
        mastery: nextMastery(previous.mastery, result.isCorrect),
        correctAnswers: previous.correctAnswers + (result.isCorrect ? 1 : 0),
        wrongAnswers: previous.wrongAnswers + (result.isCorrect ? 0 : 1),
        lastAnsweredAtEpochMillis: now,
        updatedAtEpochMillis: now,
      }

      /*
       * Un elemento, un item de repaso. Si ya se sigue, se reprograma segun
       * la respuesta; si no, se crea cuando el ejercicio entra en SRS o
       * cuando se ha fallado.
       */
      const tracked = state.reviewItems.find(
        (item) => item.learningItemId === key && item.status !== 'COMPLETED',
      )

      let reviewItems = state.reviewItems
      if (tracked) {
        reviewItems = state.reviewItems.map((item) =>
          item.id === tracked.id ? scheduleAfterAnswer(item, result.isCorrect, now) : item,
        )
      } else if (exercise.entersSrs || !result.isCorrect) {
        reviewItems = [
          ...state.reviewItems,
          createReviewItem(result, exercise, `review-${key}-${now}`, previous.mastery, now),
        ]
      }

      const errorKey = exercise.errorType && exercise.errorType !== 'NONE' ? exercise.errorType : null
      let criticalTallies = state.criticalTallies
      for (const tag of exercise.criticalTags) {
        criticalTallies = bumpTally(criticalTallies, tag, result.isCorrect)
      }

      set({
        learningProgress: { ...state.learningProgress, [key]: updated },
        reviewItems,
        errorTallies: errorKey ? bumpTally(state.errorTallies, errorKey, result.isCorrect) : state.errorTallies,
        criticalTallies,
        totalAnswers: state.totalAnswers + 1,
        correctAnswers: state.correctAnswers + (result.isCorrect ? 1 : 0),
      })

      return result
    },

    completeLesson: (lessonId, correct, wrong) => {
      const state = get()
      const now = Date.now()
      const total = correct + wrong
      const accuracy = total === 0 ? 0 : (correct * 100) / total
      const isPerfect = total > 0 && wrong === 0

      const previous = state.lessonProgress[lessonId]
      const isFirstCompletion = previous?.status !== 'COMPLETED'

      const lessonProgress: LessonProgress = {
        lessonId,
        status: 'COMPLETED',
        bestAccuracyPercentage: Math.max(previous?.bestAccuracyPercentage ?? 0, accuracy),
        attempts: (previous?.attempts ?? 0) + 1,
        completedAtEpochMillis: now,
      }

      set({
        lessonProgress: { ...state.lessonProgress, [lessonId]: lessonProgress },
        // Antes de award(): si esta leccion cruza un umbral de logro, la
        // deteccion de ahi adentro necesita ver el conteo ya al dia.
        ...(isFirstCompletion ? { totalLessonsCompleted: state.totalLessonsCompleted + 1 } : {}),
      })

      const reward = calculateReward(
        isPerfect ? 'PERFECT_LESSON' : 'LESSON_COMPLETED',
        DEFAULT_REWARD_CONFIG,
        multiplierFor(state.subscriptionType),
      )

      const { streakDays, levelUp } = award(reward, { lessonsCompletedToday: 1 }, { COMPLETE_LESSON: 1 }, true)

      // Bonus de unidad y mundo: se pagan la primera vez que se cierran.
      let unitBonus: RewardResult | null = null
      let worldBonus: RewardResult | null = null
      const map = get().courseMap()
      const index = get().index

      if (map && index) {
        const lesson = index.lessonById.get(lessonId)
        const unit = lesson ? index.unitById.get(lesson.unitId) : undefined
        const unitDone = unit ? map.unitProgress.get(unit.id)?.isCompleted : false
        const after = get()

        if (unit && unitDone && !after.awardedUnitBonuses.includes(unit.id)) {
          unitBonus = calculateReward('UNIT_COMPLETED', DEFAULT_REWARD_CONFIG, multiplierFor(after.subscriptionType))
          set({ awardedUnitBonuses: [...after.awardedUnitBonuses, unit.id] })
          award(unitBonus, {}, {})
        }

        const worldDone = unit ? map.worldProgress.get(unit.worldId)?.isCompleted : false
        const latest = get()
        if (unit && worldDone && !latest.awardedWorldBonuses.includes(unit.worldId)) {
          worldBonus = calculateReward(
            'WORLD_COMPLETED',
            DEFAULT_REWARD_CONFIG,
            multiplierFor(latest.subscriptionType),
          )
          set({ awardedWorldBonuses: [...latest.awardedWorldBonuses, unit.worldId] })
          award(worldBonus, {}, {})
        }
      }

      return {
        lessonId,
        correctAnswers: correct,
        wrongAnswers: wrong,
        accuracyPercentage: accuracy,
        reward,
        unitBonus,
        worldBonus,
        reviewItemsGenerated: wrong,
        isPerfect,
        streakDays,
        levelUp,
      }
    },

    completeReviewSession: (results) => {
      const state = get()
      const now = Date.now()
      const correct = results.filter((result) => result.isCorrect).length
      const wrong = results.length - correct

      const answeredById = new Map(results.map((result) => [result.item.id, result.isCorrect]))

      // Acertar aleja el item en el tiempo; fallar lo devuelve a la caja 0.
      const reviewItems = state.reviewItems.map((item) => {
        const isCorrect = answeredById.get(item.id)
        return isCorrect === undefined ? item : scheduleAfterAnswer(item, isCorrect, now)
      })

      const learningProgress = { ...state.learningProgress }
      for (const { item, isCorrect } of results) {
        const previous = learningProgress[item.learningItemId]
        if (!previous) continue
        learningProgress[item.learningItemId] = {
          ...previous,
          mastery: nextMastery(previous.mastery, isCorrect),
          correctAnswers: previous.correctAnswers + (isCorrect ? 1 : 0),
          wrongAnswers: previous.wrongAnswers + (isCorrect ? 0 : 1),
          lastAnsweredAtEpochMillis: now,
          updatedAtEpochMillis: now,
        }
      }

      let errorTallies = state.errorTallies
      for (const { item, isCorrect } of results) {
        if (item.errorType) errorTallies = bumpTally(errorTallies, item.errorType, isCorrect)
      }

      set({
        reviewItems,
        learningProgress,
        errorTallies,
        totalReviewsCompleted: state.totalReviewsCompleted + 1,
        totalAnswers: state.totalAnswers + results.length,
        correctAnswers: state.correctAnswers + correct,
      })

      return sessionOutcome(
        correct,
        wrong,
        calculateReward('REVIEW_COMPLETED', DEFAULT_REWARD_CONFIG, multiplierFor(state.subscriptionType)),
        { reviewsCompletedToday: 1 },
        { COMPLETE_REVIEW: 1 },
      )
    },

    completeCharacterPractice: (correct, wrong) => {
      const state = get()
      const total = correct + wrong
      // Las respuestas ya las conto answerExercise carta a carta: sumarlas
      // aqui otra vez inflaria la precision global.
      // La practica de kana no es una leccion: paga como repaso.
      return sessionOutcome(
        correct,
        wrong,
        calculateReward('REVIEW_COMPLETED', DEFAULT_REWARD_CONFIG, multiplierFor(state.subscriptionType)),
        {},
        { PRACTICE_CHARACTERS: total },
      )
    },

    completeWritingPractice: (results) => {
      const state = get()
      const now = Date.now()
      const correct = results.filter((result) => result.gotIt).length
      const wrong = results.length - correct
      const total = results.length

      const learningProgress = { ...state.learningProgress }
      for (const { learningItemId, gotIt } of results) {
        const previous: LearningProgress = learningProgress[learningItemId] ?? {
          learningItemId,
          learningItemType: 'KANA',
          mastery: 'UNKNOWN',
          correctAnswers: 0,
          wrongAnswers: 0,
          lastAnsweredAtEpochMillis: null,
          updatedAtEpochMillis: now,
        }
        learningProgress[learningItemId] = {
          ...previous,
          mastery: nextMastery(previous.mastery, gotIt),
          correctAnswers: previous.correctAnswers + (gotIt ? 1 : 0),
          wrongAnswers: previous.wrongAnswers + (gotIt ? 0 : 1),
          lastAnsweredAtEpochMillis: now,
          updatedAtEpochMillis: now,
        }
      }

      set({
        learningProgress,
        totalAnswers: state.totalAnswers + total,
        correctAnswers: state.correctAnswers + correct,
      })

      // Paga como repaso, igual que la practica de kanji/kana existente.
      return sessionOutcome(
        correct,
        wrong,
        calculateReward('REVIEW_COMPLETED', DEFAULT_REWARD_CONFIG, multiplierFor(state.subscriptionType)),
        {},
        { PRACTICE_CHARACTERS: total },
      )
    },

    completeConversation: (lessonId, correct, wrong) => {
      const state = get()
      const isFirst = !state.completedConversationLessonIds.includes(lessonId)

      set({
        completedConversationLessonIds: isFirst
          ? [...state.completedConversationLessonIds, lessonId]
          : state.completedConversationLessonIds,
        totalConversationsCompleted: state.totalConversationsCompleted + (isFirst ? 1 : 0),
      })

      return sessionOutcome(
        correct,
        wrong,
        calculateReward('CONVERSATION_COMPLETED', DEFAULT_REWARD_CONFIG, multiplierFor(state.subscriptionType)),
        { conversationsCompletedToday: 1 },
        { COMPLETE_CONVERSATION: 1 },
      )
    },

    completeWorldExam: (worldId, correct, wrong) => {
      const state = get()
      const total = correct + wrong
      const passed = total > 0 && (correct * 100) / total >= 70

      if (passed && !state.passedExamWorldIds.includes(worldId)) {
        set({ passedExamWorldIds: [...state.passedExamWorldIds, worldId] })
      }

      // El examen no regala progreso de curso: paga como un repaso largo.
      return sessionOutcome(
        correct,
        wrong,
        calculateReward('REVIEW_COMPLETED', DEFAULT_REWARD_CONFIG, multiplierFor(state.subscriptionType)),
        { reviewsCompletedToday: 1 },
        { COMPLETE_REVIEW: 1 },
      )
    },

    applyPlacement: (worldIds) => {
      const state = get()
      const index = state.index
      if (!index) {
        set({ placementDecided: true })
        return
      }

      const now = Date.now()
      const lessonProgress = { ...state.lessonProgress }

      for (const worldId of worldIds) {
        const world = index.worldById.get(worldId)
        if (!world) continue
        for (const unitId of world.unitIds) {
          for (const lessonId of index.unitById.get(unitId)?.lessonIds ?? []) {
            if (lessonProgress[lessonId]?.status === 'COMPLETED') continue
            lessonProgress[lessonId] = {
              lessonId,
              status: 'COMPLETED',
              // attempts 0 delata que se dio por sabida, no que se hizo.
              bestAccuracyPercentage: 0,
              attempts: 0,
              completedAtEpochMillis: now,
            }
          }
        }
      }

      // Ni XP ni Sakura ni racha: la colocacion no es actividad.
      set({
        lessonProgress,
        placementDecided: true,
        placementWorldIds: worldIds,
      })
    },

    buyShopItem: (item, cost) => {
      const state = get()
      if (cost < 0 || state.sakura < cost) return false

      const patch: Partial<ProgressOnlyState> = { sakura: state.sakura - cost }
      switch (item) {
        case 'streak_shield':
          patch.streakShields = state.streakShields + 1
          break
        case 'streak_repair':
          // Recupera el dia perdido: la racha continua desde donde estaba.
          patch.streakDays = state.streakDays + 1
          patch.lastActivityEpochDay = epochDayOf(Date.now())
          break
        case 'xp_boost':
          patch.xpBoostSessions = state.xpBoostSessions + 1
          break
        case 'yuki_gift':
          patch.yukiGifts = state.yukiGifts + 1
          break
      }

      set(patch)
      return true
    },

    masteryOf: (learningItemId) =>
      get().learningProgress[canonicalLearningItemId(learningItemId)]?.mastery ?? 'UNKNOWN',

    dueReviewItems: () => {
      const now = Date.now()
      return get().reviewItems.filter((item) => isDue(item, now))
    },
  }
}
