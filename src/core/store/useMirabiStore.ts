import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type {
  CharacterCatalog,
  ContentExercise,
  CoursePack,
  KanjiCatalog,
  WordCatalog,
} from '../content/types'
import {
  buildCourseIndex,
  buildKanjiIndex,
  buildWordIndex,
  type CourseIndex,
  type KanjiIndex,
  type WordIndex,
} from '../content/loader'
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
import { canonicalLearningItemId } from '../domain/kanaIds'
import type { LearningMotivation } from '../domain/motivation'
import type { InitialLevel } from '../domain/placement'
import { buildItemLabels, type ItemLabel } from '../domain/labels'
import { createReviewItem, isDue, scheduleAfterAnswer } from '../domain/review'
import type { ErrorTally } from '../domain/weakpoints'
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
  epochWeekOf,
  generateDailyMissions,
  generateWeeklyMissions,
} from '../domain/missions'
import type { MissionTargetType } from '../domain/models'
import { buildCourseMap, type CourseMap } from '../domain/course'

export type ThemePreference = 'light' | 'dark' | 'system'

// Los tipos viven con la regla que los usa; el store solo los reexporta para
// que las pantallas sigan teniendo un unico sitio del que importar.
export type { LearningMotivation } from '../domain/motivation'
export type { InitialLevel } from '../domain/placement'

/** Artículos de la tienda que tienen efecto real en el juego. */
export type ShopItemId = 'streak_shield' | 'streak_repair' | 'xp_boost' | 'yuki_gift'

interface Preferences {
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

interface ProgressState {
  totalXp: number
  sakura: number
  streakDays: number
  lastActivityEpochDay: number | null
  activeDays: number[]

  lessonProgress: Record<string, LessonProgress>
  learningProgress: Record<string, LearningProgress>
  reviewItems: ReviewItem[]

  /** Fallos y respuestas por errorType y por confusion critica del contenido. */
  errorTallies: Record<string, ErrorTally>
  criticalTallies: Record<string, ErrorTally>

  missionEpochDay: number | null
  missionProgress: Record<string, MissionProgress>

  missionEpochWeek: number | null
  weeklyProgress: Record<string, MissionProgress>

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

type PersistedState = Preferences & ProgressState

interface RuntimeState {
  pack: CoursePack | null
  catalog: CharacterCatalog | null
  index: CourseIndex | null
  labels: Map<string, ItemLabel> | null
  contentError: string | null
  /*
   * Palabras y kanji llegan despues del arranque y pueden no llegar: son un
   * complemento, no el curso. Por eso su fallo va a contentWarning y no a
   * contentError, que apaga la app entera.
   */
  words: WordCatalog | null
  kanji: KanjiCatalog | null
  wordIndex: WordIndex | null
  kanjiIndex: KanjiIndex | null
  contentWarning: string | null
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
  setWordCatalog: (words: WordCatalog) => void
  setKanjiCatalog: (kanji: KanjiCatalog) => void
  setContentWarning: (message: string) => void

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
  completeReviewSession: (
    results: { item: ReviewItem; isCorrect: boolean }[],
  ) => SessionOutcome
  completeCharacterPractice: (correct: number, wrong: number) => SessionOutcome
  completeConversation: (lessonId: string, correct: number, wrong: number) => SessionOutcome
  completeWorldExam: (worldId: string, correct: number, wrong: number) => SessionOutcome

  /** Da por sabidos esos mundos sin pagar XP: no se han estudiado aqui. */
  applyPlacement: (worldIds: string[]) => void

  buyShopItem: (item: ShopItemId, cost: number) => boolean
  resetProgress: () => void
  exportProgress: () => string
  importProgress: (raw: string) => boolean

