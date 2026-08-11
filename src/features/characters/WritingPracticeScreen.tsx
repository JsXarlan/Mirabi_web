import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import type { KanaGroup } from '../../core/content/types'
import { kanjiByGrade, loadKanaStrokeCatalog, loadKanjiStrokeCatalog } from '../../core/content/loader'
import { validateKanaStrokeCatalog, validateKanjiStrokeCatalog } from '../../core/content/validate'
import { yukiReaction } from '../../core/domain/yuki'
import {
  buildKanaWritingCard,
  buildKanjiWritingCard,
  buildYoonWritingCard,
  selectWritingSession,
  type WritingCard,
} from '../../core/domain/writingExercises'
import { yoonCombinationsByScript } from '../../core/domain/yoon'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiEmpty,
  MirabiError,
  MirabiFilterChips,
  MirabiLoading,
  MirabiStatChip,
  MirabiTabs,
} from '../../ui/components'
import { SessionScreen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { GROUP_LABEL, scriptFromSlug, titleOf } from './scriptSlug'
import { WritingCanvas } from './WritingCanvas'

const DEFAULT_KANJI_GRADE = 1

export function WritingPracticeScreen() {
  const { script } = useParams<{ script: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const scriptKey = scriptFromSlug(script)
  const isKanji = scriptKey === 'KANJI'
  const grade = Number(params.get('grado') ?? DEFAULT_KANJI_GRADE)
  const groupKey = (params.get('grupo') as KanaGroup | null) ?? null
  const setGroupKey = (group: KanaGroup | null) => {
    const next = new URLSearchParams(params)
    if (group) next.set('grupo', group)
    else next.delete('grupo')
    setParams(next, { replace: true })
  }

  const catalog = useMirabiStore((state) => state.catalog)
  const kanji = useMirabiStore((state) => state.kanji)
  const kanaStrokes = useMirabiStore((state) => state.kanaStrokes)
  const kanjiStrokes = useMirabiStore((state) => state.kanjiStrokes)
  const setKanaStrokeCatalog = useMirabiStore((state) => state.setKanaStrokeCatalog)
  const setKanjiStrokeCatalog = useMirabiStore((state) => state.setKanjiStrokeCatalog)
  const masteryOf = useMirabiStore((state) => state.masteryOf)
  const completeWritingPractice = useMirabiStore((state) => state.completeWritingPractice)
  const writingFontStyle = useMirabiStore((state) => state.writingFontStyle)
  const setWritingFontStyle = useMirabiStore((state) => state.setWritingFontStyle)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (isKanji) {
      if (kanjiStrokes) return
      let cancelled = false
      setLoadError(null)
      loadKanjiStrokeCatalog()
        .then((strokes) => {
          if (cancelled) return
          const check = validateKanjiStrokeCatalog(strokes, kanji)
          if (!check.ok) {
            setLoadError(check.errors.join(' '))
            return
          }
          setKanjiStrokeCatalog(strokes)
        })
        .catch((error: unknown) => {
          if (!cancelled) setLoadError(error instanceof Error ? error.message : 'No se pudo cargar.')
        })
      return () => {
        cancelled = true
      }
    }

    if (kanaStrokes) return
    let cancelled = false
    setLoadError(null)
    loadKanaStrokeCatalog()
      .then((strokes) => {
        if (cancelled) return
        const check = validateKanaStrokeCatalog(strokes, catalog)
        if (!check.ok) {
          setLoadError(check.errors.join(' '))
          return
        }
        setKanaStrokeCatalog(strokes)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'No se pudo cargar.')
      })
    return () => {
      cancelled = true
    }
  }, [
    isKanji,
    kanaStrokes,
    kanjiStrokes,
    catalog,
    kanji,
    setKanaStrokeCatalog,
    setKanjiStrokeCatalog,
    reloadToken,
  ])

  // Grupos con caracteres en este script, para la fila de chips. Kanji no tiene grupos, usa grado.
  const availableGroups = useMemo(() => {
    if (isKanji || scriptKey === null || !catalog) return []
    return [
      ...new Set(
        catalog.characters.filter((character) => character.script === scriptKey).map((character) => character.group),
      ),
    ]
  }, [catalog, scriptKey, isKanji])

  const cards = useMemo(() => {
    if (scriptKey === null) return []
    if (isKanji) {
      if (!kanji || !kanjiStrokes) return []
      return selectWritingSession(kanjiByGrade(kanji, grade), masteryOf)
        .map((item) => buildKanjiWritingCard(item, kanjiStrokes.strokes))
        .filter((card): card is WritingCard => card !== null)
    }
    if (!catalog || !kanaStrokes) return []

    // Yoon no tiene trazos propios: se arma como el par de un kana base + un kana chico.
    if (groupKey === 'COMBINATIONS') {
      const items = yoonCombinationsByScript(scriptKey).map((combo) => ({
        ...combo,
        learningItemId: combo.id,
      }))
      return selectWritingSession(items, masteryOf)
        .map((combo) => buildYoonWritingCard(combo, catalog, kanaStrokes.strokes))
        .filter((card): card is WritingCard => card !== null)
    }

    const characters = catalog.characters.filter(
      (character) => character.script === scriptKey && (groupKey === null || character.group === groupKey),
    )
    return selectWritingSession(characters, masteryOf)
      .map((character) => buildKanaWritingCard(character, kanaStrokes.strokes))
      .filter((card): card is WritingCard => card !== null)
    // Se arma una sola vez por sesion: rebarajar a media practica seria confuso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, kanaStrokes, kanji, kanjiStrokes, scriptKey, isKanji, grade, groupKey])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [tally, setTally] = useState({ correct: 0, wrong: 0 })
  const [results, setResults] = useState<{ learningItemId: string; gotIt: boolean }[]>([])
  const [finished, setFinished] = useState(false)

  // Cambiar de grupo arma una sesion nueva: si no se reinicia, el indice queda
  // apuntando a una tarjeta de la sesion anterior.
  useEffect(() => {
    setCurrentIndex(0)
    setTally({ correct: 0, wrong: 0 })
    setResults([])
    setFinished(false)
  }, [groupKey])

  const fontStyleToggle = (
    <MirabiTabs
      className="mb-3"
      value={writingFontStyle}
      onChange={setWritingFontStyle}
      options={[
        { value: 'digital', label: 'Digital' },
        { value: 'traditional', label: 'Tradicional' },
      ]}
    />
  )

  const groupSelector = availableGroups.length > 0 && (
    <MirabiFilterChips
      className="mb-5"
      ariaLabel="Grupo a practicar"
      allLabel="Todos"
      value={groupKey}
      onChange={setGroupKey}
      options={availableGroups.map((group) => ({ value: group, label: GROUP_LABEL[group] }))}
    />
  )

  const card = cards[currentIndex]
  const isLastStep = currentIndex === cards.length - 1
  const title = scriptKey ? `Escritura · ${titleOf(scriptKey)}` : 'Escritura'
  const exit = () => navigate(scriptKey ? `/caracteres/${script}` : '/caracteres')

  const rate = (gotIt: boolean) => {
    if (!card) return
    setResults((previous) => [...previous, { learningItemId: card.learningItemId, gotIt }])
    setTally((previous) => ({
      correct: previous.correct + (gotIt ? 1 : 0),
      wrong: previous.wrong + (gotIt ? 0 : 1),
    }))
    if (isLastStep) {
      completeWritingPractice([...results, { learningItemId: card.learningItemId, gotIt }])
      setFinished(true)
      return
    }
    setCurrentIndex((value) => value + 1)
  }

  if (scriptKey === null) {
    return (
      <SessionScreen title="Escritura" progress={0} onExit={() => navigate('/caracteres')}>
        <MirabiEmpty
          title="Aquí todavía no hay nada"
          message="Ese sistema de escritura no existe."
          action={
            <MirabiButton className="mt-4" onClick={() => navigate('/caracteres')}>
              Volver a Caracteres
            </MirabiButton>
          }
        />
      </SessionScreen>
    )
  }

  if (loadError) {
    return (
      <SessionScreen title={title} progress={0} onExit={exit}>
        <MirabiError
          message={loadError}
          onRetry={() => {
            setLoadError(null)
            setReloadToken((value) => value + 1)
          }}
        />
      </SessionScreen>
    )
  }

  if ((isKanji && (!kanji || !kanjiStrokes)) || (!isKanji && !kanaStrokes)) {
    return (
      <SessionScreen title={title} progress={0} onExit={exit}>
        <MirabiLoading message="Preparando los trazos…" />
      </SessionScreen>
    )
  }

  if (finished) {
    const total = tally.correct + tally.wrong
    const accuracy = total === 0 ? 0 : (tally.correct * 100) / total
    const reaction = yukiReaction(accuracy >= 80 ? 'HIGH_ACCURACY' : 'LOW_ACCURACY')

    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="animate-pop flex flex-col items-center gap-3 text-center">
          <Yuki size={110} state={reaction.state} />
          <h1 className="text-2xl font-bold">Práctica completada</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{reaction.text}</p>
        </div>
        <div className="mt-6 flex gap-2">
          <MirabiStatChip icon="✅" value={tally.correct} label="Te salieron" />
          <MirabiStatChip icon="✏️" value={tally.wrong} label="A repasar" />
          <MirabiStatChip icon="🎯" value={`${Math.round(accuracy)}%`} label="Precisión" />
        </div>
        <MirabiButton className="mt-6" onClick={exit}>
          Continuar
        </MirabiButton>
      </div>
    )
  }

  if (cards.length === 0 || !card) {
    return (
      <SessionScreen title={title} progress={0} onExit={exit}>
        {fontStyleToggle}
        {groupSelector}
        <MirabiError
          title="Todavía no hay trazos disponibles"
          message="Este sistema de escritura no tiene datos de trazo cargados."
          onRetry={exit}
        />
      </SessionScreen>
    )
  }

  return (
    <SessionScreen title={title} progress={currentIndex / cards.length} onExit={exit} hint="Trazá y autoevaluate">
      {fontStyleToggle}
      {groupSelector}
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="mb-4 text-sm text-[var(--on-surface-variant)]">
          Escribí <span className="font-jp text-base font-bold">{card.prompt}</span> en el recuadro
        </p>
        <WritingCanvas card={card} fontStyle={writingFontStyle} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2.5">
        <MirabiButton variant="secondary" onClick={() => rate(false)}>
          No lo tengo
        </MirabiButton>
        <MirabiButton onClick={() => rate(true)}>¡Lo tengo!</MirabiButton>
      </div>
    </SessionScreen>
  )
}
