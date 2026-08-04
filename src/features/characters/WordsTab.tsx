import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { CharacterScript, KanaCharacter, VocabularyWord } from '../../core/content/types'
import { findWords, wordsByScript } from '../../core/content/loader'
import type { MasteryScore } from '../../core/domain/models'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiEmpty,
  MirabiFilterChips,
  MirabiSearchField,
  MirabiSheet,
  SectionTitle,
} from '../../ui/components'
import { AudioButton } from '../lesson/ExerciseView'
import { MASTERY_LABEL, MASTERY_STYLE } from './masteryStyle'
import { slugOf } from './scriptSlug'

/**
 * Pestaña de biblioteca dentro de CharacterScriptScreen.
 *
 * Buscar, filtrar, ver la ficha y practicar: las palabras entran en el SRS
 * por la misma puerta que el kana, asi que la practica es un ejercicio de
 * verdad (wordExercises.ts), no una pregunta de pantalla.
 */
export function WordsTab({
  script,
  onOpenCharacter,
}: {
  script: CharacterScript
  onOpenCharacter: (characterId: string) => void
}) {
  const words = useMirabiStore((state) => state.words)
  const learningProgress = useMirabiStore((state) => state.learningProgress)

  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [selected, setSelected] = useState<VocabularyWord | null>(null)

  if (!words) {
    return (
      <p className="py-10 text-center text-sm text-[var(--on-surface-variant)]">
        Cargando biblioteca…
      </p>
    )
  }

  const scoped = wordsByScript(words, script)
  const tags = [...new Set(scoped.flatMap((word) => word.tags))].sort((a, b) => a.localeCompare(b))

  const searched = query.trim() ? findWords({ ...words, words: scoped }, query) : scoped
  const visible = tag ? searched.filter((word) => word.tags.includes(tag)) : searched

  if (scoped.length === 0) {
    return (
      <MirabiEmpty
        title="Todavía no hay palabras aquí"
        message="La biblioteca de este apartado está vacía por ahora."
      />
    )
  }

  return (
    <div>
      <MirabiSearchField
        className="mb-3"
        label="Buscar palabra"
        placeholder="Buscar por japonés, romaji o significado"
        value={query}
        onChange={setQuery}
      />

      {tags.length > 0 && (
        <MirabiFilterChips
          className="mb-4"
          allLabel="Todas"
          value={tag}
          onChange={setTag}
          options={tags.map((value) => ({ value, label: value }))}
        />
      )}

      {visible.length === 0 ? (
        <MirabiEmpty title="Sin resultados" message="Prueba con otra búsqueda o etiqueta." />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((word) => {
            const mastery = learningProgress[word.learningItemId]?.mastery ?? 'UNKNOWN'
            return (
              <li key={word.id}>
                <MirabiCard className="flex items-center gap-3 p-4" onClick={() => setSelected(word)}>
                  <span
                    aria-hidden
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${MASTERY_STYLE[mastery].split(' ')[0]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-jp text-lg leading-tight">{word.lemma}</p>
                    {word.lemma !== word.kana && (
                      <p className="font-jp text-xs text-[var(--on-surface-variant)]">{word.kana}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm text-[var(--on-surface-variant)]">
                    {word.meanings[0]}
                  </p>
                </MirabiCard>
              </li>
            )
          })}
        </ul>
      )}

      {selected && (
        <WordSheet
          word={selected}
          mastery={learningProgress[selected.learningItemId]?.mastery ?? 'UNKNOWN'}
          onClose={() => setSelected(null)}
          onOpenCharacter={(characterId) => {
            setSelected(null)
            onOpenCharacter(characterId)
          }}
        />
      )}
    </div>
  )
}

function WordSheet({
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
