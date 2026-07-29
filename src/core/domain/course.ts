import type { ContentLesson, ContentUnit, ContentWorld } from '../content/types'
import type { LessonProgress } from './models'

/** Puerto de feature/course/domain. */

export type CourseNodeState = 'COMPLETED' | 'CURRENT' | 'AVAILABLE' | 'LOCKED'

export interface CourseNode {
  id: string
  title: string
  state: CourseNodeState
  worldId: string
  unitId: string
  lessonId: string
  order: number
}

export interface UnitProgress {
  unitId: string
  completedLessons: number
  totalLessons: number
  percentage: number
  isCompleted: boolean
}

export interface WorldProgress {
  worldId: string
  completedUnits: number
  totalUnits: number
  percentage: number
  isCompleted: boolean
}

export interface CourseProgress {
  completedLessons: number
  totalLessons: number
  completedUnits: number
  totalUnits: number
  completedWorlds: number
  totalWorlds: number
  percentage: number
}

export interface CourseMap {
  worlds: ContentWorld[]
  nodes: CourseNode[]
  unitProgress: Map<string, UnitProgress>
  worldProgress: Map<string, WorldProgress>
  courseProgress: CourseProgress
  currentWorldId: string | null
  currentUnitId: string | null
  currentLessonId: string | null
  overallProgressPercentage: number
}

const percent = (completed: number, total: number) => (total === 0 ? 0 : (completed * 100) / total)

export function calculateUnit(unitId: string, lessons: LessonProgress[]): UnitProgress {
  const completed = lessons.filter((lesson) => lesson.status === 'COMPLETED').length
  return {
    unitId,
    completedLessons: completed,
    totalLessons: lessons.length,
    percentage: percent(completed, lessons.length),
    isCompleted: lessons.length > 0 && completed === lessons.length,
  }
}

export function calculateWorld(worldId: string, units: UnitProgress[]): WorldProgress {
  const completed = units.filter((unit) => unit.isCompleted).length
  return {
    worldId,
    completedUnits: completed,
    totalUnits: units.length,
    percentage: percent(completed, units.length),
    isCompleted: units.length > 0 && completed === units.length,
  }
}

/**
 * DefaultCourseUnlockPolicy.
 * La unidad se abre al 80% de la anterior, no al 100%: una leccion atascada
 * no debe bloquear todo el camino.
 */
const UNIT_UNLOCK_THRESHOLD = 80

export function isUnitUnlocked(isFirst: boolean, previous: UnitProgress | undefined): boolean {
  if (isFirst) return true
  return previous !== undefined && previous.percentage >= UNIT_UNLOCK_THRESHOLD
}

export function isWorldUnlocked(index: number, previous: WorldProgress | undefined): boolean {
  if (index === 0) return true
  return previous?.isCompleted === true
}

export function isLessonUnlocked(
  isFirst: boolean,
  current: LessonProgress | undefined,
  previous: LessonProgress | undefined,
): boolean {
  if (current?.status === 'COMPLETED') return true
  if (isFirst) return true
  return previous?.status === 'COMPLETED'
}

/** DefaultCourseMapBuilder. */
export function buildCourseMap(
  worlds: ContentWorld[],
  units: ContentUnit[],
  lessons: ContentLesson[],
  progress: LessonProgress[],
): CourseMap {
  const progressById = new Map(progress.map((item) => [item.lessonId, item]))
  const unitById = new Map(units.map((unit) => [unit.id, unit]))
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))

  const progressFor = (lessonId: string): LessonProgress =>
    progressById.get(lessonId) ?? {
      lessonId,
      status: 'NOT_STARTED',
      bestAccuracyPercentage: 0,
      attempts: 0,
      completedAtEpochMillis: null,
    }

  const unitProgress = new Map<string, UnitProgress>()
  for (const unit of units) {
    unitProgress.set(unit.id, calculateUnit(unit.id, unit.lessonIds.map(progressFor)))
  }

  const worldProgress = new Map<string, WorldProgress>()
  for (const world of worlds) {
    const relevant = world.unitIds
      .map((unitId) => unitProgress.get(unitId))
      .filter((item): item is UnitProgress => item !== undefined)
    worldProgress.set(world.id, calculateWorld(world.id, relevant))
  }

  const nodes: CourseNode[] = []
  let currentAssigned = false
  let order = 0

  worlds.forEach((world, worldIndex) => {
    const previousWorld = worlds[worldIndex - 1]
    const worldUnlocked = isWorldUnlocked(
      worldIndex,
      previousWorld ? worldProgress.get(previousWorld.id) : undefined,
    )

    world.unitIds
      .map((unitId) => unitById.get(unitId))
      .filter((unit): unit is ContentUnit => unit !== undefined)
      .forEach((unit, unitIndex) => {
        const previousUnitId = world.unitIds[unitIndex - 1]
        const unitUnlocked =
          worldUnlocked &&
          isUnitUnlocked(
            unitIndex === 0,
            previousUnitId ? unitProgress.get(previousUnitId) : undefined,
          )

        unit.lessonIds
          .map((lessonId) => lessonById.get(lessonId))
          .filter((lesson): lesson is ContentLesson => lesson !== undefined)
          .forEach((lesson, lessonIndex) => {
            const current = progressById.get(lesson.id)
            const previousId = unit.lessonIds[lessonIndex - 1]
            const unlocked =
              unitUnlocked &&
              isLessonUnlocked(
                lessonIndex === 0,
                current,
                previousId ? progressById.get(previousId) : undefined,
              )

            let state: CourseNodeState
            if (current?.status === 'COMPLETED') state = 'COMPLETED'
            else if (unlocked && !currentAssigned) {
              currentAssigned = true
              state = 'CURRENT'
            } else if (unlocked) state = 'AVAILABLE'
            else state = 'LOCKED'

            nodes.push({
              id: lesson.id,
              title: lesson.title,
              state,
              worldId: world.id,
              unitId: unit.id,
              lessonId: lesson.id,
              order: order++,
            })
          })
      })
  })

  const currentNode = nodes.find((node) => node.state === 'CURRENT') ?? null
  const allLessonProgress = lessons.map((lesson) => progressFor(lesson.id))
  const completedLessons = allLessonProgress.filter((item) => item.status === 'COMPLETED').length
  const allUnits = [...unitProgress.values()]
  const allWorlds = [...worldProgress.values()]

  const courseProgress: CourseProgress = {
    completedLessons,
    totalLessons: lessons.length,
    completedUnits: allUnits.filter((unit) => unit.isCompleted).length,
    totalUnits: allUnits.length,
    completedWorlds: allWorlds.filter((world) => world.isCompleted).length,
    totalWorlds: allWorlds.length,
    percentage: percent(completedLessons, lessons.length),
  }

  return {
    worlds,
    nodes,
    unitProgress,
    worldProgress,
    courseProgress,
    currentWorldId: currentNode?.worldId ?? null,
    currentUnitId: currentNode?.unitId ?? null,
    currentLessonId: currentNode?.lessonId ?? null,
    overallProgressPercentage: courseProgress.percentage,
  }
}
