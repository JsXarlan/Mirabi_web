import { beforeEach, describe, expect, it } from 'vitest'

import {
  PLACEMENT_PASS_PERCENTAGE,
  buildPlacementTest,
  candidateWorldIds,
  evaluatePlacement,
  worldsToSkip,
} from './placement'
import { buildKanaExercise, kanaExerciseFromId } from './kanaExercises'
import { resolveHomeTrigger } from './yuki'
import { streakStatus } from './rewards'
import { epochWeekOf, generateWeeklyMissions } from './missions'
import { useMirabiStore } from '../store/useMirabiStore'
import { characterCatalog, coursePack, freshStore } from '../../test/content'

const store = () => useMirabiStore.getState()

beforeEach(() => {
  freshStore()
})

describe('colocación inicial', () => {
  it('propone saltar solo un prefijo de mundos, nunca sueltos', () => {
    const order = coursePack.worlds.map((world) => world.id)

    expect(candidateWorldIds('FROM_ZERO', coursePack)).toEqual([])
    expect(candidateWorldIds('SOME_HIRAGANA', coursePack)).toEqual(order.slice(0, 1))
    expect(candidateWorldIds('HIRAGANA_KATAKANA', coursePack)).toEqual(order.slice(0, 2))
    expect(candidateWorldIds('BASIC_VOCABULARY', coursePack)).toEqual(order.slice(0, 4))
  })

  it('arma la prueba con los ejercicios que el contenido marca como medida', () => {
    const candidates = candidateWorldIds('BASIC_VOCABULARY', coursePack)
    const questions = buildPlacementTest(coursePack, candidates)

    expect(questions.length).toBeGreaterThan(0)
    for (const question of questions) {
      expect(question.exercise.appearsInCheckpoint).toBe(true)
      // Sin escritura libre: mediria la ortografia, no el nivel.
      expect(question.exercise.options.length).toBeGreaterThan(0)
    }
    // Como mucho cuatro preguntas por mundo, para que no se haga largo.
    for (const worldId of candidates) {
      expect(questions.filter((q) => q.worldId === worldId).length).toBeLessThanOrEqual(4)
    }
  })

  it('salta el mundo que se supera y corta en el primero que se falla', () => {
    const candidates = candidateWorldIds('BASIC_VOCABULARY', coursePack)
    const questions = buildPlacementTest(coursePack, candidates)

    // Se acierta todo del primer mundo y se falla todo el segundo.
    const answers: Record<string, boolean> = {}
    for (const question of questions) {
      answers[question.exercise.id] = question.worldId !== candidates[1]
    }

    const results = evaluatePlacement(questions, answers)
    expect(results.find((r) => r.worldId === candidates[0])?.percentage).toBe(100)
    expect(results.find((r) => r.worldId === candidates[1])?.passed).toBe(false)

    // Aunque el tercero y el cuarto se aprueben, no se saltan: dejarian un hueco.
    expect(worldsToSkip(results, candidates)).toEqual([candidates[0]])
  })

  it('exige el umbral declarado para dar un mundo por sabido', () => {
    const candidates = candidateWorldIds('SOME_HIRAGANA', coursePack)
    const questions = buildPlacementTest(coursePack, candidates)

    const half: Record<string, boolean> = {}
    questions.forEach((question, index) => {
      half[question.exercise.id] = index === 0
    })

    const [result] = evaluatePlacement(questions, half)
    expect(result.percentage).toBeLessThan(PLACEMENT_PASS_PERCENTAGE)
    expect(result.passed).toBe(false)
  })

  it('marca las lecciones del mundo saltado sin regalar XP ni racha', () => {
    const worldId = coursePack.worlds[0].id
    store().applyPlacement([worldId])

    const state = store()
    const lessonIds = coursePack.units
      .filter((unit) => unit.worldId === worldId)
      .flatMap((unit) => unit.lessonIds)

    for (const lessonId of lessonIds) {
      expect(state.lessonProgress[lessonId].status).toBe('COMPLETED')
      // attempts 0 delata que se dio por sabida, no que se estudiara.
      expect(state.lessonProgress[lessonId].attempts).toBe(0)
    }

    expect(state.totalXp).toBe(0)
    expect(state.sakura).toBe(0)
    expect(state.streakDays).toBe(0)
    expect(state.totalLessonsCompleted).toBe(0)
    expect(state.placementDecided).toBe(true)

    // El camino arranca ya en el mundo siguiente.
    const map = state.courseMap()!
    expect(map.currentWorldId).toBe(coursePack.worlds[1].id)
  })

  it('empezar desde el principio deja el curso intacto', () => {
    store().applyPlacement([])
    expect(store().lessonProgress).toEqual({})
    expect(store().placementDecided).toBe(true)
    expect(store().courseMap()!.currentWorldId).toBe(coursePack.worlds[0].id)
  })
})

