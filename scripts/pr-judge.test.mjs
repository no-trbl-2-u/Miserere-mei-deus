// scripts/pr-judge.test.mjs — pins the per-line runner of the `judge` job
// in `scripts/pr-judge.mjs` (phase LG1f A6) on fixture acceptance lines: a
// proof that passes, one that fails, an opt-out that is listed and not run,
// and a proof killed at its time limit; plus the command splitter, the runner
// a test file gets, and the job's wiring into `verify-gate`.
//
//   node --test scripts/pr-judge.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { decideJudge, describeJudge, planJudge, proofInvocation, runPlan, runProof, splitCommand } from './pr-judge.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const HEAD = [
  'scripts/pr-gate.test.mjs',
  'axiomancer-mechanics/src/Cards/card.test.ts',
  'axiomancer-mobile/components/combat/useEnemyClipSelection.test.tsx',
  'axiomancer-mobile/screenshots/baseline/combat-encounter.png',
]

const body = (...acceptance) => [
  '## What shipped', '- a thing', '',
  '## Acceptance', ...acceptance, '',
  '## Verify', '- `npm test` -> green', '',
  'Closes #1',
].join('\n')

const judge = async (text, opts = {}) => {
  const plan = planJudge(text, HEAD)
  const results = await runPlan(plan, (inv) => runProof(inv, { root: ROOT, ...opts }))
  return decideJudge(plan, results)
}

test('a line whose command passes passes', async () => {
  const d = await judge(body('- [x] A1 holds, proven by `node -e "process.exit(0)"`'))
  assert.equal(d.state, 'green')
  assert.equal(d.lines[0].verdict, 'pass')
  assert.match(describeJudge(d), /- A1: pass\n {2}- `node -e "process\.exit\(0\)"`: pass/)
})

test('a line whose command fails fails, and the summary gives its exit and output', async () => {
  const d = await judge(body(
    '- [x] A1 holds `node -e "process.exit(0)"`',
    '- [x] A2 breaks `node -e "console.error(\'boom\');process.exit(3)"`',
  ))
  assert.equal(d.state, 'red')
  assert.deepEqual(d.lines.map((l) => l.verdict), ['pass', 'fail'])
  const text = describeJudge(d)
  assert.match(text, /- A2: fail\n {2}- `[^`]+`: fail, exit 3/)
  assert.match(text, /boom/)
})

test('an opt-out line is listed and not run', async () => {
  let ran = 0
  const plan = planJudge(body('- [x] A1 a doc-only line (no test: prose in the brief)'), HEAD)
  const d = decideJudge(plan, await runPlan(plan, async () => { ran++; return { ok: true } }))
  assert.equal(ran, 0)
  assert.equal(d.state, 'green')
  assert.equal(d.lines[0].verdict, 'opt-out')
  assert.match(describeJudge(d), /A1: listed, not run: no test, for T: prose in the brief/)
})

test('a proof past its time limit is killed and fails the line', async () => {
  const started = Date.now()
  const d = await judge(body('- [x] A1 hangs `node -e "setTimeout(() => {}, 60000)"`'), { timeoutMs: 300 })
  assert.ok(Date.now() - started < 10000, 'killed near the limit, not after the sleep')
  assert.equal(d.state, 'red')
  assert.match(describeJudge(d), /A1: fail\n {2}- `[^`]+`: fail, timed out after \d+ s/)
})

test('one proof named on two lines runs once', async () => {
  let ran = 0
  const plan = planJudge(body('- [x] A1 one `npm test`', '- [x] A2 two `npm test`'), HEAD)
  assert.equal(plan.runs.length, 1)
  const d = decideJudge(plan, await runPlan(plan, async () => { ran++; return { ok: true, ms: 1 } }))
  assert.equal(ran, 1)
  assert.deepEqual(d.lines.map((l) => l.verdict), ['pass', 'pass'])
})

