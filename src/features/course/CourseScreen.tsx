import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiProgressBar } from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { WorldBackdrop } from '../../ui/illustrations'
import { CourseTrail } from './CourseTrail'

export function CourseScreen() {
  const navigate = useNavigate()
  const index = useMirabiStore((state) => state.index)
  const courseMap = useMirabiStore((state) => state.courseMap)()
  const examPassed = useMirabiStore((state) => state.passedExamWorldIds)

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
    <Screen>
      {/* Cabecera ilustrada: cada mundo tiene su cielo, asi avanzar se ve. */}
      <div className="relative -mx-4 -mt-5 mb-5 h-36 overflow-hidden sm:rounded-b-[28px]">
        <WorldBackdrop worldId={world.id} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-xs font-semibold opacity-90">
            Mundo {worldIndex} · {courseMap.courseProgress.completedLessons} de{' '}
            {courseMap.courseProgress.totalLessons} lecciones
          </p>
          <h1 className="text-2xl font-bold drop-shadow-sm">{world.title}</h1>
        </div>
      </div>

      {/* Selector de mundo */}
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
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
              aria-current={item.id === world.id}
              className={[
                'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
                item.id === world.id
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)] hover:brightness-105',
              ].join(' ')}
            >
              {locked && <span aria-hidden>🔒 </span>}
              {item.title}
              {progress && progress.totalUnits > 0 && (
                <span className="ml-1.5 opacity-70">{Math.round(progress.percentage)}%</span>
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
        <MirabiCard className="mb-6 p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold">Progreso del mundo</span>
            <span className="text-xs text-[var(--on-surface-variant)]">
              {worldProgress.completedUnits}/{worldProgress.totalUnits} unidades
            </span>
          </div>
          <MirabiProgressBar
            progress={worldProgress.percentage / 100}
            tone={worldProgress.isCompleted ? 'success' : 'primary'}
          />
          {/* La prueba se abre cuando ya hay algo que medir, no antes. */}
          {worldProgress.completedUnits > 0 && (
            <MirabiButton
              className="mt-4"
              variant={worldProgress.isCompleted ? 'primary' : 'secondary'}
              onClick={() => navigate(`/examen/${world.id}`)}
            >
              {examPassed.includes(world.id)
                ? '🏁 Repetir la prueba del mundo'
                : '🏁 Hacer la prueba del mundo'}
            </MirabiButton>
          )}
        </MirabiCard>
      )}

      {world.unitIds.map((unitId, unitIndex) => {
        const unit = index.unitById.get(unitId)
        if (!unit) return null
        const progress = courseMap.unitProgress.get(unitId)
        const nodes = courseMap.nodes.filter((node) => node.unitId === unitId)

        return (
          <section key={unitId} className="mb-4">
            {/* Hito de unidad: marca la frontera dentro del camino. */}
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  progress?.isCompleted
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                }`}
              >
                {unitIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold">{unit.title}</h2>
                <p className="text-[11px] text-[var(--on-surface-variant)]">
                  {progress?.completedLessons ?? 0}/{progress?.totalLessons ?? 0} lecciones
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/curso/unidad/${unitId}`)}
                className="shrink-0 text-xs font-semibold text-[var(--primary)]"
              >
                Detalle
              </button>
            </div>

            <CourseTrail
              nodes={nodes}
              onSelect={(node) => navigate(`/leccion/${node.lessonId}`)}
            />
          </section>
        )
      })}
    </Screen>
  )
}
