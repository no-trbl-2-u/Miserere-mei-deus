// axiomancer-mobile/scripts/frame-cells.test.mjs — A11, the bundle cost of an
// animated enemy, weighed rather than estimated (phase AN1e).
//
//   node --test axiomancer-mobile/scripts/frame-cells.test.mjs
//
// A frame set is 24 files where a static enemy is one, so the cost of
// animating the roster is a multiplier, not an increment. The AN1 brief closed
// its own "Bundle cost" follow-up by measuring it — and a measurement in a
// brief is a sentence that was true once. `FRAME_CELL_MAX_BYTES` exists so a
// regenerated set at a higher quality cannot quietly triple the bundle, and a
// ceiling nothing weighs against is a wish. This is what weighs it.
//
// It also checks the number in the provenance record against the bytes on
// disk. The record is how anyone later learns what an animated enemy costs; a
// record that drifted from its own files would be worse than none, because it
// would be believed.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENEMIES = path.join(MOBILE, 'assets', 'images', 'enemies')
const ANIM = path.join(ENEMIES, 'anim')

/**
 * The ceiling, read from the registry rather than copied. A second copy of a
 * limit is a limit that can be raised in one place and enforced from the
 * other.
 */
function ceilingBytes() {
  const source = fs.readFileSync(path.join(ENEMIES, 'frames.ts'), 'utf-8')
  const m = source.match(/FRAME_CELL_MAX_BYTES\s*=\s*(\d+)/)
  assert.ok(m, 'frames.ts no longer declares FRAME_CELL_MAX_BYTES')
  return Number(m[1])
}

/** Every installed frame set: `{ key, dir, cells }`, cells sorted by name. */
function frameSets() {
  if (!fs.existsSync(ANIM)) return []
  return fs
    .readdirSync(ANIM, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(ANIM, e.name)
      const cells = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.webp')).sort()
      return { key: e.name, dir, cells }
    })
}

const sets = frameSets()

test('there is an installed frame set to weigh', () => {
  // Phase AN1e is the row that stopped the registry being empty. If this ever
  // finds nothing, every assertion below passes about no files at all.
  assert.ok(sets.length >= 1, 'no frame set under assets/images/enemies/anim/')
  assert.ok(sets.some((s) => s.key === 'float-eye'), 'the float-eye set must be installed')
  assert.ok(sets.some((s) => s.key === 'death-beholder'), 'the death-beholder set must be installed')
  assert.ok(sets.some((s) => s.key === 'green-jelly'), 'the green-jelly set must be installed')
  assert.ok(sets.some((s) => s.key === 'gallows-crow'), 'the gallows-crow set must be installed')
})

test('no shipped cell exceeds the recorded ceiling', () => {
  const ceiling = ceilingBytes()
  const over = []
  for (const { key, dir, cells } of sets) {
    for (const cell of cells) {
      const bytes = fs.statSync(path.join(dir, cell)).size
      if (bytes > ceiling) over.push(`${key}/${cell}: ${bytes} B > ${ceiling} B`)
    }
  }
  assert.deepEqual(over, [], 'a cell over the ceiling means the set was regenerated hotter')
})

for (const key of ['float-eye', 'death-beholder', 'green-jelly', 'gallows-crow', 'net-mender', 'crane-hook', 'brine-widow', 'lamprey-knot', 'curfew-ringer', 'wreck-picker', 'tithe-collector', 'cave-choir', 'lamplighter', 'wrecker', 'toll-keeper', 'smokehouse-gutter', 'tide-gate']) {
test(`the ${key} set is whole: 24 cells, named row-major`, () => {
  // A truncated set is the failure the registry's own validation catches at
  // runtime; catching it here says which FILE is missing rather than that a
  // count disagreed.
  const set = sets.find((s) => s.key === key)
  assert.equal(set.cells.length, 24)
  for (let i = 0; i < 24; i++) {
    assert.ok(
      set.cells.includes(`${key}-${String(i).padStart(2, '0')}.webp`),
      `cell ${i} is missing from the set`,
    )
  }
})
}

