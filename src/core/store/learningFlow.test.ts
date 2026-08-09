import { beforeEach, describe, expect, it } from 'vitest'

import { useMirabiStore } from './useMirabiStore'
import { intervalsFor } from '../domain/review'
import { catalogKanaId } from '../domain/kanaIds'
import { buildKanjiExercise } from '../domain/kanjiExercises'
import { buildWordExercise } from '../domain/wordExercises'
import {
  answerableSteps,
  characterCatalog,
  coursePack,
  freshStore,
  kanjiCatalog,
  lessonById,
  wordCatalog,
  wrongAnswerFor,
} from '../../test/content'

/**
 * Recorridos completos sobre el store real y el contenido real.
 *
 * No hay dobles: se responde a los ejercicios que sirve la app y se comprueba
 * el estado que queda guardado, que es lo que de verdad ve la persona al dia
 * siguiente.
 */

const FIRST_LESSON = 'lesson_m0_u1_l1_first_sounds'
const DAY = 86_400_000

const store = () => useMirabiStore.getState()

/** Responde una leccion entera acertando todo. */
function completeLessonPerfectly(lessonId: string) {
  const steps = answerableSteps(lessonId)
  for (const exercise of steps) {
    store().answerExercise(exercise, exercise.correctAnswer!)
  }
  return store().completeLesson(lessonId, steps.length, 0)
}

beforeEach(() => {
  freshStore()
})

describe('una lección completa', () => {
  it('paga XP y Sakura, marca la lección y completa la misión diaria', () => {
    const outcome = completeLessonPerfectly(FIRST_LESSON)

    expect(outcome.isPerfect).toBe(true)
    expect(outcome.accuracyPercentage).toBe(100)
    // Leccion perfecta: 10 XP y 1 + 1 de bonus de Sakura.
    expect(outcome.reward.xpEarned).toBe(10)
    expect(outcome.reward.sakuraEarned).toBe(2)

    const state = store()
    expect(state.totalXp).toBe(10)
    expect(state.lessonProgress[FIRST_LESSON].status).toBe('COMPLETED')
    expect(state.totalLessonsCompleted).toBe(1)
    expect(state.streakDays).toBe(1)

    const lessonMission = state.todayMissions().find((m) => m.definition.id === 'daily_lesson')
    expect(lessonMission?.progress.completed).toBe(true)
    // 2 de la leccion + 5 de la mision diaria + 3 del logro "Primer paso", todo cobrado automaticamente.
    expect(state.sakura).toBe(10)

    expect(state.achievementUnlocks.first_lesson).toBeDefined()
    expect(state.achievementToastQueue.map((u) => u.achievementId)).toContain('first_lesson')

    // Primera actividad del dia: queda una sola muestra para sugerir horario.
    expect(state.recentActivityHours.length).toBe(1)
  })

  it('no vuelve a pagar el logro al repetir la leccion', () => {
    completeLessonPerfectly(FIRST_LESSON)
    const sakuraAfterFirst = store().sakura

    completeLessonPerfectly(FIRST_LESSON)

    expect(store().sakura).toBeGreaterThan(sakuraAfterFirst) // paga XP/Sakura de leccion otra vez...
    expect(
      store()
        .achievementToastQueue.filter((u) => u.achievementId === 'first_lesson').length,
    ).toBe(1) // ...pero el logro no se vuelve a encolar ni a pagar.
  })

  it('no vuelve a pagar el bonus de unidad ni cuenta dos veces al repetir', () => {
    completeLessonPerfectly(FIRST_LESSON)
    expect(store().todayMissions().find((m) => m.definition.id === 'daily_lesson')?.progress
      .completed).toBe(true)
    const sakuraTrasPrimera = store().sakura

    const repeat = completeLessonPerfectly(FIRST_LESSON)

    expect(repeat.unitBonus).toBeNull()
    expect(repeat.worldBonus).toBeNull()
    // La leccion sigue contando una sola vez para el progreso del curso.
    expect(store().totalLessonsCompleted).toBe(1)
    expect(store().courseMap()!.courseProgress.completedLessons).toBe(1)
    // Repetir paga la leccion (2) y, con los 20 XP acumulados, cierra la mision
    // de XP del dia (5). La mision de leccion ya cobrada no se paga otra vez.
    expect(store().sakura).toBe(sakuraTrasPrimera + 2 + 5)
    expect(store().todayMissions().find((m) => m.definition.id === 'daily_xp')?.progress.completed)
      .toBe(true)
  })
})

