// axiomancer-mobile/scripts/enemy-backings.test.mjs — every cell a foe draws
// has a backing, and the backing stays inside that cell's own shape (phase
// AP1d, spec 146, A4; per cell since 146.8, A8).
//
//   node --test axiomancer-mobile/scripts/enemy-backings.test.mjs
//
// Combat draws animation cells, not the roster stills, so this reads the cells.
// It judges by alpha VALUES, never by a file's `hasAlpha` flag: the Green
// Jelly's still declares an alpha plane while over 99% of it is 255, and the
// Death Beholder's still declares none, yet both foes animate through
// transparent cells.
//
// THE REGRESSION (146.8). 146.4 baked one matte per foe from the union of all
// its cells, grown and feathered, and drew it under every frame. A foe that
// moves got a matte far wider than the frame on screen: T saw a huge soft black
// blob around the Float-Eye in the v0.4.0 preview. Measured against the cell
// actually drawn, that matte reached past the foe's own filled shape by 45% to
// 227% of the foe's area (mean per foe). `inside its own cell's shape` below is
// that measurement, and it now holds to a pixel or two.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'

import {
  BACKINGS, BACKING_TUNING, ENEMIES, backingDir, backingFile, bakeAlpha, dilate, drawnFiles, dropIslands, erode,
  figureShape, fillHoles, hasTransparency, readAlpha, rosterKeys,
} from './bake-backings.mjs'

const REGISTRY = fs.readFileSync(path.join(BACKINGS, 'index.ts'), 'utf-8')

/** A backing pixel at or above this alpha is visible black. */
const VISIBLE = 32
/** The feather band past the figure's own filled shape that a backing may reach into. */
const BAND_PX = 2

/**
 * How far a backing reaches past its cell's own filled shape: visible backing
 * pixels outside the shape grown by `BAND_PX`, as a share of the figure's area,
 * and the count of visible backing pixels outside the figure grown by `farPx`
 * with whatever that encloses filled (a dark object held between two strokes,
 * keyed away, is the foe's own and is meant to be backed).
 */
function overreach(cell, backing, farPx) {
  const { width, height } = cell
  const shape = figureShape(cell)
  const band = dilate(shape, width, height, BAND_PX)
  const solid = cell.alpha.map((a) => (a >= BACKING_TUNING.threshold ? 1 : 0))
  const far = dilate(fillHoles(dilate(solid, width, height, farPx - BAND_PX), width, height), width, height, BAND_PX)
  let area = 0
  let outside = 0
  let beyond = 0
  for (let i = 0; i < shape.length; i++) {
    if (cell.alpha[i] >= BACKING_TUNING.threshold) area++
    if (backing.alpha[i] < VISIBLE) continue
    if (!band[i]) outside++
    if (!far[i]) beyond++
  }
  return { share: area ? outside / area : 0, beyond }
}

/** Which foes break the law: they draw transparency and some drawn file has no backing. */
const lacksBacking = async (keys, enemiesDir, backingsDir) => {
  const missing = []
  for (const key of keys) {
    const files = drawnFiles(key, enemiesDir)
    const planes = await Promise.all(files.map((f) => readAlpha(sharp, f)))
    if (!planes.some((p) => hasTransparency(p.alpha))) continue
    if (files.some((f) => !fs.existsSync(path.join(backingDir(key, backingsDir), backingFile(f))))) missing.push(key)
  }
  return missing
}

const keys = rosterKeys()
const foes = await Promise.all(
  keys.map(async (key) => {
    const files = drawnFiles(key)
    return {
      key,
      files,
      planes: await Promise.all(files.map((f) => readAlpha(sharp, f))),
      backings: await Promise.all(files.map((f) => readAlpha(sharp, path.join(backingDir(key), backingFile(f))))),
    }
  }),
)

test('the sweep found the roster and its cells', () => {
  assert.ok(keys.length >= 17, `only ${keys.length} foes`)
  for (const foe of foes) assert.equal(foe.planes.length, 24, `${foe.key} no longer draws 24 cells`)
})

test('every cell of a foe that draws transparent art has a backing on disk', async () => {
  assert.deepEqual(await lacksBacking(keys, ENEMIES, BACKINGS), [])
})

test('the two foes with opaque stills are judged by their cells', () => {
  for (const key of ['death-beholder', 'green-jelly']) {
    const foe = foes.find((f) => f.key === key)
    assert.ok(foe.planes.every((p) => hasTransparency(p.alpha)), `${key}: its cells should be transparent`)
  }
})

