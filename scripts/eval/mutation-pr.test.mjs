// scripts/eval/mutation-pr.test.mjs — the diff scoping of the PR mutation
// job (phase LG1g, A7): changed lines from a zero-context diff, the Stryker
// line ranges each workspace gets, and the report-only comment.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { PR_MARKER, parseChangedLines, prOutcome, renderPrReport, scopeChangedLines } from './mutation-lib.mjs'

const DIFF = [
  'diff --git a/axiomancer-mechanics/src/Combat/health.ts b/axiomancer-mechanics/src/Combat/health.ts',
  'index 1111111..2222222 100644',
  '--- a/axiomancer-mechanics/src/Combat/health.ts',
  '+++ b/axiomancer-mechanics/src/Combat/health.ts',
  '@@ -10,2 +10,3 @@ export function heal(',
  '-  return a',
  '-  return b',
  '+  return a + 1',
  '+  return b',
  '+  // c',
  '@@ -40 +41 @@ export function hurt(',
  '-  x',
  '+  y',
  '@@ -60,3 +61,0 @@',
  '-  gone',
  '-  gone',
  '-  gone',
  'diff --git a/axiomancer-mechanics/src/Combat/old.ts b/axiomancer-mechanics/src/Combat/old.ts',
  'deleted file mode 100644',
  '--- a/axiomancer-mechanics/src/Combat/old.ts',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  '-a',
  '-b',
  'diff --git a/axiomancer-mechanics/src/Combat/new.ts b/axiomancer-mechanics/src/Combat/new.ts',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/axiomancer-mechanics/src/Combat/new.ts',
  '@@ -0,0 +1,4 @@',
  '+a',
  '+b',
  '+c',
  '+d',
  '',
].join('\n')

test('parseChangedLines: new-side ranges per file; deletions and deleted files drop out', () => {
  const changed = parseChangedLines(DIFF)
  assert.deepEqual([...changed.keys()], ['axiomancer-mechanics/src/Combat/health.ts', 'axiomancer-mechanics/src/Combat/new.ts'])
  assert.deepEqual(changed.get('axiomancer-mechanics/src/Combat/health.ts'), [[10, 12], [41, 41]])
  assert.deepEqual(changed.get('axiomancer-mechanics/src/Combat/new.ts'), [[1, 4]])
  assert.equal(parseChangedLines('').size, 0)
})

test('scopeChangedLines: workspace-relative ranges, tests and non-source left out, empty workspaces dropped', () => {
  const changed = new Map([
    ['axiomancer-mechanics/src/Combat/health.ts', [[10, 12], [41, 41]]],
    ['axiomancer-mechanics/src/Combat/health.test.ts', [[1, 9]]],
    ['axiomancer-mechanics/src/test-utils/fight.ts', [[1, 9]]],
    ['axiomancer-mechanics/scripts/tool.ts', [[1, 9]]],
    ['axiomancer-mechanics/src/CLI/combat-sim.cli.ts', [[22, 22]]],
    ['axiomancer-mobile/state/presenters/rest.copy.ts', [[3, 3]]],
    ['axiomancer-mobile/components/Card.tsx', [[7, 8]]],
    ['axiomancer-mobile/state/mocks/combat.mock.ts', [[1, 2]]],
    ['axiomancer-mobile/__tests__/x.tsx', [[1, 2]]],
    ['scripts/pr-gate.mjs', [[1, 2]]],
  ])
  const scopes = scopeChangedLines(changed)
  assert.deepEqual(scopes.map((s) => [s.key, s.cwd, s.mutate, s.files, s.lines]), [
    ['mechanics', 'axiomancer-mechanics', ['src/Combat/health.ts:10-12', 'src/Combat/health.ts:41-41'], 1, 4],
    ['mobile', 'axiomancer-mobile', ['components/Card.tsx:7-8', 'state/presenters/rest.copy.ts:3-3'], 2, 3],
  ])
  assert.equal(scopes[0].config, 'scripts/eval/stryker/mechanics.config.mjs')
  assert.ok(!('include' in scopes[0]), 'the matcher stays out of the runnable scope')
  assert.deepEqual(scopeChangedLines(new Map([['scripts/pr-gate.mjs', [[1, 2]]], ['plan/AUDIT.md', [[1, 1]]]])), [])
})

