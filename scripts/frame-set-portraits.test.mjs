// scripts/frame-set-portraits.test.mjs — a swapped portrait drops its
// animation (phase AN5a, A7).
//
//   node --test scripts/frame-set-portraits.test.mjs
//
// Chapter 1's frame sets are drawn FROM a static portrait: an image model was
// handed the stand-in painting and asked for 24 poses of it. T will swap the
// stand-ins for new portraits (the Nov 8 deadline), and T ruled (2026-10-30)
// that a swap retires the set rather than waiting on it: the enemy goes back
// to static until a sheet is drawn from the new portrait. An enemy that
// idles as one painting and is then drawn as another is the failure this
// stops, and it would pass every other check in the repo.
//
// So it is mechanised, not remembered. Every set's provenance records the
// SHA-256 of the portrait it was drawn from (`portrait_sha256`), and this
// fails, naming the key, when a key in ENEMY_FRAME_SETS has a static portrait
// whose bytes no longer match.

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENEMIES = path.join(REPO, 'axiomancer-mobile', 'assets', 'images', 'enemies')

/** The keys of `ENEMY_FRAME_SETS`, read from the registry's own source. */
export function frameSetKeys(enemiesDir) {
  const source = fs.readFileSync(path.join(enemiesDir, 'frames.ts'), 'utf-8')
  const block = source.match(/export const ENEMY_FRAME_SETS[^=]*=\s*\{([\s\S]*?)\n\};/)
  assert.ok(block, 'frames.ts no longer declares ENEMY_FRAME_SETS as an object literal')
  return [...block[1].matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1])
}

/** `key -> portrait file`, from the static registry's literal `require()`s. */
export function portraitFiles(enemiesDir) {
  const source = fs.readFileSync(path.join(enemiesDir, 'index.ts'), 'utf-8')
  const out = new Map()
  for (const m of source.matchAll(/'([a-z0-9-]+)'\s*:\s*require\('\.\/([^']+)'\)/g)) out.set(m[1], m[2])
  return out
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

/** Every frame set whose portrait is not the one it was drawn from, named. */
export function portraitProblems(enemiesDir) {
  const portraits = portraitFiles(enemiesDir)
  const problems = []
  for (const key of frameSetKeys(enemiesDir)) {
    const portrait = portraits.get(key)
    // A set with no static portrait is not this rule's business: nothing can
    // be swapped out from under it.
    if (!portrait) continue
    const provPath = path.join(enemiesDir, 'anim', key, 'provenance.json')
    if (!fs.existsSync(provPath)) {
      problems.push(`${key}: anim/${key}/provenance.json is missing, so nothing records the portrait it was drawn from`)
      continue
    }
    const recorded = JSON.parse(fs.readFileSync(provPath, 'utf-8'))[0]?.portrait_sha256
    if (!/^[0-9a-f]{64}$/.test(recorded ?? '')) {
      problems.push(`${key}: its provenance records no portrait_sha256 for ${portrait}`)
      continue
    }
    const actual = sha256(path.join(enemiesDir, portrait))
    if (actual !== recorded) {
      problems.push(
        `${key}: the static portrait ${portrait} changed (sha256 ${actual.slice(0, 12)}, the set was drawn `
          + `from ${recorded.slice(0, 12)}); remove its frame set or regenerate it from the new portrait`,
      )
    }
  }
  return problems
}

test('every frame set was drawn from the portrait that ships beside it', () => {
  const keys = frameSetKeys(ENEMIES)
  // If the parse ever finds nothing, the check below passes about nothing.
  for (const key of ['float-eye', 'death-beholder', 'green-jelly', 'gallows-crow']) {
    assert.ok(keys.includes(key), `ENEMY_FRAME_SETS has no '${key}' (or the parse broke)`)
  }
  assert.deepEqual(portraitProblems(ENEMIES), [], 'a frame set must be retired when its portrait is swapped')
})

/** A two-set copy of the registry in a temp dir, for the failure cases. */
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-set-portraits-'))
  fs.writeFileSync(path.join(dir, 'frames.ts'), [
    "export const ENEMY_FRAME_SETS: Readonly<Record<string, EnemyFrameSet>> = {",
    "    'crow': CROW_FRAME_SET,",
    "    'eye': EYE_FRAME_SET,",
    '};',
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(dir, 'index.ts'), [
    'export const ENEMY_ART_BY_KEY = {',
    "    'crow':      require('./crow.webp'),",
    "    'eye':       require('./eye.webp'),",
    "    'still':     require('./still.webp'),",
    '};',
    '',
  ].join('\n'))
  for (const key of ['crow', 'eye', 'still']) {
    fs.writeFileSync(path.join(dir, `${key}.webp`), `the ${key} portrait`)
  }
  for (const key of ['crow', 'eye']) {
    fs.mkdirSync(path.join(dir, 'anim', key), { recursive: true })
    const record = [{ portrait: `${key}.webp`, portrait_sha256: sha256(path.join(dir, `${key}.webp`)) }]
    fs.writeFileSync(path.join(dir, 'anim', key, 'provenance.json'), JSON.stringify(record))
  }
  return dir
}

test('the fixture passes untouched: the check reads what it is meant to', () => {
  const dir = fixture()
  try {
    assert.deepEqual(frameSetKeys(dir), ['crow', 'eye'])
    assert.deepEqual(portraitProblems(dir), [])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a changed portrait fails, naming the key and what to do about it', () => {
  const dir = fixture()
  try {
    fs.writeFileSync(path.join(dir, 'crow.webp'), "T's new portrait of the crow")
    const problems = portraitProblems(dir)
    assert.equal(problems.length, 1)
    assert.match(problems[0], /^crow: /)
    assert.match(problems[0], /remove its frame set or regenerate it/)
    // A static enemy's portrait is free to change: it has no set to retire.
    fs.writeFileSync(path.join(dir, 'still.webp'), 'a new static portrait')
    assert.equal(portraitProblems(dir).length, 1)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a set whose provenance records no portrait hash fails too', () => {
  const dir = fixture()
  try {
    fs.writeFileSync(path.join(dir, 'anim', 'eye', 'provenance.json'), JSON.stringify([{ portrait: 'eye.webp' }]))
    assert.deepEqual(portraitProblems(dir), ['eye: its provenance records no portrait_sha256 for eye.webp'])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
