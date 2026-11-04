#!/usr/bin/env node
// axiomancer-mobile/scripts/bake-backings.mjs — one soft backing per foe
// (phase AP1d, spec 146).
//
//   node scripts/bake-backings.mjs            # bake every foe, write provenance
//   node scripts/bake-backings.mjs --dry-run  # report sizes, write nothing
//
// A foe's art was alpha-matted by keying black out of a painting, so its dark
// strokes are holes: over an engraved arena plate they show the plate. A
// backing is a dark shape drawn directly under the foe that fills them.
//
// Combat draws animation CELLS, not the roster still, so the backing is cut
// from the cells: T's ruling, "One per foe, all cells". Every cell of a foe is
// overlaid into one matte, so one file serves every frame and the frame engine
// does not change. A foe that moves a lot gets a looser aura, which T accepted:
// "slight aura around is okay so you don't have to make it fit perfectly".
//
// A matte is the same square as the foe's cells and is drawn in the same box
// with the same fit and position, so it registers with the figure by
// construction. It bakes black; the pane tints it to the theme's `AXM.bg`.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const ENEMIES = path.join(MOBILE, 'assets', 'images', 'enemies')
export const BACKINGS = path.join(ENEMIES, 'backing')

/**
 * The one tuning block. Distances are fractions of the cell's edge, so the aura
 * is the same size on screen whichever edge a foe's set was cut at (152 to 256).
 */
export const BACKING_TUNING = {
  /** A pixel at or above this alpha, in any cell, is part of the foe. */
  threshold: 64,
  /** Morphological close: seals gaps between strokes narrower than twice this. */
  closeFrac: 0.016,
  /** A detached island smaller than this share of the cell (a stray spark) is dropped. */
  islandFrac: 0.004,
  /** How far the closed, hole-filled shape grows past the figure: the aura. */
  growFrac: 0.016,
  /** Gaussian feather on the grown edge. */
  featherFrac: 0.009,
  /** WebP terms. The alpha plane is all a matte holds, so it stays lossless. */
  quality: 30,
  alphaQuality: 100,
}

/** `key.backing.webp`, as near the spec's `<sprite>.backing.webp` as a folder allows. */
export const backingFile = (key) => `${key}.backing.webp`

/** What a foe draws in combat: its cells when it has a set, else its still. */
export function drawnFiles(key, enemiesDir = ENEMIES) {
  const dir = path.join(enemiesDir, 'anim', key)
  if (fs.existsSync(dir)) {
    const cells = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.webp')).sort()
    if (cells.length > 0) return cells.map((c) => path.join(dir, c))
  }
  return [path.join(enemiesDir, `${key}.webp`)]
}

/** The roster: every `<key>.webp` beside the registry. */
export function rosterKeys(enemiesDir = ENEMIES) {
  return fs.readdirSync(enemiesDir)
    .filter((f) => f.toLowerCase().endsWith('.webp'))
    .map((f) => f.replace(/\.webp$/i, ''))
    .sort()
}

/** One image's alpha plane, read as real values. */
export async function readAlpha(sharp, file) {
  // The bytes, not the path: sharp keeps a path's file open, which on Windows
  // stops a caller deleting it afterwards.
  const input = typeof file === 'string' ? fs.readFileSync(file) : file
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const alpha = new Uint8Array(info.width * info.height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]
  return { alpha, width: info.width, height: info.height }
}

/**
 * True when a plane has any pixel below full opacity. This reads VALUES because
 * the file's `hasAlpha` flag proves nothing: a still can declare an alpha plane
 * that is 255 almost everywhere, and an encoder can drop a plane it found flat.
 */
export const hasTransparency = (alpha) => alpha.some((a) => a < 255)

/** The per-pixel maximum across planes of one size. Refuses mixed sizes. */
export function unionAlpha(planes) {
  const [{ width, height }] = planes
  const out = new Uint8Array(width * height)
  for (const plane of planes) {
    if (plane.width !== width || plane.height !== height) {
      throw new Error(`bake-backings: cells differ in size (${plane.width}x${plane.height} against ${width}x${height})`)
    }
    for (let i = 0; i < out.length; i++) if (plane.alpha[i] > out[i]) out[i] = plane.alpha[i]
  }
  return { alpha: out, width, height }
}

/** The pixel offsets of a disc, for dilate and erode. */
function discOffsets(radius) {
  const r = Math.ceil(radius)
  const out = []
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= radius * radius) out.push([dx, dy])
  }
  return out
}

/** Set every pixel the disc reaches from a pixel holding `seed`. */
function spread(mask, width, height, radius, seed) {
  const offsets = discOffsets(radius)
  const out = new Uint8Array(mask.length).fill(seed ? 0 : 1)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] !== seed) continue
      for (const [dx, dy] of offsets) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) out[ny * width + nx] = seed
      }
    }
  }
  return out
}

export const dilate = (mask, width, height, radius) => spread(mask, width, height, radius, 1)
export const erode = (mask, width, height, radius) => spread(mask, width, height, radius, 0)

