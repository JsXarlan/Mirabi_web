import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import type { CharacterCatalog } from './core/content/types'
import {
  loadCharacterCatalog,
  loadCoursePack,
  loadKanjiCatalog,
  loadWordCatalog,
} from './core/content/loader'
import {
  validateCatalog,
  validateCoursePack,
  validateKanjiCatalog,
  validateWordCatalog,
} from './core/content/validate'
import { epochDayOf } from './core/domain/models'
import { shouldRemindOnOpen, showReminderNotification } from './core/notifications'
import { useMirabiStore } from './core/store/useMirabiStore'
import { MirabiError, MirabiLoading } from './ui/components'

// Ruta critica -curso, leccion, repaso-: se queda en el bundle inicial porque
// es lo primero que abre casi todo el mundo.
import { HomeScreen } from './features/home/HomeScreen'
import { CourseScreen } from './features/course/CourseScreen'
import { UnitDetailScreen } from './features/course/UnitDetailScreen'
import { LessonIntroScreen } from './features/lesson/LessonIntroScreen'
import { LessonScreen } from './features/lesson/LessonScreen'
import { LessonResultScreen } from './features/lesson/LessonResultScreen'
import { CharactersScreen } from './features/characters/CharactersScreen'
import { CharacterScriptScreen } from './features/characters/CharacterScriptScreen'
import { CharacterPracticeScreen } from './features/characters/CharacterPracticeScreen'
import { ReviewScreen } from './features/review/ReviewScreen'
import { ReviewSessionScreen } from './features/review/ReviewSessionScreen'
import { ConversationsScreen } from './features/conversation/ConversationsScreen'
import { ConversationSessionScreen } from './features/conversation/ConversationSessionScreen'
import { MissionsScreen } from './features/missions/MissionsScreen'
import { ProfileScreen } from './features/profile/ProfileScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { WeakPointsScreen } from './features/analysis/WeakPointsScreen'

// Pantallas menos frecuentadas: se cargan bajo demanda para no pesar en el
// arranque de quien solo viene a hacer una leccion.
const PremiumScreen = lazy(() =>
  import('./features/premium/PremiumScreen').then((m) => ({ default: m.PremiumScreen })),
)
const ShopScreen = lazy(() => import('./features/shop/ShopScreen').then((m) => ({ default: m.ShopScreen })))
const OnboardingFlow = lazy(() =>
  import('./features/onboarding/OnboardingFlow').then((m) => ({ default: m.OnboardingFlow })),
)
const PlacementScreen = lazy(() =>
  import('./features/onboarding/PlacementScreen').then((m) => ({ default: m.PlacementScreen })),
)
const WorldExamScreen = lazy(() =>
  import('./features/exam/WorldExamScreen').then((m) => ({ default: m.WorldExamScreen })),
)
const KanjiScreen = lazy(() => import('./features/kanji/KanjiScreen').then((m) => ({ default: m.KanjiScreen })))
const KanjiPracticeScreen = lazy(() =>
  import('./features/kanji/KanjiPracticeScreen').then((m) => ({ default: m.KanjiPracticeScreen })),
)

/**
 * Palabras y kanji se piden despues del curso y sin esperarlos.
 *
 * No hacen falta para estudiar, asi que bloquear el arranque por ellos seria
 * cambiar lo importante por lo accesorio. Pero pedirlos igualmente, aunque
 * todavia no los mire nadie, es lo que hace que la biblioteca funcione sin red:
 * el service worker cachea /content/*.json cuando pasan por el, no antes. Sin
 * esta llamada, la primera visita a la biblioteca estando sin conexion se
 * quedaria vacia.
 *
 * Un fallo aqui deja un aviso, no una pantalla de error: el curso sigue.
 */
function prewarmCatalogs(catalog: CharacterCatalog): void {
  void (async () => {
    const store = () => useMirabiStore.getState()
    try {
      const words = await loadWordCatalog()
      const wordCheck = validateWordCatalog(words, catalog)
      if (!wordCheck.ok) {
        store().setContentWarning(wordCheck.errors.join(' '))
        return
      }
      store().setWordCatalog(words)

      /*
       * El kanji es el fichero mas pesado del catalogo (1+ MB minificado) y
       * casi nadie lo abre al entrar. Se sigue pidiendo -por la misma razon
       * de arriba: que la biblioteca funcione offline desde la primera
       * visita- pero en un rato ocioso, para no competir por ancho de banda
       * ni CPU con la carga inicial del curso.
       */
      whenIdle(() => {
        void (async () => {
          try {
            const kanji = await loadKanjiCatalog()
            const kanjiCheck = validateKanjiCatalog(kanji, words)
            if (!kanjiCheck.ok) {
              store().setContentWarning(kanjiCheck.errors.join(' '))
              return
            }
            store().setKanjiCatalog(kanji)
          } catch (error: unknown) {
            store().setContentWarning(
              error instanceof Error ? error.message : 'La biblioteca no se pudo cargar.',
            )
          }
        })()
      })
    } catch (error: unknown) {
      store().setContentWarning(
        error instanceof Error ? error.message : 'La biblioteca no se pudo cargar.',
      )
    }
  })()
}

