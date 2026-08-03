/**
 * Puente de identificadores de kana, equivalente a CourseKanaCharacterIdMapper.
 *
 * El curso nombra los kana `kana_hira_a` y el catalogo `kana-hiragana-a`. Sin
 * traducir entre ambos, practicar hiragana en una leccion no mueve ni un punto
 * del dominio que muestra el centro de caracteres: dos progresos paralelos que
 * nunca se encuentran. El dominio guarda siempre la forma del catalogo.
 */

const COURSE_KANA_ID = /^kana_(hira|kata)_(.+)$/

/** `kana_hira_a` -> `kana-hiragana-a`. Devuelve null si no es un id de curso. */
export function catalogKanaId(learningItemId: string): string | null {
  const match = COURSE_KANA_ID.exec(learningItemId)
  if (!match) return null
  return `kana-${match[1] === 'hira' ? 'hiragana' : 'katakana'}-${match[2]}`
}

/** Forma canonica con la que se guarda el progreso de un elemento. */
export function canonicalLearningItemId(learningItemId: string): string {
  return catalogKanaId(learningItemId) ?? learningItemId
}
