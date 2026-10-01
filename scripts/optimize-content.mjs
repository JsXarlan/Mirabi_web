import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/*
 * Minifica el contenido publicado.
 *
 * El pack lo genera el exportador de Kotlin en JSON indentado, que se lee bien
 * en el repo pero pesa 1,1 MB al servirlo y hay que parsearlo entero en el
 * arranque. Aqui se minifica sobre `dist`, nunca sobre `public`: la fuente
 * sigue siendo legible y la siguiente exportacion no encuentra sorpresas.
 */

const DIST_DIR = join(process.cwd(), 'dist')
const CONTENT_DIR = join(DIST_DIR, 'content')
const ASSETS_DIR = join(DIST_DIR, 'assets')
const SW_PATH = join(DIST_DIR, 'sw.js')

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function minifyContent() {
  let files
  try {
    files = (await readdir(CONTENT_DIR)).filter((name) => name.endsWith('.json'))
  } catch {
    console.warn('optimize-content: no hay dist/content, nada que hacer.')
    return []
  }

  for (const name of files) {
    const path = join(CONTENT_DIR, name)
    const before = (await stat(path)).size
    const minified = JSON.stringify(JSON.parse(await readFile(path, 'utf8')))
    await writeFile(path, minified)
    const after = Buffer.byteLength(minified)
    console.log(
      `optimize-content: ${name} ${kb(before)} -> ${kb(after)} (-${Math.round((1 - after / before) * 100)}%)`,
    )
  }
  return files
}

/*
 * Mismo esqueleto que precachea `install` en public/sw.js (SHELL). Si un
 * fichero se añade ahi hay que añadirlo aqui tambien, o un cambio en el no
 * subiria el hash de VERSION.
 */
const SHELL_FILES = [
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-maskable.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
]

/*
 * VERSION del service worker.
 *
 * public/sw.js trae una version a mano: si un despliegue cambia la logica de
 * cache y nadie se acuerda de subir ese numero, el `activate` no purga nada y
 * quien esta offline se queda atascado en la version vieja. Aqui se calcula
 * un hash corto a partir de lo que de verdad cambia -el esqueleto, los assets
 * con hash de Vite y el contenido ya minificado- y se sustituye la constante
 * en dist/sw.js, sin tocar la fuente en public/. Sin el esqueleto en el hash,
 * un cambio que solo toque index.html (por ejemplo la CSP) no se detectaria:
 * el service worker seguiria sirviendo el shell viejo desde cache.
 */
async function versionServiceWorker(contentFiles) {
  let swSource
  try {
    swSource = await readFile(SW_PATH, 'utf8')
  } catch {
    console.warn('optimize-content: no hay dist/sw.js, no se versiona.')
    return
  }

  const assetNames = await readdir(ASSETS_DIR).catch(() => [])
  const hash = createHash('sha256')
  for (const name of SHELL_FILES) {
    const content = await readFile(join(DIST_DIR, name)).catch(() => null)
    if (content) hash.update(content)
  }
  for (const name of [...assetNames].sort()) hash.update(name)
  for (const name of [...contentFiles].sort()) {
    hash.update(name)
    hash.update(await readFile(join(CONTENT_DIR, name)))
  }
  const shortHash = hash.digest('hex').slice(0, 10)

  const versioned = swSource.replace(
    /const VERSION = '[^']*'/,
    `const VERSION = 'mirabi-${shortHash}'`,
  )
  if (versioned === swSource) {
    console.warn('optimize-content: no se encontro la constante VERSION en dist/sw.js.')
    return
  }
  await writeFile(SW_PATH, versioned)
  console.log(`optimize-content: sw.js VERSION -> mirabi-${shortHash}`)
}

async function main() {
  const contentFiles = await minifyContent()
  await versionServiceWorker(contentFiles)
}

await main()
