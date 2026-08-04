import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import type { CharacterCatalog, KanaCharacter, VocabularyWord, WordCatalog } from '../../core/content/types'
import { wordsByScript } from '../../core/content/loader'
import { MASTERY_VALUE } from '../../core/domain/models'
import type { MasteryScore } from '../../core/domain/models'
import { buildKanaExercise } from '../../core/domain/kanaExercises'
import { buildWordExercise } from '../../core/domain/wordExercises'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import type { PracticeCard } from './PracticeSessionScreen'
import { PracticeSessionScreen } from './PracticeSessionScreen'
import { scriptFromSlug, titleOf } from './scriptSlug'

const SESSION_SIZE = 10

const byWeakestFirst = <T,>(items: T[], masteryOf: (item: T) => MasteryScore): T[] =>
  [...items].sort((a, b) => MASTERY_VALUE[masteryOf(a)] - MASTERY_VALUE[masteryOf(b)])

/**
 * DefaultCharacterPracticeSessionBuilder: primero lo mas debil.
 *
 * Cada carta es un ejercicio de verdad, no una pregunta de pantalla: asi la
 * practica actualiza el dominio y programa el repaso por el mismo camino que
 * una leccion, en vez de escribir el estado por su cuenta.
 */
function buildCharacterSession(
  characters: KanaCharacter[],
  catalog: CharacterCatalog,
  masteryOf: (id: string) => MasteryScore,
): PracticeCard[] {
  return byWeakestFirst(characters, (character) => masteryOf(character.learningItemId))
    .slice(0, SESSION_SIZE)
    .map((character) => ({
      id: character.id,
      display: (
        <p className="font-jp text-8xl leading-none" lang="ja">
          {character.symbol}
        </p>
      ),
      exercise: buildKanaExercise(character, catalog),
    }))
}

/** Mismo criterio que la sesion de kana: primero lo que peor se domina. */
function buildWordSession(
  words: VocabularyWord[],
  catalog: WordCatalog,
  masteryOf: (id: string) => MasteryScore,
): PracticeCard[] {
  return byWeakestFirst(words, (word) => masteryOf(word.learningItemId))
    .slice(0, SESSION_SIZE)
    .map((word) => ({
      id: word.id,
      display: (
        <div className="flex flex-col items-center gap-2">
          <p className="font-jp text-6xl leading-none" lang="ja">
            {word.lemma}
          </p>
          {word.lemma !== word.kana && (
            <p className="font-jp text-xl text-[var(--on-surface-variant)]">{word.kana}</p>
          )}
        </div>
      ),
      exercise: buildWordExercise(word, catalog),
    }))
}

export function CharacterPracticeScreen() {
  const { script } = useParams<{ script: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const catalog = useMirabiStore((state) => state.catalog)
  const words = useMirabiStore((state) => state.words)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const completeCharacterPractice = useMirabiStore((state) => state.completeCharacterPractice)

  const scriptKey = scriptFromSlug(script)
  const title = scriptKey ? titleOf(scriptKey) : 'Práctica'
  // La ruta se comparte con la practica de caracteres: no hace falta una
  // pantalla nueva para lo que solo cambia el mazo de cartas que se sirve.
  const wordsMode = params.get('modo') === 'palabras'

  const characterCards = useMemo(() => {
    if (!catalog || scriptKey === null || wordsMode) return []
    const characters = catalog.characters.filter((item) => item.script === scriptKey)
    return buildCharacterSession(characters, catalog, masteryOf)
    // Se construye una sola vez por sesion: rebarajar a media practica seria confuso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, scriptKey, wordsMode])

  const wordCards = useMemo(() => {
    if (!words || scriptKey === null || !wordsMode) return []
    return buildWordSession(wordsByScript(words, scriptKey), words, masteryOf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, scriptKey, wordsMode])

  const cards = wordsMode ? wordCards : characterCards
  const backTo = `/caracteres/${script}${wordsMode ? '?tab=palabras' : ''}`

  return (
    <PracticeSessionScreen
      title={wordsMode ? `Práctica de palabras: ${title}` : `Práctica de ${title}`}
      question={wordsMode ? '¿Qué significa?' : '¿Cómo se lee?'}
      optionsLabel={wordsMode ? 'Significados' : 'Lecturas'}
      cards={cards}
      onExit={() => navigate(backTo)}
      onComplete={(tally) => completeCharacterPractice(tally.correct, tally.wrong)}
      completedTitle="Práctica completada"
      completedCta="Continuar"
      onCompletedCta={() => navigate(backTo, { replace: true })}
    />
  )
}
