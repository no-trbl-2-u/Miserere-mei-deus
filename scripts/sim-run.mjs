#!/usr/bin/env node
// scripts/sim-run.mjs
//
// The headless run sim (phase SM1e, A10). Plays whole Chapter 1 runs through
// the app's own store actions (`axiomancer-mobile/sim/`), one per seed, as a
// run policy decides, and prints one line per run: the policy, the seed, the
// outcome, the furthest node, level, VITAE at the end, fights won, lost and
// spared, and the end deck's card count per lane. It posts nothing.
//
// The driver runs under jest (`axiomancer-mobile/sim/jest.config.js`, the
// app's own preset and module mapping) and hands its runs back as JSON; this
// script prints them. A run that sticks (a step with no legal move: the
// driver's bug detector) prints as STUCK with the node and the state, and the
// script exits 1 after printing every run. A measurement, not a gate:
// nothing here judges a number.
//
// `--post` (phase SM1g) also sends each finished run to the Worker, stamped
// `sim`: the driver plays it through the app's own posters, which collect the
// requests (`axiomancer-mobile/sim/run-post.ts`), and this script sends them
// run by run, the run's open first and its close last. It reads
// PUZZLE_API_URL and PUZZLE_API_TOKEN from the environment; without them it
// prints what it would post and sends nothing. It stops before a run that
// would take the batch past 25 MB, and exits 1 if a post is refused.
//
// Usage:
//   npm run sim:run -- --policy wanderer --runs 3 --seed 1
//   npm run sim:run -- --policy wanderer --runs 3 --seed 1 --json
//   npm run sim:run -- --policy blood-price --runs 5 --post

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MOBILE = path.join(ROOT, 'axiomancer-mobile')

export const USAGE = 'usage: npm run sim:run -- --policy <id> [--runs <n>] [--seed <s>] [--json] [--post]'

/** One batch posts at most this many bytes (A13). */
export const POST_BATCH_CAP_BYTES = 25 * 1024 * 1024

/** Parse `--key value` / `--key=value` flags. Throws on anything it does not know. */
export function parseArgs(argv) {
  const opts = { policy: 'wanderer', runs: 1, seed: 1, json: false, post: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') { opts.json = true; continue }
    if (arg === '--post') { opts.post = true; continue }
    if (arg === '--help' || arg === '-h') { opts.help = true; continue }
    const m = /^--(policy|runs|seed)(?:=(.*))?$/.exec(arg)
    if (!m) throw new Error(`unknown argument '${arg}'`)
    const value = m[2] ?? argv[++i]
    if (value === undefined || value === '') throw new Error(`--${m[1]} needs a value`)
    if (m[1] === 'policy') { opts.policy = value; continue }
    const n = Number(value)
    if (!Number.isInteger(n) || (m[1] === 'runs' ? n < 1 : n < 0)) throw new Error(`--${m[1]} must be a ${m[1] === 'runs' ? 'positive' : 'non-negative'} integer, not '${value}'`)
    opts[m[1]] = n
  }
  return opts
}

/** The lane counts as `lane=n`, largest first, ties by lane id. */
export function formatLanes(deckByLane) {
  return Object.entries(deckByLane)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([lane, n]) => `${lane}=${n}`)
    .join(' ')
}

/** One run as one line. */
export function formatRunLine(run) {
  if (run.stuck) return `${run.policy} seed=${run.seed} STUCK at ${run.node}: ${run.error}`
  const f = run.fights
  return [
    `${run.policy} seed=${run.seed}`,
    run.outcome,
    `furthest=${run.furthestNodeId}`,
    `level=${run.level}`,
    `vitae=${run.vitae}/${run.maxVitae}`,
    `fights won=${f.won} lost=${f.lost} spared=${f.spared}`,
    `deck ${formatLanes(run.deckByLane)}`,
  ].join(' | ')
}

