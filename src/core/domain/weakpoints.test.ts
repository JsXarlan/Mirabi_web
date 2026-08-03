import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildWeakPoints,
  criticalTagLabel,
  errorTypeLabel,
  masteryBreakdown,
} from './weakpoints'
import { useMirabiStore } from '../store/useMirabiStore'
import { coursePack, freshStore, wrongAnswerFor } from '../../test/content'

/**
 * La pantalla de puntos debiles no inventa nada: cruza los contadores de error
 * con la cola de repaso. Aqui se comprueba ese cruce con los fallos que produce
 * el store real al responder ejercicios del curso real.
 */

const store = () => useMirabiStore.getState()

const allExercises = coursePack.lessons.flatMap((lesson) => lesson.exercises)

/** Un ejercicio corregible que ademas tipifica su fallo. */
function exerciseWithErrorType(skip: string[] = []) {
  const exercise = allExercises.find(
    (item) =>
      item.errorType !== 'NONE' &&
      item.options.length > 0 &&
      item.correctAnswer !== null &&
      !skip.includes(item.errorType),
  )
  if (!exercise) throw new Error('El pack no trae ejercicios con errorType')
  return exercise
}

beforeEach(() => {
  freshStore()
})

describe('lista de puntos débiles', () => {
  it('acertar no crea ningún punto débil', () => {
    const exercise = exerciseWithErrorType()
    store().answerExercise(exercise, exercise.correctAnswer!)

    // El contador existe (una respuesta), pero sin fallos no hay nada que avisar.
    expect(store().errorTallies[exercise.errorType]).toEqual({ wrong: 0, total: 1 })
    expect(buildWeakPoints(store().errorTallies, store().reviewItems)).toEqual([])
  })

  it('un fallo se nombra con el texto del contenido y arrastra su repaso pendiente', () => {
    const exercise = exerciseWithErrorType()
    store().answerExercise(exercise, wrongAnswerFor(exercise))

    const [point] = buildWeakPoints(store().errorTallies, store().reviewItems)

    expect(point.key).toBe(exercise.errorType)
    expect(point.title).toBe(errorTypeLabel(exercise.errorType).title)
    expect(point.wrong).toBe(1)
    expect(point.total).toBe(1)
    // El fallo dejo un item en la cola: el punto sigue vivo.
    expect(point.pendingReviews).toBe(1)
  })

  it('graduar el repaso apaga el pendiente y baja la gravedad', () => {
    const exercise = exerciseWithErrorType()
    store().answerExercise(exercise, wrongAnswerFor(exercise))

    const before = buildWeakPoints(store().errorTallies, store().reviewItems)[0]
    expect(before.pendingReviews).toBe(1)

    // Se repasa acertando hasta que el item se gradua y sale de la cola.
    let guard = 0
    while (store().reviewItems[0].status !== 'COMPLETED' && guard < 20) {
      store().completeReviewSession([{ item: store().reviewItems[0], isCorrect: true }])
      guard += 1
    }
    expect(store().reviewItems[0].status).toBe('COMPLETED')

    const after = buildWeakPoints(store().errorTallies, store().reviewItems)[0]
    // El fallo no se borra de la historia, pero ya no hay nada programado.
    expect(after.wrong).toBe(1)
    expect(after.pendingReviews).toBe(0)
    // Cada acierto del repaso suma al total, asi que el ratio -y la urgencia- caen.
    expect(after.total).toBeGreaterThan(before.total)
    expect(after.severity).toBeLessThan(before.severity)
  })

  it('el ratio manda y el volumen desempata', () => {
    const points = buildWeakPoints(
      {
        // Mismo ratio alto, distinto volumen.
        PARTICLE_WA_HA: { wrong: 1, total: 1 },
        AUDIO_SU_TSU: { wrong: 8, total: 10 },
        // Muchos intentos con pocos fallos: molesta menos.
        DEMO_DISTANCE: { wrong: 2, total: 10 },
      },
      [],
    )

    expect(points.map((point) => point.key)).toEqual([
      'AUDIO_SU_TSU',
      'PARTICLE_WA_HA',
      'DEMO_DISTANCE',
    ])
    // 0,8 * 80 + 5 * 4 y 1 * 80 + 1 * 4 empatan a 84; gana quien mas falla.
    expect(points[0].severity).toBe(84)
    expect(points[1].severity).toBe(84)
    expect(points[2].severity).toBe(24)
  })

  it('la gravedad se corta en 100', () => {
    const [point] = buildWeakPoints({ PARTICLE_WA_HA: { wrong: 40, total: 40 } }, [])
    expect(point.severity).toBe(100)
  })

  it('un repaso ya completado no cuenta como pendiente', () => {
    const exercise = exerciseWithErrorType()
    store().answerExercise(exercise, wrongAnswerFor(exercise))

    const completed = store().reviewItems.map((item) => ({ ...item, status: 'COMPLETED' as const }))
    const [point] = buildWeakPoints(store().errorTallies, completed)

    expect(point.pendingReviews).toBe(0)
  })
})

