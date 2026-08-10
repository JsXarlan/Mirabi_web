import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { KanjiCharacter } from '../../core/content/types'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiCard, MirabiEmpty, MirabiLoading, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { MASTERY_LABEL, MASTERY_STYLE } from '../characters/masteryStyle'
import { KanjiSheet } from './KanjiScreen'

interface RadicalGroup {
  number: number
  symbol: string
  meaning: string | null
  kanji: KanjiCharacter[]
}

/**
 * Alternativa a explorar por grado: agrupa el jōyō por radical clásico
 * (1-214). KANJIDIC2 solo nombra 108 de los 214, asi que buena parte de la
 * lista se identifica por número y símbolo, no por significado.
 */
export function RadicalsScreen() {
  const navigate = useNavigate()
  const kanji = useMirabiStore((state) => state.kanji)
  const learningProgress = useMirabiStore((state) => state.learningProgress)

  const [activeRadical, setActiveRadical] = useState<number | null>(null)
  const [selected, setSelected] = useState<KanjiCharacter | null>(null)

  const groups = useMemo(() => {
    if (!kanji) return []
    const byNumber = new Map<number, RadicalGroup>()
    for (const item of kanji.kanji) {
      if (!item.radical) continue
      const existing = byNumber.get(item.radical.number)
      if (existing) {
        existing.kanji.push(item)
      } else {
        byNumber.set(item.radical.number, {
          number: item.radical.number,
          symbol: item.radical.symbol,
          meaning: item.radical.meaning,
          kanji: [item],
        })
      }
    }
    return [...byNumber.values()].sort((a, b) => a.number - b.number)
  }, [kanji])

  if (!kanji) {
    return (
      <Screen title="Kanji por radical">
        <MirabiLoading message="Cargando el catálogo de kanji…" />
      </Screen>
    )
  }

  const active = activeRadical !== null ? groups.find((group) => group.number === activeRadical) : null

  return (
    <Screen
      title={active ? `Radical ${active.symbol}` : 'Kanji por radical'}
      action={
        <button
          type="button"
          onClick={() => (active ? setActiveRadical(null) : navigate('/caracteres/kanji'))}
          className="rounded-full bg-[var(--surface-variant)] px-4 py-2 text-xs font-semibold"
        >
          {active ? 'Radicales' : 'Volver'}
        </button>
      }
    >
      {!active ? (
        groups.length === 0 ? (
          <MirabiEmpty title="Sin radicales" message="El catálogo de kanji todavía no tiene radicales cargados." />
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <MirabiCard key={group.number} className="flex items-center gap-4 p-4" onClick={() => setActiveRadical(group.number)}>
                <span className="font-jp flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--surface-variant)] text-2xl">
                  {group.symbol}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{group.meaning ?? `Radical nº${group.number}`}</p>
                  <p className="text-xs text-[var(--on-surface-variant)]">{group.kanji.length} kanji</p>
                </div>
              </MirabiCard>
            ))}
          </div>
        )
      ) : (
        <>
          {active.meaning && (
            <p className="mb-4 text-sm text-[var(--on-surface-variant)]">
              Radical {active.symbol} · {active.meaning}
            </p>
          )}
          <SectionTitle>{active.kanji.length} kanji</SectionTitle>
          <div className="grid grid-cols-5 gap-2">
            {active.kanji.map((item) => {
              const mastery = learningProgress[item.learningItemId]?.mastery ?? 'UNKNOWN'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  aria-label={`${item.symbol}, ${item.meanings[0]}. ${MASTERY_LABEL[mastery]}`}
                  className={`flex aspect-square flex-col items-center justify-center rounded-[16px] transition active:scale-95 ${MASTERY_STYLE[mastery]}`}
                >
                  <span className="font-jp text-2xl leading-none" lang="ja" aria-hidden>
                    {item.symbol}
                  </span>
                  <span className="mt-1 truncate px-1 text-[10px] opacity-80" aria-hidden>
                    {item.meanings[0]}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {selected && (
        <KanjiSheet
          item={selected}
          mastery={learningProgress[selected.learningItemId]?.mastery ?? 'UNKNOWN'}
          romaji={null}
          onClose={() => setSelected(null)}
        />
      )}
    </Screen>
  )
}
