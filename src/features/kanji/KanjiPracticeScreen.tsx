import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { kanjiByGrade } from '../../core/content/loader'
import { MASTERY_VALUE } from '../../core/domain/models'
import { buildKanjiExercise } from '../../core/domain/kanjiExercises'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import type { PracticeCard } from '../characters/PracticeSessionScreen'
import { PracticeSessionScreen } from '../characters/PracticeSessionScreen'

const SESSION_SIZE = 10
const DEFAULT_GRADE = 1

export function KanjiPracticeScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Con 2.136 kanji, practicar «todos» no tiene sentido pedagogico: se acota
  // al grado que se estaba mirando, o al mas basico si se llega directo.
  const grade = Number(params.get('grado') ?? DEFAULT_GRADE)

  const kanji = useMirabiStore((state) => state.kanji)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const completeCharacterPractice = useMirabiStore((state) => state.completeCharacterPractice)

  const cards = useMemo(() => {
    if (!kanji) return []
    return [...kanjiByGrade(kanji, grade)]
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
  }, [kanji, grade])

  return (
    <PracticeSessionScreen
      title="Práctica de kanji"
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
