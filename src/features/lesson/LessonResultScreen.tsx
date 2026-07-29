import { useNavigate, useLocation, useParams } from 'react-router-dom'

import type { LessonOutcome } from '../../core/store/useMirabiStore'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { yukiReaction } from '../../core/domain/yuki'
import { MirabiButton, MirabiCard, MirabiStatChip } from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'

export function LessonResultScreen() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const index = useMirabiStore((state) => state.index)
  const courseMap = useMirabiStore((state) => state.courseMap)()

  const outcome = location.state as LessonOutcome | null
  const lesson = lessonId ? index?.lessonById.get(lessonId) : undefined

  if (!outcome) {
    // Entrada directa por URL: no hay resultado que celebrar.
    return (
      <Screen title="Resultado">
        <MirabiCard className="p-6 text-center">
          <p className="text-sm">Este resultado ya no está disponible.</p>
          <MirabiButton className="mt-4" onClick={() => navigate('/')}>
            Ir al inicio
          </MirabiButton>
        </MirabiCard>
      </Screen>
    )
  }

  const reaction = yukiReaction(
    outcome.isPerfect
      ? 'PERFECT_LESSON'
      : outcome.wrongAnswers > outcome.correctAnswers
        ? 'MANY_ERRORS'
        : 'LESSON_COMPLETED',
  )

  const nextLessonId = courseMap?.currentLessonId ?? null
  const totalSakura =
    outcome.reward.sakuraEarned +
    (outcome.unitBonus?.sakuraEarned ?? 0) +
    (outcome.worldBonus?.sakuraEarned ?? 0)

  return (
    <Screen title="">
      <div className="flex flex-col items-center gap-3 text-center animate-pop">
        <Yuki size={110} state={reaction.state} />
        <h1 className="text-2xl font-bold">
          {outcome.isPerfect ? '¡Lección perfecta!' : 'Lección completada'}
        </h1>
        {lesson && (
          <p className="font-jp text-sm text-[var(--on-surface-variant)]">{lesson.title}</p>
        )}
        <p className="max-w-sm text-sm text-[var(--on-surface-variant)]">{reaction.text}</p>
      </div>

      <div className="mt-6 flex gap-2">
        <MirabiStatChip icon="✅" value={outcome.correctAnswers} label="Correctas" />
        <MirabiStatChip icon="✏️" value={outcome.wrongAnswers} label="A repasar" />
        <MirabiStatChip
          icon="🎯"
          value={`${Math.round(outcome.accuracyPercentage)}%`}
          label="Precisión"
        />
      </div>

      <MirabiCard className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--on-surface-variant)]">XP ganado</span>
          <span className="text-lg font-bold">+{outcome.reward.xpEarned}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-[var(--on-surface-variant)]">Sakura</span>
          <span className="text-lg font-bold">+{totalSakura} 🌸</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-[var(--on-surface-variant)]">Racha</span>
          <span className="text-lg font-bold">{outcome.streakDays} 🔥</span>
        </div>
        {outcome.unitBonus && (
          <p className="mt-3 rounded-[12px] bg-[var(--tertiary-container)] px-3 py-2 text-xs font-semibold text-[var(--on-tertiary-container)]">
            ¡Unidad completada! +{outcome.unitBonus.sakuraEarned} 🌸 extra
          </p>
        )}
        {outcome.worldBonus && (
          <p className="mt-2 rounded-[12px] bg-[var(--tertiary-container)] px-3 py-2 text-xs font-semibold text-[var(--on-tertiary-container)]">
            ¡Mundo completado! +{outcome.worldBonus.sakuraEarned} 🌸 extra
          </p>
        )}
        {outcome.levelUp && (
          <p className="mt-2 rounded-[12px] bg-[var(--primary-container)] px-3 py-2 text-xs font-semibold text-[var(--on-primary-container)]">
            ¡Subiste de nivel! ⭐
          </p>
        )}
      </MirabiCard>

      {outcome.reviewItemsGenerated > 0 && (
        <p className="mt-3 text-center text-xs text-[var(--on-surface-variant)]">
          {outcome.reviewItemsGenerated}{' '}
          {outcome.reviewItemsGenerated === 1 ? 'elemento pasó' : 'elementos pasaron'} a tu repaso
          inteligente.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {nextLessonId && (
          <MirabiButton onClick={() => navigate(`/leccion/${nextLessonId}`, { replace: true })}>
            Siguiente lección
          </MirabiButton>
        )}
        <MirabiButton variant="secondary" onClick={() => navigate('/', { replace: true })}>
          Ir al inicio
        </MirabiButton>
      </div>
    </Screen>
  )
}