const tally = (killed, survived) => ({ total: killed + survived, killed, timeout: 0, survived, noCoverage: 0, invalid: 0, score: Math.round((killed / (killed + survived)) * 1000) / 10 })

test('renderPrReport: score and each survivor with its file and line, behind the comment marker', () => {
  const md = renderPrReport({
    base: 'aaaaaaaa11', head: 'bbbbbbbb22', budgetSeconds: 900,
    targets: [
      { name: 'mechanics', lines: 4, files: [{ path: 'axiomancer-mechanics/src/Combat/health.ts', tally: tally(3, 1) }], seconds: 81, outcome: 'ok', partial: null,
        survivors: [{ path: 'axiomancer-mechanics/src/Combat/health.ts', line: 10, mutator: 'ArithmeticOperator', replacement: 'a - 1', status: 'Survived' }] },
      { name: 'mobile', lines: 3, files: [], seconds: 0, outcome: 'skipped: budget spent', partial: null, survivors: [] },
    ],
  })
  assert.ok(md.startsWith(PR_MARKER))
  assert.match(md, /Base `aaaaaaaa`, head `bbbbbbbb`, budget 15 min/)
  assert.match(md, /never fails a check/)
  assert.match(md, /\| mechanics \| 4 \| 4 \| 3 \| 0 \| 1 \| 0 \| 75% \| ok, 81s \|/)
  assert.match(md, /\| mobile \| 3 \| - \| - \| - \| - \| - \| n\/a \| skipped: budget spent, 0s \|/)
  assert.match(md, /### Survivors: mechanics\n\n[^\n]+\n[^\n]+\n\| `axiomancer-mechanics\/src\/Combat\/health\.ts:10` \| ArithmeticOperator \| `a - 1` \| Survived \|/)
  assert.doesNotMatch(md, /Survivors: mobile/)
})

test('renderPrReport: an over-budget run shows its partial counts; no changed source says so', () => {
  const over = renderPrReport({ base: 'a', head: 'b', budgetSeconds: 900, targets: [{ name: 'mechanics', lines: 40, files: [], seconds: 870, outcome: 'over budget (870s): 50 of 90 tested, 6 survived', partial: { tested: 50, total: 90, survived: 6, timedOut: 1 }, survivors: [] }] })
  assert.match(over, /\| mechanics \| 40 \| 90 \| - \| 1 \| 6 \| - \| n\/a \| over budget/)
  const none = renderPrReport({ base: 'a', head: 'b', budgetSeconds: 900, targets: [] })
  assert.match(none, /nothing was mutated/)
  assert.doesNotMatch(none, /\| Workspace/)
})

test('prOutcome and the score cell: colour codes stripped, no related test said plainly, all-static named', () => {
  assert.equal(prOutcome('failed (exit 1): \x1b[91m07:03:56 (10177) ERROR Stryker\x1b[39m No tests were executed. Stryker will exit prematurely.'), 'no test relates to these lines')
  assert.equal(prOutcome('failed (exit 1): \x1b[91mERROR\x1b[39m boom'), 'failed (exit 1): ERROR boom')
  assert.equal(prOutcome('ok'), 'ok')
  const md = renderPrReport({ base: 'a', head: 'b', budgetSeconds: 900, targets: [{ name: 'mechanics', lines: 11, files: [{ path: 'x', tally: { total: 75, killed: 0, timeout: 0, survived: 0, noCoverage: 0, invalid: 75, score: null } }], seconds: 35, outcome: 'ok', partial: null, survivors: [] }] })
  assert.match(md, /\| 75 \| 0 \| 0 \| 0 \| 0 \| n\/a \(all static or ignored\) \| ok, 35s \|/)
})