/** Run the driver under jest; returns `{ runs }` or throws with jest's output. */
export function playRuns(opts, { spawn = spawnSync } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'sim-run-'))
  const out = path.join(dir, 'runs.json')
  try {
    const jest = createRequire(path.join(MOBILE, 'package.json')).resolve('jest/bin/jest')
    const res = spawn(process.execPath, [jest, '-c', 'sim/jest.config.js', '--silent', '--runInBand'], {
      cwd: MOBILE,
      env: { ...process.env, SIM_RUN_ARGS: JSON.stringify({ policy: opts.policy, runs: opts.runs, seed: opts.seed, ...(opts.post ? { post: opts.post } : {}) }), SIM_RUN_OUT: out },
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
    })
    if (res.status !== 0) throw new Error(`the run driver failed (exit ${res.status}):\n${res.stdout ?? ''}${res.stderr ?? ''}`)
    return JSON.parse(readFileSync(out, 'utf-8'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** The batch every row of this invocation shares as its session id: the Actions run (and attempt), or a local id. */
export function batchIdOf(env, now = Date.now) {
  if (env.GITHUB_RUN_ID) return `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT || 1}`
  return `local-${now().toString(36)}`
}

/** The checked-out commit, or null when git cannot say. `GITHUB_SHA` is not used: a `workflow_run` reports main's. */
export function checkedOutSha({ spawn = spawnSync } = {}) {
  const res = spawn('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' })
  const sha = res.status === 0 ? String(res.stdout).trim() : ''
  return /^[0-9a-f]{40}$/.test(sha) ? sha : null
}

/** The rows one collected request adds (a close updates a row, a run-events batch adds its events). */
export function rowsOf(post) {
  if (/^\/v1\/play-runs\/.+\/end$/.test(post.path)) return 0
  if (post.path === '/v1/run-events') return JSON.parse(post.body).events.length
  return 1
}

/** What a posted batch comes to. */
export function tally(runs) {
  let rows = 0
  let bytes = 0
  let requests = 0
  for (const run of runs) {
    for (const post of run.posts) {
      rows += rowsOf(post)
      bytes += Buffer.byteLength(post.body)
      requests += 1
    }
  }
  return { runs: runs.length, rows, bytes, requests }
}

function megabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function summaryLine(t) {
  return `${t.runs} runs, ${t.rows} rows, ${t.bytes} bytes (${megabytes(t.bytes)}) in ${t.requests} requests`
}

/**
 * Send the collected runs, one run at a time, in order. A run goes out whole or
 * not at all as far as the cap goes: before a run that would take the batch past
 * `cap`, sending stops. A refused or failed request skips the rest of its run.
 *
 * @returns `{ sent, refused, capped }`: what was sent, the refusals, and whether the cap stopped it.
 */
export async function sendRuns(runs, config, { fetchImpl = fetch, cap = POST_BATCH_CAP_BYTES, stderr = process.stderr } = {}) {
  const origin = config.url.replace(/\/+$/, '')
  const sent = []
  const refused = []
  let bytes = 0
  let capped = false
  for (const run of runs) {
    const runBytes = run.posts.reduce((n, p) => n + Buffer.byteLength(p.body), 0)
    if (bytes + runBytes > cap) {
      capped = true
      stderr.write(`sim-run: stopped before ${run.runKey}: posting it would pass the ${megabytes(cap)} batch cap (${bytes} bytes posted)\n`)
      break
    }
    let ok = true
    const posted = []
    for (const post of run.posts) {
      try {
        const res = await fetchImpl(`${origin}${post.path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
          body: post.body,
        })
        if (!res.ok) {
          refused.push(`${post.path} -> HTTP ${res.status}`)
          ok = false
        }
      } catch (err) {
        refused.push(`${post.path} -> ${err.message}`)
        ok = false
      }
      if (!ok) break
      posted.push(post)
    }
    bytes += posted.reduce((n, p) => n + Buffer.byteLength(p.body), 0)
    sent.push({ ...run, posts: posted })
  }
  return { sent, refused, capped }
}

/**
 * Run the CLI. Returns the exit code; writes to the given streams.
 * Async since `--post` sends over the network.
 */
export async function main(argv, {
  stdout = process.stdout,
  stderr = process.stderr,
  play = playRuns,
  env = process.env,
  fetchImpl = fetch,
  sha = checkedOutSha,
  now = Date.now,
} = {}) {
  let opts
  try {
    opts = parseArgs(argv)
  } catch (err) {
    stderr.write(`sim-run: ${err.message}\n${USAGE}\n`)
    return 2
  }
  if (opts.help) {
    stdout.write(`${USAGE}\n`)
    return 0
  }
  const run = opts.post ? { ...opts, post: { batchId: batchIdOf(env, now), buildCommit: sha() } } : opts
  let body
  try {
    body = play(run)
  } catch (err) {
    stderr.write(`sim-run: ${err.message}\n`)
    return 1
  }
  if (opts.json) stdout.write(`${JSON.stringify(body.runs, null, 2)}\n`)
  else for (const line of body.runs) stdout.write(`${formatRunLine(line)}\n`)
  let code = body.runs.some((r) => r.stuck) ? 1 : 0
  if (!opts.post) return code

  const posts = body.posts ?? []
  const url = env.PUZZLE_API_URL?.trim()
  const token = env.PUZZLE_API_TOKEN?.trim()
  if (!url || !token) {
    stdout.write(`sim-run: PUZZLE_API_URL / PUZZLE_API_TOKEN not set; would post ${summaryLine(tally(posts))} as source sim (batch ${run.post.batchId}). Nothing sent.\n`)
    return code
  }
  const { sent, refused, capped } = await sendRuns(posts, { url, token }, { fetchImpl, stderr })
  stdout.write(`sim-run: posted ${summaryLine(tally(sent))} as source sim (batch ${run.post.batchId})\n`)
  for (const why of refused) stderr.write(`sim-run: refused: ${why}\n`)
  if (refused.length > 0 || capped) code = 1
  return code
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2))
}
