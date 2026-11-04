// scripts/pr-files.test.mjs — a wide PR's file list is whole, or it fails.
// The first test drives the partition's own PR read (changedFromPr), the one
// that stopped at 100 files on #1350.
//
//   node --test scripts/pr-files.test.mjs

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { API_FILE_CAP, prFiles, prSnapshot, SNAPSHOT_TRIES } from './pr-files.mjs'
import { mergeView, mergeWanted } from './pr-merge.mjs'
import { changedFromPr, partition, renderManifest } from './pr-partition.mjs'
import { PIPELINE_PATHS } from './pr-policy.mjs'
import { fixView, fixWanted } from './pr-review.mjs'
import { replayRows, riskView } from './pr-risk.mjs'
import { ghPendingPrs } from './plan/triage-match.mjs'

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

/**
 * A fake GitHub a push lands on: `versions` are the PR's successive states
 * ({ sha, n }), and the head reads `pushAfter` names (1-based) are followed by
 * a push, so a list read after one comes from the next version.
 */
function pushedApi(versions, pushAfter) {
  let at = 0
  let headReads = 0
  const api = (endpoint) => {
    const now = versions[at]
    if (/\/pulls\/\d+$/.test(endpoint)) {
      headReads++
      if (pushAfter(headReads) && at < versions.length - 1) at++
      return { changed_files: now.n, labels: [], head: { sha: now.sha } }
    }
    const page = Number(/&page=(\d+)/.exec(endpoint)[1])
    const all = Array.from({ length: now.n }, (_, i) => ({ filename: `${now.sha}/f${i}.ts`, additions: 1, deletions: 0 }))
    return all.slice((page - 1) * 100, page * 100)
  }
  api.headReads = () => headReads
  return api
}

const staleThenNew = (n = 3, m = n) => pushedApi([{ sha: 'old', n }, { sha: 'new', n: m }], (read) => read === 1)

test('a push between the head read and the file read never pairs the new files with the old head', () => {
  const snap = prSnapshot(7, 'o/r', staleThenNew())
  assert.equal(snap.head, 'new')
  assert.ok(snap.files.every((f) => f.path.startsWith('new/')), 'the files are that head\'s own')
})

test('every PR reader takes the head its files belong to, not the head it read first', () => {
  const { changed, head } = changedFromPr(7, 'o/r', staleThenNew())
  assert.equal(head, 'new')
  assert.ok(changed.every((f) => f.path.startsWith('new/')))
  for (const read of [fixView, riskView]) {
    const v = read(7, 'o/r', () => ({ headRefOid: 'old', comments: [] }), staleThenNew())
    assert.equal(v.headRefOid, 'new', read.name)
    assert.ok(v.files.every((f) => f.path.startsWith('new/')), read.name)
    assert.deepEqual(v.comments, [], `${read.name} keeps the rest of the view`)
  }
})

test('a push that also changes the file count retries instead of failing on the count', () => {
  const snap = prSnapshot(7, 'o/r', staleThenNew(3, 5))
  assert.equal(snap.head, 'new')
  assert.equal(snap.files.length, 5)
})

test('a head that moves on every read fails loudly after the bounded tries', () => {
  const versions = Array.from({ length: 20 }, (_, i) => ({ sha: `s${i}`, n: 2 }))
  const api = pushedApi(versions, () => true)
  assert.throws(() => prSnapshot(7, 'o/r', api), /the head moved on each of 3 reads/)
  assert.equal(api.headReads(), SNAPSHOT_TRIES * 2, 'it stops at the bound')
})

test('a 101-file PR is read whole by every reader', () => {
  assert.equal(prFiles(7, 'o/r', fakeApi(101)).length, 101)
  const { changed, head } = changedFromPr(7, 'o/r', fakeApi(101))
  assert.equal(changed.length, 101)
  assert.equal(changed[100].path, 'axiomancer-mobile/f100.ts')
  assert.equal(head, 'abc')
  for (const read of [fixView, riskView]) assert.equal(read(7, 'o/r', () => ({}), fakeApi(101)).files.length, 101, read.name)
})

