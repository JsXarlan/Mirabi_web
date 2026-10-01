import { Link } from 'react-router-dom'

import {
  MASTERY_VALUE,
  XP_PER_LEVEL,
  epochDayOf,
  levelFromXp,
  xpIntoLevel,
} from '../../core/domain/models'
import {
  calculateLearningStats,
  resolveProfileSignals,
} from '../../core/domain/profile'
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
import { AppIcon } from '../../ui/Icons'

export function ProfileScreen() {
  const displayName = useMirabiStore((state) => state.displayName)
  const totalXp = useMirabiStore((state) => state.totalXp)
  const sakura = useMirabiStore((state) => state.sakura)
  const persistedStreakDays = useMirabiStore((state) => state.streakDays)
  const lastActivityEpochDay = useMirabiStore(
    (state) => state.lastActivityEpochDay,
  )
  const subscriptionType = useMirabiStore((state) => state.subscriptionType)
  const learningProgress = useMirabiStore((state) => state.learningProgress)
  const totalAnswers = useMirabiStore((state) => state.totalAnswers)
  const correctAnswers = useMirabiStore((state) => state.correctAnswers)
  const activeDays = useMirabiStore((state) => state.activeDays)
  const dailyActivity = useMirabiStore((state) => state.dailyActivity)
  const totalLessonsCompleted = useMirabiStore(
    (state) => state.totalLessonsCompleted,
  )
  const totalReviewsCompleted = useMirabiStore(
    (state) => state.totalReviewsCompleted,
  )
  const totalConversationsCompleted = useMirabiStore(
    (state) => state.totalConversationsCompleted,
  )

  const courseMap = useMirabiStore((state) => state.courseMap)()
  const pending = useMirabiStore((state) => state.dueReviewItems)()
  const achievementsList = useMirabiStore((state) => state.achievementsList)()

  const today = epochDayOf(Date.now())
  // Misma verdad que en Inicio: la racha vale lo que vale hoy.
  const streakDays = streakStatus(
    persistedStreakDays,
    lastActivityEpochDay,
    today,
  ).days

  const level = levelFromXp(totalXp)
  const tracked = Object.values(learningProgress)
  const globalMastery =
    tracked.length === 0
      ? 0
      : tracked.reduce((sum, item) => sum + MASTERY_VALUE[item.mastery], 0) /
        tracked.length

  const stats = calculateLearningStats(
    totalAnswers,
    correctAnswers,
    activeDays.length,
  )
  const signals = resolveProfileSignals({
    pendingReviewItems: pending.length,
    criticalWeaknesses: pending.filter((item) => item.priority === 'CRITICAL')
      .length,
    dailyActivity,
    learningStats: stats,
    streakActive: streakDays > 0,
  })

  const last28 = Array.from({ length: 28 }, (_, offset) => today - 27 + offset)

  return (
    <Screen
      title="Tu historia"
      subtitle="Cada pequeño paso también es progreso."
      wide
      action={
        <Link to="/ajustes" className="icon-button" aria-label="Abrir ajustes">
          <AppIcon name="settings" />
        </Link>
      }
    >
      <section className="profile-identity">
        <Yuki
          size={84}
          state={streakDays > 0 ? 'PROUD' : 'HAPPY'}
          halo={false}
        />
        <div>
          <h2>{displayName ?? 'Estudiante'}</h2>
          <div className="mt-2 flex gap-2">
            <MirabiProgressPill>Nivel {level}</MirabiProgressPill>
            {subscriptionType === 'PLUS' && (
              <MirabiProgressPill>Mirabi Plus</MirabiProgressPill>
            )}
          </div>
          <p>
            {xpIntoLevel(totalXp)} / {XP_PER_LEVEL} XP para el nivel {level + 1}
          </p>
          <MirabiProgressBar
            className="mt-2"
            progress={xpIntoLevel(totalXp) / XP_PER_LEVEL}
            label="Progreso al siguiente nivel"
          />
        </div>
      </section>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MirabiStatChip icon="fire" value={streakDays} label="Días de racha" />
        <MirabiStatChip icon="flower" value={sakura} label="Sakura" />
        <MirabiStatChip icon="sparkle" value={totalXp} label="XP total" />
        <MirabiStatChip
          icon="calendar"
          value={activeDays.length}
          label="Días activos"
        />
      </div>
      <div className="profile-grid">
        <div className="profile-column">
          <div>
            <SectionTitle>Tu camino de aprendizaje</SectionTitle>
            <MirabiCard className="flex items-center gap-5 p-6">
              <MirabiDonutProgress percentage={globalMastery} size={96} />
              <div>
                <h3 className="font-bold">Dominio global</h3>
                <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                  {courseMap?.courseProgress.completedLessons ?? 0} /{' '}
                  {courseMap?.courseProgress.totalLessons ?? 0} lecciones ·{' '}
                  {courseMap?.courseProgress.completedWorlds ?? 0} /{' '}
                  {courseMap?.courseProgress.totalWorlds ?? 0} mundos
                </p>
                <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                  {tracked.length} elementos en seguimiento
                </p>
              </div>
            </MirabiCard>
          </div>
          <div>
            <SectionTitle>Lo que has construido</SectionTitle>
            <MirabiCard className="p-6">
              <dl className="profile-stats">
                <div>
                  <dt>Respuestas</dt>
                  <dd>{stats.totalAnswers}</dd>
                </div>
                <div>
                  <dt>Precisión</dt>
                  <dd>{Math.round(stats.accuracyPercentage)}%</dd>
                </div>
                <div>
                  <dt>Lecciones</dt>
                  <dd>{totalLessonsCompleted}</dd>
                </div>
                <div>
                  <dt>Repasos</dt>
                  <dd>{totalReviewsCompleted}</dd>
                </div>
                <div>
                  <dt>Conversaciones</dt>
                  <dd>{totalConversationsCompleted}</dd>
                </div>
              </dl>
              <Link to="/analisis" className="text-link mt-3">
                Descubrir qué puedes reforzar
                <AppIcon name="next" size={17} />
              </Link>
            </MirabiCard>
          </div>
          <div>
            <SectionTitle>Tus pequeños grandes logros</SectionTitle>
            <div className="achievement-grid">
              {achievementsList.map(({ definition, unlock }) => (
                <div
                  key={definition.id}
                  className={'achievement-card' + (unlock ? ' unlocked' : '')}
                >
                  <AppIcon name={unlock ? 'trophy' : 'lock'} size={27} />
                  <strong className="text-xs">{definition.title}</strong>
                  <span>
                    {unlock
                      ? 'Conseguido · ' +
                        new Date(
                          unlock.unlockedAtEpochMillis,
                        ).toLocaleDateString('es-PE')
                      : 'Por descubrir'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="profile-column" aria-label="Tu hábito">
          <div>
            <SectionTitle>Un hábito que florece</SectionTitle>
            <MirabiCard className="p-6">
              <p className="text-sm text-[var(--on-surface-variant)]">
                Tu actividad en los últimos 28 días.
              </p>
              <ol
                className="activity-calendar"
                aria-label="Calendario de actividad"
              >
                {last28.map((day) => {
                  const date = new Date(day * 86400000)
                  const active = activeDays.includes(day)
                  return (
                    <li
                      key={day}
                      className={active ? 'is-active' : ''}
                      aria-label={
                        date.toLocaleDateString('es-PE', {
                          day: 'numeric',
                          month: 'long',
                          timeZone: 'UTC',
                        }) + (active ? ': estudiaste' : ': sin actividad')
                      }
                    >
                      <span aria-hidden="true">{date.getUTCDate()}</span>
                      {active && <AppIcon name="check" size={12} />}
                    </li>
                  )
                })}
              </ol>
              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
                <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                Día con actividad
              </div>
            </MirabiCard>
          </div>
          {signals.length > 0 && (
            <div className="yuki-note items-start">
              <Yuki size={56} state="THINKING" halo={false} />
              <div>
                <strong>Yuki te acompaña</strong>
                <ul className="flex flex-col gap-3">
                  {signals.map((signal) => (
                    <li key={signal.type}>
                      <p>{signal.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <Link to="/misiones" className="mirabi-card library-link mt-0">
            <span className="icon-tile">
              <AppIcon name="target" />
            </span>
            <div>
              <h2>Tu próxima misión</h2>
              <p>Un objetivo pequeño para seguir creciendo.</p>
            </div>
            <AppIcon name="next" />
          </Link>
        </aside>
      </div>
    </Screen>
  )
}
