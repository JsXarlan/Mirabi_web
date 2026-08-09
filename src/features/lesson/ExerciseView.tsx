import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ContentExercise, RomajiPolicy } from '../../core/content/types'
import { isSpeechAvailable, onVoicesReady, speakJapanese } from '../../core/audio/speech'
import {
  isSpeechRecognitionAvailable,
  listenJapanese,
  matchesSpokenText,
} from '../../core/audio/speechRecognition'
import { hasKana, resolveRomaji, toRomaji } from '../../core/domain/romaji'
import { shuffle } from '../../core/domain/seededRandom'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiCard } from '../../ui/components'
import { useBackspaceKey, useDigitKeys } from '../../ui/keys'

/**
 * Render de un paso. Solo presenta y recoge la respuesta: la correccion la hace
 * el dominio (validateAnswer), nunca este componente.
 */

function useSpeechReady(): boolean {
  const [ready, setReady] = useState(isSpeechAvailable)
  useEffect(() => onVoicesReady(() => setReady(isSpeechAvailable())), [])
  return ready
}

export function AudioButton({
  text,
  className,
  compact = false,
}: {
  text: string
  className?: string
  compact?: boolean
}) {
  const ready = useSpeechReady()
  // El interruptor de Ajustes manda: sin el, la pantalla no ofrece audio.
  const audioEnabled = useMirabiStore((state) => state.audioEnabled)
  if (!ready || !audioEnabled) return null

  return (
    <span className={className}>
      <button
        type="button"
        onClick={() => speakJapanese(text)}
        aria-label="Escuchar"
        className={
          compact
            ? 'flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-variant)] text-base'
            : 'flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-xl text-[var(--on-primary)]'
        }
      >
        🔊
      </button>
      {!compact && (
        <button
          type="button"
          onClick={() => speakJapanese(text, true)}
          aria-label="Escuchar lento"
          className="ml-2 rounded-full bg-[var(--surface-variant)] px-3 py-2 text-xs font-semibold"
        >
          🐢 Lento
        </button>
      )}
    </span>
  )
}

type PronunciationState = 'idle' | 'listening' | 'match' | 'mismatch' | 'error'

/** Boton de "di esto en voz alta" con feedback inmediato via Web Speech API. */
export function PronunciationButton({
  expectedText,
  className,
}: {
  expectedText: string
  className?: string
}) {
  const available = useMemo(isSpeechRecognitionAvailable, [])
  const [state, setState] = useState<PronunciationState>('idle')
  const [heard, setHeard] = useState('')
  const stopRef = useRef<(() => void) | null>(null)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      stopRef.current?.()
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    },
    [],
  )

  if (!available) return null

  const listen = () => {
    if (state === 'listening') return
    setState('listening')
    setHeard('')
    stopRef.current = listenJapanese((outcome) => {
      stopRef.current = null
      if (outcome.status === 'result') {
        setHeard(outcome.transcript)
        setState(matchesSpokenText(outcome.transcript, expectedText) ? 'match' : 'mismatch')
      } else if (outcome.status === 'no-match') {
        setState('mismatch')
      } else {
        setState('error')
      }
      resetTimerRef.current = window.setTimeout(() => setState('idle'), 2500)
    })
  }

  return (
    <span className={className}>
      <button
        type="button"
        onClick={listen}
        disabled={state === 'listening'}
        aria-label="Practicar pronunciación"
        className={[
          'flex h-9 w-9 items-center justify-center rounded-full text-base transition',
          state === 'listening'
            ? 'bg-[var(--secondary)] text-[var(--on-secondary)]'
            : 'bg-[var(--surface-variant)]',
        ].join(' ')}
      >
        {state === 'listening' ? '🎙️' : '🎤'}
      </button>
      <span role="status" aria-live="polite" className="ml-2 text-xs text-[var(--on-surface-variant)]">
        {state === 'listening' && 'Escuchando…'}
        {state === 'match' && '✅ Bien dicho'}
        {state === 'mismatch' &&
          (heard ? `Se oyó "${heard}", probá de nuevo` : 'No se entendió, probá de nuevo')}
        {state === 'error' && 'No se pudo usar el micrófono'}
      </span>
    </span>
  )
}

