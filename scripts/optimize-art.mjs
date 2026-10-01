import { readFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const sharp = require(process.env.MIRABI_SHARP_PATH || 'sharp')
const inputDirectory = process.argv[2]
if (!inputDirectory) throw new Error('Usage: node scripts/optimize-art.mjs <original PNG directory>')
const manifest = JSON.parse(await readFile('design-system/mirabi-web/art-manifest.json', 'utf8'))
const output = 'src/assets/art'
await mkdir(output, { recursive: true })
let bytes = 0
for (const asset of manifest) {
  for (const width of asset.widths) {
    const target = path.join(output, `${asset.name}-${width}.webp`)
    // Format conversion and proportional resizing only; preserve original alpha.
    await sharp(path.join(inputDirectory, asset.source))
      .resize({ width }).webp({ quality: 84, alphaQuality: 100, effort: 6 }).toFile(target)
    bytes += (await stat(target)).size
  }
}
console.log(`${manifest.length} illustrations optimized: ${Math.round(bytes / 1024)} KiB across all responsive sizes`)

