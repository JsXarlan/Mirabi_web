import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { hasKana, resolveRomaji, toRomaji } from '../../core/domain/romaji'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { useDigitKeys, useEnterKey } from '../../ui/keys'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { AudioButton, speakableText } from '../lesson/ExerciseView'
import { FeedbackBar } from '../lesson/FeedbackBar'
import { buildConversations } from './conversations'

/**
 * Conversacion guiada: mismo contenido que un paso de leccion, pero presentado
 * como dialogo. El interlocutor habla en una burbuja y el usuario elige su turno.
 *
 * Es la pantalla donde mas sentido tiene oir la frase, asi que la burbuja se
 * puede escuchar y las respuestas llevan su lectura cuando la leccion lo permite.
 */
export function ConversationSessionScreen() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()

  const pack = useMirabiStore((state) => state.pack)
  const catalog = useMirabiStore((state) => state.catalog)
  const courseMap = useMirabiStore((state) => state.courseMap)()
  const completedIds = useMirabiStore((state) => state.completedConversationLessonIds)
  const answerExercise = useMirabiStore((state) => state.answerExercise)
  const completeConversation = useMirabiStore((state) => state.completeConversation)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const optionsRef = useRef<HTMLDivElement>(null)
  const firstOptionRef = useRef<HTMLButtonElement>(null)

  const conversation = useMemo(() => {
    if (!pack || !courseMap) return null
    return (
      buildConversations(pack, courseMap, completedIds).find(
        (item) => item.lessonId === lessonId,
      ) ?? null
    )
  }, [pack, courseMap, completedIds, lessonId])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [tally, setTally] = useState({ correct: 0, wrong: 0 })
  const [finished, setFinished] = useState(false)

  const step = conversation?.steps[currentIndex]
  const answered = isCorrect !== null
  const isLastStep = conversation ? currentIndex === conversation.steps.length - 1 : false

  useEffect(() => {
    if (answered) {
      optionsRef.current?.focus({ preventScroll: true })
    } else if (currentIndex > 0) {
      firstOptionRef.current?.focus({ preventScroll: true })
    }
  }, [answered, currentIndex])

  const choose = useCallback(
    (option: string) => {
      if (answered || !step) return
      setAnswer(option)
      const result = answerExercise(step, option)
      setIsCorrect(result.isCorrect)
      setTally((previous) => ({
        correct: previous.correct + (result.isCorrect ? 1 : 0),
        wrong: previous.wrong + (result.isCorrect ? 0 : 1),
      }))
    },
    [answered, step, answerExercise],
  )

  const advance = useCallback(() => {
    if (!conversation) return
    if (isLastStep) {
      completeConversation(conversation.lessonId, tally.correct, tally.wrong)
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer(null)
    setIsCorrect(null)
  }, [conversation, isLastStep, completeConversation, tally])

  const pick = useCallback(
    (index: number) => {
      const option = step?.options[index]
      if (option) choose(option.text)
    },
    [step, choose],
  )

  useDigitKeys(pick, Boolean(step) && !answered && !finished)
  useEnterKey(advance, Boolean(step) && answered && !finished)

  if (!conversation || !step) {
    return (
      <SessionScreen title="Conversación" progress={0}>
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">Esta conversación no está disponible.</p>
          <MirabiButton className="mt-4" onClick={() => navigate('/conversaciones')}>
            Volver
          </MirabiButton>
        </MirabiCard>
      </SessionScreen>
    )
  }

  if (finished) {
    const total = tally.correct + tally.wrong
    const accuracy = total === 0 ? 0 : (tally.correct * 100) / total
    const reaction = yukiReaction('CONVERSATION_COMPLETED')

    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center animate-pop">
          <Yuki size={110} state={reaction.state} />
          <h1 className="text-2xl font-bold">Conversación completada</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{reaction.text}</p>
        </div>
        <div className="mt-6 flex gap-2">
          <MirabiStatChip icon="✅" value={tally.correct} label="Acertadas" />
          <MirabiStatChip icon="✏️" value={tally.wrong} label="A repasar" />
          <MirabiStatChip icon="🎯" value={`${Math.round(accuracy)}%`} label="Precisión" />
        </div>
        <MirabiButton
          className="mt-6"
          onClick={() => navigate('/conversaciones', { replace: true })}
        >
          Continuar
        </MirabiButton>
      </div>
    )
  }

  const romaji = resolveRomaji(
    conversation.romajiPolicy,
    masteryOf(step.learningItemId),
    isCorrect === false,
  )
  const promptReading = romaji.visible ? toRomaji(step.prompt, catalog) : null
  const spoken = speakableText(step) ?? (hasKana(step.prompt) ? step.prompt : null)

  return (
    <SessionScreen
      title={conversation.title}
      progress={currentIndex / conversation.steps.length}
      onExit={() => navigate('/conversaciones')}
      hint={answered ? 'Enter para continuar' : 'Pulsa 1-9 para responder'}
    >
      <div className="flex-1">
        <div className="mb-6 flex items-start gap-3 animate-pop">
          <Yuki size={48} state="HAPPY" />
          <div className="min-w-0">
            <p
              className="rounded-[18px] rounded-tl-sm bg-[var(--surface-variant)] px-4 py-3 font-jp text-base leading-snug"
              lang={hasKana(step.prompt) ? 'ja' : undefined}
            >
              {step.prompt}
            </p>
            {promptReading && (
              <p className="mt-1 px-1 text-xs text-[var(--on-surface-variant)]">{promptReading}</p>
            )}
            {spoken && <AudioButton compact className="mt-2 inline-flex" text={spoken} />}
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold text-[var(--on-surface-variant)]">Tu respuesta</p>
        <div
          ref={optionsRef}
          tabIndex={-1}
          className="flex flex-col gap-2.5"
          role="group"
          aria-label="Tu respuesta"
        >
          {step.options.map((option, index) => {
            const selected = answer === option.text
            const revealCorrect = answered && option.text === step.correctAnswer
            const revealWrong = answered && selected && isCorrect === false
            // La lectura de las opciones espera a la correccion: antes seria
            // resolver el ejercicio por la persona.
            const reading = answered && romaji.visible ? toRomaji(option.text, catalog) : null
            return (
              <button
                key={option.id}
                ref={index === 0 ? firstOptionRef : undefined}
                type="button"
                aria-pressed={selected}
                disabled={answered}
                onClick={() => choose(option.text)}
                className={[
                  'rounded-[18px] rounded-br-sm border-2 px-4 py-3.5 text-right font-jp text-base font-semibold transition',
                  revealCorrect
                    ? 'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_18%,transparent)]'
                    : revealWrong
                      ? 'border-[var(--secondary)] bg-[color-mix(in_srgb,var(--secondary)_18%,transparent)]'
                      : 'border-[var(--outline)] bg-[var(--surface)] hover:border-[var(--primary)]',
                ].join(' ')}
              >
                <span className="flex items-baseline justify-end gap-2">
                  <span
                    aria-hidden
                    className="hidden text-[11px] font-bold text-[var(--on-surface-variant)] sm:inline"
                  >
                    {index + 1}
                  </span>
                  <span lang={hasKana(option.text) ? 'ja' : undefined}>{option.text}</span>
                </span>
                {reading && (
                  <span className="mt-0.5 block text-xs font-normal text-[var(--on-surface-variant)]">
                    {reading}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {answered && <FeedbackBar exercise={step} answer={answer ?? ''} isCorrect={isCorrect} />}

      <MirabiButton className="mt-4" disabled={!answered} onClick={advance}>
        {isLastStep ? 'Terminar' : 'Continuar'}
      </MirabiButton>
    </SessionScreen>
  )
}