/** Lectura en romaji bajo un texto japones, cuando la leccion lo permite. */
function RomajiHint({
  text,
  visible,
  className,
}: {
  text: string
  visible: boolean
  className?: string
}) {
  const catalog = useMirabiStore((state) => state.catalog)
  if (!visible || !hasKana(text)) return null
  const reading = toRomaji(text, catalog)
  if (!reading) return null
  return (
    <span className={className ?? 'mt-1 block text-xs text-[var(--on-surface-variant)]'}>
      {reading}
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
  /** Politica de romaji de la leccion que contiene el paso. */
  romajiPolicy?: RomajiPolicy
}

/** Texto que se pronuncia en este paso, si lo hay. */
export function speakableText(exercise: ContentExercise): string | null {
  if (exercise.audioText) return exercise.audioText
  if (exercise.type === 'AUDIO_SELECTION') return exercise.correctAnswer
  return null
}

export function ExerciseView(props: ExerciseViewProps) {
  const { exercise, romajiPolicy = 'NONE', isCorrect } = props
  const mastery = useMirabiStore((state) => state.masteryOf)(exercise.learningItemId)
  // SHOW_AFTER_ERROR mira el fallo de aqui y ahora, no el historial.
  const romaji = resolveRomaji(romajiPolicy, mastery, isCorrect === false)
  const step = { ...props, romajiVisible: romaji.visible, note: romaji.note }

  if (exercise.type === 'PRESENTATION' || !exercise.isEvaluable) {
    return <TeachingStep exercise={exercise} romajiVisible={romaji.visible} note={romaji.note} />
  }
  if (exercise.type === 'ORDER_SENTENCE') return <OrderSentenceStep {...step} />
  if (exercise.options.length > 0) return <OptionsStep {...step} />
  return <FreeTextStep {...step} />
}

interface StepProps extends ExerciseViewProps {
  romajiVisible: boolean
  note: string | null
}

function RomajiNote({ note }: { note: string | null }) {
  if (!note) return null
  return (
    <p className="mt-2 rounded-[12px] bg-[var(--tertiary-container)] px-3 py-2 text-xs text-[var(--on-tertiary-container)]">
      {note}
    </p>
  )
}

function TeachingStep({
  exercise,
  romajiVisible,
  note,
}: {
  exercise: ContentExercise
  romajiVisible: boolean
  note: string | null
}) {
  return (
    <div className="animate-pop">
      <h2 className="mb-4 text-xl font-bold">{exercise.prompt}</h2>
      {exercise.body && (
        <MirabiCard className="p-5">
          <p
            className="font-jp text-base leading-relaxed whitespace-pre-line"
            lang={hasKana(exercise.body) ? 'ja' : undefined}
          >
            {exercise.body}
          </p>
          <RomajiHint text={exercise.body} visible={romajiVisible} />
        </MirabiCard>
      )}
      <RomajiNote note={note} />
      {exercise.audioText && (
        <AudioButton className="mt-4 inline-flex items-center" text={exercise.audioText} />
      )}
    </div>
  )
}

/**
 * El romaji acompaña la lectura, nunca la respuesta.
 *
 * En un ejercicio de kana ("¿cómo se lee あ?") la transcripcion del enunciado
 * es literalmente la solucion, asi que ahi se calla; en las opciones espera a
 * que la respuesta este bloqueada, cuando ya solo sirve para aprender.
 */
function promptRomajiVisible(exercise: ContentExercise, romajiVisible: boolean): boolean {
  return romajiVisible && exercise.learningItemType !== 'KANA'
}

function Prompt({
  exercise,
  romajiVisible,
  note,
}: {
  exercise: ContentExercise
  romajiVisible: boolean
  note: string | null
}) {
  const audioEnabled = useMirabiStore((state) => state.audioEnabled)
  const audioText = speakableText(exercise)
  const spokenRef = useRef<string | null>(null)

  // El ejercicio de escucha empieza sonando: pedir un clic antes de poder
  // responder convierte cada paso en dos.
  useEffect(() => {
    if (exercise.type !== 'AUDIO_SELECTION' || !audioText || !audioEnabled) return
    if (spokenRef.current === exercise.id) return
    spokenRef.current = exercise.id
    const timer = window.setTimeout(() => speakJapanese(audioText), 250)
    return () => window.clearTimeout(timer)
  }, [exercise.id, exercise.type, audioText, audioEnabled])

  return (
    <div className="mb-5">
      <h2
        className="font-jp text-xl leading-snug font-bold"
        lang={hasKana(exercise.prompt) ? 'ja' : undefined}
      >
        {exercise.prompt}
      </h2>
      <RomajiHint text={exercise.prompt} visible={promptRomajiVisible(exercise, romajiVisible)} />
      {exercise.body && (
        <p
          className="mt-2 font-jp text-sm whitespace-pre-line text-[var(--on-surface-variant)]"
          lang={hasKana(exercise.body) ? 'ja' : undefined}
        >
          {exercise.body}
        </p>
      )}
      <RomajiHint text={exercise.body ?? ''} visible={promptRomajiVisible(exercise, romajiVisible)} />
      <RomajiNote note={note} />
      {exercise.type === 'AUDIO_SELECTION' && audioText && (
        <AudioButton className="mt-4 inline-flex items-center" text={audioText} />
      )}
    </div>
  )
}

function OptionButton({
  option,
  selected,
  locked,
  isCorrect,
  romajiVisible,
  correctAnswer,
  onSelect,
}: {
  option: { id: string; text: string }
  selected: boolean
  locked: boolean
  isCorrect: boolean | null
  romajiVisible: boolean
  // Un ejercicio sin respuesta unica no revela ninguna opcion como correcta.
  correctAnswer: string | null
  onSelect: () => void
}) {
  const catalog = useMirabiStore((state) => state.catalog)
  const revealCorrect = locked && option.text === correctAnswer
  const revealWrong = locked && selected && isCorrect === false
  const romajiText = hasKana(option.text) ? toRomaji(option.text, catalog) : ''

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={locked}
      onClick={onSelect}
      className={[
        'flex flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 px-3 py-4 min-h-20 text-center font-jp text-sm font-semibold transition',
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
      {romajiText && !locked && (
        <span className="text-xs opacity-70">
          {romajiText}
        </span>
      )}
      <span className="text-lg" lang={hasKana(option.text) ? 'ja' : undefined}>
        {option.text}
      </span>
      {locked && romajiVisible && romajiText && (
        <span className="text-[10px] opacity-70">
          {romajiText}
        </span>
      )}
    </button>
  )
}

function OptionsStep({
  exercise,
  answer,
  onAnswerChange,
  locked,
  isCorrect,
  romajiVisible,
  note,
}: StepProps) {
  const options = useMemo(() => shuffle(exercise.options, exercise.id), [exercise])

  const pick = useCallback(
    (index: number) => {
      const option = options[index]
      if (option) onAnswerChange(option.text)
    },
    [options, onAnswerChange],
  )
  useDigitKeys(pick, !locked)

  return (
    <div className="animate-pop">
      <Prompt exercise={exercise} romajiVisible={romajiVisible} note={note} />
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: options.length <= 2 ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
        }}
        role="radiogroup"
        aria-label="Opciones de respuesta"
      >
        {options.map((option) => {
          const selected = answer === option.text
          return (
            <OptionButton
              key={option.id}
              option={option}
              selected={selected}
              locked={locked}
              isCorrect={isCorrect}
              romajiVisible={romajiVisible}
              correctAnswer={exercise.correctAnswer}
              onSelect={() => onAnswerChange(option.text)}
            />
          )
        })}
      </div>
    </div>
  )
}

