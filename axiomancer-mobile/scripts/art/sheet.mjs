// scripts/art/sheet.mjs — frame sheets for enemies already in use (phase AN1d).
//
// A subject spec that carries `frames: { cols, rows }` asks for ONE grid image
// rather than one figure. The grid is the point: generating frames one call at
// a time is what breaks character consistency, and a single sheet is why the
// reference sheet came out consistent. After the one call, this module does
// the local half — split the grid into cells, grade each the way every other
// newly generated asset is graded, key the black ground out to alpha, encode —
// so the cells land as the "ordered frame list" `assets/images/enemies/frames.ts`
// reads.
//
// THE GUARD. A sheet for an enemy that is already in the game is enhancement;
// art for anything else is content that needs a T-approved brief (D88, D99). The test is T's and is narrow:
// the key must be a `portraitAsset` in the engine's enemy library AND a key of
// `ENEMY_ART_BY_KEY` in the app's art registry. Both are read from source on
// every run rather than copied here, so a roster change moves the guard with
// it. `sandbag-01`, the dev dummy, has no `portraitAsset` and is refused, and a
// new creature with no binding is refused before any request is built.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ROOT = path.resolve(MOBILE, '..')

export const ENEMY_LIBRARY = path.join(ROOT, 'axiomancer-mechanics', 'src', 'Enemy', 'enemy.library.ts')
export const ENEMY_ART_INDEX = path.join(MOBILE, 'assets', 'images', 'enemies', 'index.ts')

/** Cells per side a sheet may ask for. A bigger grid starves each cell of pixels. */
export const MAX_GRID_SIDE = 8

/**
 * The problems with a `frames` block, or none. Called from `validateSpec`, so a
 * bad grid fails at compile time, before any spend.
 */
export function validateFrames(spec) {
  const frames = spec?.frames
  if (frames === undefined) return []
  if (!frames || typeof frames !== 'object') return ['frames must be an object { cols, rows }']
  const problems = []
  for (const side of ['cols', 'rows']) {
    const n = frames[side]
    if (!Number.isInteger(n) || n < 1 || n > MAX_GRID_SIDE) {
      problems.push(`frames.${side} must be an integer 1-${MAX_GRID_SIDE}, got ${JSON.stringify(n)}`)
    }
  }
  if (!problems.length && frames.cols * frames.rows < 2) {
    problems.push('frames must ask for at least two cells; one cell is a portrait, not a sheet')
  }
  if (frames.poses !== undefined) {
    const ok = Array.isArray(frames.poses) && frames.poses.length === frames.rows
      && frames.poses.every((p) => typeof p === 'string' && p.trim().length > 0)
    if (!ok) problems.push(`frames.poses must name one pose per row (${frames.rows}), as non-empty strings`)
  }
  if (spec.category !== 'enemies') {
    problems.push(`frames are for enemies only, got category ${JSON.stringify(spec.category)}`)
  }
  return problems
}

/**
 * The prompt paragraph that turns a figure request into a sheet request. Pure
 * and ordered, like the rest of the compiler: the grid is part of the recorded
 * prompt, so two sheets of one subject at different grids hash differently.
 */
export function sheetClause(frames) {
  const lines = [
    `Sheet: one image laid out as a grid of ${frames.cols} columns by ${frames.rows} rows of equal cells,`
      + ' the same creature in every cell at identical scale, lighting, palette and position,'
      + ' each cell a frame of animation read left to right, top to bottom, on the plain black ground;'
      + ' nothing crosses a cell border, no gutters, no frame lines, no numbers or labels.',
  ]
  if (frames.poses) {
    frames.poses.forEach((pose, row) => {
      lines.push(`Row ${row + 1}: ${String(pose).trim().replace(/\s+/g, ' ')}.`)
    })
  }
  return lines.join('\n')
}

/**
 * The request size for a grid, in the sizes the hosted Images API documents:
 * landscape for a wide grid, portrait for a tall one, square otherwise.
 * `ART_SIZE` in the environment still overrides it in the backend.
 */
export function sheetSize(frames) {
  if (frames.cols > frames.rows) return '1536x1024'
  if (frames.rows > frames.cols) return '1024x1536'
  return '1024x1024'
}