  courseMap: () => CourseMap | null
  masteryOf: (learningItemId: string) => MasteryScore
  dueReviewItems: () => ReviewItem[]
  todayMissions: () => { definition: ReturnType<typeof generateDailyMissions>[number]; progress: MissionProgress }[]
  weekMissions: () => { definition: ReturnType<typeof generateWeeklyMissions>[number]; progress: MissionProgress }[]
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

const initialPreferences: Preferences = {
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

const initialProgress: ProgressState = {
  totalXp: 0,
  sakura: 0,
  streakDays: 0,
  lastActivityEpochDay: null,
  activeDays: [],

  lessonProgress: {},
  learningProgress: {},
  reviewItems: [],

  errorTallies: {},
  criticalTallies: {},

  missionEpochDay: null,
  missionProgress: {},

  missionEpochWeek: null,
  weeklyProgress: {},

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

const initialPersisted: PersistedState = { ...initialPreferences, ...initialProgress }

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

/**
 * Cache del mapa de curso. Reconstruirlo cuesta 30 unidades y 78 nodos, y las
 * pantallas lo piden en cada render: con la pareja (pack, lessonProgress) basta
 * para saber que nada ha cambiado.
 */
let courseMapCache: { pack: CoursePack; progress: unknown; map: CourseMap } | null = null

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
        const week = epochWeekOf(today)
        if (state.missionEpochWeek !== week) {
          patch.missionEpochWeek = week
          patch.weeklyProgress = Object.fromEntries(
            generateWeeklyMissions().map((mission) => [
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
        /** Solo las sesiones consumen el XP Boost; los bonus de unidad no. */
        consumesBoost = false,
      ): { streakDays: number; levelUp: boolean; bonusSakura: number; boosted: boolean } {
        const now = Date.now()
        const today = epochDayOf(now)
        const state = get()
        const rollover = rolledOver(state, today)

        const baseActivity = rollover.dailyActivity ?? state.dailyActivity
        const baseMissions = rollover.missionProgress ?? state.missionProgress

        const boosted = consumesBoost && reward.xpEarned > 0 && state.xpBoostSessions > 0
        const xpEarned = boosted ? reward.xpEarned * 2 : reward.xpEarned

        // El escudo de racha se gasta solo cuando la racha se habria perdido.
        const streak = updateStreak(state.streakDays, state.lastActivityEpochDay, today)
        const shielded = streak.wasReset && state.streakShields > 0
        const streakDays = shielded ? state.streakDays + 1 : streak.consecutiveDays

        const levelBefore = levelFromXp(state.totalXp)
        const totalXp = state.totalXp + xpEarned

        const xpEarnedToday = baseActivity.xpEarnedToday + xpEarned
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
              completedAtEpochMillis: completion.wasCompleted
                ? now
                : current.completedAtEpochMillis,
            }
          }
          return next
        }

        const nextMissions = advance(generateDailyMissions(), baseMissions)
        const nextWeekly = advance(generateWeeklyMissions(), baseWeekly)

        const activeDays = state.activeDays.includes(today)
          ? state.activeDays
          : [...state.activeDays, today].slice(-60)

        set({
          ...rollover,
          totalXp,
          sakura: state.sakura + reward.sakuraEarned + missionSakura,
          streakDays,
          streakShields: shielded ? state.streakShields - 1 : state.streakShields,
          xpBoostSessions: boosted ? state.xpBoostSessions - 1 : state.xpBoostSessions,
          lastActivityEpochDay: today,
          activeDays,
          dailyActivity: {
            ...nextActivity,
            sakuraEarnedToday: nextActivity.sakuraEarnedToday + missionSakura,
          },
          missionProgress: nextMissions,
          missionEpochDay: today,
          weeklyProgress: nextWeekly,
          missionEpochWeek: epochWeekOf(today),
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
        ...initialPersisted,
        pack: null,
        catalog: null,
        index: null,
        labels: null,
        contentError: null,
        words: null,
        kanji: null,
        wordIndex: null,
        kanjiIndex: null,
        contentWarning: null,

        setContent: (pack, catalog) => {
          const state = get()
          set({
            pack,
            catalog,
            index: buildCourseIndex(pack),
            labels: buildItemLabels(pack, catalog, state.words, state.kanji),
            contentError: null,
          })
        },
        setContentError: (message) => set({ contentError: message }),

        // Los catalogos llegan tras el curso, asi que al entrar hay que rehacer
        // las etiquetas: sin eso las palabras seguirian mostrandose por su id.
        setWordCatalog: (words) => {
          const state = get()
          set({
            words,
            wordIndex: buildWordIndex(words),
            labels: state.pack
              ? buildItemLabels(state.pack, state.catalog, words, state.kanji)
              : state.labels,
          })
        },
        setKanjiCatalog: (kanji) => {
          const state = get()
          set({
            kanji,
            kanjiIndex: buildKanjiIndex(kanji),
            labels: state.pack
              ? buildItemLabels(state.pack, state.catalog, state.words, kanji)
              : state.labels,
          })
        },
        setContentWarning: (message) => set({ contentWarning: message }),

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
            errorTallies: errorKey
              ? bumpTally(state.errorTallies, errorKey, result.isCorrect)
              : state.errorTallies,
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
            true,
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
            calculateReward(
              'REVIEW_COMPLETED',
              DEFAULT_REWARD_CONFIG,
              multiplierFor(state.subscriptionType),
            ),
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
            calculateReward(
              'REVIEW_COMPLETED',
              DEFAULT_REWARD_CONFIG,
              multiplierFor(state.subscriptionType),
            ),
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
            calculateReward(
              'CONVERSATION_COMPLETED',
              DEFAULT_REWARD_CONFIG,
              multiplierFor(state.subscriptionType),
            ),
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
            calculateReward(
              'REVIEW_COMPLETED',
              DEFAULT_REWARD_CONFIG,
              multiplierFor(state.subscriptionType),
            ),
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

          const patch: Partial<ProgressState> = { sakura: state.sakura - cost }
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

        // Borra el aprendizaje, no la configuracion: el tema, el nombre y el
        // objetivo diario no son progreso y volver al onboarding sorprende.
        resetProgress: () => set({ ...initialProgress }),

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

        courseMap: () => {
          const { pack, lessonProgress } = get()
          if (!pack) return null
          if (courseMapCache?.pack === pack && courseMapCache.progress === lessonProgress) {
            return courseMapCache.map
          }
          const map = buildCourseMap(
            pack.worlds,
            pack.units,
            pack.lessons,
            Object.values(lessonProgress),
          )
          courseMapCache = { pack, progress: lessonProgress, map }
          return map
        },

        masteryOf: (learningItemId) =>
          get().learningProgress[canonicalLearningItemId(learningItemId)]?.mastery ?? 'UNKNOWN',

        dueReviewItems: () => {
          const now = Date.now()
          return get().reviewItems.filter((item) => isDue(item, now))
        },

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
    },
  ),
)
