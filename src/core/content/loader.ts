import type {
  CharacterCatalog,
  CoursePack,
  KanaCharacter,
  KanaStrokeCatalog,
  KanjiCatalog,
  KanjiCharacter,
  VocabularyWord,
  WordCatalog,
} from './types'
import { toRomaji } from '../domain/romaji'

/**
 * Carga del contenido versionado. Equivalente web de CourseContentLoader:
 * el contenido vive fuera del bundle para poder regenerarlo desde Kotlin
 * sin recompilar la app.
 */

const base = import.meta.env.BASE_URL

let coursePromise: Promise<CoursePack> | null = null
let charactersPromise: Promise<CharacterCatalog> | null = null
let wordsPromise: Promise<WordCatalog> | null = null
let kanjiPromise: Promise<KanjiCatalog> | null = null
let kanaStrokesPromise: Promise<KanaStrokeCatalog> | null = null

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${base}content/${path}`)
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path} (${response.status})`)
  }
  return (await response.json()) as T
}

export function loadCoursePack(): Promise<CoursePack> {
  coursePromise ??= fetchJson<CoursePack>('course.json')
  return coursePromise
}

export function loadCharacterCatalog(): Promise<CharacterCatalog> {
  charactersPromise ??= fetchJson<CharacterCatalog>('characters.json')
  return charactersPromise
}

export interface CourseIndex {
  pack: CoursePack
  worldById: Map<string, CoursePack['worlds'][number]>
  unitById: Map<string, CoursePack['units'][number]>
  lessonById: Map<string, CoursePack['lessons'][number]>
  /** Lecciones en orden de curso: mundo -> unidad -> leccion. */
  orderedLessonIds: string[]
}

export function buildCourseIndex(pack: CoursePack): CourseIndex {
  const worldById = new Map(pack.worlds.map((world) => [world.id, world]))
  const unitById = new Map(pack.units.map((unit) => [unit.id, unit]))
  const lessonById = new Map(pack.lessons.map((lesson) => [lesson.id, lesson]))

  const orderedLessonIds: string[] = []
  for (const world of pack.worlds) {
    for (const unitId of world.unitIds) {
      const unit = unitById.get(unitId)
      if (!unit) continue
      for (const lessonId of unit.lessonIds) {
        if (lessonById.has(lessonId)) orderedLessonIds.push(lessonId)
      }
    }
  }

  return { pack, worldById, unitById, lessonById, orderedLessonIds }
}

export function charactersByScript(
  catalog: CharacterCatalog,
  script: KanaCharacter['script'],
): KanaCharacter[] {
  return catalog.characters.filter((character) => character.script === script)
}

/*
 * Acceso a palabras y kanji.
 *
 * Regla sin excepciones: ninguna pantalla recorre `catalog.words` ni
 * `catalog.kanji` por su cuenta, todo entra por aqui. Con doscientas palabras
 * da igual, pero el dia que el catalogo venga de un diccionario externo habra
 * que cambiar el almacenamiento por uno indexado, y esa mudanza tiene que caber
 * dentro de este fichero en vez de repartirse por la interfaz.
 */

export function loadWordCatalog(): Promise<WordCatalog> {
  wordsPromise ??= fetchJson<WordCatalog>('words.json')
  return wordsPromise
}

export function loadKanjiCatalog(): Promise<KanjiCatalog> {
  kanjiPromise ??= fetchJson<KanjiCatalog>('kanji.json')
  return kanjiPromise
}

/** Solo la pide quien entra a practicar escritura: no vale la pena prewarmearla. */
export function loadKanaStrokeCatalog(): Promise<KanaStrokeCatalog> {
  kanaStrokesPromise ??= fetchJson<KanaStrokeCatalog>('kana-strokes.json')
  return kanaStrokesPromise
}

export function wordsByScript(
  catalog: WordCatalog,
  script: VocabularyWord['script'],
): VocabularyWord[] {
  return catalog.words.filter((word) => word.script === script)
}

