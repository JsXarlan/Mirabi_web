import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { CourseNodeState } from '../../core/domain/course'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiCard, MirabiProgressBar, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'

const NODE_STYLE: Record<CourseNodeState, { chip: string; icon: string; hint: string }> = {
  COMPLETED: {
    chip: 'bg-[var(--success)] text-white',
    icon: '✓',
    hint: 'Completada',
  },
  CURRENT: {
    chip: 'bg-[var(--primary)] text-[var(--on-primary)] ring-4 ring-[var(--primary-container)]',
    icon: '▶',
    hint: 'Continuar aquí',
  },
  AVAILABLE: {
    chip: 'bg-[var(--surface-variant)] text-[var(--on-surface)]',
    icon: '•',
    hint: 'Disponible',
  },
  LOCKED: {
    chip: 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]',
    icon: '🔒',
    hint: 'Completa la lección anterior',
  },
}

export function CourseScreen() {
  const navigate = useNavigate()
  const index = useMirabiStore((state) => state.index)
  const courseMap = useMirabiStore((state) => state.courseMap)()

  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null)

  // Al entrar, el mundo mostrado es donde el usuario esta ahora mismo.
  useEffect(() => {
    if (selectedWorldId === null && courseMap?.currentWorldId) {
      setSelectedWorldId(courseMap.currentWorldId)
    }
  }, [courseMap?.currentWorldId, selectedWorldId])

  if (!courseMap || !index) return <Screen title="Curso">{null}</Screen>

  const worldId = selectedWorldId ?? courseMap.worlds[0]?.id
  const world = courseMap.worlds.find((item) => item.id === worldId) ?? courseMap.worlds[0]
  const worldProgress = courseMap.worldProgress.get(world.id)

  const worldIndex = courseMap.worlds.findIndex((item) => item.id === world.id)
  const previousWorld = courseMap.worlds[worldIndex - 1]
  const worldLocked =
    worldIndex > 0 && !courseMap.worldProgress.get(previousWorld.id)?.isCompleted

  return (
    <Screen title="Curso">
      <p className="mb-4 -mt-3 text-sm text-[var(--on-surface-variant)]">
        {courseMap.courseProgress.completedLessons} de {courseMap.courseProgress.totalLessons}{' '}
        lecciones · {Math.round(courseMap.overallProgressPercentage)}%
      </p>

      {/* Selector de mundo */}
      <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {courseMap.worlds.map((item, itemIndex) => {
          const progress = courseMap.worldProgress.get(item.id)
          const locked =
            itemIndex > 0 &&
            !courseMap.worldProgress.get(courseMap.worlds[itemIndex - 1].id)?.isCompleted
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedWorldId(item.id)}
              className={[
                'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
                item.id === world.id
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]',
              ].join(' ')}
            >
              {locked && <span aria-hidden>🔒 </span>}
              {item.title}
              {progress && progress.totalUnits > 0 && (
                <span className="ml-1.5 opacity-70">
                  {Math.round(progress.percentage)}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {worldLocked && (
        <MirabiCard className="mb-4 p-4">
          <p className="text-sm font-semibold">Este mundo está bloqueado</p>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
            Termina «{previousWorld.title}» para abrirlo.
          </p>
        </MirabiCard>
      )}

      {worldProgress && (
        <MirabiCard className="mb-5 p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold">{world.title}</span>
            <span className="text-xs text-[var(--on-surface-variant)]">
              {worldProgress.completedUnits}/{worldProgress.totalUnits} unidades
            </span>
          </div>
          <MirabiProgressBar progress={worldProgress.percentage / 100} />
        </MirabiCard>
      )}

      {world.unitIds.map((unitId, unitIndex) => {
        const unit = index.unitById.get(unitId)
        if (!unit) return null
        const progress = courseMap.unitProgress.get(unitId)
        const nodes = courseMap.nodes.filter((node) => node.unitId === unitId)

        return (
          <section key={unitId} className="mb-6">
            <SectionTitle
              action={
                <button
                  type="button"
                  onClick={() => navigate(`/curso/unidad/${unitId}`)}
                  className="text-xs font-semibold text-[var(--primary)]"
                >
                  Ver detalle
                </button>
              }
            >
              Unidad {unitIndex + 1} · {unit.title}
            </SectionTitle>

            {progress && (
              <MirabiProgressBar
                className="mb-3"
                progress={progress.percentage / 100}
                tone={progress.isCompleted ? 'success' : 'primary'}
              />
            )}

            <ol className="flex flex-col gap-2">
              {nodes.map((node) => {
                const style = NODE_STYLE[node.state]
                const locked = node.state === 'LOCKED'
                return (
                  <li key={node.id}>
                    <MirabiCard
                      className="flex items-center gap-3 p-3.5"
                      disabled={locked}
                      onClick={() => !locked && navigate(`/leccion/${node.lessonId}`)}
                    >
                      <span
                        aria-hidden
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${style.chip}`}
                      >
                        {style.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-jp text-sm font-semibold">
                          {node.title}
                        </span>
                        <span className="block text-xs text-[var(--on-surface-variant)]">
                          {style.hint}
                        </span>
                      </span>
                    </MirabiCard>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </Screen>
  )
}
