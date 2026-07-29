import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type {
  CharacterCatalog,
  ContentExercise,
  CoursePack,
} from '../content/types'
import { buildCourseIndex, type CourseIndex } from '../content/loader'
import type {
  AnswerResult,
  DailyActivitySummary,
  LearningProgress,
  LessonProgress,
  MasteryScore,
  MissionProgress,
  ReviewItem,
  SubscriptionType,
} from '../domain/models'
import { epochDayOf, levelFromXp, nextMastery } from '../domain/models'
import { validateAnswer } from '../domain/answers'
import { reviewItemFromAnswer } from '../domain/review'
import {
  DEFAULT_REWARD_CONFIG,
  calculateReward,
  updateStreak,
  type RewardResult,
} from '../domain/rewards'
import {
  applyMissionProgress,
  completeMission,
  emptyMissionProgress,
  generateDailyMissions,
} from '../domain/missions'
import type { MissionTargetType } from '../domain/models'
import { buildCourseMap, type CourseMap } from '../domain/course'

export type ThemePreference = 'light' | 'dark' | 'system'

export type LearningMotivation =
  | 'ANIME_CULTURE'
  | 'TRAVEL'
  | 'STUDIES'
  | 'WORK'
  | 'PERSONAL_CHALLENGE'
  | 'CURIOSITY'

export type InitialLevel =
  | 'FROM_ZERO'
  | 'SOME_HIRAGANA'
  | 'HIRAGANA_KATAKANA'
  | 'BASIC_VOCABULARY'

interface PersistedState {
  onboardingCompleted: boolean
  displayName: string | null
  motivation: LearningMotivation | null
  initialLevel: InitialLevel | null
  dailyGoalMinutes: number
  dailyGoalXp: number

  theme: ThemePreference
  audioEnabled: boolean
  subscriptionType: SubscriptionType

  totalXp: number
  sakura: number
  streakDays: number
  lastActivityEpochDay: number | null
  activeDays: number[]

  lessonProgress: Record<string, LessonProgress>
  learningProgress: Record<string, LearningProgress>
  reviewItems: ReviewItem[]

  missionEpochDay: number | null
  missionProgress: Record<string, MissionProgress>

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
}

interface RuntimeState {
  pack: CoursePack | null
  catalog: CharacterCatalog | null
  index: CourseIndex | null
  contentError: string | null
}

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

interface Actions {
  setContent: (pack: CoursePack, catalog: CharacterCatalog) => void
  setContentError: (message: string) => void

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

  /** Corrige, actualiza dominio y crea ReviewItem si falla. Devuelve el resultado. */
  answerExercise: (exercise: ContentExercise, answer: string) => AnswerResult
  completeLesson: (lessonId: string, correct: number, wrong: number) => LessonOutcome
  completeReviewSession: (
    results: { item: ReviewItem; isCorrect: boolean }[],
  ) => SessionOutcome
  completeCharacterPractice: (correct: number, wrong: number) => SessionOutcome
  completeConversation: (lessonId: string, correct: number, wrong: number) => SessionOutcome

  spendSakura: (amount: number) => boolean
  resetProgress: () => void

  courseMap: () => CourseMap | null
  masteryOf: (learningItemId: string) => MasteryScore
  pendingReviewItems: () => ReviewItem[]
  todayMissions: () => { definition: ReturnType<typeof generateDailyMissions>[number]; progress: MissionProgress }[]
}

export type MirabiStore = PersistedState & RuntimeState & Actions

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

const initialPersisted: PersistedState = {
  onboardingCompleted: false,
  displayName: null,
  motivation: null,
  initialLevel: null,
  dailyGoalMinutes: 10,
  dailyGoalXp: 10 * XP_PER_GOAL_MINUTE,

  theme: 'system',
  audioEnabled: true,
  subscriptionType: 'FREE',

  totalXp: 0,
  sakura: 0,
  streakDays: 0,
  lastActivityEpochDay: null,
  activeDays: [],

  lessonProgress: {},
  learningProgress: {},
  reviewItems: [],

  missionEpochDay: null,
  missionProgress: {},

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
}

/** Multiplicador activo: Plus duplica Sakura, y solo Sakura, segun la spec del MVP. */
function multiplierFor(subscription: SubscriptionType) {
  return subscription === 'PLUS' ? ('PLUS_X2' as const) : ('NONE' as const)
}

