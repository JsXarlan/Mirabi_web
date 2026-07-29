import { useEffect, useMemo, useState } from 'react'

import type { ContentExercise } from '../../core/content/types'
import { isSpeechAvailable, onVoicesReady, speakJapanese } from '../../core/audio/speech'
import { MirabiCard } from '../../ui/components'

/**
 * Render de un paso. Solo presenta y recoge la respuesta: la correccion la hace
 * el dominio (validateAnswer), nunca este componente.
 */

function useSpeechReady(): boolean {
  const [ready, setReady] = useState(isSpeechAvailable)
  useEffect(() => onVoicesReady(() => setReady(isSpeechAvailable())), [])
  return ready
}

/** Baraja estable por ejercicio: el orden no debe cambiar en cada render. */
function shuffled<T>(values: T[], seed: string): T[] {
  const items = [...values]
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  for (let i = items.length - 1; i > 0; i -= 1) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    const j = hash % (i + 1)
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export function AudioButton({ text, className }: { text: string; className?: string }) {
  const ready = useSpeechReady()
  if (!ready) return null
  return (
    <span className={className}>
      <button
        type="button"
        onClick={() => speakJapanese(text)}
        aria-label="Escuchar"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-xl text-[var(--on-primary)]"
      >
        🔊
      </button>
      <button
        type="button"
        onClick={() => speakJapanese(text, true)}
        aria-label="Escuchar lento"
        className="ml-2 rounded-full bg-[var(--surface-variant)] px-3 py-2 text-xs font-semibold"
      >
        🐢 Lento
      </button>
    </span>
  )
}

export interface ExerciseViewProps {
  exercise: ContentExercise
  answer: string
  onAnswerChange: (answer: string) => void
  /** Bloquea la interaccion cuando ya se mostro la correccion. */
  locked: boolean
  isCorrect: boolean | null
}

export function ExerciseView({
  exercise,
  answer,
  onAnswerChange,
  locked,
  isCorrect,
}: ExerciseViewProps) {
  if (exercise.type === 'PRESENTATION' || !exercise.isEvaluable) {
    return <TeachingStep exercise={exercise} />
  }
  if (exercise.type === 'ORDER_SENTENCE') {
    return (
      <OrderSentenceStep
        exercise={exercise}
        answer={answer}
        onAnswerChange={onAnswerChange}
        locked={locked}
        isCorrect={isCorrect}
      />
    )
  }
  if (exercise.options.length > 0) {
    return (
      <OptionsStep
        exercise={exercise}
        answer={answer}
        onAnswerChange={onAnswerChange}
        locked={locked}
        isCorrect={isCorrect}
      />
    )
  }
  return (
    <FreeTextStep
      exercise={exercise}
      answer={answer}
      onAnswerChange={onAnswerChange}
      locked={locked}
    />
  )
}

function TeachingStep({ exercise }: { exercise: ContentExercise }) {
  return (
    <div className="animate-pop">
      <h2 className="mb-4 text-xl font-bold">{exercise.prompt}</h2>
      {exercise.body && (
        <MirabiCard className="p-5">
          <p className="font-jp text-base leading-relaxed whitespace-pre-line">{exercise.body}</p>
        </MirabiCard>
      )}
      {exercise.audioText && <AudioButton className="mt-4 inline-flex items-center" text={exercise.audioText} />}
    </div>
  )
}

function Prompt({ exercise }: { exercise: ContentExercise }) {
  const audioText = exercise.audioText ?? (exercise.type === 'AUDIO_SELECTION' ? exercise.correctAnswer : null)
  return (
    <div className="mb-5">
      <h2 className="font-jp text-xl leading-snug font-bold">{exercise.prompt}</h2>
      {exercise.body && (
        <p className="mt-2 font-jp text-sm text-[var(--on-surface-variant)] whitespace-pre-line">
          {exercise.body}
        </p>
      )}
      {exercise.type === 'AUDIO_SELECTION' && audioText && (
        <AudioButton className="mt-4 inline-flex items-center" text={audioText} />
      )}
    </div>
  )
}

function OptionsStep({ exercise, answer, onAnswerChange, locked, isCorrect }: ExerciseViewProps) {
  const options = useMemo(() => shuffled(exercise.options, exercise.id), [exercise])

  return (
    <div className="animate-pop">
      <Prompt exercise={exercise} />
      <div className="flex flex-col gap-2.5">
        {options.map((option) => {
          const selected = answer === option.text
          const revealCorrect = locked && option.text === exercise.correctAnswer
          const revealWrong = locked && selected && isCorrect === false

          return (
            <button
              key={option.id}
              type="button"
              disabled={locked}
              onClick={() => onAnswerChange(option.text)}
              className={[
                'rounded-[16px] border-2 px-4 py-3.5 text-left font-jp text-base font-semibold transition',
                revealCorrect
                  ? 'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_18%,transparent)]'
                  : revealWrong
                    ? 'border-[var(--secondary)] bg-[color-mix(in_srgb,var(--secondary)_18%,transparent)]'
                    : selected
                      ? 'border-[var(--primary)] bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                      : 'border-[var(--outline)] bg-[var(--surface)] hover:border-[var(--primary)]',
                locked ? 'cursor-default' : '',
              ].join(' ')}
            >
              {option.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FreeTextStep({
  exercise,
  answer,
  onAnswerChange,
  locked,
}: Omit<ExerciseViewProps, 'isCorrect'>) {
  return (
    <div className="animate-pop">
      <Prompt exercise={exercise} />
      <input
        value={answer}
        disabled={locked}
        onChange={(event) => onAnswerChange(event.target.value)}
        placeholder="Escribe tu respuesta"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className="w-full rounded-[16px] border-2 border-[var(--outline)] bg-[var(--surface)] px-4 py-3.5 font-jp text-lg outline-none focus:border-[var(--primary)] disabled:opacity-70"
      />
    </div>
  )
}

/** Ordenar frase: los tokens salen de correctAnswer, separados por espacios. */
function OrderSentenceStep({ exercise, answer, onAnswerChange, locked }: ExerciseViewProps) {
  const tokens = useMemo(
    () => shuffled((exercise.correctAnswer ?? '').split(' ').filter(Boolean), exercise.id),
    [exercise],
  )

  const picked = answer === '' ? [] : answer.split(' ')
  const remaining = [...tokens]
  for (const token of picked) {
    const at = remaining.indexOf(token)
    if (at >= 0) remaining.splice(at, 1)
  }

  return (
    <div className="animate-pop">
      <Prompt exercise={exercise} />

      <div className="mb-4 min-h-16 rounded-[16px] border-2 border-dashed border-[var(--outline)] p-3">
        {picked.length === 0 ? (
          <p className="py-2 text-center text-sm text-[var(--on-surface-variant)]">
            Toca las palabras en orden
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {picked.map((token, position) => (
              <button
                key={`${token}-${position}`}
                type="button"
                disabled={locked}
                onClick={() =>
                  onAnswerChange(picked.filter((_, at) => at !== position).join(' '))
                }
                className="rounded-full bg-[var(--primary-container)] px-3.5 py-2 font-jp text-sm font-semibold text-[var(--on-primary-container)]"
              >
                {token}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {remaining.map((token, position) => (
          <button
            key={`${token}-${position}`}
            type="button"
            disabled={locked}
            onClick={() => onAnswerChange([...picked, token].join(' '))}
            className="rounded-full border-2 border-[var(--outline)] bg-[var(--surface)] px-3.5 py-2 font-jp text-sm font-semibold hover:border-[var(--primary)]"
          >
            {token}
          </button>
        ))}
      </div>
    </div>
  )
}
