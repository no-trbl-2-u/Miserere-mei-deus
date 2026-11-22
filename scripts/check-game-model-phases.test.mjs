// scripts/check-game-model-phases.test.mjs — witness for the stale-phase check:
// a doc line "until phase <alias>" fails once the archive lists that alias as
// shipped, and the real game model has none.
//
//   node --test scripts/check-game-model-phases.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { shippedAliases, untilPhaseClaims, stalePhaseClaims } from './check-game-model-phases.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ARCHIVE = [
  '- 2026-10-28 · 258.3 (alias: DY1c) · A lethal hazard in the app · a5c01dad3 (#1024)',
  '- 2026-11-12 · 178.3 (alias: SS1c) · Scenes · #1638',
].join('\n')

test('shippedAliases reads every alias in the archive', () => {
  assert.deepEqual([...shippedAliases(ARCHIVE)].sort(), ['DY1c', 'SS1c'])
})

test('untilPhaseClaims finds the alias and its line, across a line break', () => {
  const doc = 'a\nstill resets the run until phase DY1c.\nb until\nphase QL9z, then\n'
  assert.deepEqual(untilPhaseClaims(doc), [
    { alias: 'DY1c', line: 2 },
    { alias: 'QL9z', line: 3 },
  ])
})

test('a claim whose phase shipped is stale; one still to come is not', () => {
  const doc = 'resets until phase DY1c.\nand until phase ZZ9z.\n'
  assert.deepEqual(stalePhaseClaims(doc, ARCHIVE), [{ alias: 'DY1c', line: 1 }])
})

test('docs/game-model.md names no phase as to come that the archive lists as shipped', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs/game-model.md'), 'utf8')
  const archive = fs.readFileSync(path.join(ROOT, 'plan/ARCHIVE.md'), 'utf8')
  assert.deepEqual(stalePhaseClaims(doc, archive), [])
})
