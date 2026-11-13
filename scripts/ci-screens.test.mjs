// scripts/ci-screens.test.mjs — the CI screen log's recorder (phase CW1a).
//
// Part of the root `npm test` suite. Feeds saved comment bodies to
// scripts/ci-screens.mjs and checks the rows it makes and that it never logs
// one twice, then checks the seeded docs/reports/ci-screens.md.
//
//   node --test scripts/ci-screens.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { appendRows, cancelledRuns, flappingRoutes, incidentsFor, parseRows, record } from './ci-screens.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOG = fs.readFileSync(path.join(ROOT, 'docs/reports/ci-screens.md'), 'utf8')

const visual = (run, table, held = []) => [
  '<!-- visual-smoke -->',
  '### Visual smoke: this PR changes pixels',
  '',
  '| route | verdict | ratio |',
  '| --- | --- | --- |',
  ...table.map(([r, ratio]) => `| ${r} | differing | ${ratio} |`),
  ...(held.length ? ['', 'Not re-stamped:', ...held.map(([r, why]) => `- ${r}: ${why}`)] : []),
  '',
  `Captures and diffs: [visual-smoke artifact](https://github.com/o/r/actions/runs/${run}/artifacts/9).`,
].join('\n')

const mutation = (cell) => [
  '<!-- eval:mutation-pr -->',
  '## Mutation on changed lines (report only)',
  '',
  'Base `34976421`, head `d5bd27f6`, budget 15 min.',
  '',
  '| Workspace | Lines | Mutants | Killed | Timed out | Survived | No coverage | Score | Run |',
  '|---|---|---|---|---|---|---|---|---|',
  `| mobile | 55 | 60 | - | 0 | 12 | - | n/a | ${cell} |`,
].join('\n')

const input = { pr: 7, date: '2026-12-01' }

test('a load-failed route is a row, with the run from the artifact link', () => {
  const rows = incidentsFor({ ...input, comments: [visual(111, [], [['cache', 'load-failed']])] })
  assert.deepEqual(rows.map((r) => [r.run, r.route, r.symptom]), [['111', 'cache', 'load-failed']])
})

test('a single re-stamp is not an incident, a captures-differ route is flapping', () => {
  assert.deepEqual(incidentsFor({ ...input, comments: [visual(1, [['quest', '1.000%']])] }), [])
  const rows = incidentsFor({ ...input, comments: [visual(2, [], [['quest', 'captures differ across runs']])] })
  assert.equal(rows[0].symptom, 'flapping')
})

test('a flapping pair: two re-stamp commits with nothing between them', () => {
  const subjects = ['feat: quest', 'visual: re-stamp quest (CI render)']
  assert.deepEqual(flappingRoutes(subjects, ['quest', 'root']), ['quest'])
  assert.deepEqual(flappingRoutes(['visual: re-stamp quest (CI render)', 'fix: quest', 'x'], ['quest']), [])
  const rows = incidentsFor({ ...input, comments: [visual(5, [['quest', '15.654%']])], subjects, restamping: ['quest'] })
  assert.deepEqual(rows.map((r) => [r.route, r.symptom]), [['quest', 'flapping']])
})

test('a mutation over budget and a dry run failure', () => {
  const over = incidentsFor({ ...input, comments: [mutation('over budget (899s): 12 of 60 tested, 12 survived, 899s')] })
  assert.deepEqual(over.map((r) => [r.run, r.route, r.symptom]), [['head d5bd27f6', 'mobile', 'mutation over budget']])
  const dry = incidentsFor({ ...input, comments: [mutation('failed (exit 1): ERROR Stryker One or more tests failed in the initial test run, 40s')] })
  assert.equal(dry[0].symptom, 'mutation dry run failed')
  assert.deepEqual(incidentsFor({ ...input, comments: [mutation('ok, 300s')] }), [])
})

test('a run cancelled by a re-stamp commit', () => {
  const commits = [{ sha: 'a', subject: 'feat' }, { sha: 'b', subject: 'visual: re-stamp x (CI render)' }]
  const runs = [{ id: 9, name: 'verify-mobile', conclusion: 'cancelled', head_sha: 'a' }, { id: 8, name: 'verify-mobile', conclusion: 'cancelled', head_sha: 'b' }]
  assert.deepEqual(cancelledRuns(runs, commits), ['9'])
})

test('recording twice adds nothing the second time', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-screens-'))
  const file = path.join(dir, 'log.md')
  fs.writeFileSync(file, LOG)
  const fetch = () => ({
    comments: [visual(111, [], [['cache', 'load-failed']]), mutation('over budget (899s): 12 of 60 tested, 899s')],
    commits: [],
    runs: [],
  })
  const argv = ['--pr', '7', '--file', file, '--date', '2026-12-01']
  assert.equal(record(argv, fetch).length, 2)
  const once = fs.readFileSync(file, 'utf8')
  assert.equal(record(argv, fetch).length, 0)
  assert.equal(fs.readFileSync(file, 'utf8'), once)
  assert.equal(parseRows(once)[0].pr, '#7')
  assert.equal(appendRows(once, parseRows(once)).added.length, 0)
})

test('the seeded log lists the pilot incidents', () => {
  const rows = parseRows(LOG)
  const has = (pr, route, symptom) => rows.some((r) => r.pr === pr && r.route === route && r.symptom === symptom)
  assert.ok(has('#1651', 'quest-two-lines', 'flapping'))
  assert.ok(has('#1653', 'quest-two-lines', 're-stamped without a change'))
  for (const route of ['cache', 'cache-goods', 'cache-card']) assert.ok(has('#1652', route, 'load-failed'))
  assert.ok(has('#1651', 'cache-card', 'load-failed'))
  assert.ok(has('#1647', 'verify-mobile', 'cancelled by re-stamp'))
  assert.ok(has('#1651', 'verify-mobile', 'cancelled by re-stamp'))
  assert.ok(has('#1652', 'app/cutscene/index.tsx', 'mutation over budget'))
  assert.ok(has('#1653', 'app/quest/index.tsx', 'mutation dry run failed'))
  assert.equal(new Set(rows.map((r) => `${r.pr}|${r.run}|${r.route}`)).size, rows.length)
})

test('the CLI refuses a missing --pr', () => {
  assert.throws(() => execFileSync('node', [path.join(ROOT, 'scripts/ci-screens.mjs'), 'record'], { stdio: 'pipe' }))
})
