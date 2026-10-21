#!/usr/bin/env node
// scripts/puzzle-times.mjs — per-puzzle solve times from the solve-time API.
//
//   npm run puzzle:times                          # every stored attempt
//   npm run puzzle:times -- --solver T            # one solver's attempts
//   npm run puzzle:times -- --json                # the summary rows as JSON
//   npm run puzzle:times -- --file attempts.json  # a saved GET body, no network
//
// Reads `GET /v1/puzzle-attempts` from the `miserere-api` Worker (`backend/`)
// and prints one table: the candidates grouped by intended band (easy,
// medium, hard), then the demos, each row with its attempt count, solve
// count, solve rate and the median solve time in seconds over cleared
// attempts. `--solver` keeps one solver's attempts (case-insensitive).
//
// The Worker URL and the bearer token come from `PUZZLE_API_URL` and
// `PUZZLE_API_TOKEN`. When either is unset in the environment it is read
// from `~/.config/miserere/puzzle-api.env` (`KEY=value` lines). The token is
// only ever sent in the Authorization header; it is never printed.
//
// Zero dependencies. Exit codes: 0 ok; 1 the fetch or the response failed;
// 2 bad arguments or a missing variable.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** The API route; mirrors `PUZZLE_ATTEMPTS_PATH` in the mechanics attempt contract. */
export const PUZZLE_ATTEMPTS_PATH = '/v1/puzzle-attempts'

/** The fallback env file, read only for variables the environment lacks. */
export const ENV_FILE = path.join(os.homedir(), '.config', 'miserere', 'puzzle-api.env')

export const REQUIRED_VARS = ['PUZZLE_API_URL', 'PUZZLE_API_TOKEN']

/** Candidate bands in print order; any row with a null band is a demo. */
export const BAND_ORDER = ['easy', 'medium', 'hard']

const USAGE = 'usage: npm run puzzle:times -- [--solver <name>] [--json] [--file <attempts.json>]'

