// scripts/pr-review.test.mjs — when the reviewer runs (phase RV1b, A5; D95):
// every open same-repo PR, never drafts on `pull_request`, once per head;
// `eval:seed` drafts only on a dispatched run. Phase RV2:
// once per diff, so a head whose diff against the base a verdict already
// names is skipped whatever its SHA.
//
//   node --test scripts/pr-review.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import { DISPATCH_LABELS, DISPATCH_ONLY_LABELS, EXHAUSTED_LABEL, MAX_PASSES, REVIEW_LABELS, diffDigest, formatParentTests, headMarker, markedHeads, reviewWanted } from './pr-review.mjs'

const pr = (extra = {}) => ({
  state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr', 'size:M'], head: 'a'.repeat(40), comments: [], ...extra,
})

test('every open same-repo PR with no verdict on its head is reviewed, whatever its labels (D95)', () => {
  assert.equal(reviewWanted(pr()).go, true)
  assert.equal(reviewWanted(pr({ labels: ['plot', 'review:plan-only'] })).go, true)
  assert.equal(reviewWanted(pr({ labels: ['area:ci', 'risk:high'] })).go, true, 'no loop:pr label needed')
  assert.equal(reviewWanted(pr({ labels: [] })).go, true, 'a hand PR with no labels')
  assert.deepEqual([...REVIEW_LABELS], ['loop:pr', 'plot'])
})

test('a fork, a closed or merged PR, or a seeded draft on pull_request is skipped', () => {
  assert.match(reviewWanted(pr({ isCrossRepository: true })).reason, /fork/)
  assert.equal(reviewWanted(pr({ state: 'MERGED' })).go, false)
  assert.equal(reviewWanted(pr({ state: 'CLOSED' })).go, false)
  assert.deepEqual([...DISPATCH_ONLY_LABELS], ['eval:seed'])
  assert.match(reviewWanted(pr({ labels: ['eval:seed'] })).reason, /dispatch only/)
  assert.match(reviewWanted(pr({ labels: ['eval:seed'], isDraft: true })).reason, /dispatch only/)
})

test('two verdicts on a PR end its automated review; a dispatch still reviews it (T, 2026-10-20)', () => {
  assert.equal(MAX_PASSES, 2)
  assert.equal(EXHAUSTED_LABEL, 'review:exhausted')
  const v = (sha) => `## Review verdict\n<!-- pr-review:verdict not-pass -->\n${headMarker(sha)}`
  const one = pr({ head: 'c'.repeat(40), comments: [v('a'.repeat(40))] })
  assert.equal(reviewWanted(one).go, true, 'one verdict: the fixed head gets its second pass')
  const two = pr({ head: 'c'.repeat(40), comments: [v('a'.repeat(40)), v('b'.repeat(40))] })
  const d = reviewWanted(two)
  assert.equal(d.go, false)
  assert.equal(d.exhausted, true)
  assert.match(d.reason, /cap is 2 passes/)
  assert.equal(reviewWanted({ ...two, dispatch: true }).go, true)
  assert.equal(reviewWanted(pr({ head: 'c'.repeat(40), comments: ['no markers here', 'pr-review:verdict pass in prose'] })).go, true, 'only marker-bearing comments count')
})

test('drafts wait on pull_request', () => {
  assert.deepEqual(reviewWanted(pr({ isDraft: true })), { go: false, reason: 'draft' })
})

test('a head that already has a verdict is not reviewed again; a new head is', () => {
  const head = 'b'.repeat(40)
  const verdict = `## Review verdict\n<!-- pr-review:verdict pass -->\n${headMarker(head)}`
  assert.equal(reviewWanted(pr({ head, comments: [verdict] })).go, false)
  assert.equal(reviewWanted(pr({ head: 'c'.repeat(40), comments: [verdict] })).go, true)
})

// --- the diff digest (phase RV2) ----------------------------------------------

const PATCH = [
  'diff --git a/x.mjs b/x.mjs', '--- a/x.mjs', '+++ b/x.mjs', '@@ -1,2 +1,2 @@', ' a', '-b', '+c',
  'diff --git a/y.mjs b/y.mjs', '--- a/y.mjs', '+++ b/y.mjs', '@@ -10,2 +10,2 @@', ' a', '-b', '+d', '',
].join('\n')

test('diffDigest hashes a patch stably, ignores hunk line numbers, and sees an edited line', () => {
  const d = diffDigest(PATCH)
  assert.match(d, /^[0-9a-f]{40}$/)
  assert.equal(diffDigest(PATCH), d)
  assert.equal(diffDigest(PATCH.replace('@@ -10,2 +10,2 @@', '@@ -50,2 +50,2 @@')), d, 'a merge that moves the hunk keeps the digest')
  assert.notEqual(diffDigest(PATCH.replace('+d', '+e')), d, 'a resolution that edits a line changes it')
  assert.equal(diffDigest(''), null)
  assert.equal(diffDigest('  \n'), null)
})

test('the marker is one line, greppable for the SHA, and reads back in both shapes', () => {
  const sha = 'e'.repeat(40)
  const dg = 'f'.repeat(40)
  assert.equal(headMarker(sha), `<!-- pr-review:head ${sha} -->`)
  assert.equal(headMarker(sha, dg), `<!-- pr-review:head ${sha} diff ${dg} -->`)
  assert.ok(!headMarker(sha, dg).includes('\n'))
  assert.ok(headMarker(sha, dg).includes(`pr-review:head ${sha}`))
  assert.deepEqual(markedHeads(`x\n${headMarker(sha, dg)}\n${headMarker('1'.repeat(40))}`), [
    { sha, digest: dg }, { sha: '1'.repeat(40), digest: null },
  ])
  assert.deepEqual(markedHeads('no marker here'), [])
})