describe('repetición espaciada', () => {
  it('un fallo entra en la cola y vence hoy', () => {
    const exercise = answerableSteps(FIRST_LESSON)[0]
    const result = store().answerExercise(exercise, wrongAnswerFor(exercise))

    expect(result.isCorrect).toBe(false)
    const [item] = store().reviewItems
    expect(item.box).toBe(0)
    expect(item.status).toBe('PENDING')
    expect(item.lapses).toBe(1)
    expect(store().dueReviewItems()).toHaveLength(1)
  })

  it('acertar a la primera también siembra el SRS cuando el ejercicio lo declara', () => {
    const exercise = answerableSteps(FIRST_LESSON).find((step) => step.entersSrs)!
    store().answerExercise(exercise, exercise.correctAnswer!)

    const [item] = store().reviewItems
    expect(item.status).toBe('SCHEDULED')
    expect(item.box).toBe(1)
    // Programado a futuro: hoy no molesta.
    expect(store().dueReviewItems()).toHaveLength(0)
    expect(item.nextReviewAtEpochMillis).toBeGreaterThan(Date.now())
  })

  it('cada acierto aleja el siguiente repaso y el último gradúa el elemento', () => {
    const exercise = answerableSteps(FIRST_LESSON).find((step) => step.srsCategory !== 'NONE')!
    store().answerExercise(exercise, wrongAnswerFor(exercise))

    const intervals = intervalsFor(exercise.srsCategory)
    let previousInterval = -1

    // Se repasa acertando hasta agotar las cajas.
    for (let box = 1; box < intervals.length; box += 1) {
      const item = store().reviewItems[0]
      store().completeReviewSession([{ item, isCorrect: true }])

      const updated = store().reviewItems[0]
      expect(updated.box).toBe(box)
      expect(updated.status).toBe('SCHEDULED')

      const days = Math.round((updated.nextReviewAtEpochMillis - Date.now()) / DAY)
      expect(days).toBe(intervals[box])
      expect(days).toBeGreaterThan(previousInterval)
      previousInterval = days
    }

    const graduating = store().reviewItems[0]
    store().completeReviewSession([{ item: graduating, isCorrect: true }])

    const finalItem = store().reviewItems[0]
    expect(finalItem.status).toBe('COMPLETED')
    expect(store().dueReviewItems()).toHaveLength(0)
  })

  it('fallar en el repaso devuelve el elemento a la caja 0 sin duplicarlo', () => {
    const exercise = answerableSteps(FIRST_LESSON).find((step) => step.entersSrs)!
    store().answerExercise(exercise, exercise.correctAnswer!)
    store().answerExercise(exercise, exercise.correctAnswer!)
    expect(store().reviewItems[0].box).toBe(2)

    store().completeReviewSession([{ item: store().reviewItems[0], isCorrect: false }])

    const item = store().reviewItems[0]
    expect(store().reviewItems).toHaveLength(1)
    expect(item.box).toBe(0)
    expect(item.status).toBe('PENDING')
    expect(item.lapses).toBe(1)
    expect(store().dueReviewItems()).toHaveLength(1)
  })
})