describe('práctica de kana', () => {
  it('genera siempre la misma pregunta para el mismo carácter', () => {
    const character = characterCatalog.characters[10]
    const first = buildKanaExercise(character, characterCatalog)
    const second = buildKanaExercise(character, characterCatalog)

    expect(first.id).toBe(second.id)
    expect(first.options.map((option) => option.text)).toEqual(
      second.options.map((option) => option.text),
    )
    expect(first.options.map((option) => option.text)).toContain(character.romaji)
    // Los distractores salen del mismo silabario.
    const sameScript = new Set(
      characterCatalog.characters
        .filter((other) => other.script === character.script)
        .map((other) => other.romaji),
    )
    for (const option of first.options) expect(sameScript.has(option.text)).toBe(true)
  })

  it('el repaso reconstruye el ejercicio a partir de su id', () => {
    const character = characterCatalog.characters[3]
    const original = buildKanaExercise(character, characterCatalog)
    const rebuilt = kanaExerciseFromId(original.id, characterCatalog)

    expect(rebuilt).not.toBeNull()
    expect(rebuilt!.prompt).toBe(original.prompt)
    expect(rebuilt!.options.map((o) => o.text)).toEqual(original.options.map((o) => o.text))
    expect(kanaExerciseFromId('ex_m0_u1_l1_01', characterCatalog)).toBeNull()
  })

  it('fallar un kana practicando lo programa en el repaso', () => {
    const character = characterCatalog.characters[0]
    const exercise = buildKanaExercise(character, characterCatalog)
    const wrong = exercise.options.find((option) => option.text !== character.romaji)!

    store().answerExercise(exercise, wrong.text)

    const [item] = store().reviewItems
    expect(item.learningItemId).toBe(character.learningItemId)
    expect(item.srsCategory).toBe('KANA')
    expect(item.status).toBe('PENDING')
    expect(item.sourceExerciseId).toBe(exercise.id)
    // Y el dominio del centro de caracteres se entera.
    expect(store().masteryOf(character.learningItemId)).toBe('UNKNOWN')
    expect(store().learningProgress[character.learningItemId].wrongAnswers).toBe(1)
  })

  it('no cuenta dos veces las respuestas al cerrar la práctica', () => {
    const characters = characterCatalog.characters.slice(0, 3)
    for (const character of characters) {
      const exercise = buildKanaExercise(character, characterCatalog)
      store().answerExercise(exercise, character.romaji)
    }
    store().completeCharacterPractice(3, 0)

    expect(store().totalAnswers).toBe(3)
    expect(store().correctAnswers).toBe(3)
  })
})

describe('racha vista desde hoy', () => {
  it('sigue viva el mismo día', () => {
    expect(streakStatus(7, 100, 100)).toEqual({ days: 7, atRisk: false, lost: false })
  })

  it('está en riesgo si la última actividad fue ayer', () => {
    expect(streakStatus(7, 99, 100)).toEqual({ days: 7, atRisk: true, lost: false })
  })

  it('vale cero en cuanto se salta un día, sin esperar a la próxima lección', () => {
    expect(streakStatus(7, 97, 100)).toEqual({ days: 0, atRisk: false, lost: true })
  })

  it('sin actividad previa no hay racha que perder', () => {
    expect(streakStatus(0, null, 100)).toEqual({ days: 0, atRisk: false, lost: false })
  })
})

describe('Yuki al abrir', () => {
  const base = {
    daysSinceLastActivity: 0,
    streakLost: false,
    streakDays: 3,
    pendingReviews: 0,
    lessonsCompleted: 4,
    dailyGoalCompleted: false,
  }

  it('da la bienvenida a quien todavía no ha hecho nada', () => {
    expect(resolveHomeTrigger({ ...base, lessonsCompleted: 0 })).toBe('RETURNING_USER')
  })

  it('la ausencia manda sobre el resto', () => {
    expect(resolveHomeTrigger({ ...base, daysSinceLastActivity: 6, pendingReviews: 5 })).toBe(
      'IDLE_USER',
    )
    expect(resolveHomeTrigger({ ...base, daysSinceLastActivity: 3, streakLost: true })).toBe(
      'STREAK_LOST',
    )
    expect(resolveHomeTrigger({ ...base, daysSinceLastActivity: 1 })).toBe('RETURNING_USER')
  })

  it('con el día al día, celebra, avisa del repaso o acompaña la racha', () => {
    expect(resolveHomeTrigger({ ...base, dailyGoalCompleted: true })).toBe(
      'DAILY_MISSION_COMPLETED',
    )
    expect(resolveHomeTrigger({ ...base, pendingReviews: 2 })).toBe('MANY_ERRORS')
    expect(resolveHomeTrigger(base)).toBe('STREAK_CONTINUED')
    expect(resolveHomeTrigger({ ...base, streakDays: 0 })).toBe('ALL_CAUGHT_UP')
  })
})

describe('misiones semanales', () => {
  it('la semana empieza en lunes', () => {
    // El dia epoch 0 fue jueves 1/1/1970; el lunes 5/1/1970 es el dia 4.
    expect(epochWeekOf(4)).toBe(epochWeekOf(10))
    expect(epochWeekOf(3)).toBe(epochWeekOf(4) - 1)
    expect(epochWeekOf(11)).toBe(epochWeekOf(4) + 1)
  })

  it('piden más de lo que cabe en un día', () => {
    const weekly = generateWeeklyMissions()
    expect(weekly.length).toBeGreaterThan(0)
    for (const mission of weekly) {
      expect(mission.type).toBe('WEEKLY')
      expect(mission.targetValue).toBeGreaterThan(1)
      expect(mission.rewardSakura).toBe(15)
    }
  })

  it('avanzan con la misma actividad que las diarias', () => {
    const lesson = coursePack.lessons[0]
    for (const exercise of lesson.exercises.filter((e) => e.correctAnswer !== null)) {
      store().answerExercise(exercise, exercise.correctAnswer!)
    }
    store().completeLesson(lesson.id, 3, 0)

    const weeklyLessons = store().weekMissions().find((m) => m.definition.id === 'weekly_lessons')
    expect(weeklyLessons?.progress.currentProgress).toBe(1)
    expect(weeklyLessons?.progress.completed).toBe(false)

    const weeklyXp = store().weekMissions().find((m) => m.definition.id === 'weekly_xp')
    expect(weeklyXp?.progress.currentProgress).toBe(10)
  })
})
