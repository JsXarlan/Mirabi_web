import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ContentExercise, RomajiPolicy } from '../../core/content/types'
import { ANSWERABLE_TYPES, isRuntimeCompatible } from '../../core/content/types'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { useEnterKey } from '../../ui/keys'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { ExerciseView } from '../lesson/ExerciseView'

/**
 * Prueba de mundo.
 *
 * El contenido marca 41 ejercicios con `appearsInCheckpoint`: los que valen
 * para comprobar si un mundo quedo asentado. Aqui se corren seguidos y sin
 * correccion paso a paso, porque un examen que te dice la respuesta despues de
 * cada pregunta no mide nada.
 */

const PASS_PERCENTAGE = 70

interface ExamStep {
  exercise: ContentExercise
  romajiPolicy: RomajiPolicy
}

export function WorldExamScreen() {
  const { worldId } = useParams<{ worldId: string }>()
  const navigate = useNavigate()

  const pack = useMirabiStore((state) => state.pack)
  const index = useMirabiStore((state) => state.index)
  const answerExercise = useMirabiStore((state) => state.answerExercise)
  const completeWorldExam = useMirabiStore((state) => state.completeWorldExam)

  const world = worldId ? index?.worldById.get(worldId) : undefined

  const steps = useMemo<ExamStep[]>(() => {
    if (!pack || !world || !index) return []
    const lessonIds = new Set(
      world.unitIds.flatMap((unitId) => index.unitById.get(unitId)?.lessonIds ?? []),
    )
    return pack.lessons
      .filter((lesson) => lessonIds.has(lesson.id))
      .flatMap((lesson) =>
        lesson.exercises
          .filter(
            (exercise) =>
              exercise.appearsInCheckpoint &&
              isRuntimeCompatible(exercise) &&
              ANSWERABLE_TYPES.has(exercise.type),
          )
          .map((exercise) => ({ exercise, romajiPolicy: lesson.romajiPolicy })),
      )
  }, [pack, world, index])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState<ContentExercise[]>([])
  const [finished, setFinished] = useState(false)

  const step = steps[currentIndex]
  const isLastStep = currentIndex === steps.length - 1

  const submit = useCallback(() => {
    if (!step || answer.trim() === '') return
    const result = answerExercise(step.exercise, answer)
    if (!result.isCorrect) setWrong((previous) => [...previous, step.exercise])
    if (isLastStep) {
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer('')
  }, [step, answer, isLastStep, answerExercise])

  useEnterKey(submit, Boolean(step) && answer.trim() !== '' && !finished)

  if (!world || steps.length === 0) {
    return (
      <SessionScreen title="Prueba" progress={0}>
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">Este mundo todavía no tiene una prueba disponible.</p>
          <MirabiButton className="mt-4" onClick={() => navigate('/curso')}>
            Volver al curso
          </MirabiButton>
        </MirabiCard>
      </SessionScreen>
    )
  }

  if (finished) {
    const correct = steps.length - wrong.length
    const accuracy = (correct * 100) / steps.length
    const passed = accuracy >= PASS_PERCENTAGE
    // El resultado se registra una vez, al mostrarlo.
    return (
      <ExamResult
        worldId={world.id}
        worldTitle={world.title}
        correct={correct}
        wrongExercises={wrong}
        accuracy={accuracy}
        passed={passed}
        onFinish={completeWorldExam}
        onClose={() => navigate('/curso')}
      />
    )
  }

  return (
    <SessionScreen
      title={`Prueba · ${world.title}`}
      progress={currentIndex / steps.length}
      onExit={() => navigate('/curso')}
      hint={`Pregunta ${currentIndex + 1} de ${steps.length} · sin correcciones hasta el final`}
    >
      <div className="flex-1">
        <ExerciseView
          key={step.exercise.id}
          exercise={step.exercise}
          answer={answer}
          onAnswerChange={setAnswer}
          locked={false}
          isCorrect={null}
          romajiPolicy={step.romajiPolicy}
        />
      </div>

      <MirabiButton className="mt-4" disabled={answer.trim() === ''} onClick={submit}>
        {isLastStep ? 'Terminar prueba' : 'Siguiente'}
      </MirabiButton>
    </SessionScreen>
  )
}

function ExamResult({
  worldId,
  worldTitle,
  correct,
  wrongExercises,
  accuracy,
  passed,
  onFinish,
  onClose,
}: {
  worldId: string
  worldTitle: string
  correct: number
  wrongExercises: ContentExercise[]
  accuracy: number
  passed: boolean
  onFinish: (worldId: string, correct: number, wrong: number) => void
  onClose: () => void
}) {
  // La recompensa se paga una sola vez al montar el resultado: con StrictMode
  // el efecto corre dos veces, y pagar dos veces seria regalar Sakura.
  const paidRef = useRef(false)
  useEffect(() => {
    if (paidRef.current) return
    paidRef.current = true
    onFinish(worldId, correct, wrongExercises.length)
  }, [worldId, correct, wrongExercises.length, onFinish])

  const reaction = yukiReaction(passed ? 'HIGH_ACCURACY' : 'MANY_ERRORS')

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center animate-pop">
        <Yuki size={110} state={reaction.state} />
        <h1 className="text-2xl font-bold">{passed ? 'Prueba superada' : 'Casi'}</h1>
        <p className="text-sm text-[var(--on-surface-variant)]">
          {passed
            ? `${worldTitle} queda asentado. ${reaction.text}`
            : `Necesitas ${PASS_PERCENTAGE}% para superarla. ${reaction.text}`}
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <MirabiStatChip icon="✅" value={correct} label="Correctas" />
        <MirabiStatChip icon="✏️" value={wrongExercises.length} label="Fallos" />
        <MirabiStatChip icon="🎯" value={`${Math.round(accuracy)}%`} label="Precisión" />
      </div>

      {wrongExercises.length > 0 && (
        <MirabiCard className="mt-5 p-5">
          <p className="text-sm font-bold">Lo que se te escapó</p>
          <ul className="mt-2 flex flex-col gap-2">
            {wrongExercises.map((exercise) => (
              <li key={exercise.id} className="text-xs text-[var(--on-surface-variant)]">
                <span className="font-jp">{exercise.prompt}</span>
                {exercise.correctAnswer && (
                  <span className="ml-1 font-semibold text-[var(--on-surface)]">
                    → {exercise.correctAnswer}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--on-surface-variant)]">
            Todo esto ya está en tu repaso, programado para volver.
          </p>
        </MirabiCard>
      )}

      <MirabiButton className="mt-6" onClick={onClose}>
        Volver al curso
      </MirabiButton>
    </div>
  )
}
