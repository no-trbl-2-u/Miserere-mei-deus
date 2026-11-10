// scripts/sim-report.test.mjs — tests for the nightly sim report.
//
// Part of the root `npm test` suite. The Worker is mocked (an injected fetch, and
// one real local HTTP server); `gh` is stubbed; nothing touches the network.
//
//   node --test scripts/sim-report.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { buildFacts, historyLine, main, parseArgs, readBreakLines, regionPacing, universeOf } from './sim-report.mjs'

const sink = () => {
  const s = { text: '', write: (chunk) => { s.text += chunk } }
  return s
}

const BUILD = '0123456789abcdef0123456789abcdef01234567'
const ENV = { PUZZLE_API_URL: 'https://api.example.test', PUZZLE_API_TOKEN: 'tkn' }

const node = (id, region) => ({ id, kind: null, place: null, gate: false, role: 'side', elite: false, boss: false, exit: false, region })
const CONTENT = {
  continent: 'c', map: 'breakwater', startNodeId: 'n1', exitNodeIds: ['n5'],
  nodes: [node('n1', 0), node('n2', 0), node('n3', 1), node('n4', 1), node('n5', 1)],
  quests: [{ id: 'q-main', name: 'Main', main: true, steps: [{ step: 1, stepId: '1', questName: 'a', nodeId: 'n1', turnInNodeId: null, settle: 'x', objectives: [] }, { step: 2, stepId: '2', questName: 'b', nodeId: 'n3', turnInNodeId: null, settle: 'x', objectives: [] }] }],
  enemies: [{ id: 'rat', slug: 'rat', name: 'Rat', stagings: [] }, { id: 'crab', slug: 'crab', name: 'Crab', stagings: [] }],
  hazards: [{ id: 'tide', title: 'Tide', nodeIds: ['n4'] }],
  items: [{ id: 'rope', name: 'Rope', category: 'misc', sources: ['loot-cache'], nodeIds: ['n2'] }, { id: 'lamp', name: 'Lamp', category: 'misc', sources: ['quest'], nodeIds: ['n3'] }],
  regions: [{ index: 0, gateId: null, nodeIds: ['n1', 'n2'] }, { index: 1, gateId: 'held:n2', nodeIds: ['n3', 'n4', 'n5'] }],
}

const sumRow = (policyId, o) => ({
  source: 'sim', policyId, runs: 5, open: 0, runOver: 3, chapterClear: 2, reset: 0, avgLevel: 4.26, maxLevel: 6,
  avgVitaeEnd: 31.5, avgNodesResolved: 4, maxNodesResolved: 5, furthestNodeId: 'n5', ...o,
})

