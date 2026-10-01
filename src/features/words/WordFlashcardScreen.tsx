import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { selectDueWordSession } from '../../core/domain/wordProgress'
import { yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiEmpty, MirabiLoading, MirabiStatChip } from '../../ui/components'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { AudioButton } from '../lesson/ExerciseView'

/**
 * Flashcards de Palabras: tap para dar vuelta, "otra vez"/"la tengo" para
 * calificar. Escribe en wordProgress (wordProgress.ts / wordsProgressSlice),
 * no en el SRS de kana -es su propio sistema, a proposito-.
 */
export function WordFlashcardScreen() {
  const navigate = useNavigate()
  const words = useMirabiStore((state) => state.words)
  const wordProgress = useMirabiStore((state) => state.wordProgress)
  const reviewWordCard = useMirabiStore((state) => state.reviewWordCard)

  const session = useMemo(() => {
    if (!words) return []
    return selectDueWordSession(words.words, (id) => wordProgress[id], Date.now())
    // Se arma una sola vez por sesion: rebarajar a media practica seria confuso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [tally, setTally] = useState({ good: 0, again: 0 })
  const [finished, setFinished] = useState(false)

  const exit = () => navigate('/palabras')

  if (!words) {
    return (
      <SessionScreen title="Palabras · Tarjetas" progress={0} onExit={exit}>
        <MirabiLoading message="Preparando las tarjetas…" />
      </SessionScreen>
    )
  }

  if (session.length === 0) {
    return (
      <SessionScreen title="Palabras · Tarjetas" progress={0} onExit={exit}>
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
    const total = tally.good + tally.again
    const accuracy = total === 0 ? 0 : (tally.good * 100) / total
    const reaction = yukiReaction(accuracy >= 80 ? 'HIGH_ACCURACY' : 'LOW_ACCURACY')

    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="animate-pop flex flex-col items-center gap-3 text-center">
          <Yuki size={110} state={reaction.state} />
          <h1 className="text-2xl font-bold">Tarjetas completadas</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{reaction.text}</p>
        </div>
        <div className="mt-6 flex gap-2">
          <MirabiStatChip icon="✅" value={tally.good} label="Las tenías" />
          <MirabiStatChip icon="🔁" value={tally.again} label="A repasar" />
        </div>
        <MirabiButton className="mt-6" onClick={exit}>
          Continuar
        </MirabiButton>
      </div>
    )
  }

  const word = session[currentIndex]
  const rate = (outcome: 'again' | 'good') => {
    reviewWordCard(word.learningItemId, outcome)
    setTally((previous) => ({ ...previous, [outcome]: previous[outcome] + 1 }))
    if (currentIndex === session.length - 1) {
      setFinished(true)
      return
    }
    setRevealed(false)
    setCurrentIndex((value) => value + 1)
  }

  return (
    <SessionScreen
      title="Palabras · Tarjetas"
      progress={currentIndex / session.length}
      onExit={exit}
      hint="Tocá la tarjeta para dar vuelta"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {/* La acción de audio queda como control hermano para que no se anide en esta tarjeta. */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={revealed}
          onClick={() => setRevealed((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setRevealed((value) => !value)
            }
          }}
          className="flex min-h-[220px] w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-[var(--outline)] bg-[var(--surface)] p-6 text-center transition active:scale-[0.98]"
        >
          <p className="font-jp text-5xl leading-none">{word.lemma}</p>
          {word.lemma !== word.kana && (
            <p className="font-jp text-lg text-[var(--on-surface-variant)]">{word.kana}</p>
          )}
          {!revealed && (
            <p className="mt-2 text-xs text-[var(--on-surface-variant)]">Tocá para ver el significado</p>
          )}
          {revealed && (
            <div className="mt-2 flex flex-col items-center gap-3">
              <p className="text-base font-semibold">{word.meanings.join(', ')}</p>
              {word.exampleSentence && (
                <div className="rounded-[16px] bg-[var(--surface-variant)] px-4 py-3">
                  <p className="font-jp text-sm">{word.exampleSentence.text}</p>
                  <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{word.exampleSentence.romaji}</p>
                  <p className="mt-1 text-xs">{word.exampleSentence.meaning}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {revealed && <AudioButton text={word.audioText ?? word.kana} compact />}
      </div>

      {revealed && (
        <div className="mt-8 grid grid-cols-2 gap-2.5">
          <MirabiButton variant="secondary" onClick={() => rate('again')}>
            Otra vez
          </MirabiButton>
          <MirabiButton onClick={() => rate('good')}>La tengo</MirabiButton>
        </div>
      )}
    </SessionScreen>
  )
}
