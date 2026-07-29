import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

/** Navegacion oficial: Inicio | Curso | Caracteres | Repaso | Perfil. */
const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/curso', label: 'Curso', icon: '🗺️' },
  { to: '/caracteres', label: 'Caracteres', icon: 'あ' },
  { to: '/repaso', label: 'Repaso', icon: '🔁' },
  { to: '/perfil', label: 'Perfil', icon: '🌸' },
]

export function MirabiBottomBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[color-mix(in_srgb,var(--outline)_45%,transparent)] bg-[var(--surface)]/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl items-stretch pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition',
                  isActive
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={[
                      'flex h-7 w-12 items-center justify-center rounded-full text-base transition',
                      isActive ? 'bg-[var(--primary-container)]' : '',
                    ].join(' ')}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Pantalla principal: con barra inferior y ancho de app. */
export function Screen({
  children,
  title,
  action,
}: {
  children: ReactNode
  title?: string
  action?: ReactNode
}) {
  return (
    <>
      <div className="mx-auto min-h-full max-w-xl px-4 pt-5 pb-nav">
        {title && (
          <header className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            {action}
          </header>
        )}
        {children}
      </div>
      <MirabiBottomBar />
    </>
  )
}

/**
 * Pantalla de sesion (leccion, repaso, practica, conversacion).
 * Sin barra inferior: la spec prohibe navegacion durante ejercicios.
 */
export function SessionScreen({
  children,
  title,
  progress,
  onExit,
}: {
  children: ReactNode
  title: string
  /** 0..1 */
  progress: number
  onExit?: () => void
}) {
  const navigate = useNavigate()
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pt-5 pb-8">
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (onExit ? onExit() : navigate(-1))}
          aria-label="Salir"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-variant)] text-lg"
        >
          ✕
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[var(--on-surface-variant)]">{title}</p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-variant)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
              style={{ width: `${clamped * 100}%` }}
            />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}
