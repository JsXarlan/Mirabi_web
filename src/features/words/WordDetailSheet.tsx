import { useNavigate } from 'react-router-dom'

import type { KanaCharacter, VocabularyWord } from '../../core/content/types'
import type { MasteryScore } from '../../core/domain/models'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiSheet, SectionTitle } from '../../ui/components'
import { AudioButton } from '../lesson/ExerciseView'
import { MASTERY_LABEL } from '../characters/masteryStyle'
import { slugOf } from '../characters/scriptSlug'

/**
 * Ficha de detalle de una palabra: extraida de WordsTab (pestana dentro de
 * Caracteres) para que la comparta tambien la seccion Palabras nueva, en vez
 * de duplicar el manejo de audio y el drilldown a kana/kanji dos veces.
 */
export function WordDetailSheet({
  word,
  mastery,
  onClose,
  onOpenCharacter,
}: {
  word: VocabularyWord
  mastery: MasteryScore
  onClose: () => void
  onOpenCharacter: (characterId: string) => void
}) {
  const navigate = useNavigate()
  const catalog = useMirabiStore((state) => state.catalog)
  const kanjiIndex = useMirabiStore((state) => state.kanjiIndex)

  const kanaChars = word.kanaCharacterIds
    .map((id) => catalog?.characters.find((character) => character.id === id))
    .filter((character): character is KanaCharacter => character !== undefined)

  const kanjiChars = word.kanjiIds
    .map((id) => kanjiIndex?.byId.get(id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)

  return (
    <MirabiSheet title={`Palabra ${word.lemma}, ${word.romaji}`} onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-jp text-4xl leading-none">{word.lemma}</p>
          {word.lemma !== word.kana && (
            <p className="mt-1 font-jp text-base text-[var(--on-surface-variant)]">{word.kana}</p>
          )}
          <p className="mt-1 text-sm font-semibold">{word.romaji}</p>
          <p className="text-xs text-[var(--on-surface-variant)]">{MASTERY_LABEL[mastery]}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* AudioButton, no un boton propio: respeta el ajuste de audio y la
              carga tardia de las voces. */}
          <AudioButton text={word.audioText ?? word.kana} compact />
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-variant)]"
          >
            ✕
          </button>
        </div>
      </div>

      <SectionTitle>Significado</SectionTitle>
      <p className="text-sm">{word.meanings.join(', ')}</p>

      {word.exampleSentence && (
        <>
          <SectionTitle>En una frase</SectionTitle>
          <div className="rounded-[16px] bg-[var(--surface-variant)] px-4 py-3">
            <p className="font-jp text-base">{word.exampleSentence.text}</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{word.exampleSentence.romaji}</p>
            <p className="mt-1 text-sm">{word.exampleSentence.meaning}</p>
          </div>
        </>
      )}

      {word.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {word.tags.map((label) => (
            <span
              key={label}
              className="rounded-full bg-[var(--surface-variant)] px-3 py-1 text-xs text-[var(--on-surface-variant)]"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {kanaChars.length > 0 && (
        <>
          <SectionTitle>Kana que la componen</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {kanaChars.map((character) => (
              <button
                key={character.id}
                type="button"
                onClick={() => onOpenCharacter(character.id)}
                className="flex flex-col items-center rounded-[14px] bg-[var(--surface-variant)] px-3 py-2 transition active:scale-95"
              >
                <span className="font-jp text-lg leading-none">{character.symbol}</span>
                <span className="mt-1 text-[10px] text-[var(--on-surface-variant)]">
                  {character.romaji}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {kanjiChars.length > 0 && (
        <>
          <SectionTitle>Kanji que la componen</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {kanjiChars.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/caracteres/kanji?kanji=${item.id}`)}
                className="flex flex-col items-center rounded-[14px] bg-[var(--surface-variant)] px-3 py-2 transition active:scale-95"
              >
                <span className="font-jp text-lg leading-none">{item.symbol}</span>
                <span className="mt-1 text-[10px] text-[var(--on-surface-variant)]">
                  {item.meanings[0]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <MirabiButton
        className="mt-5"
        onClick={() => navigate(`/caracteres/${slugOf(word.script)}/practica?modo=palabras`)}
      >
        Practicar
      </MirabiButton>
    </MirabiSheet>
  )
}