test('the registry names every backing in cell order, and no other file', () => {
  for (const { key, files } of foes) {
    const block = REGISTRY.match(new RegExp(`'${key}': \\[([^\\]]*)\\]`))
    assert.ok(block, `${key} is not registered`)
    const named = [...block[1].matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1])
    assert.deepEqual(named, files.map((f) => `${key}/${backingFile(f)}`), `${key}: backings out of cell order`)
  }
  const all = [...REGISTRY.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]).sort()
  const onDisk = foes.flatMap(({ key }) => fs.readdirSync(backingDir(key))
    .filter((f) => f.endsWith('.webp')).map((f) => `${key}/${f}`)).sort()
  assert.deepEqual(all, onDisk)
})

test('146.4\'s one-matte-per-foe files are gone', () => {
  const flat = fs.readdirSync(BACKINGS).filter((f) => f.endsWith('.webp'))
  assert.deepEqual(flat, [])
})

test('a backing is the size of the cell it backs, so the same box registers both', () => {
  for (const { key, planes, backings } of foes) {
    for (const [c, plane] of planes.entries()) {
      assert.equal(backings[c].width, plane.width, `${key} cell ${c}: width`)
      assert.equal(backings[c].height, plane.height, `${key} cell ${c}: height`)
    }
  }
})

test('a backing covers what its cell draws, and is a shape rather than a rectangle', () => {
  for (const { key, planes, backings } of foes) {
    for (const [c, plane] of planes.entries()) {
      let figure = 0
      let covered = 0
      for (let i = 0; i < plane.alpha.length; i++) {
        if (plane.alpha[i] < BACKING_TUNING.threshold) continue
        figure++
        if (backings[c].alpha[i] >= 200) covered++
      }
      // Under 100% only for the stray sparks `dropIslands` lets go.
      assert.ok(figure > 0, `${key} cell ${c} drew nothing`)
      assert.ok(covered / figure >= 0.98, `${key} cell ${c}: the backing covers only ${covered}/${figure}`)
      assert.ok(backings[c].alpha.some((a) => a === 0), `${key} cell ${c}: the backing fills the whole cell`)
    }
  }
})

test('a backing stays inside its own cell\'s shape, to a pixel or two (146.8)', () => {
  const report = []
  for (const { key, planes, backings } of foes) {
    // A close can bridge a gap of twice its radius, so nothing it adds lies
    // farther from the figure than that radius; the feather adds a pixel.
    const farPx = Math.ceil(planes[0].width * BACKING_TUNING.closeFrac) + BAND_PX
    let sum = 0
    for (const [c, plane] of planes.entries()) {
      const { share, beyond } = overreach(plane, backings[c], farPx)
      sum += share
      assert.equal(beyond, 0, `${key} cell ${c}: ${beyond} px of backing lie more than ${farPx}px past the foe and what it encloses`)
      assert.ok(share <= 0.05, `${key} cell ${c}: the backing reaches past the foe by ${(share * 100).toFixed(1)}% of its area`)
    }
    const mean = sum / planes.length
    report.push(`${key} ${(mean * 100).toFixed(2)}%`)
    assert.ok(mean <= 0.005, `${key}: the backing reaches past the foe by ${(mean * 100).toFixed(2)}% of its area on average`)
  }
  assert.equal(report.length, foes.length)
})

test('a foe that moves gets a different backing per frame', () => {
  const eye = foes.find((f) => f.key === 'float-eye')
  const distinct = new Set(eye.backings.map((b) => Buffer.from(b.alpha).toString('base64')))
  assert.ok(distinct.size > 1, 'every float-eye frame has the same backing: is it a union again?')
})

test('a checked-in backing is what the script bakes from its cell today', async () => {
  for (const { key, planes, backings } of foes) {
    for (const [c, plane] of planes.entries()) {
      const fresh = await bakeAlpha(sharp, plane)
      let drift = 0
      for (let i = 0; i < fresh.alpha.length; i++) drift += Math.abs(fresh.alpha[i] - backings[c].alpha[i])
      const mean = drift / fresh.alpha.length
      assert.ok(mean <= 2, `${key} cell ${c} is stale by ${mean.toFixed(2)}: run node scripts/bake-backings.mjs`)
    }
  }
})

// ── The law itself, over fixtures: the checks above would pass about nothing
//    if the alpha reading, the missing-backing rule or the overreach measure
//    went soft. ────────────────────────────────────────────────────────────────

const fixture = (alphaAt, size = 8) => {
  const data = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) data[i * 4 + 3] = alphaAt(i)
  return sharp(data, { raw: { width: size, height: size, channels: 4 } }).webp({ lossless: true }).toBuffer()
}

