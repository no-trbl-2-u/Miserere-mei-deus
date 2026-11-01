// scripts/pr-acceptance.test.mjs — pins `decideAcceptance` in
// `scripts/pr-acceptance.mjs` (phase LG1c A3): the `verify-gate`
// acceptance-proof step on fixture PR bodies. A line proven by a test file,
// a shot or a command passes; an opt-out passes and is listed for T; a line
// with no proof, or one naming a file the head does not hold, fails; a body
// with nothing ticked has nothing to check.
//
//   node --test scripts/pr-acceptance.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { checkLine, decideAcceptance, describeAcceptance, parseAcceptance, resolveProofFile } from './pr-acceptance.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const HEAD = [
  'scripts/pr-gate.test.mjs',
  'axiomancer-mobile/components/combat/useEnemyClipSelection.test.tsx',
  'axiomancer-mobile/screenshots/baseline/combat-encounter.png',
  'scripts/pr-gate.mjs',
]

const body = (...acceptance) => [
  '## What shipped', '- a thing', '',
  '## Acceptance', ...acceptance, '',
  '## Verify', '- `npm test` -> green', '',
  'Closes #1',
].join('\n')

test('a line proven by a test file path passes and names it', () => {
  const d = decideAcceptance(body('- [x] A1 the gate decides (`scripts/pr-gate.test.mjs`)'), HEAD)
  assert.equal(d.state, 'green')
  assert.deepEqual(d.lines[0].files, ['scripts/pr-gate.test.mjs'])
  assert.match(describeAcceptance(d), /A1: proven by `scripts\/pr-gate\.test\.mjs`/)
})

test('a bare test file name resolves against the head, as past PR bodies wrote it', () => {
  const d = decideAcceptance(body('- [x] A3 the flinch waits (`useEnemyClipSelection.test.tsx` "waits for the board")'), HEAD)
  assert.equal(d.state, 'green')
  assert.deepEqual(d.lines[0].files, ['axiomancer-mobile/components/combat/useEnemyClipSelection.test.tsx'])
})

test('a verify:visual shot and a command each count as proof', () => {
  const d = decideAcceptance(body(
    '- [x] A1 the board renders (`axiomancer-mobile/screenshots/baseline/combat-encounter.png`)',
    '- [x] A2 the lint passes: `node scripts/check-plan-queues.mjs`',
    '- [x] A3 mechanics verify: `npm run verify -w axiomancer-mechanics`',
    '- [x] A4 one-off: `npx vitest run src/Cards`',
  ), HEAD)
  assert.equal(d.state, 'green')
  assert.deepEqual(d.lines.map((l) => l.status), ['proven', 'proven', 'proven', 'proven'])
  assert.deepEqual(d.lines[1].commands, ['node scripts/check-plan-queues.mjs'])
})

test('an opt-out passes and the summary lists its reason for T', () => {
  const d = decideAcceptance(body('- [x] A5 the skill documents the format (no test: doc-only change)'), HEAD)
  assert.equal(d.state, 'green')
  assert.equal(d.lines[0].status, 'opt-out')
  assert.match(describeAcceptance(d), /A5: no test, for T: doc-only change/)
})

test('a ticked line with no proof fails the gate and says how to fix it', () => {
  const d = decideAcceptance(body(
    '- [x] A1 proven (`scripts/pr-gate.test.mjs`)',
    '- [x] A2 `verify-gate` names each path',
  ), HEAD)
  assert.equal(d.state, 'red')
  assert.equal(d.lines[1].status, 'unproven')
  assert.match(describeAcceptance(d), /A2: names no proof/)
})

test('a proof path the head does not hold fails, even beside a command', () => {
  const d = decideAcceptance(body('- [x] A1 pinned (`scripts/gone.test.mjs`, `npm test`)'), HEAD)
  assert.equal(d.state, 'red')
  assert.equal(d.lines[0].status, 'missing')
  assert.deepEqual(d.lines[0].missing, ['scripts/gone.test.mjs'])
  assert.match(describeAcceptance(d), /A1: names `scripts\/gone\.test\.mjs`, which the head does not hold/)
})

