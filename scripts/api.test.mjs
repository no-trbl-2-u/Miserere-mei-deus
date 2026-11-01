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

import { REPORTS_PATH_PREFIX, REPORT_NAMES, SOURCE_FILTERS, checkBody, formatCardGaps, formatCardUsage, formatCardVsBot, formatCoverage, formatRunEnds, formatRunPacing, formatRunSummary, formatSignatureUsage, main, parseArgs, reportPath, table } from './api.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const USAGE_FIXTURE = path.join(HERE, 'fixtures', 'card-usage-report.json')
const GAPS_FIXTURE = path.join(HERE, 'fixtures', 'card-gaps-report.json')
const VS_BOT_FIXTURE = path.join(HERE, 'fixtures', 'card-vs-bot-report.json')
const RUNS_FIXTURE = path.join(HERE, 'fixtures', 'run-summary-report.json')
const VS_BOT = JSON.parse(fs.readFileSync(VS_BOT_FIXTURE, 'utf-8'))
const RUNS = JSON.parse(fs.readFileSync(RUNS_FIXTURE, 'utf-8'))
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

test('the source filters match the play-log contract', () => {
  const contract = fs.readFileSync(path.join(HERE, '..', 'axiomancer-mechanics', 'src', 'Combat', 'combat.play-log-contract.ts'), 'utf-8')
  assert.match(contract, /PLAY_LOG_SOURCES = \['human', 'harness', 'sim'\] as const/)
  assert.deepEqual(SOURCE_FILTERS, ['human', 'harness', 'sim', 'all'])
})

test('parseArgs: one named report with its flags', () => {
  assert.deepEqual(parseArgs(['card-usage', '--card', 'strike', '--build', 'abc', '--json']),
    { report: 'card-usage', build: 'abc', source: undefined, card: 'strike', json: true, file: undefined })
  assert.equal(parseArgs(['card-gaps']).report, 'card-gaps')
})

test('parseArgs: --source takes human, harness, sim or all and nothing else', () => {
  for (const source of SOURCE_FILTERS) assert.equal(parseArgs(['card-usage', '--source', source]).source, source)
  assert.equal(parseArgs(['card-usage']).source, undefined)
  assert.throws(() => parseArgs(['card-usage', '--source', 'bot']), /--source expects human, harness, sim, all \(got bot\)/)
  assert.throws(() => parseArgs(['card-usage', '--source']), /--source needs a value/)
  assert.equal(parseArgs(['signature-usage', '--source', 'sim']).source, 'sim')
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
  assert.equal(reportPath({ report: 'card-usage', build: 'abc', source: 'sim' }), '/v1/reports/card-usage?build=abc&source=sim')
  assert.equal(reportPath({ report: 'card-gaps', source: 'all' }), '/v1/reports/card-gaps?source=all')
})

test('table: first column left, the rest right-aligned', () => {
  assert.equal(table(['a', 'n'], [['xyz', 5], ['q', 12]]), 'a     n\nxyz   5\nq    12')
})

test('formatCardUsage: a header naming the scope and one row per card in the order given', () => {
  const text = formatCardUsage(USAGE)
  assert.match(text, /^Card usage: 2 fights \(build rep1234, source human\)\./)
  const lines = text.split('\n')
  const head = lines.findIndex((l) => l.startsWith('card '))
  assert.match(lines[head], /^card\s+decks\s+drawn\s+played\s+free\s+paid\s+held\s+fizzled\s+offered\s+picked\s+skipped\s+removed$/)
  assert.deepEqual(lines.slice(head + 1).map((l) => l.split(/\s+/)[0]), ['strike', 'spark', 'ember'])
  assert.deepEqual(lines[head + 2].split(/\s+/), ['spark', '1', '1', '0', '0', '0', '1', '0', '2', '0', '2', '0'])
})