describe('textos de los fallos', () => {
  it('todos los errorType del curso tienen explicación escrita', () => {
    const declared = new Set(
      allExercises.map((item) => item.errorType).filter((type) => type !== 'NONE'),
    )

    expect(declared.size).toBeGreaterThan(0)
    for (const type of declared) {
      const { title, advice } = errorTypeLabel(type)
      // Sin texto propio, el fallback devolveria el id en minusculas.
      expect(title, `sin título para ${type}`).not.toBe(type.replaceAll('_', ' ').toLowerCase())
      expect(advice.length).toBeGreaterThan(0)
    }
  })

  it('un errorType que el contenido añada mañana sigue siendo legible', () => {
    const { title, advice } = errorTypeLabel('VERB_TE_FORM')
    expect(title).toBe('verb te form')
    expect(advice.length).toBeGreaterThan(0)
  })

  it('las confusiones críticas se nombran con su símbolo', () => {
    expect(criticalTagLabel('CRIT_PARTICLE_WA')).toBe('partícula は')
    // Y una que aun no tenga texto pierde el prefijo en vez de salir cruda.
    expect(criticalTagLabel('CRIT_VERB_TE_FORM')).toBe('verb te form')
  })

  it('todas las etiquetas críticas del curso están escritas', () => {
    const declared = new Set(allExercises.flatMap((item) => item.criticalTags))

    expect(declared.size).toBeGreaterThan(0)
    for (const tag of declared) {
      const fallback = tag.replace(/^CRIT_/, '').replaceAll('_', ' ').toLowerCase()
      expect(criticalTagLabel(tag), `sin texto para ${tag}`).not.toBe(fallback)
    }
  })
})

describe('reparto de dominio', () => {
  it('sin nada seguido no hay reparto', () => {
    const breakdown = masteryBreakdown([])

    expect(breakdown.tracked).toBe(0)
    expect(breakdown.averageValue).toBe(0)
    expect(breakdown.byScore).toEqual({
      UNKNOWN: 0,
      FAMILIAR: 0,
      LEARNING: 0,
      MASTERED: 0,
      EXPERT: 0,
    })
  })

  it('cuenta cada elemento en su escalón y promedia lo aprendido', () => {
    const first = exerciseWithErrorType()
    const second = allExercises.find(
      (item) =>
        item.correctAnswer !== null &&
        item.options.length > 0 &&
        item.learningItemId !== first.learningItemId,
    )!

    // Uno se acierta una vez (FAMILIAR) y el otro dos (LEARNING).
    store().answerExercise(first, first.correctAnswer!)
    store().answerExercise(second, second.correctAnswer!)
    store().answerExercise(second, second.correctAnswer!)

    const breakdown = masteryBreakdown(Object.values(store().learningProgress))

    expect(breakdown.tracked).toBe(2)
    expect(breakdown.byScore.FAMILIAR).toBe(1)
    expect(breakdown.byScore.LEARNING).toBe(1)
    // 25 y 50 de la escala de dominio.
    expect(breakdown.averageValue).toBe(37.5)
  })

  it('fallar de entrada deja el elemento en el escalón más bajo', () => {
    const exercise = exerciseWithErrorType()
    store().answerExercise(exercise, wrongAnswerFor(exercise))

    const breakdown = masteryBreakdown(Object.values(store().learningProgress))

    expect(breakdown.tracked).toBe(1)
    expect(breakdown.byScore.UNKNOWN).toBe(1)
    expect(breakdown.averageValue).toBe(0)
  })
})
