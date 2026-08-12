import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { epochDayOf, levelFromXp, xpIntoLevel, XP_PER_LEVEL } from '../../core/domain/models'
import { motivationCopy } from '../../core/domain/motivation'
import { buildHomeRecommendation } from '../../core/domain/recommendations'
import { streakStatus } from '../../core/domain/rewards'
import { buildWeakPoints } from '../../core/domain/weakpoints'
import { resolveHomeTrigger, yukiReaction } from '../../core/domain/yuki'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { isSpeechAvailable, speakJapanese } from '../../core/audio/speech'
import {
  MirabiButton,
  MirabiCard,
  MirabiProgressBar,
  MirabiStatChip,
  SectionTitle,
} from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { Yuki } from '../../ui/Yuki'

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
  const lastActivityEpochDay = useMirabiStore((state) => state.lastActivityEpochDay)
  const sakura = useMirabiStore((state) => state.sakura)
  const totalXp = useMirabiStore((state) => state.totalXp)
  const dailyGoalXp = useMirabiStore((state) => state.dailyGoalXp)
  const dailyActivity = useMirabiStore((state) => state.dailyActivity)
  const activityEpochDay = useMirabiStore((state) => state.activityEpochDay)
  const totalLessonsCompleted = useMirabiStore((state) => state.totalLessonsCompleted)
  const totalReviewsCompleted = useMirabiStore((state) => state.totalReviewsCompleted)
  const totalConversationsCompleted = useMirabiStore((state) => state.totalConversationsCompleted)
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
  const nextUnit = nextLesson ? (index?.unitById.get(nextLesson.unitId) ?? null) : null
  const nextWorld = nextUnit ? (index?.worldById.get(nextUnit.worldId) ?? null) : null

  const activeMission = missions.find((mission) => !mission.progress.completed) ?? missions[0]

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
    const withExample = catalog.characters.filter((character) => character.examples.length > 0)
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
  const goalProgress = dailyGoalXp > 0 ? todayActivity.xpEarnedToday / dailyGoalXp : 0

  return (
    <Screen>
      <header className="mb-5 flex items-center gap-3">
        <Yuki state={yuki.state} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--on-surface-variant)]">{greeting()}</p>
          <h1 className="truncate text-xl font-bold">{displayName ?? 'Bienvenido a Mirabi'}</h1>
        </div>
        <Link
          to="/ajustes"
          aria-label="Ajustes"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-variant)] text-lg"
        >
          ⚙️
        </Link>
      </header>

      {/* Yuki dice algo, no solo pone cara: es su unico momento fuera de los
          resultados, y el que recoge volver tras unos dias. */}
      <MirabiCard className="mb-5 p-4">
        <p className="text-sm">{yuki.text}</p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          {motivation.icon} {motivation.encouragement}
        </p>
      </MirabiCard>

      <div className="mb-5 flex gap-2">
        <MirabiStatChip
          icon={streak.atRisk ? '⏳' : '🔥'}
          value={streak.days}
          label={streak.atRisk ? 'Racha (hoy no)' : 'Racha'}
        />
        <MirabiStatChip icon="🌸" value={sakura} label="Sakura" />
        <MirabiStatChip icon="⭐" value={`Nv ${level}`} label={`${xpIntoLevel(totalXp)}/${XP_PER_LEVEL} XP`} />
      </div>

      {/* Accion principal: la tarjeta visualmente dominante de la pantalla. */}
      <MirabiCard className="mb-5 overflow-hidden p-0">
        <div className="bg-[var(--primary)] px-5 py-4 text-[var(--on-primary)]">
          <p className="text-xs font-semibold opacity-90">
            {nextWorld ? nextWorld.title : 'Tu camino'}
            {nextUnit ? ` · ${nextUnit.title}` : ''}
          </p>
          <h2 className="mt-0.5 text-xl font-bold">
            {nextLesson ? nextLesson.title : '¡Curso completado!'}
          </h2>
        </div>
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-[var(--on-surface-variant)]">Progreso del curso</span>
            <span className="font-semibold">
              {courseMap?.courseProgress.completedLessons ?? 0}/
              {courseMap?.courseProgress.totalLessons ?? 0} lecciones
            </span>
          </div>
          <MirabiProgressBar progress={(courseMap?.overallProgressPercentage ?? 0) / 100} />
          <MirabiButton
            className="mt-4"
            disabled={!nextLesson}
            onClick={() => nextLesson && navigate(`/leccion/${nextLesson.id}`)}
          >
            {totalLessonsCompleted === 0 ? 'Empezar mi primera lección' : 'Continuar lección'}
          </MirabiButton>
        </div>
      </MirabiCard>

      {recommendation && (
        <>
          <SectionTitle>Recomendado para ti</SectionTitle>
          <MirabiCard className="mb-5 p-5">
            <p className="text-sm font-semibold">{recommendation.title}</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">{recommendation.reason}</p>
            {recommendationAction && (
              <MirabiButton
                className="mt-3"
                variant="secondary"
                onClick={() => navigate(recommendationAction.to)}
              >
                {recommendationAction.label}
              </MirabiButton>
            )}
          </MirabiCard>
        </>
      )}

      <SectionTitle>Objetivo diario</SectionTitle>
      <MirabiCard className="mb-5 p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">
            {todayActivity.xpEarnedToday} / {dailyGoalXp} XP
          </span>
          {todayActivity.dailyGoalCompleted && (
            <span className="text-sm font-semibold text-[var(--success)]">Completado ✓</span>
          )}
        </div>
        <MirabiProgressBar
          progress={goalProgress}
          tone={todayActivity.dailyGoalCompleted ? 'success' : 'primary'}
        />
      </MirabiCard>

      {activeMission && (
        <>
          <SectionTitle
            action={
              <Link to="/misiones" className="text-xs font-semibold text-[var(--primary)]">
                Ver todas
              </Link>
            }
          >
            Misión diaria
          </SectionTitle>
          <MirabiCard className="mb-5 p-5" onClick={() => navigate('/misiones')}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{activeMission.definition.title}</p>
                <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                  {activeMission.progress.currentProgress}/{activeMission.definition.targetValue}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--tertiary-container)] px-3 py-1 text-xs font-bold text-[var(--on-tertiary-container)]">
                +{activeMission.definition.rewardSakura} 🌸
              </span>
            </div>
            <MirabiProgressBar
              className="mt-3"
              tone="sakura"
              progress={
                activeMission.progress.currentProgress / activeMission.definition.targetValue
              }
            />
          </MirabiCard>
        </>
      )}

      <SectionTitle>Repaso</SectionTitle>
      <MirabiCard className="mb-5 p-5" onClick={() => navigate('/repaso')}>
        {pendingReviews.length > 0 ? (
          <>
            <p className="text-sm font-semibold">
              {pendingReviews.length}{' '}
              {pendingReviews.length === 1 ? 'elemento listo' : 'elementos listos'} para reforzar
            </p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              Tus errores se convierten en aprendizaje.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">Todo al día</p>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              No hay nada pendiente de repaso ahora mismo.
            </p>
          </>
        )}
      </MirabiCard>

      {dailyPhrase && (
        <>
          <SectionTitle>Frase del día</SectionTitle>
          <MirabiCard className="mb-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-jp text-2xl font-semibold">{dailyPhrase.text}</p>
                <p className="text-sm text-[var(--on-surface-variant)]">{dailyPhrase.romaji}</p>
                <p className="mt-1 text-sm">{dailyPhrase.meaning}</p>
              </div>
              {isSpeechAvailable() && (
                <button
                  type="button"
                  aria-label="Escuchar frase del día"
                  onClick={() => speakJapanese(dailyPhrase.text)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-container)] text-lg"
                >
                  🔊
                </button>
              )}
            </div>
          </MirabiCard>
        </>
      )}

      {dailyKanji && (
        <>
          <SectionTitle>Kanji del día</SectionTitle>
          {/* Tarjeta clicable entera: MirabiCard con onClick renderiza un
              <button>, asi que aca no puede ir el AudioButton anidado como en
              la Frase del dia -boton dentro de boton no es HTML valido-. El
              audio ya esta a un toque, dentro de la ficha que abre. */}
          <MirabiCard
            className="mb-5 p-5"
            onClick={() => navigate(`/caracteres/kanji?kanji=${dailyKanji.id}`)}
          >
            <p className="font-jp text-4xl font-semibold">{dailyKanji.symbol}</p>
            <p className="mt-1 text-sm">{dailyKanji.meanings[0]}</p>
          </MirabiCard>
        </>
      )}

      <SectionTitle>Tu actividad</SectionTitle>
      <div className="mb-5 flex gap-2">
        <MirabiStatChip icon="📘" value={totalLessonsCompleted} label="Lecciones" />
        <MirabiStatChip icon="🔁" value={totalReviewsCompleted} label="Repasos" />
        <MirabiStatChip icon="💬" value={totalConversationsCompleted} label="Conversaciones" />
        <MirabiStatChip
          icon="📅"
          value={activeDays.filter((day) => day > today - 7).length}
          label="Días (7)"
        />
      </div>

      <MirabiCard className="p-4" onClick={() => navigate('/conversaciones')}>
        <p className="text-sm font-semibold">Conversaciones guiadas</p>
        <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
          Usa lo aprendido en un diálogo real.
        </p>
      </MirabiCard>
    </Screen>
  )
}
