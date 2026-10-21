// scripts/visual-report.test.mjs — the visual smoke run's record (phase VE1c).
//
// Part of the root `npm test` suite. Pins the JSON summary, the step-summary
// table, which routes the CI re-stamp job copies over the baselines, and the
// one PR comment it posts (axiomancer-mobile/scripts/visual-report.mjs).
//
//   node --test scripts/visual-report.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import {
  COMMENT_MARKER,
  buildVisualSummary,
  renderPrComment,
  renderStepSummary,
  restampRoutes,
} from '../axiomancer-mobile/scripts/visual-report.mjs'

const timings = { exportMs: 1200, exportReused: true, captureMs: 15400, compareMs: 800 }
const result = {
  matched: [{ route: 'root', ratio: 0.0001 }],
  differing: [
    { route: 'memoir', reason: 'pixel-diff', ratio: 0.0123 },
    { route: 'village', reason: 'size-mismatch' },
    { route: 'dialogue', reason: 'load-failed', message: 'timeout' },
    { route: 'hazard-board', reason: 'pixel-diff', ratio: 0.02 },
  ],
  missing: [{ route: 'new-screen', currentPath: '/x/new-screen.png' }],
  consoleErrors: [{ url: '/', text: 'boom' }],
  runs: 2,
  nondeterministic: ['hazard-board'],
}
const summary = buildVisualSummary(result, timings, 4)

test('the summary carries one row per route, the counts and the timings', () => {
  assert.deepEqual(summary.counts, { matched: 1, differing: 4, missing: 1, nondeterministic: 1, consoleErrors: 1 })
  assert.equal(summary.exitCode, 4)
  assert.equal(summary.runs, 2)
  assert.deepEqual(summary.timings, timings)
  assert.deepEqual(summary.routes.map((r) => [r.route, r.verdict]), [
    ['root', 'matched'], ['memoir', 'differing'], ['village', 'differing'],
    ['dialogue', 'load-failed'], ['hazard-board', 'differing'], ['new-screen', 'missing'],
  ])
  assert.equal(summary.routes.find((r) => r.route === 'hazard-board').nondeterministic, true)
})

test('the step summary has the counts, the phase timings and a route table', () => {
  const md = renderStepSummary(summary)
  assert.match(md, /^### Visual smoke \(report-only\)/)
  assert.match(md, /exit 4 · matched 1 · differing 4 · missing 1 · nondeterministic 1 \(2 runs per route\)/)
  assert.match(md, /export stamp hit 1\.2s · capture 15\.4s · compare 0\.8s/)
  assert.match(md, /\| memoir \| differing \| 1\.230% \|/)
  assert.match(md, /\| hazard-board \| differing, nondeterministic \| 2\.000% \|/)
  assert.match(md, /\| new-screen \| missing \| - \|/)
  assert.match(renderStepSummary({ ...summary, timings: { ...timings, exportReused: false } }), /export built/)
})

test('re-stamp takes differing and missing routes with a stable capture, never a failed load', () => {
  assert.deepEqual(restampRoutes(summary), ['memoir', 'village', 'new-screen'])
  assert.deepEqual(restampRoutes(buildVisualSummary({ ...result, differing: [], missing: [] }, timings, 0)), [])
})

test('the PR comment carries the marker, the re-stamped routes, what was held and the artifact', () => {
  const md = renderPrComment(summary, 'https://github.com/o/r/actions/runs/1/artifacts/2', 'abcdef1234567')
  assert.ok(md.startsWith(COMMENT_MARKER))
  assert.equal(COMMENT_MARKER, '<!-- visual-smoke -->')
  assert.match(md, /re-stamped 3 route\(s\) from `abcdef1`/)
  assert.match(md, /\| memoir \| differing \| 1\.230% \|/)
  assert.doesNotMatch(md, /\| root \|/)
  assert.match(md, /- hazard-board: captures differ across runs/)
  assert.match(md, /- dialogue: load-failed/)
  assert.match(md, /\[visual-smoke artifact\]\(https:\/\/github\.com\/o\/r\/actions\/runs\/1\/artifacts\/2\)/)
})

test('the CLI prints the re-stamp list and the comment the workflow reads', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-report-'))
  const file = path.join(dir, 'visual-summary.json')
  fs.writeFileSync(file, JSON.stringify(summary))
  const cli = path.join(import.meta.dirname, '..', 'axiomancer-mobile', 'scripts', 'visual-report.mjs')
  assert.equal(execFileSync('node', [cli, 'restamp', file], { encoding: 'utf8' }), 'memoir\nvillage\nnew-screen\n')
  assert.match(execFileSync('node', [cli, 'comment', file, 'https://x', 'abcdef1'], { encoding: 'utf8' }), /^<!-- visual-smoke -->/)
})
