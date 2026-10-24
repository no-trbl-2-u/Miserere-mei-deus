#!/usr/bin/env node
// scripts/api.mjs — the play-log reports from the `miserere-api` Worker.
//
//   npm run api -- card-usage                       # per card, every build
//   npm run api -- card-usage --card strike         # one card
//   npm run api -- card-gaps --build <sha>          # per enemy, one build
//   npm run api -- card-usage --json                # the report body as JSON
//   npm run api -- card-gaps --file report.json     # a saved GET body, no network
//
// Calls `GET /v1/reports/<name>` (`backend/src/reports.ts`, phase BE2f) and
// prints it as plain-text tables. The Worker holds the SQL; this script only
// names a report and passes `--build` and `--card` as query values. Every
// number is a count for T to read; nothing here grades the game.
//
// The Worker URL and token are the solve-time API's: `PUZZLE_API_URL` and
// `PUZZLE_API_TOKEN`, read from `~/.config/miserere/puzzle-api.env` for any
// the environment leaves unset. The token is only sent in the Authorization
// header; it is never printed.
//
// Zero dependencies. Exit codes: 0 ok; 1 the fetch or the response failed;
// 2 bad arguments or a missing variable.

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { ENV_FILE, resolveConfig } from './puzzle-times.mjs'

/** Mirrors `REPORTS_PATH_PREFIX` and `REPORT_NAMES` in `backend/src/reports.ts`. */
export const REPORTS_PATH_PREFIX = '/v1/reports/'
export const REPORT_NAMES = ['card-usage', 'card-gaps']

const USAGE = `usage: npm run api -- <${REPORT_NAMES.join('|')}> [--build <sha>] [--card <id>] [--json] [--file <report.json>]`

