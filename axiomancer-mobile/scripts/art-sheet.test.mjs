// axiomancer-mobile/scripts/art-sheet.test.mjs — frame sheets for enemies
// already in use, proven without a key and without a network call (phase AN1d).
//
//   node --test axiomancer-mobile/scripts/art-sheet.test.mjs
//
// Three things are pinned. The guard: a sheet is compiled only for a key that
// is both a `portraitAsset` in the roster and bound in ENEMY_ART_BY_KEY, and
// anything else is refused by name before a request exists. The grid: one
// generated image splits into exactly cols x rows cells, row-major. The cell:
// graded once, the black ground keyed to alpha without punching holes in the
// figure, one provenance record for the whole set.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generate } from './art/adapter.mjs'
import { compile, validateSpec } from './art/prompt.mjs'
import {
  MATTE_CEIL,
  MATTE_FLOOR,
  artRegistryKeys,
  assertUsedEnemy,
  cellName,
  gridCells,
  matteBlackGround,
  readUsedEnemyKeys,
  rosterPortraitKeys,
  sheetSize,
  usedEnemyKeys,
} from './art/sheet.mjs'
import { planSheet } from './generate-art.mjs'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const sheetSpec = {
  slug: 'brine-hag',
  category: 'enemies',
  subject: 'The Brine Hag, an old sea-witch standing hunched',
  frames: { cols: 4, rows: 2, poses: ['idle sway', 'casting'] },
}

// ── the spec ─────────────────────────────────────────────────────────────────

test('a frames block compiles into a sheet request with a grid-shaped size', () => {
  const req = compile(sheetSpec)
  assert.match(req.prompt, /grid of 4 columns by 2 rows of equal cells/)
  assert.match(req.prompt, /Row 1: idle sway\.\nRow 2: casting\./)
  // The sheet clause sits before the negatives, like every other spec line.
  assert.ok(req.prompt.indexOf('Sheet:') < req.prompt.indexOf('Avoid:'))
  assert.deepEqual(req.frames, sheetSpec.frames)
  assert.equal(req.size, '1536x1024')
})

test('the grid is part of the recorded prompt, so a different grid hashes differently', () => {
  const other = compile({ ...sheetSpec, frames: { cols: 8, rows: 2, poses: ['a', 'b'] } })
  assert.notEqual(compile(sheetSpec).promptHash, other.promptHash)
  assert.equal(compile(sheetSpec).promptHash, compile(sheetSpec).promptHash)
})

test('a plain spec is untouched by the sheet path', () => {
  const req = compile({ ...sheetSpec, frames: undefined })
  assert.doesNotMatch(req.prompt, /Sheet:/)
  assert.equal(req.frames, undefined)
  assert.equal(req.size, undefined)
})

test('a bad frames block fails at compile time, before any spend', () => {
  const problems = (frames, extra = {}) => validateSpec({ ...sheetSpec, ...extra, frames })
  assert.match(problems({ cols: 0, rows: 2 }).join(), /frames\.cols must be an integer/)
  assert.match(problems({ cols: 2.5, rows: 2 }).join(), /frames\.cols/)
  assert.match(problems({ cols: 4, rows: 99 }).join(), /frames\.rows/)
  assert.match(problems({ cols: 1, rows: 1 }).join(), /at least two cells/)
  assert.match(problems({ cols: 4, rows: 2, poses: ['only one'] }).join(), /one pose per row/)
  assert.match(problems({ cols: 4, rows: 2 }, { category: 'labyrinth/doors' }).join(), /enemies only/)
  assert.deepEqual(problems({ cols: 4, rows: 2 }), [])
})

test('sheet sizes follow the grid aspect', () => {
  assert.equal(sheetSize({ cols: 8, rows: 3 }), '1536x1024')
  assert.equal(sheetSize({ cols: 2, rows: 4 }), '1024x1536')
  assert.equal(sheetSize({ cols: 3, rows: 3 }), '1024x1024')
})

// ── the used-enemy guard ─────────────────────────────────────────────────────