test('test files run on their own runner; a shot is listed, not run', () => {
  assert.deepEqual(proofInvocation({ kind: 'file', value: 'scripts/pr-gate.test.mjs' }).argv, ['node', '--test', 'scripts/pr-gate.test.mjs'])
  const vitest = proofInvocation({ kind: 'file', value: 'axiomancer-mechanics/src/Cards/card.test.ts' })
  assert.deepEqual([vitest.cwd, vitest.argv], ['axiomancer-mechanics', ['npx', '--no-install', 'vitest', 'run', 'src/Cards/card.test.ts']])
  const jest = proofInvocation({ kind: 'file', value: 'axiomancer-mobile/components/combat/useEnemyClipSelection.test.tsx' })
  assert.equal(jest.cwd, 'axiomancer-mobile')
  assert.deepEqual(jest.argv.slice(0, 3), ['npx', '--no-install', 'jest'])
  const plan = planJudge(body('- [x] A1 the board `combat-encounter.png`'), HEAD)
  assert.equal(plan.runs.length, 0)
  assert.equal(decideJudge(plan, {}).lines[0].verdict, 'listed')
})

test('a command with shell syntax is not run and fails its line', () => {
  for (const c of ['npm test && npm run lint', 'node x.mjs | tee out', 'node x.mjs > out', 'node $SCRIPT', 'npm run "$(id)"']) {
    assert.equal(splitCommand(c), null, c)
  }
  assert.deepEqual(splitCommand("npm run verify -w axiomancer-mechanics"), ['npm', 'run', 'verify', '-w', 'axiomancer-mechanics'])
  assert.deepEqual(splitCommand(`node -e 'a b'`), ['node', '-e', 'a b'])
  const plan = planJudge(body('- [x] A1 chained `npm test && npm run lint`'), HEAD)
  assert.equal(plan.runs.length, 0)
  const d = decideJudge(plan, {})
  assert.equal(d.state, 'red')
  assert.match(describeJudge(d), /shell syntax/)
})

test('unproven and missing lines are left to the acceptance step; no ticked line is none', () => {
  const d = decideJudge(planJudge(body('- [x] A1 says nothing', '- [x] A2 `gone.test.mjs`'), HEAD), {})
  assert.equal(d.state, 'green')
  assert.deepEqual(d.lines.map((l) => l.verdict), ['acceptance', 'acceptance'])
  assert.equal(decideJudge(planJudge('## What shipped\n- x\n', HEAD), {}).state, 'none')
})

test('pr-review.yml runs the judge on the head and verify-gate fails when it does', () => {
  const review = fs.readFileSync(path.join(ROOT, '.github/workflows/pr-review.yml'), 'utf8')
  const job = (id) => review.split(new RegExp(`\\n {2}${id}:\\n`))[1]?.split(/\n {2}[a-z][\w-]*:\n/)[0] ?? ''
  const judgeJob = job('judge')
  assert.match(judgeJob, /^ {4}if: github\.event\.pull_request\.head\.repo\.full_name == github\.repository$/m)
  assert.match(judgeJob, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/)
  assert.match(judgeJob, /node scripts\/pr-judge\.mjs plan --body-file/)
  assert.match(judgeJob, /node scripts\/pr-judge\.mjs run --body-file/)
  // The body's commands run with no token in reach.
  const runStep = judgeJob.split(/- name: /).find((s) => /pr-judge\.mjs run/.test(s))
  assert.doesNotMatch(runStep, /GH_TOKEN|secrets\./)
  assert.doesNotMatch(judgeJob.split(/\n {4}steps:\n/)[0], /GH_TOKEN/, 'no job-level token')
  const gate = job('verify-gate')
  assert.match(gate, /^ {4}needs: judge$/m)
  assert.match(gate, /^ {4}if: always\(\) && github\.event\.pull_request\.head\.repo\.full_name == github\.repository$/m)
  assert.match(gate, /if: needs\.judge\.result != 'success'/)
})
