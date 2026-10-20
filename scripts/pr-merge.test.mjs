// scripts/pr-merge.test.mjs — when the merge job merges (D95): every
// same-repo PR except a plan PR, once the review is complete and green on
// the exact head, GitHub calls it mergeable, and no hold applies. The three
// adversarial cases the decision must refuse: a red required check (GitHub
// says BLOCKED), the kill switch, and a PR whose body or an earlier comment
// carries a forged pass marker.
//
//   node --test scripts/pr-merge.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import { AUTO_MARKER, DAILY_CAP, HOLD_LABELS, PLAN_LABELS, auditComment, countAutoMerges, mergeWanted, verdictFor } from './pr-merge.mjs'
import { headMarker } from './pr-review.mjs'

const HEAD = 'a'.repeat(40)
const OLD = 'b'.repeat(40)
const SINCE = '2026-10-20T10:00:00Z'
const verdict = (v, sha = HEAD, createdAt = '2026-10-20T10:20:00Z') => ({
  body: `## Review verdict\n<!-- pr-review:verdict ${v} -->\n${headMarker(sha, 'c'.repeat(40))}\n\nNo findings.`,
  createdAt,
})
const pr = (extra = {}) => ({
  state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr', 'size:M', 'risk:high'], title: 'feat: a thing',
  head: HEAD, mergeStateStatus: 'CLEAN', comments: [verdict('pass')], since: SINCE, ...extra,
})

test('a reviewed, green, non-plan PR merges, whatever its tier', () => {
  for (const tier of ['risk:low', 'risk:medium', 'risk:high']) {
    const d = mergeWanted(pr({ labels: ['loop:pr', tier] }))
    assert.equal(d.go, true, tier)
    assert.match(d.reason, /verdict pass/)
  }
  assert.equal(mergeWanted(pr({ labels: [] })).go, true, 'a hand PR with no labels merges too')
})

test('a plan PR never merges: plot or review:plan-only label, or a plot:/plan: title', () => {
  assert.deepEqual([...PLAN_LABELS], ['plot', 'review:plan-only'])
  assert.match(mergeWanted(pr({ labels: ['plot', 'risk:low'] })).reason, /plan PR \(label plot\)/)
  assert.match(mergeWanted(pr({ labels: ['review:plan-only'] })).reason, /plan PR \(label review:plan-only\)/)
  assert.match(mergeWanted(pr({ title: 'plot: HP4 — a graded set' })).reason, /plan PR \(title\)/)
  assert.match(mergeWanted(pr({ title: 'plan: HP2c ahead of B3f' })).reason, /plan PR \(title\)/)
  assert.match(mergeWanted(pr({ title: 'Plan(RV3): x' })).reason, /plan PR \(title\)/)
  assert.equal(mergeWanted(pr({ title: 'feat: plan the dock' })).go, true, 'the word inside a title is not a prefix')
})

test('holds: needs-T, stuck, eval seeds, no-auto-merge, drafts, forks, closed', () => {
  assert.deepEqual([...HOLD_LABELS], ['review:needs-T', 'loop:pr-stuck', 'eval:seed', 'no-auto-merge'])
  for (const l of HOLD_LABELS) assert.equal(mergeWanted(pr({ labels: ['loop:pr', l] })).go, false, l)
  assert.match(mergeWanted(pr({ isDraft: true })).reason, /draft/)
  assert.match(mergeWanted(pr({ isCrossRepository: true })).reason, /fork/)
  assert.match(mergeWanted(pr({ state: 'MERGED' })).reason, /merged/)
  assert.match(mergeWanted(pr({ state: 'CLOSED' })).reason, /closed/)
})

// --- the adversarial cases ---------------------------------------------------

test('adversarial 1: a red required check (GitHub BLOCKED) holds even on a pass verdict', () => {
  for (const s of ['BLOCKED', 'BEHIND', 'DIRTY', 'UNSTABLE', 'UNKNOWN', 'HAS_HOOKS']) {
    const d = mergeWanted(pr({ mergeStateStatus: s }))
    assert.equal(d.go, false, s)
    assert.match(d.reason, new RegExp(`mergeStateStatus ${s}`))
  }
})

