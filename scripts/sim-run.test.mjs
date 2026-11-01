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

import { POST_BATCH_CAP_BYTES, batchIdOf, checkedOutSha, formatLanes, formatRunLine, main, parseArgs, playRuns, rowsOf, sendRuns, tally } from './sim-run.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'sim-runs.json'), 'utf-8'))

const sink = () => {
  const s = { text: '', write: (chunk) => { s.text += chunk } }
  return s
}

test('parseArgs reads both flag shapes and defaults', () => {
  assert.deepEqual(parseArgs([]), { policy: 'wanderer', runs: 1, seed: 1, json: false, post: false, help: false })
  assert.deepEqual(parseArgs(['--policy', 'wanderer', '--runs', '3', '--seed', '0', '--json']),
    { policy: 'wanderer', runs: 3, seed: 0, json: true, post: false, help: false })
  assert.deepEqual(parseArgs(['--policy=wanderer', '--runs=2', '--seed=7', '--post']),
    { policy: 'wanderer', runs: 2, seed: 7, json: false, post: true, help: false })
})

test('parseArgs refuses unknown flags, missing values and bad numbers', () => {
  assert.throws(() => parseArgs(['--posts']), /unknown argument/)
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

test('main prints one line per run and exits 1 when a run stuck', async () => {
  const stdout = sink()
  const asked = []
  const code = await main(['--runs', '3'], { stdout, stderr: sink(), play: (opts) => { asked.push(opts); return FIXTURE } })
  assert.equal(code, 1)
  assert.equal(stdout.text.trim().split('\n').length, 3)
  assert.equal(asked[0].runs, 3)
})

test('main exits 0 when every run ended, and --json prints the runs', async () => {
  const clean = { policy: 'wanderer', runs: FIXTURE.runs.slice(0, 2) }
  const stdout = sink()
  assert.equal(await main(['--json'], { stdout, stderr: sink(), play: () => clean }), 0)
  assert.equal(JSON.parse(stdout.text).length, 2)
})

test('main reports a bad flag with usage (exit 2) and a driver crash (exit 1)', async () => {
  const stderr = sink()
  assert.equal(await main(['--nope'], { stdout: sink(), stderr, play: () => FIXTURE }), 2)
  assert.match(stderr.text, /usage: npm run sim:run/)
  const crashed = sink()
  assert.equal(await main([], { stdout: sink(), stderr: crashed, play: () => { throw new Error('boom') } }), 1)
  assert.match(crashed.text, /boom/)
})

test('playRuns spawns jest on the sim config with the request and an output file in the env', () => {
  const calls = []
  const spawn = (cmd, args, opts) => {
    calls.push({ cmd, args, opts })
    fs.writeFileSync(opts.env.SIM_RUN_OUT, JSON.stringify({ policy: 'wanderer', runs: [] }))
    return { status: 0, stdout: '', stderr: '' }
  }
  const post = { batchId: 'b1', buildCommit: null }
  assert.deepEqual(playRuns({ policy: 'defender', runs: 4, seed: 9, post }, { spawn }), { policy: 'wanderer', runs: [] })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].cmd, process.execPath)
  assert.deepEqual(calls[0].args.slice(1), ['-c', 'sim/jest.config.js', '--silent', '--runInBand'])
  assert.match(calls[0].args[0], /jest/)
  assert.match(calls[0].opts.cwd, /axiomancer-mobile$/)
  assert.deepEqual(JSON.parse(calls[0].opts.env.SIM_RUN_ARGS), { policy: 'defender', runs: 4, seed: 9, post })
  assert.match(calls[0].opts.env.SIM_RUN_OUT, /runs\.json$/)
  assert.equal(fs.existsSync(calls[0].opts.env.SIM_RUN_OUT), false, 'the temp file is removed')
  // Without --post the request carries no post key.
  playRuns({ policy: 'wanderer', runs: 1, seed: 1 }, { spawn })
  assert.deepEqual(JSON.parse(calls[1].opts.env.SIM_RUN_ARGS), { policy: 'wanderer', runs: 1, seed: 1 })
  assert.throws(() => playRuns({ policy: 'wanderer', runs: 1, seed: 1 }, { spawn: () => ({ status: 1, stdout: 'out', stderr: 'err' }) }), /exit 1/)
})

/** Two collected runs: an open, a fight with 3 events' worth of rows aside, a run-events batch of 2, a close. */
const POSTED = [1, 2].map((seed) => ({
  policy: 'defender',
  seed,
  runKey: `sim-9-1-defender-${seed}`,
  posts: [
    { path: '/v1/play-runs', body: JSON.stringify({ runId: `sim-9-1-defender-${seed}`, source: 'sim' }) },
    { path: '/v1/fights', body: JSON.stringify({ runId: `sim-9-1-defender-${seed}`, source: 'sim' }) },
    { path: '/v1/run-events', body: JSON.stringify({ runId: `sim-9-1-defender-${seed}`, source: 'sim', events: [{ seq: 0 }, { seq: 1 }] }) },
    { path: `/v1/play-runs/sim-9-1-defender-${seed}/end`, body: JSON.stringify({ outcome: 'run-over' }) },
  ],
}))
const WITH_POSTS = { policy: 'defender', runs: FIXTURE.runs.slice(0, 2), posts: POSTED }

