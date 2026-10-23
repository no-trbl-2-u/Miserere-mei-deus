// scripts/eval/miss-rates.test.mjs — the pure EV1c parts: the miss-rate
// arithmetic from a fixture ledger (A7), including the "not measured" rows;
// the mutation tallies and progress parse (A5); and the planted-defect
// paths, related tests and gate verdicts (A6); and the `/critique` pass
// records and their score (LG1e, A5).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SECTION_END, SECTION_START, citesPass, computeMissRates, parsePassRecords, rate, renderMissRateSection, scoreCritique } from './miss-rates-lib.mjs'
import { combineTallies, parseProgress, renderMutationSection, spliceMarked, summarizeReport, tallyMutants } from './mutation-lib.mjs'
import { ciVerdict, plantedPaths, relatedTests, testVerdict } from './seeded-lib.mjs'

const pr = (number, extra = {}) => ({ number, uncovered: [], ran: [], followUps: [], antagonist: { verdict: 'none', mergedOnNotPass: false }, ...extra })
const seed = (id, prNo, ci, before, after, triggered = ['verify-mobile.yml']) => ({ id, pr: prNo, triggered, gates: { ci: { verdict: ci }, before: { verdict: before }, after: { verdict: after } } })

const ledger = {
  rows: [
    pr(520, { antagonist: { verdict: 'pass', mergedOnNotPass: false } }),
    pr(526, { uncovered: ['scripts/x.mjs'], antagonist: { verdict: 'pass', mergedOnNotPass: false } }),
    pr(528, { antagonist: { verdict: 'pass', mergedOnNotPass: false } }),
    pr(529, { ran: [{ finishedAfterMerge: true }], antagonist: { verdict: 'not-pass', mergedOnNotPass: true } }),
    pr(534, { followUps: [{ sha: 'f1', subject: 'fix: x (CRITIQUE pass 85 y)' }] }),
  ],
}
const replay = {
  ticks: [{ pr: 521, id: 'A4', named: [], unproven: false }, { pr: 534, id: 'A1', named: [{ name: 'a.test.ts' }], unproven: true }],
  seedTicks: [{ pr: 521, id: 'A4' }],
}
const seeded = { seeds: [seed('D1', 534, 'missed', 'missed', 'caught'), seed('D4', 543, 'missed', 'missed', 'caught', []), seed('D9', 1, 'caught', 'caught', 'caught')] }

test('rate: percent with one decimal; no denominator is null', () => {
  assert.equal(rate(3, 26), 11.5)
  assert.equal(rate(0, 4), 0)
  assert.equal(rate(1, 0), null)
})

