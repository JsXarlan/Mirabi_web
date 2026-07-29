import { useNavigate } from 'react-router-dom'

import type { ReviewPriority } from '../../core/domain/models'
import { MASTERY_VALUE } from '../../core/domain/models'
import { buildReviewPlan } from '../../core/domain/review'
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

export function ReviewScreen() {
  const navigate = useNavigate()
  const pending = useMirabiStore((state) => state.pendingReviewItems)()
  const learningProgress = useMirabiStore((state) => state.learningProgress)
  const totalReviewsCompleted = useMirabiStore((state) => state.totalReviewsCompleted)
  const streakDays = useMirabiStore((state) => state.streakDays)

  const plan = buildReviewPlan(pending)

  const tracked = Object.values(learningProgress)
  const globalMastery =
    tracked.length === 0
      ? 0
      : tracked.reduce((sum, item) => sum + MASTERY_VALUE[item.mastery], 0) / tracked.length

  const trackedLabel = `${tracked.length} ${
    tracked.length === 1 ? 'elemento' : 'elementos'
  } en seguimiento`

  if (pending.length === 0) {
    return (
      <Screen title="Repaso">
        <MirabiEmpty
          title="Todo al día"
          message="No hay nada pendiente de repaso. Yuki está descansando."
          action={
            <MirabiButton className="mt-4" onClick={() => navigate('/curso')}>
              Seguir con el curso
            </MirabiButton>
          }
        />
        <MirabiCard className="mt-5 flex items-center gap-5 p-5">
          <MirabiDonutProgress percentage={globalMastery} size={80} />
          <div>
            <p className="text-sm font-bold">Dominio general</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              {trackedLabel}
            </p>
          </div>
        </MirabiCard>
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
        <MirabiStatChip icon="📌" value={pending.length} label="Pendientes" />
        <MirabiStatChip icon="⏱️" value={`${plan.estimatedDurationMinutes} min`} label="Estimado" />
        <MirabiStatChip icon="🔁" value={totalReviewsCompleted} label="Repasos" />
        <MirabiStatChip icon="🔥" value={streakDays} label="Racha" />
      </div>

      <MirabiCard className="mb-5 p-5">
        <div className="flex items-center gap-5">
          <MirabiDonutProgress percentage={globalMastery} size={80} />
          <div className="min-w-0">
            <p className="text-sm font-bold">Dominio general</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{trackedLabel}</p>
          </div>
        </div>
        <MirabiButton className="mt-4" onClick={() => navigate('/repaso/sesion')}>
          Comenzar repaso ({plan.items.length})
        </MirabiButton>
      </MirabiCard>

      <SectionTitle>Prioridad de hoy</SectionTitle>
      <ul className="flex flex-col gap-2">
        {plan.items.map((item) => (
          <li key={item.id}>
            <MirabiCard className="flex items-center gap-3 p-4">
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${PRIORITY_STYLE[item.priority]}`}
              >
                {PRIORITY_LABEL[item.priority]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-jp text-sm font-semibold">
                  {item.learningItemId}
                </span>
                <span className="block text-xs text-[var(--on-surface-variant)]">
                  {TYPE_LABEL[item.learningItemType] ?? item.learningItemType}
                </span>
              </span>
            </MirabiCard>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
