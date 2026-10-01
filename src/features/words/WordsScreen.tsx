import { useMemo, useRef, useState } from 'react'
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
import { AppIcon } from '../../ui/Icons'
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

  const libraryRef = useRef<HTMLDivElement>(null)
  const changePage = (next: number) => {
    setPage(next)
    libraryRef.current?.focus({ preventScroll: true })
    libraryRef.current?.scrollIntoView({ block: 'start' })
  }
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [jlpt, setJlpt] = useState<JlptLevel | null>(null)
  const [selected, setSelected] = useState<VocabularyWord | null>(null)

  const jlptLevels = useMemo(() => {
    if (!words) return []
    return [
      ...new Set(
        words.words
          .map((word) => word.jlptLevel)
          .filter((level): level is JlptLevel => level !== null),
      ),
    ].sort()
  }, [words])

  const tags = useMemo(() => {
    if (!words) return []
    return [...new Set(words.words.flatMap((word) => word.tags))].sort((a, b) =>
      a.localeCompare(b),
    )
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
        <p className="py-10 text-center text-sm text-[var(--on-surface-variant)]">
          Cargando biblioteca…
        </p>
      </Screen>
    )
  }

  const searched = query.trim() ? findWords(words, query) : words.words
  const byTag = tag
    ? searched.filter((word) => word.tags.includes(tag))
    : searched
  const visible = jlpt ? byTag.filter((word) => word.jlptLevel === jlpt) : byTag

  const pageSize = 24
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const pageWords = visible.slice((page - 1) * pageSize, page * pageSize)

  return (
    <Screen
      title="Tu vocabulario"
      subtitle="Cada palabra abre una nueva conversación."
      wide
    >
      <div className="mb-6 grid grid-cols-3 gap-3">
        <MirabiStatChip icon="🆕" value={stateCounts.NEW} label="Nuevas" />
        <MirabiStatChip
          icon="📖"
          value={stateCounts.LEARNING}
          label="Aprendiendo"
        />
        <MirabiStatChip
          icon="✅"
          value={stateCounts.MASTERED}
          label="Dominadas"
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <MirabiButton onClick={() => navigate('/palabras/estudio')}>
          <AppIcon name="words" size={20} />
          Estudiar con tarjetas
        </MirabiButton>
        <MirabiButton
          variant="secondary"
          onClick={() => navigate('/palabras/practica')}
        >
          <AppIcon name="play" size={20} />
          Practicar vocabulario
        </MirabiButton>
      </div>

      <MirabiSearchField
        className="mb-3"
        label="Buscar palabra"
        placeholder="Buscar por japonés, romaji o significado"
        value={query}
        onChange={(value) => {
          setQuery(value)
          setPage(1)
        }}
      />

      {jlptLevels.length > 0 && (
        <>
          <SectionTitle>Nivel JLPT</SectionTitle>
          <MirabiFilterChips
            className="mb-4"
            ariaLabel="Nivel JLPT"
            allLabel="Todos"
            value={jlpt}
            onChange={(value) => {
              setJlpt(value)
              setPage(1)
            }}
            options={jlptLevels.map((level) => ({
              value: level,
              label: level,
            }))}
          />
        </>
      )}

      {tags.length > 0 && (
        <details className="mirabi-card mb-6 p-5">
          <summary className="text-sm font-bold">
            Filtrar por tema{tag ? ' · ' + tag.replaceAll('_', ' ') : ''}
          </summary>
          <div className="mt-4">
            <SectionTitle>Tema</SectionTitle>
            <MirabiFilterChips
              className="mb-4"
              ariaLabel="Tema"
              allLabel="Todos"
              value={tag}
              onChange={(value) => {
                setTag(value)
                setPage(1)
              }}
              options={tags.map((value) => ({
                value,
                label: value.replaceAll('_', ' '),
              }))}
            />
          </div>
        </details>
      )}

      <div ref={libraryRef} tabIndex={-1} className="library-anchor">
        <SectionTitle
          action={
            <span
              role="status"
              className="text-sm text-[var(--on-surface-variant)]"
            >
              {visible.length} palabras
            </span>
          }
        >
          Tu biblioteca
        </SectionTitle>
      </div>
      {visible.length === 0 ? (
        <MirabiEmpty
          title="Sin resultados"
          message="Prueba con otra búsqueda, tema o nivel."
        />
      ) : (
        <ul className="word-library-grid">
          {pageWords.map((word) => {
            const state = wordProgress[word.learningItemId]?.state ?? 'NEW'
            return (
              <li key={word.id}>
                <MirabiCard
                  className="flex items-center gap-3 p-4"
                  onClick={() => setSelected(word)}
                >
                  <span
                    aria-hidden
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${WORD_STATE_STYLE[state].split(' ')[0]}`}
                    title={WORD_STATE_LABEL[state]}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-jp text-lg leading-tight">
                      {word.lemma}
                    </p>
                    {word.lemma !== word.kana && (
                      <p className="font-jp text-xs text-[var(--on-surface-variant)]">
                        {word.kana}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-sm text-[var(--on-surface-variant)]">
                      {word.meanings[0]}
                    </p>
                    <span className="mt-1 block text-xs text-[var(--primary)]">
                      {WORD_STATE_LABEL[state]}
                    </span>
                  </div>
                  <AppIcon name="chevron" size={18} />
                </MirabiCard>
              </li>
            )
          })}
        </ul>
      )}

      {pageCount > 1 && (
        <nav className="library-pagination" aria-label="Páginas de vocabulario">
          <MirabiButton
            variant="secondary"
            disabled={page === 1}
            onClick={() => changePage(page - 1)}
          >
            <AppIcon name="back" size={18} />
            Anterior
          </MirabiButton>
          <span>
            Página {page} de {pageCount}
          </span>
          <MirabiButton
            variant="secondary"
            disabled={page === pageCount}
            onClick={() => changePage(page + 1)}
          >
            Siguiente
            <AppIcon name="next" size={18} />
          </MirabiButton>
        </nav>
      )}

      {selected && (
        <WordDetailSheet
          word={selected}
          mastery={
            learningProgress[selected.learningItemId]?.mastery ?? 'UNKNOWN'
          }
          onClose={() => setSelected(null)}
          onOpenCharacter={(characterId) => {
            setSelected(null)
            const character = catalog?.characters.find(
              (item) => item.id === characterId,
            )
            if (character) navigate(`/caracteres/${slugOf(character.script)}`)
          }}
        />
      )}
    </Screen>
  )
}
