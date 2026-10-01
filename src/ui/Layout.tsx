import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useMirabiStore } from '../core/store/useMirabiStore'
import { epochDayOf } from '../core/domain/models'
import { streakStatus } from '../core/domain/rewards'
import { AppIcon } from './Icons'
import { MirabiBrand } from './Brand'
import { Artwork, artworkForRoute } from './Artwork'
import { MirabiProgressBar } from './components'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/curso', label: 'Curso', icon: 'course' },
  { to: '/caracteres', label: 'Caracteres', icon: 'characters' },
  { to: '/repaso', label: 'Repaso', icon: 'review' },
  { to: '/perfil', label: 'Perfil', icon: 'profile' },
]
const PRACTICE_ITEMS = [
  { to: '/palabras', label: 'Vocabulario', icon: 'words' },
  { to: '/conversaciones', label: 'Conversaciones', icon: 'conversation' },
  { to: '/misiones', label: 'Misiones', icon: 'target' },
  { to: '/analisis', label: 'Puntos débiles', icon: 'chart' },
]
const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/curso': 'Un pequeño paso hoy. Un nuevo mundo mañana.',
  '/caracteres': 'Descubre los trazos que dan forma a un idioma.',
  '/palabras': 'Cada palabra abre una nueva conversación.',
  '/repaso': 'Lo que practicas hoy, se queda contigo.',
  '/perfil': 'Tu historia de aprendizaje, paso a paso.',
  '/conversaciones': 'Lleva lo aprendido a situaciones de todos los días.',
  '/misiones': 'Pequeños objetivos para construir tu hábito.',
  '/ajustes': 'Haz que Mirabi se adapte a ti.',
  '/analisis': 'Descubre qué puedes reforzar en tu próxima práctica.',
  '/tienda': 'Cuida tu hábito con las Sakura que has ganado.',
  '/premium': 'Un poco más de comodidad en tu camino.',
}

function pageLabelForPath(pathname: string) {
  const exactLabels: Record<string, string> = {
    '/': 'Inicio',
    '/curso': 'Curso',
    '/caracteres': 'Caracteres',
    '/caracteres/kanji': 'Kanji',
    '/caracteres/kanji/practica': 'Práctica de kanji',
    '/caracteres/kanji/confundibles': 'Kanji confundibles',
    '/caracteres/kanji/radicales': 'Radicales kanji',
    '/caracteres/kanji/lectura': 'Lectura de kanji',
    '/caracteres/kanji/jukugo': 'Compuestos kanji',
    '/palabras': 'Vocabulario',
    '/palabras/estudio': 'Tarjetas de vocabulario',
    '/palabras/practica': 'Práctica de vocabulario',
    '/repaso': 'Repaso',
    '/repaso/sesion': 'Sesión de repaso',
    '/conversaciones': 'Conversaciones',
    '/analisis': 'Puntos débiles',
    '/misiones': 'Misiones',
    '/perfil': 'Perfil',
    '/ajustes': 'Ajustes',
    '/premium': 'Mirabi Plus',
    '/tienda': 'Tienda Sakura',
  }
  if (exactLabels[pathname]) return exactLabels[pathname]
  if (pathname.startsWith('/curso/unidad/')) return 'Unidad del curso'
  if (pathname.startsWith('/leccion/')) return 'Lección'
  if (pathname.startsWith('/conversaciones/')) return 'Conversación'
  if (pathname.startsWith('/examen/')) return 'Examen del mundo'

  const characterMatch = pathname.match(/^\/caracteres\/([^/]+)(?:\/(practica|escritura))?$/)
  if (characterMatch) {
    const script = characterMatch[1]
    const mode = characterMatch[2]
    const name = script === 'hiragana' ? 'hiragana' : script === 'katakana' ? 'katakana' : script
    if (mode === 'practica') return `Práctica de ${name}`
    if (mode === 'escritura') return `Escritura de ${name}`
    return name === 'hiragana' || name === 'katakana' ? name[0].toUpperCase() + name.slice(1) : 'Caracteres'
  }
  return [...NAV_ITEMS, ...PRACTICE_ITEMS].find((item) => item.to === pathname)?.label ?? 'Aprendizaje'
}

function NavigationLink({
  item,
  mobile = false,
}: {
  item: (typeof NAV_ITEMS)[number]
  mobile?: boolean
}) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        (mobile ? 'bottom-nav-link' : 'rail-link') +
        (isActive ? ' is-active' : '')
      }
    >
      {({ isActive }) => (
        <>
          <span className="nav-icon">
            <AppIcon name={item.icon} weight={isActive ? 'fill' : 'regular'} />
          </span>
          <span>{item.label}</span>
          {!mobile && isActive && <span className="rail-active-dot" />}
        </>
      )}
    </NavLink>
  )
}

