import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { epochDayOf, levelFromXp } from '../../core/domain/models'
import { motivationCopy } from '../../core/domain/motivation'
import { buildHomeRecommendation } from '../../core/domain/recommendations'
import { streakStatus } from '../../core/domain/rewards'
import { buildWeakPoints } from '../../core/domain/weakpoints'
import { resolveHomeTrigger, yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { isSpeechAvailable, speakJapanese } from '../../core/audio/speech'
import {
  MirabiCard,
  MirabiProgressBar,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'
import { AppIcon } from '../../ui/Icons'
import { JourneyScene } from '../../ui/Brand'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Buenas noches'
  if (hour < 13) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function HomeScreen() {
  const navigate = useNavigate()

  const displayName = useMirabiStore((state) => state.displayName)
  const motivationValue = useMirabiStore((state) => state.motivation)
  const streakDays = useMirabiStore((state) => state.streakDays)
  const lastActivityEpochDay = useMirabiStore(
    (state) => state.lastActivityEpochDay,
  )
  const totalXp = useMirabiStore((state) => state.totalXp)
  const dailyGoalXp = useMirabiStore((state) => state.dailyGoalXp)
  const dailyActivity = useMirabiStore((state) => state.dailyActivity)
  const activityEpochDay = useMirabiStore((state) => state.activityEpochDay)
  const totalLessonsCompleted = useMirabiStore(
    (state) => state.totalLessonsCompleted,
  )
  const totalReviewsCompleted = useMirabiStore(
    (state) => state.totalReviewsCompleted,
  )
  const totalConversationsCompleted = useMirabiStore(
    (state) => state.totalConversationsCompleted,
  )
  const activeDays = useMirabiStore((state) => state.activeDays)
  const catalog = useMirabiStore((state) => state.catalog)
  const kanji = useMirabiStore((state) => state.kanji)
  const index = useMirabiStore((state) => state.index)
  const errorTallies = useMirabiStore((state) => state.errorTallies)
  const reviewItems = useMirabiStore((state) => state.reviewItems)

  const courseMap = useMirabiStore((state) => state.courseMap)()
  const pendingReviews = useMirabiStore((state) => state.dueReviewItems)()
  const missions = useMirabiStore((state) => state.todayMissions)()

  const today = epochDayOf(Date.now())
  // Los contadores diarios persistidos pueden ser de ayer hasta la primera accion del dia.
  const todayActivity =
    activityEpochDay === today
      ? dailyActivity
      : {
          lessonsCompletedToday: 0,
          reviewsCompletedToday: 0,
          conversationsCompletedToday: 0,
          xpEarnedToday: 0,
          sakuraEarnedToday: 0,
          dailyGoalCompleted: false,
        }

  const nextLesson = courseMap?.currentLessonId
    ? (index?.lessonById.get(courseMap.currentLessonId) ?? null)
    : null
  const nextUnit = nextLesson
    ? (index?.unitById.get(nextLesson.unitId) ?? null)
    : null
  const nextWorld = nextUnit
    ? (index?.worldById.get(nextUnit.worldId) ?? null)
    : null

  const activeMission =
    missions.find((mission) => !mission.progress.completed) ?? missions[0]

  const recommendation = useMemo(
    () =>
      buildHomeRecommendation(
        buildWeakPoints(errorTallies, reviewItems),
        pendingReviews.length,
        Boolean(nextLesson),
      ),
    [errorTallies, reviewItems, pendingReviews.length, nextLesson],
  )
  const recommendationAction =
    recommendation?.type === 'REVIEW_ITEM'
      ? { label: 'Ir a repaso', to: '/repaso' }
      : recommendation?.type === 'PRACTICE_CATEGORY'
        ? { label: 'Ver puntos débiles', to: '/analisis' }
        : recommendation?.type === 'CONTINUE_COURSE'
          ? { label: 'Ir al curso', to: '/curso' }
          : null

  const dailyPhrase = useMemo(() => {
    if (!catalog || catalog.characters.length === 0) return null
    // Frase del dia estable dentro del mismo dia y distinta cada dia.
    const withExample = catalog.characters.filter(
      (character) => character.examples.length > 0,
    )
    if (withExample.length === 0) return null
    const character = withExample[today % withExample.length]
    return character.examples[0]
  }, [catalog, today])

  /*
   * Mismo patron que dailyPhrase: estable dentro del dia, distinto cada dia.
   * El catalogo de kanji llega tarde (prewarm ocioso, ver App.tsx), asi que
   * en la primera visita del dia esta seccion sencillamente no aparece hasta
   * que termina de cargar -no es un fallo, es lo mismo que ya hace la
   * biblioteca con la tarjeta de Kanji en CharactersScreen-.
   */
  const dailyKanji = useMemo(() => {
    if (!kanji || kanji.kanji.length === 0) return null
    return kanji.kanji[today % kanji.kanji.length]
  }, [kanji, today])

  // La racha se muestra tal y como esta hoy, no como quedo el ultimo dia activo.
  const streak = streakStatus(streakDays, lastActivityEpochDay, today)

  const yuki = useMemo(
    () =>
      yukiReaction(
        resolveHomeTrigger({
          daysSinceLastActivity:
            lastActivityEpochDay === null ? null : today - lastActivityEpochDay,
          streakLost: streak.lost,
          streakDays: streak.days,
          pendingReviews: pendingReviews.length,
          lessonsCompleted: totalLessonsCompleted,
          dailyGoalCompleted: todayActivity.dailyGoalCompleted,
        }),
      ),
    [
      lastActivityEpochDay,
      today,
      streak.lost,
      streak.days,
      pendingReviews.length,
      totalLessonsCompleted,
      todayActivity.dailyGoalCompleted,
    ],
  )

  const motivation = motivationCopy(motivationValue)
  const level = levelFromXp(totalXp)
  const goalProgress =
    dailyGoalXp > 0 ? todayActivity.xpEarnedToday / dailyGoalXp : 0

  const week = Array.from({ length: 7 }, (_, i) => today - 6 + i)
  const date = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Screen wide>
      <header className="home-welcome">
        <div>
          <p className="eyebrow">
            {greeting()}
            {displayName ? ', ' + displayName : ''}
          </p>
          <h1>
            Un poquito más cerca
            <br className="hidden sm:block" /> de tu japonés.
          </h1>
          <p className="page-subtitle">Tu próximo paso te está esperando.</p>
        </div>
        <span className="home-date">
          <AppIcon name="calendar" size={18} />
          {date}
        </span>
      </header>
      <div className="home-grid">
        <div className="home-main">
          <section className="lesson-hero" aria-labelledby="next-lesson-title">
            <JourneyScene className="hero-scene" />
            <div className="hero-yuki">
              <Yuki state={yuki.state} size={112} halo={false} />
            </div>
            <div className="hero-content">
              <span className="hero-label">
                <AppIcon name="sparkle" size={16} /> TU SIGUIENTE PASO
              </span>
              <p className="hero-unit">
                {nextWorld?.title ?? 'Tu camino'}
                {nextUnit ? ' · ' + nextUnit.title : ''}
              </p>
              <h2 id="next-lesson-title">
                {nextLesson?.title ?? '¡Curso completado!'}
              </h2>
              <p>
                {nextLesson
                  ? 'Una pequeña lección. Una nueva forma de entender.'
                  : 'Sigue explorando y refuerza lo que has aprendido.'}
              </p>
              <button
                type="button"
                className="mirabi-button hero-action"
                onClick={() =>
                  navigate(nextLesson ? '/leccion/' + nextLesson.id : '/repaso')
                }
              >
                {nextLesson
                  ? totalLessonsCompleted === 0
                    ? 'Empezar mi primera lección'
                    : 'Continuar lección'
                  : 'Ir a repaso'}
                <AppIcon name="next" size={20} />
              </button>
            </div>
            <div className="hero-footer">
              <div className="hero-footer-label">
                <span>Tu camino recorrido</span>
                <strong>
                  {courseMap?.courseProgress.completedLessons ?? 0} /{' '}
                  {courseMap?.courseProgress.totalLessons ?? 0} lecciones
                </strong>
              </div>
              <MirabiProgressBar
                progress={(courseMap?.overallProgressPercentage ?? 0) / 100}
                label="Progreso del curso"
              />
            </div>
          </section>

          <div>
            <SectionTitle
              action={
                <Link to="/caracteres" className="text-link">
                  Explorar <AppIcon name="next" size={16} />
                </Link>
              }
            >
              Un momento para practicar
            </SectionTitle>
            <div className="practice-grid">
              <Link to="/repaso" className="mirabi-card practice-card">
                <span className="icon-tile">
                  <AppIcon name="review" size={25} />
                </span>
                <h3>Refuerza lo aprendido</h3>
                <p>
                  {pendingReviews.length > 0
                    ? pendingReviews.length + ' elementos listos para repasar'
                    : 'Todo al día. Puedes practicar a tu ritmo.'}
                </p>
                <span className="practice-action">
                  {pendingReviews.length > 0
                    ? 'Ir a repaso'
                    : 'Ver mis repasos'}
                  <AppIcon name="next" size={18} />
                </span>
              </Link>
              <Link to="/caracteres" className="mirabi-card practice-card">
                <span className="icon-tile sakura">
                  <AppIcon name="characters" size={25} />
                </span>
                <h3>Dale forma al japonés</h3>
                <p>Hiragana, katakana y kanji. Descubre cada trazo.</p>
                <span className="practice-action">
                  Explorar caracteres
                  <AppIcon name="next" size={18} />
                </span>
              </Link>
            </div>
          </div>
          {recommendation && recommendation.type !== 'CONTINUE_COURSE' && (
            <MirabiCard className="home-recommendation">
              <span className="icon-tile">
                <AppIcon name="target" />
              </span>
              <div>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.reason}</p>
                {recommendationAction && (
                  <Link to={recommendationAction.to} className="text-link">
                    {recommendationAction.label}
                    <AppIcon name="next" size={16} />
                  </Link>
                )}
              </div>
            </MirabiCard>
          )}
          <div className="practice-grid">
            <Link
              to="/palabras"
              className="mirabi-card library-link home-library-link"
            >
              <AppIcon name="words" size={24} />
              <div>
                <h3>Tu vocabulario</h3>
                <p>Palabras para cada día</p>
              </div>
              <AppIcon name="next" size={18} />
            </Link>
            <Link
              to="/conversaciones"
              className="mirabi-card library-link home-library-link"
            >
              <AppIcon name="conversation" size={24} />
              <div>
                <h3>Conversaciones</h3>
                <p>Usa lo que ya sabes</p>
              </div>
              <AppIcon name="next" size={18} />
            </Link>
          </div>
          <div>
            <SectionTitle>Cada paso cuenta</SectionTitle>
            <div className="activity-strip">
              <div>
                <AppIcon name="course" size={20} />
                <strong>{totalLessonsCompleted}</strong>
                <span>Lecciones</span>
              </div>
              <div>
                <AppIcon name="review" size={20} />
                <strong>{totalReviewsCompleted}</strong>
                <span>Repasos</span>
              </div>
              <div>
                <AppIcon name="conversation" size={20} />
                <strong>{totalConversationsCompleted}</strong>
                <span>Conversaciones</span>
              </div>
            </div>
          </div>
        </div>
        <aside className="home-aside" aria-label="Tu hábito y descubrimientos">
          <MirabiCard className="goal-card">
            <div className="goal-top">
              <span className="icon-tile">
                <AppIcon name="target" />
              </span>
              <div>
                <h2>Tu objetivo de hoy</h2>
                <p>
                  {todayActivity.dailyGoalCompleted
                    ? '¡Objetivo completado!'
                    : 'Haz espacio para un pequeño paso.'}
                </p>
              </div>
            </div>
            <div className="mt-5 mb-2 flex items-baseline justify-between">
              <strong>
                {todayActivity.xpEarnedToday}
                <span className="text-sm font-normal text-[var(--on-surface-variant)]">
                  {' '}
                  / {dailyGoalXp} XP
                </span>
              </strong>
              <span className="text-sm font-semibold text-[var(--primary)]">
                {Math.min(100, Math.round(goalProgress * 100))}%
              </span>
            </div>
            <MirabiProgressBar
              progress={goalProgress}
              tone={todayActivity.dailyGoalCompleted ? 'success' : 'primary'}
              label="Objetivo diario"
            />
            <div className="week-days">
              {week.map((day) => {
                const dayDate = new Date(day * 86400000)
                const active = activeDays.includes(day)
                return (
                  <div key={day} className="week-day">
                    <span>
                      {dayDate.toLocaleDateString('es-PE', {
                        weekday: 'narrow',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <span
                      className={
                        'week-day-dot' +
                        (active ? ' active' : '') +
                        (day === today ? ' today' : '')
                      }
                      aria-label={
                        dayDate.toLocaleDateString('es-PE', {
                          day: 'numeric',
                          month: 'long',
                          timeZone: 'UTC',
                        }) + (active ? ': estudiaste' : ': sin actividad')
                      }
                    >
                      {active ? (
                        <AppIcon name="check" size={15} />
                      ) : (
                        <span aria-hidden>·</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="goal-streak">
              <AppIcon name={streak.atRisk ? 'time' : 'fire'} size={18} />
              <strong>{streak.days} días de racha</strong>
              <span>· Nivel {level}</span>
            </p>
          </MirabiCard>
          <div className="yuki-note">
            <Yuki state={yuki.state} size={58} halo={false} />
            <div>
              <p>{yuki.text}</p>
              <small>{motivation.encouragement}</small>
            </div>
          </div>
          {activeMission && (
            <div>
              <SectionTitle
                action={
                  <Link to="/misiones" className="text-link">
                    Ver todas
                  </Link>
                }
              >
                Una misión para hoy
              </SectionTitle>
              <MirabiCard
                className="mission-card"
                onClick={() => navigate('/misiones')}
              >
                <div className="flex items-start justify-between gap-3">
                  <AppIcon name="flag" size={24} />
                  <span className="reward-label">
                    +{activeMission.definition.rewardSakura} Sakura
                  </span>
                </div>
                <h3>{activeMission.definition.title}</h3>
                <p>
                  {activeMission.progress.currentProgress} /{' '}
                  {activeMission.definition.targetValue}
                </p>
                <MirabiProgressBar
                  progress={
                    activeMission.progress.currentProgress /
                    activeMission.definition.targetValue
                  }
                  tone="sakura"
                  label="Misión diaria"
                />
              </MirabiCard>
            </div>
          )}
          {dailyPhrase && (
            <MirabiCard className="daily-phrase">
              <div className="flex items-center justify-between">
                <span className="eyebrow">UN DESCUBRIMIENTO AL DÍA</span>
                {isSpeechAvailable() && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Escuchar frase del día"
                    onClick={() => speakJapanese(dailyPhrase.text)}
                  >
                    <AppIcon name="audio" size={20} />
                  </button>
                )}
              </div>
              <p className="font-jp phrase" lang="ja">
                {dailyPhrase.text}
              </p>
              <span>{dailyPhrase.romaji}</span>
              <p className="meaning">{dailyPhrase.meaning}</p>
              {dailyKanji && (
                <Link
                  to={'/caracteres/kanji?kanji=' + dailyKanji.id}
                  className="daily-kanji"
                >
                  <span lang="ja" className="font-jp">
                    {dailyKanji.symbol}
                  </span>
                  <span>
                    Kanji del día<strong>{dailyKanji.meanings[0]}</strong>
                  </span>
                  <AppIcon name="next" size={18} />
                </Link>
              )}
            </MirabiCard>
          )}
        </aside>
      </div>
    </Screen>
  )
}
