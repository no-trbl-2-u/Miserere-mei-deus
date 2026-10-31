// scripts/sim-run.test.mjs — tests for the headless run sim's CLI.
//
// Part of the root `npm test` suite. Checks argument parsing and the run
// line format over the fixture runs in scripts/fixtures/sim-runs.json; the
// driver itself is stubbed (its own tests run in `axiomancer-mobile/sim/`).
//
//   node --test scripts/sim-run.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { formatLanes, formatRunLine, main, parseArgs } from './sim-run.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'sim-runs.json'), 'utf-8'))

const sink = () => {
  const s = { text: '', write: (chunk) => { s.text += chunk } }
  return s
}

test('parseArgs reads both flag shapes and defaults', () => {
  assert.deepEqual(parseArgs([]), { policy: 'wanderer', runs: 1, seed: 1, json: false, help: false })
  assert.deepEqual(parseArgs(['--policy', 'wanderer', '--runs', '3', '--seed', '0', '--json']),
    { policy: 'wanderer', runs: 3, seed: 0, json: true, help: false })
  assert.deepEqual(parseArgs(['--policy=wanderer', '--runs=2', '--seed=7']),
    { policy: 'wanderer', runs: 2, seed: 7, json: false, help: false })
})

test('parseArgs refuses unknown flags, missing values and bad numbers', () => {
  assert.throws(() => parseArgs(['--post']), /unknown argument/)
  assert.throws(() => parseArgs(['--runs']), /needs a value/)
  assert.throws(() => parseArgs(['--runs', '0']), /positive integer/)
  assert.throws(() => parseArgs(['--seed', '-1']), /non-negative integer/)
  assert.throws(() => parseArgs(['--runs', 'x']), /positive integer/)
})

test('formatLanes lists the largest lane first, ties by id', () => {
  assert.equal(formatLanes({ grey: 8, merciful: 4, defender: 4 }), 'grey=8 defender=4 merciful=4')
  assert.equal(formatLanes({}), '')
})

test('formatRunLine prints every field the brief names', () => {
  assert.equal(
    formatRunLine(FIXTURE.runs[0]),
    'wanderer seed=1 | chapter-clear | furthest=bw-d5 | level=16 | vitae=283/288 | fights won=19 lost=0 spared=0 | deck blood-price=13 grey=8 merciful=8 defender=2',
  )
  assert.match(formatRunLine(FIXTURE.runs[1]), /^wanderer seed=2 \| run-over \| furthest=bw-k2 \| level=9 \| vitae=0\/226 \| fights won=11 lost=2 spared=1 \|/)
  assert.match(formatRunLine(FIXTURE.runs[2]), /^wanderer seed=3 STUCK at bw-l4: run stuck at breakwater\/bw-l4/)
})

test('main prints one line per run and exits 1 when a run stuck', () => {
  const stdout = sink()
  const asked = []
  const code = main(['--runs', '3'], { stdout, stderr: sink(), play: (opts) => { asked.push(opts); return FIXTURE } })
  assert.equal(code, 1)
  assert.equal(stdout.text.trim().split('\n').length, 3)
  assert.equal(asked[0].runs, 3)
})

test('main exits 0 when every run ended, and --json prints the runs', () => {
  const clean = { policy: 'wanderer', runs: FIXTURE.runs.slice(0, 2) }
  const stdout = sink()
  assert.equal(main(['--json'], { stdout, stderr: sink(), play: () => clean }), 0)
  assert.equal(JSON.parse(stdout.text).length, 2)
})

test('main reports a bad flag with usage (exit 2) and a driver crash (exit 1)', () => {
  const stderr = sink()
  assert.equal(main(['--nope'], { stdout: sink(), stderr, play: () => FIXTURE }), 2)
  assert.match(stderr.text, /usage: npm run sim:run/)
  const crashed = sink()
  assert.equal(main([], { stdout: sink(), stderr: crashed, play: () => { throw new Error('boom') } }), 1)
  assert.match(crashed.text, /boom/)
})
