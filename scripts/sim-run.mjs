#!/usr/bin/env node
// scripts/sim-run.mjs
//
// The headless run sim (phase SM1e, A10). Plays whole Chapter 1 runs through
// the app's own store actions (`axiomancer-mobile/sim/`), one per seed, as a
// run policy decides, and prints one line per run: the policy, the seed, the
// outcome, the furthest node, level, VITAE at the end, fights won, lost and
// spared, the boss damage and end node, and the end deck's card count per lane,
// then one batch table row per policy. It posts nothing.
//
// The driver runs under jest (`axiomancer-mobile/sim/jest.config.js`, the
// app's own preset and module mapping) and hands its runs back as JSON; this
// script prints them. A run that sticks (a step with no legal move: the
// driver's bug detector) prints as STUCK with the node and the state, and the
// script exits 1 after printing every run. `--breaks <file>` (phase SM2d) also appends
// one JSON line per break to the file (a crash, stuck run or stuck fight, and the two
// end-of-run checks, a stranded quest and a node left unresolved), for `sim:breaks`
// to file; only the first three fail the exit code. `--ledger <file>` appends one
// JSON line per run (see `ledgerLines`): the player on first reaching each node,
// the shillings gained and spent by kind, and the game's prices, for `sim:report`'s
// arrival and money tables. A measurement, not a gate: nothing here judges a number.
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
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MOBILE = path.join(ROOT, 'axiomancer-mobile')

export const USAGE = 'usage: npm run sim:run -- --policy <id|a,b|lanes> [--runs <n>] [--seed <s>] [--json] [--post] [--breaks <file>] [--ledger <file>]\n       tuning (never with --post): [--shillings <n>] [--boss-level <n>] [--start-relic <id>]... [--no-relic-stats] [--fight <policy>] [--no-anvil] [--no-guard]\n       npm run sim:run -- --compare [--runs <n>] [--seed <s>]   (spare-all against finish-all)'

/** One batch posts at most this many bytes (A13). */
export const POST_BATCH_CAP_BYTES = 25 * 1024 * 1024

