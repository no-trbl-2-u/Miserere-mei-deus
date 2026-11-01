// scripts/pr-review-gate.test.mjs — fail-on-parent in `verify-gate`
// (phase LG1d, `plan/README.md` A4): a test file a PR
// adds must fail on the merge base with its own version laid over, unless
// it carries a `guard-test: <reason>` comment. The replay runs on a fixture
// repository history built in the system temp dir.
//
//   node --test scripts/pr-review-gate.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { changedTests, decideParentGate, describeParentGate, guardReason, replayTests } from './pr-review.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const LIB_BASE = 'export const a = () => 1\n'
const LIB_HEAD = 'export const a = () => 1\nexport const b = () => 2\n'
const pins = (name, fn, want, extra = '') => `${extra}import assert from 'node:assert/strict'\nimport test from 'node:test'\nimport { ${fn} } from './lib.mjs'\n\ntest('${name}', () => assert.equal(${fn}(), ${want}))\n`

/** A repo whose head adds `b()` and three tests: one pins `b`, one re-pins `a`, one guards `a`. */
function fixtureRepo(extraHeadFiles = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-gate-fixture-'))
  const g = (...args) => execFileSync('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.com', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8' }).trim()
  g('init', '--quiet', '-b', 'main')
  fs.writeFileSync(path.join(repo, 'package.json'), '{ "type": "module" }\n')
  fs.writeFileSync(path.join(repo, 'lib.mjs'), LIB_BASE)
  g('add', '.')
  g('commit', '--quiet', '-m', 'base')
  const base = g('rev-parse', 'HEAD')
  fs.writeFileSync(path.join(repo, 'lib.mjs'), LIB_HEAD)
  const files = {
    'new.test.mjs': pins('b returns 2', 'b', 2),
    'old.test.mjs': pins('a returns 1', 'a', 1),
    'guard.test.mjs': pins('a still returns 1', 'a', 1, '// guard-test: pins a(), which this change must not move\n'),
    ...extraHeadFiles,
  }
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(repo, name), text)
  g('add', '.')
  g('commit', '--quiet', '-m', 'head')
  return { repo, base, head: g('rev-parse', 'HEAD') }
}

test('on a fixture history: a test that passes on the parent fails the gate; one that fails there and one opted out pass', () => {
  const { repo, base, head } = fixtureRepo()
  try {
    const tests = changedTests(repo, base, head, 'A')
    assert.deepEqual([...tests].sort(), ['guard.test.mjs', 'new.test.mjs', 'old.test.mjs'])
    const d = decideParentGate(replayTests({ repo, base, head, tests }))
    const by = Object.fromEntries(d.lines.map((l) => [l.path, l]))
    assert.equal(by['new.test.mjs'].status, 'fails-on-parent', 'b() is not on the parent, so the file cannot load there')
    assert.equal(by['old.test.mjs'].status, 'could-not-fail')
    assert.equal(by['guard.test.mjs'].status, 'guarded')
    assert.equal(by['guard.test.mjs'].guard, 'pins a(), which this change must not move')
    assert.equal(d.state, 'red')
    const text = describeParentGate(d)
    assert.match(text, /^fail-on-parent: red/)
    assert.match(text, /`old\.test\.mjs`: passes on the base, so it could not fail/)
    assert.match(text, /`guard\.test\.mjs`: passes on the base, a guard by design: pins a\(\)/)
    assert.match(text, /`new\.test\.mjs`: fails on the base/)
  } finally {
    fs.rmSync(repo, { recursive: true, force: true })
  }
})

test('the gate judges added files only: a changed test file is the reviewer\'s, not the gate\'s', () => {
  const { repo, base, head } = fixtureRepo()
  try {
    assert.deepEqual(changedTests(repo, head, head, 'A'), [])
    assert.ok(changedTests(repo, base, head, 'AM').includes('old.test.mjs'))
    assert.ok(!changedTests(repo, base, head, 'A').includes('lib.mjs'), 'a source file is never replayed')
  } finally {
    fs.rmSync(repo, { recursive: true, force: true })
  }
})

test('a file that fails at its own head is not judged; the owning verify-* already fails on it', () => {
  const { repo, base, head } = fixtureRepo({ 'broken.test.mjs': pins('a returns 3', 'a', 3) })
  try {
    const d = decideParentGate(replayTests({ repo, base, head, tests: ['broken.test.mjs', 'new.test.mjs'] }))
    assert.equal(d.state, 'green')
    assert.equal(d.lines.find((l) => l.path === 'broken.test.mjs').status, 'inconclusive')
    assert.match(describeParentGate(d), /`broken\.test\.mjs`: not judged \(fails at its own merge\)/)
  } finally {
    fs.rmSync(repo, { recursive: true, force: true })
  }
})

test('guardReason reads a reasoned guard-test comment in any comment style, and a bare one as no reason', () => {
  assert.equal(guardReason('// guard-test: pins the old rule\nimport x from "y"\n'), 'pins the old rule')
  assert.equal(guardReason('/* guard-test: keeps D47 intact */\n'), 'keeps D47 intact')
  assert.equal(guardReason('/**\n * guard-test: the other direction of the rule\n */\n'), 'the other direction of the rule')
  assert.equal(guardReason('// guard-test:\n'), '')
  assert.equal(guardReason("test('guard-test: in a title is not a comment', f)\n"), null)
  assert.equal(guardReason(null), null)
})

test('a bare guard-test comment does not opt out, and the summary says why', () => {
  const d = decideParentGate([{ path: 'x.test.mjs', verdict: 'could-not-fail', reason: 'passes on the parent', guard: '' }])
  assert.equal(d.state, 'red')
  assert.match(describeParentGate(d), /gives no reason/)
})

test('no added test file: nothing to check', () => {
  const d = decideParentGate([])
  assert.equal(d.state, 'none')
  assert.equal(describeParentGate(d), 'fail-on-parent: the PR adds no test file (nothing to check)')
})

// --- wiring -----------------------------------------------------------------

test('verify-gate counts added tests, installs only when there is one, and replays them before the wait', () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/pr-review.yml'), 'utf8')
  const gate = wf.slice(wf.indexOf('\n  verify-gate:'), wf.indexOf('\n  review-wanted:'))
  const list = gate.indexOf('node scripts/pr-review.mjs parent-tests --pr "$PR" --head "$HEAD_SHA" --gate --list')
  const install = gate.indexOf('npm ci')
  const run = gate.indexOf('node scripts/pr-review.mjs parent-tests --pr "$PR" --head "$HEAD_SHA" --gate\n')
  assert.ok(list > 0 && install > list && run > install, 'count, install, replay, in that order')
  assert.ok(run < gate.indexOf('pr-gate.mjs wait'), 'it fails before the long wait')
  assert.equal((gate.match(/if: steps\.added\.outputs\.count != '0'/g) ?? []).length, 2, 'install and replay skip a PR with no added test')
})
