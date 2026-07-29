import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { CharacterScript, KanaCharacter } from '../../core/content/types'
import { MASTERY_VALUE, nextMastery } from '../../core/domain/models'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'

const SESSION_SIZE = 10
const OPTIONS_PER_ITEM = 4

interface PracticeItem {
  character: KanaCharacter
  options: string[]
}

/**
 * DefaultCharacterPracticeSessionBuilder: primero lo mas debil.
 * Los distractores salen del mismo silabario para que la confusion sea realista.
 */
function buildSession(
  characters: KanaCharacter[],
  masteryOf: (id: string) => keyof typeof MASTERY_VALUE,
): PracticeItem[] {
  const ranked = [...characters].sort(
    (a, b) =>
      MASTERY_VALUE[masteryOf(a.learningItemId)] - MASTERY_VALUE[masteryOf(b.learningItemId)],
  )
  const selected = ranked.slice(0, SESSION_SIZE)

  return selected.map((character) => {
    const pool = characters
      .filter((other) => other.romaji !== character.romaji)
      .map((other) => other.romaji)
    const distractors: string[] = []
    while (distractors.length < OPTIONS_PER_ITEM - 1 && pool.length > 0) {
      const at = Math.floor(Math.random() * pool.length)
      const [candidate] = pool.splice(at, 1)
      if (!distractors.includes(candidate)) distractors.push(candidate)
    }
    const options = [character.romaji, ...distractors].sort(() => Math.random() - 0.5)
    return { character, options }
  })
}

export function CharacterPracticeScreen() {
  const { script } = useParams<{ script: string }>()
  const navigate = useNavigate()

  const catalog = useMirabiStore((state) => state.catalog)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const completeCharacterPractice = useMirabiStore((state) => state.completeCharacterPractice)

  const scriptKey: CharacterScript = script === 'katakana' ? 'KATAKANA' : 'HIRAGANA'
  const title = scriptKey === 'KATAKANA' ? 'Katakana' : 'Hiragana'

  const items = useMemo(() => {
    const characters = catalog?.characters.filter((item) => item.script === scriptKey) ?? []
    return buildSession(characters, masteryOf)
    // Se construye una sola vez por sesion: rebarajar a media practica seria confuso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, scriptKey])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [tally, setTally] = useState({ correct: 0, wrong: 0 })
  const [finished, setFinished] = useState(false)

  if (items.length === 0) {
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
        <MirabiButton className="mt-6" onClick={() => navigate('/caracteres', { replace: true })}>
          Continuar
        </MirabiButton>
      </div>
    )
  }

  const item = items[currentIndex]
  const answered = answer !== null
  const isCorrect = answered && answer === item.character.romaji

  const choose = (option: string) => {
    if (answered) return
    setAnswer(option)
    const correct = option === item.character.romaji
    setTally((previous) => ({
      correct: previous.correct + (correct ? 1 : 0),
      wrong: previous.wrong + (correct ? 0 : 1),
    }))
    // El dominio del kana se actualiza aqui: la practica no pasa por AnswerValidator.
    useMirabiStore.setState((state) => {
      const key = item.character.learningItemId
      const previous = state.learningProgress[key]
      const now = Date.now()
      return {
        learningProgress: {
          ...state.learningProgress,
          [key]: {
            learningItemId: key,
            learningItemType: 'KANA',
            mastery: nextMastery(previous?.mastery ?? 'UNKNOWN', correct),
            correctAnswers: (previous?.correctAnswers ?? 0) + (correct ? 1 : 0),
            wrongAnswers: (previous?.wrongAnswers ?? 0) + (correct ? 0 : 1),
            lastAnsweredAtEpochMillis: now,
            updatedAtEpochMillis: now,
          },
        },
      }
    })
  }

  const advance = () => {
    if (currentIndex === items.length - 1) {
      completeCharacterPractice(tally.correct, tally.wrong)
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    setAnswer(null)
  }

  return (
    <SessionScreen
      title={`Práctica de ${title}`}
      progress={currentIndex / items.length}
      onExit={() => navigate('/caracteres')}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="mb-4 text-sm text-[var(--on-surface-variant)]">¿Cómo se lee?</p>
        <p className="font-jp text-8xl leading-none">{item.character.symbol}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2.5">
        {item.options.map((option) => {
          const selected = answer === option
          const revealCorrect = answered && option === item.character.romaji
          const revealWrong = answered && selected && !isCorrect
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => choose(option)}
              className={[
                'rounded-[16px] border-2 py-4 text-lg font-semibold transition',
                revealCorrect
                  ? 'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_18%,transparent)]'
                  : revealWrong
                    ? 'border-[var(--secondary)] bg-[color-mix(in_srgb,var(--secondary)_18%,transparent)]'
                    : 'border-[var(--outline)] bg-[var(--surface)] hover:border-[var(--primary)]',
              ].join(' ')}
            >
              {option}
            </button>
          )
        })}
      </div>

      <MirabiButton className="mt-4" disabled={!answered} onClick={advance}>
        {currentIndex === items.length - 1 ? 'Terminar' : 'Continuar'}
      </MirabiButton>
    </SessionScreen>
  )
}
