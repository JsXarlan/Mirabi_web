import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { loadCharacterCatalog, loadCoursePack } from './core/content/loader'
import { useMirabiStore } from './core/store/useMirabiStore'
import { MirabiError, MirabiLoading } from './ui/components'

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
import { PremiumScreen } from './features/premium/PremiumScreen'
import { ShopScreen } from './features/shop/ShopScreen'
import { OnboardingFlow } from './features/onboarding/OnboardingFlow'

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

  useAppliedTheme()
  useScrollReset()

  useEffect(() => {
    let cancelled = false
    Promise.all([loadCoursePack(), loadCharacterCatalog()])
      .then(([coursePack, catalog]) => {
        if (!cancelled) setContent(coursePack, catalog)
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
      <Routes>
        <Route path="/onboarding/*" element={<OnboardingFlow />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/curso" element={<CourseScreen />} />
      <Route path="/curso/unidad/:unitId" element={<UnitDetailScreen />} />
      <Route path="/leccion/:lessonId" element={<LessonIntroScreen />} />
      <Route path="/leccion/:lessonId/sesion" element={<LessonScreen />} />
      <Route path="/leccion/:lessonId/resultado" element={<LessonResultScreen />} />
      <Route path="/caracteres" element={<CharactersScreen />} />
      <Route path="/caracteres/:script" element={<CharacterScriptScreen />} />
      <Route path="/caracteres/:script/practica" element={<CharacterPracticeScreen />} />
      <Route path="/repaso" element={<ReviewScreen />} />
      <Route path="/repaso/sesion" element={<ReviewSessionScreen />} />
      <Route path="/conversaciones" element={<ConversationsScreen />} />
      <Route path="/conversaciones/:lessonId" element={<ConversationSessionScreen />} />
      <Route path="/misiones" element={<MissionsScreen />} />
      <Route path="/perfil" element={<ProfileScreen />} />
      <Route path="/ajustes" element={<SettingsScreen />} />
      <Route path="/premium" element={<PremiumScreen />} />
      <Route path="/tienda" element={<ShopScreen />} />
      <Route path="/onboarding/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
