import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { KanjiCharacter } from '../../core/content/types'
import { findKanji, kanjiByFrequency, kanjiByGrade, kanjiByJlptLevel } from '../../core/content/loader'
import type { MasteryScore } from '../../core/domain/models'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiDonutProgress,
  MirabiEmpty,
  MirabiFilterChips,
  MirabiLoading,
  MirabiProgressBar,
  MirabiSearchField,
  MirabiSheet,
  MirabiTabs,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { AudioButton } from '../lesson/ExerciseView'
import { MASTERY_LABEL, MASTERY_STYLE } from '../characters/masteryStyle'
import { useKanjiMastery, useKanjiMasteryByGrade } from './kanjiMastery'

/** Etiqueta del grado escolar: 1-6 son primaria, el 8 es el resto del jōyō. */
function gradeLabel(grade: number): string {
  return grade === 8 ? 'Resto del jōyō' : `Grado ${grade}`
}

/** Explorar «los mas frecuentes» sobre 2.136 solo dice algo si se acota; 300 alcanza y sobra. */
const FREQUENCY_DISPLAY_LIMIT = 300

type Mode = 'grado' | 'frecuencia' | 'jlpt'

export function KanjiScreen() {
  const navigate = useNavigate()
  const kanji = useMirabiStore((state) => state.kanji)
  const kanjiIndex = useMirabiStore((state) => state.kanjiIndex)
  const learningProgress = useMirabiStore((state) => state.learningProgress)
  const stats = useKanjiMastery()
  const statsByGrade = useKanjiMasteryByGrade()

  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<Mode>('grado')
  const [grade, setGrade] = useState<number | null>(null)
  const [jlpt, setJlpt] = useState<number | null>(null)
  const [selected, setSelected] = useState<KanjiCharacter | null>(null)

  // Un enlace desde la ficha de una palabra (?kanji=id) abre esa ficha al
  // llegar, en vez de dejar a la persona buscandolo en 2.136 entradas.
  useEffect(() => {
    const requested = params.get('kanji')
    if (!requested || !kanjiIndex) return
    const found = kanjiIndex.byId.get(requested)
    if (found) setSelected(found)
    setParams((current) => {
      current.delete('kanji')
      return current
    })
    // Solo al llegar o cuando el indice termina de cargar; no en cada tecleo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanjiIndex])

  if (!kanji || !kanjiIndex) {
    return (
      <Screen title="Kanji">
        <MirabiLoading message="Cargando el catálogo de kanji…" />
      </Screen>
    )
  }

  const activeGrade = grade ?? kanjiIndex.grades[0] ?? null
  const activeJlpt = jlpt ?? kanjiIndex.jlptLevels[0] ?? null
  const visible = query.trim()
    ? findKanji(kanji, query, kanjiIndex.romajiById)
    : mode === 'frecuencia'
      ? kanjiByFrequency(kanji, FREQUENCY_DISPLAY_LIMIT)
      : mode === 'jlpt'
        ? activeJlpt !== null
          ? kanjiByJlptLevel(kanji, activeJlpt)
          : []
        : activeGrade !== null
          ? kanjiByGrade(kanji, activeGrade)
          : []

  return (
    <Screen title="Kanji">
      <MirabiCard className="mb-5 p-5">
        <div className="flex items-center gap-5">
          <MirabiDonutProgress percentage={stats.percentage} />
          <div className="min-w-0">
            <p className="text-sm font-bold">Dominio general</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              {stats.mastered} de {stats.total} kanji dominados
            </p>
          </div>
        </div>
        <MirabiButton
          className="mt-4"
          onClick={() => {
            if (mode === 'frecuencia') navigate('/caracteres/kanji/practica?modo=frecuencia')
            else if (mode === 'jlpt' && activeJlpt !== null) {
              navigate(`/caracteres/kanji/practica?modo=jlpt&nivel=${activeJlpt}`)
            } else navigate(`/caracteres/kanji/practica?grado=${activeGrade ?? kanjiIndex.grades[0]}`)
          }}
        >
          {mode === 'frecuencia'
            ? 'Practicar más frecuentes'
            : mode === 'jlpt'
              ? `Practicar JLPT nivel ${activeJlpt ?? '—'}`
              : `Practicar ${gradeLabel(activeGrade ?? kanjiIndex.grades[0])}`}
        </MirabiButton>
        <MirabiButton
          className="mt-2"
          variant="secondary"
          onClick={() => navigate(`/caracteres/kanji/escritura?grado=${activeGrade ?? kanjiIndex.grades[0]}`)}
        >
          Practicar escritura
        </MirabiButton>
      </MirabiCard>

      {statsByGrade.length > 0 && (
        <MirabiCard className="mb-5 p-5">
          <p className="mb-3 text-sm font-bold">Progreso por grado</p>
          <div className="flex flex-col gap-2.5">
            {statsByGrade.map((grade) => (
              <div key={grade.grade}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="text-[var(--on-surface-variant)]">{gradeLabel(grade.grade)}</span>
                  <span className="font-semibold">
                    {grade.mastered}/{grade.total}
                  </span>
                </div>
                <MirabiProgressBar progress={grade.percentage / 100} />
              </div>
            ))}
          </div>
        </MirabiCard>
      )}

      <MirabiCard className="mb-3 p-5" onClick={() => navigate('/caracteres/kanji/confundibles')}>
        <p className="text-sm font-bold">Kanji que se confunden</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Practica pares que comparten radical, como 未 y 末.
        </p>
      </MirabiCard>

      <MirabiCard className="mb-3 p-5" onClick={() => navigate('/caracteres/kanji/radicales')}>
        <p className="text-sm font-bold">Explorar por radical</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Agrupa el jōyō por su componente compartido, en vez de por grado.
        </p>
      </MirabiCard>

      <MirabiCard className="mb-3 p-5" onClick={() => navigate('/caracteres/kanji/lectura')}>
        <p className="text-sm font-bold">Practicar lectura en contexto</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Cómo se lee cada kanji dentro de una palabra real, no aislado.
        </p>
      </MirabiCard>

      <MirabiCard className="mb-5 p-5" onClick={() => navigate('/caracteres/kanji/jukugo')}>
        <p className="text-sm font-bold">Practicar compuestos (熟語)</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          Dos kanji juntos forman una palabra nueva, como 友 + 達 = 友達.
        </p>
      </MirabiCard>

      <MirabiSearchField
        className="mb-3"
        label="Buscar kanji"
        placeholder="Buscar por símbolo, lectura o significado"
        value={query}
        onChange={setQuery}
      />

      {!query.trim() && (
        <>
          <MirabiTabs
            className="mb-3"
            ariaLabel="Ordenar por"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'grado', label: 'Grado' },
              { value: 'frecuencia', label: 'Frecuencia' },
              { value: 'jlpt', label: 'JLPT' },
            ]}
          />

          {mode === 'grado' && (
            <MirabiFilterChips
              className="mb-4"
              ariaLabel="Grado"
              value={activeGrade === null ? null : String(activeGrade)}
              onChange={(value) => setGrade(value === null ? null : Number(value))}
              options={kanjiIndex.grades.map((value) => ({
                value: String(value),
                label: gradeLabel(value),
              }))}
            />
          )}

          {mode === 'jlpt' && (
            <>
              <MirabiFilterChips
                className="mb-2"
                ariaLabel="Nivel JLPT"
                value={activeJlpt === null ? null : String(activeJlpt)}
                onChange={(value) => setJlpt(value === null ? null : Number(value))}
                options={kanjiIndex.jlptLevels.map((value) => ({
                  value: String(value),
                  label: `Nivel ${value}`,
                }))}
              />
              <p className="mb-4 text-xs text-[var(--on-surface-variant)]">
                Escala clásica de KANJIDIC2, incompleta y sin relación directa con los N5-N1 del JLPT
                actual: es orientativa, no una guía de examen.
              </p>
            </>
          )}
        </>
      )}

      {visible.length === 0 ? (
        <MirabiEmpty
          title="Sin resultados"
          message={
            query.trim()
              ? 'Prueba con otro símbolo, lectura o significado.'
              : mode === 'jlpt'
                ? 'Elige un nivel.'
                : 'Elige un grado.'
          }
        />
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {visible.map((item) => {
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
      )}

      {selected && (
        <KanjiSheet
          item={selected}
          mastery={learningProgress[selected.learningItemId]?.mastery ?? 'UNKNOWN'}
          romaji={kanjiIndex.romajiById.get(selected.id) ?? null}
          onClose={() => setSelected(null)}
        />
      )}
    </Screen>
  )
}

export function KanjiSheet({
  item,
  mastery,
  romaji,
  onClose,
}: {
  item: KanjiCharacter
  mastery: MasteryScore
  romaji: string | null
  onClose: () => void
}) {
  const wordIndex = useMirabiStore((state) => state.wordIndex)
  const words = item.wordIds
    .map((id) => wordIndex?.byId.get(id))
    .filter((word): word is NonNullable<typeof word> => word !== undefined)

  return (
    <MirabiSheet title={`Kanji ${item.symbol}, ${item.meanings[0]}`} onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-jp text-6xl leading-none">{item.symbol}</p>
          {romaji && <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{romaji}</p>}
          <p className="mt-2 text-sm font-semibold">{item.meanings.join(', ')}</p>
          {item.meaningsLanguage === 'EN' && (
            <p className="text-[11px] text-[var(--on-surface-variant)]">
              Sin traducción al español todavía.
            </p>
          )}
          <p className="text-xs text-[var(--on-surface-variant)]">{MASTERY_LABEL[mastery]}</p>
        </div>
        <div className="flex items-center gap-2">
          <AudioButton text={item.symbol} compact />
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

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Trazos</p>
          <p>{item.strokeCount}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Grado</p>
          <p>{gradeLabel(item.grade ?? 8)}</p>
        </div>
        {item.jlptLevel !== null && (
          <div>
            <p className="text-xs font-semibold text-[var(--on-surface-variant)]">JLPT (clásico)</p>
            <p>Nivel {item.jlptLevel}</p>
          </div>
        )}
        {item.radical && (
          <div className="col-span-2">
            <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Radical</p>
            <p className="font-jp">
              {item.radical.symbol}
              {item.radical.meaning ? ` · ${item.radical.meaning}` : ''}
            </p>
          </div>
        )}
      </div>

      {item.onyomi.length > 0 && (
        <>
          <SectionTitle>Lectura on'yomi</SectionTitle>
          <p className="font-jp text-lg">{item.onyomi.map((reading) => reading.kana).join('、')}</p>
        </>
      )}
      {item.kunyomi.length > 0 && (
        <>
          <SectionTitle>Lectura kun'yomi</SectionTitle>
          <p className="font-jp text-lg">{item.kunyomi.map((reading) => reading.kana).join('、')}</p>
        </>
      )}

      {words.length > 0 && (
        <>
          <SectionTitle>Palabras que lo usan</SectionTitle>
          <ul className="flex flex-col gap-2">
            {words.map((word) => (
              <li
                key={word.id}
                className="flex items-center justify-between rounded-[16px] bg-[var(--surface-variant)] px-4 py-3"
              >
                <div>
                  <p className="font-jp text-lg">{word.lemma}</p>
                  <p className="text-xs text-[var(--on-surface-variant)]">{word.romaji}</p>
                </div>
                <span className="text-sm">{word.meanings[0]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </MirabiSheet>
  )
}
