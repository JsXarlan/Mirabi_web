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

const CONTENT_DIR = join(process.cwd(), 'dist', 'content')

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

async function main() {
  let files
  try {
    files = (await readdir(CONTENT_DIR)).filter((name) => name.endsWith('.json'))
  } catch {
    console.warn('optimize-content: no hay dist/content, nada que hacer.')
    return
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
}

await main()