/** Parse argv (after the script name). Throws an Error with a one-line message on bad input. */
export function parseArgs(argv) {
  const opts = { report: undefined, build: undefined, card: undefined, json: false, file: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') opts.json = true
    else if (arg === '-h' || arg === '--help') opts.help = true
    else if (arg === '--build' || arg === '--card' || arg === '--file') {
      const value = argv[++i]
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value`)
      opts[arg.slice(2)] = value
    } else if (arg.startsWith('-')) throw new Error(`unknown argument: ${arg}`)
    else if (opts.report !== undefined) throw new Error(`one report at a time (got ${opts.report} and ${arg})`)
    else if (!REPORT_NAMES.includes(arg)) throw new Error(`unknown report: ${arg} (expected ${REPORT_NAMES.join(' or ')})`)
    else opts.report = arg
  }
  if (opts.help) return opts
  if (opts.report === undefined) throw new Error('name a report')
  if (opts.card !== undefined && opts.report !== 'card-usage') throw new Error('--card applies to card-usage only')
  return opts
}

/** The report's URL path and query: `--build` and `--card` as `?build=` and `?card=`. */
export function reportPath({ report, build, card }) {
  const query = new URLSearchParams()
  if (build !== undefined) query.set('build', build)
  if (card !== undefined) query.set('card', card)
  const qs = query.toString()
  return `${REPORTS_PATH_PREFIX}${report}${qs ? `?${qs}` : ''}`
}

/** Right-aligned columns after a left-aligned first one, two spaces apart. */
export function table(head, rows) {
  const all = [head, ...rows.map((r) => r.map(String))]
  const widths = head.map((_, i) => Math.max(...all.map((r) => r[i].length)))
  const line = (r) => r.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ').trimEnd()
  return all.map(line).join('\n')
}

const scopeOf = (body) => (body.build ? `build ${body.build}` : 'every build')
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const USAGE_COLUMNS = [
  ['card', 'cardId'], ['decks', 'fightsInDeck'], ['drawn', 'drawn'], ['played', 'played'], ['free', 'free'],
  ['paid', 'paid'], ['held', 'held'], ['fizzled', 'fizzled'], ['offered', 'offered'], ['picked', 'picked'],
  ['skipped', 'skipped'], ['removed', 'removed'],
]

/** The card-usage body as text: one row per card. */
export function formatCardUsage(body) {
  const card = body.card ? `, card ${body.card}` : ''
  const out = [`Card usage: ${plural(body.fights, 'fight')} (${scopeOf(body)}${card}).`]
  if (body.cards.length === 0) {
    out.push('No cards recorded.')
    return out.join('\n')
  }
  out.push(
    'decks = fights with the card in the start deck; held = turn ends it sat in hand unplayed;',
    'the opening hand is not in the stream, so drawn counts later draws only.',
    '',
    table(USAGE_COLUMNS.map(([h]) => h), body.cards.map((row) => USAGE_COLUMNS.map(([, k]) => row[k]))),
  )
  return out.join('\n')
}

/** The card-gaps body as text: threats, unspent dice and defeats, each per enemy. */
export function formatCardGaps(body) {
  const out = [`Card gaps: ${plural(body.fights, 'fight')} (${scopeOf(body)}).`]
  const section = (title, head, rows, cells) => {
    out.push('', title)
    out.push(rows.length === 0 ? '(none)' : table(head, rows.map(cells)))
  }
  section('THREATS THAT OVERWHELMED A PHASE', ['enemy', 'threat', 'overwhelmed', 'fights'], body.threats,
    (r) => [r.enemyId, r.threat, r.overwhelmed, r.fights])
  section('LIVE DICE LEFT UNSPENT AT TURN END', ['enemy', 'colour', 'rolled', 'unspent'], body.unspentDice,
    (r) => [r.enemyId, r.color, r.rolled, r.unspent])
  section('WHAT ENDED EACH LOST FIGHT', ['enemy', 'cause', 'fights'], body.defeats,
    (r) => [r.enemyId, r.cause, r.fights])
  return out.join('\n')
}

/** Checks the body is the named report. Throws a one-line Error otherwise. */
export function checkBody(body, report) {
  if (!body || body.report !== report) throw new Error(`response is not a ${report} report`)
  const lists = report === 'card-usage' ? ['cards'] : ['threats', 'unspentDice', 'defeats']
  for (const key of lists) if (!Array.isArray(body[key])) throw new Error(`response has no ${key} list`)
  return body
}

/** GET the report. Throws a one-line Error on a network or HTTP failure. */
export async function fetchReport({ url, token }, opts, fetchImpl = fetch) {
  const target = `${url}${reportPath(opts)}`
  let res
  try {
    res = await fetchImpl(target, { headers: { Authorization: `Bearer ${token}` } })
  } catch (err) {
    throw new Error(`could not reach ${url}: ${err?.message ?? err}`)
  }
  if (!res.ok) {
    const hint = res.status === 401 ? ' (check PUZZLE_API_TOKEN)' : ''
    throw new Error(`GET ${target} returned ${res.status}${hint}`)
  }
  return checkBody(await res.json(), opts.report)
}

/** Run the CLI. Returns the exit code; writes to the given streams. */
export async function main(argv, { env = process.env, envFile = ENV_FILE, fetchImpl = fetch, stdout = process.stdout, stderr = process.stderr } = {}) {
  let opts
  try {
    opts = parseArgs(argv)
  } catch (err) {
    stderr.write(`api: ${err.message}\n${USAGE}\n`)
    return 2
  }
  if (opts.help) {
    stdout.write(`${USAGE}\n`)
    return 0
  }

  let body
  try {
    if (opts.file !== undefined) {
      body = checkBody(JSON.parse(fs.readFileSync(opts.file, 'utf-8')), opts.report)
    } else {
      const resolved = resolveConfig(env, envFile)
      if (resolved.missing) {
        const verb = resolved.missing.length > 1 ? 'are' : 'is'
        stderr.write(`api: ${resolved.missing.join(' and ')} ${verb} not set (export it, or add it to ${envFile})\n`)
        return 2
      }
      body = await fetchReport(resolved.config, opts, fetchImpl)
    }
  } catch (err) {
    stderr.write(`api: ${err.message}\n`)
    return 1
  }

  const text = opts.json ? JSON.stringify(body, null, 2) : opts.report === 'card-usage' ? formatCardUsage(body) : formatCardGaps(body)
  stdout.write(`${text}\n`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2))
}
