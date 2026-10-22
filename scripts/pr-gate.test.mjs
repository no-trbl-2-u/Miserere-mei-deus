// scripts/pr-gate.test.mjs — pins `decideGate` in `scripts/pr-gate.mjs`
// (phase RV1a A2, phase LG1b A2): the `verify-gate` decision on recorded
// facts. Green on a mechanics-only PR where `verify-mobile` never ran, red
// when a triggered `verify-*` is red, red on a path no filter owns (named
// with the filter nearest it), nothing to run on a bookkeeping-only diff,
// and a wait while a run is pending.
//
//   node --test scripts/pr-gate.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { parseWorkflowFilter } from './eval/ledger-lib.mjs'
import { decideGate, describe, latestByWorkflow, nearestOwner, patternDir } from './pr-gate.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WF = path.join(ROOT, '.github/workflows')
// The live filters, so a path moved in or out of a verify-* changes these facts too.
const WORKFLOWS = fs.readdirSync(WF).filter((f) => /^verify-.*\.yml$/.test(f)).sort()
  .map((file) => ({ file, ...parseWorkflowFilter(fs.readFileSync(path.join(WF, file), 'utf8')) }))
  .filter((w) => w.paths !== null)

const run = (file, conclusion, createdAt = '2026-10-16T10:00:00Z') => ({
  path: `.github/workflows/${file}`, status: conclusion ? 'completed' : 'in_progress', conclusion, createdAt,
})

test('the live verify-* filters parse', () => {
  assert.deepEqual(WORKFLOWS.map((w) => w.file), ['verify-art-department.yml', 'verify-drift.yml', 'verify-mechanics.yml', 'verify-mobile.yml', 'verify-prose.yml', 'verify-root.yml'])
  for (const w of WORKFLOWS) assert.ok(w.paths.length > 0, w.file)
})

test('mechanics-only diff, verify-mobile never ran: green', () => {
  const d = decideGate(['axiomancer-mechanics/src/Combat/x.ts'], WORKFLOWS, [run('verify-mechanics.yml', 'success')])
  assert.equal(d.state, 'green')
  assert.deepEqual(d.triggered, ['verify-mechanics.yml'])
  assert.deepEqual(d.unowned, [])
})

test('a red triggered verify-* is red, even while another is still running', () => {
  const files = ['axiomancer-mechanics/src/Combat/x.ts', 'axiomancer-mobile/app/x.tsx']
  const d = decideGate(files, WORKFLOWS, [run('verify-mechanics.yml', 'failure'), run('verify-mobile.yml', null)])
  assert.equal(d.state, 'red')
  assert.deepEqual(d.failed, [{ file: 'verify-mechanics.yml', conclusion: 'failure' }])
  for (const c of ['cancelled', 'timed_out', 'action_required', 'startup_failure']) {
    assert.equal(decideGate(files.slice(0, 1), WORKFLOWS, [run('verify-mechanics.yml', c)]).state, 'red', c)
  }
})

test('an owned path: scripts/ and .github/ are verify-root\'s, so the gate waits on it', () => {
  const files = ['scripts/pr-gate.mjs', '.github/workflows/pr-review.yml', 'skills/march.md', 'AGENTS.md', 'plan/x.md']
  const d = decideGate(files, WORKFLOWS, [])
  assert.deepEqual(d.unowned, [])
  assert.deepEqual(d.triggered, ['verify-root.yml'])
  assert.equal(d.state, 'wait')
  assert.equal(decideGate(files, WORKFLOWS, [run('verify-root.yml', 'success')]).state, 'green')
})

test('an unowned path is red even with every triggered run green, and names no owner when none shares its directory', () => {
  const d = decideGate(['tmp-images/doors/a.png', 'axiomancer-mobile/app/x.tsx'], WORKFLOWS, [run('verify-mobile.yml', 'success')])
  assert.equal(d.state, 'red')
  assert.deepEqual(d.failed, [])
  assert.deepEqual(d.unowned, [{ path: 'tmp-images/doors/a.png', nearest: null }])
  const text = describe(d)
  assert.match(text, /^verify-gate: red/)
  assert.match(text, /`tmp-images\/doors\/a\.png`: no `verify-\*` filter shares its directory/)
})

