#!/usr/bin/env node
// axiomancer-mobile/scripts/bake-backings.mjs — a dark backing for every cell a
// foe draws (phase AP1d, spec 146; cut per cell by 146.8, AP1h).
//
//   node scripts/bake-backings.mjs            # bake every foe, write registry + provenance
//   node scripts/bake-backings.mjs --dry-run  # report sizes, write nothing
//
// A foe's art was alpha-matted by keying black out of a painting, so its dark
// strokes are holes: over an engraved arena plate they show the plate. A
// backing is a dark shape drawn directly under the foe that fills them.
//
// ONE BACKING PER CELL, cut from that cell alone, and drawn under that cell by
// the frame player, so it changes with the frame. 146.4 cut one matte per foe
// from the union of all its cells, grown and feathered; a foe that moves (the
// float-eye bobs) got a matte far wider than any single frame, and T saw a
// huge soft black blob around it in the v0.4.0 preview (2026-11-04): "It
// should also only be within the shape of the enemy." So nothing here grows the
// shape: threshold, close the gaps between strokes, fill the holes, drop specks,
// and at most a pixel of feather on the edge.
//
// A backing is the same square as its cell and is drawn in the same box with
// the same fit and position, so it registers with the figure by construction.
// It bakes black; the frame player tints it to the theme's `AXM.bg`.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const ENEMIES = path.join(MOBILE, 'assets', 'images', 'enemies')
export const BACKINGS = path.join(ENEMIES, 'backing')

/**
 * The one tuning block. The close is a fraction of the cell's edge, so it seals
 * the same on-screen gap whichever edge a foe's set was cut at (152 to 256).
 * There is no grow: the backing stays inside the foe's own shape (146.8).
 */
export const BACKING_TUNING = {
  /** A pixel at or above this alpha, in the cell, is part of the foe. */
  threshold: 64,
  /** Morphological close: seals gaps between strokes narrower than twice this. */
  closeFrac: 0.012,
  /** A detached island smaller than this share of the cell (a speck of keying noise) is dropped. */
  islandFrac: 0.0005,
  /** Gaussian feather on the edge, in pixels: antialiasing, not an aura. */
  featherPx: 0.6,
}

/** The backing for one drawn file: `float-eye-07.webp` -> `float-eye-07.backing.webp`. */
export const backingFile = (drawn) => `${path.basename(drawn).replace(/\.webp$/i, '')}.backing.webp`

/** Where a foe's backings live: one folder per foe. */
export const backingDir = (key, backingsDir = BACKINGS) => path.join(backingsDir, key)

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

/** The figure's own filled shape: the cell above threshold, its holes filled. No close, no grow. */
export function figureShape({ alpha, width, height }, tuning = BACKING_TUNING) {
  return fillHoles(alpha.map((a) => (a >= tuning.threshold ? 1 : 0)), width, height)
}

/**
 * One cell's backing alpha: threshold, close the gaps between strokes, fill
 * holes, drop islands, and a sub-pixel feather. The shape is held at full
 * opacity through the feather, so the blur only antialiases the edge outward
 * by about a pixel and never thins the backing under the figure. Nothing grows it.
 */
export async function bakeAlpha(sharp, plane, tuning = BACKING_TUNING) {
  const { alpha, width, height } = plane
  const mask = alpha.map((a) => (a >= tuning.threshold ? 1 : 0))
  const closeR = Math.max(1, width * tuning.closeFrac)
  const closed = erode(dilate(mask, width, height, closeR), width, height, closeR)
  // A close can only erode back what its dilate added, so the figure stays in.
  for (let i = 0; i < closed.length; i++) if (mask[i]) closed[i] = 1
  const filled = dropIslands(fillHoles(closed, width, height), width, width * height * tuning.islandFrac)
  // sharp hands a one-channel input back with three channels, so step by the
  // count it reports: reading it as one channel smears the matte into stripes.
  const { data: blurred, info } = await sharp(Buffer.from(filled.map((v) => v * 255)), { raw: { width, height, channels: 1 } })
    .blur(Math.max(0.3, tuning.featherPx))
    .raw()
    .toBuffer({ resolveWithObject: true })
  const out = new Uint8Array(width * height)
  for (let i = 0; i < out.length; i++) out[i] = filled[i] ? 255 : blurred[i * info.channels]
  return { alpha: out, width, height }
}

/** A black image carrying that alpha, as lossless WebP bytes (a flat colour costs almost nothing). */
export function encodeMatte(sharp, { alpha, width, height }) {
  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < alpha.length; i++) rgba[i * 4 + 3] = alpha[i]
  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toBuffer()
}

const asList = (record) => (Array.isArray(record) ? record : [record])