/** requestIdleCallback con reserva para Safari, que todavia no lo implementa. */
function whenIdle(callback: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout: 4000 })
  } else {
    setTimeout(callback, 1)
  }
}

/** Aplica el tema elegido al documento; 'system' sigue al sistema operativo. */
function useAppliedTheme() {
  const theme = useMirabiStore((state) => state.theme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

/**
 * Aviso al abrir: la unica forma de recordatorio que funciona en todos los
 * navegadores. El de fondo, cuando existe, lo lanza el service worker.
 */
function useOpenReminder() {
  const enabled = useMirabiStore((state) => state.reminderEnabled)
  const reminderHour = useMirabiStore((state) => state.reminderHour)
  const lastActivityEpochDay = useMirabiStore((state) => state.lastActivityEpochDay)
  const streakDays = useMirabiStore((state) => state.streakDays)

  useEffect(() => {
    const now = new Date()
    const shouldRemind = shouldRemindOnOpen({
      enabled,
      reminderHour,
      lastActivityEpochDay,
      today: epochDayOf(now.getTime()),
      now,
    })
    if (shouldRemind) showReminderNotification(streakDays)
    // Solo al montar: recordar dos veces en la misma visita es ruido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function useScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
}

export default function App() {
  const pack = useMirabiStore((state) => state.pack)
  const contentError = useMirabiStore((state) => state.contentError)
  const setContent = useMirabiStore((state) => state.setContent)
  const setContentError = useMirabiStore((state) => state.setContentError)
  const onboardingCompleted = useMirabiStore((state) => state.onboardingCompleted)
  const initialLevel = useMirabiStore((state) => state.initialLevel)
  const placementDecided = useMirabiStore((state) => state.placementDecided)

  useAppliedTheme()
  useScrollReset()
  useOpenReminder()

  useEffect(() => {
    let cancelled = false
    Promise.all([loadCoursePack(), loadCharacterCatalog()])
      .then(([coursePack, catalog]) => {
        if (cancelled) return
        // Mejor un mensaje claro ahora que una leccion vacia dentro de tres
        // pantallas: el pack viene de otro repo y puede llegar a medias.
        const checks = [validateCoursePack(coursePack), validateCatalog(catalog)]
        const errors = checks.flatMap((check) => check.errors)
        if (errors.length > 0) {
          setContentError(errors.join(' '))
          return
        }
        setContent(coursePack, catalog)
        prewarmCatalogs(catalog)
      })
      .catch((error: unknown) => {
        if (!cancelled) setContentError(error instanceof Error ? error.message : 'Error desconocido')
      })
    return () => {
      cancelled = true
    }
  }, [setContent, setContentError])

  if (contentError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <MirabiError
          title="No pudimos cargar el contenido del curso."
          message={contentError}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  if (!pack) {
    return <MirabiLoading message="Preparando tu camino…" />
  }

  if (!onboardingCompleted) {
    return (
      <Suspense fallback={<MirabiLoading />}>
        <Routes>
          <Route path="/onboarding/*" element={<OnboardingFlow />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Suspense>
    )
  }

  /*
   * Quien declara saber algo pasa por la colocacion antes de ver el curso: es
   * el momento en que la promesa del onboarding se cumple o se rompe.
   */
  if (!placementDecided && initialLevel !== null && initialLevel !== 'FROM_ZERO') {
    return (
      <Suspense fallback={<MirabiLoading />}>
        <Routes>
          <Route path="/colocacion" element={<PlacementScreen />} />
          <Route path="*" element={<Navigate to="/colocacion" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<MirabiLoading />}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/curso" element={<CourseScreen />} />
        <Route path="/curso/unidad/:unitId" element={<UnitDetailScreen />} />
        <Route path="/leccion/:lessonId" element={<LessonIntroScreen />} />
        <Route path="/leccion/:lessonId/sesion" element={<LessonScreen />} />
        <Route path="/leccion/:lessonId/resultado" element={<LessonResultScreen />} />
        <Route path="/caracteres" element={<CharactersScreen />} />
        {/* Estatico antes que :script, aunque el ranking de React Router ya lo garantiza. */}
        <Route path="/caracteres/kanji" element={<KanjiScreen />} />
        <Route path="/caracteres/kanji/practica" element={<KanjiPracticeScreen />} />
        <Route path="/caracteres/:script" element={<CharacterScriptScreen />} />
        <Route path="/caracteres/:script/practica" element={<CharacterPracticeScreen />} />
        <Route path="/repaso" element={<ReviewScreen />} />
        <Route path="/repaso/sesion" element={<ReviewSessionScreen />} />
        <Route path="/conversaciones" element={<ConversationsScreen />} />
        <Route path="/conversaciones/:lessonId" element={<ConversationSessionScreen />} />
        <Route path="/examen/:worldId" element={<WorldExamScreen />} />
        <Route path="/analisis" element={<WeakPointsScreen />} />
        <Route path="/misiones" element={<MissionsScreen />} />
        <Route path="/perfil" element={<ProfileScreen />} />
        <Route path="/ajustes" element={<SettingsScreen />} />
        <Route path="/premium" element={<PremiumScreen />} />
        <Route path="/tienda" element={<ShopScreen />} />
        <Route path="/onboarding/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
