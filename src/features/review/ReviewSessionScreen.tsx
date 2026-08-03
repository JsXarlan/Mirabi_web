import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { ContentExercise, RomajiPolicy } from '../../core/content/types'
import type { ReviewItem } from '../../core/domain/models'
import { kanaExerciseFromId } from '../../core/domain/kanaExercises'
import { DEFAULT_REVIEW_CONFIG, buildReviewPlan } from '../../core/domain/review'
import { validateAnswer } from '../../core/domain/answers'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { useEnterKey } from '../../ui/keys'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { ExerciseView } from '../lesson/ExerciseView'
import { FeedbackBar } from '../lesson/FeedbackBar'
import { formatDueIn } from './ReviewScreen'

interface ReviewStep {
  item: ReviewItem
  exercise: ContentExercise
  romajiPolicy: RomajiPolicy
}

export function ReviewSessionScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pack = useMirabiStore((state) => state.pack)
  const catalog = useMirabiStore((state) => state.catalog)
  const reviewItems = useMirabiStore((state) => state.reviewItems)
  const completeReviewSession = useMirabiStore((state) => state.completeReviewSession)

  // "Repasar igualmente" adelanta items que aun no vencen.
  const includeNotDue = params.get('adelantar') === '1'

  /**
   * Cada ReviewItem guarda el ejercicio que lo genero, asi que el repaso
   * vuelve a mostrar la pregunta exacta que se fallo en vez de una inventada.
   */
  const steps = useMemo<ReviewStep[]>(() => {
    if (!pack) return []
    const byExerciseId = new Map<string, { exercise: ContentExercise; policy: RomajiPolicy }>()
    for (const lesson of pack.lessons) {
      for (const exercise of lesson.exercises) {
        byExerciseId.set(exercise.id, { exercise, policy: lesson.romajiPolicy })
      }
    }

    return buildReviewPlan(reviewItems, { ...DEFAULT_REVIEW_CONFIG, includeNotDue }, Date.now())
      .items.map((item) => {
        if (!item.sourceExerciseId) return null
        const found = byExerciseId.get(item.sourceExerciseId)
        if (found) return { item, exercise: found.exercise, romajiPolicy: found.policy }
        // Los kana practicados fuera del curso no viven en el pack: su ejercicio
        // se reconstruye desde el catalogo, identico al que se fallo.
        const kana = kanaExerciseFromId(item.sourceExerciseId, catalog)
        return kana ? { item, exercise: kana, romajiPolicy: 'NONE' as RomajiPolicy } : null
      })
      .filter((step): step is ReviewStep => step !== null)
    // La sesion se congela al entrar: responder no debe reordenar la lista en curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, includeNotDue])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [results, setResults] = useState<{ item: ReviewItem; isCorrect: boolean }[]>([])
  const [finished, setFinished] = useState<{ nextDueAt: number | null } | null>(null)

  const step = steps[currentIndex]
  const answered = isCorrect !== null
  const isLastStep = currentIndex === steps.length - 1

  const primaryAction = useCallback(() => {
    if (!step) return
    if (!answered) {
      if (answer.trim() === '') return
      const result = validateAnswer(step.exercise, answer)
      setIsCorrect(result.isCorrect)
      setResults((previous) => [...previous, { item: step.item, isCorrect: result.isCorrect }])
      return
    }
    if (isLastStep) {
      completeReviewSession(results)
      // El proximo vencimiento se lee despues de reprogramar: es el dato que
      // convierte "terminaste" en "vuelve tal dia".
      const upcoming = useMirabiStore
        .getState()
        .reviewItems.filter((item) => item.status !== 'COMPLETED')
        .map((item) => item.nextReviewAtEpochMillis)
        .sort((a, b) => a - b)
      setFinished({ nextDueAt: upcoming[0] ?? null })
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer('')
    setIsCorrect(null)
  }, [step, answered, answer, isLastStep, results, completeReviewSession])

  useEnterKey(primaryAction, Boolean(step) && (answered || answer.trim() !== ''))

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
          {finished.nextDueAt
            ? `Los aciertos se alejan en el tiempo. Tu próximo repaso llega ${formatDueIn(finished.nextDueAt, Date.now())}.`
            : 'Todo lo que repasaste queda dominado. No hay nada más en la cola.'}
        </p>
        <MirabiButton className="mt-6" onClick={() => navigate('/repaso', { replace: true })}>
          Continuar
        </MirabiButton>
      </div>
    )
  }

  return (
    <SessionScreen
      title="Repaso inteligente"
      progress={currentIndex / steps.length}
      onExit={() => navigate('/repaso')}
      hint={
        answered
          ? 'Enter para continuar'
          : step.exercise.options.length > 0
            ? 'Pulsa 1-9 para elegir · Enter para comprobar'
            : 'Enter para comprobar'
      }
    >
      <div className="flex-1">
        <ExerciseView
          key={step.exercise.id}
          exercise={step.exercise}
          answer={answer}
          onAnswerChange={setAnswer}
          locked={answered}
          isCorrect={isCorrect}
          romajiPolicy={step.romajiPolicy}
        />
      </div>

      {answered && <FeedbackBar exercise={step.exercise} answer={answer} isCorrect={isCorrect} />}

      <MirabiButton
        className="mt-4"
        disabled={!answered && answer.trim() === ''}
        onClick={primaryAction}
      >
        {answered ? (isLastStep ? 'Terminar' : 'Continuar') : 'Comprobar'}
      </MirabiButton>
    </SessionScreen>
  )
}
