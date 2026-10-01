import { Link, useNavigate } from 'react-router-dom'

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
import { AppIcon } from '../../ui/Icons'
import { useKanjiMastery } from '../kanji/kanjiMastery'
import { isPracticableGroup, slugOf, titleOf } from './scriptSlug'

/** Dominio medio de un conjunto de kana, en 0..100. */
export function useScriptMastery(script: CharacterScript): {
  total: number
  mastered: number
  percentage: number
} {
  const catalog = useMirabiStore((state) => state.catalog)
  const learningProgress = useMirabiStore((state) => state.learningProgress)

  const characters =
    catalog?.characters.filter(
      (item) => item.script === script && isPracticableGroup(item.group),
    ) ?? []
  if (characters.length === 0) return { total: 0, mastered: 0, percentage: 0 }

  let sum = 0
  let mastered = 0
  for (const character of characters) {
    const mastery =
      learningProgress[character.learningItemId]?.mastery ?? 'UNKNOWN'
    sum += MASTERY_VALUE[mastery]
    if (mastery === 'MASTERED' || mastery === 'EXPERT') mastered += 1
  }

  return {
    total: characters.length,
    mastered,
    percentage: sum / characters.length,
  }
}

export function CharactersScreen() {
  const navigate = useNavigate()
  const hiragana = useScriptMastery('HIRAGANA')
  const katakana = useScriptMastery('KATAKANA')
  const kanji = useKanjiMastery()

  const overall =
    hiragana.total + katakana.total === 0
      ? 0
      : (hiragana.percentage * hiragana.total +
          katakana.percentage * katakana.total) /
        (hiragana.total + katakana.total)

  // El sistema recomendado es el menos dominado de los dos disponibles en el MVP.
  const recommended: CharacterScript =
    hiragana.percentage <= katakana.percentage ? 'HIRAGANA' : 'KATAKANA'

  return (
    <Screen title="Caracteres" wide>
      <MirabiCard className="feature-banner">
        <MirabiDonutProgress percentage={overall} size={88} />
        <div>
          <p className="eyebrow">TU PRÓXIMA PRÁCTICA</p>
          <h2>Un trazo más, una conexión más.</h2>
          <p>
            {hiragana.mastered + katakana.mastered} de{' '}
            {hiragana.total + katakana.total} kana dominados. Refuerza{' '}
            {titleOf(recommended)} a tu ritmo.
          </p>
          <MirabiButton
            onClick={() =>
              navigate('/caracteres/' + slugOf(recommended) + '/practica')
            }
          >
            <AppIcon name="play" size={19} weight="fill" />
            Practicar {titleOf(recommended)}
          </MirabiButton>
        </div>
      </MirabiCard>
      <SectionTitle>Tres formas de escribir una historia</SectionTitle>
      <div className="collection-grid">
        <ScriptCard
          title="Hiragana"
          sample="あ"
          description="El primer paso. La escritura para las palabras japonesas."
          stats={hiragana}
          onOpen={() => navigate('/caracteres/hiragana')}
        />
        <ScriptCard
          title="Katakana"
          sample="ア"
          description="Nuevos sonidos. Palabras que llegan de otros idiomas."
          stats={katakana}
          onOpen={() => navigate('/caracteres/katakana')}
        />
        {kanji.total > 0 && (
          <ScriptCard
            title="Kanji"
            sample="学"
            description="Forma y significado. Descubre las historias de cada carácter."
            stats={kanji}
            onOpen={() => navigate('/caracteres/kanji')}
          />
        )}
      </div>
      <div className="practice-grid">
        <Link to="/palabras" className="mirabi-card library-link">
          <span className="icon-tile">
            <AppIcon name="words" />
          </span>
          <div>
            <h2>Conecta con palabras</h2>
            <p>Explora tu biblioteca de vocabulario.</p>
          </div>
          <AppIcon name="next" size={20} />
        </Link>
        <Link
          to="/caracteres/hiragana/escritura"
          className="mirabi-card library-link"
        >
          <span className="icon-tile sakura">
            <AppIcon name="pencil" />
          </span>
          <div>
            <h2>Practica los trazos</h2>
            <p>Dibuja hiragana y sigue su forma.</p>
          </div>
          <AppIcon name="next" size={20} />
        </Link>
      </div>
    </Screen>
  )
}

function ScriptCard({
  title,
  sample,
  description,
  stats,
  onOpen,
}: {
  title: string
  sample: string
  description: string
  stats: { total: number; mastered: number; percentage: number }
  onOpen: () => void
}) {
  return (
    <MirabiCard className="collection-card" onClick={onOpen}>
      <div className="collection-symbol" lang="ja" aria-hidden="true">
        {sample}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="collection-meta">
        <span>
          {stats.mastered} / {stats.total} dominados
        </span>
        <strong>{Math.round(stats.percentage)}%</strong>
      </div>
      <MirabiProgressBar
        progress={stats.percentage / 100}
        label={'Dominio de ' + title}
      />
      <span className="collection-footer">
        Explorar {title}
        <AppIcon name="next" size={20} />
      </span>
    </MirabiCard>
  )
}
