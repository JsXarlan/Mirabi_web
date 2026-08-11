import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { SakuraFall } from './illustrations'
import { Yuki } from './Yuki'

/** Navegacion oficial: Inicio | Curso | Caracteres | Palabras | Repaso | Perfil. */
const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/curso', label: 'Curso', icon: '🗺️' },
  { to: '/caracteres', label: 'Caracteres', icon: 'あ' },
  { to: '/palabras', label: 'Palabras', icon: '📚' },
  { to: '/repaso', label: 'Repaso', icon: '🔁' },
  { to: '/perfil', label: 'Perfil', icon: '🌸' },
]

/** Barra inferior: la navegacion de movil. */
function MirabiBottomBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[color-mix(in_srgb,var(--outline)_45%,transparent)] bg-[var(--surface)]/95 backdrop-blur lg:hidden"
    >
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

/**
 * Carril lateral: la navegacion de escritorio.
 *
 * En un monitor ancho, una barra inferior obliga a bajar la vista al borde de la
 * pantalla y deja 700 px muertos a los lados. El carril aprovecha ese espacio y
 * da a la web una forma propia sin cambiar la informacion ni el orden.
 */
function MirabiSideRail() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed top-0 bottom-0 left-0 z-20 hidden w-60 flex-col border-r border-[color-mix(in_srgb,var(--outline)_45%,transparent)] bg-[var(--surface)] px-4 py-6 lg:flex xl:w-64"
    >
      <div className="mb-8 flex items-center gap-3 px-2">
        <Yuki size={44} halo={false} />
        <div>
          <p className="text-lg leading-none font-bold">Mirabi</p>
          <p className="mt-1 text-[11px] text-[var(--on-surface-variant)]">未来 + 学び</p>
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition',
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                    : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)] hover:text-[var(--on-surface)]',
                ].join(' ')
              }
            >
              <span aria-hidden className="w-5 text-center text-base">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-[var(--surface-variant)] pt-4">
        <ul className="flex flex-col gap-1">
          {[
            { to: '/conversaciones', label: 'Conversaciones', icon: '💬' },
            { to: '/analisis', label: 'Puntos débiles', icon: '📊' },
            { to: '/misiones', label: 'Misiones', icon: '🎯' },
            { to: '/tienda', label: 'Tienda', icon: '🛍️' },
            { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
          ].map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-[14px] px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-[var(--surface-variant)] font-semibold text-[var(--on-surface)]'
                      : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)]',
                  ].join(' ')
                }
              >
                <span aria-hidden className="w-5 text-center">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

/** Pantalla principal: con navegacion y ancho de lectura. */
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
      <SakuraFall />
      <MirabiSideRail />
      <div className="lg:pl-60 xl:pl-64">
        <div className="mx-auto min-h-full max-w-xl px-4 pt-5 pb-nav lg:pb-10">
          {title && (
            <header className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold">{title}</h1>
              {action}
            </header>
          )}
          {children}
        </div>
      </div>
      <MirabiBottomBar />
    </>
  )
}

/**
 * Pantalla de sesion (leccion, repaso, practica, conversacion).
 * Sin navegacion: la spec prohibe salir por accidente durante ejercicios.
 */
export function SessionScreen({
  children,
  title,
  progress,
  onExit,
  /** Pista de teclado bajo la barra. Solo aparece si el paso acepta atajos. */
  hint,
}: {
  children: ReactNode
  title: string
  /** 0..1 */
  progress: number
  onExit?: () => void
  hint?: ReactNode
}) {
  const navigate = useNavigate()
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 pt-5 pb-8">
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (onExit ? onExit() : navigate(-1))}
          aria-label="Salir de la sesión"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-variant)] text-lg"
        >
          ✕
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[var(--on-surface-variant)]">{title}</p>
          <div
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-variant)]"
            role="progressbar"
            aria-label="Progreso de la sesión"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamped * 100)}
          >
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
              style={{ width: `${clamped * 100}%` }}
            />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      {hint && (
        <p className="mt-3 hidden text-center text-[11px] text-[var(--on-surface-variant)] sm:block">
          {hint}
        </p>
      )}
    </div>
  )
}