/** Parse `--key value` / `--key=value` flags. Throws on anything it does not know. */
export function parseArgs(argv) {
  const opts = { policy: 'wanderer', runs: 1, seed: 1, json: false, post: false, breaks: null, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') { opts.json = true; continue }
    if (arg === '--post') { opts.post = true; continue }
    if (arg === '--compare') { opts.compare = true; continue }
    if (arg === '--no-relic-stats') { opts.noRelicStats = true; continue }
    if (arg === '--no-anvil') { opts.noAnvil = true; continue }
    if (arg === '--no-guard') { opts.noGuard = true; continue }
    if (arg === '--help' || arg === '-h') { opts.help = true; continue }
    const m = /^--(policy|runs|seed|breaks|ledger|shillings|boss-level|start-relic|fight)(?:=(.*))?$/.exec(arg)
    if (!m) throw new Error(`unknown argument '${arg}'`)
    const value = m[2] ?? argv[++i]
    if (value === undefined || value === '') throw new Error(`--${m[1]} needs a value`)
    if (m[1] === 'policy') { opts.policy = value; continue }
    if (m[1] === 'breaks') { opts.breaks = value; continue }
    if (m[1] === 'ledger') { opts.ledger = value; continue }
    if (m[1] === 'fight') { opts.fight = value; continue }
    if (m[1] === 'start-relic') { opts.startRelic = [...(opts.startRelic ?? []), value]; continue }
    if (m[1] === 'shillings') {
      const x = Number(value)
      if (!Number.isFinite(x) || x <= 0) throw new Error(`--shillings must be a positive number, not '${value}'`)
      opts.shillings = x
      continue
    }
    if (m[1] === 'boss-level') {
      const x = Number(value)
      if (!Number.isInteger(x) || x < 1) throw new Error(`--boss-level must be a positive integer, not '${value}'`)
      opts.bossLevel = x
      continue
    }
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
  if (run.stuck) return `${run.policy} seed=${run.seed} ${run.kind === 'crash' ? 'CRASH' : run.kind === 'fight-stuck' ? 'FIGHT-STUCK' : 'STUCK'} at ${run.node}: ${run.error}`
  const f = run.fights
  return [
    `${run.policy} seed=${run.seed}`,
    run.outcome,
    `furthest=${run.furthestNodeId}`,
    `level=${run.level}`,
    `vitae=${run.vitae}/${run.maxVitae}`,
    `fights won=${f.won} lost=${f.lost} spared=${f.spared}`,
    `boss=${run.bossDamagePct == null ? 'n/a' : `${run.bossDamagePct}%`}`,
    `end=${run.endNodeId}`,
    `deck ${formatLanes(run.deckByLane)}`,
  ].join(' | ')
}

/**
 * The batch as one row per policy: runs played, clears, average level, average
 * boss damage (a run that never met the boss is left out of it), the average
 * deck by lane, and where the runs that did not clear ended, most first. A
 * stuck run counts as a run that did not clear and ended where it stuck. A
 * reading: nothing here sets an exit code.
 */
export function batchTable(runs) {
  const byPolicy = new Map()
  for (const run of runs) {
    if (!byPolicy.has(run.policy)) byPolicy.set(run.policy, [])
    byPolicy.get(run.policy).push(run)
  }
  return [...byPolicy].map(([policy, group]) => {
    const played = group.filter((r) => !r.stuck)
    const lanes = {}
    for (const r of played) for (const [lane, n] of Object.entries(r.deckByLane ?? {})) lanes[lane] = (lanes[lane] ?? 0) + n
    const ends = {}
    for (const r of group) {
      if (r.outcome === 'chapter-clear') continue
      const at = r.stuck ? r.node : r.endNodeId
      ends[at] = (ends[at] ?? 0) + 1
    }
    return {
      policy,
      runs: group.length,
      clears: played.filter((r) => r.outcome === 'chapter-clear').length,
      avgLevel: mean(played.map((r) => r.level)),
      avgBossDamagePct: mean(played.map((r) => r.bossDamagePct).filter((x) => x != null)),
      avgDeckByLane: Object.fromEntries(Object.entries(lanes).map(([lane, n]) => [lane, n / played.length])),
      failedEnds: Object.entries(ends).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([nodeId, count]) => ({ nodeId, count })),
    }
  })
}

/** The batch table as text: a header and one row per policy. */
export function formatBatchTable(rows) {
  const lanes = (deck) => formatLanes(Object.fromEntries(Object.entries(deck).map(([k, v]) => [k, Math.round(v * 10) / 10])))
  const lines = ['policy | clears | avg level | avg boss damage | avg deck by lane | where failed runs ended']
  for (const r of rows) {
    lines.push([
      r.policy,
      `${r.clears}/${r.runs}`,
      fmt(r.avgLevel),
      r.avgBossDamagePct === null ? 'n/a' : `${fmt(r.avgBossDamagePct)}%`,
      lanes(r.avgDeckByLane) || '-',
      r.failedEnds.map((e) => `${e.nodeId}=${e.count}`).join(' ') || '-',
    ].join(' | '))
  }
  return lines.join('\n')
}

/**
 * The ledger lines of a batch, one per run in order: the persona, seed and
 * build, then for a finished run its outcome, the player on first reaching each
 * node (`arrivals`), its shillings (`money`: the start purse, every gain, the
 * spends by kind) and the prices the game charged; a broken run carries only
 * `stuck` and its node, so a reader still counts it.
 */
export function ledgerLines(body, build) {
  return (body.runs ?? []).map((run) => {
    const head = { persona: run.policy, seed: run.seed, build: build ?? null }
    if (run.stuck) return { ...head, stuck: true, node: run.node }
    return { ...head, outcome: run.outcome, arrivals: run.arrivals ?? {}, money: run.money ?? null, prices: body.prices ?? null }
  })
}

