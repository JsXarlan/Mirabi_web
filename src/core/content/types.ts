/**
 * Espejo en TypeScript de core/content/model del proyecto Android.
 * El JSON lo genera ContentJsonExportTest desde el DSL de Kotlin, asi que estos
 * tipos tienen que seguir a ContentStructure.kt / ContentTypes.kt y no al reves.
 */

export type ExerciseType =
  | 'MULTIPLE_CHOICE'
  | 'MATCHING'
  | 'AUDIO_RECOGNITION'
  | 'AUDIO_SELECTION'
  | 'ORDER_SENTENCE'
  | 'FILL_BLANK'
  | 'CONVERSATION_RESPONSE'
  | 'LISTENING_COMPREHENSION'
  | 'WRITING'
  | 'PRESENTATION'

export type ContentItemType =
  | 'KANA'
  | 'KANJI'
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'LISTENING'
  | 'CONVERSATION'

export type LearningItemType = ContentItemType

export type ContentReferenceType =
  | 'KANA'
  | 'VOCABULARY'
  | 'GRAMMAR'
  | 'AUDIO'
  | 'FEEDBACK'
  | 'CHECKPOINT'

export type LessonType =
  | 'CONCEPT_INTRO'
  | 'AUDIO_INTRO'
  | 'KANA_INTRO'
  | 'VOCABULARY_PRACTICE'
  | 'GRAMMAR_INTRO'
  | 'PRACTICE'
  | 'INTERNAL_MINI_CHECK'
  | 'VISIBLE_CHECKPOINT'
  | 'PREVIEW'

export type CheckpointKind =
  | 'NONE'
  | 'INTERNAL_MINI_CHECK'
  | 'VISIBLE_WORLD_CHECKPOINT'
  | 'NON_BLOCKING_CLOSE'

export type RomajiPolicy =
  | 'NONE'
  | 'VISIBLE_FIRST_EXPOSURE'
  | 'HIDE_BY_MASTERY'
  | 'SHOW_AFTER_ERROR'
  | 'SPECIAL_PARTICLE_READING'

export type SrsCategory =
  | 'NONE'
  | 'KANA'
  | 'CORE_VOCABULARY'
  | 'FUNCTIONAL'
  | 'GRAMMAR'
  | 'READING_SEED_LIGHT'

export type ContentCategory =
  | 'CORE'
  | 'READING_SEED'
  | 'FUNCTIONAL'
  | 'EXPOSURE'
  | 'FUTURE_SEED'

export type DifficultyLevel = 'BEGINNER' | 'ELEMENTARY' | 'INTERMEDIATE'

export type MistakeType =
  | 'WRONG_MEANING'
  | 'WRONG_READING'
  | 'WRONG_AUDIO'
  | 'WRONG_GRAMMAR'
  | 'WRONG_ORDER'
  | 'WRONG_CONVERSATION_RESPONSE'

export interface ContentItemRef {
  type: ContentReferenceType
  id: string
}

export interface ContentExerciseOption {
  id: string
  text: string
  distractorReason: string | null
  referencedItemId: string | null
}

export interface ContentObjective {
  id: string
  description: string
}

export interface ContentExercise {
  id: string
  type: ExerciseType
  difficulty: DifficultyLevel
  prompt: string
  body: string | null
  correctAnswer: string | null
  learningItemId: string
  learningItemType: ContentItemType
  mistakeType: MistakeType | null
  errorType: string
  feedbackId: string | null
  audioNormalId: string | null
  audioSlowId: string | null
  audioText: string | null
  srsCategory: SrsCategory
  contentCategory: ContentCategory | null
  appearsInCheckpoint: boolean
  entersSrs: boolean
  isPreviewOnly: boolean
  isEvaluable: boolean
  tags: string[]
  criticalTags: string[]
  referencedItems: ContentItemRef[]
  options: ContentExerciseOption[]
}

export interface ContentLesson {
  id: string
  unitId: string
  title: string
  difficulty: DifficultyLevel
  lessonType: LessonType
  checkpointKind: CheckpointKind
  romajiPolicy: RomajiPolicy
  isPreviewOnly: boolean
  isEvaluable: boolean
  tags: string[]
  objectives: ContentObjective[]
  introducedItems: ContentItemRef[]
  reinforcedItems: ContentItemRef[]
  prerequisites: ContentItemRef[]
  exercises: ContentExercise[]
}

export interface ContentUnit {
  id: string
  worldId: string
  title: string
  lessonIds: string[]
}

