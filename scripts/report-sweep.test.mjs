// scripts/report-sweep.test.mjs — witness for the report sweep (Phase RS1).
// Runs the sweep on a fixture tree (a new, a baselined and a cited report,
// plus a root `docs/reports/` file it must ignore), files the new one into a
// fixture CRITIQUE and lints the result, runs it on the live tree, and checks
// that `/march` Step 1 names the script.
//
//   node --test scripts/report-sweep.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { lintQueue } from './check-plan-queues.mjs'
import { addPendingRows, critiqueRow, isSafeReportPath, listReports, sweep } from './report-sweep.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'scripts/report-sweep.mjs')

const highRow = [
  '### [HIGH] ci / x — a high row',
  '- pass: 99 (commit 02f94d07)',
  '- viewport: both',
  '- category: infra',
  '- observation: seen',
  '- evidence: a capture',
  '- suggested fix: a fix',
  '- source: critique:drive (unattended)',
].join('\n')
const lowRow = highRow.replace('[HIGH] ci / x — a high row', '[LOW] rest / y — a low row')

const critique = (pending) =>
  ['# Critique log', '', '> Last pass: 2026-10-21 at commit 02f94d07', '', '## Pending', '', '',
    ...pending.flatMap((r) => [r, '', '']), '## Done', '', ''].join('\n')

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'report-sweep-'))
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), text)
  }
  put('axiomancer-mobile/docs/reports/NEW_BUGS.md', '# new\n')
  put('axiomancer-mobile/docs/reports/OLD_BUGS.md', '# old\n')
  put('axiomancer-mechanics/docs/reports/cited.md', '# cited\n')
  put('axiomancer-mechanics/docs/reports/notes.txt', 'not markdown\n')
  put('axiomancer-mechanics/docs/reports/nested/deep.md', '# not directly under reports\n')
  put('docs/reports/measured/latest.md', '# the loop writes this\n')
  put('docs/reports/loop-report.md', '# the loop writes this too\n')
  put('plan/report-sweep-baseline.json', JSON.stringify({ reports: ['axiomancer-mobile/docs/reports/OLD_BUGS.md'] }))
  put('plan/CRITIQUE.md', critique([highRow, lowRow]))
  put('plan/AUDIT.md', '# Audit\n\n## Pending\n\n### [ ] [docs] x\n- detail: see `axiomancer-mechanics/docs/reports/cited.md`\n')
  return root
}

test('lists only Markdown directly under a package docs/reports, never the root docs/reports', () => {
  const root = fixture()
  assert.deepEqual(listReports(root), [
    'axiomancer-mechanics/docs/reports/cited.md',
    'axiomancer-mobile/docs/reports/NEW_BUGS.md',
    'axiomancer-mobile/docs/reports/OLD_BUGS.md',
  ])
})

test('a baselined or cited report is filed; only the new one is reported', () => {
  const root = fixture()
  const found = sweep(root)
  assert.deepEqual(found.map((f) => f.rel), ['axiomancer-mobile/docs/reports/NEW_BUGS.md'])
  assert.equal(found[0].commit, null, 'a fixture outside git has no last commit')
})

test('--file adds one MED Pending row after the HIGH rows, which the queue lint accepts, and a re-sweep files nothing', () => {
  const root = fixture()
  sweep(root, { file: true })
  const text = fs.readFileSync(path.join(root, 'plan/CRITIQUE.md'), 'utf8')
  const headers = text.split('\n').filter((l) => l.startsWith('### '))
  assert.deepEqual(headers, [
    '### [HIGH] ci / x — a high row',
    '### [MED] unfiled report `axiomancer-mobile/docs/reports/NEW_BUGS.md`: read it and file its findings',
    '### [LOW] rest / y — a low row',
  ])
  assert.match(text, /- evidence: `axiomancer-mobile\/docs\/reports\/NEW_BUGS\.md`/)
  assert.deepEqual(lintQueue(text, 'critique').findings, [])
  assert.deepEqual(sweep(root, { file: true }), [], 'the filed row cites the path, so it is not filed twice')
})

test('a report path with a backtick or newline is reported but never filed, so it cannot break the row\'s backtick span', () => {
  const root = fixture()
  const evilRel = 'axiomancer-mobile/docs/reports/evil`md.md'
  fs.writeFileSync(path.join(root, evilRel), '# evil\n')
  assert.equal(isSafeReportPath(evilRel), false)
  assert.equal(critiqueRow(evilRel, null), null)
  const found = sweep(root, { file: true })
  assert.ok(found.some((f) => f.rel === evilRel), 'still reported as unfiled')
  const text = fs.readFileSync(path.join(root, 'plan/CRITIQUE.md'), 'utf8')
  assert.ok(!text.includes(evilRel), 'never written into the queue')
  assert.deepEqual(lintQueue(text, 'critique').findings, [])
})

test('a row lands cleanly in an empty Pending and after HIGH-only rows', () => {
  const row = critiqueRow('axiomancer-x/docs/reports/a.md', 'abc1234 2026-10-23')
  assert.match(row, /- pass: report sweep \(commit abc1234\)/)
  for (const base of [critique([]), critique([highRow])]) {
    const out = addPendingRows(base, [row])
    assert.deepEqual(lintQueue(out, 'critique').findings, [], out)
    assert.ok(out.indexOf('[MED] unfiled report') < out.indexOf('## Done'))
  }
})

test('the CLI prints a found report with its last commit, in under a second', () => {
  const root = fixture()
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.'], { cwd: root })
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'fixture'], { cwd: root })
  const t0 = Date.now()
  const out = execFileSync('node', [SCRIPT, '--root', root], { encoding: 'utf8' })
  assert.ok(Date.now() - t0 < 1000, `took ${Date.now() - t0}ms`)
  assert.match(out, /^axiomancer-mobile\/docs\/reports\/NEW_BUGS\.md {2}[0-9a-f]{7,} \d{4}-\d{2}-\d{2}$/m)
  assert.match(out, /1 unfiled/)
})

test('the live tree has no unfiled reports', () => {
  assert.deepEqual(sweep(ROOT).map((f) => f.rel), [])
})

test('/march Step 1 runs the sweep with --file after triage', () => {
  const march = fs.readFileSync(path.join(ROOT, 'skills/march.md'), 'utf8')
  const step1 = march.slice(march.indexOf('### Step 1'), march.indexOf('### Step 2'))
  assert.match(step1, /node scripts\/report-sweep\.mjs --file/)
  assert.ok(step1.indexOf('report-sweep') > step1.indexOf('skills/triage.md'), 'the sweep comes after triage')
})
