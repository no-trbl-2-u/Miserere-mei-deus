// scripts/puzzle-times.test.mjs — tests for the solve-time reader.
//
// Part of the root `npm test` suite. Runs scripts/puzzle-times.mjs over the
// fixture GET body in scripts/fixtures/puzzle-attempts.json and checks the
// median, the band groups, demos last, `--solver`, `--json`, the env and
// env-file lookup, and that the token never reaches the output.
//
//   node --test scripts/puzzle-times.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  PUZZLE_ATTEMPTS_PATH,
  filterBySolver,
  formatTable,
  main,
  median,
  parseArgs,
  parseEnvFile,
  resolveConfig,
  summarize,
} from './puzzle-times.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(HERE, 'fixtures', 'puzzle-attempts.json')
const ATTEMPTS = JSON.parse(fs.readFileSync(FIXTURE, 'utf-8')).attempts
const CONTRACT = path.join(HERE, '..', 'axiomancer-mechanics', 'src', 'World', 'Hazard', 'puzzle', 'hazard-puzzle.attempt-contract.ts')

/** A stream stand-in that keeps what is written to it. */
const sink = () => {
  const s = { text: '', write: (chunk) => { s.text += chunk } }
  return s
}

/** A path to a file that does not exist, so no real env file is read. */
const NO_ENV_FILE = path.join(os.tmpdir(), 'puzzle-times-test-no-such-file.env')

/** Write `body` to a fresh temp env file and return its path. */
const envFileWith = (body) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'puzzle-times-'))
  const file = path.join(dir, 'puzzle-api.env')
  fs.writeFileSync(file, body)
  return file
}

test('the API path matches the mechanics attempt contract', () => {
  const source = fs.readFileSync(CONTRACT, 'utf-8')
  assert.match(source, new RegExp(`PUZZLE_ATTEMPTS_PATH = '${PUZZLE_ATTEMPTS_PATH}'`))
})

test('median: odd count is the middle value, even count the mean of the middle two', () => {
  assert.equal(median([7000, 5000, 6100]), 6100)
  assert.equal(median([4000, 9000]), 6500)
  assert.equal(median([3]), 3)
})

test('summarize: counts, solve rate and median seconds over cleared attempts only', () => {
  const rows = summarize(ATTEMPTS)
  const easy01 = rows.find((r) => r.layoutId === 'cand-easy-01')
  assert.deepEqual(easy01, { layoutId: 'cand-easy-01', band: 'easy', attempts: 4, solves: 3, solveRate: 0.75, medianSeconds: 6.1 })
  const hard = rows.find((r) => r.layoutId === 'cand-hard-01')
  assert.equal(hard.solves, 0)
  assert.equal(hard.medianSeconds, null)
})

test('summarize: candidates by band (easy, medium, hard), then demos last', () => {
  assert.deepEqual(
    summarize(ATTEMPTS).map((r) => r.layoutId),
    ['cand-easy-01', 'cand-easy-02', 'cand-medium-01', 'cand-hard-01', 'demo-cliff-easy'],
  )
})

test('formatTable: one heading per group, demos after the bands, dash for no solve', () => {
  const text = formatTable(summarize(ATTEMPTS))
  const lines = text.split('\n')
  assert.match(lines[0], /^Puzzle solve times: 9 attempts \(all solvers\)/)
  const order = ['EASY', 'MEDIUM', 'HARD', 'DEMOS'].map((h) => lines.indexOf(h))
  assert.ok(order.every((i) => i > 0), 'every group heading printed')
  assert.deepEqual([...order].sort((a, b) => a - b), order)
  assert.match(text, /cand-easy-01 +4 +3 +75% +6\.1/)
  assert.match(text, /cand-medium-01 +1 +1 +100% +15\.3/)
  assert.match(text, /cand-hard-01 +1 +0 +0% +-/)
  assert.ok(text.indexOf('demo-cliff-easy') > text.indexOf('cand-hard-01'))
})

test('formatTable: an empty list says so', () => {
  assert.equal(formatTable([], { solver: 'nobody' }), 'No puzzle attempts stored (solver "nobody").')
})