test('a pipeline path as the 101st file still holds the fixer', () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ filename: `axiomancer-mobile/f${i}.ts` }))
  rows.push({ filename: 'scripts/pr-files.mjs' })
  const api = (endpoint) => (/\/pulls\/\d+$/.test(endpoint)
    ? { changed_files: 101, labels: [], head: { sha: 'abc' } }
    : rows.slice((Number(/&page=(\d+)/.exec(endpoint)[1]) - 1) * 100, Number(/&page=(\d+)/.exec(endpoint)[1]) * 100))
  const v = fixView(7, 'o/r', () => ({}), api)
  const d = fixWanted({ state: 'OPEN', isDraft: false, isCrossRepository: false, labels: [], title: 'feat: x', files: v.files.map((f) => f.path), head: v.headRefOid, comments: [], pipelinePaths: PIPELINE_PATHS })
  assert.match(d.reason, /pipeline PR \(scripts\/pr-files\.mjs\)/)
})

test('a PR changing the file reader is held as pipeline', () => {
  assert.ok(PIPELINE_PATHS.includes('scripts/pr-files.mjs'))
  const head = 'a'.repeat(40)
  const d = mergeWanted({
    state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr'], title: 'feat: x', head, mergeStateStatus: 'CLEAN',
    checks: [{ name: 'verify-gate', conclusion: 'success', headSha: head }], comments: [], since: '2026-11-04T00:00:00Z', files: ['README.md', 'scripts/pr-files.mjs'],
  })
  assert.equal(d.go, false)
  assert.match(d.reason, /pipeline PR/)
})

test('the manifest prints the head its file list belongs to, and the review reads files from it', () => {
  const m = partition({ changed: [{ path: 'axiomancer-mobile/a.ts' }], tier: 'risk:low', reverse: new Map(), pr: 7, head: 'abc' })
  assert.match(renderManifest(m), /^Head abc: /m)
  assert.doesNotMatch(renderManifest(partition({ changed: [{ path: 'axiomancer-mobile/a.ts' }], tier: 'risk:low', reverse: new Map() })), /^Head /m)
  const skill = readFileSync(new URL('../skills/review.md', import.meta.url), 'utf8')
  assert.doesNotMatch(skill, /gh pr view[^\n]*--json[^\n]*\bfiles\b/, 'that read stops at 100 without failing')
})

/** A fake GitHub whose one PR has 100 mobile files and `last` as the 101st. */
function wideApi(last) {
  const rows = Array.from({ length: 100 }, (_, i) => ({ filename: `axiomancer-mobile/f${i}.ts`, additions: 1, deletions: 0 }))
  rows.push({ filename: last, additions: 1, deletions: 0 })
  return (endpoint) => {
    if (/\/pulls\/\d+$/.test(endpoint)) return { changed_files: 101, labels: [], head: { sha: 'abc' } }
    const page = Number(/&page=(\d+)/.exec(endpoint)[1])
    return rows.slice((page - 1) * 100, page * 100)
  }
}

test('the merge decision reads all 101 files and the snapshot head, not the view\'s first 100', async () => {
  const view = { state: 'OPEN', mergeStateStatus: 'CLEAN', headRefOid: 'stale', labels: [], comments: [], files: [{ path: 'only-the-first.ts' }] }
  const v = await mergeView('7', 'o/r', { gh: () => JSON.stringify(view), api: wideApi('scripts/pr-merge.mjs') })
  assert.equal(v.files.length, 101)
  assert.equal(v.files[100].path, 'scripts/pr-merge.mjs')
  assert.equal(v.headRefOid, 'abc')
})

test('replay tiers a merged 101-file PR by its 101st file', () => {
  const rows = replayRows([{ number: 7, labels: [], mergeCommit: null }], 'o/r', { api: wideApi('scripts/loop-issue.mjs'), newDeps: () => [] })
  assert.equal(rows[0].tier, 'risk:high')
  assert.ok(rows[0].reasons.some((r) => r.includes('scripts/loop-issue.mjs')))
})

test('triage-match finds the pending file that is the 101st file of an open PR', () => {
  const gh = (args) => (args[1] === 'list'
    ? JSON.stringify([{ number: 7 }])
    : 'diff --git a/plan/pending/9.9.md b/plan/pending/9.9.md\n+++ b/plan/pending/9.9.md\n+hello')
  const prs = ghPendingPrs(gh, { repo: 'o/r', api: wideApi('plan/pending/9.9.md') })
  assert.deepEqual(prs.map((p) => p.number), [7])
})
