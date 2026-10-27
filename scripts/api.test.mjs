// scripts/api.test.mjs — tests for the play-log report reader.
//
// Part of the root `npm test` suite. Runs scripts/api.mjs over the fixture
// report bodies in scripts/fixtures/ and checks argument parsing, the query
// it sends, the tables, `--json`, `--file`, a bad body, and that the token
// never reaches the output.
//
//   node --test scripts/api.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { REPORTS_PATH_PREFIX, REPORT_NAMES, checkBody, formatCardGaps, formatCardUsage, formatSignatureUsage, main, parseArgs, reportPath, table } from './api.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const USAGE_FIXTURE = path.join(HERE, 'fixtures', 'card-usage-report.json')
const GAPS_FIXTURE = path.join(HERE, 'fixtures', 'card-gaps-report.json')
const USAGE = JSON.parse(fs.readFileSync(USAGE_FIXTURE, 'utf-8'))
const GAPS = JSON.parse(fs.readFileSync(GAPS_FIXTURE, 'utf-8'))
const WORKER_REPORTS = path.join(HERE, '..', 'backend', 'src', 'reports.ts')
const NO_ENV_FILE = path.join(os.tmpdir(), 'api-test-no-such-file.env')

const sink = () => {
  const s = { text: '', write: (chunk) => { s.text += chunk } }
  return s
}

test('the path prefix and report names match the Worker', () => {
  const source = fs.readFileSync(WORKER_REPORTS, 'utf-8')
  assert.match(source, new RegExp(`REPORTS_PATH_PREFIX = '${REPORTS_PATH_PREFIX}'`))
  assert.match(source, new RegExp(`REPORT_NAMES = \\[${REPORT_NAMES.map((n) => `'${n}'`).join(', ')}\\]`))
})

test('parseArgs: one named report with its flags', () => {
  assert.deepEqual(parseArgs(['card-usage', '--card', 'strike', '--build', 'abc', '--json']),
    { report: 'card-usage', build: 'abc', card: 'strike', json: true, file: undefined })
  assert.equal(parseArgs(['card-gaps']).report, 'card-gaps')
})

test('parseArgs: refuses a missing, unknown or second report, a bare flag and --card on card-gaps', () => {
  assert.throws(() => parseArgs([]), /name a report/)
  assert.throws(() => parseArgs(['everything']), /unknown report/)
  assert.throws(() => parseArgs(['card-usage', 'card-gaps']), /one report at a time/)
  assert.throws(() => parseArgs(['card-usage', '--build']), /--build needs a value/)
  assert.throws(() => parseArgs(['card-usage', '--loud']), /unknown argument/)
  assert.throws(() => parseArgs(['card-gaps', '--card', 'x']), /card-usage only/)
})

test('reportPath: the flags become query values, encoded', () => {
  assert.equal(reportPath({ report: 'card-gaps' }), '/v1/reports/card-gaps')
  assert.equal(reportPath({ report: 'card-usage', build: 'abc', card: 'strike+' }), '/v1/reports/card-usage?build=abc&card=strike%2B')
})

test('table: first column left, the rest right-aligned', () => {
  assert.equal(table(['a', 'n'], [['xyz', 5], ['q', 12]]), 'a     n\nxyz   5\nq    12')
})

test('formatCardUsage: a header naming the scope and one row per card in the order given', () => {
  const text = formatCardUsage(USAGE)
  assert.match(text, /^Card usage: 2 fights \(build rep1234\)\./)
  const lines = text.split('\n')
  const head = lines.findIndex((l) => l.startsWith('card '))
  assert.match(lines[head], /^card\s+decks\s+drawn\s+played\s+free\s+paid\s+held\s+fizzled\s+offered\s+picked\s+skipped\s+removed$/)
  assert.deepEqual(lines.slice(head + 1).map((l) => l.split(/\s+/)[0]), ['strike', 'spark', 'ember'])
  assert.deepEqual(lines[head + 2].split(/\s+/), ['spark', '1', '1', '0', '0', '0', '1', '0', '2', '0', '2', '0'])
})

test('formatCardGaps: three sections, (none) for an empty one', () => {
  const text = formatCardGaps(GAPS)
  assert.match(text, /^Card gaps: 2 fights \(every build\)\./)
  assert.match(text, /THREATS THAT OVERWHELMED A PHASE\nenemy\s+threat\s+overwhelmed\s+fights\ngutter-wretch\s+Gnaw\s+1\s+1/)
  assert.match(text, /LIVE DICE LEFT UNSPENT AT TURN END\n.*\ngutter-wretch\s+body\s+2\s+1\ngutter-wretch\s+wild\s+1\s+1/)
  assert.match(text, /WHAT ENDED EACH LOST FIGHT\n\(none\)$/)
})