test('the live sources pass every bound roster enemy and refuse the dev dummy', () => {
  const used = readUsedEnemyKeys(fs)
  const library = fs.readFileSync(path.join(MOBILE, '..', 'axiomancer-mechanics', 'src', 'Enemy', 'enemy.library.ts'), 'utf-8')
  // Enumerated from the sources, not named: a fourth bound enemy is covered.
  const expected = [...rosterPortraitKeys(library)]
    .filter((k) => artRegistryKeys(fs.readFileSync(path.join(MOBILE, 'assets', 'images', 'enemies', 'index.ts'), 'utf-8')).has(k))
  assert.ok(expected.length >= 3, `only ${expected.length} used enemies read from source`)
  assert.deepEqual([...used].sort(), expected.sort())
  assert.ok(used.has('float-eye'))
  assert.ok(library.includes("id: 'sandbag-01'"), 'the dev dummy moved; this test names the wrong file')
  assert.throws(() => assertUsedEnemy('sandbag-01', used), /refused "sandbag-01"/)
})

test('a key needs BOTH halves: the roster portrait and the art binding', () => {
  const librarySource = `
    export const A = createEnemy({ id: 'enemy-a', portraitAsset: 'only-in-roster' })
    export const B = createEnemy({ id: 'enemy-b', portraitAsset: 'in-both' })
    export const C = createEnemy({ id: 'no-portrait' })`
  const indexSource = `
    export const ENEMY_ART_BY_KEY: Readonly<Record<string, number>> = {
        'in-both':        require('./b.webp'),
        'only-in-art':    require('./c.webp'),
    };
    const OTHER = { 'not-a-binding': require('./d.webp') };`
  const used = usedEnemyKeys({ librarySource, indexSource })
  assert.deepEqual([...used], ['in-both'])
  for (const refused of ['only-in-roster', 'only-in-art', 'no-portrait', 'not-a-binding', 'a-new-creature']) {
    assert.throws(() => assertUsedEnemy(refused, used), new RegExp(`refused "${refused}"`))
  }
  assert.doesNotThrow(() => assertUsedEnemy('in-both', used))
})

const runCli = (specPath) => spawnSync(process.execPath, ['scripts/generate-art.mjs', '--spec', specPath], {
  cwd: MOBILE,
  encoding: 'utf-8',
  env: { ...process.env, OPENAI_API_KEY: '', ART_BACKEND: 'null' },
})

test('the CLI dry run compiles a sheet request for a used enemy', () => {
  const run = runCli('prompts/enemies/brine-hag.sheet.json')
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /sheet: {3}8x3 grid, 24 cells/)
  assert.match(run.stdout, /Sheet: one image laid out as a grid of 8 columns by 3 rows/)
  assert.match(run.stdout, /inert run — nothing generated, nothing written/)
})

test('the CLI refuses an unused enemy by name, before printing any request', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'art-sheet-'))
  const specPath = path.join(dir, 'sandbag.json')
  fs.writeFileSync(specPath, JSON.stringify({ ...sheetSpec, slug: 'sandbag-01' }))
  const run = runCli(specPath)
  assert.equal(run.status, 1)
  assert.match(run.stderr, /refused "sandbag-01"/)
  assert.doesNotMatch(run.stdout, /compiled prompt/)
})

// ── the split ────────────────────────────────────────────────────────────────

test('grid cells are row-major and a remainder is trimmed, never smeared', () => {
  const cells = gridCells(1030, 512, { cols: 4, rows: 2 })
  assert.equal(cells.length, 8)
  assert.deepEqual(cells[0], { left: 0, top: 0, width: 257, height: 256 })
  assert.deepEqual(cells[3], { left: 771, top: 0, width: 257, height: 256 })
  assert.deepEqual(cells[4], { left: 0, top: 256, width: 257, height: 256 })
  assert.throws(() => gridCells(3, 3, { cols: 4, rows: 1 }), /cannot hold a 4x1 grid/)
})

test('cell names are zero-padded so a directory sort is the frame order', () => {
  assert.equal(cellName('float-eye', 3, 24), 'float-eye-03.webp')
  assert.equal(cellName('x', 7, 128), 'x-007.webp')
})

// ── the matte ────────────────────────────────────────────────────────────────