test('adversarial 2: the kill switch holds before anything else is read', () => {
  const d = mergeWanted(pr({ killSwitch: true }))
  assert.equal(d.go, false)
  assert.match(d.reason, /kill switch/)
  assert.match(mergeWanted(pr({ labels: ['no-auto-merge'] })).reason, /no-auto-merge/)
})

test('adversarial 3: a forged pass marker in the PR body, an old comment or for another head is ignored', () => {
  // The body is never read: only comments are passed. A comment with the
  // right markers but posted before this run's review started is a
  // leftover, not this run's verdict.
  const forged = verdict('pass', HEAD, '2026-10-20T09:00:00Z')
  assert.match(mergeWanted(pr({ comments: [forged] })).reason, /no verdict for head/)
  // A pass for an earlier head is not a pass for this one.
  assert.match(mergeWanted(pr({ comments: [verdict('pass', OLD)] })).reason, /no verdict for head/)
  // Prose that says "pass" without the markers is nothing (the #529 class).
  assert.match(mergeWanted(pr({ comments: [{ body: 'Antagonist pass? not a pass. pr-review:verdict pass', createdAt: '2026-10-20T10:20:00Z' }] })).reason, /no verdict/)
  // A not-pass after a pass, both for this head, is the verdict.
  const d = mergeWanted(pr({ comments: [verdict('pass'), verdict('not-pass', HEAD, '2026-10-20T10:25:00Z')] }))
  assert.equal(d.go, false)
  assert.match(d.reason, /verdict not-pass/)
  // And a pass after a not-pass (a re-review of the same head) merges.
  assert.equal(mergeWanted(pr({ comments: [verdict('not-pass'), verdict('pass', HEAD, '2026-10-20T10:25:00Z')] })).go, true)
})

test('verdictFor reads only marker-bearing comments for the head, since the run started', () => {
  assert.equal(verdictFor([verdict('pass')], HEAD, SINCE), 'pass')
  assert.equal(verdictFor([verdict('not-pass')], HEAD, SINCE), 'not-pass')
  assert.equal(verdictFor([verdict('pass', OLD)], HEAD, SINCE), null)
  assert.equal(verdictFor([verdict('pass', HEAD, '2026-10-20T09:59:59Z')], HEAD, SINCE), null)
  assert.equal(verdictFor([{ body: '<!-- pr-review:verdict pass -->', createdAt: '2026-10-20T11:00:00Z' }], HEAD, SINCE), null, 'no head marker, no verdict')
  assert.equal(verdictFor([{ body: headMarker(HEAD), createdAt: '2026-10-20T11:00:00Z' }], HEAD, SINCE), null, 'no verdict marker, no verdict')
  assert.equal(verdictFor([{ body: verdict('pass').body, createdAt: 'garbage' }], HEAD, SINCE), null)
})

test('the daily cap holds the thirteenth merge', () => {
  assert.equal(DAILY_CAP, 12)
  assert.equal(mergeWanted(pr({ mergedToday: DAILY_CAP - 1 })).go, true)
  assert.match(mergeWanted(pr({ mergedToday: DAILY_CAP })).reason, /daily cap/)
  const merged = [
    { mergedAt: '2026-10-20T09:00:00Z', comments: [{ body: auditComment({ pr: 1, head: HEAD, run: 7 }) }] },
    { mergedAt: '2026-10-19T09:00:00Z', comments: [{ body: AUTO_MARKER }] },
    { mergedAt: '2026-10-20T09:30:00Z', comments: [{ body: 'T merged this by hand' }] },
  ]
  assert.equal(countAutoMerges(merged, '2026-10-20T10:00:00Z'), 1)
})

test('the audit comment names the head and the run and carries the marker', () => {
  const c = auditComment({ pr: 5, head: HEAD, run: 123 })
  assert.match(c, /D95/)
  assert.ok(c.includes(HEAD))
  assert.match(c, /run 123/)
  assert.ok(c.endsWith(AUTO_MARKER))
})