export interface ContentWorld {
  id: string
  title: string
  tags: string[]
  unitIds: string[]
}

export interface CoursePack {
  packId: string
  version: string
  schemaVersion: number
  checksum: string
  worlds: ContentWorld[]
  units: ContentUnit[]
  lessons: ContentLesson[]
}

export type CharacterScript = 'HIRAGANA' | 'KATAKANA' | 'KANJI'

export type KanaGroup =
  | 'VOWELS'
  | 'K'
  | 'S'
  | 'T'
  | 'N'
  | 'H'
  | 'M'
  | 'Y'
  | 'R'
  | 'W'
  | 'DAKUTEN'
  | 'COMBINATIONS'
  | 'BASIC_KATAKANA'

export interface CharacterExample {
  text: string
  romaji: string
  meaning: string
}

export interface KanaCharacter {
  id: string
  symbol: string
  romaji: string
  script: CharacterScript
  group: KanaGroup
  learningItemId: string
  learningItemType: LearningItemType
  examples: CharacterExample[]
}

export interface CharacterCatalog {
  schemaVersion: number
  version: string
  checksum: string
  characters: KanaCharacter[]
}

/** Espejo de VocabularyModels.kt y KanjiModels.kt. */

export type WordSource = 'MIRABI' | 'JMDICT'
export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
export type MeaningLanguage = 'ES' | 'EN'

export interface VocabularyWord {
  id: string
  /** El mismo id que usa el curso: el progreso de la biblioteca y el suyo son uno. */
  learningItemId: string
  /** Forma escrita canonica: el kanji si lo lleva, el kana si no. */
  lemma: string
  kana: string
  romaji: string
  meanings: string[]
  /** HIRAGANA o KATAKANA. Decide en que apartado aparece la palabra. */
  script: CharacterScript
  learningItemType: ContentItemType
  partOfSpeech: string | null
  jlptLevel: JlptLevel | null
  tags: string[]
  kanaCharacterIds: string[]
  kanjiIds: string[]
  audioText: string | null
  source: WordSource
  sourceRef: string | null
  license: string | null
}

export interface WordCatalog {
  schemaVersion: number
  version: string
  checksum: string
  words: VocabularyWord[]
}

export interface KanjiReading {
  kana: string
  romaji: string
}

export interface KanjiRadical {
  symbol: string
  meaning: string
}

export interface KanjiCharacter {
  id: string
  symbol: string
  learningItemId: string
  meanings: string[]
  /** Si es EN, el significado no tenia traduccion y se cayo al ingles. */
  meaningsLanguage: MeaningLanguage
  onyomi: KanjiReading[]
  kunyomi: KanjiReading[]
  strokeCount: number
  radical: KanjiRadical | null
  /** Grado escolar: 1-6 kyoiku, 8 el resto del joyo. Es lo que agrupa la pantalla. */
  grade: number | null
  frequencyRank: number | null
  /** Escala antigua de KANJIDIC2, de 4 niveles e incompleta. Dato, no estructura. */
  jlptLevel: number | null
  learningItemType: ContentItemType
  /** Palabras que lo usan; lo deriva el exportador. */
  wordIds: string[]
  source: WordSource
  sourceRef: string | null
  license: string | null
}

export interface KanjiCatalog {
  schemaVersion: number
  version: string
  checksum: string
  kanji: KanjiCharacter[]
}

/** El ejercicio de exposicion no se responde: solo se lee y se continua. */
export const isTeachingExercise = (exercise: ContentExercise): boolean =>
  exercise.type === 'PRESENTATION' || !exercise.isEvaluable

/** Tipos que AnswerValidator sabe corregir (DefaultAnswerValidator.SUPPORTED_TYPES). */
export const ANSWERABLE_TYPES: ReadonlySet<ExerciseType> = new Set<ExerciseType>([
  'MULTIPLE_CHOICE',
  'AUDIO_SELECTION',
  'FILL_BLANK',
  'ORDER_SENTENCE',
  'CONVERSATION_RESPONSE',
])

/**
 * WRITING no esta soportado en el MVP y los pasos de preview no puntuan,
 * asi que se filtran antes de construir la sesion (Runtime_Exercise_Compatibility_v1).
 */
export const isRuntimeCompatible = (exercise: ContentExercise): boolean => {
  if (exercise.type === 'WRITING') return false
  if (exercise.isPreviewOnly) return false
  if (isTeachingExercise(exercise)) return true
  return ANSWERABLE_TYPES.has(exercise.type) && exercise.correctAnswer !== null
}