/**
 * Busca por lo que la persona puede llegar a escribir: el japones, la lectura,
 * el romaji o el significado. Sin normalizar acentos a proposito, porque el
 * contenido se escribe sin ellos.
 */
export function findWords(catalog: WordCatalog, query: string): VocabularyWord[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return catalog.words

  return catalog.words.filter(
    (word) =>
      word.lemma.includes(needle) ||
      word.kana.includes(needle) ||
      word.romaji.toLowerCase().includes(needle) ||
      word.meanings.some((meaning) => meaning.toLowerCase().includes(needle)),
  )
}

/**
 * KANJIDIC2 marca la okurigana con un punto (ひと.つ) y la posicion de los
 * afijos con guiones (-び). Son utiles al leerlas, pero estorban para
 * transcribirlas o para buscar.
 */
export function cleanReading(kana: string): string {
  return kana.replaceAll('.', '').replaceAll('-', '')
}

export function findKanji(
  catalog: KanjiCatalog,
  query: string,
  /** Romaji derivado por lectura; KANJIDIC2 no lo trae. Ver buildKanjiIndex. */
  romajiById: Map<string, string> | null = null,
): KanjiCharacter[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return catalog.kanji

  return catalog.kanji.filter(
    (item) =>
      item.symbol.includes(needle) ||
      item.meanings.some((meaning) => meaning.toLowerCase().includes(needle)) ||
      [...item.onyomi, ...item.kunyomi].some(
        (reading) =>
          cleanReading(reading.kana).includes(needle) ||
          (reading.romaji?.toLowerCase().includes(needle) ?? false),
      ) ||
      (romajiById?.get(item.id)?.includes(needle) ?? false),
  )
}

export interface WordIndex {
  byId: Map<string, VocabularyWord>
  /** Por el id que comparte con el curso: es el que trae un item de repaso. */
  byLearningItemId: Map<string, VocabularyWord>
}

export function buildWordIndex(catalog: WordCatalog): WordIndex {
  return {
    byId: new Map(catalog.words.map((word) => [word.id, word])),
    byLearningItemId: new Map(catalog.words.map((word) => [word.learningItemId, word])),
  }
}

export interface KanjiIndex {
  byId: Map<string, KanjiCharacter>
  bySymbol: Map<string, KanjiCharacter>
  /** Grados presentes, ordenados; el 8 (resto del joyo) queda al final. */
  grades: number[]
  /**
   * Lecturas transcritas, para poder buscar «yama» y encontrar 山.
   *
   * KANJIDIC2 solo da kana, y la tabla para transcribirlo ya vive en esta app;
   * duplicarla en Kotlin habria sido mantener dos. Se calcula una vez al cargar
   * el catalogo en vez de en cada pulsacion del buscador.
   */
  romajiById: Map<string, string>
}

export function buildKanjiIndex(
  catalog: KanjiCatalog,
  characters: CharacterCatalog | null = null,
): KanjiIndex {
  const grades = [...new Set(catalog.kanji.map((item) => item.grade))]
    .filter((grade): grade is number => grade !== null)
    .sort((a, b) => a - b)

  const romajiById = new Map<string, string>()
  if (characters) {
    for (const item of catalog.kanji) {
      const transcritas = [...item.onyomi, ...item.kunyomi]
        .map((reading) => toRomaji(cleanReading(reading.kana), characters))
        .filter((romaji): romaji is string => romaji !== null)
      if (transcritas.length > 0) romajiById.set(item.id, transcritas.join(' ').toLowerCase())
    }
  }

  return {
    byId: new Map(catalog.kanji.map((item) => [item.id, item])),
    bySymbol: new Map(catalog.kanji.map((item) => [item.symbol, item])),
    grades,
    romajiById,
  }
}

export function kanjiByGrade(catalog: KanjiCatalog, grade: number): KanjiCharacter[] {
  return catalog.kanji.filter((item) => item.grade === grade)
}
