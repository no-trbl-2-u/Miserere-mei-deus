// scripts/pr-review.test.mjs — when the shadow reviewer runs (phase RV1b, A5):
// open same-repo `loop:pr` / `plot` PRs, never drafts on `pull_request`,
// once per head; a dispatched run also takes `eval:seed` drafts.
//
//   node --test scripts/pr-review.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import { DISPATCH_LABELS, REVIEW_LABELS, formatParentTests, headMarker, reviewWanted } from './pr-review.mjs'

const pr = (extra = {}) => ({
  state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr', 'size:M'], head: 'a'.repeat(40), comments: [], ...extra,
})

test('an open same-repo loop:pr or plot PR with no verdict on its head is reviewed', () => {
  assert.equal(reviewWanted(pr()).go, true)
  assert.equal(reviewWanted(pr({ labels: ['plot', 'review:plan-only'] })).go, true)
})

test('a fork, a closed or merged PR, or one with neither label is skipped', () => {
  assert.match(reviewWanted(pr({ isCrossRepository: true })).reason, /fork/)
  assert.equal(reviewWanted(pr({ state: 'MERGED' })).go, false)
  assert.equal(reviewWanted(pr({ state: 'CLOSED' })).go, false)
  assert.equal(reviewWanted(pr({ labels: ['area:ci', 'risk:high'] })).go, false)
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

test('a dispatched review takes eval:seed drafts and repeats a head, but never a fork', () => {
  const head = 'd'.repeat(40)
  const seedDraft = pr({ isDraft: true, labels: ['eval:seed'], head, comments: [headMarker(head)] })
  assert.equal(reviewWanted({ ...seedDraft, dispatch: true }).go, true)
  assert.equal(reviewWanted(seedDraft).go, false, 'eval:seed alone never reviews on pull_request')
  assert.equal(reviewWanted({ ...seedDraft, isCrossRepository: true, dispatch: true }).go, false)
  assert.equal(reviewWanted(pr({ labels: ['size:S'], dispatch: true })).go, false)
})

test('the label sets: pull_request reviews loop:pr and plot; dispatch adds eval:seed', () => {
  assert.deepEqual([...REVIEW_LABELS], ['loop:pr', 'plot'])
  assert.deepEqual([...DISPATCH_LABELS], ['loop:pr', 'plot', 'eval:seed'])
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
