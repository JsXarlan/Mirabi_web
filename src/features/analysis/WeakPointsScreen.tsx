import { useNavigate } from 'react-router-dom'

import type { MasteryScore } from '../../core/domain/models'
import { buildWeakPoints, criticalTagLabel, masteryBreakdown } from '../../core/domain/weakpoints'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiEmpty,
  MirabiProgressBar,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { YukiBubble } from '../../ui/Yuki'

/**
 * Puntos debiles.
 *
 * El contenido tipifica cada fallo posible; sin una pantalla que los agregue,
 * esa informacion se pierde en el momento en que se cierra el ejercicio. Aqui
 * "fallaste ocho veces" se convierte en "confundes は particula con は silaba",
 * que es lo unico sobre lo que se puede actuar.
 */

const MASTERY_LABEL: Record<MasteryScore, string> = {
  UNKNOWN: 'Sin ver',
  FAMILIAR: 'Familiar',
  LEARNING: 'Aprendiendo',
  MASTERED: 'Dominado',
  EXPERT: 'Experto',
}

const MASTERY_ORDER: MasteryScore[] = ['UNKNOWN', 'FAMILIAR', 'LEARNING', 'MASTERED', 'EXPERT']

function severityTone(severity: number): { label: string; className: string } {
  if (severity >= 60) return { label: 'Alta', className: 'bg-[var(--secondary)] text-[var(--on-secondary)]' }
  if (severity >= 30)
    return {
      label: 'Media',
      className: 'bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]',
    }
  return {
    label: 'Leve',
    className: 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]',
  }
}

export function WeakPointsScreen() {
  const navigate = useNavigate()
  const errorTallies = useMirabiStore((state) => state.errorTallies)
  const criticalTallies = useMirabiStore((state) => state.criticalTallies)
  const reviewItems = useMirabiStore((state) => state.reviewItems)
  const learningProgress = useMirabiStore((state) => state.learningProgress)
  const subscriptionType = useMirabiStore((state) => state.subscriptionType)

  const weakPoints = buildWeakPoints(errorTallies, reviewItems)
  const breakdown = masteryBreakdown(Object.values(learningProgress))

  const criticals = Object.entries(criticalTallies)
    .filter(([, tally]) => tally.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong)

  if (breakdown.tracked === 0) {
    return (
      <Screen title="Tus puntos débiles">
        <MirabiEmpty
          title="Todavía no hay nada que analizar"
          message="Completa una lección y aquí verás exactamente qué se te resiste y por qué."
          action={
            <MirabiButton className="mt-4" onClick={() => navigate('/curso')}>
              Ir al curso
            </MirabiButton>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen title="Tus puntos débiles">
      <YukiBubble
        state={weakPoints.length > 0 ? 'THINKING' : 'PROUD'}
        message={
          weakPoints.length > 0
            ? 'Esto no es una lista de errores: es tu plan de práctica.'
            : 'No hay confusiones marcadas. Vas limpio.'
        }
      />

      <SectionTitle>Reparto de dominio</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <ul className="flex flex-col gap-2.5">
          {MASTERY_ORDER.map((score) => {
            const count = breakdown.byScore[score]
            const share = breakdown.tracked === 0 ? 0 : count / breakdown.tracked
            return (
              <li key={score}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-semibold">{MASTERY_LABEL[score]}</span>
                  <span className="text-[var(--on-surface-variant)]">{count}</span>
                </div>
                <MirabiProgressBar
                  progress={share}
                  tone={score === 'EXPERT' || score === 'MASTERED' ? 'success' : 'primary'}
                />
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-[var(--on-surface-variant)]">
          {breakdown.tracked} elementos en seguimiento · dominio medio{' '}
          {Math.round(breakdown.averageValue)}%
        </p>
      </MirabiCard>

      {criticals.length > 0 && (
        <>
          <SectionTitle>Confusiones marcadas por el curso</SectionTitle>
          <div className="mb-5 flex flex-wrap gap-2">
            {criticals.map(([tag, tally]) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--secondary-container)] px-3 py-1.5 text-xs font-semibold text-[var(--on-secondary-container)]"
              >
                {criticalTagLabel(tag)} · {tally.wrong}/{tally.total}
              </span>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Qué se te resiste</SectionTitle>
      {weakPoints.length === 0 ? (
        <MirabiCard className="p-5">
          <p className="text-sm">
            Ningún tipo de error se repite todavía. Sigue practicando y, si algo se atasca,
            aparecerá aquí con su explicación.
          </p>
        </MirabiCard>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {weakPoints.map((point) => {
            const tone = severityTone(point.severity)
            return (
              <li key={point.key}>
                <MirabiCard className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold">{point.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.className}`}
                    >
                      {tone.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--on-surface-variant)]">{point.advice}</p>
                  <p className="mt-2 text-[11px] text-[var(--on-surface-variant)]">
                    {point.wrong} {point.wrong === 1 ? 'fallo' : 'fallos'} en {point.total}{' '}
                    {point.total === 1 ? 'intento' : 'intentos'}
                    {point.pendingReviews > 0 && ` · ${point.pendingReviews} en tu repaso`}
                  </p>
                </MirabiCard>
              </li>
            )
          })}
        </ul>
      )}

      <MirabiButton className="mt-5" onClick={() => navigate('/repaso')}>
        Practicar lo que falla
      </MirabiButton>

      {subscriptionType === 'FREE' && (
        <p className="mt-4 text-center text-xs text-[var(--on-surface-variant)]">
          Este análisis es gratis y lo seguirá siendo. Plus solo añade comodidad.
        </p>
      )}
    </Screen>
  )
}
