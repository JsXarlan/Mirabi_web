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
import { Yuki } from '../../ui/Yuki'
import { AppIcon } from '../../ui/Icons'

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
  const totalReviewsCompleted = useMirabiStore(
    (state) => state.totalReviewsCompleted,
  )
  const streakDays = useMirabiStore((state) => state.streakDays)
  const words = useMirabiStore((state) => state.words)
  const kanji = useMirabiStore((state) => state.kanji)

  /*
   * La sesion de repaso congela su lista de pasos al montarse y solo la
   * reconstruye desde pack/catalog/words/kanji si entra antes de que los
   * catalogos de palabras y kanji terminen de cargar, esos pasos se
   * descartarian en silencio -no fallarian, simplemente desaparecerian de la
   * cola-. Se bloquea el boton de entrada en vez de tocar las dependencias
   * de esa sesion, que reiniciaria una sesion en curso cada vez que un
   * catalogo perezoso terminara de llegar.
   */
  const catalogsReady = words !== null && kanji !== null

  const forecast = forecastReviews(reviewItems, now)
  const plan = buildReviewPlan(reviewItems, undefined, now)

  const tracked = Object.values(learningProgress)
  const globalMastery =
    tracked.length === 0
      ? 0
      : tracked.reduce((sum, item) => sum + MASTERY_VALUE[item.mastery], 0) /
        tracked.length

  const trackedLabel = `${forecast.tracked} ${
    forecast.tracked === 1 ? 'elemento' : 'elementos'
  } en seguimiento · ${forecast.graduated} dominados`

  const masteryCard = (
    <MirabiCard className="p-6">
      <div className="flex items-center gap-5">
        <MirabiDonutProgress percentage={globalMastery} size={88} />
        <div>
          <h2 className="font-bold">Lo que ya se queda contigo</h2>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
            {trackedLabel}
          </p>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
            {totalReviewsCompleted} repasos completados
          </p>
        </div>
      </div>
    </MirabiCard>
  )

  if (forecast.dueNow === 0) {
    const scheduled = forecast.nextDueAtEpochMillis !== null
    return (
      <Screen title="Repaso" wide>
        <div className="review-empty-layout">
          <MirabiEmpty
            title="Todo al día"
            message={
              scheduled
                ? 'Tu próximo repaso llega ' +
                  formatDueIn(forecast.nextDueAtEpochMillis!, now) +
                  '. Hoy puedes seguir descubriendo.'
                : 'Cada lección prepara tus próximos repasos. Empieza a aprender y Mirabi te ayudará a recordar.'
            }
            action={
              <MirabiButton className="mt-6" onClick={() => navigate('/curso')}>
                Seguir con el curso
                <AppIcon name="next" size={20} />
              </MirabiButton>
            }
          />
          <div className="flex flex-col gap-5">
            {masteryCard}
            <div className="yuki-note">
              <AppIcon name="leaf" size={28} />
              <div>
                <strong>Aprender. Descansar. Recordar.</strong>
                <p>
                  Los repasos aparecen cuando es momento de reforzar lo
                  aprendido. No necesitas hacerlo todo de una vez.
                </p>
              </div>
            </div>
            {scheduled && (
              <div className="flex gap-3">
                <MirabiStatChip
                  icon="sun"
                  value={forecast.dueTomorrow}
                  label="Mañana"
                />
                <MirabiStatChip
                  icon="calendar"
                  value={forecast.dueThisWeek}
                  label="Esta semana"
                />
                <MirabiStatChip
                  icon="complete"
                  value={forecast.graduated}
                  label="Dominados"
                />
              </div>
            )}
            {forecast.tracked > 0 && (
              <MirabiButton
                variant="secondary"
                disabled={!catalogsReady}
                onClick={() => navigate('/repaso/sesion?adelantar=1')}
              >
                {catalogsReady
                  ? 'Prefiero practicar ahora'
                  : 'Preparando biblioteca…'}
              </MirabiButton>
            )}
          </div>
        </div>
      </Screen>
    )
  }
  return (
    <Screen title="Repaso" wide>
      <MirabiCard className="feature-banner">
        <Yuki state="THINKING" size={96} halo={false} />
        <div>
          <p className="eyebrow">UN POCO DE PRÁCTICA, MUCHA MEMORIA</p>
          <h2>{forecast.dueNow} elementos para reforzar</h2>
          <p>
            Una sesión de unos {plan.estimatedDurationMinutes} minutos,
            preparada según lo que necesitas.
          </p>
          <MirabiButton
            disabled={!catalogsReady}
            onClick={() => navigate('/repaso/sesion')}
          >
            <AppIcon name="play" size={19} weight="fill" />
            {catalogsReady
              ? 'Comenzar repaso (' + plan.items.length + ')'
              : 'Preparando biblioteca…'}
          </MirabiButton>
        </div>
      </MirabiCard>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <MirabiStatChip
          icon="target"
          value={forecast.dueNow}
          label="Listos ahora"
        />
        <MirabiStatChip
          icon="sun"
          value={forecast.dueTomorrow}
          label="Mañana"
        />
        <MirabiStatChip icon="fire" value={streakDays} label="Días de racha" />
      </div>
      <div className="review-empty-layout">
        <div>
          <SectionTitle>Tu práctica de hoy</SectionTitle>
          <ul className="review-list">
            {plan.items.map((item) => {
              const label = labelFor(labels, item.learningItemId)
              return (
                <li key={item.id}>
                  <MirabiCard className="flex items-center gap-4 p-5">
                    <span className="min-w-0 flex-1">
                      <span
                        className="block font-jp text-xl font-semibold"
                        lang={hasKana(label.primary) ? 'ja' : undefined}
                      >
                        {label.primary}
                      </span>
                      {label.secondary && (
                        <span className="block text-sm text-[var(--on-surface-variant)]">
                          {label.secondary}
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-[var(--on-surface-variant)]">
                        {TYPE_LABEL[item.learningItemType] ??
                          item.learningItemType}
                        {item.lapses > 1
                          ? ' · practicado con dificultad ' +
                            item.lapses +
                            ' veces'
                          : ''}
                      </span>
                    </span>
                    <span
                      className={
                        'rounded-full px-3 py-1 text-xs font-semibold ' +
                        PRIORITY_STYLE[item.priority]
                      }
                    >
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                  </MirabiCard>
                </li>
              )
            })}
          </ul>
        </div>
        <aside className="flex flex-col gap-5" aria-label="Tu aprendizaje">
          {masteryCard}
          <div className="yuki-note">
            <Yuki state="HAPPY" size={56} halo={false} />
            <div>
              <strong>Cada intento te enseña algo.</strong>
              <p>
                Repetir a tu ritmo ayuda a que lo aprendido se quede contigo.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Screen>
  )
}
