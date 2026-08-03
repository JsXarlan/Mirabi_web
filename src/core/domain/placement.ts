import type { ContentExercise, CoursePack } from '../content/types'
import { ANSWERABLE_TYPES, isRuntimeCompatible } from '../content/types'

/**
 * Colocacion inicial.
 *
 * El onboarding pregunta cuanto japones sabes y promete "empezamos desde donde
 * estes". Hasta ahora la respuesta no se leia en ninguna parte y todo el mundo
 * empezaba escuchando que el japones tiene cinco vocales. Aqui se convierte esa
 * respuesta en una propuesta concreta, y se comprueba con los mismos ejercicios
 * que el contenido ya marca como validos para medir un mundo.
 */

export type InitialLevel =
  | 'FROM_ZERO'
  | 'SOME_HIRAGANA'
  | 'HIRAGANA_KATAKANA'
  | 'BASIC_VOCABULARY'

/** Preguntas por mundo: suficientes para decidir, pocas para no cansar. */
const QUESTIONS_PER_WORLD = 4

/** A partir de aqui se da el mundo por sabido. */
export const PLACEMENT_PASS_PERCENTAGE = 70

/**
 * Que mundos propone saltarse cada nivel declarado, por posicion en el curso.
 *
 * Siempre un prefijo, nunca mundos sueltos: los mundos se abren en cadena, asi
 * que marcar el 3 sin el 2 dejaria el 4 accesible saltandose la gramatica. Por
 * eso quien dice saber los dos silabarios salta sonidos e hiragana, y el
 * katakana (mundo 3) lo cruza rapido despues de la gramatica.
 */
const CANDIDATE_WORLD_INDEXES: Record<InitialLevel, number[]> = {
  FROM_ZERO: [],
  SOME_HIRAGANA: [0],
  HIRAGANA_KATAKANA: [0, 1],
  BASIC_VOCABULARY: [0, 1, 2, 3],
}

export function candidateWorldIds(level: InitialLevel, pack: CoursePack): string[] {
  return CANDIDATE_WORLD_INDEXES[level]
    .map((index) => pack.worlds[index]?.id)
    .filter((id): id is string => id !== undefined)
}

export interface PlacementQuestion {
  worldId: string
  exercise: ContentExercise
}

/** Los ejercicios que el propio contenido marca como medida de un mundo. */
export function buildPlacementTest(pack: CoursePack, worldIds: string[]): PlacementQuestion[] {
  const unitById = new Map(pack.units.map((unit) => [unit.id, unit]))
  const lessonById = new Map(pack.lessons.map((lesson) => [lesson.id, lesson]))

  return worldIds.flatMap((worldId) => {
    const world = pack.worlds.find((item) => item.id === worldId)
    if (!world) return []

    const exercises = world.unitIds
      .flatMap((unitId) => unitById.get(unitId)?.lessonIds ?? [])
      .flatMap((lessonId) => lessonById.get(lessonId)?.exercises ?? [])
      .filter(
        (exercise) =>
          exercise.appearsInCheckpoint &&
          isRuntimeCompatible(exercise) &&
          ANSWERABLE_TYPES.has(exercise.type) &&
          // Solo preguntas de opciones: en una prueba de nivel, escribir a mano
          // mide la ortografia mas que el conocimiento.
          exercise.options.length > 0,
      )
      .slice(0, QUESTIONS_PER_WORLD)

    return exercises.map((exercise) => ({ worldId, exercise }))
  })
}

export interface PlacementResult {
  worldId: string
  correct: number
  total: number
  percentage: number
  passed: boolean
}

export function evaluatePlacement(
  questions: PlacementQuestion[],
  correctByExerciseId: Record<string, boolean>,
): PlacementResult[] {
  const byWorld = new Map<string, { correct: number; total: number }>()

  for (const question of questions) {
    const tally = byWorld.get(question.worldId) ?? { correct: 0, total: 0 }
    tally.total += 1
    if (correctByExerciseId[question.exercise.id]) tally.correct += 1
    byWorld.set(question.worldId, tally)
  }

  return [...byWorld.entries()].map(([worldId, tally]) => {
    const percentage = tally.total === 0 ? 0 : (tally.correct * 100) / tally.total
    return {
      worldId,
      correct: tally.correct,
      total: tally.total,
      percentage,
      passed: percentage >= PLACEMENT_PASS_PERCENTAGE,
    }
  })
}

/**
 * Los mundos se dan por sabidos en orden: si fallas el primero, no se saltan los
 * siguientes aunque los apruebes. Empezar por un hueco es peor que repetir.
 */
export function worldsToSkip(results: PlacementResult[], orderedWorldIds: string[]): string[] {
  const byId = new Map(results.map((result) => [result.worldId, result]))
  const skipped: string[] = []
  for (const worldId of orderedWorldIds) {
    if (!byId.get(worldId)?.passed) break
    skipped.push(worldId)
  }
  return skipped
}