/** A w x h RGB buffer of one value, with `paint(x, y)` overriding pixels. */
function field(w, h, paint) {
  const rgb = Buffer.alloc(w * h * 3)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = paint(x, y) ?? [0, 0, 0]
      rgb.set(v, (y * w + x) * 3)
    }
  }
  return rgb
}
const alphaAt = (rgba, w, x, y) => rgba[(y * w + x) * 4 + 3]

test('the black ground keys out, but a dark pupil inside the figure stays opaque', () => {
  // A 9x9 cell: a bright ring (2..6) on black, with a black pupil at its centre.
  const w = 9
  const rgb = field(w, w, (x, y) => {
    if (x === 4 && y === 4) return [0, 0, 0]
    if (x >= 2 && x <= 6 && y >= 2 && y <= 6) return [200, 180, 40]
    return null
  })
  const rgba = matteBlackGround(rgb, w, w)
  assert.equal(alphaAt(rgba, w, 0, 0), 0, 'the ground is transparent')
  assert.equal(alphaAt(rgba, w, 3, 3), 255, 'the figure is opaque')
  assert.equal(alphaAt(rgba, w, 4, 4), 255, 'an enclosed dark pixel is not ground')
  // No colour survives on a fully keyed pixel, so no fringe survives the encode.
  assert.deepEqual([...rgba.subarray(0, 3)], [0, 0, 0])
})

test('a glow at the edge ramps rather than ending in a hard rim', () => {
  const mid = Math.round((MATTE_FLOOR + MATTE_CEIL) / 2)
  const rgb = field(5, 1, (x) => [[0, 0, 0], [mid, 0, 0], [MATTE_CEIL, 0, 0], [mid, 0, 0], [0, 0, 0]][x])
  const rgba = matteBlackGround(rgb, 5, 1)
  const a = [0, 1, 2, 3, 4].map((x) => alphaAt(rgba, 5, x, 0))
  assert.equal(a[0], 0)
  assert.ok(a[1] > 0 && a[1] < 255, `a glow pixel was ${a[1]}`)
  assert.equal(a[2], 255)
})

// ── the whole path, on a fixture grid and a fake backend ─────────────────────

test('a fixture grid splits to cols x rows graded, keyed cells under one record', async () => {
  const { default: sharp } = await import('sharp')
  const { cols, rows } = sheetSpec.frames
  const cell = 64
  // A black sheet with one bright square centred in each cell.
  const composites = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      composites.push({
        input: { create: { width: 24, height: 24, channels: 3, background: { r: 220, g: 190, b: 60 } } },
        left: c * cell + 20,
        top: r * cell + 20,
      })
    }
  }
  const sheet = await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#000' } })
    .composite(composites).png().toBuffer()

  const request = compile(sheetSpec)
  const result = await generate(request, {
    backend: { name: 'fake', async generate() { return { model: 'fake-model-v1', image: sheet } } },
  })
  const { dir, cells, entry } = await planSheet(sharp, { request, result, date: '2026-10-21' })

  assert.equal(cells.length, cols * rows)
  assert.deepEqual(cells.map((c) => c.name), [...Array(cols * rows).keys()].map((i) => cellName('brine-hag', i, 8)))
  assert.equal(path.relative(MOBILE, dir), path.join('assets', 'images', 'enemies', 'anim', 'brine-hag'))

  for (const { webp } of cells) {
    const { data, info } = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(info.width, cell)
    assert.equal(data[3], 0, 'a cell corner is keyed out')
    const centre = (32 * cell + 32) * 4
    assert.ok(data[centre + 3] > 250, 'the figure is opaque')
    // Graded once: the grade's grayscale leaves no channel apart from the others.
    assert.ok(Math.abs(data[centre] - data[centre + 2]) <= 2, 'the figure was graded')
  }

  assert.equal(entry.generated_by, 'ai-generation')
  assert.equal(entry.backend, 'fake')
  assert.equal(entry.model, 'fake-model-v1')
  assert.equal(entry.prompt, request.prompt)
  assert.equal(entry.date, '2026-10-21')
  assert.deepEqual(entry.frames, { cols, rows, cells: 8 })
  assert.equal(entry.graded, true)
  assert.equal(entry.graded_in_this_run, true)
  assert.deepEqual(entry.covers, cells.map((c) => c.name))
  assert.match(entry.measured, /^8 cells, \d+ B in total/)
})