/** Parse argv (after the script name). Throws an Error with a one-line message on bad input. */
export function parseArgs(argv) {
  const opts = { solver: undefined, json: false, file: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') opts.json = true
    else if (arg === '--solver' || arg === '--file') {
      const value = argv[++i]
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value`)
      opts[arg.slice(2)] = value
    } else if (arg === '-h' || arg === '--help') opts.help = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  return opts
}

/**
 * `KEY=value` pairs from an env file body. Blank lines and `#` comments are
 * skipped, a leading `export ` is allowed, and one pair of matching quotes
 * around the value is dropped.
 */
export function parseEnvFile(text) {
  const vars = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
      value = value.slice(1, -1)
    }
    vars[match[1]] = value
  }
  return vars
}

/**
 * The URL and token: the environment first, then the env file for whatever
 * the environment leaves unset or blank. Returns `{ config }` or
 * `{ missing: [names] }`.
 */
export function resolveConfig(env, envFile = ENV_FILE) {
  const values = {}
  for (const name of REQUIRED_VARS) if (env[name] && env[name].trim() !== '') values[name] = env[name].trim()
  if (REQUIRED_VARS.some((name) => !values[name]) && fs.existsSync(envFile)) {
    const fromFile = parseEnvFile(fs.readFileSync(envFile, 'utf-8'))
    for (const name of REQUIRED_VARS) if (!values[name] && fromFile[name]) values[name] = fromFile[name]
  }
  const missing = REQUIRED_VARS.filter((name) => !values[name])
  if (missing.length > 0) return { missing }
  return { config: { url: values.PUZZLE_API_URL.replace(/\/+$/, ''), token: values.PUZZLE_API_TOKEN } }
}

/** The one-line failure for unset variables; names each one, never a value. */
export function missingMessage(missing) {
  return `puzzle:times: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set (export it, or add it to ${ENV_FILE})`
}

/** Median of a non-empty number list; the mean of the middle two for an even count. */
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Attempts whose solver matches `solver` (trimmed, case-insensitive); all when undefined. */
export function filterBySolver(attempts, solver) {
  if (solver === undefined) return attempts
  const want = solver.trim().toLowerCase()
  return attempts.filter((a) => String(a.solver ?? '').trim().toLowerCase() === want)
}

/**
 * One summary row per layout: candidates by band in `BAND_ORDER`, then demos,
 * each group sorted by layout id. A layout's band is taken from its newest
 * attempt (the API returns newest first). `medianSeconds` is null when no
 * attempt cleared.
 */
export function summarize(attempts) {
  const byLayout = new Map()
  for (const a of attempts) {
    let entry = byLayout.get(a.layoutId)
    if (!entry) {
      entry = { layoutId: a.layoutId, band: a.intendedBand ?? null, attempts: 0, solves: 0, solveMs: [] }
      byLayout.set(a.layoutId, entry)
    }
    entry.attempts += 1
    if (a.cleared) {
      entry.solves += 1
      entry.solveMs.push(a.endMs)
    }
  }
  // Known bands in order, then any band this script does not know, then demos.
  const rank = (band) => (band === null ? BAND_ORDER.length + 1 : BAND_ORDER.includes(band) ? BAND_ORDER.indexOf(band) : BAND_ORDER.length)
  return [...byLayout.values()]
    .sort((x, y) => rank(x.band) - rank(y.band) || (x.layoutId < y.layoutId ? -1 : x.layoutId > y.layoutId ? 1 : 0))
    .map(({ layoutId, band, attempts: count, solves, solveMs }) => ({
      layoutId,
      band,
      attempts: count,
      solves,
      solveRate: count === 0 ? 0 : solves / count,
      medianSeconds: solveMs.length === 0 ? null : Math.round(median(solveMs) / 100) / 10,
    }))
}

/** The group heading a summary row prints under. */
const groupOf = (row) => (row.band === null ? 'DEMOS' : row.band.toUpperCase())

/** The summary rows as a plain-text table, one block per group. */
export function formatTable(rows, { solver } = {}) {
  const scope = solver === undefined ? 'all solvers' : `solver "${solver}"`
  if (rows.length === 0) return `No puzzle attempts stored (${scope}).`
  const head = ['layout', 'attempts', 'solves', 'rate', 'median s']
  const cells = (row) => [
    row.layoutId,
    String(row.attempts),
    String(row.solves),
    `${Math.round(row.solveRate * 100)}%`,
    row.medianSeconds === null ? '-' : row.medianSeconds.toFixed(1),
  ]
  const all = [head, ...rows.map(cells)]
  const widths = head.map((_, i) => Math.max(...all.map((r) => r[i].length)))
  const line = (r) => r.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ').trimEnd()

  const total = rows.reduce((n, r) => n + r.attempts, 0)
  const out = [`Puzzle solve times: ${total} attempt${total === 1 ? '' : 's'} (${scope}). Median over cleared attempts.`]
  let group
  for (const row of rows) {
    if (groupOf(row) !== group) {
      group = groupOf(row)
      out.push('', group, line(head))
    }
    out.push(line(cells(row)))
  }
  return out.join('\n')
}

/** GET every stored attempt. Throws a one-line Error on a network or HTTP failure. */
export async function fetchAttempts({ url, token }, fetchImpl = fetch) {
  let res
  try {
    res = await fetchImpl(`${url}${PUZZLE_ATTEMPTS_PATH}`, { headers: { Authorization: `Bearer ${token}` } })
  } catch (err) {
    throw new Error(`could not reach ${url}: ${err?.message ?? err}`)
  }
  if (!res.ok) {
    const hint = res.status === 401 ? ' (check PUZZLE_API_TOKEN)' : ''
    throw new Error(`GET ${url}${PUZZLE_ATTEMPTS_PATH} returned ${res.status}${hint}`)
  }
  return attemptsOf(await res.json())
}

/** The attempts array from a GET body. Throws when the body is not `{ attempts: [] }`. */
export function attemptsOf(body) {
  if (!body || !Array.isArray(body.attempts)) throw new Error('response is not { attempts: [...] }')
  return body.attempts
}

/** Run the CLI. Returns the exit code; writes to the given streams. */
export async function main(argv, { env = process.env, envFile = ENV_FILE, fetchImpl = fetch, stdout = process.stdout, stderr = process.stderr } = {}) {
  let opts
  try {
    opts = parseArgs(argv)
  } catch (err) {
    stderr.write(`puzzle:times: ${err.message}\n${USAGE}\n`)
    return 2
  }
  if (opts.help) {
    stdout.write(`${USAGE}\n`)
    return 0
  }

  let attempts
  try {
    if (opts.file !== undefined) {
      attempts = attemptsOf(JSON.parse(fs.readFileSync(opts.file, 'utf-8')))
    } else {
      const resolved = resolveConfig(env, envFile)
      if (resolved.missing) {
        stderr.write(`${missingMessage(resolved.missing)}\n`)
        return 2
      }
      attempts = await fetchAttempts(resolved.config, fetchImpl)
    }
  } catch (err) {
    stderr.write(`puzzle:times: ${err.message}\n`)
    return 1
  }

  const rows = summarize(filterBySolver(attempts, opts.solver))
  stdout.write(opts.json ? `${JSON.stringify(rows, null, 2)}\n` : `${formatTable(rows, { solver: opts.solver })}\n`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2))
}