function reports({ summary, ends, pacing, coverage } = {}) {
  return {
    'run-summary': { report: 'run-summary', build: BUILD, source: 'sim', runs: 20, summary: summary ?? [
      { ...sumRow('human-row'), source: 'human', policyId: null },
      sumRow('rusher'), sumRow('cautious', { chapterClear: 4, runOver: 1, avgLevel: 5 }), sumRow('explorer', { open: 1 }), sumRow('reckless', { chapterClear: 0, runOver: 5 }),
    ] },
    'run-ends': { report: 'run-ends', build: BUILD, source: 'sim', runs: 20, ends: ends ?? [
      { source: 'sim', policyId: 'rusher', endNodeId: 'n3', runs: 1, runOver: 1, chapterClear: 0, avgLevel: 3, avgVitaeEnd: 0 },
      { source: 'sim', policyId: 'rusher', endNodeId: 'n5', runs: 4, runOver: 2, chapterClear: 2, avgLevel: 5, avgVitaeEnd: 12 },
    ] },
    'run-pacing': { report: 'run-pacing', build: BUILD, source: 'sim', runs: 20, pacing: pacing ?? [
      { source: 'sim', policyId: 'rusher', nodeId: 'n1', runs: 5, avgResolvedBefore: 0, avgLevel: 1, avgVitae: 40, rests: 0, withdrawals: 0 },
      { source: 'sim', policyId: 'rusher', nodeId: 'n2', runs: 5, avgResolvedBefore: 1, avgLevel: 2, avgVitae: 30.04, rests: 5, withdrawals: 0 },
      { source: 'sim', policyId: 'rusher', nodeId: 'n3', runs: 5, avgResolvedBefore: 2, avgLevel: 3, avgVitae: 25, rests: 0, withdrawals: 5 },
      { source: 'sim', policyId: 'rusher', nodeId: 'n4', runs: 3, avgResolvedBefore: 3, avgLevel: 4, avgVitae: 20, rests: 3, withdrawals: 0 },
    ] },
    coverage: { report: 'coverage', build: BUILD, source: 'sim', runs: 20, coverage: coverage ?? [
      { source: 'sim', policyId: 'rusher', kind: 'node', id: 'n1', runs: 5, count: 5, cleared: 5 },
      { source: 'sim', policyId: 'rusher', kind: 'node', id: 'n2', runs: 5, count: 5, cleared: 5 },
      { source: 'sim', policyId: 'rusher', kind: 'node', id: 'n3', runs: 5, count: 5, cleared: 4 },
      { source: 'sim', policyId: 'cautious', kind: 'node', id: 'n4', runs: 2, count: 2, cleared: 2 },
      { source: 'sim', policyId: 'rusher', kind: 'quest-step', id: 'q-main/1', runs: 5, count: 5, cleared: 5 },
      { source: 'sim', policyId: 'rusher', kind: 'enemy', id: 'rat', runs: 5, count: 9, cleared: 8 },
      { source: 'sim', policyId: 'rusher', kind: 'item', id: 'rope', runs: 2, count: 2, cleared: null },
      { source: 'sim', policyId: 'rusher', kind: 'node', id: 'not-in-the-chapter', runs: 1, count: 1, cleared: 1 },
      { source: 'human', policyId: null, kind: 'enemy', id: 'crab', runs: 1, count: 1, cleared: 1 },
    ] },
  }
}