test('the missing-backing rule fails a transparent foe and spares an opaque one', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backings-'))
  try {
    const anim = path.join(dir, 'anim')
    const empty = path.join(dir, 'none')
    fs.mkdirSync(empty)
    fs.mkdirSync(path.join(anim, 'clear'), { recursive: true })
    fs.mkdirSync(path.join(anim, 'solid'), { recursive: true })
    fs.writeFileSync(path.join(anim, 'clear', 'clear-00.webp'), await fixture((i) => (i === 0 ? 0 : 255)))
    fs.writeFileSync(path.join(anim, 'clear', 'clear-01.webp'), await fixture((i) => (i === 1 ? 0 : 255)))
    fs.writeFileSync(path.join(anim, 'solid', 'solid-00.webp'), await fixture(() => 255))
    assert.deepEqual(await lacksBacking(['clear', 'solid'], dir, empty), ['clear'])
    fs.mkdirSync(path.join(empty, 'clear'))
    fs.writeFileSync(path.join(empty, 'clear', backingFile('clear-00.webp')), await fixture(() => 0))
    assert.deepEqual(await lacksBacking(['clear', 'solid'], dir, empty), ['clear'], 'one cell backed is not every cell')
    fs.writeFileSync(path.join(empty, 'clear', backingFile('clear-01.webp')), await fixture(() => 0))
    assert.deepEqual(await lacksBacking(['clear', 'solid'], dir, empty), [])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('transparency is read from values, not from the alpha flag', async () => {
  // An alpha plane declared and full: the flag says yes, the values say no.
  const flagged = await sharp(await fixture(() => 255)).ensureAlpha().png().toBuffer()
  assert.equal((await sharp(flagged).metadata()).hasAlpha, true)
  assert.equal(hasTransparency((await readAlpha(sharp, flagged)).alpha), false)
  assert.equal(hasTransparency((await readAlpha(sharp, await fixture((i) => (i === 3 ? 12 : 255)))).alpha), true)
})

test('the overreach measure fails a backing cut from another pose and passes the cell\'s own', async () => {
  // A 64px disc that moves: a backing baked from where it was a frame ago (or
  // from the union of both) reaches far past where it is now.
  const size = 64
  const disc = (cx) => {
    const alpha = new Uint8Array(size * size)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if ((x - cx) ** 2 + (y - 32) ** 2 <= 100) alpha[y * size + x] = 255
    return { alpha, width: size, height: size }
  }
  const now = disc(20)
  const before = disc(44)
  const union = { ...now, alpha: now.alpha.map((a, i) => Math.max(a, before.alpha[i])) }
  const own = await bakeAlpha(sharp, now)
  assert.equal(overreach(now, own, 4).beyond, 0)
  assert.ok(overreach(now, own, 4).share <= 0.05)
  const blob = await bakeAlpha(sharp, union)
  assert.ok(overreach(now, blob, 4).share > 0.5, 'a union backing must read as overreach')
  assert.ok(overreach(now, blob, 4).beyond > 0)
})

test('nothing grows the shape: a backing ends within a pixel of its figure', async () => {
  const size = 32
  const alpha = new Uint8Array(size * size)
  for (let y = 8; y < 24; y++) for (let x = 8; x < 24; x++) alpha[y * size + x] = 255
  const { alpha: out } = await bakeAlpha(sharp, { alpha, width: size, height: size })
  assert.equal(out[16 * size + 8], 255, 'the edge of the figure is backed')
  assert.ok(out[16 * size + 7] < 255, 'one pixel out is only feather')
  assert.ok(out[16 * size + 5] < VISIBLE, 'three pixels out is clear')
})

test('the shape steps do what they say', () => {
  // 5x5: a ring with a hole in the middle.
  const ring = Uint8Array.from([
    0, 0, 0, 0, 0,
    0, 1, 1, 1, 0,
    0, 1, 0, 1, 0,
    0, 1, 1, 1, 0,
    0, 0, 0, 0, 0,
  ])
  const filled = fillHoles(ring, 5, 5)
  assert.equal(filled[12], 1, 'the enclosed hole is filled')
  assert.equal(filled[0], 0, 'the outside stays outside')
  assert.equal(dilate(filled, 5, 5, 1)[2], 1, 'grow reaches the neighbour')
  assert.equal(erode(filled, 5, 5, 1)[6], 0, 'erode takes the corner')
  assert.equal(erode(filled, 5, 5, 1)[12], 1, 'erode keeps the middle')
  const spark = Uint8Array.from([1, 0, 1, 1])
  assert.deepEqual([...dropIslands(spark, 4, 2)], [0, 0, 1, 1])
})
