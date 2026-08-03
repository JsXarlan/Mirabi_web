/**
 * Generador determinista compartido.
 *
 * Los ejercicios sinteticos se reconstruyen desde su id cuando vuelven en el
 * repaso, asi que sus distractores no pueden depender de Math.random: la misma
 * pregunta tiene que salir siempre igual. Vivia dentro de kanaExercises; se
 * saca aqui para que las palabras y los kanji no acaben cada uno con su propia
 * copia del mismo congruencial.
 */

/** Hash estable de una cadena: misma entrada, misma semilla, siempre. */
export function seedOf(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return Math.abs(hash) || 1
}

/** Siguiente valor de la secuencia. */
export function nextRandom(seed: number): number {
  return (seed * 1103515245 + 12345) & 0x7fffffff
}