/** A mocked Worker: an injected fetch that answers GET /v1/reports/<name> from the table. */
function worker(table = reports(), { status = 200, calls = [] } = {}) {
  const impl = async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization })
    if (status !== 200) return { ok: false, status, json: async () => ({}) }
    const name = new URL(url).pathname.split('/').pop()
    return { ok: true, status: 200, json: async () => table[name] }
  }
  impl.calls = calls
  return impl
}

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-report-'))
  return { dir, out: path.join(dir, 'sim'), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

const run = async (argv, extra = {}) => {
  const stdout = sink()
  const stderr = sink()
  const code = await main(argv, { env: ENV, envFile: '/nonexistent/env', fetchImpl: worker(), stdout, stderr, content: () => CONTENT, now: () => new Date('2026-11-10T04:00:00Z'), ...extra })
  return { code, stdout: stdout.text, stderr: stderr.text }
}

const SECTIONS = ['## Run health', '## Pacing', '## How hard is Chapter 1', '## Coverage', '## Since the last report']

test('parseArgs needs a build and refuses unknown flags', () => {
  assert.equal(parseArgs(['--build', 'abc']).build, 'abc')
  assert.equal(parseArgs(['--build=abc', '--seed', '3']).seed, 3)
  assert.throws(() => parseArgs([]), /--build/)
  assert.throws(() => parseArgs(['--build', 'abc', '--nope']), /unknown argument/)
  assert.throws(() => parseArgs(['--build', 'abc', '--date', 'today']), /YYYY-MM-DD/)
  assert.throws(() => parseArgs(['--build']), /needs a value/)
})

test('the first night writes the stamp, the five sections in order and one history line', async () => {
  const t = setup()
  try {
    const calls = []
    const r = await run(['--build', BUILD, '--out', t.out], { fetchImpl: worker(reports(), { calls }) })
    assert.equal(r.code, 0, r.stderr)
    // The four reads, each for the sim at the build, with the bearer token.
    assert.deepEqual(calls.map((c) => new URL(c.url).pathname).sort(), ['/v1/reports/coverage', '/v1/reports/run-ends', '/v1/reports/run-pacing', '/v1/reports/run-summary'])
    for (const c of calls) {
      assert.equal(new URL(c.url).searchParams.get('build'), BUILD)
      assert.equal(new URL(c.url).searchParams.get('source'), 'sim')
      assert.equal(c.auth, 'Bearer tkn')
    }
    const md = fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8')
    assert.match(md, /^<!-- Generated by scripts\/sim-report\.mjs/)
    assert.match(md, /^> measured at 01234567, 2026-11-10, 5 runs per persona, seed 1$/m)
    const at = SECTIONS.map((s) => md.indexOf(s))
    assert.ok(at.every((i) => i >= 0), 'every section is present')
    assert.deepEqual([...at].sort((a, b) => a - b), at, 'sections in the Design order')
    assert.equal(md.split('\n').filter((l) => l.startsWith('## ')).length, 5, 'five sections, no cards')
    assert.doesNotMatch(md, /card/i)
    assert.match(md, /First report/)
    const lines = fs.readFileSync(path.join(t.out, 'history.jsonl'), 'utf-8').trim().split('\n')
    assert.equal(lines.length, 1)
    const h = JSON.parse(lines[0])
    assert.equal(h.date, '2026-11-10')
    assert.equal(h.commit, BUILD)
    assert.equal(h.runsPerPersona, 5)
    assert.equal(h.seed, 1)
    assert.deepEqual(Object.keys(h.personas), ['cautious', 'reckless', 'explorer', 'rusher'])
    assert.deepEqual(h.personas.cautious, { runs: 5, chapterClear: 4, runOver: 1, open: 0, avgLevel: 5, avgVitaeEnd: 31.5, breaks: 0 })
    assert.equal(h.personas.rusher.avgLevel, 4.3)
    // reached: the universe's ids that some sim row touched, never a human row or an id off the chapter.
    assert.deepEqual(h.reached, { node: ['n1', 'n2', 'n3', 'n4'], quest: ['q-main/1'], enemy: ['rat'], hazard: [], item: ['rope'] })
  } finally { t.cleanup() }
})

test('run health, pacing, difficulty and coverage carry the numbers', async () => {
  const t = setup()
  try {
    assert.equal((await run(['--build', BUILD, '--out', t.out])).code, 0)
    const md = fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8')
    const health = md.slice(md.indexOf('## Run health'), md.indexOf('## Pacing'))
    assert.match(health, /\| explorer \| 5 \| 4 \| 1 \| 0 \|/)
    assert.match(health, /None\./)
    const pacing = md.slice(md.indexOf('## Pacing'), md.indexOf('## How hard'))
    assert.ok(pacing.indexOf('### cautious') < pacing.indexOf('### rusher'), 'personas in their fixed order')
    // Where runs ended, most first.
    assert.ok(pacing.indexOf('| n5 | 4 ') < pacing.indexOf('| n3 | 1 '))
    // Region 0: n1+n2 resolved 10 over 5 runs = 2; last node n2 gives level 2, VITAE 30; 5 rests over 5 runs = 1.
    assert.match(pacing, /\| 0 \| 2 \| 2 \| 2 \| 30 \| 1 \| 0 \|/)
    // Region 1: n3 resolved 4 over 5 runs = 0.8; the last node on average is n4 (level 4, VITAE 20).
    assert.match(pacing, /\| 1 \| 3 \| 0\.8 \| 4 \| 20 \| 0\.6 \| 1 \|/)
    const hard = md.slice(md.indexOf('## How hard'), md.indexOf('## Coverage'))
    assert.match(hard, /\| cautious \| 5 \| 4 \| 80% \| 5 \| 31\.5 \|/)
    assert.match(hard, /\| reckless \| 5 \| 0 \| 0% \|/)
    const cov = md.slice(md.indexOf('## Coverage'), md.indexOf('## Since'))
    assert.match(cov, /\| nodes \| 5 \| 4 \| 80% \| 4 \|/)
    assert.match(cov, /- nodes: `n5`/)
    assert.match(cov, /- hazards: `tide`/)
    assert.match(cov, /- enemies: `crab`/)
  } finally { t.cleanup() }
})

test('a second night sets this line against the last and finds what no night reached', async () => {
  const t = setup()
  try {
    fs.mkdirSync(t.out, { recursive: true })
    const prev = {
      date: '2026-11-09', commit: 'fedcba9876543210', runsPerPersona: 5, seed: 1,
      personas: { rusher: { runs: 5, chapterClear: 1, runOver: 4, open: 0, avgLevel: 3, avgVitaeEnd: 10, breaks: 2 } },
      reached: { node: ['n5'], quest: ['q-main/2'], enemy: ['crab'], hazard: ['tide'], item: [] },
    }
    fs.writeFileSync(path.join(t.out, 'history.jsonl'), `${JSON.stringify(prev)}\n`)
    assert.equal((await run(['--build', BUILD, '--out', t.out])).code, 0)
    const md = fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8')
    const since = md.slice(md.indexOf('## Since the last report'))
    assert.match(since, /Last line: 2026-11-09 at fedcba98; this report: 2026-11-10 at 01234567\./)
    assert.match(since, /\| rusher \| 20% to 40% \| 3 to 4\.3 \| 10 to 31\.5 \| 2 to 0 \|/)
    assert.match(since, /\| cautious \| - to 80% /)
    // The earlier night reached n5, the second quest step and the crab, so only the lamp is left unreached.
    const cov = md.slice(md.indexOf('## Coverage'), md.indexOf('## Since'))
    assert.match(cov, /Not reached tonight/)
    const ever = cov.slice(cov.indexOf('Not reached on any night on record'))
    assert.match(ever, /2 nights counting tonight/)
    assert.match(ever, /- nodes: none/)
    assert.match(ever, /- quest steps: none/)
    assert.match(ever, /- enemies: none/)
    assert.match(ever, /- hazards: none/)
    assert.match(ever, /- items: `lamp`/)
    const lines = fs.readFileSync(path.join(t.out, 'history.jsonl'), 'utf-8').trim().split('\n')
    assert.equal(lines.length, 2, 'append-only: the earlier line stays')
    assert.deepEqual(JSON.parse(lines[0]), prev)
  } finally { t.cleanup() }
})

test('breaks are listed once per key with their issue link, and counted per persona', async () => {
  const t = setup()
  try {
    const file = path.join(t.dir, 'breaks.jsonl')
    const brk = (persona, kind, node, seed) => ({ key: `${persona}:breakwater/${node}:${kind}`, kind, persona, characterId: 'the-chosen', seed, buildCommit: BUILD, message: 'm', state: { map: 'breakwater', node } })
    fs.writeFileSync(file, [brk('rusher', 'stuck', 'n3', 2), brk('rusher', 'stuck', 'n3', 4), brk('cautious', 'node-unresolved', 'n2', 1), brk('explorer', 'crash', 'n1', 3), brk('reckless', 'fight-stuck', 'n4', 5)].map((b) => JSON.stringify(b)).join('\n') + '\n')
    const issue = (number, state, extra = {}) => ({ number, state, html_url: `https://github.test/i/${number}`, created_at: '2026-11-10T03:50:00Z', body: '', ...extra })
    const byKey = {
      'rusher:breakwater/n3:stuck': issue(7, 'open'),
      'cautious:breakwater/n2:node-unresolved': issue(5, 'open', { created_at: '2026-11-01T00:00:00Z' }),
      'explorer:breakwater/n1:crash': issue(6, 'open', { created_at: '2026-11-01T00:00:00Z', state_reason: 'reopened' }),
    }
    const gh = (args) => {
      assert.ok(args[1].includes('labels=sim-break'))
      return { status: 0, stderr: '', stdout: JSON.stringify(Object.entries(byKey).map(([key, i]) => ({ ...i, body: `<!-- sim-break-key: ${key} -->` }))) }
    }
    const r = await run(['--build', BUILD, '--out', t.out, '--breaks', file, '--repo', 'o/r'], { gh })
    assert.equal(r.code, 0, r.stderr)
    const md = fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8')
    assert.match(md, /\| rusher \| 5 \| 5 \| 0 \| 2 \|/, 'a persona\'s break count is every break line')
    assert.match(md, /\| `rusher:breakwater\/n3:stuck` \| stuck \| rusher \| breakwater\/n3 \| 2 \| \[#7\]\(https:\/\/github\.test\/i\/7\) new \|/)
    assert.equal(md.split('rusher:breakwater/n3:stuck').length, 2, 'one row per key')
    assert.match(md, /\[#5\]\(https:\/\/github\.test\/i\/5\) already open/)
    assert.match(md, /\[#6\]\(https:\/\/github\.test\/i\/6\) reopened/)
    assert.match(md, /fight-stuck \| reckless \| breakwater\/n4 \| 5 \| no issue found/)
    const h = JSON.parse(fs.readFileSync(path.join(t.out, 'history.jsonl'), 'utf-8').trim())
    assert.equal(h.personas.rusher.breaks, 2)
    assert.equal(h.personas.cautious.breaks, 1)
  } finally { t.cleanup() }
})

test('a failed issue lookup keeps the report and drops the links', async () => {
  const t = setup()
  try {
    const file = path.join(t.dir, 'breaks.jsonl')
    fs.writeFileSync(file, `${JSON.stringify({ key: 'rusher:breakwater/n3:stuck', kind: 'stuck', persona: 'rusher', seed: 2, state: { map: 'breakwater', node: 'n3' } })}\n`)
    const r = await run(['--build', BUILD, '--out', t.out, '--breaks', file, '--repo', 'o/r'], { gh: () => ({ status: 1, stderr: 'boom', stdout: '' }) })
    assert.equal(r.code, 0)
    assert.match(r.stderr, /issue lookup failed/)
    assert.match(fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8'), /not looked up/)
  } finally { t.cleanup() }
})

test('a missing breaks file is a night with no breaks', async () => {
  const t = setup()
  try {
    const r = await run(['--build', BUILD, '--out', t.out, '--breaks', path.join(t.dir, 'absent.jsonl')])
    assert.equal(r.code, 0)
    assert.match(fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8'), /Breaks of the night:\n\nNone\./)
  } finally { t.cleanup() }
})

test('a build with no sim rows still reports, with an empty history entry', async () => {
  const t = setup()
  try {
    const empty = reports({ summary: [], ends: [], pacing: [], coverage: [] })
    const r = await run(['--build', BUILD, '--out', t.out], { fetchImpl: worker(empty) })
    assert.equal(r.code, 0)
    const md = fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8')
    assert.match(md, /0 runs per persona/)
    assert.match(md, /No sim runs at this build reached the Worker\./)
    const h = JSON.parse(fs.readFileSync(path.join(t.out, 'history.jsonl'), 'utf-8').trim())
    assert.deepEqual(h.personas, {})
    assert.deepEqual(h.reached.node, [])
  } finally { t.cleanup() }
})

for (const [label, fetchImpl, expected] of [
  ['a refused read (401)', worker(reports(), { status: 401 }), /returned 401 \(check PUZZLE_API_TOKEN\)/],
  ['a server error (500)', worker(reports(), { status: 500 }), /returned 500/],
  ['an unreachable Worker', async () => { throw new Error('ECONNREFUSED') }, /could not reach/],
  ['a body that is not the report', worker({ ...reports(), coverage: { report: 'run-ends' } }), /is not a coverage report/],
]) {
  test(`${label} exits 1 and writes nothing`, async () => {
    const t = setup()
    try {
      fs.mkdirSync(t.out, { recursive: true })
      fs.writeFileSync(path.join(t.out, 'latest.md'), 'old')
      const r = await run(['--build', BUILD, '--out', t.out], { fetchImpl })
      assert.equal(r.code, 1)
      assert.match(r.stderr, expected)
      assert.equal(fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8'), 'old')
      assert.equal(fs.existsSync(path.join(t.out, 'history.jsonl')), false)
    } finally { t.cleanup() }
  })
}

test('a content failure exits 1 and writes nothing', async () => {
  const t = setup()
  try {
    const r = await run(['--build', BUILD, '--out', t.out], { content: () => { throw new Error('chapter1-content failed: exit 1') } })
    assert.equal(r.code, 1)
    assert.match(r.stderr, /chapter1-content failed/)
    assert.equal(fs.existsSync(t.out), false)
  } finally { t.cleanup() }
})

test('a missing URL or token exits 2, names it, never prints a value, and writes nothing', async () => {
  const t = setup()
  try {
    const calls = []
    const r = await run(['--build', BUILD, '--out', t.out], { env: { PUZZLE_API_URL: ' ' }, fetchImpl: worker(reports(), { calls }) })
    assert.equal(r.code, 2)
    assert.match(r.stderr, /PUZZLE_API_URL and PUZZLE_API_TOKEN are not set/)
    assert.equal(calls.length, 0)
    assert.equal(fs.existsSync(t.out), false)
    const bad = await run(['--out', t.out])
    assert.equal(bad.code, 2)
    assert.match(bad.stderr, /--build/)
  } finally { t.cleanup() }
})

test('the token goes only in the Authorization header and is never printed', async () => {
  const t = setup()
  try {
    const r = await run(['--build', BUILD, '--out', t.out])
    assert.equal(r.code, 0)
    assert.ok(!r.stdout.includes('tkn') && !r.stderr.includes('tkn'))
    assert.ok(!fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8').includes('tkn'))
  } finally { t.cleanup() }
})

test('end to end against a local HTTP server standing in for the Worker', async () => {
  const t = setup()
  const table = reports()
  const seen = []
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    seen.push({ path: url.pathname, auth: req.headers.authorization, query: url.search })
    const body = table[url.pathname.split('/').pop()]
    res.writeHead(body ? 200 : 404, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body ?? {}))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const url = `http://127.0.0.1:${server.address().port}`
    const stdout = sink()
    const stderr = sink()
    const code = await main(['--build', BUILD, '--out', t.out, '--date', '2026-11-10'], {
      env: { PUZZLE_API_URL: `${url}/`, PUZZLE_API_TOKEN: 'tkn' }, envFile: '/nonexistent/env', stdout, stderr, content: () => CONTENT,
    })
    assert.equal(code, 0, stderr.text)
    assert.equal(seen.length, 4)
    assert.ok(seen.every((s) => s.auth === 'Bearer tkn' && s.query === `?build=${BUILD}&source=sim`))
    assert.ok(fs.existsSync(path.join(t.out, 'latest.md')))
    assert.match(stdout.text, /wrote .*latest\.md and appended one line/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    t.cleanup()
  }
})

test('readBreakLines rejects a line that is not a break', () => {
  const read = () => '{"nope":1}\n'
  assert.throws(() => readBreakLines('f', { read, exists: () => true }), /not a break line/)
  assert.deepEqual(readBreakLines(null), [])
})

test('the pure helpers agree with the rendered numbers', () => {
  const t = reports()
  const f = buildFacts({ build: BUILD, date: '2026-11-10', seed: 1, runSummary: t['run-summary'], runEnds: t['run-ends'], runPacing: t['run-pacing'], coverage: t.coverage, content: CONTENT, breaks: [] })
  assert.deepEqual(f.ids, ['cautious', 'reckless', 'explorer', 'rusher'])
  assert.deepEqual(universeOf(CONTENT).quest, ['q-main/1', 'q-main/2'])
  assert.equal(regionPacing(f, 'rusher')[1].resolved, 0.8)
  assert.equal(historyLine(f).runsPerPersona, 5)
})

// The report job's shape in sim-runs.yml: it follows the batch whatever its result, only on the
// scheduled run and a dispatch at main, and commits through measured-truth's push path.
test('sim-runs.yml has a report job on measured-truth\'s push path', () => {
  const text = fs.readFileSync(new URL('../.github/workflows/sim-runs.yml', import.meta.url), 'utf-8')
  const job = text.slice(text.indexOf('\n  report:'))
  assert.ok(job.length > 0, 'a report job')
  assert.match(job, /needs: sim\b/)
  // The whole condition, so a clause dropped from it (the sha, the main-only dispatch) fails here.
  assert.ok(
    job.includes(
      "    if: always() && needs.sim.result != 'skipped' && needs.sim.outputs.sha != '' && (github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && github.ref_name == 'main' && (inputs.ref || 'main') == 'main'))\n",
    ),
    'the report job runs only on the schedule or a dispatch run at main on main, and only with a sha',
  )
  assert.match(job, /permissions:\n\s+contents: write/)
  assert.match(job, /group: nexus-loop/)
  assert.match(job, /GH_PAT \|\| github\.token/)
  assert.match(job, /npm run sim:report -- --build "\$SIM_SHA"/)
  assert.match(job, /git add -- docs\/reports\/sim\//)
  assert.match(job, /GIT_AUTHOR_NAME: claude\[bot\]/)
  assert.match(job, /for delay in 2 4 8 16/)
  assert.match(job, /git pull --rebase origin/)
  // Only the report job writes; the batch job stays read-only.
  assert.doesNotMatch(text.slice(0, text.indexOf('\n  report:')), /contents: write/)
})

// The pieces the report job leans on across jobs: the sha the batch records, the artifact the breaks ride in, and
// what the push does when a report queued behind another one conflicts.
test('sim-runs.yml hands the sha and the breaks file from the batch to the report, and resolves a report conflict', () => {
  const text = fs.readFileSync(new URL('../.github/workflows/sim-runs.yml', import.meta.url), 'utf-8')
  const sim = text.slice(0, text.indexOf('\n  report:'))
  const job = text.slice(text.indexOf('\n  report:'))
  // The sha: recorded by a step with the id the output reads, passed on as SIM_SHA.
  assert.match(sim, /outputs:\n      sha: \$\{\{ steps\.sha\.outputs\.sha \}\}/)
  assert.match(sim, /- name: Record the sha the bots play\n        id: sha\n        run: echo "sha=\$\(git rev-parse HEAD\)" >> "\$GITHUB_OUTPUT"/)
  assert.match(job, /SIM_SHA: \$\{\{ needs\.sim\.outputs\.sha \}\}/)
  // The breaks: uploaded as `sim-breaks` from one file, downloaded by the same name into the directory the step reads.
  assert.match(sim, /uses: actions\/upload-artifact@v4\n        with:\n          name: sim-breaks\n          path: \$\{\{ runner\.temp \}\}\/sim-breaks\.jsonl\n/)
  assert.match(job, /uses: actions\/download-artifact@v4\n        with:\n          name: sim-breaks\n          path: \$\{\{ runner\.temp \}\}\/sim-breaks\n/)
  assert.match(job, /\[ -f "\$RUNNER_TEMP\/sim-breaks\/sim-breaks\.jsonl" \] && breaks="--breaks \$RUNNER_TEMP\/sim-breaks\/sim-breaks\.jsonl"/)
  assert.match(job, /name: Fetch the night's breaks\n        continue-on-error: true/, 'a night with no breaks has no artifact and still reports')
  // The conflict handler: history keeps main's lines plus this run's last, latest.md is this run's, anything else gives up.
  const resolve = job.slice(job.indexOf('resolve_report() {'), job.indexOf('for delay in'))
  assert.match(resolve, /docs\/reports\/sim\/history\.jsonl\)\n\s+\{ git show ":2:\$f"; git show ":3:\$f" \| tail -n 1; \} > "\$f" ;;/)
  assert.match(resolve, /docs\/reports\/sim\/latest\.md\)\n\s+git show ":3:\$f" > "\$f" ;;/)
  assert.match(resolve, /\*\) return 1 ;;/)
  assert.match(resolve, /GIT_EDITOR=true git rebase --continue/)
  assert.match(job, /git pull --rebase origin "\$branch" \|\| resolve_report/)
})

test('a break whose issue was closed links it as closed, and as not planned when it was', async () => {
  const t = setup()
  try {
    const file = path.join(t.dir, 'breaks.jsonl')
    const brk = (node, seed) => ({ key: `rusher:breakwater/${node}:stuck`, kind: 'stuck', persona: 'rusher', characterId: 'the-chosen', seed, buildCommit: BUILD, message: 'm', state: { map: 'breakwater', node } })
    fs.writeFileSync(file, [brk('n3', 2), brk('n4', 3)].map((b) => JSON.stringify(b)).join('\n') + '\n')
    const issue = (number, state_reason) => ({ number, state: 'closed', state_reason, html_url: `https://github.test/i/${number}`, created_at: '2026-11-01T00:00:00Z' })
    const byKey = { 'rusher:breakwater/n3:stuck': issue(8, 'completed'), 'rusher:breakwater/n4:stuck': issue(9, 'not_planned') }
    const gh = () => ({ status: 0, stderr: '', stdout: JSON.stringify(Object.entries(byKey).map(([key, i]) => ({ ...i, body: `<!-- sim-break-key: ${key} -->` }))) })
    const r = await run(['--build', BUILD, '--out', t.out, '--breaks', file, '--repo', 'o/r'], { gh })
    assert.equal(r.code, 0, r.stderr)
    const md = fs.readFileSync(path.join(t.out, 'latest.md'), 'utf-8')
    assert.match(md, /\[#8\]\(https:\/\/github\.test\/i\/8\) closed \|/)
    assert.match(md, /\[#9\]\(https:\/\/github\.test\/i\/9\) closed as not planned \|/)
  } finally { t.cleanup() }
})
