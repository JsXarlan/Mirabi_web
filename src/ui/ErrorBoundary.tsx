import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Yuki } from './Yuki'

/**
 * Ultima red antes de la pantalla en blanco.
 *
 * Sin esto, cualquier error de render deja el documento vacio y sin explicacion.
 * Con service worker es peor: la version rota queda cacheada y recargar devuelve
 * exactamente el mismo fallo, asi que la salida de emergencia tiene que poder
 * vaciar la cache y desregistrar el worker.
 */

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

async function clearCachesAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } finally {
    // Recarga siempre, aunque limpiar haya fallado: es lo que pidio la persona.
    window.location.reload()
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No hay backend al que enviar esto; la consola es el unico destino honesto.
    console.error('Mirabi se rompió al dibujar la pantalla', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-5 py-16">
        <div className="rounded-[22px] border border-[var(--outline)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex justify-center"><Yuki state="SAD" size={120} /></div>
          <p className="text-lg font-bold">Algo se rompió por aquí</p>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
            Tu progreso está a salvo: vive en este navegador y no se ha tocado.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="w-full rounded-[16px] bg-[var(--primary)] px-5 py-3.5 font-semibold text-[var(--on-primary)]"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => void clearCachesAndReload()}
              className="w-full rounded-[16px] border border-[var(--outline)] bg-[var(--surface-variant)] px-5 py-3.5 font-semibold"
            >
              Vaciar caché y recargar
            </button>
          </div>

          <details className="mt-5">
            <summary className="cursor-pointer text-xs text-[var(--on-surface-variant)]">
              Detalle técnico
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-[12px] bg-[var(--surface-variant)] p-3 text-[11px] whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