/** The tuning flags the options carry, in the shape the run driver takes; null when none is set. */
export function tuningOf(opts) {
  const tuning = {
    ...(opts.shillings !== undefined ? { shillings: opts.shillings } : {}),
    ...(opts.bossLevel !== undefined ? { bossLevel: opts.bossLevel } : {}),
    ...(opts.startRelic?.length ? { startRelics: opts.startRelic } : {}),
    ...(opts.noRelicStats ? { noRelicStats: true } : {}),
    ...(opts.fight !== undefined ? { fight: opts.fight } : {}),
    ...(opts.noAnvil ? { noAnvil: true } : {}),
    ...(opts.noGuard ? { noGuard: true } : {}),
  }
  return Object.keys(tuning).length > 0 ? tuning : null
}

/** The Spare table's results, in table order. */
export const SPARE_TABLE_KINDS = ['shillings', 'consumable', 'upgrade', 'transform', 'gear', 'relic']

const mean = (xs) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length)
const fmt = (n, digits = 1) => (n === null ? 'n/a' : n.toFixed(digits))

/**
 * What one arm of the comparison came to, from its runs. A run that ended
 * short of the chapter's end (`run-over`) or stuck is counted as such, and its
 * numbers still go in the means: they are partial, and the line says so.
 */
export function summarizeArm(policy, runs) {
  const played = runs.filter((r) => !r.stuck)
  const cleared = played.filter((r) => r.outcome === 'chapter-clear')
  const table = Object.fromEntries(SPARE_TABLE_KINDS.map((k) => [k, played.reduce((n, r) => n + (r.mercy?.table?.[k] ?? 0), 0)]))
  const checks = played.map((r) => r.mercy?.checks ?? 0)
  return {
    policy,
    runs: runs.length,
    cleared: cleared.length,
    died: played.length - cleared.length,
    stuck: runs.length - played.length,
    xp: mean(played.map((r) => r.mercy?.xp ?? 0)),
    level: mean(played.map((r) => r.level)),
    wages: mean(played.map((r) => r.mercy?.shillings ?? 0)),
    held: mean(played.map((r) => r.currency ?? 0)),
    checks: mean(checks),
    checksTotal: checks.reduce((a, b) => a + b, 0),
    spared: played.reduce((n, r) => n + (r.mercy?.spared ?? 0), 0),
    table,
  }
}

/**
 * The comparison as text: spare-all against finish-all at the end of Act 1
 * (means per run), how many checks fired and the spread of table results.
 * A measurement, never a gate: nothing here judges a number.
 */
export function formatComparison(spare, finish, { seed, runs }) {
  const partial = [spare, finish].some((a) => a.cleared < a.runs)
  const row = (label, a, b) => `${label.padEnd(34)}${String(a).padStart(12)}${String(b).padStart(12)}`
  const lines = [
    `mercy check comparison: seeds ${seed}..${seed + runs - 1} (${runs} runs per arm), means per run`,
    row('', 'spare-all', 'finish-all'),
    row('runs reaching the end of Act 1', `${spare.cleared}/${spare.runs}`, `${finish.cleared}/${finish.runs}`),
    row('runs that died', spare.died, finish.died),
    row('runs stuck (RunStuckError)', spare.stuck, finish.stuck),
    row('XP from won fights', fmt(spare.xp), fmt(finish.xp)),
    row('level at the end', fmt(spare.level), fmt(finish.level)),
    row('shillings paid by won fights', fmt(spare.wages), fmt(finish.wages)),
    row('shillings held at the end', fmt(spare.held), fmt(finish.held)),
    row('checks fired per run', fmt(spare.checks, 2), fmt(finish.checks, 2)),
    row('checks fired in all', spare.checksTotal, finish.checksTotal),
    row('checks answered Spare in all', spare.spared, finish.spared),
  ]
  const rolled = SPARE_TABLE_KINDS.reduce((n, k) => n + spare.table[k], 0)
  lines.push(`spare-all table results (${rolled} rolls): ${SPARE_TABLE_KINDS.map((k) => `${k} ${spare.table[k]}${rolled > 0 ? ` (${Math.round((100 * spare.table[k]) / rolled)}%)` : ''}`).join(', ')}`)
  if (partial) lines.push('PARTIAL: not every run reached the end of Act 1; those numbers are the run up to where it stopped.')
  return lines.join('\n')
}

