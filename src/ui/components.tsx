import { useEffect, useId, useRef } from 'react'
import type { ButtonHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'

/** Puerto de core/designsystem/component: mismos componentes, mismos nombres. */

const cx = (...values: (string | false | null | undefined)[]) =>
  values.filter(Boolean).join(' ')

export function MirabiCard({
  children,
  className,
  onClick,
  disabled,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const base =
    'rounded-[22px] bg-[var(--surface)] shadow-[var(--shadow-card)] border border-[color-mix(in_srgb,var(--outline)_35%,transparent)]'
  if (!onClick) return <div className={cx(base, className)}>{children}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        base,
        'w-full text-left transition active:scale-[0.99] disabled:opacity-55 disabled:active:scale-100',
        !disabled && 'hover:border-[var(--primary)]',
        className,
      )}
    >
      {children}
    </button>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--primary)] text-[var(--on-primary)] hover:brightness-110',
  secondary:
    'bg-[var(--surface-variant)] text-[var(--on-surface)] hover:brightness-105 border border-[var(--outline)]',
  ghost: 'bg-transparent text-[var(--primary)] hover:bg-[var(--surface-variant)]',
  danger: 'bg-[var(--secondary)] text-[var(--on-secondary)] hover:brightness-110',
}

export function MirabiButton({
  children,
  variant = 'primary',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...rest}
      className={cx(
        'w-full rounded-[16px] px-5 py-3.5 text-base font-semibold transition active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function MirabiProgressBar({
  progress,
  className,
  tone = 'primary',
  label = 'Progreso',
}: {
  /** 0..1 */
  progress: number
  className?: string
  tone?: 'primary' | 'success' | 'sakura'
  /** Nombre accesible: una barra sin etiqueta no dice nada en un lector. */
  label?: string
}) {
  const clamped = Math.min(1, Math.max(0, progress))
  const color =
    tone === 'success'
      ? 'var(--success)'
      : tone === 'sakura'
        ? 'var(--secondary)'
        : 'var(--primary)'
  return (
    <div
      className={cx('h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-variant)]', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${clamped * 100}%`, background: color }}
      />
    </div>
  )
}

export function MirabiProgressPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-container)] px-3 py-1 text-sm font-semibold text-[var(--on-primary-container)]">
      {children}
    </span>
  )
}

export function MirabiStatChip({
  icon,
  value,
  label,
}: {
  icon: string
  value: ReactNode
  label: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-[16px] bg-[var(--surface-variant)] px-2 py-3">
      <span aria-hidden className="text-lg">
        {icon}
      </span>
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className="text-center text-[11px] text-[var(--on-surface-variant)]">{label}</span>
    </div>
  )
}

export function MirabiDonutProgress({
  percentage,
  size = 96,
  label,
}: {
  percentage: number
  size?: number
  label?: ReactNode
}) {
  const clamped = Math.min(100, Math.max(0, percentage))
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-variant)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ?? <span className="text-xl font-bold">{Math.round(clamped)}%</span>}
      </div>
    </div>
  )
}

export function MirabiLoading({ message = 'Cargando…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--on-surface-variant)]">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--surface-variant)] border-t-[var(--primary)]" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function MirabiError({
  title = 'No pudimos cargar esta sección.',
  message = 'Revisa tu conexión o inténtalo nuevamente.',
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <MirabiCard className="p-6 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{message}</p>
      {onRetry && (
        <MirabiButton className="mt-4" onClick={onRetry}>
          Reintentar
        </MirabiButton>
      )}
    </MirabiCard>
  )
}

export function MirabiEmpty({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <MirabiCard className="flex flex-col items-center gap-2 p-8 text-center">
      <span aria-hidden className="text-4xl">
        💤
      </span>
      <p className="text-base font-semibold">{title}</p>
      <p className="text-sm text-[var(--on-surface-variant)]">{message}</p>
      {action}
    </MirabiCard>
  )
}

/**
 * Hoja modal: bottom-sheet en movil, centrada a partir de sm.
 *
 * Vivia como componente local de la pantalla de caracteres, sin cierre con
 * Escape ni gestion del foco. Al sacarla aqui se arregla, porque el proximo que
 * la use no deberia heredar el fallo: al abrir, el foco entra en el panel; al
 * cerrar, vuelve a donde estaba, que es lo unico que hace usable un dialogo con
 * teclado.
 */
export function MirabiSheet({
  title,
  onClose,
  children,
}: {
  /** Nombre accesible del dialogo; no se pinta. */
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Por referencia y no por dependencia: quien llama suele pasar una funcion
  // nueva en cada render, y con ella en las dependencias el efecto se
  // reengancharia sin parar, robando el foco en cada pasada.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-t-[28px] bg-[var(--surface)] p-6 outline-none sm:rounded-[28px] animate-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

export function MirabiSearchField({
  value,
  onChange,
  placeholder = 'Buscar',
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Nombre accesible: el placeholder no basta para un lector de pantalla. */
  label: string
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[14px] border border-[var(--outline)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--on-surface)] outline-none placeholder:text-[var(--on-surface-variant)] focus-visible:border-[var(--primary)]"
      />
    </label>
  )
}

/**
 * Fila de chips de seleccion unica. Sin `allLabel` no hay chip «Todas»: es lo
 * que usa el filtro de grado de kanji, donde partir de miles de resultados
 * sueltos no tiene sentido y conviene arrancar con un grado ya elegido.
 */
export function MirabiFilterChips<T extends string>({
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  value: T | null
  onChange: (value: T | null) => void
  options: { value: T; label: string }[]
  allLabel?: string
  className?: string
}) {
  return (
    <div role="radiogroup" className={cx('flex flex-wrap gap-2', className)}>
      {allLabel && <FilterChip active={value === null} label={allLabel} onClick={() => onChange(null)} />}
      {options.map((option) => (
        <FilterChip
          key={option.value}
          active={value === option.value}
          label={option.label}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  )
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cx(
        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'bg-[var(--primary)] text-[var(--on-primary)]'
          : 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)] hover:brightness-95',
      )}
    >
      {label}
    </button>
  )
}

/** Control segmentado. Flechas para moverse, sin perder el foco del tablist. */
export function MirabiTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  // El aria-selected del boton destino no cambia hasta el siguiente render, asi
  // que apuntar por indice es lo unico fiable: buscar «el que ya esta activo»
  // en el mismo tick encontraria el anterior.
  const move = (event: ReactKeyboardEvent<HTMLButtonElement>, from: number, delta: number) => {
    const next = options[(from + delta + options.length) % options.length]
    onChange(next.value)
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    )
    buttons?.[(from + delta + options.length) % options.length]?.focus()
  }

  return (
    <div role="tablist" className={cx('inline-flex rounded-[14px] bg-[var(--surface-variant)] p-1', className)}>
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') move(event, index, 1)
              else if (event.key === 'ArrowLeft') move(event, index, -1)
            }}
            className={cx(
              'flex-1 rounded-[10px] px-4 py-2 text-sm font-semibold transition',
              active
                ? 'bg-[var(--surface)] text-[var(--on-surface)] shadow-[var(--shadow-card)]'
                : 'text-[var(--on-surface-variant)]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-sm font-bold tracking-wide text-[var(--on-surface-variant)] uppercase">
        {children}
      </h2>
      {action}
    </div>
  )
}
