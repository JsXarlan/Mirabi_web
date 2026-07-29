import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ContentExercise } from '../../core/content/types'
import type { ReviewItem } from '../../core/domain/models'
import { buildReviewPlan } from '../../core/domain/review'
import { validateAnswer } from '../../core/domain/answers'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { ExerciseView } from '../lesson/ExerciseView'
import { FeedbackBar } from '../lesson/FeedbackBar'

interface ReviewStep {
  item: ReviewItem
  exercise: ContentExercise
}

export function ReviewSessionScreen() {
  const navigate = useNavigate()
  const pack = useMirabiStore((state) => state.pack)
  const pending = useMirabiStore((state) => state.pendingReviewItems)()
  const completeReviewSession = useMirabiStore((state) => state.completeReviewSession)

  /**
   * Cada ReviewItem guarda el ejercicio que lo genero, asi que el repaso
   * vuelve a mostrar la pregunta exacta que se fallo en vez de una inventada.
   */
  const steps = useMemo<ReviewStep[]>(() => {
    if (!pack) return []
    const byId = new Map<string, ContentExercise>()
    for (const lesson of pack.lessons) {
      for (const exercise of lesson.exercises) byId.set(exercise.id, exercise)
    }
    return buildReviewPlan(pending)
      .items.map((item) => {
        const exercise = item.sourceExerciseId ? byId.get(item.sourceExerciseId) : undefined
        return exercise ? { item, exercise } : null
      })
      .filter((step): step is ReviewStep => step !== null)
    // La sesion se congela al entrar: responder no debe reordenar la lista en curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [results, setResults] = useState<{ item: ReviewItem; isCorrect: boolean }[]>([])
  const [finished, setFinished] = useState(false)

  if (steps.length === 0) {
    return (
      <SessionScreen title="Repaso" progress={0}>
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">No hay elementos que repasar ahora mismo.</p>
          <MirabiButton className="mt-4" onClick={() => navigate('/repaso', { replace: true })}>
            Volver
          </MirabiButton>
        </MirabiCard>
      </SessionScreen>
    )
  }

  if (finished) {
    const correct = results.filter((result) => result.isCorrect).length
    const wrong = results.length - correct
    const accuracy = results.length === 0 ? 0 : (correct * 100) / results.length
    const reaction = yukiReaction('REVIEW_COMPLETED')

    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center animate-pop">
          <Yuki size={110} state={reaction.state} />
          <h1 className="text-2xl font-bold">Repaso completado</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{reaction.text}</p>
        </div>
        <div className="mt-6 flex gap-2">
          <MirabiStatChip icon="✅" value={correct} label="Correctas" />
          <MirabiStatChip icon="✏️" value={wrong} label="Fallos" />
          <MirabiStatChip icon="🎯" value={`${Math.round(accuracy)}%`} label="Precisión" />
        </div>
        <p className="mt-4 text-center text-xs text-[var(--on-surface-variant)]">
          Los aciertos salen de la cola; los fallos vuelven con más prioridad.
        </p>
        <MirabiButton className="mt-6" onClick={() => navigate('/repaso', { replace: true })}>
          Continuar
        </MirabiButton>
      </div>
    )
  }

  const step = steps[currentIndex]
  const answered = isCorrect !== null
  const isLastStep = currentIndex === steps.length - 1

  const check = () => {
    const result = validateAnswer(step.exercise, answer)
    setIsCorrect(result.isCorrect)
    setResults((previous) => [...previous, { item: step.item, isCorrect: result.isCorrect }])
  }

  const advance = () => {
    if (isLastStep) {
      completeReviewSession(results)
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer('')
    setIsCorrect(null)
  }

  return (
    <SessionScreen
      title="Repaso inteligente"
      progress={currentIndex / steps.length}
      onExit={() => navigate('/repaso')}
    >
      <div className="flex-1">
        <ExerciseView
          key={step.exercise.id}
          exercise={step.exercise}
          answer={answer}
          onAnswerChange={setAnswer}
          locked={answered}
          isCorrect={isCorrect}
        />
      </div>

      {answered && (
        <FeedbackBar
          isCorrect={isCorrect}
          correctAnswer={step.exercise.correctAnswer}
          distractorReason={
            step.exercise.options.find((option) => option.text === answer)?.distractorReason ?? null
          }
        />
      )}

      <MirabiButton
        className="mt-4"
        disabled={!answered && answer.trim() === ''}
        onClick={answered ? advance : check}
      >
        {answered ? (isLastStep ? 'Terminar' : 'Continuar') : 'Comprobar'}
      </MirabiButton>
    </SessionScreen>
  )
}
