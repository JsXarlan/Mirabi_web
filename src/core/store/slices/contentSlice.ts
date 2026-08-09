import type { StateCreator } from 'zustand'

import type { CharacterCatalog, CoursePack, KanjiCatalog, WordCatalog } from '../../content/types'
import {
  buildCourseIndex,
  buildKanjiIndex,
  buildWordIndex,
  type CourseIndex,
  type KanjiIndex,
  type WordIndex,
} from '../../content/loader'
import { buildItemLabels, type ItemLabel } from '../../domain/labels'
import { buildCourseMap, type CourseMap } from '../../domain/course'
import type { MirabiStore } from '../useMirabiStore'

/**
 * Contenido cargado y sus indices derivados: el pack del curso, los catalogos
 * de caracteres/palabras/kanji y las etiquetas que resuelven un id a su texto.
 * Equivalente al RuntimeState original, ahora aislado del resto del store.
 */
export interface ContentSlice {
  pack: CoursePack | null
  catalog: CharacterCatalog | null
  index: CourseIndex | null
  labels: Map<string, ItemLabel> | null
  contentError: string | null
  /*
   * Palabras y kanji llegan despues del arranque y pueden no llegar: son un
   * complemento, no el curso. Por eso su fallo va a contentWarning y no a
   * contentError, que apaga la app entera.
   */
  words: WordCatalog | null
  kanji: KanjiCatalog | null
  wordIndex: WordIndex | null
  kanjiIndex: KanjiIndex | null
  contentWarning: string | null

  setContent: (pack: CoursePack, catalog: CharacterCatalog) => void
  setContentError: (message: string) => void
  setWordCatalog: (words: WordCatalog) => void
  setKanjiCatalog: (kanji: KanjiCatalog) => void
  setContentWarning: (message: string) => void

  courseMap: () => CourseMap | null
}

/**
 * Cache del mapa de curso. Reconstruirlo cuesta 30 unidades y 78 nodos, y las
 * pantallas lo piden en cada render: con la pareja (pack, lessonProgress) basta
 * para saber que nada ha cambiado.
 */
let courseMapCache: { pack: CoursePack; progress: unknown; map: CourseMap } | null = null

export const createContentSlice: StateCreator<MirabiStore, [], [], ContentSlice> = (set, get) => ({
  pack: null,
  catalog: null,
  index: null,
  labels: null,
  contentError: null,
  words: null,
  kanji: null,
  wordIndex: null,
  kanjiIndex: null,
  contentWarning: null,

  setContent: (pack, catalog) => {
    const state = get()
    set({
      pack,
      catalog,
      index: buildCourseIndex(pack),
      labels: buildItemLabels(pack, catalog, state.words, state.kanji),
      contentError: null,
    })
  },
  setContentError: (message) => set({ contentError: message }),

  // Los catalogos llegan tras el curso, asi que al entrar hay que rehacer
  // las etiquetas: sin eso las palabras seguirian mostrandose por su id.
  setWordCatalog: (words) => {
    const state = get()
    set({
      words,
      wordIndex: buildWordIndex(words),
      labels: state.pack
        ? buildItemLabels(state.pack, state.catalog, words, state.kanji)
        : state.labels,
    })
  },
  setKanjiCatalog: (kanji) => {
    const state = get()
    set({
      kanji,
      // Con el catalogo de caracteres, para poder transcribir las lecturas.
      kanjiIndex: buildKanjiIndex(kanji, state.catalog),
      labels: state.pack
        ? buildItemLabels(state.pack, state.catalog, state.words, kanji)
        : state.labels,
    })
  },
  setContentWarning: (message) => set({ contentWarning: message }),

  courseMap: () => {
    const { pack, lessonProgress } = get()
    if (!pack) return null
    if (courseMapCache?.pack === pack && courseMapCache.progress === lessonProgress) {
      return courseMapCache.map
    }
    const map = buildCourseMap(pack.worlds, pack.units, pack.lessons, Object.values(lessonProgress))
    courseMapCache = { pack, progress: lessonProgress, map }
    return map
  },
})