describe('kana del curso y del catálogo', () => {
  it('todos los kana que enseña el curso existen en el catálogo', () => {
    const catalogIds = new Set(characterCatalog.characters.map((c) => c.learningItemId))
    const courseKanaIds = new Set(
      coursePack.lessons
        .flatMap((lesson) => lesson.exercises)
        .filter((exercise) => exercise.learningItemType === 'KANA')
        .map((exercise) => exercise.learningItemId),
    )

    expect(courseKanaIds.size).toBeGreaterThan(0)
    for (const id of courseKanaIds) {
      expect(catalogKanaId(id), `sin equivalente en el catálogo: ${id}`).not.toBeNull()
      expect(catalogIds.has(catalogKanaId(id)!)).toBe(true)
    }
  })

  it('practicar un kana en una lección mueve el dominio del centro de caracteres', () => {
    const kanaExercise = coursePack.lessons
      .flatMap((lesson) => lesson.exercises)
      .find(
        (exercise) =>
          exercise.learningItemType === 'KANA' &&
          exercise.correctAnswer !== null &&
          exercise.options.length > 0,
      )!

    const catalogId = catalogKanaId(kanaExercise.learningItemId)!
    expect(store().masteryOf(catalogId)).toBe('UNKNOWN')

    store().answerExercise(kanaExercise, kanaExercise.correctAnswer!)

    // El progreso se guarda con el id del catalogo, que es el que lee la pantalla.
    expect(store().masteryOf(catalogId)).toBe('FAMILIAR')
    expect(store().learningProgress[catalogId]).toBeDefined()
  })
})

describe('práctica de palabras y kanji', () => {
  /*
   * El test mas importante de la biblioteca: practicarla y acertar en una
   * leccion tienen que mover la misma fila de progreso, no dos. Si un dia una
   * palabra acuñada colisiona con un id del curso que significa otra cosa,
   * es aqui donde se notaria -el dominio subiria con la respuesta equivocada
   * mezclada con la correcta-.
   */
  it('practicar una palabra en la biblioteca y acertarla en el curso suman al mismo progreso', () => {
    const courseVocabIds = new Set(
      coursePack.lessons
        .flatMap((lesson) => lesson.exercises)
        .filter((exercise) => exercise.learningItemType === 'VOCABULARY')
        .map((exercise) => exercise.learningItemId),
    )
    const word = wordCatalog.words.find((item) => courseVocabIds.has(item.learningItemId))!
    expect(word, 'ninguna palabra de la biblioteca comparte id con el curso').toBeDefined()

    expect(store().masteryOf(word.learningItemId)).toBe('UNKNOWN')

    const wordExercise = buildWordExercise(word, wordCatalog)
    store().answerExercise(wordExercise, wordExercise.correctAnswer!)
    expect(store().masteryOf(word.learningItemId)).toBe('FAMILIAR')

    const courseExercise = coursePack.lessons
      .flatMap((lesson) => lesson.exercises)
      .find(
        (exercise) =>
          exercise.learningItemId === word.learningItemId && exercise.correctAnswer !== null,
      )!
    store().answerExercise(courseExercise, courseExercise.correctAnswer!)

    // Dos aciertos sobre la misma fila: sube un escalón más, no arranca otra.
    expect(store().masteryOf(word.learningItemId)).toBe('LEARNING')
    expect(Object.keys(store().learningProgress)).toHaveLength(1)
  })

  it('practicar una palabra la programa en el repaso con la categoría de vocabulario', () => {
    const word = wordCatalog.words[0]
    const exercise = buildWordExercise(word, wordCatalog)

    store().answerExercise(exercise, wrongAnswerFor(exercise))

    const [item] = store().reviewItems
    expect(item.learningItemId).toBe(word.learningItemId)
    expect(item.srsCategory).toBe('CORE_VOCABULARY')
    expect(item.status).toBe('PENDING')
  })

  it('practicar un kanji mueve su propio progreso, no el de la palabra que lo usa', () => {
    const kanji = kanjiCatalog.kanji.find((item) => item.wordIds.length > 0)!
    expect(kanji, 'ningún kanji de la semilla enlaza con una palabra').toBeDefined()

    const exercise = buildKanjiExercise(kanji, kanjiCatalog)
    store().answerExercise(exercise, exercise.correctAnswer!)

    expect(store().masteryOf(kanji.learningItemId)).toBe('FAMILIAR')
    // La palabra que lo usa no se ve afectada: son elementos de aprendizaje distintos.
    const [wordId] = kanji.wordIds
    const word = wordCatalog.words.find((item) => item.id === wordId)!
    expect(store().masteryOf(word.learningItemId)).toBe('UNKNOWN')
  })
})

