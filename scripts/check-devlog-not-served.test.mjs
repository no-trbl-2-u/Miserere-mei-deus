// scripts/check-devlog-not-served.test.mjs — witness for the phase 57 guard
// (archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/phases/phase_57_devlog_pages_scopedown.md). Confirms the generated/
// source split the phase turned into policy: generated DevLog output is
// flagged, the source it's derived from is not.
//
//   node --test scripts/check-devlog-not-served.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import { isGeneratedDevlogPath, findServedGeneratedFiles } from './check-devlog-not-served.mjs'

const SOURCE_PATHS = [
  'devlog/README.md',
  'devlog/entries/DIGEST_2026-08-11.md',
  'devlog/assets/2026-08-11/combat-encounter.after.png',
  'devlog/assets/2026-08-11/combat-encounter.before.png',
  'devlog/assets/2026-08-11/combat-encounter.diff.png',
]

const GENERATED_PATHS = [
  'devlog/index.html',
  'devlog/log.html',
  'devlog/catalog.html',
  'devlog/atlas.html',
  'devlog/entries/DIGEST_2026-08-11.html',
  'devlog/data/cards.json',
  'devlog/data/effects.json',
  'devlog/data/enemies.json',
  'devlog/data/meta.json',
  'devlog/assets/catalog/cards/bleed.webp',
  'devlog/assets/catalog/enemies/some-enemy.webp',
]

test('a clean, source-only tree passes', () => {
  assert.deepEqual(findServedGeneratedFiles(SOURCE_PATHS), [])
})

test('every generated path in the phase 57 split is flagged', () => {
  assert.deepEqual(findServedGeneratedFiles(GENERATED_PATHS), GENERATED_PATHS)
})

test('a mixed tree flags only the generated members', () => {
  const mixed = [...SOURCE_PATHS, ...GENERATED_PATHS]
  assert.deepEqual(findServedGeneratedFiles(mixed), GENERATED_PATHS)
})

test('isGeneratedDevlogPath — entries/*.md source is not flagged, entries/*.html output is', () => {
  assert.equal(isGeneratedDevlogPath('devlog/entries/DIGEST_2026-01-01.md'), false)
  assert.equal(isGeneratedDevlogPath('devlog/entries/DIGEST_2026-01-01.html'), true)
})

test('isGeneratedDevlogPath — dated screenshot dirs are source, assets/catalog/** is generated', () => {
  assert.equal(isGeneratedDevlogPath('devlog/assets/2026-07-04/root.after.png'), false)
  assert.equal(isGeneratedDevlogPath('devlog/assets/catalog/cards/burn.webp'), true)
})
