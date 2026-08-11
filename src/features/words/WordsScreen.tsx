import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { JlptLevel, VocabularyWord } from '../../core/content/types'
import { findWords } from '../../core/content/loader'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiEmpty,
  MirabiFilterChips,
  MirabiSearchField,
  MirabiStatChip,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { slugOf } from '../characters/scriptSlug'
import { WordDetailSheet } from './WordDetailSheet'
import { WORD_STATE_LABEL, WORD_STATE_STYLE } from './wordStateStyle'

/**
 * Hub de la seccion Palabras: independiente de Caracteres, con su propio
 * progreso (NEW/LEARNING/MASTERED, wordProgress.ts) en vez del dominio SRS
 * que ya usa el kana. Filtrar por etiqueta/tema es la forma de "agrupar" -el
 * mismo patron que ya prueba WordsTab, aca sin acotar a un solo script-.
 */
export function WordsScreen() {
  const navigate = useNavigate()
  const words = useMirabiStore((state) => state.words)
  const catalog = useMirabiStore((state) => state.catalog)
  const learningProgress = useMirabiStore((state) => state.learningProgress)
  const wordProgress = useMirabiStore((state) => state.wordProgress)

  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [jlpt, setJlpt] = useState<JlptLevel | null>(null)
  const [selected, setSelected] = useState<VocabularyWord | null>(null)

  const jlptLevels = useMemo(() => {
    if (!words) return []
    return [
      ...new Set(words.words.map((word) => word.jlptLevel).filter((level): level is JlptLevel => level !== null)),
    ].sort()
  }, [words])

  const tags = useMemo(() => {
    if (!words) return []
    return [...new Set(words.words.flatMap((word) => word.tags))].sort((a, b) => a.localeCompare(b))
  }, [words])

  const stateCounts = useMemo(() => {
    if (!words) return { NEW: 0, LEARNING: 0, MASTERED: 0 }
    const counts = { NEW: 0, LEARNING: 0, MASTERED: 0 }
    for (const word of words.words) {
      counts[wordProgress[word.learningItemId]?.state ?? 'NEW'] += 1
    }
    return counts
  }, [words, wordProgress])

  if (!words) {
    return (
      <Screen title="Palabras">
        <p className="py-10 text-center text-sm text-[var(--on-surface-variant)]">Cargando biblioteca…</p>
      </Screen>
    )
  }

  const searched = query.trim() ? findWords(words, query) : words.words
  const byTag = tag ? searched.filter((word) => word.tags.includes(tag)) : searched
  const visible = jlpt ? byTag.filter((word) => word.jlptLevel === jlpt) : byTag

  return (
    <Screen title="Palabras">
      <div className="mb-5 flex gap-2">
        <MirabiStatChip icon="🆕" value={stateCounts.NEW} label="Nuevas" />
        <MirabiStatChip icon="📖" value={stateCounts.LEARNING} label="Aprendiendo" />
        <MirabiStatChip icon="✅" value={stateCounts.MASTERED} label="Dominadas" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <MirabiButton onClick={() => navigate('/palabras/estudio')}>Estudiar con tarjetas</MirabiButton>
        <MirabiButton variant="secondary" onClick={() => navigate('/palabras/practica')}>
          Practicar (quiz)
        </MirabiButton>
      </div>

      <MirabiSearchField
        className="mb-3"
        label="Buscar palabra"
        placeholder="Buscar por japonés, romaji o significado"
        value={query}
        onChange={setQuery}
      />

      {jlptLevels.length > 0 && (
        <>
          <SectionTitle>Nivel JLPT</SectionTitle>
          <MirabiFilterChips
            className="mb-4"
            ariaLabel="Nivel JLPT"
            allLabel="Todos"
            value={jlpt}
            onChange={setJlpt}
            options={jlptLevels.map((level) => ({ value: level, label: level }))}
          />
        </>
      )}

      {tags.length > 0 && (
        <>
          <SectionTitle>Tema</SectionTitle>
          <MirabiFilterChips
            className="mb-4"
            ariaLabel="Tema"
            allLabel="Todos"
            value={tag}
            onChange={setTag}
            options={tags.map((value) => ({ value, label: value }))}
          />
        </>
      )}

      {visible.length === 0 ? (
        <MirabiEmpty title="Sin resultados" message="Prueba con otra búsqueda, tema o nivel." />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((word) => {
            const state = wordProgress[word.learningItemId]?.state ?? 'NEW'
            return (
              <li key={word.id}>
                <MirabiCard className="flex items-center gap-3 p-4" onClick={() => setSelected(word)}>
                  <span
                    aria-hidden
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${WORD_STATE_STYLE[state].split(' ')[0]}`}
                    title={WORD_STATE_LABEL[state]}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-jp text-lg leading-tight">{word.lemma}</p>
                    {word.lemma !== word.kana && (
                      <p className="font-jp text-xs text-[var(--on-surface-variant)]">{word.kana}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm text-[var(--on-surface-variant)]">{word.meanings[0]}</p>
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
            const character = catalog?.characters.find((item) => item.id === characterId)
            if (character) navigate(`/caracteres/${slugOf(character.script)}`)
          }}
        />
      )}
    </Screen>
  )
}
