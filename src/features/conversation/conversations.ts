import type { ContentExercise, CoursePack } from '../../core/content/types'
import type { CourseMap } from '../../core/domain/course'

/**
 * Las conversaciones guiadas del MVP no son un contenido aparte: son los pasos
 * CONVERSATION_RESPONSE que ya viven dentro de las lecciones. En Android llegan
 * ademas del backend remoto; en web se sirven del mismo pack local para que la
 * pantalla funcione offline y sin API.
 */
export interface GuidedConversation {
  lessonId: string
  title: string
  worldTitle: string
  steps: ContentExercise[]
  isUnlocked: boolean
  isCompleted: boolean
}

export function buildConversations(
  pack: CoursePack,
  courseMap: CourseMap,
  completedLessonIds: string[],
): GuidedConversation[] {
  const unitById = new Map(pack.units.map((unit) => [unit.id, unit]))
  const worldById = new Map(pack.worlds.map((world) => [world.id, world]))
  const nodeState = new Map(courseMap.nodes.map((node) => [node.lessonId, node.state]))

  return pack.lessons
    .map((lesson) => {
      const steps = lesson.exercises.filter(
        (exercise) => exercise.type === 'CONVERSATION_RESPONSE',
      )
      if (steps.length === 0) return null

      const unit = unitById.get(lesson.unitId)
      const world = unit ? worldById.get(unit.worldId) : undefined

      return {
        lessonId: lesson.id,
        title: lesson.title,
        worldTitle: world?.title ?? '',
        steps,
        isUnlocked: nodeState.get(lesson.id) !== 'LOCKED',
        isCompleted: completedLessonIds.includes(lesson.id),
      }
    })
    .filter((conversation): conversation is GuidedConversation => conversation !== null)
}
