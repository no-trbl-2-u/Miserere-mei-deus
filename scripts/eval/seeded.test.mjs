// scripts/eval/seeded.test.mjs — the pure parts of the seeded replay's
// review judge (phase RV1c, A7): the throwaway branch names, the planted
// hunks, whether a verdict names a planted line, and the three Part 4
// "before Stage 1" thresholds.
//
//   node --test scripts/eval/seeded.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LINE_SLACK, REVIEW_SECTION_END, REVIEW_SECTION_START, flagsPlanted, hunkRanges, percentile, renderReviewSection,
  reviewBranches, reviewThresholds, verdictRows,
} from './seeded-lib.mjs'

// The shape `skills/review.md` Step 5 posts, as a recorded three-lens verdict.
const VERDICT = [
  '## Review verdict',
  '<!-- pr-review:verdict not-pass -->',
  `<!-- pr-review:head ${'a'.repeat(40)} -->`,
  '',
  '| Severity | Where | Finding |',
  '|---|---|---|',
  '| HIGH | `axiomancer-mobile/state/presenters/card-program.engine.ts:115` | [rules] riderPairs skips damage riders, so no FREE pill |',
  '| MED | `scripts/build-catalog.mjs:40-44` | [tests][blast] no test beside the catalog change |',
  '| LOW | - | [tests] lens did not finish |',
  '',
  'Risk: derived `risk:medium`; raised to `risk:high`: [rules] a printed pill the engine never applies.',
].join('\n')

const DIFF = [
  'diff --git a/axiomancer-mobile/state/presenters/card-program.engine.ts b/axiomancer-mobile/state/presenters/card-program.engine.ts',
  '--- a/axiomancer-mobile/state/presenters/card-program.engine.ts',
  '+++ b/axiomancer-mobile/state/presenters/card-program.engine.ts',
  '@@ -112,6 +112,2 @@ export function riderPairs(',
  '@@ -200,3 +196,0 @@',
  'diff --git a/gone.ts b/gone.ts',
  '--- a/gone.ts',
  '+++ /dev/null',
  '@@ -1,4 +0,0 @@',
  '--- a/scripts/x.mjs',
  '+++ b/scripts/x.mjs',
  '@@ -7 +7 @@',
].join('\n')

test('each seed gets two eval/ branches, never a loop/ one', () => {
  assert.deepEqual(reviewBranches('D3'), { seed: 'eval/seed-D3', control: 'eval/control-D3' })
})

test('hunkRanges reads the new side; a pure deletion covers the line it sits at; a deleted file has none', () => {
  const h = hunkRanges(DIFF)
  assert.deepEqual(h['axiomancer-mobile/state/presenters/card-program.engine.ts'], [[112, 113], [196, 196]])
  assert.deepEqual(h['scripts/x.mjs'], [[7, 7]])
  assert.equal(h['gone.ts'], undefined)
})

test('verdictRows reads severity, path and line, with or without backticks or a range', () => {
  const rows = verdictRows(VERDICT)
  assert.equal(rows.length, 3)
  assert.deepEqual(rows[0], { severity: 'HIGH', path: 'axiomancer-mobile/state/presenters/card-program.engine.ts', line: 115, finding: '[rules] riderPairs skips damage riders, so no FREE pill' })
  assert.deepEqual([rows[1].path, rows[1].line], ['scripts/build-catalog.mjs', 40])
  assert.deepEqual([rows[2].path, rows[2].line], ['-', null])
  assert.deepEqual(verdictRows('No findings.'), [])
})

test('a MED+ row within the slack of a planted hunk flags the seed; LOW rows and other files do not', () => {
  const hunks = hunkRanges(DIFF)
  const got = flagsPlanted(VERDICT, hunks)
  assert.equal(LINE_SLACK, 3)
  assert.deepEqual(got, { flagged: true, medPlus: 2, high: 1, hits: ['axiomancer-mobile/state/presenters/card-program.engine.ts:115'] })
  // Line 115 is two inside the slack of 112-113, and five past a 100-110 hunk.
  assert.equal(flagsPlanted(VERDICT, { 'axiomancer-mobile/state/presenters/card-program.engine.ts': [[100, 110]] }).flagged, false)
  assert.equal(flagsPlanted('| LOW | `scripts/x.mjs:7` | x |', hunks).flagged, false, 'a LOW row never counts')
  assert.equal(flagsPlanted('| HIGH | `scripts/x.mjs` | no line |', hunks).flagged, false, 'a row with no line does not name the line')
})

test('percentile is nearest-rank: the p90 of four runs is the slowest', () => {
  assert.equal(percentile([12, 3, 19, 8], 0.9), 19)
  assert.equal(percentile([12, Infinity], 0.9), Infinity)
  assert.equal(percentile([], 0.9), null)
})

const run = (extra) => ({ pr: 1, posted: true, seconds: 600, verdict: 'pass', medPlus: 0, high: 0, hits: [], flagged: false, ...extra })
const seed = (id, seedRun, controlRun) => ({ id, review: { seed: seedRun, control: controlRun } })

test('the three Part 4 rows pass on 3 of 4 flagged, clean controls and a p90 within 20 minutes', () => {
  const seeds = [
    seed('D1', run({ flagged: true, seconds: 540 }), run()),
    seed('D2', run({ flagged: true, seconds: 900 }), run({ medPlus: 1 })),
    seed('D3', run({ flagged: false, seconds: 1100 }), run()),
    seed('D4', run({ flagged: true, seconds: 1200 }), run()),
  ]
  assert.deepEqual(reviewThresholds(seeds).map((r) => [r.value, r.verdict]), [['3 of 4', 'pass'], ['4 of 4 within', 'pass'], ['20.0 min', 'pass']])
})

test('a HIGH on a control, a run that never posted, or 2 of 4 flagged fails its row', () => {
  const seeds = [
    seed('D1', run({ flagged: true }), run({ high: 1, medPlus: 1 })),
    seed('D2', { pr: 2, posted: false, why: 'no verdict within 35 min' }, run()),
    seed('D3', run({ flagged: true }), { pr: 4, posted: false }),
    seed('D4', run(), run({ medPlus: 2 })),
  ]
  assert.deepEqual(reviewThresholds(seeds).map((r) => [r.value, r.verdict]), [['2 of 4', 'fail'], ['1 of 4 within', 'fail'], ['a run never posted', 'fail']])
})

test('before the judge runs every row is not measured, and the section says so', () => {
  const rows = reviewThresholds([{ id: 'D1' }, { id: 'D2' }])
  assert.ok(rows.every((r) => r.verdict === 'not measured' && r.value === 'not measured'))
  const md = renderReviewSection({ stamp: null, seeds: [] })
  assert.ok(md.startsWith(REVIEW_SECTION_START) && md.endsWith(REVIEW_SECTION_END))
  assert.match(md, /Not measured yet/)
  assert.doesNotMatch(md, /\| Seed \| Planted PR/)
})

test('after a run the section carries the stamp and a row per seed', () => {
  const md = renderReviewSection({ stamp: { commit: 'abc12345', date: '2026-10-18' }, seeds: [seed('D1', run({ pr: 9, flagged: true, hits: ['a.ts:4'], medPlus: 1, high: 1, verdict: 'not-pass' }), run({ pr: 10 }))] })
  assert.match(md, /Stamp: commit `abc12345`/)
  assert.match(md, /\| D1 \| #9: not-pass, 1 MED\+ \(1 HIGH\), 10\.0 min \| a\.ts:4 \| #10: pass, 0 MED\+ \(0 HIGH\), 10\.0 min \|/)
})
