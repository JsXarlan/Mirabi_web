/*
 * Service worker de Mirabi.
 *
 * El README prometia que "todo funciona offline" porque no hay backend, pero el
 * curso se pide por fetch: sin red, recargar dejaba la app en blanco. Con esto
 * la promesa se cumple de verdad y la app se puede instalar.
 *
 * Escrito a mano y sin build: el nombre de los assets lo pone Vite con un hash,
 * asi que en vez de precachear una lista que caducaria, se cachea lo que se va
 * pidiendo y se precachea solo el esqueleto.
 */

const VERSION = 'mirabi-v1'
const SHELL_CACHE = `${VERSION}-shell`
const CONTENT_CACHE = `${VERSION}-content`
const ASSET_CACHE = `${VERSION}-assets`

const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Si un recurso del esqueleto falla no se aborta la instalacion entera.
      .then((cache) => Promise.allSettled(SHELL.map((path) => cache.add(path))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

/** Cache primero y revalidacion en segundo plano. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  if (cached) return cached
  const response = await network
  if (response) return response
  throw new Error('Sin red y sin copia en cache')
}

/**
 * Cache primero, sin revalidar. Solo para lo que lleva hash en el nombre: si
 * el nombre coincide, el contenido tambien, asi que pedirlo otra vez a la red
 * en cada carga no cambia nada y solo gasta datos.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

/*
 * Recordatorio diario. Solo llega donde el navegador implementa Periodic
 * Background Sync (Chromium con la app instalada); en el resto, la app avisa
 * al abrirse. No se inventa una promesa que no se pueda cumplir.
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'mirabi-daily-reminder') return
  event.waitUntil(
    self.registration.showNotification('Mirabi', {
      body: 'Un rato corto de japonés y hoy también cuenta.',
      icon: './icon.svg',
      tag: 'mirabi-daily-reminder',
    }),
  )
})

// Tocar la notificacion abre la app, reutilizando la pestaña si ya estaba.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => 'focus' in client)
      return open ? open.focus() : self.clients.openWindow('./')
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegacion: red primero para no servir un index viejo, cache si no hay red.
  // Con HashRouter cualquier ruta entra por el mismo documento.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE)
        return (await cache.match('./index.html')) ?? (await cache.match('./')) ?? Response.error()
      }),
    )
    return
  }

  // El pack de contenido cambia con cada version del curso, no cada dia.
  if (url.pathname.includes('/content/') && url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(request, CONTENT_CACHE))
    return
  }

  // Los assets llevan hash en el nombre: si el nombre coincide, el contenido tambien.
  if (url.pathname.includes('/assets/') || /\.(js|css|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE))
  }
})
