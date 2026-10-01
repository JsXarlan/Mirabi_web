import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiLoading,
  MirabiProgressBar,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { AppIcon } from '../../ui/Icons'
import { WorldBackdrop } from '../../ui/illustrations'
import { CourseTrail } from './CourseTrail'

export function CourseScreen() {
  const navigate = useNavigate()
  const index = useMirabiStore((state) => state.index)
  const courseMap = useMirabiStore((state) => state.courseMap)()
  const examPassed = useMirabiStore((state) => state.passedExamWorldIds)
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null)
  useEffect(() => {
    if (selectedWorldId === null && courseMap?.currentWorldId)
      setSelectedWorldId(courseMap.currentWorldId)
  }, [courseMap?.currentWorldId, selectedWorldId])
  if (!courseMap || !index || !courseMap.worlds.length)
    return (
      <Screen title="Tu camino">
        <MirabiLoading message="Preparando tu camino…" />
      </Screen>
    )
  const worldId = selectedWorldId ?? courseMap.worlds[0].id
  const world =
    courseMap.worlds.find((item) => item.id === worldId) ?? courseMap.worlds[0]
  const progress = courseMap.worldProgress.get(world.id)
  const worldIndex = courseMap.worlds.findIndex((item) => item.id === world.id)
  const previous = courseMap.worlds[worldIndex - 1]
  const locked =
    worldIndex > 0 && !courseMap.worldProgress.get(previous.id)?.isCompleted

  return (
    <Screen
      title="Tu camino"
      subtitle="Un pequeño paso hoy. Un nuevo mundo mañana."
      wide
    >
      <div className="world-tabs" role="group" aria-label="Elige un mundo">
        {courseMap.worlds.map((item, i) => {
          const itemLocked =
            i > 0 &&
            !courseMap.worldProgress.get(courseMap.worlds[i - 1].id)
              ?.isCompleted
          return (
            <button
              type="button"
              key={item.id}
              aria-pressed={item.id === world.id}
              className={
                'world-tab' + (item.id === world.id ? ' is-active' : '')
              }
              onClick={() => setSelectedWorldId(item.id)}
            >
              <AppIcon name={itemLocked ? 'lock' : 'course'} size={17} />
              <span>{item.title}</span>
              {itemLocked && <span className="sr-only">, bloqueado</span>}
            </button>
          )
        })}
      </div>
      <div className="course-layout">
        <MirabiCard className="world-summary">
          <div className="world-summary-art">
            <WorldBackdrop worldId={world.id} className="h-full w-full" />
          </div>
          <span className="eyebrow">MUNDO {worldIndex}</span>
          <h2>{world.title}</h2>
          <p>
            {locked
              ? 'Termina «' + previous.title + '» para abrir este mundo.'
              : progress?.isCompleted
                ? 'Este mundo ya forma parte de tu historia. Vuelve a practicar cuando quieras.'
                : 'Sigue las lecciones y construye tu japonés, paso a paso.'}
          </p>
          {progress && (
            <>
              <div className="collection-meta">
                <span>
                  {progress.completedUnits} / {progress.totalUnits} unidades
                </span>
                <strong>{Math.round(progress.percentage)}%</strong>
              </div>
              <MirabiProgressBar
                progress={progress.percentage / 100}
                tone={progress.isCompleted ? 'success' : 'primary'}
                label="Progreso del mundo"
              />
            </>
          )}
          {progress && progress.completedUnits > 0 && (
            <MirabiButton
              variant="secondary"
              onClick={() => navigate('/examen/' + world.id)}
            >
              <AppIcon name="flag" size={20} />
              {examPassed.includes(world.id)
                ? 'Repetir prueba del mundo'
                : 'Hacer prueba del mundo'}
            </MirabiButton>
          )}
          <p className="world-course-total mt-6">
            <strong>{courseMap.courseProgress.completedLessons}</strong> de{' '}
            {courseMap.courseProgress.totalLessons} lecciones del curso
            completadas.
          </p>
        </MirabiCard>
        <div>
          {locked && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[var(--surface-variant)] p-5">
              <AppIcon name="lock" />
              <p className="text-sm">
                Puedes explorar el contenido. Las lecciones se abrirán al
                completar el mundo anterior.
              </p>
            </div>
          )}
          {world.unitIds.map((unitId, i) => {
            const unit = index.unitById.get(unitId)
            if (!unit) return null
            const unitProgress = courseMap.unitProgress.get(unitId)
            const nodes = courseMap.nodes.filter(
              (node) => node.unitId === unitId,
            )
            return (
              <details
                key={world.id + unitId}
                className="mirabi-card unit-panel"
                open={
                  nodes.some((node) => node.state === 'CURRENT') ||
                  (i === 0 && locked)
                }
              >
                <summary>
                  <span className="unit-number">
                    {unitProgress?.isCompleted ? (
                      <AppIcon name="check" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div>
                    <h2>{unit.title}</h2>
                    <p>
                      {unitProgress?.completedLessons ?? 0} /{' '}
                      {unitProgress?.totalLessons ?? 0} lecciones
                      {unitProgress?.isCompleted ? ' · Completada' : ''}
                    </p>
                  </div>
                  <AppIcon name="chevron" className="unit-chevron" size={20} />
                </summary>
                <CourseTrail
                  nodes={nodes}
                  onSelect={(node) => navigate('/leccion/' + node.lessonId)}
                />
                <Link
                  to={'/curso/unidad/' + unitId}
                  className="unit-detail-link"
                >
                  Ver objetivos de la unidad
                </Link>
              </details>
            )
          })}
        </div>
      </div>
    </Screen>
  )
}