/** Fill every background region that does not reach the canvas edge. */
export function fillHoles(mask, width, height) {
  const outside = new Uint8Array(mask.length)
  const stack = []
  const visit = (i) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1
      stack.push(i)
    }
  }
  for (let x = 0; x < width; x++) {
    visit(x)
    visit((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    visit(y * width)
    visit(y * width + width - 1)
  }
  while (stack.length) {
    const i = stack.pop()
    const x = i % width
    if (x > 0) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (i >= width) visit(i - width)
    if (i + width < mask.length) visit(i + width)
  }
  return outside.map((o) => (o ? 0 : 1))
}

/**
 * Drop every connected region below `minPixels`. A spark that leaves a foe's
 * body in one frame would otherwise hang a dark blot in the air on all of them.
 */
export function dropIslands(mask, width, minPixels) {
  const out = new Uint8Array(mask.length)
  const seen = new Uint8Array(mask.length)
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    const region = [start]
    seen[start] = 1
    for (let at = 0; at < region.length; at++) {
      const i = region[at]
      const x = i % width
      const around = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]
      for (const n of around) {
        if (n >= 0 && n < mask.length && mask[n] && !seen[n]) {
          seen[n] = 1
          region.push(n)
        }
      }
    }
    if (region.length >= minPixels) for (const i of region) out[i] = 1
  }
  return out
}

/**
 * The matte's alpha from a foe's cells: union, threshold, close holes, drop
 * islands, grow, feather. The closed shape is held at full opacity through the feather, so the
 * blur can only soften the aura and never thin the backing under the figure.
 */
export async function bakeAlpha(sharp, planes, tuning = BACKING_TUNING) {
  const { alpha, width, height } = unionAlpha(planes)
  const mask = alpha.map((a) => (a >= tuning.threshold ? 1 : 0))
  const closeR = Math.max(1, width * tuning.closeFrac)
  const closed = erode(dilate(mask, width, height, closeR), width, height, closeR)
  // A close can only erode back what its dilate added, so the figure stays in.
  for (let i = 0; i < closed.length; i++) if (mask[i]) closed[i] = 1
  const filled = dropIslands(fillHoles(closed, width, height), width, width * height * tuning.islandFrac)
  const grown = dilate(filled, width, height, Math.max(1, width * tuning.growFrac))
  // sharp hands a one-channel input back with three channels, so step by the
  // count it reports: reading it as one channel smears the matte into stripes.
  const { data: blurred, info } = await sharp(Buffer.from(grown.map((v) => v * 255)), { raw: { width, height, channels: 1 } })
    .blur(Math.max(0.3, width * tuning.featherFrac))
    .raw()
    .toBuffer({ resolveWithObject: true })
  const out = new Uint8Array(width * height)
  for (let i = 0; i < out.length; i++) out[i] = filled[i] ? 255 : blurred[i * info.channels]
  return { alpha: out, width, height }
}

/** A black image carrying that alpha, as WebP bytes. */
export function encodeMatte(sharp, { alpha, width, height }, tuning = BACKING_TUNING) {
  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < alpha.length; i++) rgba[i * 4 + 3] = alpha[i]
  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .webp({ quality: tuning.quality, alphaQuality: tuning.alphaQuality, effort: 6 })
    .toBuffer()
}

/** One foe's provenance entry: its licence is the cells' own. */
export function provenanceEntry(key, enemiesDir, date) {
  const recordPath = path.join(enemiesDir, 'anim', key, 'provenance.json')
  const [cells] = JSON.parse(fs.readFileSync(recordPath, 'utf-8'))
  const t = BACKING_TUNING
  const entry = {
    generated_by: 'derived',
    date,
    tool: 'scripts/bake-backings.mjs (sharp)',
    model: 'none - no image model was called and nothing was spent',
    post_process: `union of alpha across every cell, threshold ${t.threshold}, close ${t.closeFrac}, `
      + `fill holes, drop islands under ${t.islandFrac} of the cell, grow ${t.growFrac}, feather ${t.featherFrac} (fractions of the cell edge), black, `
      + `WebP q${t.quality}, lossless alpha`,
    graded: false,
    license: cells.license,
    source: `anim/${key}/, every cell. Holds only their silhouette: no pixel of colour survives.`,
    covers: [backingFile(key)],
  }
  if (cells.license_note) entry.license_note = cells.license_note
  return entry
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const { default: sharp } = await import('sharp')
  const date = new Date().toISOString().slice(0, 10)
  if (!dryRun) fs.mkdirSync(BACKINGS, { recursive: true })
  const records = []
  let total = 0
  for (const key of rosterKeys()) {
    const planes = await Promise.all(drawnFiles(key).map((f) => readAlpha(sharp, f)))
    const matte = await bakeAlpha(sharp, planes)
    const bytes = await encodeMatte(sharp, matte)
    total += bytes.length
    const covered = matte.alpha.reduce((n, a) => n + (a > 0 ? 1 : 0), 0) / matte.alpha.length
    console.log(`${key.padEnd(18)} ${matte.width}px  ${String(bytes.length).padStart(5)} B  ${(covered * 100).toFixed(1)}% of the cell`)
    if (!dryRun) fs.writeFileSync(path.join(BACKINGS, backingFile(key)), bytes)
    records.push(provenanceEntry(key, ENEMIES, date))
  }
  if (!dryRun) {
    fs.writeFileSync(path.join(BACKINGS, 'provenance.json'), `${JSON.stringify(records, null, 2)}\n`)
  }
  console.log(`\nbake-backings: ${records.length} matte(s), ${total} B${dryRun ? ' (dry run)' : ''}`)
}

// pathToFileURL, not a `file://` prefix: on Windows `argv[1]` is `C:\...`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1) })
}
