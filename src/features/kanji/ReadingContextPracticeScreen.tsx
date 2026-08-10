import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { MASTERY_VALUE } from '../../core/domain/models'
import { buildKanjiReadingExercise, readableInContext } from '../../core/domain/kanjiReadingExercises'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import type { PracticeCard } from '../characters/PracticeSessionScreen'
import { PracticeSessionScreen } from '../characters/PracticeSessionScreen'

const SESSION_SIZE = 10

/**
 * Practica de lectura en contexto: mismo motor que KanjiPracticeScreen, pero
 * sobre readableInContext -parejas kanji/palabra donde la lectura es
 * inequívoca- en vez de sobre el kanji aislado. Ver kanjiReadingExercises.ts.
 */
export function ReadingContextPracticeScreen() {
  const navigate = useNavigate()

  const kanji = useMirabiStore((state) => state.kanji)
  const words = useMirabiStore((state) => state.words)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const completeCharacterPractice = useMirabiStore((state) => state.completeCharacterPractice)

  const cards = useMemo(() => {
    if (!kanji || !words) return []
    return [...readableInContext(kanji, words)]
      .sort(
        (a, b) =>
          MASTERY_VALUE[masteryOf(a.kanji.learningItemId)] - MASTERY_VALUE[masteryOf(b.kanji.learningItemId)],
      )
      .slice(0, SESSION_SIZE)
      .map<PracticeCard | null>(({ kanji: item, word }) => {
        const exercise = buildKanjiReadingExercise(item, word, kanji)
        if (!exercise) return null
        return {
          id: `${item.id}-${word.id}`,
          display: (
            <div className="flex flex-col items-center gap-2">
              <p className="font-jp text-7xl leading-none" lang="ja">
                {word.lemma}
              </p>
              <p className="text-sm text-[var(--on-surface-variant)]">{word.meanings[0]}</p>
            </div>
          ),
          exercise,
        }
      })
      .filter((card): card is PracticeCard => card !== null)
    // Se construye una sola vez por sesion: rebarajar a media practica seria confuso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanji, words])

  return (
    <PracticeSessionScreen
      title="Lectura en contexto"
      question="¿Cómo se lee el kanji de esta palabra?"
      optionsLabel="Lecturas"
      cards={cards}
      onExit={() => navigate('/caracteres/kanji')}
      onComplete={(tally) => completeCharacterPractice(tally.correct, tally.wrong)}
      completedTitle="Práctica completada"
      completedCta="Continuar"
      onCompletedCta={() => navigate('/caracteres/kanji', { replace: true })}
    />
  )
}