/** Run the driver under jest; returns `{ runs }` or throws with jest's output. */
export function playRuns(opts, { spawn = spawnSync } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'sim-run-'))
  const out = path.join(dir, 'runs.json')
  try {
    const jest = createRequire(path.join(MOBILE, 'package.json')).resolve('jest/bin/jest')
    const res = spawn(process.execPath, [jest, '-c', 'sim/jest.config.js', '--silent', '--runInBand'], {
      cwd: MOBILE,
      env: { ...process.env, SIM_RUN_ARGS: JSON.stringify({ policy: opts.policy, runs: opts.runs, seed: opts.seed, ...(tuningOf(opts) ? { tuning: tuningOf(opts) } : {}), ...(opts.post ? { post: opts.post } : {}), ...(opts.build !== undefined ? { build: opts.build } : {}) }), SIM_RUN_OUT: out },
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
  if (opts.post && tuningOf(opts)) {
    stderr.write(`sim-run: --post is refused with a tuning flag; a tuning batch never reaches the nightly data\n${USAGE}\n`)
    return 2
  }
  if (opts.noRelicStats && !opts.startRelic?.length) {
    stderr.write(`sim-run: --no-relic-stats needs a --start-relic\n${USAGE}\n`)
    return 2
  }
  if (opts.compare) {
    if (opts.post || opts.json) {
      stderr.write(`sim-run: --compare prints the table only; it takes no --post or --json\n${USAGE}\n`)
      return 2
    }
    let arms
    try {
      arms = ['spare-all', 'finish-all'].map((policy) => summarizeArm(policy, play({ ...opts, policy }).runs))
    } catch (err) {
      stderr.write(`sim-run: ${err.message}\n`)
      return 1
    }
    stdout.write(`${formatComparison(arms[0], arms[1], opts)}\n`)
    return 0
  }
  const build = opts.breaks || opts.ledger ? sha() : undefined
  const withBuild = build === undefined ? opts : { ...opts, build }
  const run = opts.post ? { ...withBuild, post: { batchId: batchIdOf(env, now), buildCommit: build === undefined ? sha() : build } } : withBuild
  let body
  try {
    body = play(run)
  } catch (err) {
    stderr.write(`sim-run: ${err.message}\n`)
    return 1
  }
  const table = batchTable(body.runs)
  if (opts.json) stdout.write(`${JSON.stringify({ runs: body.runs, table }, null, 2)}\n`)
  else {
    for (const line of body.runs) stdout.write(`${formatRunLine(line)}\n`)
    stdout.write(`${formatBatchTable(table)}\n`)
  }
  // A crash, a stuck run or a stuck fight fails the step; the end-of-run checks never do.
  let code = body.runs.some((r) => r.stuck) ? 1 : 0
  if (opts.breaks) {
    try {
      appendFileSync(opts.breaks, (body.breaks ?? []).map((b) => `${JSON.stringify(b)}\n`).join(''))
    } catch (err) {
      stderr.write(`sim-run: cannot write ${opts.breaks}: ${err.message}\n`)
      code = 1
    }
  }
  if (opts.ledger) {
    try {
      appendFileSync(opts.ledger, ledgerLines(body, build).map((l) => `${JSON.stringify(l)}\n`).join(''))
    } catch (err) {
      stderr.write(`sim-run: cannot write ${opts.ledger}: ${err.message}\n`)
      code = 1
    }
  }
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