// A4, grade once (phase AN5c): every set cut from an image-model sheet was
// drawn from a portrait that was ingested in colour, so none is graded again.
// A set is one of these when its provenance names a cleanup report.
test('every image-model set is ungraded in its provenance and its manifest (A4)', () => {
  const frames = fs.readFileSync(path.join(ENEMIES, 'frames.ts'), 'utf-8')
  let audited = 0
  for (const set of sets) {
    const record = JSON.parse(fs.readFileSync(path.join(set.dir, 'provenance.json'), 'utf-8'))[0]
    if (!record.cleanup_report) continue
    audited++
    assert.equal(record.graded, false, `${set.key}: provenance says graded`)
    assert.equal(record.graded_in_this_run, false, `${set.key}: provenance says graded in its run`)
    assert.match(record.tool, /--no-grade/, `${set.key}: the recorded tool chain lacks --no-grade`)
    const name = set.key.toUpperCase().replace(/-/g, '_')
    const start = frames.indexOf(`const ${name}_FRAME_SET`)
    assert.ok(start >= 0, `${set.key}: no ${name}_FRAME_SET in frames.ts`)
    const block = frames.slice(start, frames.indexOf('\n};', start))
    assert.match(block, /graded: false/, `${set.key}: manifest says graded`)
  }
  assert.ok(audited >= 8, 'the audit found fewer image-model sets than AN5a-AN5c installed')
})

test('every provenance record states the measured cost, and it is the cost on disk', () => {
  for (const set of sets) {
    const record = JSON.parse(fs.readFileSync(path.join(set.dir, 'provenance.json'), 'utf-8'))[0]
    const bytes = set.cells.map((c) => fs.statSync(path.join(set.dir, c)).size)
    const total = bytes.reduce((a, b) => a + b, 0)
    const max = Math.max(...bytes)
    const mean = Math.round(total / bytes.length)

    assert.ok(record.measured, `${set.key}: the record must state what the set weighs`)
    for (const claim of [String(total), String(max), String(mean)]) {
      assert.ok(
        record.measured.includes(claim),
        `${set.key}: the record does not state ${claim}; measured total ${total}, max ${max}, mean ${mean}`,
      )
    }

    // And the comparison that makes the number mean something: what the static
    // painting costs, for the enemy this set replaces the stillness of.
    const staticBytes = fs.statSync(path.join(ENEMIES, `${set.key}.webp`)).size
    assert.ok(
      record.measured.includes(String(staticBytes)),
      `${set.key}: the record does not state the ${staticBytes} B static image it is measured against`,
    )
  }
})

// A6, the roster's bill (phase AN5e): frames.ts's BUNDLE COST passage states
// the total for every set together, and that sentence is held to the disk
// like each set's own record, so a regenerated set cannot leave it stale.
test("frames.ts states the whole roster's bundle total, and it is the total on disk", () => {
  const frames = fs.readFileSync(path.join(ENEMIES, 'frames.ts'), 'utf-8')
  const cells = sets.reduce((n, s) => n + s.cells.length, 0)
  const total = sets.reduce(
    (sum, s) => sum + s.cells.reduce((a, c) => a + fs.statSync(path.join(s.dir, c)).size, 0),
    0,
  )
  const portraits = sets.reduce((sum, s) => sum + fs.statSync(path.join(ENEMIES, `${s.key}.webp`)).size, 0)
  const m = frames.match(/THE WHOLE ROSTER[^:]*: (\d+) sets, (\d+) cells,\s*\*?\s*(\d+) B[\s\S]*?against (\d+) B/)
  assert.ok(m, "frames.ts's BUNDLE COST passage no longer states the whole roster's total")
  assert.deepEqual(
    m.slice(1).map(Number),
    [sets.length, cells, total, portraits],
    `the roster on disk is ${sets.length} sets, ${cells} cells, ${total} B against ${portraits} B static`,
  )
})

test('a frame set records that it was NOT graded on the way in (A6b)', () => {
  // Grade once. A derived set whose record said it had been graded here would
  // be the invitation to grade it again, and a double-graded cell renders
  // fine, passes every count check, and simply looks wrong beside the
  // static art.
  for (const { key, dir } of sets) {
    const record = JSON.parse(fs.readFileSync(path.join(dir, 'provenance.json'), 'utf-8'))[0]
    assert.equal(record.graded_in_this_run, false, `${key}: the ingest must have run --no-grade`)
    assert.ok(/no-grade/.test(record.tool), `${key}: the record must name the flag it ingested with`)
  }
})