function MirabiSideRail() {
  return (
    <aside className="side-rail">
      <Link to="/" aria-label="Mirabi, ir al inicio" className="rail-brand">
        <MirabiBrand />
      </Link>
      <p className="rail-caption">TU CAMINO</p>
      <nav aria-label="Navegación principal">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavigationLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <p className="rail-caption rail-caption-practice">EXPLORA Y PRACTICA</p>
      <nav aria-label="Práctica y aprendizaje">
        <ul>
          {PRACTICE_ITEMS.map((item) => (
            <li key={item.to}>
              <NavigationLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="rail-bottom">
        <div className="rail-note">
          <AppIcon name="leaf" size={24} />
          <p>
            A tu ritmo.
            <br />
            <strong>Un poquito cada día.</strong>
          </p>
        </div>
        <nav aria-label="Preferencias">
          <Link to="/tienda" className="rail-link">
            <AppIcon name="shop" />
            <span>Tienda Sakura</span>
          </Link>
          <Link to="/ajustes" className="rail-link">
            <AppIcon name="settings" />
            <span>Ajustes</span>
          </Link>
        </nav>
        <span className="rail-footer">Hecho para tu japonés del mañana.</span>
      </div>
    </aside>
  )
}

function MirabiBottomBar() {
  return (
    <nav aria-label="Navegación principal móvil" className="bottom-nav">
      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavigationLink item={item} mobile />
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ThemeToggle() {
  const theme = useMirabiStore((state) => state.theme)
  const setTheme = useMirabiStore((state) => state.setTheme)
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={dark ? 'Usar tema claro' : 'Usar tema oscuro'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <AppIcon name={dark ? 'sun' : 'moon'} size={21} />
    </button>
  )
}

function AppHeader() {
  const { pathname } = useLocation()
  const name = useMirabiStore((state) => state.displayName)
  const sakura = useMirabiStore((state) => state.sakura)
  const streakDays = useMirabiStore((state) => state.streakDays)
  const lastActive = useMirabiStore((state) => state.lastActivityEpochDay)
  const streak = streakStatus(streakDays, lastActive, epochDayOf(Date.now()))
  const pageLabel = pageLabelForPath(pathname)
  return (
    <header className="app-header">
      <Link to="/" className="mobile-brand" aria-label="Mirabi, inicio">
        <MirabiBrand compact />
      </Link>
      <div className="header-context">
        <span>Tu espacio de aprendizaje</span>
        <strong>{pageLabel}</strong>
      </div>
      <div className="header-actions">
        <Link
          to="/perfil"
          className="header-stat"
          aria-label={streak.days + ' días de racha'}
        >
          <AppIcon name="fire" size={20} />
          <span>
            {streak.days}
            <span className="header-stat-label"> días</span>
          </span>
        </Link>
        <Link
          to="/tienda"
          className="header-stat sakura-stat"
          aria-label={sakura + ' Sakura'}
        >
          <AppIcon name="flower" size={20} />
          <span>{sakura}</span>
        </Link>
        <ThemeToggle />
        <Link
          to="/perfil"
          className="header-avatar"
          aria-label="Abrir mi perfil"
        >
          {(name ?? 'M').slice(0, 1).toUpperCase()}
        </Link>
      </div>
    </header>
  )
}

export function Screen({
  children,
  title,
  subtitle,
  action,
  wide = false,
}: {
  children: ReactNode
  title?: string
  subtitle?: string
  action?: ReactNode
  wide?: boolean
}) {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    const heading = mainRef.current?.querySelector('h1')
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
    } else {
      mainRef.current?.focus({ preventScroll: true })
    }
  }, [pathname])
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          mainRef.current?.focus()
        }}
      >
        Saltar al contenido
      </a>
      <MirabiSideRail />
      <div className="app-body">
        <AppHeader />
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className={'page-content' + (wide ? ' page-wide' : '')}
        >
          {title && (
            <header className="page-heading">
              <Artwork name={artworkForRoute(pathname)} className="heading-art" size={144} eager />
              <div>
                <p className="eyebrow">APRENDE · PRACTICA · CRECE</p>
                <h1>{title}</h1>
                {(subtitle ?? PAGE_DESCRIPTIONS[pathname]) && (
                  <p className="page-subtitle">
                    {subtitle ?? PAGE_DESCRIPTIONS[pathname]}
                  </p>
                )}
              </div>
              {action}
            </header>
          )}
          {children}
        </main>
        <footer className="page-footer">
          <span lang="ja">未来 + 学び</span>
          <span>Tu japonés empieza con un pequeño paso.</span>
        </footer>
      </div>
      <MirabiBottomBar />
    </div>
  )
}

export function SessionScreen({
  children,
  title,
  progress,
  onExit,
  hint,
}: {
  children: ReactNode
  title: string
  progress: number
  onExit?: () => void
  hint?: ReactNode
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const sessionArt = pathname.startsWith('/conversaciones') ? 'tea'
    : pathname.startsWith('/palabras') || pathname.startsWith('/repaso') ? 'cards'
      : pathname.includes('kanji') ? 'brush' : 'scroll'
  const clamped = Math.min(1, Math.max(0, progress))

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <main className="session-layout" id="main-content">
      <div className="session-brand">
        <MirabiBrand />
        <ThemeToggle />
      </div>
      <section className="session-panel">
        <header className="session-header">
          <button
            type="button"
            className="icon-button"
            onClick={() => (onExit ? onExit() : navigate(-1))}
            aria-label="Salir de la sesión"
          >
            <AppIcon name="close" />
          </button>
          <div className="session-progress">
            <div className="session-progress-label">
              <h1
                ref={titleRef}
                tabIndex={-1}
                className="text-sm font-semibold"
              >
                {title}
              </h1>
              <strong>{Math.round(clamped * 100)}%</strong>
            </div>
            <MirabiProgressBar
              progress={clamped}
              label="Progreso de la sesión"
            />
          </div>
        </header>
        <div className="session-content">{children}</div>
        {hint && (
          <p className="session-hint">
            <kbd>↵</kbd> {hint}
          </p>
        )}
      </section>
      <p className="session-caption">
        <Artwork name={sessionArt} size={48} eager /> Aquí, cada intento cuenta.
      </p>
    </main>
  )
}
