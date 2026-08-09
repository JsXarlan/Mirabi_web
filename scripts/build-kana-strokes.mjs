import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/*
 * Conversion unica, sin build: baja de KanjiVG el trazo de cada kana del
 * catalogo y lo compacta en public/content/kana-strokes.json. No se corre en
 * cada build -las 142 peticiones a GitHub lo harian lento y fragil-, se corre
 * a mano cuando el catalogo de kana cambia. El resultado se versiona en git
 * como cualquier otro contenido estatico.
 */

const CONTENT_DIR = join(process.cwd(), 'public', 'content')
const OUT_PATH = join(CONTENT_DIR, 'kana-strokes.json')
const KANJIVG_BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji'

function codepointOf(symbol) {
  return symbol.codePointAt(0).toString(16).padStart(5, '0')
}

function parseStrokeSvg(svg) {
  const viewBoxMatch = svg.match(/<svg[^>]*\sviewBox="([^"]+)"/)
  if (!viewBoxMatch) return null
  const paths = [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((match) => match[1])
  if (paths.length === 0) return null
  return { paths, viewBox: viewBoxMatch[1] }
}

async function fetchStrokes(symbol) {
  const url = `${KANJIVG_BASE}/${codepointOf(symbol)}.svg`
  const response = await fetch(url)
  if (!response.ok) return null
  return parseStrokeSvg(await response.text())
}

async function main() {
  const raw = await readFile(join(CONTENT_DIR, 'characters.json'), 'utf8')
  const catalog = JSON.parse(raw)
  const kana = catalog.characters.filter((c) => c.script === 'HIRAGANA' || c.script === 'KATAKANA')

  const strokes = {}
  const missing = []
  for (const character of kana) {
    const entry = await fetchStrokes(character.symbol)
    if (!entry) {
      missing.push(character.id)
      continue
    }
    strokes[character.learningItemId] = entry
    // GitHub raw esta detras de un CDN generoso, pero no hay razon para
    // martillarlo: una pausa chica entre 142 pedidos no cuesta nada.
    await new Promise((resolve) => setTimeout(resolve, 60))
  }

  if (missing.length > 0) {
    console.warn(`build-kana-strokes: sin trazo para ${missing.length} caracteres: ${missing.join(', ')}`)
  }

  const output = {
    schemaVersion: 1,
    version: '2024-kanjivg',
    source: 'KanjiVG',
    license: 'CC BY-SA 3.0',
    strokes,
  }
  await writeFile(OUT_PATH, JSON.stringify(output))
  console.log(`build-kana-strokes: ${Object.keys(strokes).length}/${kana.length} caracteres -> ${OUT_PATH}`)
}

await main()