describe('práctica de escritura', () => {
  it('mueve el dominio, paga como un repaso y avanza la misión de caracteres, sin tocar el SRS', () => {
    const [a, b] = characterCatalog.characters.filter((item) => item.script === 'HIRAGANA')

    const outcome = store().completeWritingPractice([
      { learningItemId: a.learningItemId, gotIt: true },
      { learningItemId: b.learningItemId, gotIt: false },
    ])

    expect(store().masteryOf(a.learningItemId)).toBe('FAMILIAR')
    expect(store().masteryOf(b.learningItemId)).toBe('UNKNOWN') // fallar no baja de UNKNOWN
    expect(outcome.correctAnswers).toBe(1)
    expect(outcome.wrongAnswers).toBe(1)
    expect(outcome.reward.xpEarned).toBeGreaterThan(0) // paga como REVIEW_COMPLETED

    const charactersMission = store()
      .todayMissions()
      .find((m) => m.definition.id === 'daily_characters')
    expect(charactersMission?.progress.currentProgress).toBe(2)

    // Limite explicito de esta v1: no hay ContentExercise reconstruible para
    // un trazo fallado, asi que todavia no entra en repaso espaciado.
    expect(store().reviewItems).toHaveLength(0)
  })
})

describe('puntos débiles', () => {
  it('cuenta los fallos por tipo de error declarado en el contenido', () => {
    const exercise = coursePack.lessons
      .flatMap((lesson) => lesson.exercises)
      .find((item) => item.errorType !== 'NONE' && item.options.length > 0)!

    store().answerExercise(exercise, wrongAnswerFor(exercise))
    store().answerExercise(exercise, exercise.correctAnswer!)

    expect(store().errorTallies[exercise.errorType]).toEqual({ wrong: 1, total: 2 })
  })
})

describe('tienda con efecto real', () => {
  it('el XP Boost duplica el XP de la siguiente sesión y se consume', () => {
    useMirabiStore.setState({ sakura: 100 })
    expect(store().buyShopItem('xp_boost', 25)).toBe(true)
    expect(store().xpBoostSessions).toBe(1)

    completeLessonPerfectly(FIRST_LESSON)
    expect(store().totalXp).toBe(20)
    expect(store().xpBoostSessions).toBe(0)

    const second = coursePack.lessons[1]
    completeLessonPerfectly(second.id)
    // Sin boost, la segunda leccion vuelve a pagar 10.
    expect(store().totalXp).toBe(30)
  })

  it('el escudo protege la racha en lugar de reiniciarla', () => {
    const today = Math.floor(new Date().setHours(0, 0, 0, 0) / DAY)
    useMirabiStore.setState({
      sakura: 100,
      streakDays: 7,
      // Hueco de tres dias: sin escudo la racha se perderia.
      lastActivityEpochDay: today - 3,
    })
    store().buyShopItem('streak_shield', 20)

    completeLessonPerfectly(FIRST_LESSON)

    expect(store().streakDays).toBe(8)
    expect(store().streakShields).toBe(0)
  })

  it('sin Sakura no se compra nada', () => {
    useMirabiStore.setState({ sakura: 5 })
    expect(store().buyShopItem('streak_shield', 20)).toBe(false)
    expect(store().sakura).toBe(5)
    expect(store().streakShields).toBe(0)
  })
})

