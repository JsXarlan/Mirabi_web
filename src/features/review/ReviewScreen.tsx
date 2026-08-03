import { useNavigate } from 'react-router-dom'

import type { ReviewPriority } from '../../core/domain/models'
import { MASTERY_VALUE } from '../../core/domain/models'
import { labelFor } from '../../core/domain/labels'
import { buildReviewPlan, forecastReviews } from '../../core/domain/review'
import { hasKana } from '../../core/domain/romaji'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiDonutProgress,
  MirabiEmpty,
  MirabiStatChip,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { YukiBubble } from '../../ui/Yuki'

const PRIORITY_LABEL: Record<ReviewPriority, string> = {
  CRITICAL: 'Crítico',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

const PRIORITY_STYLE: Record<ReviewPriority, string> = {
  CRITICAL: 'bg-[var(--secondary)] text-[var(--on-secondary)]',
  HIGH: 'bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]',
  MEDIUM: 'bg-[var(--primary-container)] text-[var(--on-primary-container)]',
  LOW: 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]',
}

const TYPE_LABEL: Record<string, string> = {
  KANA: 'Carácter',
  VOCABULARY: 'Vocabulario',
  GRAMMAR: 'Gramática',
  LISTENING: 'Escucha',
  CONVERSATION: 'Conversación',
  KANJI: 'Kanji',
}

/** "vuelve mañana" dice mucho más que una fecha en una app de estudio diario. */
export function formatDueIn(target: number, now: number): string {
  const days = Math.ceil((target - now) / 86_400_000)
  if (days <= 0) return 'ahora'
  if (days === 1) return 'mañana'
  if (days < 7) return `en ${days} días`
  const weeks = Math.round(days / 7)
  return weeks === 1 ? 'en una semana' : `en ${weeks} semanas`
}

export function ReviewScreen() {
  const navigate = useNavigate()
  const now = Date.now()
  const reviewItems = useMirabiStore((state) => state.reviewItems)
  const labels = useMirabiStore((state) => state.labels)
  const learningProgress = useMirabiStore((state) => state.learningProgress)
  const totalReviewsCompleted = useMirabiStore((state) => state.totalReviewsCompleted)
  const streakDays = useMirabiStore((state) => state.streakDays)

  const forecast = forecastReviews(reviewItems, now)
  const plan = buildReviewPlan(reviewItems, undefined, now)

  const tracked = Object.values(learningProgress)
  const globalMastery =
    tracked.length === 0
      ? 0
      : tracked.reduce((sum, item) => sum + MASTERY_VALUE[item.mastery], 0) / tracked.length

  const trackedLabel = `${forecast.tracked} ${
    forecast.tracked === 1 ? 'elemento' : 'elementos'
  } en seguimiento · ${forecast.graduated} dominados`

  const masteryCard = (
    <MirabiCard className="mt-5 p-5">
      <div className="flex items-center gap-5">
        <MirabiDonutProgress percentage={globalMastery} size={80} />
        <div className="min-w-0">
          <p className="text-sm font-bold">Dominio general</p>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{trackedLabel}</p>
        </div>
      </div>
    </MirabiCard>
  )

  if (forecast.dueNow === 0) {
    // Sin nada vencido hay dos historias distintas: no haber empezado, o ir
    // al dia con repasos ya programados. Merecen mensajes distintos.
    const scheduled = forecast.nextDueAtEpochMillis !== null
    return (
      <Screen title="Repaso">
        <MirabiEmpty
          title="Todo al día"
          message={
            scheduled
              ? `Nada vence ahora. Tu próximo repaso llega ${formatDueIn(forecast.nextDueAtEpochMillis!, now)}.`
              : 'Todavía no hay nada en seguimiento. Empieza una lección y el repaso se llenará solo.'
          }
          action={
            <MirabiButton className="mt-4" onClick={() => navigate('/curso')}>
              Seguir con el curso
            </MirabiButton>
          }
        />
        {scheduled && (
          <div className="mt-5 flex gap-2">
            <MirabiStatChip icon="🌅" value={forecast.dueTomorrow} label="Mañana" />
            <MirabiStatChip icon="📆" value={forecast.dueThisWeek} label="Esta semana" />
            <MirabiStatChip icon="🌸" value={forecast.graduated} label="Dominados" />
          </div>
        )}
        {masteryCard}
        {forecast.tracked > 0 && (
          <MirabiButton
            className="mt-3"
            variant="secondary"
            onClick={() => navigate('/repaso/sesion?adelantar=1')}
          >
            Repasar igualmente
          </MirabiButton>
        )}
      </Screen>
    )
  }

  return (
    <Screen title="Repaso">
      <YukiBubble
        state="THINKING"
        message="Tus errores no son un problema: son exactamente lo que hay que practicar."
      />

      <div className="mt-5 mb-5 flex gap-2">
        <MirabiStatChip icon="📌" value={forecast.dueNow} label="Vencidos" />
        <MirabiStatChip icon="⏱️" value={`${plan.estimatedDurationMinutes} min`} label="Estimado" />
        <MirabiStatChip icon="🌅" value={forecast.dueTomorrow} label="Mañana" />
        <MirabiStatChip icon="🔥" value={streakDays} label="Racha" />
      </div>

      <MirabiCard className="mb-5 p-5">
        <div className="flex items-center gap-5">
          <MirabiDonutProgress percentage={globalMastery} size={80} />
          <div className="min-w-0">
            <p className="text-sm font-bold">Dominio general</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{trackedLabel}</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              {totalReviewsCompleted} {totalReviewsCompleted === 1 ? 'repaso' : 'repasos'} hechos
            </p>
          </div>
        </div>
        <MirabiButton className="mt-4" onClick={() => navigate('/repaso/sesion')}>
          Comenzar repaso ({plan.items.length})
        </MirabiButton>
      </MirabiCard>

      <SectionTitle>Prioridad de hoy</SectionTitle>
      <ul className="flex flex-col gap-2">
        {plan.items.map((item) => {
          const label = labelFor(labels, item.learningItemId)
          return (
            <li key={item.id}>
              <MirabiCard className="flex items-center gap-3 p-4">
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${PRIORITY_STYLE[item.priority]}`}
                >
                  {PRIORITY_LABEL[item.priority]}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate font-jp text-base font-semibold"
                    lang={hasKana(label.primary) ? 'ja' : undefined}
                  >
                    {label.primary}
                    {label.secondary && (
                      <span className="ml-2 font-sans text-xs font-normal text-[var(--on-surface-variant)]">
                        {label.secondary}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-[var(--on-surface-variant)]">
                    {TYPE_LABEL[item.learningItemType] ?? item.learningItemType}
                    {item.lapses > 1 && ` · fallado ${item.lapses} veces`}
                  </span>
                </span>
              </MirabiCard>
            </li>
          )
        })}
      </ul>
    </Screen>
  )
}
