import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/*
 * Igual que build-kana-strokes.mjs pero para el jōyō completo (2136 kanji):
 * mismo origen -KanjiVG indexa por codepoint Unicode, no distingue kana de
 * kanji-, mismo motivo para no correrlo en cada build (aqui son miles de
 * peticiones, no cientos). Se corre a mano cuando el catalogo de kanji cambia
 * y el resultado se versiona en git como kana-strokes.json.
 */

const CONTENT_DIR = join(process.cwd(), 'public', 'content')
const OUT_PATH = join(CONTENT_DIR, 'kanji-strokes.json')
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
  const raw = await readFile(join(CONTENT_DIR, 'kanji.json'), 'utf8')
  const catalog = JSON.parse(raw)

  // Reanuda si ya hay una salida parcial de una corrida anterior: miles de
  // peticiones se pueden cortar a la mitad por la red, y repetir las que ya
  // funcionaron seria tirar minutos de espera.
  let strokes = {}
  try {
    const previous = JSON.parse(await readFile(OUT_PATH, 'utf8'))
    strokes = previous.strokes ?? {}
  } catch {
    // Sin salida previa: se arranca de cero.
  }

  const missing = []
  let fetched = 0
  for (const item of catalog.kanji) {
    if (strokes[item.learningItemId]) continue
    const entry = await fetchStrokes(item.symbol)
    if (!entry) {
      missing.push(item.id)
      continue
    }
    strokes[item.learningItemId] = entry
    fetched += 1
    // Igual pausa que build-kana-strokes.mjs: el CDN de GitHub raw es
    // generoso, pero miles de peticiones seguidas sin pausa no cuestan nada
    // amable.
    await new Promise((resolve) => setTimeout(resolve, 60))
    if (fetched % 100 === 0) {
      console.log(`build-kanji-strokes: ${fetched} nuevos (${Object.keys(strokes).length}/${catalog.kanji.length})`)
      // Guardado incremental: si el proceso se corta, la proxima corrida
      // retoma desde aqui en vez de perder todo lo bajado hasta ahora.
      await writeFile(
        OUT_PATH,
        JSON.stringify({ schemaVersion: 1, version: '2024-kanjivg', source: 'KanjiVG', license: 'CC BY-SA 3.0', strokes }),
      )
    }
  }

  if (missing.length > 0) {
    console.warn(`build-kanji-strokes: sin trazo para ${missing.length} kanji: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '…' : ''}`)
  }

  const output = {
    schemaVersion: 1,
    version: '2024-kanjivg',
    source: 'KanjiVG',
    license: 'CC BY-SA 3.0',
    strokes,
  }
  await writeFile(OUT_PATH, JSON.stringify(output))
  console.log(`build-kanji-strokes: ${Object.keys(strokes).length}/${catalog.kanji.length} kanji -> ${OUT_PATH}`)
}

await main()
