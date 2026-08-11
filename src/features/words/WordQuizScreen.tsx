import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { selectDueWordSession } from '../../core/domain/wordProgress'
import { buildWordQuizQuestion, type WordQuizQuestion } from '../../core/domain/wordQuiz'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiEmpty, MirabiLoading, MirabiStatChip } from '../../ui/components'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'

/**
 * Quiz propio de Palabras: opcion multiple sobre el significado, con su
 * propio armado de preguntas (wordQuiz.ts) y su propio progreso
 * (wordProgress.ts) - no pasa por ContentExercise ni por el SRS de kana.
 */
export function WordQuizScreen() {
  const navigate = useNavigate()
  const words = useMirabiStore((state) => state.words)
  const wordProgress = useMirabiStore((state) => state.wordProgress)
  const reviewWordCard = useMirabiStore((state) => state.reviewWordCard)

  const questions = useMemo<WordQuizQuestion[]>(() => {
    if (!words) return []
    return selectDueWordSession(words.words, (id) => wordProgress[id], Date.now()).map((word) =>
      buildWordQuizQuestion(word, words),
    )
    // Se arma una sola vez por sesion: rebarajar a media practica seria confuso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [tally, setTally] = useState({ correct: 0, wrong: 0 })
  const [finished, setFinished] = useState(false)

  const exit = () => navigate('/palabras')

  if (!words) {
    return (
      <SessionScreen title="Palabras · Quiz" progress={0} onExit={exit}>
        <MirabiLoading message="Preparando el quiz…" />
      </SessionScreen>
    )
  }

  if (questions.length === 0) {
    return (
      <SessionScreen title="Palabras · Quiz" progress={0} onExit={exit}>
        <MirabiEmpty
          title="Nada pendiente por ahora"
          message="Ya repasaste todas las palabras que tocaban hoy. Volvé más tarde."
          action={
            <MirabiButton className="mt-4" onClick={exit}>
              Volver a Palabras
            </MirabiButton>
          }
        />
      </SessionScreen>
    )
  }

  if (finished) {
    const total = tally.correct + tally.wrong
    const accuracy = total === 0 ? 0 : (tally.correct * 100) / total
    const reaction = yukiReaction(accuracy >= 80 ? 'HIGH_ACCURACY' : 'LOW_ACCURACY')

    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="animate-pop flex flex-col items-center gap-3 text-center">
          <Yuki size={110} state={reaction.state} />
          <h1 className="text-2xl font-bold">Quiz completado</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{reaction.text}</p>
        </div>
        <div className="mt-6 flex gap-2">
          <MirabiStatChip icon="✅" value={tally.correct} label="Correctas" />
          <MirabiStatChip icon="✏️" value={tally.wrong} label="A repasar" />
          <MirabiStatChip icon="🎯" value={`${Math.round(accuracy)}%`} label="Precisión" />
        </div>
        <MirabiButton className="mt-6" onClick={exit}>
          Continuar
        </MirabiButton>
      </div>
    )
  }

  const question = questions[currentIndex]
  const isLastStep = currentIndex === questions.length - 1

  const choose = (option: string) => {
    if (answer) return
    setAnswer(option)
    const correct = option === question.correctAnswer
    reviewWordCard(question.word.learningItemId, correct ? 'good' : 'again')
    setTally((previous) => ({
      correct: previous.correct + (correct ? 1 : 0),
      wrong: previous.wrong + (correct ? 0 : 1),
    }))
  }

  const next = () => {
    if (isLastStep) {
      setFinished(true)
      return
    }
    setAnswer(null)
    setCurrentIndex((value) => value + 1)
  }

  return (
    <SessionScreen title="Palabras · Quiz" progress={currentIndex / questions.length} onExit={exit}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <p className="text-sm text-[var(--on-surface-variant)]">¿Qué significa?</p>
        <p className="font-jp text-5xl leading-none">{question.word.lemma}</p>
        {question.word.lemma !== question.word.kana && (
          <p className="font-jp text-lg text-[var(--on-surface-variant)]">{question.word.kana}</p>
        )}

        <div className="grid w-full max-w-sm grid-cols-1 gap-2.5">
          {question.options.map((option) => {
            const isCorrect = option === question.correctAnswer
            const isChosen = option === answer
            const showResult = answer !== null
            return (
              <button
                key={option}
                type="button"
                onClick={() => choose(option)}
                disabled={showResult}
                className={[
                  'rounded-[16px] border-2 px-4 py-3 text-left text-sm font-semibold transition',
                  !showResult
                    ? 'border-[var(--outline)] bg-[var(--surface)] active:scale-[0.98]'
                    : isCorrect
                      ? 'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_20%,transparent)]'
                      : isChosen
                        ? 'border-[var(--secondary)] bg-[color-mix(in_srgb,var(--secondary)_18%,transparent)]'
                        : 'border-[var(--outline)] bg-[var(--surface)] opacity-60',
                ].join(' ')}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {answer && (
        <MirabiButton className="mt-8" onClick={next}>
          {isLastStep ? 'Ver resultado' : 'Siguiente'}
        </MirabiButton>
      )}
    </SessionScreen>
  )
}
