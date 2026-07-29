import { useNavigate, useParams } from 'react-router-dom'

import { DEFAULT_REWARD_CONFIG } from '../../core/domain/rewards'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiProgressBar, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'

export function UnitDetailScreen() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const index = useMirabiStore((state) => state.index)
  const courseMap = useMirabiStore((state) => state.courseMap)()

  const unit = unitId ? index?.unitById.get(unitId) : undefined
  if (!unit || !courseMap || !index) {
    return (
      <Screen title="Unidad">
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">No encontramos esta unidad.</p>
          <MirabiButton className="mt-4" onClick={() => navigate('/curso')}>
            Volver al curso
          </MirabiButton>
        </MirabiCard>
      </Screen>
    )
  }

  const progress = courseMap.unitProgress.get(unit.id)
  const nodes = courseMap.nodes.filter((node) => node.unitId === unit.id)
  const next = nodes.find((node) => node.state === 'CURRENT' || node.state === 'AVAILABLE')

  // Objetivos declarados en el contenido: es lo que el usuario va a saber hacer.
  const objectives = unit.lessonIds
    .map((lessonId) => index.lessonById.get(lessonId))
    .flatMap((lesson) => lesson?.objectives ?? [])

  return (
    <Screen title={unit.title}>
      <MirabiCard className="mb-5 p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">
            {progress?.completedLessons ?? 0}/{progress?.totalLessons ?? 0} lecciones
          </span>
          <span className="rounded-full bg-[var(--tertiary-container)] px-3 py-1 text-xs font-bold text-[var(--on-tertiary-container)]">
            +{DEFAULT_REWARD_CONFIG.unitCompletedSakura} 🌸 al completar
          </span>
        </div>
        <MirabiProgressBar
          progress={(progress?.percentage ?? 0) / 100}
          tone={progress?.isCompleted ? 'success' : 'primary'}
        />
        {next && (
          <MirabiButton className="mt-4" onClick={() => navigate(`/leccion/${next.lessonId}`)}>
            Continuar unidad
          </MirabiButton>
        )}
      </MirabiCard>

      {objectives.length > 0 && (
        <>
          <SectionTitle>Qué vas a aprender</SectionTitle>
          <MirabiCard className="mb-5 p-5">
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm">
              {objectives.map((objective) => (
                <li key={objective.id}>{objective.description}</li>
              ))}
            </ul>
          </MirabiCard>
        </>
      )}

      <SectionTitle>Lecciones</SectionTitle>
      <ol className="flex flex-col gap-2">
        {nodes.map((node) => {
          const lesson = index.lessonById.get(node.lessonId)
          const locked = node.state === 'LOCKED'
          return (
            <li key={node.id}>
              <MirabiCard
                className="flex items-center gap-3 p-4"
                disabled={locked}
                onClick={() => !locked && navigate(`/leccion/${node.lessonId}`)}
              >
                <span aria-hidden className="text-lg">
                  {node.state === 'COMPLETED' ? '✅' : locked ? '🔒' : '▶️'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-jp text-sm font-semibold">{node.title}</span>
                  <span className="block text-xs text-[var(--on-surface-variant)]">
                    {lesson ? `${lesson.exercises.length} pasos` : ''}
                  </span>
                </span>
              </MirabiCard>
            </li>
          )
        })}
      </ol>
    </Screen>
  )
}
