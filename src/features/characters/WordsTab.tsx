import { useState } from 'react'

import type { CharacterScript, VocabularyWord } from '../../core/content/types'
import { findWords, wordsByScript } from '../../core/content/loader'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiCard, MirabiEmpty, MirabiFilterChips, MirabiSearchField } from '../../ui/components'
import { WordDetailSheet } from '../words/WordDetailSheet'
import { MASTERY_STYLE } from './masteryStyle'

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
          ariaLabel="Etiquetas"
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
        <WordDetailSheet
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
