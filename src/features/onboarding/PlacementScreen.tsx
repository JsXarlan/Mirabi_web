import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  PLACEMENT_PASS_PERCENTAGE,
  buildPlacementTest,
  candidateWorldIds,
  evaluatePlacement,
  worldsToSkip,
} from '../../core/domain/placement'
import { validateAnswer } from '../../core/domain/answers'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { useDigitKeys, useEnterKey } from '../../ui/keys'
import { SessionScreen } from '../../ui/Layout'
import { Yuki, YukiBubble } from '../../ui/Yuki'
import { ExerciseView } from '../lesson/ExerciseView'

/**
 * Colocacion inicial.
 *
 * "Sin examen. Empezamos desde donde estes" decia el onboarding, y luego todo
 * el mundo empezaba en la leccion 1. Aqui esa respuesta se respeta: se puede
 * demostrar el nivel con unas pocas preguntas, aceptarlo sin prueba, o
 * ignorarlo y empezar desde el principio. Las tres son elecciones legitimas.
 */
export function PlacementScreen() {
  const navigate = useNavigate()
  const pack = useMirabiStore((state) => state.pack)
  const index = useMirabiStore((state) => state.index)
  const initialLevel = useMirabiStore((state) => state.initialLevel)
  const applyPlacement = useMirabiStore((state) => state.applyPlacement)

  const candidates = useMemo(
    () => (pack && initialLevel ? candidateWorldIds(initialLevel, pack) : []),
    [pack, initialLevel],
  )
  const questions = useMemo(
    () => (pack ? buildPlacementTest(pack, candidates) : []),
    [pack, candidates],
  )

  const [phase, setPhase] = useState<'intro' | 'test' | 'result'>('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [skipped, setSkipped] = useState<string[]>([])

  const question = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1

  const finish = useCallback(
    (correctByExerciseId: Record<string, boolean>) => {
      const results = evaluatePlacement(questions, correctByExerciseId)
      const toSkip = worldsToSkip(results, candidates)
      applyPlacement(toSkip)
      setSkipped(toSkip)
      setPhase('result')
    },
    [questions, candidates, applyPlacement],
  )

  const submit = useCallback(() => {
    if (!question || answer.trim() === '') return
    const result = validateAnswer(question.exercise, answer)
    const next = { ...answers, [question.exercise.id]: result.isCorrect }
    setAnswers(next)

    if (isLastQuestion) {
      finish(next)
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer('')
  }, [question, answer, answers, isLastQuestion, finish])

  const pick = useCallback(
    (optionIndex: number) => {
      const option = question?.exercise.options[optionIndex]
      if (option) setAnswer(option.text)
    },
    [question],
  )

  useDigitKeys(pick, phase === 'test' && Boolean(question))
  useEnterKey(submit, phase === 'test' && Boolean(question) && answer.trim() !== '')

  const startFromZero = () => {
    applyPlacement([])
    navigate('/', { replace: true })
  }

  const trustDeclaration = () => {
    applyPlacement(candidates)
    setSkipped(candidates)
    setPhase('result')
  }

  if (!pack || !index || candidates.length === 0 || questions.length === 0) {
    // Sin nada que saltar, no hay decision que tomar.
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">Empezamos por el principio del curso.</p>
          <MirabiButton className="mt-4" onClick={startFromZero}>
            Continuar
          </MirabiButton>
        </MirabiCard>
      </div>
    )
  }

  if (phase === 'intro') {
    const worldNames = candidates
      .map((id) => index.worldById.get(id)?.title)
      .filter(Boolean)
      .join(' y ')

    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 py-10">
        <div className="flex flex-col items-center gap-3 text-center animate-pop">
          <Yuki size={110} state="THINKING" />
          <h1 className="text-2xl font-bold">Empecemos donde estás</h1>
        </div>

        <p className="mt-5 text-sm text-[var(--on-surface-variant)]">
          Por lo que has dicho, quizá puedas saltarte <strong>{worldNames}</strong>. Puedes
          demostrarlo con {questions.length} preguntas rápidas, o dar el salto sin prueba.
        </p>

        <MirabiCard className="mt-5 p-5">
          <p className="text-sm font-semibold">Prueba de nivel</p>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
            {questions.length} preguntas, un par de minutos. Se salta cada mundo que superes con al
            menos un {PLACEMENT_PASS_PERCENTAGE}%.
          </p>
          <MirabiButton className="mt-3" onClick={() => setPhase('test')}>
            Hacer la prueba
          </MirabiButton>
        </MirabiCard>

        <div className="mt-4 flex flex-col gap-2">
          <MirabiButton variant="secondary" onClick={trustDeclaration}>
            Saltar sin prueba
          </MirabiButton>
          <MirabiButton variant="ghost" onClick={startFromZero}>
            Prefiero empezar desde el principio
          </MirabiButton>
        </div>

        <p className="mt-5 text-center text-xs text-[var(--on-surface-variant)]">
          Lo que te saltes queda disponible: puedes volver a cualquier lección cuando quieras.
        </p>
      </div>
    )
  }

  if (phase === 'result') {
    const skippedTitles = skipped
      .map((id) => index.worldById.get(id)?.title)
      .filter((title): title is string => Boolean(title))
    const lessons = skipped
      .flatMap((id) => index.worldById.get(id)?.unitIds ?? [])
      .flatMap((unitId) => index.unitById.get(unitId)?.lessonIds ?? []).length

    return (
      <div className="mx-auto max-w-xl px-5 py-10">
        <div className="flex flex-col items-center gap-3 text-center animate-pop">
          <Yuki size={110} state={skipped.length > 0 ? 'PROUD' : 'HAPPY'} />
          <h1 className="text-2xl font-bold">
            {skipped.length > 0 ? 'Empiezas más adelante' : 'Empezamos por el principio'}
          </h1>
        </div>

        {skipped.length > 0 ? (
          <>
            <div className="mt-6 flex gap-2">
              <MirabiStatChip icon="🗺️" value={skipped.length} label="Mundos" />
              <MirabiStatChip icon="📘" value={lessons} label="Lecciones" />
            </div>
            <p className="mt-4 text-center text-sm text-[var(--on-surface-variant)]">
              Damos por sabido {skippedTitles.join(' y ')}. No suma XP ni racha, porque eso se gana
              estudiando, pero tu camino arranca donde toca.
            </p>
          </>
        ) : (
          <p className="mt-5 text-center text-sm text-[var(--on-surface-variant)]">
            No pasa nada: repasar lo que ya sabes es rápido y deja el terreno firme.
          </p>
        )}

        <MirabiButton className="mt-6" onClick={() => navigate('/', { replace: true })}>
          Empezar
        </MirabiButton>
      </div>
    )
  }

  return (
    <SessionScreen
      title="Prueba de nivel"
      progress={currentIndex / questions.length}
      onExit={startFromZero}
      hint={`Pregunta ${currentIndex + 1} de ${questions.length} · pulsa 1-9 para elegir`}
    >
      <YukiBubble state="THINKING" message="Si algo no lo sabes, elige y sigue. No penaliza." />
      <div className="mt-5 flex-1">
        <ExerciseView
          key={question.exercise.id}
          exercise={question.exercise}
          answer={answer}
          onAnswerChange={setAnswer}
          locked={false}
          isCorrect={null}
        />
      </div>

      <MirabiButton className="mt-4" disabled={answer.trim() === ''} onClick={submit}>
        {isLastQuestion ? 'Ver resultado' : 'Siguiente'}
      </MirabiButton>
    </SessionScreen>
  )
}
