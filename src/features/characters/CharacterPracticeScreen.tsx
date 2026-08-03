import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { ContentExercise, KanaCharacter } from '../../core/content/types'
import { MASTERY_VALUE } from '../../core/domain/models'
import { buildKanaExercise } from '../../core/domain/kanaExercises'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { useDigitKeys, useEnterKey } from '../../ui/keys'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { AudioButton } from '../lesson/ExerciseView'
import { scriptFromSlug, titleOf } from './scriptSlug'

const SESSION_SIZE = 10

interface PracticeItem {
  character: KanaCharacter
  exercise: ContentExercise
}

/**
 * DefaultCharacterPracticeSessionBuilder: primero lo mas debil.
 *
 * Cada carta es un ejercicio de verdad, no una pregunta de pantalla: asi la
 * practica actualiza el dominio y programa el repaso por el mismo camino que
 * una leccion, en vez de escribir el estado por su cuenta.
 */
function buildSession(
  characters: KanaCharacter[],
  catalog: Parameters<typeof buildKanaExercise>[1],
  masteryOf: (id: string) => keyof typeof MASTERY_VALUE,
): PracticeItem[] {
  return [...characters]
    .sort(
      (a, b) =>
        MASTERY_VALUE[masteryOf(a.learningItemId)] - MASTERY_VALUE[masteryOf(b.learningItemId)],
    )
    .slice(0, SESSION_SIZE)
    .map((character) => ({ character, exercise: buildKanaExercise(character, catalog) }))
}

export function CharacterPracticeScreen() {
  const { script } = useParams<{ script: string }>()
  const navigate = useNavigate()

  const catalog = useMirabiStore((state) => state.catalog)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const answerExercise = useMirabiStore((state) => state.answerExercise)
  const completeCharacterPractice = useMirabiStore((state) => state.completeCharacterPractice)

  const scriptKey = scriptFromSlug(script)
  const title = scriptKey ? titleOf(scriptKey) : 'Práctica'

  const items = useMemo(() => {
    if (!catalog || scriptKey === null) return []
    const characters = catalog.characters.filter((item) => item.script === scriptKey)
    return buildSession(characters, catalog, masteryOf)
    // Se construye una sola vez por sesion: rebarajar a media practica seria confuso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, scriptKey])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [tally, setTally] = useState({ correct: 0, wrong: 0 })
  const [finished, setFinished] = useState(false)

  const item = items[currentIndex]
  const answered = answer !== null
  const isLastStep = currentIndex === items.length - 1

  const choose = useCallback(
    (option: string) => {
      if (answered || !item) return
      setAnswer(option)
      // Una sola puerta de entrada: dominio, SRS y contadores de error.
      const result = answerExercise(item.exercise, option)
      setTally((previous) => ({
        correct: previous.correct + (result.isCorrect ? 1 : 0),
        wrong: previous.wrong + (result.isCorrect ? 0 : 1),
      }))
    },
    [answered, item, answerExercise],
  )

  const advance = useCallback(() => {
    if (isLastStep) {
      completeCharacterPractice(tally.correct, tally.wrong)
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer(null)
  }, [isLastStep, completeCharacterPractice, tally])

  const pick = useCallback(
    (index: number) => {
      const option = item?.exercise.options[index]
      if (option) choose(option.text)
    },
    [item, choose],
  )

  useDigitKeys(pick, Boolean(item) && !answered && !finished)
  useEnterKey(advance, Boolean(item) && answered && !finished)

  if (items.length === 0 || !item) {
    return (
      <SessionScreen title={title} progress={0}>
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">No hay caracteres disponibles para practicar.</p>
          <MirabiButton className="mt-4" onClick={() => navigate('/caracteres')}>
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
          <h1 className="text-2xl font-bold">Práctica completada</h1>
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
        <MirabiButton className="mt-6" onClick={() => navigate('/caracteres', { replace: true })}>
          Continuar
        </MirabiButton>
      </div>
    )
  }

  const isCorrect = answered && answer === item.character.romaji

  return (
    <SessionScreen
      title={`Práctica de ${title}`}
      progress={currentIndex / items.length}
      onExit={() => navigate('/caracteres')}
      hint={answered ? 'Enter para continuar' : 'Pulsa 1-4 para responder'}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="mb-4 text-sm text-[var(--on-surface-variant)]">¿Cómo se lee?</p>
        <p className="font-jp text-8xl leading-none" lang="ja">
          {item.character.symbol}
        </p>
        {answered && (
          <AudioButton className="mt-5 inline-flex items-center" text={item.character.symbol} />
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Lecturas">
        {item.exercise.options.map((option, index) => {
          const selected = answer === option.text
          const revealCorrect = answered && option.text === item.character.romaji
          const revealWrong = answered && selected && !isCorrect
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
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

      <MirabiButton className="mt-4" disabled={!answered} onClick={advance}>
        {isLastStep ? 'Terminar' : 'Continuar'}
      </MirabiButton>
    </SessionScreen>
  )
}
