import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import App from './App'
import { initAuth } from './core/auth/authManager'
import { initSync } from './core/sync/syncEngine'
import { ErrorBoundary } from './ui/ErrorBoundary'
import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/nunito/wght.css'
import './index.css'
import './art.css'
// No bloqueante: la app es 100% usable desde localStorage aunque esto falle o tarde.
initAuth()
initSync()

// HashRouter: GitHub Pages sirve estatico y no puede reescribir rutas profundas.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)

/*
 * Service worker solo en produccion: en desarrollo interceptaria el HMR de Vite
 * y serviria modulos viejos, que es un rato muy largo de depuracion tonta.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {
        // Sin service worker la app sigue funcionando: solo pierde el modo offline.
      })
  })
}
