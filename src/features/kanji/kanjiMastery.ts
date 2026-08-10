import { kanjiByGrade } from '../../core/content/loader'
import { MASTERY_VALUE } from '../../core/domain/models'
import { useMirabiStore } from '../../core/store/useMirabiStore'

/**
 * Dominio medio del jōyō completo. Hermano de useScriptMastery: misma forma,
 * otra fuente, porque el catalogo de kanji vive aparte del de kana.
 *
 * Vive en su propio fichero, no en KanjiScreen.tsx: CharactersScreen lo usa
 * para el resumen de la biblioteca, y si importara el hook desde la pantalla
 * completa, Vite no podria separar KanjiScreen en su propio chunk al cargarla
 * con React.lazy.
 */
export function useKanjiMastery(): { total: number; mastered: number; percentage: number } {
  const kanji = useMirabiStore((state) => state.kanji)
  const learningProgress = useMirabiStore((state) => state.learningProgress)

  const items = kanji?.kanji ?? []
  if (items.length === 0) return { total: 0, mastered: 0, percentage: 0 }

  let sum = 0
  let mastered = 0
  for (const item of items) {
    const mastery = learningProgress[item.learningItemId]?.mastery ?? 'UNKNOWN'
    sum += MASTERY_VALUE[mastery]
    if (mastery === 'MASTERED' || mastery === 'EXPERT') mastered += 1
  }

  return { total: items.length, mastered, percentage: sum / items.length }
}

export interface GradeMastery {
  grade: number
  total: number
  mastered: number
  percentage: number
}

/** Igual que useKanjiMastery pero desglosado por grado, para el resumen de la pantalla. */
export function useKanjiMasteryByGrade(): GradeMastery[] {
  const kanji = useMirabiStore((state) => state.kanji)
  const kanjiIndex = useMirabiStore((state) => state.kanjiIndex)
  const learningProgress = useMirabiStore((state) => state.learningProgress)

  if (!kanji || !kanjiIndex) return []

  return kanjiIndex.grades.map((grade) => {
    const items = kanjiByGrade(kanji, grade)
    let sum = 0
    let mastered = 0
    for (const item of items) {
      const mastery = learningProgress[item.learningItemId]?.mastery ?? 'UNKNOWN'
      sum += MASTERY_VALUE[mastery]
      if (mastery === 'MASTERED' || mastery === 'EXPERT') mastered += 1
    }
    return {
      grade,
      total: items.length,
      mastered,
      percentage: items.length === 0 ? 0 : sum / items.length,
    }
  })
}
