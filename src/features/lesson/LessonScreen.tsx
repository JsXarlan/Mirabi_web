import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { isRuntimeCompatible, isTeachingExercise } from '../../core/content/types'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard } from '../../ui/components'
import { useEnterKey } from '../../ui/keys'
import { SessionScreen } from '../../ui/Layout'
import { ExerciseView } from './ExerciseView'
import { FeedbackBar } from './FeedbackBar'

/**
 * Motor de leccion. Un paso por pantalla: responder -> ver correccion -> continuar,
 * igual que LessonStepPhase en el proyecto Android.
 */
export function LessonScreen() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()

  const index = useMirabiStore((state) => state.index)
  const answerExercise = useMirabiStore((state) => state.answerExercise)
  const completeLesson = useMirabiStore((state) => state.completeLesson)

  const lesson = lessonId ? index?.lessonById.get(lessonId) : undefined
  const steps = useMemo(() => lesson?.exercises.filter(isRuntimeCompatible) ?? [], [lesson])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [tally, setTally] = useState({ correct: 0, wrong: 0 })

  const exercise = steps[currentIndex]
  const teaching = exercise ? isTeachingExercise(exercise) : false
  const answered = isCorrect !== null
  const isLastStep = currentIndex === steps.length - 1
  const canAdvance = teaching || answered || answer.trim() !== ''

  const primaryAction = useCallback(() => {
    if (!lesson || !exercise) return
    if (teaching || answered) {
      if (isLastStep) {
        const outcome = completeLesson(lesson.id, tally.correct, tally.wrong)
        navigate(`/leccion/${lesson.id}/resultado`, { replace: true, state: outcome })
        return
      }
      setCurrentIndex((value) => value + 1)
      setAnswer('')
      setIsCorrect(null)
      return
    }
    if (answer.trim() === '') return
    const result = answerExercise(exercise, answer)
    setIsCorrect(result.isCorrect)
    setTally((previous) => ({
      correct: previous.correct + (result.isCorrect ? 1 : 0),
      wrong: previous.wrong + (result.isCorrect ? 0 : 1),
    }))
  }, [
    lesson,
    exercise,
    teaching,
    answered,
    isLastStep,
    answer,
    tally,
    answerExercise,
    completeLesson,
    navigate,
  ])

  useEnterKey(primaryAction, Boolean(exercise) && canAdvance)

  if (!lesson || steps.length === 0 || !exercise) {
    return (
      <SessionScreen title="Lección" progress={0}>
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">Esta lección no tiene pasos disponibles.</p>
          <MirabiButton className="mt-4" onClick={() => navigate('/curso')}>
            Volver al curso
          </MirabiButton>
        </MirabiCard>
      </SessionScreen>
    )
  }

  const actionLabel = answered || teaching ? (isLastStep ? 'Terminar' : 'Continuar') : 'Comprobar'
  // La prueba de mundo se anuncia: es la unica leccion que cierra un mundo.
  const isCheckpoint = lesson.checkpointKind === 'VISIBLE_WORLD_CHECKPOINT'

  return (
    <SessionScreen
      title={isCheckpoint ? `🏁 Prueba · ${lesson.title}` : lesson.title}
      progress={currentIndex / steps.length}
      onExit={() => navigate(`/leccion/${lesson.id}`)}
      hint={
        answered || teaching
          ? 'Enter para continuar'
          : exercise.options.length > 0
            ? 'Pulsa 1-9 para elegir · Enter para comprobar'
            : 'Enter para comprobar'
      }
    >
      <div className="flex-1">
        <ExerciseView
          key={exercise.id}
          exercise={exercise}
          answer={answer}
          onAnswerChange={setAnswer}
          locked={answered}
          isCorrect={isCorrect}
          romajiPolicy={lesson.romajiPolicy}
        />
      </div>

      {answered && <FeedbackBar exercise={exercise} answer={answer} isCorrect={isCorrect} />}

      <MirabiButton
        className="mt-4"
        disabled={!canAdvance}
        onClick={primaryAction}
        variant={answered && isCorrect === false ? 'danger' : 'primary'}
      >
        {actionLabel}
      </MirabiButton>
    </SessionScreen>
  )
}
