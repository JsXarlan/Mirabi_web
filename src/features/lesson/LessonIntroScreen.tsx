import { useNavigate, useParams } from 'react-router-dom'

import { isRuntimeCompatible } from '../../core/content/types'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard } from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'

const LESSON_TYPE_LABEL: Record<string, string> = {
  CONCEPT_INTRO: 'Concepto nuevo',
  AUDIO_INTRO: 'Escucha',
  KANA_INTRO: 'Kana nuevo',
  VOCABULARY_PRACTICE: 'Vocabulario',
  GRAMMAR_INTRO: 'Gramática',
  PRACTICE: 'Práctica',
  INTERNAL_MINI_CHECK: 'Mini repaso',
  VISIBLE_CHECKPOINT: 'Checkpoint',
  PREVIEW: 'Vistazo',
}

export function LessonIntroScreen() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const index = useMirabiStore((state) => state.index)
  const lessonProgress = useMirabiStore((state) => state.lessonProgress)

  const lesson = lessonId ? index?.lessonById.get(lessonId) : undefined

  if (!lesson) {
    return (
      <Screen title="Lección">
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">No encontramos esta lección.</p>
          <MirabiButton className="mt-4" onClick={() => navigate('/curso')}>
            Volver al curso
          </MirabiButton>
        </MirabiCard>
      </Screen>
    )
  }

  const steps = lesson.exercises.filter(isRuntimeCompatible)
  const progress = lessonProgress[lesson.id]
  // ~15 s por paso: suficiente para fijar expectativa sin prometer un cronometro.
  const estimatedMinutes = Math.max(1, Math.round((steps.length * 15) / 60))

  return (
    <Screen title={LESSON_TYPE_LABEL[lesson.lessonType] ?? 'Lección'}>
      <div className="flex flex-col items-center gap-4 text-center">
        <Yuki size={96} state={progress?.status === 'COMPLETED' ? 'PROUD' : 'HAPPY'} />
        <h1 className="font-jp text-2xl font-bold">{lesson.title}</h1>
        <p className="text-sm text-[var(--on-surface-variant)]">
          {steps.length} pasos · unos {estimatedMinutes} min
        </p>
      </div>

      {lesson.objectives.length > 0 && (
        <MirabiCard className="mt-6 p-5">
          <p className="mb-2 text-sm font-bold">En esta lección vas a:</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm">
            {lesson.objectives.map((objective) => (
              <li key={objective.id}>{objective.description}</li>
            ))}
          </ul>
        </MirabiCard>
      )}

      {lesson.introducedItems.length > 0 && (
        <MirabiCard className="mt-4 p-5">
          <p className="mb-2 text-sm font-bold">Elementos nuevos</p>
          <div className="flex flex-wrap gap-1.5">
            {lesson.introducedItems.map((item) => (
              <span
                key={item.id}
                className="rounded-full bg-[var(--surface-variant)] px-2.5 py-1 text-xs text-[var(--on-surface-variant)]"
              >
                {item.id}
              </span>
            ))}
          </div>
        </MirabiCard>
      )}

      {progress?.status === 'COMPLETED' && (
        <p className="mt-4 text-center text-xs text-[var(--on-surface-variant)]">
          Ya la completaste con {Math.round(progress.bestAccuracyPercentage)}% de acierto.
          Repetirla no resta progreso.
        </p>
      )}

      <MirabiButton
        className="mt-6"
        disabled={steps.length === 0}
        onClick={() => navigate(`/leccion/${lesson.id}/sesion`)}
      >
        {progress?.status === 'COMPLETED' ? 'Repetir lección' : 'Comenzar'}
      </MirabiButton>
    </Screen>
  )
}
