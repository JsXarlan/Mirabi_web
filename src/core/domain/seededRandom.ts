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

/**
 * Siguiente valor de la secuencia (mulberry32).
 *
 * El congruencial simple de antes (`seed * 1103515245 + 12345`) perdia
 * precision de punto flotante para semillas grandes -el producto supera los
 * 53 bits seguros de un `number`- y ademas los bits bajos de un LCG son de
 * mala calidad, justo los que `% N` termina usando. Para un pool de 4 a 5
 * opciones eso alcanzaba para que la respuesta correcta cayera casi siempre
 * en la misma posicion. Mulberry32 mezcla bien con enteros de 32 bits, sin
 * ese problema.
 */
export function nextRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
  return (t ^ (t >>> 14)) >>> 0
}

/**
 * Elige hasta `count` valores distintos de `pool`, sin repetir texto, en un
 * orden pseudoaleatorio pero determinista a partir de `seed`. Devuelve la
 * semilla ya avanzada para poder encadenar otra tanda de elecciones sobre un
 * segundo pool (p.ej. distractores "confundibles" primero, genericos despues).
 */
export function pickDistinct(pool: string[], count: number, seed: number): { picked: string[]; seed: number } {
  const remaining = [...pool]
  const picked: string[] = []
  let currentSeed = seed
  while (picked.length < count && remaining.length > 0) {
    currentSeed = nextRandom(currentSeed)
    const [candidate] = remaining.splice(currentSeed % remaining.length, 1)
    if (!picked.includes(candidate)) picked.push(candidate)
  }
  return { picked, seed: currentSeed }
}

/**
 * Baraja estable por semilla: mismo `seed`, mismo orden, siempre. La usan las
 * opciones de un ejercicio para que la respuesta correcta no caiga siempre en
 * el mismo lugar, sin dejar de ser reconstruible cuando el repaso vuelve a
 * generar la misma pregunta a partir de su id.
 */
export function shuffle<T>(values: T[], seedValue: string): T[] {
  const items = [...values]
  let seed = seedOf(seedValue)
  for (let i = items.length - 1; i > 0; i -= 1) {
    seed = nextRandom(seed)
    const j = seed % (i + 1)
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}
