import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { CharacterScript, KanaCharacter, KanaGroup } from '../../core/content/types'
import type { MasteryScore } from '../../core/domain/models'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { isSpeechAvailable, speakJapanese } from '../../core/audio/speech'
import { MirabiButton, MirabiCard, MirabiProgressBar, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { useScriptMastery } from './CharactersScreen'

const GROUP_LABEL: Record<KanaGroup, string> = {
  VOWELS: 'Vocales',
  K: 'Serie K',
  S: 'Serie S',
  T: 'Serie T',
  N: 'Serie N',
  H: 'Serie H',
  M: 'Serie M',
  Y: 'Serie Y',
  R: 'Serie R',
  W: 'Serie W / n',
  DAKUTEN: 'Dakuten y handakuten',
  COMBINATIONS: 'Combinaciones',
  BASIC_KATAKANA: 'Katakana básico',
}

const MASTERY_STYLE: Record<MasteryScore, string> = {
  UNKNOWN: 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]',
  FAMILIAR: 'bg-[color-mix(in_srgb,var(--secondary)_20%,transparent)]',
  LEARNING: 'bg-[color-mix(in_srgb,var(--tertiary)_28%,transparent)]',
  MASTERED: 'bg-[color-mix(in_srgb,var(--success)_28%,transparent)]',
  EXPERT: 'bg-[var(--success)] text-white',
}

export function CharacterScriptScreen() {
  const { script } = useParams<{ script: string }>()
  const navigate = useNavigate()
  const catalog = useMirabiStore((state) => state.catalog)
  const learningProgress = useMirabiStore((state) => state.learningProgress)

  const scriptKey: CharacterScript = script === 'katakana' ? 'KATAKANA' : 'HIRAGANA'
  const title = scriptKey === 'KATAKANA' ? 'Katakana' : 'Hiragana'
  const stats = useScriptMastery(scriptKey)

  const [selected, setSelected] = useState<KanaCharacter | null>(null)

  const characters = catalog?.characters.filter((item) => item.script === scriptKey) ?? []
  const groups = [...new Set(characters.map((item) => item.group))]

  return (
    <Screen title={title}>
      <MirabiCard className="mb-5 p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">Dominio</span>
          <span className="text-sm font-bold">{Math.round(stats.percentage)}%</span>
        </div>
        <MirabiProgressBar progress={stats.percentage / 100} />
        <MirabiButton
          className="mt-4"
          onClick={() => navigate(`/caracteres/${script}/practica`)}
        >
          Practicar {title}
        </MirabiButton>
      </MirabiCard>

      {groups.map((group) => (
        <section key={group} className="mb-6">
          <SectionTitle>{GROUP_LABEL[group]}</SectionTitle>
          <div className="grid grid-cols-5 gap-2">
            {characters
              .filter((character) => character.group === group)
              .map((character) => {
                const mastery = learningProgress[character.learningItemId]?.mastery ?? 'UNKNOWN'
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setSelected(character)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-[16px] transition active:scale-95 ${MASTERY_STYLE[mastery]}`}
                  >
                    <span className="font-jp text-2xl leading-none">{character.symbol}</span>
                    <span className="mt-1 text-[10px] opacity-80">{character.romaji}</span>
                  </button>
                )
              })}
          </div>
        </section>
      ))}

      {selected && (
        <CharacterSheet
          character={selected}
          mastery={learningProgress[selected.learningItemId]?.mastery ?? 'UNKNOWN'}
          onClose={() => setSelected(null)}
          onPractice={() => navigate(`/caracteres/${script}/practica`)}
        />
      )}
    </Screen>
  )
}

const MASTERY_LABEL: Record<MasteryScore, string> = {
  UNKNOWN: 'Sin practicar',
  FAMILIAR: 'Te suena',
  LEARNING: 'En aprendizaje',
  MASTERED: 'Dominado',
  EXPERT: 'Experto',
}

function CharacterSheet({
  character,
  mastery,
  onClose,
  onPractice,
}: {
  character: KanaCharacter
  mastery: MasteryScore
  onClose: () => void
  onPractice: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[28px] bg-[var(--surface)] p-6 sm:rounded-[28px] animate-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-jp text-6xl leading-none">{character.symbol}</p>
            <p className="mt-2 text-lg font-bold">{character.romaji}</p>
            <p className="text-xs text-[var(--on-surface-variant)]">{MASTERY_LABEL[mastery]}</p>
          </div>
          <div className="flex gap-2">
            {isSpeechAvailable() && (
              <button
                type="button"
                aria-label="Escuchar carácter"
                onClick={() => speakJapanese(character.symbol)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-container)]"
              >
                🔊
              </button>
            )}
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

        <SectionTitle>Ejemplos</SectionTitle>
        <ul className="flex flex-col gap-2">
          {character.examples.map((example) => (
            <li
              key={example.text}
              className="flex items-center justify-between rounded-[16px] bg-[var(--surface-variant)] px-4 py-3"
            >
              <div>
                <p className="font-jp text-lg">{example.text}</p>
                <p className="text-xs text-[var(--on-surface-variant)]">{example.romaji}</p>
              </div>
              <span className="text-sm">{example.meaning}</span>
            </li>
          ))}
        </ul>

        <MirabiButton className="mt-5" onClick={onPractice}>
          Practicar
        </MirabiButton>
      </div>
    </div>
  )
}