test('an unowned path names the workflow whose filter is nearest by directory', () => {
  const fixture = [
    { file: 'verify-a.yml', paths: ['axiomancer-mobile/app/**', 'scripts/a.mjs'] },
    { file: 'verify-b.yml', paths: ['axiomancer-mobile/state/presenters/*.copy.ts', '!axiomancer-mobile/state/x/**'] },
  ]
  const d = decideGate(['axiomancer-mobile/state/presenters/x.ts', 'axiomancer-mobile/lib/y.ts', 'scripts/b.mjs', 'new-dir/z.md'], fixture, [])
  assert.equal(d.state, 'red')
  assert.deepEqual(d.unowned.map((u) => [u.path, u.nearest?.file ?? null]), [
    ['axiomancer-mobile/state/presenters/x.ts', 'verify-b.yml'],
    ['axiomancer-mobile/lib/y.ts', 'verify-a.yml'],
    ['scripts/b.mjs', 'verify-a.yml'],
    ['new-dir/z.md', null],
  ])
  assert.match(describe(d), /`axiomancer-mobile\/state\/presenters\/x\.ts`: extend `verify-b\.yml` \(nearest entry by directory: `axiomancer-mobile\/state\/presenters\/\*\.copy\.ts`\)/)
})

test('patternDir and nearestOwner read the literal directory, skipping negations', () => {
  assert.deepEqual(patternDir('axiomancer-mobile/**'), ['axiomancer-mobile'])
  assert.deepEqual(patternDir('axiomancer-mobile/state/presenters/*.copy.ts'), ['axiomancer-mobile', 'state', 'presenters'])
  assert.deepEqual(patternDir('*'), [])
  assert.deepEqual(patternDir('a/*/b/**'), ['a'])
  assert.equal(nearestOwner('x/y/z.md', [{ file: 'verify-n.yml', paths: ['!x/y/**'] }]), null)
  assert.equal(nearestOwner('top.md', [{ file: 'verify-n.yml', paths: ['x/**'] }]), null)
})

test('the live tree: every tracked path is owned or bookkeeping, except the known unowned tmp-images/', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
  const unowned = decideGate(tracked, WORKFLOWS, []).unowned.map((u) => u.path.split('/')[0])
  assert.deepEqual([...new Set(unowned)], ['tmp-images'])
})

test('a bookkeeping-only diff: green, no suite to run', () => {
  const d = decideGate(['plan/CRITIQUE.md', 'telemetry/2026-10-16_x.md', 'docs/reports/eval/latest.md'], WORKFLOWS, [])
  assert.equal(d.state, 'green')
  assert.deepEqual(d.unowned, [])
  assert.deepEqual(d.triggered, [])
})

test('a triggered run that is pending or not yet created: wait', () => {
  const files = ['axiomancer-mobile/app/x.tsx']
  assert.equal(decideGate(files, WORKFLOWS, []).state, 'wait')
  const d = decideGate(files, WORKFLOWS, [run('verify-mobile.yml', null)])
  assert.equal(d.state, 'wait')
  assert.deepEqual(d.pending, ['verify-mobile.yml'])
})

test('a re-run replaces the run it repeats', () => {
  const runs = [run('verify-mobile.yml', 'failure', '2026-10-16T10:00:00Z'), run('verify-mobile.yml', 'success', '2026-10-16T11:00:00Z')]
  assert.equal(latestByWorkflow(runs).get('verify-mobile.yml').conclusion, 'success')
  assert.equal(decideGate(['axiomancer-mobile/app/x.tsx'], WORKFLOWS, runs).state, 'green')
  assert.equal(decideGate(['axiomancer-mobile/app/x.tsx'], WORKFLOWS, [...runs].reverse()).state, 'green', 'order-free')
})

test('a skipped run passes; a workflow the diff did not trigger is ignored even when red', () => {
  assert.equal(decideGate(['axiomancer-mobile/app/x.tsx'], WORKFLOWS, [run('verify-mobile.yml', 'skipped')]).state, 'green')
  assert.equal(decideGate(['axiomancer-mobile/app/x.tsx'], WORKFLOWS, [run('verify-mobile.yml', 'success'), run('verify-drift.yml', 'failure')]).state, 'green')
})

test('describe names what the gate waited on, what failed and that no path is unowned', () => {
  const d = decideGate(['axiomancer-mechanics/src/x.ts', 'scripts/a.mjs'], WORKFLOWS, [run('verify-mechanics.yml', 'failure')])
  const text = describe(d)
  assert.match(text, /^verify-gate: red/)
  assert.match(text, /red: verify-mechanics\.yml \(failure\)/)
  assert.match(text, /waiting on: verify-root\.yml/)
  assert.match(text, /unowned paths: none/)
})
