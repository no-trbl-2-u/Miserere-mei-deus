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
// Usage:
//   npm run sim:run -- --policy wanderer --runs 3 --seed 1
//   npm run sim:run -- --policy wanderer --runs 3 --seed 1 --json

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MOBILE = path.join(ROOT, 'axiomancer-mobile')

export const USAGE = 'usage: npm run sim:run -- --policy <id> [--runs <n>] [--seed <s>] [--json]'

/** Parse `--key value` / `--key=value` flags. Throws on anything it does not know. */
export function parseArgs(argv) {
  const opts = { policy: 'wanderer', runs: 1, seed: 1, json: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') { opts.json = true; continue }
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
      env: { ...process.env, SIM_RUN_ARGS: JSON.stringify({ policy: opts.policy, runs: opts.runs, seed: opts.seed }), SIM_RUN_OUT: out },
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
    })
    if (res.status !== 0) throw new Error(`the run driver failed (exit ${res.status}):\n${res.stdout ?? ''}${res.stderr ?? ''}`)
    return JSON.parse(readFileSync(out, 'utf-8'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Run the CLI. Returns the exit code; writes to the given streams. */
export function main(argv, { stdout = process.stdout, stderr = process.stderr, play = playRuns } = {}) {
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
  let body
  try {
    body = play(opts)
  } catch (err) {
    stderr.write(`sim-run: ${err.message}\n`)
    return 1
  }
  if (opts.json) stdout.write(`${JSON.stringify(body.runs, null, 2)}\n`)
  else for (const run of body.runs) stdout.write(`${formatRunLine(run)}\n`)
  return body.runs.some((r) => r.stuck) ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2))
}