test('computeMissRates: each judge counts its misses over its own denominator', () => {
  const rows = Object.fromEntries(computeMissRates({ ledger, replay, seeded, mutation: null }).map((r) => [r.judge, r]))
  const ci = rows['CI and its path filters']
  assert.deepEqual([ci.misses.length, ci.of, ci.rate], [2, 3, 66.7])
  assert.match(ci.note, /1 of 3 planted defects trigger no `verify-\*` workflow \(D4\)/)
  assert.match(ci.note, /1 of 5 ledger PRs changed code no filter covers \(#526\)/)
  assert.deepEqual(rows['`verify`'].misses, ['D1 (#534)', 'D4 (#543)'])
  assert.match(rows['`verify`'].note, /Mutation: not run/)
  // #520 and #526 carry seeds and were passed; #529 carries S1 and drew a not-pass; #528 carries none.
  assert.deepEqual([rows['The antagonist'].misses, rows['The antagonist'].of], [['#520 (S3)', '#526 (S4)'], 3])
  assert.deepEqual([rows['The merge gate'].misses, rows['The merge gate'].of], [['#529'], 5])
  const builder = rows["The builder's own `[x]`"]
  assert.deepEqual(builder.misses, ['#534 A1', '#521 A4 (S3)', '#523 verify:visual (S5)'])
  assert.equal(builder.of, 2)
})

test('computeMissRates: the shadow reviewer row counts escapes with no MED+ finding (RV1b, A6)', () => {
  const rv = (verdict, medPlus) => ({ verdict, medPlus, mergedOnNotPass: verdict === 'not-pass' })
  const reviewed = { rows: [
    pr(600, { review: rv('pass', 0), followUps: [{ sha: 'f2', subject: 'fix: y' }] }),
    pr(601, { review: rv('not-pass', 2), followUps: [{ sha: 'f3', subject: 'fix: z' }] }),
    pr(602, { review: rv('pass', 0) }),
    pr(603),
  ] }
  const got = computeMissRates({ ledger: reviewed, replay, seeded, mutation: null }).find((r) => r.judge === 'The shadow reviewer (`pr-review`)')
  assert.deepEqual([got.misses, got.of, got.rate], [['#600'], 2, 50])
  assert.match(got.note, /Verdict before merge: 3 of 4 ledger PRs; "not-pass" merged anyway: #601\./)
  const none = computeMissRates({ ledger: { rows: [pr(602, { review: rv('pass', 0) })] }, replay, seeded, mutation: null })
    .find((r) => r.judge === 'The shadow reviewer (`pr-review`)')
  assert.deepEqual([none.misses, none.of, none.rate], [[], 0, null], 'reviewed but nothing escaped: no rate yet')
})

test('computeMissRates: a judge the evidence cannot score says "not measured" and why', () => {
  const rows = Object.fromEntries(computeMissRates({ ledger, replay: null, seeded: null, mutation: null }).map((r) => [r.judge, r]))
  for (const judge of ['CI and its path filters', '`verify`', '`/critique`', "The builder's own `[x]`", 'The shadow reviewer (`pr-review`)']) {
    assert.equal(rows[judge].misses, null, judge)
    assert.ok(rows[judge].note.length > 20, judge)
  }
  assert.match(rows['`/critique`'].note, /1 follow-up fix\(es\) in the ledger cite a critique pass/)
  const noReview = computeMissRates({ ledger: { rows: [pr(1)] }, replay, seeded, mutation: null }).find((r) => r.judge === 'The antagonist')
  assert.equal(noReview.misses, null)
})

const passLine = (extra = {}) => JSON.stringify({ pass: 100, date: '2026-10-23T00:00:00Z', base: 'aaaaaaa', head: 'bbbbbbb', screens: ['title'], viewports: ['375x812'], findings: [], ...extra })

test('parsePassRecords: one record per line; blank lines skipped; a malformed line names its number', () => {
  const recs = parsePassRecords(`${passLine()}\n\n${passLine({ pass: 101, findings: [{ id: 'pass 101 hazard settle', severity: 'HIGH' }] })}\n`)
  assert.deepEqual(recs.map((r) => r.pass), [100, 101])
  assert.equal(parsePassRecords('').length, 0)
  assert.throws(() => parsePassRecords('{'), /line 1: not JSON/)
  assert.throws(() => parsePassRecords(`${passLine()}\n${passLine({ head: 'HEAD' })}`), /line 2: `head` must be a commit sha/)
  assert.throws(() => parsePassRecords(passLine({ screens: [] })), /`screens` must list at least one name/)
  assert.throws(() => parsePassRecords(passLine({ findings: [{ id: 'x', severity: 'MEDIUM' }] })), /severity must be one of HIGH, MED, LOW/)
  assert.throws(() => parsePassRecords(`${passLine()}\n${passLine()}`), /pass 100 is recorded twice/)
})

test('the real pass record file parses', async () => {
  const { readFileSync } = await import('node:fs')
  const recs = parsePassRecords(readFileSync(new URL('../../docs/reports/critique/passes.jsonl', import.meta.url), 'utf8'))
  assert.ok(recs.length >= 1)
})

test('citesPass: a finding id, or `CRITIQUE pass <N>` for a pass that filed something', () => {
  const p = { pass: 85, findings: [{ id: 'pass 85 footer dock', severity: 'MED' }] }
  assert.equal(citesPass('fix: cap the dock (CRITIQUE pass 85 footer dock)', p), true)
  assert.equal(citesPass('audit: finding [CRITIQUE pass 85 ledger a11y] addressed', p), true, 'the pass number alone')
  assert.equal(citesPass('fix: x (CRITIQUE pass 851 y)', p), false)
  assert.equal(citesPass('fix: x (CRITIQUE pass 85 y)', { pass: 85, findings: [] }), false, 'a pass that filed nothing caught nothing')
  assert.equal(citesPass('fix: unrelated', p), false)
})

test('scoreCritique and the /critique row: an escape in a recorded range is a catch when its fix cites the pass, else a miss', () => {
  const rows = [
    pr(700, { mergeCommit: 'm700', followUps: [{ sha: 'g1', subject: 'fix: dock (CRITIQUE pass 100 dock)' }] }),
    pr(701, { mergeCommit: 'm701', followUps: [{ sha: 'g2', subject: 'fix: crash' }] }),
    pr(702, { mergeCommit: 'm702', followUps: [{ sha: 'g3', subject: 'fix: z' }] }),
    pr(703, { mergeCommit: 'm703' }),
    pr(704, { mergeCommit: 'm704', followUps: [{ sha: 'g4', subject: 'fix: late (CRITIQUE pass 101 late)' }] }),
  ]
  const passes = [
    { pass: 100, findings: [{ id: 'pass 100 dock', severity: 'MED' }], commits: ['m700', 'm701', 'm703'] },
    { pass: 101, findings: [{ id: 'pass 101 late', severity: 'LOW' }], commits: ['m704'] },
  ]
  const escaped = (r) => r.followUps.length > 0
  // #702 merged outside every range; #703 never escaped.
  assert.deepEqual(scoreCritique(rows, passes, escaped), {
    exposed: ['#700 (pass 100)', '#701 (pass 100)', '#704 (pass 101)'],
    misses: ['#701 (pass 100)'],
    caught: ['#700 (pass 100)', '#704 (pass 101)'],
  })
  const later = scoreCritique([pr(705, { mergeCommit: 'm700', followUps: [{ sha: 'g5', subject: 'fix: y (CRITIQUE pass 101 late)' }] })], passes, escaped)
  assert.deepEqual(later.caught, ['#705 (pass 100)'], 'a later pass may catch what an earlier one played')
  const early = scoreCritique([pr(706, { mergeCommit: 'm704', followUps: [{ sha: 'g6', subject: 'fix: y (CRITIQUE pass 100 dock)' }] })], passes, escaped)
  assert.deepEqual(early.misses, ['#706 (pass 101)'], 'a pass before the merge cannot have seen it')

  const got = computeMissRates({ ledger: { rows }, replay, seeded, mutation: null, critique: passes }).find((r) => r.judge === '`/critique`')
  assert.deepEqual([got.misses, got.of, got.rate], [['#701 (pass 100)'], 3, 33.3])
  assert.match(got.note, /2 pass\(es\) recorded \(100, 101\)/)
  assert.match(got.note, /Context: 2 follow-up fix\(es\) in the ledger cite a critique pass\./)
  const empty = computeMissRates({ ledger, replay, seeded, mutation: null, critique: [{ pass: 99, findings: [], commits: [] }] }).find((r) => r.judge === '`/critique`')
  assert.deepEqual([empty.misses, empty.of, empty.rate], [[], 0, null], 'one recorded pass: measured, with no escape in range yet')
  const none = computeMissRates({ ledger, replay, seeded, mutation: null, critique: [] }).find((r) => r.judge === '`/critique`')
  assert.equal(none.misses, null, 'no record: not measured')
})

test('renderMissRateSection: one row per judge between the markers', () => {
  const md = renderMissRateSection({ stamp: { commit: 'abc', date: 'd' }, inputs: { ledger: 'l1' }, rows: computeMissRates({ ledger, replay, seeded: null, mutation: null }) })
  assert.ok(md.startsWith(SECTION_START) && md.endsWith(SECTION_END))
  assert.match(md, /\| CI and its path filters \| not measured \|/)
  assert.match(md, /\| The merge gate \| 1 \| 5 \| 20% \| #529 \|/)
  assert.match(md, /ledger at `l1`/)
})

test('tallyMutants and combineTallies: killed plus timed out over every mutant that ran', () => {
  const t = tallyMutants([{ status: 'Killed' }, { status: 'Timeout' }, { status: 'Survived' }, { status: 'NoCoverage' }, { status: 'CompileError' }])
  assert.deepEqual([t.total, t.invalid, t.score], [5, 1, 50])
  assert.equal(tallyMutants([{ status: 'Ignored' }]).score, null)
  assert.equal(combineTallies([t, tallyMutants([{ status: 'Killed' }, { status: 'Killed' }])]).score, 66.7)
})

test('summarizeReport: repo-relative paths, survivors and uncovered listed by line', () => {
  const report = { files: { 'src/Combat/health.ts': { mutants: [
    { status: 'Survived', mutatorName: 'EqualityOperator', replacement: 'a <=\n b', location: { start: { line: 9 } } },
    { status: 'Killed', mutatorName: 'X', replacement: 'y', location: { start: { line: 2 } } },
    { status: 'NoCoverage', mutatorName: 'Block', replacement: '{}', location: { start: { line: 4 } } },
  ] } } }
  const s = summarizeReport(report, 'axiomancer-mechanics/')
  assert.equal(s.files[0].path, 'axiomancer-mechanics/src/Combat/health.ts')
  assert.deepEqual(s.survivors.map((v) => [v.line, v.replacement, v.status]), [[4, '{}', 'NoCoverage'], [9, 'a <= b', 'Survived']])
  const abs = summarizeReport({ files: { '/tmp/w/axiomancer-mobile/state/x.ts': { mutants: [] } } }, 'axiomancer-mobile/')
  assert.equal(abs.files[0].path, 'axiomancer-mobile/state/x.ts')
})

test('parseProgress: the last progress line, or null', () => {
  const out = 'Mutation testing 7% (elapsed: ~8m) 494/820 tested (103 survived, 4 timed out)\nMutation testing 12% (elapsed: ~10m) 513/820 tested (110 survived, 4 timed out)\n'
  assert.deepEqual(parseProgress(out), { tested: 513, total: 820, survived: 110, timedOut: 4 })
  assert.equal(parseProgress('INFO starting'), null)
})

test('renderMutationSection: an over-budget target shows its partial counts and no score', () => {
  const md = renderMutationSection({ stamp: { commit: 'c', date: 'd' }, targets: [{ name: 'm', outcome: 'over budget (60s): 5 of 9 tested, 2 survived', seconds: 60, files: [], survivors: [], partial: { tested: 5, total: 9, survived: 2, timedOut: 0 } }] })
  assert.match(md, /\| m \| 0 \| 9 \| - \| 0 \| 2 \| - \| n\/a \| over budget/)
  assert.match(md, /No report \(over budget/)
})

test('spliceMarked: replaces between markers, appends when absent', () => {
  assert.equal(spliceMarked('a\n<!-- s -->x<!-- e -->\nb', '<!-- s -->y<!-- e -->', '<!-- s -->', '<!-- e -->'), 'a\n<!-- s -->y<!-- e -->\nb')
  assert.equal(spliceMarked('a\n', 'S', '<!-- s -->', '<!-- e -->'), 'a\n\nS\n')
})

test('plantedPaths and relatedTests: source only; tests beside it by name, plus the fix\'s own', () => {
  assert.deepEqual(plantedPaths(['m/x.ts', 'm/__tests__/x.test.ts', 'telemetry/t.md', 'scripts/a.mjs']), ['m/x.ts', 'scripts/a.mjs'])
  const tracked = ['m/c/Board.tsx', 'm/c/__tests__/Board.fan.test.tsx', 'm/c/__tests__/BoardX.test.tsx', 'm/c/__tests__/Other.test.tsx', 'scripts/loop-pr.test.mjs']
  assert.deepEqual(relatedTests(['m/c/Board.tsx'], tracked, ['scripts/loop-pr.test.mjs', 'gone.test.ts']), ['m/c/__tests__/Board.fan.test.tsx', 'scripts/loop-pr.test.mjs'])
})

test('testVerdict and ciVerdict: a control failure is noise; CI catches only what it triggers and fails', () => {
  assert.deepEqual(testVerdict({ a: { ok: false }, b: { ok: false } }, ['b']), { verdict: 'caught', failing: ['a'], noisy: ['b'] })
  assert.equal(testVerdict({ a: { ok: true }, b: { ok: false } }, ['b']).verdict, 'missed')
  assert.equal(testVerdict({}).verdict, 'no tests')
  assert.equal(ciVerdict([], { verdict: 'caught' }).verdict, 'missed')
  assert.equal(ciVerdict(['verify-mobile.yml'], { verdict: 'caught' }).verdict, 'caught')
  assert.match(ciVerdict(['verify-mobile.yml'], { verdict: 'missed' }).why, /related tests pass/)
})
