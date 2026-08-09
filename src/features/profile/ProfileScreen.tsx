import { Link } from 'react-router-dom'

import {
  MASTERY_VALUE,
  XP_PER_LEVEL,
  epochDayOf,
  levelFromXp,
  xpIntoLevel,
} from '../../core/domain/models'
import { calculateLearningStats, resolveProfileSignals } from '../../core/domain/profile'
import { streakStatus } from '../../core/domain/rewards'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import {
  MirabiCard,
  MirabiDonutProgress,
  MirabiProgressBar,
  MirabiProgressPill,
  MirabiStatChip,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'

export function ProfileScreen() {
  const displayName = useMirabiStore((state) => state.displayName)
  const totalXp = useMirabiStore((state) => state.totalXp)
  const sakura = useMirabiStore((state) => state.sakura)
  const persistedStreakDays = useMirabiStore((state) => state.streakDays)
  const lastActivityEpochDay = useMirabiStore((state) => state.lastActivityEpochDay)
  const subscriptionType = useMirabiStore((state) => state.subscriptionType)
  const learningProgress = useMirabiStore((state) => state.learningProgress)
  const totalAnswers = useMirabiStore((state) => state.totalAnswers)
  const correctAnswers = useMirabiStore((state) => state.correctAnswers)
  const activeDays = useMirabiStore((state) => state.activeDays)
  const dailyActivity = useMirabiStore((state) => state.dailyActivity)
  const totalLessonsCompleted = useMirabiStore((state) => state.totalLessonsCompleted)
  const totalReviewsCompleted = useMirabiStore((state) => state.totalReviewsCompleted)
  const totalConversationsCompleted = useMirabiStore((state) => state.totalConversationsCompleted)

  const courseMap = useMirabiStore((state) => state.courseMap)()
  const pending = useMirabiStore((state) => state.dueReviewItems)()
  const achievementsList = useMirabiStore((state) => state.achievementsList)()

  const today = epochDayOf(Date.now())
  // Misma verdad que en Inicio: la racha vale lo que vale hoy.
  const streakDays = streakStatus(persistedStreakDays, lastActivityEpochDay, today).days

  const level = levelFromXp(totalXp)
  const tracked = Object.values(learningProgress)
  const globalMastery =
    tracked.length === 0
      ? 0
      : tracked.reduce((sum, item) => sum + MASTERY_VALUE[item.mastery], 0) / tracked.length

  const stats = calculateLearningStats(totalAnswers, correctAnswers, activeDays.length)
  const signals = resolveProfileSignals({
    pendingReviewItems: pending.length,
    criticalWeaknesses: pending.filter((item) => item.priority === 'CRITICAL').length,
    dailyActivity,
    learningStats: stats,
    streakActive: streakDays > 0,
  })

  const last28 = Array.from({ length: 28 }, (_, offset) => today - 27 + offset)

  return (
    <Screen
      title="Perfil"
      action={
        <Link
          to="/ajustes"
          aria-label="Ajustes"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-variant)] text-lg"
        >
          ⚙️
        </Link>
      }
    >
      <MirabiCard className="mb-5 p-5">
        <div className="flex items-center gap-4">
          <Yuki size={72} state={streakDays > 0 ? 'PROUD' : 'HAPPY'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{displayName ?? 'Estudiante'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <MirabiProgressPill>Nivel {level}</MirabiProgressPill>
              {subscriptionType === 'PLUS' && (
                <span className="rounded-full bg-[var(--tertiary-container)] px-3 py-1 text-xs font-bold text-[var(--on-tertiary-container)]">
                  Plus
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--on-surface-variant)]">
          {xpIntoLevel(totalXp)} / {XP_PER_LEVEL} XP para el nivel {level + 1}
        </p>
        <MirabiProgressBar className="mt-1.5" progress={xpIntoLevel(totalXp) / XP_PER_LEVEL} />
      </MirabiCard>

      <div className="mb-5 flex gap-2">
        <MirabiStatChip icon="🔥" value={streakDays} label="Racha" />
        <MirabiStatChip icon="🌸" value={sakura} label="Sakura" />
        <MirabiStatChip icon="⭐" value={totalXp} label="XP total" />
        <MirabiStatChip icon="📅" value={activeDays.length} label="Días activos" />
      </div>

      <SectionTitle>Camino de aprendizaje</SectionTitle>
      <MirabiCard className="mb-5 flex items-center gap-5 p-5">
        <MirabiDonutProgress percentage={globalMastery} size={88} />
        <div className="min-w-0 text-sm">
          <p className="font-bold">Dominio global</p>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
            {courseMap?.courseProgress.completedLessons ?? 0}/
            {courseMap?.courseProgress.totalLessons ?? 0} lecciones ·{' '}
            {courseMap?.courseProgress.completedWorlds ?? 0}/
            {courseMap?.courseProgress.totalWorlds ?? 0} mundos
          </p>
          <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
            {tracked.length} {tracked.length === 1 ? 'elemento' : 'elementos'} en seguimiento
          </p>
        </div>
      </MirabiCard>

      <SectionTitle>Estadísticas</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-[var(--on-surface-variant)]">Respuestas</dt>
          <dd className="text-right font-semibold">{stats.totalAnswers}</dd>
          <dt className="text-[var(--on-surface-variant)]">Precisión</dt>
          <dd className="text-right font-semibold">
            {Math.round(stats.accuracyPercentage)}%
          </dd>
          <dt className="text-[var(--on-surface-variant)]">Lecciones</dt>
          <dd className="text-right font-semibold">{totalLessonsCompleted}</dd>
          <dt className="text-[var(--on-surface-variant)]">Repasos</dt>
          <dd className="text-right font-semibold">{totalReviewsCompleted}</dd>
          <dt className="text-[var(--on-surface-variant)]">Conversaciones</dt>
          <dd className="text-right font-semibold">{totalConversationsCompleted}</dd>
        </dl>
        {/*
          El analisis de fallos es gratis: el producto promete que Plus da
          comodidad, no aprendizaje, y saber que se te resiste es aprendizaje.
        */}
        <Link
          to="/analisis"
          className="mt-4 block text-center text-xs font-semibold text-[var(--primary)]"
        >
          Ver qué se te resiste y por qué →
        </Link>
      </MirabiCard>

      <SectionTitle>Calendario</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <div className="grid grid-cols-7 gap-1.5">
          {last28.map((day) => (
            <div
              key={day}
              title={new Date(day * 86_400_000).toLocaleDateString()}
              className={`aspect-square rounded-[6px] ${
                activeDays.includes(day) ? 'bg-[var(--primary)]' : 'bg-[var(--surface-variant)]'
              }`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--on-surface-variant)]">Últimas 4 semanas</p>
      </MirabiCard>

      <SectionTitle>Logros</SectionTitle>
      <div className="mb-5 grid grid-cols-4 gap-2">
        {achievementsList.map(({ definition, unlock }) => (
          <div
            key={definition.id}
            title={unlock ? `Desbloqueado el ${new Date(unlock.unlockedAtEpochMillis).toLocaleDateString()}` : undefined}
            className={`flex flex-col items-center gap-1 rounded-[16px] p-3 text-center ${
              unlock
                ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                : 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)] opacity-55'
            }`}
          >
            <span aria-hidden className="font-jp text-xl">
              {definition.icon}
            </span>
            <span className="text-[10px] leading-tight font-semibold">{definition.title}</span>
          </div>
        ))}
      </div>

      {signals.length > 0 && (
        <>
          <SectionTitle>Yuki dice</SectionTitle>
          <MirabiCard className="p-5">
            <ul className="flex flex-col gap-1.5 text-sm">
              {signals.map((signal) => (
                <li key={signal.type} className="flex items-start gap-2">
                  <span aria-hidden>•</span>
                  <span>{signal.message}</span>
                </li>
              ))}
            </ul>
          </MirabiCard>
        </>
      )}
    </Screen>
  )
}
