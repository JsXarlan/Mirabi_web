import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { buildJukugoExercise, jukugoCompound, jukugoWords } from '../../core/domain/jukugoExercises'
import { MASTERY_VALUE } from '../../core/domain/models'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import type { PracticeCard } from '../characters/PracticeSessionScreen'
import { PracticeSessionScreen } from '../characters/PracticeSessionScreen'

const SESSION_SIZE = 10

/**
 * Practica de compuestos (熟語): mismo motor que las demas practicas de kanji,
 * sobre jukugoWords en vez de sobre el kanji suelto. Ver jukugoExercises.ts.
 */
export function JukugoPracticeScreen() {
  const navigate = useNavigate()

  const kanji = useMirabiStore((state) => state.kanji)
  const words = useMirabiStore((state) => state.words)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const completeCharacterPractice = useMirabiStore((state) => state.completeCharacterPractice)

  const cards = useMemo(() => {
    if (!kanji || !words) return []
    return [...jukugoWords(words, kanji)]
      .sort(
        (a, b) =>
          MASTERY_VALUE[masteryOf(a.learningItemId)] - MASTERY_VALUE[masteryOf(b.learningItemId)],
      )
      .slice(0, SESSION_SIZE)
      .map<PracticeCard | null>((word) => {
        const exercise = buildJukugoExercise(word, words, kanji)
        const compound = jukugoCompound(word, kanji)
        if (!exercise || !compound) return null
        return {
          id: word.id,
          display: (
            <p className="font-jp text-8xl leading-none" lang="ja">
              {compound}
            </p>
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
      title="Compuestos (熟語)"
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