test('formatCardGaps: three sections, (none) for an empty one', () => {
  const text = formatCardGaps(GAPS)
  assert.match(text, /^Card gaps: 2 fights \(every build, source all\)\./)
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

test('main: --source goes to the Worker as a query value and the header prints the source the body names', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    return { ok: true, status: 200, json: async () => ({ ...USAGE, source: 'sim' }) }
  }
  const stdout = sink()
  const code = await main(['card-usage', '--build', 'rep1234', '--source', 'sim'], {
    env: { PUZZLE_API_URL: 'https://api.example', PUZZLE_API_TOKEN: 'sekrit' }, envFile: NO_ENV_FILE, fetchImpl, stdout, stderr: sink(),
  })
  assert.equal(code, 0)
  assert.deepEqual(calls, ['https://api.example/v1/reports/card-usage?build=rep1234&source=sim'])
  assert.match(stdout.text, /^Card usage: 2 fights \(build rep1234, source sim\)\./)
  const bad = sink()
  assert.equal(await main(['card-usage', '--source', 'bot'], { env: {}, envFile: NO_ENV_FILE, stdout: sink(), stderr: bad }), 2)
  assert.match(bad.text, /--source expects/)
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
    { report: 'signature-usage', build: 'abc', source: undefined, card: undefined, json: false, file: undefined })
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

test('card-vs-bot: --source is refused, --build is passed, --json parses a fixture body', async () => {
  assert.throws(() => parseArgs(['card-vs-bot', '--source', 'sim']), /--source does not apply to card-vs-bot/)
  assert.throws(() => parseArgs(['card-vs-bot', '--card', 'x']), /card-usage only/)
  assert.equal(reportPath({ report: 'card-vs-bot', build: 'abc' }), '/v1/reports/card-vs-bot?build=abc')
  const stdout = sink()
  const fetchImpl = async () => { throw new Error('no network expected') }
  assert.equal(await main(['card-vs-bot', '--json', '--file', VS_BOT_FIXTURE], { env: {}, envFile: NO_ENV_FILE, fetchImpl, stdout, stderr: sink() }), 0)
  assert.deepEqual(JSON.parse(stdout.text), VS_BOT)
  assert.equal(checkBody(VS_BOT, 'card-vs-bot'), VS_BOT)
  assert.throws(() => checkBody({ report: 'card-vs-bot', columns: [] }, 'card-vs-bot'), /no cards list/)
})

test('formatCardVsBot: names the build and the columns, one row per card and column, T first', () => {
  const lines = formatCardVsBot(VS_BOT).split('\n')
  assert.equal(lines[0], 'Card vs bot: build vsbot01 (the newest holding both human and sim); human (2 fights), defender (1 fight), merciful (1 fight).')
  const head = lines.findIndex((l) => l.startsWith('card '))
  assert.deepEqual(lines[head].split(/\s+/), ['card', 'column', 'decks', 'drawn', 'played', 'offered', 'picked', 'skipped', 'deck/f', 'draw/f', 'play/f', 'pick/o', 'skip/o'])
  const rows = lines.slice(head + 1).map((l) => l.trim().split(/\s+/))
  assert.equal(rows.length, 6)
  assert.deepEqual(rows[0], ['strike', 'human', '2', '1', '2', '0', '0', '0', '1', '0.5', '1', '-', '-'])
  assert.deepEqual(rows[2], ['merciful', '1', '2', '1', '0', '0', '0', '1', '2', '1', '-', '-'])
  assert.deepEqual(rows[3], ['ember', 'human', '0', '0', '0', '2', '1', '1', '0', '0', '0', '0.5', '0.5'])
  assert.match(formatCardVsBot({ ...VS_BOT, build: null, columns: [], cards: [] }), /no build holds both a human and a sim fight/)
  assert.match(formatCardVsBot({ ...VS_BOT, cards: [] }), /No cards recorded\./)
})

test('run-summary: --source goes to the Worker, the table lists a row per source and sim policy', async () => {
  assert.equal(parseArgs(['run-summary', '--source', 'sim']).source, 'sim')
  assert.equal(reportPath({ report: 'run-summary', build: 'abc', source: 'sim' }), '/v1/reports/run-summary?build=abc&source=sim')
  const calls = []
  const fetchImpl = async (url) => { calls.push(url); return { ok: true, status: 200, json: async () => RUNS } }
  const stdout = sink()
  const code = await main(['run-summary', '--build', 'runsum1'], {
    env: { PUZZLE_API_URL: 'https://api.example', PUZZLE_API_TOKEN: 'sekrit' }, envFile: NO_ENV_FILE, fetchImpl, stdout, stderr: sink(),
  })
  assert.equal(code, 0)
  assert.deepEqual(calls, ['https://api.example/v1/reports/run-summary?build=runsum1'])
  const lines = stdout.text.split('\n')
  assert.equal(lines[0], 'Run summary: 5 runs (build runsum1, source all).')
  const head = lines.findIndex((l) => l.startsWith('source '))
  assert.deepEqual(lines[head + 1].trim().split(/\s+/), ['human', '-', '1', '0', '0', '1', '0', '5', '5', '20', '30', '30', 'bw-exit'])
  assert.deepEqual(lines[head + 2].trim().split(/\s+/), ['sim', 'defender', '3', '1', '1', '1', '0', '6', '8', '50', '17.5', '25', 'bw-exit'])
  assert.match(formatRunSummary({ ...RUNS, runs: 0, summary: [] }), /No runs recorded\./)
  assert.throws(() => checkBody({ report: 'run-summary' }, 'run-summary'), /no summary list/)
})

// SM2e: run-ends, run-pacing and coverage. Each reads every source unless --source narrows it, like run-summary.
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', name), 'utf-8'))
const ENDS = fixture('run-ends-report.json')
const PACING = fixture('run-pacing-report.json')
const COVERAGE = fixture('coverage-report.json')

for (const [report, body, list] of [['run-ends', ENDS, 'ends'], ['run-pacing', PACING, 'pacing'], ['coverage', COVERAGE, 'coverage']]) {
  test(`${report}: --build and --source go to the Worker, --card is refused, and the body is checked`, async () => {
    assert.ok(REPORT_NAMES.includes(report))
    assert.equal(parseArgs([report, '--source', 'sim']).source, 'sim')
    assert.throws(() => parseArgs([report, '--card', 'strike']), /--card applies to card-usage only/)
    assert.equal(reportPath({ report, build: 'abc', source: 'sim' }), `/v1/reports/${report}?build=abc&source=sim`)
    assert.throws(() => checkBody({ report }, report), new RegExp(`no ${list} list`))
    const calls = []
    const fetchImpl = async (url) => { calls.push(url); return { ok: true, status: 200, json: async () => body } }
    const stdout = sink()
    const code = await main([report, '--build', 'sm2e01', '--source', 'sim'], {
      env: { PUZZLE_API_URL: 'https://api.example', PUZZLE_API_TOKEN: 'sekrit' }, envFile: NO_ENV_FILE, fetchImpl, stdout, stderr: sink(),
    })
    assert.equal(code, 0)
    assert.deepEqual(calls, [`https://api.example/v1/reports/${report}?build=sm2e01&source=sim`])
    assert.ok(!stdout.text.includes('sekrit'))
  })
}

test('formatRunEnds: one row per policy and end node, a dash for a run that ended off the map', () => {
  const lines = formatRunEnds(ENDS).split('\n')
  assert.equal(lines[0], 'Run ends: 3 closed runs (build sm2e01, source sim).')
  const head = lines.findIndex((l) => l.startsWith('source '))
  assert.deepEqual(lines[head].trim().split(/\s+/), ['source', 'policy', 'ended', 'at', 'runs', 'run-over', 'clear', 'lvl', 'avg', 'vitae', 'avg'])
  assert.deepEqual(lines[head + 2].trim().split(/\s+/), ['sim', 'cautious', 'n-c', '1', '0', '1', '3', '25'])
  assert.deepEqual(lines[head + 3].trim().split(/\s+/), ['sim', 'rusher', '-', '1', '1', '0', '4', '0'])
  assert.match(formatRunEnds({ ...ENDS, runs: 0, ends: [] }), /No closed runs recorded\./)
})

test('formatRunPacing: nodes with the averages, and a dash where no event carried a level or VITAE', () => {
  const lines = formatRunPacing(PACING).split('\n')
  assert.equal(lines[0], 'Run pacing: 3 runs (build sm2e01, source sim).')
  const head = lines.findIndex((l) => l.startsWith('source '))
  assert.deepEqual(lines[head + 2].trim().split(/\s+/), ['sim', 'cautious', 'n-b', '2', '1', '2.5', '29', '2', '0'])
  assert.deepEqual(lines[head + 3].trim().split(/\s+/), ['sim', 'rusher', 'n-z', '1', '2', '-', '-', '0', '0'])
  assert.match(formatRunPacing({ ...PACING, pacing: [] }), /No nodes entered\./)
})

test('formatCoverage: one row per kind and raw id, a dash for an item\'s cleared', () => {
  const lines = formatCoverage(COVERAGE).split('\n')
  assert.equal(lines[0], 'Coverage: 3 runs (build sm2e01, source sim).')
  const head = lines.findIndex((l) => l.startsWith('source '))
  assert.deepEqual(lines[head + 2].trim().split(/\s+/), ['sim', 'cautious', 'quest-step', 'breakwater-line/1', '1', '1', '0'])
  assert.deepEqual(lines[head + 5].trim().split(/\s+/), ['sim', 'cautious', 'item', 'relic-a', '1', '1', '-'])
  assert.match(formatCoverage({ ...COVERAGE, coverage: [] }), /Nothing reached\./)
})