function FreeTextStep({ exercise, answer, onAnswerChange, locked, romajiVisible, note }: StepProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // El paso de escritura empieza con el cursor dentro: escribir es la accion.
  useEffect(() => {
    if (!locked) inputRef.current?.focus()
  }, [exercise.id, locked])

  return (
    <div className="animate-pop">
      <Prompt exercise={exercise} romajiVisible={romajiVisible} note={note} />
      <input
        ref={inputRef}
        value={answer}
        disabled={locked}
        onChange={(event) => onAnswerChange(event.target.value)}
        placeholder="Escribe tu respuesta"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        lang="ja"
        className="w-full rounded-[16px] border-2 border-[var(--outline)] bg-[var(--surface)] px-4 py-3.5 font-jp text-lg outline-none focus:border-[var(--primary)] disabled:opacity-70"
      />
    </div>
  )
}

/** Ordenar frase: los tokens salen de correctAnswer, separados por espacios. */
function OrderSentenceStep({
  exercise,
  answer,
  onAnswerChange,
  locked,
  romajiVisible,
  note,
}: StepProps) {
  const tokens = useMemo(
    () => shuffle((exercise.correctAnswer ?? '').split(' ').filter(Boolean), exercise.id),
    [exercise],
  )

  const picked = useMemo(() => (answer === '' ? [] : answer.split(' ')), [answer])
  const remaining = useMemo(() => {
    const rest = [...tokens]
    for (const token of picked) {
      const at = rest.indexOf(token)
      if (at >= 0) rest.splice(at, 1)
    }
    return rest
  }, [tokens, picked])

  const pick = useCallback(
    (index: number) => {
      const token = remaining[index]
      if (token) onAnswerChange([...picked, token].join(' '))
    },
    [remaining, picked, onAnswerChange],
  )
  const undo = useCallback(() => {
    if (picked.length > 0) onAnswerChange(picked.slice(0, -1).join(' '))
  }, [picked, onAnswerChange])

  useDigitKeys(pick, !locked)
  useBackspaceKey(undo, !locked)

  return (
    <div className="animate-pop">
      <Prompt exercise={exercise} romajiVisible={romajiVisible} note={note} />

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
                onClick={() => onAnswerChange(picked.filter((_, at) => at !== position).join(' '))}
                className="rounded-full bg-[var(--primary-container)] px-3.5 py-2 font-jp text-sm font-semibold text-[var(--on-primary-container)]"
                lang={hasKana(token) ? 'ja' : undefined}
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
            className="flex flex-col items-center rounded-full border-2 border-[var(--outline)] bg-[var(--surface)] px-3.5 py-2 font-jp text-sm font-semibold hover:border-[var(--primary)]"
            lang={hasKana(token) ? 'ja' : undefined}
          >
            {token}
            <RomajiHint
              text={token}
              visible={romajiVisible && locked}
              className="text-[10px] font-normal text-[var(--on-surface-variant)]"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