describe('datos de la persona', () => {
  it('reiniciar el progreso conserva las preferencias', () => {
    store().setDisplayName('Javi')
    store().setTheme('dark')
    store().setDailyGoalMinutes(20)
    completeLessonPerfectly(FIRST_LESSON)

    store().resetProgress()

    const state = store()
    expect(state.totalXp).toBe(0)
    expect(state.reviewItems).toEqual([])
    expect(state.lessonProgress).toEqual({})
    // Lo que no es progreso sobrevive: el nombre, el tema y el objetivo.
    expect(state.displayName).toBe('Javi')
    expect(state.theme).toBe('dark')
    expect(state.dailyGoalMinutes).toBe(20)
    expect(state.onboardingCompleted).toBe(true)
  })

  it('exportar e importar devuelve el mismo progreso', () => {
    completeLessonPerfectly(FIRST_LESSON)
    const backup = store().exportProgress()
    const xp = store().totalXp
    const items = store().reviewItems.length

    store().resetProgress()
    expect(store().totalXp).toBe(0)

    expect(store().importProgress(backup)).toBe(true)
    expect(store().totalXp).toBe(xp)
    expect(store().reviewItems).toHaveLength(items)
    expect(store().lessonProgress[FIRST_LESSON].status).toBe('COMPLETED')
  })

  it('rechaza un fichero que no es una copia de Mirabi', () => {
    expect(store().importProgress('{"cualquier":"cosa"}')).toBe(false)
    expect(store().importProgress('esto no es json')).toBe(false)
  })
})

describe('estado guardado de una versión anterior', () => {
  it('adopta los repasos de v1, que no tenían caja ni fecha', async () => {
    localStorage.setItem(
      'mirabi-state-v1',
      JSON.stringify({
        version: 1,
        state: {
          onboardingCompleted: true,
          totalXp: 40,
          sakura: 3,
          streakDays: 2,
          reviewItems: [
            {
              id: 'review-vocab_kao-1',
              learningItemId: 'vocab_kao',
              learningItemType: 'VOCABULARY',
              priority: 'MEDIUM',
              status: 'PENDING',
              masteryBefore: 'UNKNOWN',
              mistakeType: 'WRONG_MEANING',
              createdAtEpochMillis: Date.now() - 5 * DAY,
              sourceExerciseId: 'ex_m0_u1_l1_01',
            },
          ],
        },
      }),
    )

    await useMirabiStore.persist.rehydrate()

    const state = store()
    expect(state.totalXp).toBe(40)

    const [item] = state.reviewItems
    // Se adopta como recien fallado: vuelve hoy en vez de desaparecer.
    expect(item.box).toBe(0)
    expect(item.srsCategory).toBe('NONE')
    expect(item.nextReviewAtEpochMillis).toBeLessThanOrEqual(Date.now())
    expect(state.dueReviewItems()).toHaveLength(1)
    // Los campos nuevos existen con su valor por defecto.
    expect(state.errorTallies).toEqual({})
    expect(state.streakShields).toBe(0)
  })
})

describe('el curso que se sirve', () => {
  it('mantiene la forma que la app espera', () => {
    expect(coursePack.worlds).toHaveLength(6)
    expect(coursePack.units).toHaveLength(30)
    expect(coursePack.lessons).toHaveLength(78)

    const map = store().courseMap()!
    expect(map.courseProgress.totalLessons).toBe(78)
    // Al empezar, el camino apunta a la primera leccion del primer mundo.
    expect(map.currentLessonId).toBe(lessonById(FIRST_LESSON).id)
  })

  it('devuelve el mismo mapa mientras el progreso no cambie', () => {
    const first = store().courseMap()
    expect(store().courseMap()).toBe(first)

    completeLessonPerfectly(FIRST_LESSON)
    expect(store().courseMap()).not.toBe(first)
  })
})
