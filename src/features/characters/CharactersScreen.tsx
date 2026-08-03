import { useNavigate } from 'react-router-dom'

import type { CharacterScript } from '../../core/content/types'
import { MASTERY_VALUE } from '../../core/domain/models'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiDonutProgress,
  MirabiProgressBar,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { useKanjiMastery } from '../kanji/KanjiScreen'
import { slugOf, titleOf } from './scriptSlug'

/** Dominio medio de un conjunto de kana, en 0..100. */
export function useScriptMastery(script: CharacterScript): {
  total: number
  mastered: number
  percentage: number
} {
  const catalog = useMirabiStore((state) => state.catalog)
  const learningProgress = useMirabiStore((state) => state.learningProgress)

  const characters = catalog?.characters.filter((item) => item.script === script) ?? []
  if (characters.length === 0) return { total: 0, mastered: 0, percentage: 0 }

  let sum = 0
  let mastered = 0
  for (const character of characters) {
    const mastery = learningProgress[character.learningItemId]?.mastery ?? 'UNKNOWN'
    sum += MASTERY_VALUE[mastery]
    if (mastery === 'MASTERED' || mastery === 'EXPERT') mastered += 1
  }

  return { total: characters.length, mastered, percentage: sum / characters.length }
}

export function CharactersScreen() {
  const navigate = useNavigate()
  const hiragana = useScriptMastery('HIRAGANA')
  const katakana = useScriptMastery('KATAKANA')
  const kanji = useKanjiMastery()

  const overall =
    hiragana.total + katakana.total === 0
      ? 0
      : (hiragana.percentage * hiragana.total + katakana.percentage * katakana.total) /
        (hiragana.total + katakana.total)

  // El sistema recomendado es el menos dominado de los dos disponibles en el MVP.
  const recommended: CharacterScript =
    hiragana.percentage <= katakana.percentage ? 'HIRAGANA' : 'KATAKANA'

  return (
    <Screen title="Caracteres">
      <MirabiCard className="mb-5 flex items-center gap-5 p-5">
        <MirabiDonutProgress percentage={overall} />
        <div className="min-w-0">
          <p className="text-sm font-bold">Dominio general</p>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
            {hiragana.mastered + katakana.mastered} de {hiragana.total + katakana.total} caracteres
            dominados
          </p>
          <MirabiButton
            className="mt-3"
            onClick={() => navigate(`/caracteres/${slugOf(recommended)}/practica`)}
          >
            Practicar {titleOf(recommended)}
          </MirabiButton>
        </div>
      </MirabiCard>

      <SectionTitle>Sistemas de escritura</SectionTitle>

      <ScriptCard
        title="Hiragana"
        sample="あいうえお"
        stats={hiragana}
        onOpen={() => navigate('/caracteres/hiragana')}
      />
      <ScriptCard
        title="Katakana"
        sample="アイウエオ"
        stats={katakana}
        onOpen={() => navigate('/caracteres/katakana')}
      />

      {kanji.total > 0 && (
        <ScriptCard
          title="Kanji"
          sample="日本語"
          stats={kanji}
          onOpen={() => navigate('/caracteres/kanji')}
        />
      )}

      <SectionTitle>Próximamente</SectionTitle>
      <MirabiCard className="flex items-center gap-4 p-5 opacity-60">
        <span className="text-2xl" aria-hidden>
          ✍️
        </span>
        <div>
          <p className="text-sm font-bold">Escritura</p>
          <p className="text-xs text-[var(--on-surface-variant)]">
            Trazado y orden de trazos, preparado para V1.0.
          </p>
        </div>
      </MirabiCard>
    </Screen>
  )
}

function ScriptCard({
  title,
  sample,
  stats,
  onOpen,
}: {
  title: string
  sample: string
  stats: { total: number; mastered: number; percentage: number }
  onOpen: () => void
}) {
  return (
    <MirabiCard className="mb-3 p-5" onClick={onOpen}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold">{title}</p>
          <p className="font-jp text-lg text-[var(--on-surface-variant)]">{sample}</p>
        </div>
        <span className="shrink-0 text-sm font-bold">{Math.round(stats.percentage)}%</span>
      </div>
      <MirabiProgressBar className="mt-3" progress={stats.percentage / 100} />
      <p className="mt-2 text-xs text-[var(--on-surface-variant)]">
        {stats.mastered}/{stats.total} dominados
      </p>
    </MirabiCard>
  )
}