/** Every `portraitAsset: '<key>'` in the enemy library source. */
export function rosterPortraitKeys(librarySource) {
  return new Set([...librarySource.matchAll(/portraitAsset:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))
}

/** Every key of the `ENEMY_ART_BY_KEY` object literal in the art index source. */
export function artRegistryKeys(indexSource) {
  const start = indexSource.indexOf('ENEMY_ART_BY_KEY')
  if (start < 0) throw new Error('sheet: ENEMY_ART_BY_KEY not found in the enemy art index')
  const open = indexSource.indexOf('{', indexSource.indexOf('=', start))
  const close = indexSource.indexOf('};', open)
  const body = indexSource.slice(open + 1, close)
  return new Set([...body.matchAll(/['"]([a-z0-9-]+)['"]\s*:\s*require\(/g)].map((m) => m[1]))
}

/** The keys that pass the used-enemy test: in the roster with a portrait, and bound to art. */
export function usedEnemyKeys({ librarySource, indexSource }) {
  const art = artRegistryKeys(indexSource)
  return new Set([...rosterPortraitKeys(librarySource)].filter((k) => art.has(k)))
}

/** Read both sources from disk. `fs` is passed in so a test can hand it fixtures. */
export function readUsedEnemyKeys(fs, { library = ENEMY_LIBRARY, index = ENEMY_ART_INDEX } = {}) {
  return usedEnemyKeys({
    librarySource: fs.readFileSync(library, 'utf-8'),
    indexSource: fs.readFileSync(index, 'utf-8'),
  })
}

/**
 * Throw, naming the key, unless it passes the used-enemy test. A refusal is
 * the answer, not a prompt for a question: the generator never asks whether
 * new content is wanted.
 */
export function assertUsedEnemy(slug, used) {
  if (used.has(slug)) return
  const known = [...used].sort().join(', ') || '(none)'
  throw new Error(
    `sheet: refused ${JSON.stringify(slug)} — it fails the used-enemy test `
      + '(a portraitAsset in enemy.library.ts AND a key of ENEMY_ART_BY_KEY). '
      + 'Frame sheets are generated only for enemies already in the game; anything else is '
      + `content art that needs a brief T approved (D99). Used enemies: ${known}.`,
  )
}

/**
 * Cell rectangles for a sheet, row-major. The grid comes from the spec, never
 * inferred from the pixels; a remainder that does not divide evenly is trimmed
 * from the right and bottom edges rather than smeared across cells.
 */
export function gridCells(width, height, { cols, rows }) {
  const w = Math.floor(width / cols)
  const h = Math.floor(height / rows)
  if (w < 1 || h < 1) throw new Error(`sheet: a ${width}x${height} image cannot hold a ${cols}x${rows} grid`)
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.push({ left: c * w, top: r * h, width: w, height: h })
  }
  return cells
}

/** `<slug>-NN.webp`, zero-padded, so a directory sort is the frame order. */
export function cellName(slug, index, count) {
  const digits = Math.max(2, String(count - 1).length)
  return `${slug}-${String(index).padStart(digits, '0')}.webp`
}

/** Below this brightness (max channel) a ground pixel is fully transparent. */
export const MATTE_FLOOR = 12
/** At or above this, a pixel is opaque; between the two the alpha ramps (the glow edge). */
export const MATTE_CEIL = 48

/**
 * Key the black ground out of a cell, in place over raw pixels.
 *
 * Border-connected, not a global threshold: only dark pixels reachable from the
 * cell's edge through other dark pixels become transparent. A dark pupil or a
 * shadow inside the figure is enclosed by brighter paint, so it stays opaque —
 * a global key would punch holes through it. Within the reached region the
 * alpha ramps from MATTE_FLOOR to MATTE_CEIL, so a glow fades into the arena
 * rather than ending in a hard rim, and the colour of every fully keyed pixel
 * is zeroed so no matte fringe survives the encode.
 *
 * @param {Buffer} rgb  `width * height * 3` bytes
 * @returns {Buffer}    `width * height * 4` bytes, RGBA
 */
export function matteBlackGround(rgb, width, height) {
  const n = width * height
  const bright = new Uint8Array(n)
  for (let i = 0; i < n; i++) bright[i] = Math.max(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2])

  const ground = new Uint8Array(n)
  const stack = []
  const seed = (i) => {
    if (!ground[i] && bright[i] < MATTE_CEIL) { ground[i] = 1; stack.push(i) }
  }
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1) }
  while (stack.length) {
    const i = stack.pop()
    const x = i % width
    if (x > 0) seed(i - 1)
    if (x < width - 1) seed(i + 1)
    if (i >= width) seed(i - width)
    if (i < n - width) seed(i + width)
  }

  const out = Buffer.alloc(n * 4)
  for (let i = 0; i < n; i++) {
    let alpha = 255
    if (ground[i]) {
      alpha = bright[i] <= MATTE_FLOOR
        ? 0
        : Math.round(((bright[i] - MATTE_FLOOR) / (MATTE_CEIL - MATTE_FLOOR)) * 255)
    }
    if (alpha > 0) {
      out[i * 4] = rgb[i * 3]
      out[i * 4 + 1] = rgb[i * 3 + 1]
      out[i * 4 + 2] = rgb[i * 3 + 2]
    }
    out[i * 4 + 3] = alpha
  }
  return out
}

/**
 * Split a generated sheet into encoded cells.
 *
 * Each cell is cut, sized to the recipe's longest edge, graded once (these
 * cells have never been graded, so they take the full recipe), keyed to alpha,
 * and encoded at the recipe's quality. The grade runs BEFORE the matte because
 * sharp's grayscale drops an alpha channel it is handed.
 *
 * @param {Function} sharp
 * @param {Buffer} buffer   the generated sheet
 * @param {{cols:number, rows:number}} frames
 * @param {{recipe:object, grade:(pipeline:object)=>object, slug:string}} opts
 * @returns {Promise<Array<{name:string, webp:Buffer}>>}
 */
export async function splitSheet(sharp, buffer, frames, { recipe, grade, slug }) {
  const meta = await sharp(buffer).metadata()
  const rects = gridCells(meta.width ?? 0, meta.height ?? 0, frames)
  const cells = []
  for (const [index, rect] of rects.entries()) {
    let pipeline = sharp(buffer).extract(rect).removeAlpha()
    if (Math.max(rect.width, rect.height) > recipe.maxEdge) {
      pipeline = pipeline.resize({
        width: rect.width >= rect.height ? recipe.maxEdge : undefined,
        height: rect.height > rect.width ? recipe.maxEdge : undefined,
        withoutEnlargement: true,
      })
    }
    pipeline = grade(pipeline)
    const { data, info } = await pipeline.toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
    const rgb = info.channels === 3 ? data : toRgb(data, info.channels, info.width * info.height)
    const rgba = matteBlackGround(rgb, info.width, info.height)
    const webp = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .webp({ quality: recipe.quality })
      .toBuffer()
    cells.push({ name: cellName(slug, index, rects.length), webp })
  }
  return cells
}

function toRgb(data, channels, n) {
  const rgb = Buffer.alloc(n * 3)
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = data[i * channels + (channels < 3 ? 0 : c)]
  }
  return rgb
}

/**
 * The one record that covers a generated set. It is the generation record the
 * route already writes (backend, model, prompt, style version, date) plus what
 * a frame set needs on top: the grid, the per-cell cost, and that the grade was
 * applied in this run — so nobody grades these cells a second time.
 */
export function sheetProvenance(base, { frames, cells, recipe }) {
  const sizes = cells.map((c) => c.webp.length)
  const total = sizes.reduce((a, b) => a + b, 0)
  return {
    ...base,
    method: `one ${frames.cols}x${frames.rows} grid image from a single generation call, split row-major `
      + 'into cells, graded once, black ground keyed to alpha (border-connected), WebP per cell',
    frames: { cols: frames.cols, rows: frames.rows, cells: cells.length },
    post_process: `grayscale, brightness ${recipe.brightness} / contrast ${recipe.contrast} toward the void, `
      + `longest edge <= ${recipe.maxEdge}px, black ground keyed to alpha, WebP q${recipe.quality}`,
    graded: true,
    graded_in_this_run: true,
    measured: `${cells.length} cells, ${total} B in total, mean ${Math.round(total / Math.max(1, cells.length))} B, `
      + `max ${Math.max(0, ...sizes)} B`,
    covers: cells.map((c) => c.name).sort(),
  }
}