test('a backticked source file or a bare program name is not proof', () => {
  assert.equal(checkLine({ id: 'A1', text: 'edits `scripts/pr-gate.mjs`' }, HEAD).status, 'unproven')
  assert.equal(checkLine({ id: 'A1', text: 'runs under `node`' }, HEAD).status, 'unproven')
  assert.equal(checkLine({ id: 'A1', text: 'runs `git log` (no test:   )' }, HEAD).status, 'unproven', 'an empty reason is no opt-out')
})

test('unticked lines, other sections and a missing section are not checked', () => {
  assert.equal(decideAcceptance(body('- [ ] A1 deferred to the next phase'), HEAD).state, 'none')
  assert.equal(decideAcceptance('## What shipped\n- [x] A1 not in Acceptance\n', HEAD).state, 'none')
  assert.equal(decideAcceptance('', HEAD).state, 'none')
  assert.equal(decideAcceptance(null, HEAD).state, 'none')
  assert.match(describeAcceptance(decideAcceptance('', HEAD)), /nothing to check/)
})

test('an indented continuation joins its line, and a nested bullet can carry the proof', () => {
  const lines = parseAcceptance(body(
    '- [x] A1 the long line wraps',
    '  onto a second line with `npm test`',
    '- [X] A2 capital X ticks too',
    '  - pinned by `scripts/pr-gate.test.mjs`',
  ))
  assert.deepEqual(lines.map((l) => l.id), ['A1', 'A2'])
  assert.equal(checkLine(lines[0], HEAD).status, 'proven')
  assert.equal(checkLine(lines[1], HEAD).status, 'proven')
})

test('CRLF bodies, as the GitHub web editor saves them, parse the same', () => {
  const d = decideAcceptance(body('- [x] A1 proven by `npm test`').replace(/\n/g, '\r\n'), HEAD)
  assert.equal(d.state, 'green')
})

test('resolveProofFile matches an exact path or a unique-enough basename, never a wrong directory', () => {
  assert.equal(resolveProofFile('./scripts/pr-gate.test.mjs', HEAD), 'scripts/pr-gate.test.mjs')
  assert.equal(resolveProofFile('pr-gate.test.mjs', HEAD), 'scripts/pr-gate.test.mjs')
  assert.equal(resolveProofFile('other/pr-gate.test.mjs', HEAD), null)
})

// --- wiring -----------------------------------------------------------------

test('verify-gate runs the acceptance step on the PR head before it waits', () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/pr-review.yml'), 'utf8')
  const gate = wf.slice(wf.indexOf('\n  verify-gate:'), wf.indexOf('\n  review-wanted:'))
  const step = gate.indexOf('node scripts/pr-acceptance.mjs --pr "$PR" --head "$HEAD_SHA"')
  assert.ok(step > 0, 'the step is in the verify-gate job')
  assert.ok(step < gate.indexOf('pr-gate.mjs wait'), 'it fails fast, before the long wait')
})

test('the march PR body template shows a proof on its acceptance line', () => {
  const march = fs.readFileSync(path.join(ROOT, 'skills/march.lanes.md'), 'utf8')
  const block = march.slice(march.indexOf('**Body template**'))
  const ticked = block.slice(0, block.indexOf('## Verify')).split('\n').filter((l) => /- \[x\] A\d/.test(l))
  assert.ok(ticked.length >= 2, 'the template shows a proven line and an opt-out')
  const d = decideAcceptance(`## Acceptance\n${ticked.map((l) => l.trim()).join('\n')}\n`, [])
  assert.equal(d.state, 'green', 'the template passes its own gate')
  assert.deepEqual(d.lines.map((l) => l.status), ['proven', 'opt-out'])
})
