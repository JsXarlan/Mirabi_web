import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import App from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import './index.css'

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
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // Sin service worker la app sigue funcionando: solo pierde el modo offline.
      })
  })
}
