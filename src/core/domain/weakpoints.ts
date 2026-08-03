import type { LearningProgress, MasteryScore, ReviewItem } from './models'
import { MASTERY_VALUE } from './models'

/**
 * Analisis de puntos debiles.
 *
 * El contenido tipifica cada fallo posible (`errorType`) y marca las confusiones
 * que hay que vigilar (`criticalTags`). Con eso, "fallaste 8 ejercicios" se
 * convierte en "confundes は particula con は silaba", que es lo unico
 * accionable de los dos.
 */

/** Textos de los errorType que declara el pack v2. */
const ERROR_LABELS: Record<string, { title: string; advice: string }> = {
  SENTENCE_ORDER: {
    title: 'Orden de la frase',
    advice: 'En japonés el verbo va al final. Reconstruye la frase por partes: quién, qué, acción.',
  },
  WORD_RECOGNITION: {
    title: 'Reconocer la palabra',
    advice: 'Escucha la palabra antes de leerla; el sonido fija el significado mejor que la vista.',
  },
  PARTICLE_OMISSION: {
    title: 'Partículas que se caen',
    advice: 'La partícula es la etiqueta que dice qué papel juega cada palabra. Sin ella la frase se desarma.',
  },
  KANA_VISUAL_CONFUSION: {
    title: 'Kana que se parecen',
    advice: 'Compáralos en pareja, no de uno en uno: la diferencia está en un trazo.',
  },
  KANA_SOUND_ASSOCIATION: {
    title: 'Sonido del kana',
    advice: 'Practica leyéndolos en voz alta; asociar símbolo y sonido es más rápido que memorizar la forma.',
  },
  KANA_PRONUNCIATION_SHI: {
    title: 'し no es «si»',
    advice: 'し se lee «shi». Es la fila S la que cambia, no el kana.',
  },
  KANA_PRONUNCIATION_CHI: {
    title: 'ち no es «ti»',
    advice: 'ち se lee «chi», igual que つ se lee «tsu»: la fila T tiene tres excepciones.',
  },
  KANA_PRONUNCIATION_TSU: {
    title: 'つ no es «tu»',
    advice: 'つ se lee «tsu». Escúchalo junto a す para separarlos.',
  },
  AUDIO_E_I_CONFUSION: {
    title: 'Confundes «e» con «i»',
    advice: 'Las cinco vocales japonesas son fijas: la e siempre suena como en «mesa».',
  },
  AUDIO_VOWEL_CONFUSION: {
    title: 'Vocales al oído',
    advice: 'Escucha en lento antes de responder; las vocales japonesas no cambian según la palabra.',
  },
  AUDIO_O_U_CONFUSION: {
    title: 'Confundes «o» con «u»',
    advice: 'La u japonesa es más cerrada y corta que la española. Compáralas seguidas.',
  },
  AUDIO_SU_TSU: {
    title: 'す frente a つ',
    advice: 'つ lleva una t delante. Escucha las dos seguidas hasta separarlas sin pensar.',
  },
  PARTICLE_WA_HA: {
    title: 'は partícula frente a は sílaba',
    advice: 'Cuando は marca el tema se lee «wa». En cualquier otro sitio se lee «ha».',
  },
  QUESTION_KA_POSITION: {
    title: 'か al final',
    advice: 'か convierte la frase en pregunta sin cambiar el orden, y va siempre al final.',
  },
  DEMO_DISTANCE: {
    title: 'これ / それ / あれ',
    advice: 'La distancia manda: これ cerca de ti, それ cerca del otro, あれ lejos de ambos.',
  },
  DESU_DE_KANA: {
    title: 'です se escribe con て+濁点',
    advice: 'です se escribe です: la sílaba de lleva dakuten.',
  },
}

/** Confusiones que el contenido marca como criticas. */
const CRITICAL_LABELS: Record<string, string> = {
  CRIT_KANA_SU_TSU: 'す / つ',
  CRIT_PARTICLE_WA: 'partícula は',
  CRIT_DESU_DE: 'です',
  CRIT_KANA_SHI_CHI_TSU: 'し / ち / つ',
  CRIT_DEMO_DISTANCE: 'これ / それ / あれ',
  CRIT_QUESTION_KA: 'pregunta con か',
}

export function errorTypeLabel(errorType: string): { title: string; advice: string } {
  return (
    ERROR_LABELS[errorType] ?? {
      title: errorType.replaceAll('_', ' ').toLowerCase(),
      advice: 'Vuelve a este punto en el repaso para asentarlo.',
    }
  )
}

export function criticalTagLabel(tag: string): string {
  return CRITICAL_LABELS[tag] ?? tag.replace(/^CRIT_/, '').replaceAll('_', ' ').toLowerCase()
}

export interface WeakPoint {
  key: string
  title: string
  advice: string
  wrong: number
  total: number
  /** 0..100; cuanto mas alto, mas urgente. */
  severity: number
  pendingReviews: number
}

export interface ErrorTally {
  wrong: number
  total: number
}

/**
 * Cruza los contadores de error con la cola de repaso: un punto que ya esta
 * programado pesa mas que uno suelto, porque sigue vivo.
 */
export function buildWeakPoints(
  tallies: Record<string, ErrorTally>,
  reviewItems: ReviewItem[],
): WeakPoint[] {
  const pendingByError = new Map<string, number>()
  for (const item of reviewItems) {
    if (item.status === 'COMPLETED' || !item.errorType) continue
    pendingByError.set(item.errorType, (pendingByError.get(item.errorType) ?? 0) + 1)
  }

  return Object.entries(tallies)
    .filter(([, tally]) => tally.wrong > 0)
    .map(([key, tally]) => {
      const { title, advice } = errorTypeLabel(key)
      const rate = tally.total === 0 ? 0 : tally.wrong / tally.total
      const pending = pendingByError.get(key) ?? 0
      return {
        key,
        title,
        advice,
        wrong: tally.wrong,
        total: tally.total,
        // El ratio manda, pero el volumen desempata: fallar 8 de 10 es peor
        // que fallar 1 de 1.
        severity: Math.round(Math.min(100, rate * 80 + Math.min(tally.wrong, 5) * 4)),
        pendingReviews: pending,
      }
    })
    .sort((a, b) => b.severity - a.severity || b.wrong - a.wrong)
}

export interface MasteryBreakdown {
  byScore: Record<MasteryScore, number>
  averageValue: number
  tracked: number
}

export function masteryBreakdown(progress: LearningProgress[]): MasteryBreakdown {
  const byScore: Record<MasteryScore, number> = {
    UNKNOWN: 0,
    FAMILIAR: 0,
    LEARNING: 0,
    MASTERED: 0,
    EXPERT: 0,
  }
  for (const item of progress) byScore[item.mastery] += 1

  const total = progress.reduce((sum, item) => sum + MASTERY_VALUE[item.mastery], 0)
  return {
    byScore,
    averageValue: progress.length === 0 ? 0 : total / progress.length,
    tracked: progress.length,
  }
}
