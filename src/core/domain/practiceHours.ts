/** Horas del selector de recordatorio: unica fuente de verdad para el <select> y la sugerencia. */
export const REMINDER_HOUR_OPTIONS = [8, 12, 15, 18, 20, 21, 22] as const

function nearestCandidate(hour: number, candidates: readonly number[]): number {
  return candidates.reduce((closest, candidate) =>
    Math.abs(candidate - hour) < Math.abs(closest - hour) ? candidate : closest,
  )
}

/**
 * Hora mas frecuente en que arranca el dia de estudio, redondeada a una de
 * las opciones del selector. Con menos de 3 muestras no hay suficiente señal
 * para sugerir nada.
 */
export function usualPracticeHour(
  hours: number[],
  candidates: readonly number[] = REMINDER_HOUR_OPTIONS,
): number | null {
  if (hours.length < 3) return null

  const counts = new Map<number, number>()
  for (const hour of hours) {
    const bucket = nearestCandidate(hour, candidates)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }

  let best: number | null = null
  let bestCount = 0
  for (const candidate of candidates) {
    const count = counts.get(candidate) ?? 0
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}
