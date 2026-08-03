import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import type { KanaCharacter, KanaGroup } from '../../core/content/types'
import type { MasteryScore } from '../../core/domain/models'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiEmpty,
  MirabiProgressBar,
  MirabiSheet,
  MirabiTabs,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { AudioButton } from '../lesson/ExerciseView'
import { useScriptMastery } from './CharactersScreen'
import { MASTERY_LABEL, MASTERY_STYLE } from './masteryStyle'
import { scriptFromSlug, slugOf, titleOf } from './scriptSlug'
import { WordsTab } from './WordsTab'

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

type Tab = 'caracteres' | 'palabras'

export function CharacterScriptScreen() {
  const { script } = useParams<{ script: string }>()
  const navigate = useNavigate()
  const catalog = useMirabiStore((state) => state.catalog)
  const learningProgress = useMirabiStore((state) => state.learningProgress)

  // En la query, no en estado local: asi la pestana activa sobrevive a
  // recargar y se puede enlazar directamente a /caracteres/hiragana?tab=palabras.
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'palabras' ? 'palabras' : 'caracteres'
  const setTab = (next: Tab) => {
    setParams(next === 'palabras' ? { tab: 'palabras' } : {}, { replace: true })
  }

  const scriptKey = scriptFromSlug(script)
  const title = scriptKey ? titleOf(scriptKey) : 'Caracteres'
  // El hook se llama siempre, tambien con slug desconocido: las reglas de los
  // hooks no admiten saltarselo, y sin caracteres devuelve ceros.
  const stats = useScriptMastery(scriptKey ?? 'HIRAGANA')

  const [selected, setSelected] = useState<KanaCharacter | null>(null)

  const characters =
    scriptKey === null ? [] : (catalog?.characters.filter((item) => item.script === scriptKey) ?? [])
  const groups = [...new Set(characters.map((item) => item.group))]

  // Un slug desconocido corta siempre; la falta de caracteres solo cuando el
  // catalogo ya esta cargado, para no confundir «vacio» con «cargando».
  if (scriptKey === null || (catalog && characters.length === 0)) {
    return (
      <Screen title={title}>
        <MirabiEmpty
          title="Aquí todavía no hay nada"
          message={
            scriptKey === null
              ? 'Ese sistema de escritura no existe.'
              : `Todavía no hay caracteres de ${title} en el catálogo.`
          }
          action={
            <MirabiButton className="mt-4" onClick={() => navigate('/caracteres')}>
              Volver a Caracteres
            </MirabiButton>
          }
        />
      </Screen>
    )
  }

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
          onClick={() => navigate(`/caracteres/${slugOf(scriptKey)}/practica`)}
        >
          Practicar {title}
        </MirabiButton>
      </MirabiCard>

      <MirabiTabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'caracteres', label: 'Caracteres' },
          { value: 'palabras', label: 'Palabras' },
        ]}
      />

      {tab === 'caracteres' ? (
        groups.map((group) => (
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
        ))
      ) : (
        <WordsTab
          script={scriptKey}
          onOpenCharacter={(characterId) => {
            const character = catalog?.characters.find((item) => item.id === characterId)
            if (character) setSelected(character)
          }}
        />
      )}

      {/*
        Fuera del condicional de pestanas a proposito: abrir un carácter desde
        un chip de la pestana Palabras tiene que mostrar su ficha aunque la
        pestana activa siga siendo «Palabras».
      */}
      {selected && (
        <CharacterSheet
          character={selected}
          mastery={learningProgress[selected.learningItemId]?.mastery ?? 'UNKNOWN'}
          onClose={() => setSelected(null)}
          onPractice={() => navigate(`/caracteres/${slugOf(scriptKey)}/practica`)}
        />
      )}
    </Screen>
  )
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
    <MirabiSheet title={`Carácter ${character.symbol}, ${character.romaji}`} onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-jp text-6xl leading-none">{character.symbol}</p>
          <p className="mt-2 text-lg font-bold">{character.romaji}</p>
          <p className="text-xs text-[var(--on-surface-variant)]">{MASTERY_LABEL[mastery]}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* AudioButton y no un boton propio: respeta el ajuste de audio y la
              carga tardia de las voces, que el de aqui se saltaba. */}
          <AudioButton text={character.symbol} compact />
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
    </MirabiSheet>
  )
}
