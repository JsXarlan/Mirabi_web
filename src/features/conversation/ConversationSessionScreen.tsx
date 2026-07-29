import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { FeedbackBar } from '../lesson/FeedbackBar'
import { buildConversations } from './conversations'

/**
 * Conversacion guiada: mismo contenido que un paso de leccion, pero presentado
 * como dialogo. El interlocutor habla en una burbuja y el usuario elige su turno.
 */
export function ConversationSessionScreen() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()

  const pack = useMirabiStore((state) => state.pack)
  const courseMap = useMirabiStore((state) => state.courseMap)()
  const completedIds = useMirabiStore((state) => state.completedConversationLessonIds)
  const answerExercise = useMirabiStore((state) => state.answerExercise)
  const completeConversation = useMirabiStore((state) => state.completeConversation)

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

  if (!conversation) {
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

  const step = conversation.steps[currentIndex]
  const answered = isCorrect !== null
  const isLastStep = currentIndex === conversation.steps.length - 1

  const choose = (option: string) => {
    if (answered) return
    setAnswer(option)
    const result = answerExercise(step, option)
    setIsCorrect(result.isCorrect)
    setTally((previous) => ({
      correct: previous.correct + (result.isCorrect ? 1 : 0),
      wrong: previous.wrong + (result.isCorrect ? 0 : 1),
    }))
  }

  const advance = () => {
    if (isLastStep) {
      completeConversation(conversation.lessonId, tally.correct, tally.wrong)
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer(null)
    setIsCorrect(null)
  }

  return (
    <SessionScreen
      title={conversation.title}
      progress={currentIndex / conversation.steps.length}
      onExit={() => navigate('/conversaciones')}
    >
      <div className="flex-1">
        <div className="mb-6 flex items-start gap-3 animate-pop">
          <Yuki size={48} state="HAPPY" />
          <p className="rounded-[18px] rounded-tl-sm bg-[var(--surface-variant)] px-4 py-3 font-jp text-base leading-snug">
            {step.prompt}
          </p>
        </div>

        <p className="mb-2 text-xs font-semibold text-[var(--on-surface-variant)]">Tu respuesta</p>
        <div className="flex flex-col gap-2.5">
          {step.options.map((option) => {
            const selected = answer === option.text
            const revealCorrect = answered && option.text === step.correctAnswer
            const revealWrong = answered && selected && isCorrect === false
            return (
              <button
                key={option.id}
                type="button"
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
                {option.text}
              </button>
            )
          })}
        </div>
      </div>

      {answered && (
        <FeedbackBar
          isCorrect={isCorrect}
          correctAnswer={step.correctAnswer}
          distractorReason={
            step.options.find((option) => option.text === answer)?.distractorReason ?? null
          }
        />
      )}

      <MirabiButton className="mt-4" disabled={!answered} onClick={advance}>
        {isLastStep ? 'Terminar' : 'Continuar'}
      </MirabiButton>
    </SessionScreen>
  )
}