/** One foe's provenance entry: its licence is the cells' own (or the still's, for a foe with no set). */
export function provenanceEntry(key, files, enemiesDir, date) {
  const cellRecord = path.join(enemiesDir, 'anim', key, 'provenance.json')
  const source = fs.existsSync(cellRecord)
    ? asList(JSON.parse(fs.readFileSync(cellRecord, 'utf-8')))[0]
    : asList(JSON.parse(fs.readFileSync(path.join(enemiesDir, 'provenance.json'), 'utf-8')))[0]
  const t = BACKING_TUNING
  const entry = {
    generated_by: 'derived',
    date,
    tool: 'scripts/bake-backings.mjs (sharp)',
    model: 'none - no image model was called and nothing was spent',
    post_process: `one backing per cell, from that cell alone: threshold ${t.threshold}, close ${t.closeFrac} of the cell edge, `
      + `fill holes, drop islands under ${t.islandFrac} of the cell, no grow, feather ${t.featherPx}px, black, lossless WebP`,
    graded: false,
    license: source.license,
    source: `anim/${key}/, each cell backed by the file of the same index. Holds only the silhouette: no pixel of colour survives.`,
    covers: files.map((f) => backingFile(f)),
  }
  if (source.license_note) entry.license_note = source.license_note
  return entry
}

/** The registry, generated: Metro resolves `require()` statically, so every literal is spelled out. */
export function registrySource(foes) {
  const L = [
    '/**',
    ' * Enemy BACKINGS: a dark shape under every cell a foe draws. GENERATED by',
    ' * `node scripts/bake-backings.mjs`; do not edit by hand.',
    ' *',
    " * A foe's art was alpha-matted by keying BLACK out of a painting, so its dark",
    ' * strokes are holes and an arena plate would read straight through them. Each',
    ' * cell has its own backing, cut from that cell alone (threshold, close, fill',
    ' * holes, no grow), in the same order as the cells, so the frame player draws',
    " * backing `i` under cell `i` and the black stays inside the foe's shape on",
    ' * every frame (146.8; the one matte per foe of 146.4, a union of every cell,',
    " * drew a blob around a foe that moves). It bakes black; the player tints it to",
    " * the theme's `AXM.bg`, and the pane passes it only while arena plates show.",
    ' *',
    ' * `scripts/enemy-backings.test.mjs` fails when a foe that draws transparent art',
    " * lacks a backing for any cell, or when a backing reaches past its cell's shape.",
    ' */',
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    'export const ENEMY_BACKINGS: Readonly<Record<string, readonly ImageSourcePropType[]>> = {',
  ]
  for (const { key, files } of foes) {
    L.push(`    '${key}': [`)
    for (const f of files) L.push(`        require('./${key}/${backingFile(f)}'),`)
    L.push('    ],')
  }
  L.push(
    '};',
    '',
    "/** The foe's backings, one per drawn cell in cell order, or null for a key with none. */",
    'export function getEnemyBacking(artKey: string | null | undefined): readonly ImageSourcePropType[] | null {',
    '    if (!artKey || !Object.prototype.hasOwnProperty.call(ENEMY_BACKINGS, artKey)) return null;',
    '    return ENEMY_BACKINGS[artKey];',
    '}',
  )
  return `${L.join('\n')}\n`
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const { default: sharp } = await import('sharp')
  const date = new Date().toISOString().slice(0, 10)
  const foes = []
  let total = 0
  let count = 0
  if (!dryRun) {
    // Retire whatever was baked before (146.4's flat one-per-foe mattes included).
    for (const e of fs.readdirSync(BACKINGS, { withFileTypes: true })) {
      if (e.isDirectory() || /\.webp$/i.test(e.name) || e.name === 'provenance.json') {
        fs.rmSync(path.join(BACKINGS, e.name), { recursive: true, force: true })
      }
    }
  }
  for (const key of rosterKeys()) {
    const files = drawnFiles(key)
    const planes = await Promise.all(files.map((f) => readAlpha(sharp, f)))
    if (!planes.some((p) => hasTransparency(p.alpha))) continue
    const dir = backingDir(key)
    if (!dryRun) fs.mkdirSync(dir, { recursive: true })
    let bytesForFoe = 0
    for (const [i, plane] of planes.entries()) {
      const bytes = await encodeMatte(sharp, await bakeAlpha(sharp, plane))
      bytesForFoe += bytes.length
      if (!dryRun) fs.writeFileSync(path.join(dir, backingFile(files[i])), bytes)
    }
    total += bytesForFoe
    count += files.length
    console.log(`${key.padEnd(18)} ${planes[0].width}px  ${files.length} backing(s)  ${String(bytesForFoe).padStart(6)} B`)
    if (!dryRun) {
      fs.writeFileSync(path.join(dir, 'provenance.json'), `${JSON.stringify([provenanceEntry(key, files, ENEMIES, date)], null, 2)}\n`)
    }
    foes.push({ key, files })
  }
  if (!dryRun) fs.writeFileSync(path.join(BACKINGS, 'index.ts'), registrySource(foes))
  console.log(`\nbake-backings: ${foes.length} foe(s), ${count} backing(s), ${total} B${dryRun ? ' (dry run)' : ''}`)
}

// pathToFileURL, not a `file://` prefix: on Windows `argv[1]` is `C:\...`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1) })
}
