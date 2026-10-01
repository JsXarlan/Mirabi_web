import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { ContentExercise } from '../../core/content/types'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { useDigitKeys, useEnterKey } from '../../ui/keys'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { AudioButton, PronunciationButton } from '../lesson/ExerciseView'
import { FeedbackBar } from '../lesson/FeedbackBar'

/**
 * Motor de sesion de practica rapida, extraido de CharacterPracticeScreen.
 *
 * Kana, palabras y kanji comparten el mismo flujo -carta grande, opciones,
 * corrige, avanza, resultado final- desde que los tres son ejercicios de
 * verdad generados por *Exercises.ts y entran por la misma puerta
 * (answerExercise). Lo unico que cambia de un contenido a otro es que se
 * muestra arriba de la pregunta: un kana, una palabra, un kanji. Todo lo
 * demas -estado, atajos de teclado, pantalla de resultado- vive aqui una vez.
 */

export interface PracticeCard {
  id: string
  /** Lo grande que se ve antes de responder: el simbolo, la palabra, el kanji. */
  display: ReactNode
  exercise: ContentExercise
}

export function PracticeSessionScreen({
  title,
  question,
  optionsLabel,
  cards,
  onExit,
  onComplete,
  completedTitle,
  completedCta,
  onCompletedCta,
}: {
  title: string
  /** Pregunta fija bajo la carta, p.ej. "¿Cómo se lee?" o "¿Qué significa?". */
  question: string
  /**
   * Nombre accesible del grupo de opciones. Especifico al contenido -antes de
   * generalizar esta pantalla, kana practicaba con aria-label="Lecturas"-; sin
   * el se caeria en un generico "Opciones" que le dice menos a quien usa un
   * lector de pantalla.
   */
  optionsLabel: string
  cards: PracticeCard[]
  onExit: () => void
  /** Se llama una vez, al terminar la ultima carta, antes de mostrar el resultado. */
  onComplete: (tally: { correct: number; wrong: number }) => void
  completedTitle: string
  completedCta: string
  onCompletedCta: () => void
}) {
  const answerExercise = useMirabiStore((state) => state.answerExercise)
  const optionsRef = useRef<HTMLDivElement>(null)
  const firstOptionRef = useRef<HTMLButtonElement>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [tally, setTally] = useState({ correct: 0, wrong: 0 })
  const [finished, setFinished] = useState(false)

  const card = cards[currentIndex]
  const answered = answer !== null
  const isLastStep = currentIndex === cards.length - 1

  useEffect(() => {
    if (answered) {
      optionsRef.current?.focus({ preventScroll: true })
    } else if (currentIndex > 0) {
      firstOptionRef.current?.focus({ preventScroll: true })
    }
  }, [answered, currentIndex])

  const choose = useCallback(
    (option: string) => {
      if (answered || !card) return
      setAnswer(option)
      // Una sola puerta de entrada: dominio, SRS y contadores de error.
      const result = answerExercise(card.exercise, option)
      setTally((previous) => ({
        correct: previous.correct + (result.isCorrect ? 1 : 0),
        wrong: previous.wrong + (result.isCorrect ? 0 : 1),
      }))
    },
    [answered, card, answerExercise],
  )

  const advance = useCallback(() => {
    if (isLastStep) {
      onComplete(tally)
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer(null)
  }, [isLastStep, onComplete, tally])

  const pick = useCallback(
    (index: number) => {
      const option = card?.exercise.options[index]
      if (option) choose(option.text)
    },
    [card, choose],
  )

  useDigitKeys(pick, Boolean(card) && !answered && !finished)
  useEnterKey(advance, Boolean(card) && answered && !finished)

  if (cards.length === 0 || !card) {
    return (
      <SessionScreen title={title} progress={0}>
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">No hay nada disponible para practicar.</p>
          <MirabiButton className="mt-4" onClick={onExit}>
            Volver
          </MirabiButton>
        </MirabiCard>
      </SessionScreen>
    )
  }

  if (finished) {
    const total = tally.correct + tally.wrong
    const accuracy = total === 0 ? 0 : (tally.correct * 100) / total
    const reaction = yukiReaction(accuracy >= 80 ? 'HIGH_ACCURACY' : 'LOW_ACCURACY')

    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center animate-pop">
          <Yuki size={110} state={reaction.state} />
          <h1 className="text-2xl font-bold">{completedTitle}</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{reaction.text}</p>
        </div>
        <div className="mt-6 flex gap-2">
          <MirabiStatChip icon="✅" value={tally.correct} label="Correctas" />
          <MirabiStatChip icon="✏️" value={tally.wrong} label="Fallos" />
          <MirabiStatChip icon="🎯" value={`${Math.round(accuracy)}%`} label="Precisión" />
        </div>
        {tally.wrong > 0 && (
          <p className="mt-4 text-center text-xs text-[var(--on-surface-variant)]">
            Los {tally.wrong === 1 ? 'que fallaste vuelve' : 'que fallaste vuelven'} en tu repaso.
          </p>
        )}
        <MirabiButton className="mt-6" onClick={onCompletedCta}>
          {completedCta}
        </MirabiButton>
      </div>
    )
  }

  /*
   * `answer` siempre es una copia literal de `option.text`, y la opcion
   * correcta lleva el mismo texto que `correctAnswer` -mismo string, no dos
   * copias que puedan divergir-, asi que hoy esta comparacion es segura sin
   * recortar. Se recorta de todas formas, con el mismo criterio que
   * validateAnswer (answers.ts): si este componente alguna vez sirviera un
   * paso de texto libre en vez de opcion multiple, seguiria de acuerdo con lo
   * que answerExercise registra como acierto.
   */
  const isCorrect = answered
    ? answer!.trim() === card.exercise.correctAnswer?.trim()
    : null

  return (
    <SessionScreen
      title={title}
      progress={currentIndex / cards.length}
      onExit={onExit}
      hint={answered ? 'Enter para continuar' : 'Pulsa 1-4 para responder'}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="mb-4 text-sm text-[var(--on-surface-variant)]">{question}</p>
        {card.display}
        {answered && card.exercise.audioText && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <AudioButton className="inline-flex items-center" text={card.exercise.audioText} />
            <PronunciationButton className="inline-flex items-center" expectedText={card.exercise.audioText} />
          </div>
        )}
      </div>

      <div
        ref={optionsRef}
        tabIndex={-1}
        className="mt-8 grid grid-cols-2 gap-2.5"
        role="group"
        aria-label={optionsLabel}
      >
        {card.exercise.options.map((option, index) => {
          const selected = answer === option.text
          const revealCorrect = answered && option.text === card.exercise.correctAnswer
          const revealWrong = answered && selected && !isCorrect
          return (
            <button
              key={option.id}
              ref={index === 0 ? firstOptionRef : undefined}
              type="button"
              aria-pressed={selected}
              disabled={answered}
              onClick={() => choose(option.text)}
              className={[
                'relative rounded-[16px] border-2 py-4 text-lg font-semibold transition',
                revealCorrect
                  ? 'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_18%,transparent)]'
                  : revealWrong
                    ? 'border-[var(--secondary)] bg-[color-mix(in_srgb,var(--secondary)_18%,transparent)]'
                    : 'border-[var(--outline)] bg-[var(--surface)] hover:border-[var(--primary)]',
              ].join(' ')}
            >
              <span
                aria-hidden
                className="absolute top-1.5 left-2 hidden text-[11px] font-bold text-[var(--on-surface-variant)] sm:block"
              >
                {index + 1}
              </span>
              {option.text}
            </button>
          )
        })}
      </div>

      <FeedbackBar exercise={card.exercise} answer={answer ?? ''} isCorrect={isCorrect} />

      <MirabiButton className="mt-4" disabled={!answered} onClick={advance}>
        {isLastStep ? 'Terminar' : 'Continuar'}
      </MirabiButton>
    </SessionScreen>
  )
}
