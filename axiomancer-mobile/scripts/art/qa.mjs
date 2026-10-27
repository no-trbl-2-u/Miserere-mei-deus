// scripts/art/qa.mjs — style-drift metrics (phase 73).
//
// The route ruling makes the A->B migration trigger "a measurement, not a
// calendar date — the QA loop reports it". This is that measurement's
// mechanical half.
//
// What it does NOT do: judge whether an image looks right. That needs vision,
// and faking it with a number would be worse than not having it — a green
// "style score" nobody can interrogate is how a drifting set gets shipped. The
// vision-assisted grade is a named follow-up (design doc §4.6).
//
// What it DOES do is report the proxies that are computable and that actually
// moved when the current temp art drifted: how far each asset's palette sits
// from the AXM tokens, how its luminance is distributed (the house look is
// dark with sparse highlights, so a rising mean is the first sign of a model
// lightening its output), whether cutouts still carry alpha, and whether the
// dimensions conform. Per asset and per category, so a category that starts
// wandering is visible before the whole set has.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { PALETTE } from './style.mjs'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const IMAGES = path.join(MOBILE, 'assets', 'images')
const RASTER = new Set(['.webp', '.png', '.jpg', '.jpeg'])
const SKIP_DIRS = new Set(['android', 'ios', 'web'])

/** Longest edge the conventions allow (`docs/asset-conventions.md` §1). */
export const MAX_EDGE = 640

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
]
const PALETTE_RGB = Object.values(PALETTE).map(hexToRgb)

/** Distance from a pixel to the nearest palette token, 0..441. */
export function paletteDistance(r, g, b) {
  let best = Infinity
  for (const [pr, pg, pb] of PALETTE_RGB) {
    const d = Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2)
    if (d < best) best = d
  }
  return best
}

/** Every raster asset under assets/images, as `{ category, file, abs }`. */
export function artAssets(dir = IMAGES, rel = '') {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      out.push(...artAssets(path.join(dir, entry.name), rel ? `${rel}/${entry.name}` : entry.name))
    } else if (RASTER.has(path.extname(entry.name).toLowerCase()) && rel !== '') {
      out.push({ category: rel, file: entry.name, abs: path.join(dir, entry.name) })
    }
  }
  return out
}

/** Metrics for one asset. Downsampled hard — this is a trend series, not a proof. */
export async function measure(sharp, asset) {
  const image = sharp(asset.abs)
  const meta = await image.metadata()
  // 32x32 is enough for distribution shape and keeps a 100-asset sweep instant.
  const { data, info } = await image.clone().resize(32, 32, { fit: 'inside' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  let lumSum = 0
  let paletteSum = 0
  let opaque = 0
  const pixels = info.width * info.height
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    if (a > 8) opaque++
    lumSum += 0.2126 * r + 0.7152 * g + 0.0722 * b
    paletteSum += paletteDistance(r, g, b)
  }

  return {
    category: asset.category,
    file: asset.file,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    overSized: Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_EDGE,
    hasAlpha: Boolean(meta.hasAlpha),
    alphaCoverage: Number((opaque / pixels).toFixed(3)),
    meanLuminance: Number((lumSum / pixels).toFixed(1)),
    paletteDistance: Number((paletteSum / pixels).toFixed(1)),
    bytes: fs.statSync(asset.abs).size,
  }
}

/** Roll per-asset metrics up per category — where drift shows first. */
export function summarize(rows) {
  const byCategory = new Map()
  for (const row of rows) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, [])
    byCategory.get(row.category).push(row)
  }
  const mean = (xs) => Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1))
  return [...byCategory.entries()].map(([category, items]) => ({
    category,
    assets: items.length,
    meanLuminance: mean(items.map((i) => i.meanLuminance)),
    paletteDistance: mean(items.map((i) => i.paletteDistance)),
    overSized: items.filter((i) => i.overSized).length,
    alphaCutouts: items.filter((i) => i.hasAlpha && i.alphaCoverage < 0.95).length,
    meanKb: mean(items.map((i) => i.bytes / 1024)),
  })).sort((a, b) => a.category.localeCompare(b.category))
}

async function main() {
  const { default: sharp } = await import('sharp')
  const assets = artAssets()
  if (assets.length === 0) {
    console.error('art-qa: found no assets to grade — the layout moved. Fix the sweep.')
    process.exit(1)
  }
  const rows = []
  for (const asset of assets) rows.push(await measure(sharp, asset))
  const summary = summarize(rows)

  console.log(`art-qa: ${rows.length} assets across ${summary.length} categories\n`)
  console.log('category            n   lum   palΔ  over  cutouts   avgKB')
  for (const s of summary) {
    console.log(
      `${s.category.padEnd(18)} ${String(s.assets).padStart(3)}  `
        + `${String(s.meanLuminance).padStart(5)} ${String(s.paletteDistance).padStart(5)}  `
        + `${String(s.overSized).padStart(4)}  ${String(s.alphaCutouts).padStart(7)}  `
        + `${String(s.meanKb).padStart(6)}`,
    )
  }
  console.log(
    '\nlum = mean luminance (the house look is dark; a rising series is a model lightening).'
      + '\npalΔ = mean distance to the nearest AXM palette token (rising = colour wandering).'
      + '\nThese are the mechanical proxies only. Perceptual drift needs the vision pass'
      + '\n(design doc §4.6) — no number here should be read as "the style is fine".',
  )
  if (process.argv.includes('--json')) {
    fs.writeFileSync(
      path.join(MOBILE, 'docs', 'reports', 'art-qa-latest.json'),
      `${JSON.stringify({ summary, assets: rows }, null, 2)}\n`,
    )
    console.log('\nwrote docs/reports/art-qa-latest.json')
  }
}

// pathToFileURL, not a `file://` prefix: on Windows `argv[1]` is `C:\...` and
// the naive compare never matches (the same fix as `ingest-art.mjs`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1) })
}
