import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { MASTERY_VALUE } from '../../core/domain/models'
import { buildKanjiExercise, confusableKanji } from '../../core/domain/kanjiExercises'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import type { PracticeCard } from '../characters/PracticeSessionScreen'
import { PracticeSessionScreen } from '../characters/PracticeSessionScreen'

const SESSION_SIZE = 10

/**
 * Practica dedicada al kanji «que se confunden»: mismo motor que
 * KanjiPracticeScreen, pero acotado a confusableKanji en vez de a un grado.
 * buildKanjiExercise ya prefiere distractores del mismo radical cuando los
 * hay, asi que aca esa preferencia se cumple siempre, no de vez en cuando.
 */
export function ConfusablesPracticeScreen() {
  const navigate = useNavigate()

  const kanji = useMirabiStore((state) => state.kanji)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const completeCharacterPractice = useMirabiStore((state) => state.completeCharacterPractice)

  const cards = useMemo(() => {
    if (!kanji) return []
    return [...confusableKanji(kanji)]
      .sort(
        (a, b) =>
          MASTERY_VALUE[masteryOf(a.learningItemId)] - MASTERY_VALUE[masteryOf(b.learningItemId)],
      )
      .slice(0, SESSION_SIZE)
      .map<PracticeCard>((item) => ({
        id: item.id,
        display: (
          <p className="font-jp text-8xl leading-none" lang="ja">
            {item.symbol}
          </p>
        ),
        exercise: buildKanjiExercise(item, kanji),
      }))
    // Se construye una sola vez por sesion: rebarajar a media practica seria confuso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanji])

  return (
    <PracticeSessionScreen
      title="Kanji que se confunden"
      question="¿Qué significa?"
      optionsLabel="Significados"
      cards={cards}
      onExit={() => navigate('/caracteres/kanji')}
      onComplete={(tally) => completeCharacterPractice(tally.correct, tally.wrong)}
      completedTitle="Práctica completada"
      completedCta="Continuar"
      onCompletedCta={() => navigate('/caracteres/kanji', { replace: true })}
    />
  )
}
