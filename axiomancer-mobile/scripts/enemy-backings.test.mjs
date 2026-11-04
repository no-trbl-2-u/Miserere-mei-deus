// axiomancer-mobile/scripts/enemy-backings.test.mjs — every foe that draws
// transparent art has a matte that covers it (phase AP1d, spec 146, A4).
//
//   node --test axiomancer-mobile/scripts/enemy-backings.test.mjs
//
// Combat draws animation cells, not the roster stills, so this reads the cells.
// It judges by alpha VALUES, never by a file's `hasAlpha` flag: the Green
// Jelly's still declares an alpha plane while over 99% of it is 255, and the
// Death Beholder's still declares none, yet both foes animate through
// transparent cells.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'

import {
  BACKINGS, BACKING_TUNING, ENEMIES, backingFile, bakeAlpha, dilate, drawnFiles, dropIslands, erode, fillHoles,
  hasTransparency, readAlpha, rosterKeys, unionAlpha,
} from './bake-backings.mjs'

const REGISTRY = fs.readFileSync(path.join(BACKINGS, 'index.ts'), 'utf-8')

/** Which foes break the law: they draw transparency and have no matte file. */
const lacksMatte = async (keys, enemiesDir, backingsDir) => {
  const missing = []
  for (const key of keys) {
    const planes = await Promise.all(drawnFiles(key, enemiesDir).map((f) => readAlpha(sharp, f)))
    if (planes.some((p) => hasTransparency(p.alpha)) && !fs.existsSync(path.join(backingsDir, backingFile(key)))) {
      missing.push(key)
    }
  }
  return missing
}

const keys = rosterKeys()
const foes = await Promise.all(
  keys.map(async (key) => ({
    key,
    planes: await Promise.all(drawnFiles(key).map((f) => readAlpha(sharp, f))),
    matte: await readAlpha(sharp, path.join(BACKINGS, backingFile(key))),
  })),
)

test('the sweep found the roster and its cells', () => {
  assert.ok(keys.length >= 17, `only ${keys.length} foes`)
  for (const foe of foes) assert.equal(foe.planes.length, 24, `${foe.key} no longer draws 24 cells`)
})

test('every foe that draws transparent art has a matte on disk', async () => {
  assert.deepEqual(await lacksMatte(keys, ENEMIES, BACKINGS), [])
})

test('the two foes with opaque stills are judged by their cells', () => {
  for (const key of ['death-beholder', 'green-jelly']) {
    const foe = foes.find((f) => f.key === key)
    assert.ok(foe.planes.every((p) => hasTransparency(p.alpha)), `${key}: its cells should be transparent`)
  }
})

test('every matte is in the registry, and the registry names no other', () => {
  for (const key of keys) assert.ok(REGISTRY.includes(`require('./${backingFile(key)}')`), `${key} is not registered`)
  const named = [...REGISTRY.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]).sort()
  assert.deepEqual(named, keys.map(backingFile).sort())
})

test('a matte is the size of the art it backs, so the same box registers both', () => {
  for (const { key, planes, matte } of foes) {
    assert.equal(matte.width, planes[0].width, `${key}: width`)
    assert.equal(matte.height, planes[0].height, `${key}: height`)
  }
})

test('a matte covers what its foe draws, and is a shape rather than a rectangle', () => {
  for (const { key, planes, matte } of foes) {
    for (const [c, plane] of planes.entries()) {
      let figure = 0
      let covered = 0
      for (let i = 0; i < plane.alpha.length; i++) {
        if (plane.alpha[i] < BACKING_TUNING.threshold) continue
        figure++
        if (matte.alpha[i] >= 200) covered++
      }
      // Under 100% only for the stray sparks `dropIslands` lets go.
      assert.ok(figure > 0, `${key} cell ${c} drew nothing`)
      assert.ok(covered / figure >= 0.98, `${key} cell ${c}: the matte covers only ${covered}/${figure}`)
    }
    const clear = matte.alpha.reduce((n, a) => n + (a === 0 ? 1 : 0), 0)
    assert.ok(clear > 0, `${key}: the matte fills the whole cell`)
    assert.ok(matte.alpha.some((a) => a > 0 && a < 255), `${key}: the matte has no feathered edge`)
  }
})

test('a checked-in matte is what the script bakes from the cells today', async () => {
  for (const { key, planes, matte } of foes) {
    const fresh = await bakeAlpha(sharp, planes)
    let drift = 0
    for (let i = 0; i < fresh.alpha.length; i++) drift += Math.abs(fresh.alpha[i] - matte.alpha[i])
    const mean = drift / fresh.alpha.length
    assert.ok(mean <= 2, `${key} is stale by ${mean.toFixed(2)}: run node scripts/bake-backings.mjs`)
  }
})

// ── The law itself, over fixtures: the checks above would pass about nothing
//    if the alpha reading or the missing-matte rule went soft. ─────────────────

const fixture = (alphaAt, size = 8) => {
  const data = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) data[i * 4 + 3] = alphaAt(i)
  return sharp(data, { raw: { width: size, height: size, channels: 4 } }).webp({ lossless: true }).toBuffer()
}

test('the missing-matte rule fails a transparent foe and spares an opaque one', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backings-'))
  try {
    const anim = path.join(dir, 'anim')
    const empty = path.join(dir, 'none')
    fs.mkdirSync(empty)
    fs.mkdirSync(path.join(anim, 'clear'), { recursive: true })
    fs.mkdirSync(path.join(anim, 'solid'), { recursive: true })
    fs.writeFileSync(path.join(anim, 'clear', 'clear-00.webp'), await fixture((i) => (i === 0 ? 0 : 255)))
    fs.writeFileSync(path.join(anim, 'solid', 'solid-00.webp'), await fixture(() => 255))
    assert.deepEqual(await lacksMatte(['clear', 'solid'], dir, empty), ['clear'])
    fs.writeFileSync(path.join(empty, backingFile('clear')), await fixture(() => 0))
    assert.deepEqual(await lacksMatte(['clear', 'solid'], dir, empty), [])
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

test('the union takes the most opaque value and refuses cells of two sizes', () => {
  const plane = (alpha, width = 2, height = 1) => ({ alpha: Uint8Array.from(alpha), width, height })
  assert.deepEqual([...unionAlpha([plane([0, 40]), plane([90, 10])]).alpha], [90, 40])
  assert.throws(() => unionAlpha([plane([0, 0]), plane([0], 1, 1)]), /differ in size/)
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