test('a new SHA whose diff a verdict already names is skipped, and the reason names the digest', () => {
  const dg = diffDigest(PATCH)
  const verdict = `## Review verdict\n<!-- pr-review:verdict pass -->\n${headMarker('b'.repeat(40), dg)}`
  const d = reviewWanted(pr({ head: 'c'.repeat(40), digest: dg, comments: [verdict] }))
  assert.equal(d.go, false)
  assert.match(d.reason, new RegExp(`diff ${dg.slice(0, 8)} already has a verdict`))
})

test('the same SHA still skips under the new marker, with or without a digest', () => {
  const head = 'b'.repeat(40)
  const verdict = headMarker(head, '9'.repeat(40))
  assert.equal(reviewWanted(pr({ head, comments: [verdict] })).go, false)
  assert.equal(reviewWanted(pr({ head, digest: '8'.repeat(40), comments: [verdict] })).go, false)
})

test('a changed diff on a new SHA is reviewed', () => {
  const verdict = headMarker('b'.repeat(40), diffDigest(PATCH))
  const d = reviewWanted(pr({ head: 'c'.repeat(40), digest: diffDigest(PATCH.replace('+d', '+e')), comments: [verdict] }))
  assert.equal(d.go, true)
})

test('old SHA-only verdicts never skip a different head, and never throw', () => {
  const old = ['## Review verdict', headMarker('b'.repeat(40)), 'garbage <!-- pr-review:head -->'].join('\n')
  assert.equal(reviewWanted(pr({ head: 'c'.repeat(40), digest: diffDigest(PATCH), comments: [old, ''] })).go, true)
})

test('no digest falls back to the SHA rule and says so', () => {
  const dg = diffDigest(PATCH)
  const verdict = headMarker('b'.repeat(40), dg)
  const d = reviewWanted(pr({ head: 'c'.repeat(40), digest: null, comments: [verdict] }))
  assert.equal(d.go, true, 'a missing digest never silences a review')
  assert.match(d.reason, /digest unavailable/)
  assert.equal(reviewWanted(pr({ head: 'b'.repeat(40), comments: [verdict] })).go, false)
})

test('the RV1b gates hold before the digest is read', () => {
  const dg = diffDigest(PATCH)
  assert.equal(reviewWanted(pr({ digest: dg, isCrossRepository: true })).go, false)
  assert.equal(reviewWanted(pr({ digest: dg, isDraft: true })).go, false)
  assert.equal(reviewWanted(pr({ digest: dg, state: 'CLOSED' })).go, false)
  assert.equal(reviewWanted(pr({ digest: dg, labels: ['eval:seed'] })).go, false)
  const verdict = headMarker('b'.repeat(40), dg)
  assert.equal(reviewWanted(pr({ head: 'c'.repeat(40), digest: dg, comments: [verdict], dispatch: true })).go, true, 'a dispatch always reviews')
})

test('a dispatched review takes eval:seed drafts and repeats a head, but never a fork', () => {
  const head = 'd'.repeat(40)
  const seedDraft = pr({ isDraft: true, labels: ['eval:seed'], head, comments: [headMarker(head)] })
  assert.equal(reviewWanted({ ...seedDraft, dispatch: true }).go, true)
  assert.equal(reviewWanted(seedDraft).go, false, 'eval:seed alone never reviews on pull_request')
  assert.equal(reviewWanted({ ...seedDraft, isCrossRepository: true, dispatch: true }).go, false)
  assert.equal(reviewWanted(pr({ labels: ['size:S'], dispatch: true })).go, true, 'a dispatch reviews any same-repo PR (D95)')
})

test('the label sets: eval:seed is the one dispatch-only label', () => {
  assert.deepEqual([...REVIEW_LABELS], ['loop:pr', 'plot'])
  assert.deepEqual([...DISPATCH_LABELS], ['loop:pr', 'plot', 'eval:seed'])
  assert.deepEqual([...DISPATCH_LABELS].filter((l) => !REVIEW_LABELS.includes(l)), [...DISPATCH_ONLY_LABELS])
})

test('parent-tests reports each file and how many could not fail (the Tests lens, RV1c)', () => {
  assert.equal(formatParentTests([]), 'parent-tests: the PR adds or changes no test file')
  const out = formatParentTests([
    { path: 'scripts/a.test.mjs', verdict: 'could-not-fail', reason: 'passes on the parent', couldNotFailCases: ['pins x'], newCases: 1 },
    { path: 'scripts/b.test.mjs', verdict: 'fails-on-parent', reason: 'a case fails on the parent', couldNotFailCases: [], newCases: 2 },
  ]).split('\n')
  assert.equal(out.length, 3)
  assert.match(out[0], /^could-not-fail +scripts\/a\.test\.mjs \(passes on the parent; new cases passing on the base: pins x\)$/)
  assert.match(out[1], /^fails-on-parent scripts\/b\.test\.mjs \(a case fails on the parent\)$/)
  assert.equal(out[2], 'parent-tests: 1 of 2 file(s) could not fail on the change')
})