test('--solver keeps one solver, case-insensitively', () => {
  const ts = filterBySolver(ATTEMPTS, 'T')
  assert.equal(ts.length, 8)
  assert.ok(ts.every((a) => a.solver.toLowerCase() === 't'))
  const easy02 = summarize(filterBySolver(ATTEMPTS, 'agent'))
  assert.deepEqual(easy02.map((r) => r.layoutId), ['cand-easy-02'])
})

test('parseArgs: flags, values and bad input', () => {
  assert.deepEqual(parseArgs(['--solver', 'T', '--json']), { solver: 'T', json: true, file: undefined })
  assert.throws(() => parseArgs(['--solver']), /--solver needs a value/)
  assert.throws(() => parseArgs(['--bogus']), /unknown argument: --bogus/)
})

test('parseEnvFile: comments, export, quotes', () => {
  assert.deepEqual(
    parseEnvFile('# the api\nexport PUZZLE_API_URL="https://x.workers.dev/"\n\nPUZZLE_API_TOKEN = \'s3cret\'\nnot a pair\n'),
    { PUZZLE_API_URL: 'https://x.workers.dev/', PUZZLE_API_TOKEN: 's3cret' },
  )
})

test('resolveConfig: env first, env file fills the gaps, trailing slash dropped', () => {
  const file = envFileWith('PUZZLE_API_URL=https://file.example/\nPUZZLE_API_TOKEN=file-token\n')
  assert.deepEqual(resolveConfig({ PUZZLE_API_TOKEN: 'env-token' }, file).config, { url: 'https://file.example', token: 'env-token' })
  assert.deepEqual(resolveConfig({}, file).config, { url: 'https://file.example', token: 'file-token' })
  assert.deepEqual(resolveConfig({ PUZZLE_API_URL: 'https://env.example' }, NO_ENV_FILE), { missing: ['PUZZLE_API_TOKEN'] })
})

test('main: a missing variable fails with one line naming it, exit 2', async () => {
  const stdout = sink()
  const stderr = sink()
  const code = await main([], { env: { PUZZLE_API_TOKEN: 'tok' }, envFile: NO_ENV_FILE, stdout, stderr, fetchImpl: () => assert.fail('no fetch') })
  assert.equal(code, 2)
  assert.equal(stderr.text.trim().split('\n').length, 1)
  assert.match(stderr.text, /PUZZLE_API_URL is not set/)
  assert.doesNotMatch(stderr.text, /PUZZLE_API_TOKEN/)
})

test('main: fetches with the bearer token and never prints it', async () => {
  const stdout = sink()
  const stderr = sink()
  let seen
  const fetchImpl = async (url, init) => {
    seen = { url, auth: init.headers.Authorization }
    return { ok: true, status: 200, json: async () => ({ attempts: ATTEMPTS }) }
  }
  const env = { PUZZLE_API_URL: 'https://api.example/', PUZZLE_API_TOKEN: 'top-secret-token' }
  const code = await main(['--solver', 'T'], { env, envFile: NO_ENV_FILE, stdout, stderr, fetchImpl })
  assert.equal(code, 0)
  assert.deepEqual(seen, { url: 'https://api.example/v1/puzzle-attempts', auth: 'Bearer top-secret-token' })
  assert.match(stdout.text, /8 attempts \(solver "T"\)/)
  assert.doesNotMatch(stdout.text + stderr.text, /top-secret-token/)
})

test('main: a non-2xx response is one line on stderr, exit 1, no token', async () => {
  const stdout = sink()
  const stderr = sink()
  const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({}) })
  const env = { PUZZLE_API_URL: 'https://api.example', PUZZLE_API_TOKEN: 'wrong-token' }
  const code = await main([], { env, envFile: NO_ENV_FILE, stdout, stderr, fetchImpl })
  assert.equal(code, 1)
  assert.match(stderr.text, /returned 401 \(check PUZZLE_API_TOKEN\)/)
  assert.doesNotMatch(stderr.text, /wrong-token/)
})

test('main: --json prints the summary rows as JSON', async () => {
  const stdout = sink()
  const code = await main(['--file', FIXTURE, '--json'], { stdout, stderr: sink(), envFile: NO_ENV_FILE })
  assert.equal(code, 0)
  const rows = JSON.parse(stdout.text)
  assert.deepEqual(rows, summarize(ATTEMPTS))
  assert.equal(rows.at(-1).band, null)
})