test('rowsOf counts a run-events batch by its events and a close as no new row', () => {
  assert.equal(rowsOf(POSTED[0].posts[0]), 1)
  assert.equal(rowsOf(POSTED[0].posts[2]), 2)
  assert.equal(rowsOf(POSTED[0].posts[3]), 0)
  const t = tally(POSTED)
  assert.equal(t.runs, 2)
  assert.equal(t.rows, 2 * (1 + 1 + 2))
  assert.equal(t.requests, 8)
  assert.equal(t.bytes, POSTED.flatMap((r) => r.posts).reduce((n, p) => n + Buffer.byteLength(p.body), 0))
})

test('batchIdOf is the Actions run and attempt, else a local id; checkedOutSha reads git, not GITHUB_SHA', () => {
  assert.equal(batchIdOf({ GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2' }), '123-2')
  assert.equal(batchIdOf({ GITHUB_RUN_ID: '123' }), '123-1')
  assert.equal(batchIdOf({}, () => 36), 'local-10')
  const sha = 'b'.repeat(40)
  assert.equal(checkedOutSha({ spawn: () => ({ status: 0, stdout: `${sha}\n` }) }), sha)
  assert.equal(checkedOutSha({ spawn: () => ({ status: 128, stdout: '' }) }), null)
  assert.equal(checkedOutSha({ spawn: () => ({ status: 0, stdout: 'not a sha' }) }), null)
})

test('--post without PUZZLE_API_URL and PUZZLE_API_TOKEN prints what it would post and sends nothing', async () => {
  const stdout = sink()
  let fetched = 0
  const asked = []
  const code = await main(['--policy', 'defender', '--runs', '2', '--post'], {
    stdout, stderr: sink(), env: { PUZZLE_API_URL: 'https://api.example' }, sha: () => 'c'.repeat(40),
    play: (opts) => { asked.push(opts); return WITH_POSTS }, fetchImpl: async () => { fetched++; return { ok: true, status: 200 } },
  })
  assert.equal(code, 0)
  assert.equal(fetched, 0)
  assert.deepEqual(asked[0].post, { batchId: asked[0].post.batchId, buildCommit: 'c'.repeat(40) })
  assert.match(stdout.text, /would post 2 runs, 8 rows, \d+ bytes .* in 8 requests as source sim/)
  assert.match(stdout.text, /Nothing sent/)
})

test('--post with the env sends every request in order, run by run, with the bearer token, and reports rows and bytes', async () => {
  const stdout = sink()
  const calls = []
  const code = await main(['--post'], {
    stdout, stderr: sink(), env: { PUZZLE_API_URL: 'https://api.example/', PUZZLE_API_TOKEN: 'sekrit', GITHUB_RUN_ID: '77' }, sha: () => null,
    play: () => WITH_POSTS,
    fetchImpl: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200 } },
  })
  assert.equal(code, 0)
  assert.deepEqual(calls.map((c) => c.url.replace('https://api.example', '')), POSTED.flatMap((r) => r.posts.map((p) => p.path)))
  assert.ok(calls.every((c) => c.init.method === 'POST' && c.init.headers.Authorization === 'Bearer sekrit'))
  assert.equal(JSON.parse(calls[0].init.body).source, 'sim')
  assert.match(stdout.text, /posted 2 runs, 8 rows, \d+ bytes .* in 8 requests as source sim \(batch 77-1\)/)
})

test('a refused post exits 1, skips the rest of that run, and still sends the next run', async () => {
  const stderr = sink()
  const urls = []
  const code = await main(['--post'], {
    stdout: sink(), stderr, env: { PUZZLE_API_URL: 'https://api.example', PUZZLE_API_TOKEN: 't' }, sha: () => null,
    play: () => WITH_POSTS,
    fetchImpl: async (url) => { urls.push(url); return url.endsWith('/v1/fights') && urls.length < 4 ? { ok: false, status: 401 } : { ok: true, status: 200 } },
  })
  assert.equal(code, 1)
  assert.match(stderr.text, /refused: \/v1\/fights -> HTTP 401/)
  // Run 1: open, fight (refused). Run 2: all four.
  assert.equal(urls.length, 6)
  const thrown = sink()
  assert.equal(await main(['--post'], {
    stdout: sink(), stderr: thrown, env: { PUZZLE_API_URL: 'https://api.example', PUZZLE_API_TOKEN: 't' }, sha: () => null,
    play: () => WITH_POSTS, fetchImpl: async () => { throw new Error('offline') },
  }), 1)
  assert.match(thrown.text, /offline/)
})

test('the batch cap stops sending before the run that would pass it', async () => {
  const runBytes = POSTED[0].posts.reduce((n, p) => n + Buffer.byteLength(p.body), 0)
  const stderr = sink()
  const urls = []
  const { sent, capped } = await sendRuns(POSTED, { url: 'https://api.example', token: 't' }, {
    cap: runBytes + 1, stderr, fetchImpl: async (url) => { urls.push(url); return { ok: true, status: 200 } },
  })
  assert.equal(capped, true)
  assert.equal(sent.length, 1)
  assert.equal(urls.length, 4, 'the second run sent nothing, not even its open')
  assert.match(stderr.text, /stopped before sim-9-1-defender-2: .* batch cap/)
  assert.equal(POST_BATCH_CAP_BYTES, 25 * 1024 * 1024)
  const code = await main(['--post'], {
    stdout: sink(), stderr: sink(), env: { PUZZLE_API_URL: 'https://api.example', PUZZLE_API_TOKEN: 't' }, sha: () => null,
    play: () => ({ ...WITH_POSTS, posts: [{ ...POSTED[0], posts: [{ path: '/v1/fights', body: 'x'.repeat(POST_BATCH_CAP_BYTES + 1) }] }] }),
    fetchImpl: async () => { throw new Error('must not send') },
  })
  assert.equal(code, 1)
})
