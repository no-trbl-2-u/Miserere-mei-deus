// scripts/pr-files.test.mjs — a wide PR's file list is whole, or it fails.
// The first test drives the partition's own PR read (changedFromPr), the one
// that stopped at 100 files on #1350.
//
//   node --test scripts/pr-files.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import { API_FILE_CAP, prFiles } from './pr-files.mjs'
import { changedFromPr, partition } from './pr-partition.mjs'

/** A fake GitHub holding `n` files; `cap` mimics a list that stops early. */
function fakeApi(n, { cap = Infinity, reported = n } = {}) {
  const all = Array.from({ length: Math.min(n, cap) }, (_, i) => ({ filename: `axiomancer-mobile/f${i}.ts`, additions: i, deletions: 1 }))
  return (endpoint) => {
    if (/\/pulls\/\d+$/.test(endpoint)) return { changed_files: reported, labels: [{ name: 'risk:high' }], head: { sha: 'abc' } }
    const page = Number(/&page=(\d+)/.exec(endpoint)[1])
    return all.slice((page - 1) * 100, page * 100)
  }
}

test('the partition read of a 184-file PR carries all 184 files and the mobile package gets readers', () => {
  const { changed, labels, head } = changedFromPr(1350, 'o/r', fakeApi(184))
  assert.equal(changed.length, 184)
  assert.deepEqual(changed[183], { path: 'axiomancer-mobile/f183.ts', additions: 183, deletions: 1 })
  assert.deepEqual(labels, ['risk:high'])
  assert.equal(head, 'abc')
  const m = partition({ changed, tier: 'risk:high', labels, reverse: new Map() })
  assert.ok(JSON.stringify(m).includes('axiomancer-mobile'))
})

test('a list that stops at 100 while the PR reports 184 fails loudly', () => {
  assert.throws(() => prFiles(1350, 'o/r', fakeApi(184, { cap: 100 })), /read 100 files but the PR reports 184/)
})

test('a PR past the API cap fails loudly', () => {
  assert.throws(() => prFiles(9, 'o/r', fakeApi(10, { reported: API_FILE_CAP + 1 })), /stops at 3000/)
})

test('a PR of exactly 3000 files is read across 30 pages', () => {
  assert.equal(prFiles(9, 'o/r', fakeApi(3000)).length, 3000)
})