export const useMirabiStore = create<MirabiStore>()(
  persist(
    (set, get) => {
      /** Reinicia contadores diarios y misiones cuando cambia el dia. */
      function rolledOver(state: PersistedState, today: number): Partial<PersistedState> {
        const patch: Partial<PersistedState> = {}
        if (state.activityEpochDay !== today) {
          patch.activityEpochDay = today
          patch.dailyActivity = { ...EMPTY_DAILY }
        }
        if (state.missionEpochDay !== today) {
          patch.missionEpochDay = today
          patch.missionProgress = Object.fromEntries(
            generateDailyMissions().map((mission) => [
              mission.id,
              emptyMissionProgress(mission.id, today),
            ]),
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
      ): { streakDays: number; levelUp: boolean; bonusSakura: number } {
        const now = Date.now()
        const today = epochDayOf(now)
        const state = get()
        const rollover = rolledOver(state, today)

        const baseActivity = rollover.dailyActivity ?? state.dailyActivity
        const baseMissions = rollover.missionProgress ?? state.missionProgress

        const streak = updateStreak(state.streakDays, state.lastActivityEpochDay, today)
        const levelBefore = levelFromXp(state.totalXp)
        const totalXp = state.totalXp + reward.xpEarned

        const xpEarnedToday = baseActivity.xpEarnedToday + reward.xpEarned
        const nextActivity: DailyActivitySummary = {
          lessonsCompletedToday:
            baseActivity.lessonsCompletedToday + (activity.lessonsCompletedToday ?? 0),
          reviewsCompletedToday:
            baseActivity.reviewsCompletedToday + (activity.reviewsCompletedToday ?? 0),
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
          EARN_XP: (missionIncrements.EARN_XP ?? 0) + reward.xpEarned,
        }

        const definitions = generateDailyMissions()
        const nextMissions: Record<string, MissionProgress> = { ...baseMissions }
        let missionSakura = 0

        for (const definition of definitions) {
          const increment = increments[definition.targetType] ?? 0
          const current = nextMissions[definition.id] ?? emptyMissionProgress(definition.id, today)
          if (increment === 0 && current.completed) continue

          const progress = applyMissionProgress(current.currentProgress, definition, increment)
          const completion = completeMission(definition, progress, current.completed)
          if (completion.wasCompleted && completion.rewardResult) {
            missionSakura += completion.rewardResult.sakuraEarned
          }
          nextMissions[definition.id] = {
            ...current,
            currentProgress: progress,
            completed: current.completed || completion.wasCompleted,
            rewardClaimed: current.rewardClaimed || completion.wasCompleted,
            completedAtEpochMillis: completion.wasCompleted ? now : current.completedAtEpochMillis,
          }
        }

        const activeDays = state.activeDays.includes(today)
          ? state.activeDays
          : [...state.activeDays, today].slice(-60)

        set({
          ...rollover,
          totalXp,
          sakura: state.sakura + reward.sakuraEarned + missionSakura,
          streakDays: streak.consecutiveDays,
          lastActivityEpochDay: today,
          activeDays,
          dailyActivity: {
            ...nextActivity,
            sakuraEarnedToday: nextActivity.sakuraEarnedToday + missionSakura,
          },
          missionProgress: nextMissions,
          missionEpochDay: today,
        })

        return {
          streakDays: streak.consecutiveDays,
          levelUp: levelFromXp(totalXp) > levelBefore,
          bonusSakura: missionSakura,
        }
      }

      return {
        ...initialPersisted,
        pack: null,
        catalog: null,
        index: null,
        contentError: null,

        setContent: (pack, catalog) =>
          set({ pack, catalog, index: buildCourseIndex(pack), contentError: null }),
        setContentError: (message) => set({ contentError: message }),

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

        answerExercise: (exercise, answer) => {
          const result = validateAnswer(exercise, answer)
          const now = Date.now()
          const state = get()

          const key = result.learningItemId
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

          const newItem =
            exercise.entersSrs || !result.isCorrect
              ? reviewItemFromAnswer(
                  result,
                  `review-${key}-${now}`,
                  previous.mastery,
                  now,
                  exercise.id,
                )
              : null

          // Un item pendiente por elemento: repetir el mismo fallo no infla la cola.
          const alreadyPending = state.reviewItems.some(
            (item) => item.learningItemId === key && item.status === 'PENDING',
          )

          set({
            learningProgress: { ...state.learningProgress, [key]: updated },
            reviewItems:
              newItem && !alreadyPending ? [...state.reviewItems, newItem] : state.reviewItems,
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

          set({ lessonProgress: { ...state.lessonProgress, [lessonId]: lessonProgress } })

          const reward = calculateReward(
            isPerfect ? 'PERFECT_LESSON' : 'LESSON_COMPLETED',
            DEFAULT_REWARD_CONFIG,
            multiplierFor(state.subscriptionType),
          )

          const { streakDays, levelUp } = award(
            reward,
            { lessonsCompletedToday: 1 },
            { COMPLETE_LESSON: 1 },
          )

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
              unitBonus = calculateReward(
                'UNIT_COMPLETED',
                DEFAULT_REWARD_CONFIG,
                multiplierFor(after.subscriptionType),
              )
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

          if (isFirstCompletion) {
            set({ totalLessonsCompleted: get().totalLessonsCompleted + 1 })
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

          const answeredIds = new Set(
            results.filter((result) => result.isCorrect).map((result) => result.item.id),
          )

          // Acertar retira el item de la cola; fallar lo sube de prioridad
          // en lugar de duplicarlo.
          const reviewItems = state.reviewItems.map((item) => {
            if (!results.some((result) => result.item.id === item.id)) return item
            if (answeredIds.has(item.id)) {
              return { ...item, status: 'COMPLETED' as const }
            }
            return {
              ...item,
              priority: item.priority === 'CRITICAL' ? item.priority : ('HIGH' as const),
              createdAtEpochMillis: now,
            }
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

          set({
            reviewItems,
            learningProgress,
            totalReviewsCompleted: state.totalReviewsCompleted + 1,
            totalAnswers: state.totalAnswers + results.length,
            correctAnswers: state.correctAnswers + correct,
          })

          const reward = calculateReward(
            'REVIEW_COMPLETED',
            DEFAULT_REWARD_CONFIG,
            multiplierFor(state.subscriptionType),
          )
          const { streakDays, levelUp } = award(
            reward,
            { reviewsCompletedToday: 1 },
            { COMPLETE_REVIEW: 1 },
          )

          return {
            correctAnswers: correct,
            wrongAnswers: wrong,
            accuracyPercentage: results.length === 0 ? 0 : (correct * 100) / results.length,
            reward,
            streakDays,
            levelUp,
          }
        },

        completeCharacterPractice: (correct, wrong) => {
          const state = get()
          const total = correct + wrong
          set({
            totalAnswers: state.totalAnswers + total,
            correctAnswers: state.correctAnswers + correct,
          })

          // La practica de kana no es una leccion: paga como repaso.
          const reward = calculateReward(
            'REVIEW_COMPLETED',
            DEFAULT_REWARD_CONFIG,
            multiplierFor(state.subscriptionType),
          )
          const { streakDays, levelUp } = award(reward, {}, { PRACTICE_CHARACTERS: total })

          return {
            correctAnswers: correct,
            wrongAnswers: wrong,
            accuracyPercentage: total === 0 ? 0 : (correct * 100) / total,
            reward,
            streakDays,
            levelUp,
          }
        },

        completeConversation: (lessonId, correct, wrong) => {
          const state = get()
          const total = correct + wrong
          const isFirst = !state.completedConversationLessonIds.includes(lessonId)

          set({
            completedConversationLessonIds: isFirst
              ? [...state.completedConversationLessonIds, lessonId]
              : state.completedConversationLessonIds,
            totalConversationsCompleted: state.totalConversationsCompleted + (isFirst ? 1 : 0),
          })

          const reward = calculateReward(
            'CONVERSATION_COMPLETED',
            DEFAULT_REWARD_CONFIG,
            multiplierFor(state.subscriptionType),
          )
          const { streakDays, levelUp } = award(
            reward,
            { conversationsCompletedToday: 1 },
            { COMPLETE_CONVERSATION: 1 },
          )

          return {
            correctAnswers: correct,
            wrongAnswers: wrong,
            accuracyPercentage: total === 0 ? 0 : (correct * 100) / total,
            reward,
            streakDays,
            levelUp,
          }
        },

        spendSakura: (amount) => {
          const state = get()
          if (amount < 0 || state.sakura < amount) return false
          set({ sakura: state.sakura - amount })
          return true
        },

        resetProgress: () => set({ ...initialPersisted }),

        courseMap: () => {
          const { pack, lessonProgress } = get()
          if (!pack) return null
          return buildCourseMap(
            pack.worlds,
            pack.units,
            pack.lessons,
            Object.values(lessonProgress),
          )
        },

        masteryOf: (learningItemId) =>
          get().learningProgress[learningItemId]?.mastery ?? 'UNKNOWN',

        pendingReviewItems: () =>
          get().reviewItems.filter((item) => item.status === 'PENDING'),

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
      }
    },
    {
      name: 'mirabi-state-v1',
      version: 1,
      // pack/catalog/index se recargan del JSON en cada arranque: no se persisten.
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => !['pack', 'catalog', 'index', 'contentError'].includes(key),
          ),
        ) as PersistedState,
    },
  ),
)