test('checkBody: refuses the wrong report or a missing list', () => {
  assert.throws(() => checkBody(USAGE, 'card-gaps'), /not a card-gaps report/)
  assert.throws(() => checkBody({ report: 'card-gaps', threats: [] }, 'card-gaps'), /no unspentDice list/)
})

test('main: fetches the named report with the token and prints it, never the token', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization })
    return { ok: true, status: 200, json: async () => USAGE }
  }
  const stdout = sink()
  const code = await main(['card-usage', '--build', 'rep1234'], {
    env: { PUZZLE_API_URL: 'https://api.example/', PUZZLE_API_TOKEN: 'sekrit' }, envFile: NO_ENV_FILE, fetchImpl, stdout, stderr: sink(),
  })
  assert.equal(code, 0)
  assert.deepEqual(calls, [{ url: 'https://api.example/v1/reports/card-usage?build=rep1234', auth: 'Bearer sekrit' }])
  assert.match(stdout.text, /^Card usage:/)
  assert.doesNotMatch(stdout.text, /sekrit/)
})

test('main: --json prints the body; --file reads a saved one with no network', async () => {
  const stdout = sink()
  const fetchImpl = async () => { throw new Error('no network expected') }
  assert.equal(await main(['card-usage', '--json', '--file', USAGE_FIXTURE], { env: {}, envFile: NO_ENV_FILE, fetchImpl, stdout, stderr: sink() }), 0)
  assert.deepEqual(JSON.parse(stdout.text), USAGE)
})

test('main: 2 on bad arguments or a missing variable, 1 on an HTTP failure', async () => {
  const stderr = sink()
  assert.equal(await main(['nope'], { env: {}, envFile: NO_ENV_FILE, stdout: sink(), stderr }), 2)
  const missing = sink()
  assert.equal(await main(['card-gaps'], { env: {}, envFile: NO_ENV_FILE, stdout: sink(), stderr: missing }), 2)
  assert.match(missing.text, /PUZZLE_API_URL and PUZZLE_API_TOKEN are not set/)
  const failed = sink()
  const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({}) })
  assert.equal(await main(['card-gaps'], {
    env: { PUZZLE_API_URL: 'https://api.example', PUZZLE_API_TOKEN: 'sekrit' }, envFile: NO_ENV_FILE, fetchImpl, stdout: sink(), stderr: failed,
  }), 1)
  assert.match(failed.text, /returned 401 \(check PUZZLE_API_TOKEN\)/)
  assert.doesNotMatch(failed.text, /sekrit/)
})

test('signature-usage: parses, the path has no card, the table lists one row per signature', () => {
  assert.deepEqual(parseArgs(['signature-usage', '--build', 'abc']),
    { report: 'signature-usage', build: 'abc', card: undefined, json: false, file: undefined })
  assert.throws(() => parseArgs(['signature-usage', '--card', 'x']), /card-usage only/)
  assert.equal(reportPath({ report: 'signature-usage', build: 'abc' }), '/v1/reports/signature-usage?build=abc')
  const body = {
    report: 'signature-usage', build: null, fights: 3,
    signatures: [
      { signatureId: 'sig-crimson-covenant', fightsWorn: 2, fightsCast: 1, casts: 2, castsPerFight: 1, refused: 2 },
      { signatureId: 'sig-orphan', fightsWorn: 0, fightsCast: 0, casts: 0, castsPerFight: null, refused: 1 },
    ],
  }
  assert.equal(checkBody(body, 'signature-usage'), body)
  assert.throws(() => checkBody({ report: 'signature-usage', build: null, fights: 0 }, 'signature-usage'), /no signatures list/)
  const lines = formatSignatureUsage(body).split('\n')
  assert.match(lines[0], /^Signature usage: 3 fights \(every build\)\./)
  const head = lines.findIndex((l) => l.startsWith('signature '))
  assert.deepEqual(lines[head + 1].split(/\s+/), ['sig-crimson-covenant', '2', '1', '2', '1', '2'])
  assert.deepEqual(lines[head + 2].split(/\s+/), ['sig-orphan', '0', '0', '0', '-', '1'])
  assert.match(formatSignatureUsage({ ...body, signatures: [] }), /No signatures recorded\./)
})
