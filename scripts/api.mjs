#!/usr/bin/env node
// scripts/api.mjs — the play-log reports from the `miserere-api` Worker.
//
//   npm run api -- card-usage                       # per card, every build
//   npm run api -- card-usage --card strike         # one card
//   npm run api -- card-usage --source sim          # the bots' play (human is the default)
//   npm run api -- card-usage --source all          # every source
//   npm run api -- card-gaps --build <sha>          # per enemy, one build
//   npm run api -- card-usage --json                # the report body as JSON
//   npm run api -- card-gaps --file report.json     # a saved GET body, no network
//   npm run api -- card-vs-bot                      # T beside each sim policy, per card, at the newest shared build
//   npm run api -- card-vs-bot --build <sha> --json # the same at one build, as JSON
//   npm run api -- run-summary                      # runs per source, and per sim policy
//   npm run api -- run-summary --source sim         # the bots' runs only
//
// Calls `GET /v1/reports/<name>` (`backend/src/reports.ts`, phase BE2f) and
// prints it as plain-text tables. The Worker holds the SQL; this script only
// names a report and passes `--build`, `--source` and `--card` as query values.
// A report reads `human` (T's own play) unless `--source human|harness|sim|all`
// says otherwise (phase SM1a); each table's header line names the source it read. Every
// number is a count for T to read; nothing here grades the game. Two reports differ (phase SM1h): `card-vs-bot`
// always reads T (`human`) beside the sim, so it takes `--build` only, and `run-summary` reads every source unless
// `--source` narrows it.
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
export const REPORT_NAMES = ['card-usage', 'card-gaps', 'signature-usage', 'card-vs-bot', 'run-summary']
/** Mirrors `PLAY_LOG_SOURCE_FILTERS` in the play-log contract. */
export const SOURCE_FILTERS = ['human', 'harness', 'sim', 'all']

const USAGE = `usage: npm run api -- <${REPORT_NAMES.join('|')}> [--build <sha>] [--source <${SOURCE_FILTERS.join('|')}>] [--card <id>] [--json] [--file <report.json>]`

/** Parse argv (after the script name). Throws an Error with a one-line message on bad input. */
export function parseArgs(argv) {
  const opts = { report: undefined, build: undefined, source: undefined, card: undefined, json: false, file: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') opts.json = true
    else if (arg === '-h' || arg === '--help') opts.help = true
    else if (arg === '--build' || arg === '--source' || arg === '--card' || arg === '--file') {
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
  if (opts.source !== undefined && !SOURCE_FILTERS.includes(opts.source)) {
    throw new Error(`--source expects ${SOURCE_FILTERS.join(', ')} (got ${opts.source})`)
  }
  if (opts.card !== undefined && opts.report !== 'card-usage') throw new Error('--card applies to card-usage only')
  if (opts.source !== undefined && opts.report === 'card-vs-bot') throw new Error('--source does not apply to card-vs-bot (it reads human beside sim)')
  return opts
}

/** The report's URL path and query: `--build`, `--source` and `--card` as `?build=`, `?source=` and `?card=`. */
export function reportPath({ report, build, source, card }) {
  const query = new URLSearchParams()
  if (build !== undefined) query.set('build', build)
  if (source !== undefined) query.set('source', source)
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

const scopeOf = (body) => `${body.build ? `build ${body.build}` : 'every build'}${body.source ? `, source ${body.source}` : ''}`
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

const SIGNATURE_COLUMNS = [
  ['signature', 'signatureId'], ['worn', 'fightsWorn'], ['cast', 'fightsCast'], ['casts', 'casts'],
  ['per fight', 'castsPerFight'], ['refused', 'refused'],
]

/** The signature-usage body as text: one row per signature worn, cast or refused. */
export function formatSignatureUsage(body) {
  const out = [`Signature usage: ${plural(body.fights, 'fight')} (${scopeOf(body)}).`]
  if (body.signatures.length === 0) {
    out.push('No signatures recorded.')
    return out.join('\n')
  }
  out.push(
    'worn = fights that wore it; cast = fights that cast it at least once; per fight = casts / worn;',
    'refused = taps the engine would not cast (not enough Conviction, or another reason).',
    '',
    table(SIGNATURE_COLUMNS.map(([h]) => h), body.signatures.map((row) => SIGNATURE_COLUMNS.map(([, k]) => row[k] ?? '-'))),
  )
  return out.join('\n')
}

const dash = (v) => (v === null || v === undefined ? '-' : v)

const VS_BOT_COLUMNS = [
  ['card', null], ['column', null], ['decks', 'fightsInDeck'], ['drawn', 'drawn'], ['played', 'played'], ['offered', 'offered'],
  ['picked', 'picked'], ['skipped', 'skipped'], ['deck/f', 'inDeckPerFight'], ['draw/f', 'drawnPerFight'], ['play/f', 'playedPerFight'],
  ['pick/o', 'pickedPerOffer'], ['skip/o', 'skippedPerOffer'],
]

/** The card-vs-bot body as text: per card, one row for T and one for each sim policy. */
export function formatCardVsBot(body) {
  if (body.build === null) return 'Card vs bot: no build holds both a human and a sim fight yet.'
  const columns = body.columns.map((c) => `${c.column} (${plural(c.fights, 'fight')})`).join(', ')
  const out = [`Card vs bot: build ${body.build}${body.buildDefaulted ? ' (the newest holding both human and sim)' : ''}; ${columns || 'no fights'}.`]
  if (body.cards.length === 0) {
    out.push('No cards recorded.')
    return out.join('\n')
  }
  out.push(
    'decks = fights with the card in the start deck; /f = per fight in the column; /o = per offer of the card.',
    'human is T on a preview build; every other column is a sim policy. Counts, not grades.',
    '',
    table(VS_BOT_COLUMNS.map(([h]) => h), body.cards.flatMap((card) => body.columns.map((c, i) => {
      const counts = card.columns[c.column]
      return [i === 0 ? card.cardId : '', c.column, ...VS_BOT_COLUMNS.slice(2).map(([, k]) => dash(counts[k]))]
    }))),
  )
  return out.join('\n')
}

const RUN_COLUMNS = [
  ['source', 'source'], ['policy', 'policyId'], ['runs', 'runs'], ['open', 'open'], ['run-over', 'runOver'], ['clear', 'chapterClear'],
  ['reset', 'reset'], ['lvl avg', 'avgLevel'], ['lvl max', 'maxLevel'], ['vitae avg', 'avgVitaeEnd'], ['nodes avg', 'avgNodesResolved'],
  ['nodes max', 'maxNodesResolved'], ['furthest', 'furthestNodeId'],
]

/** The run-summary body as text: one row per source, and per policy for the sim. */
export function formatRunSummary(body) {
  const out = [`Run summary: ${plural(body.runs, 'run')} (${scopeOf(body)}).`]
  if (body.summary.length === 0) {
    out.push('No runs recorded.')
    return out.join('\n')
  }
  out.push(
    'open = not yet ended; run-over, clear (chapter-clear) and reset are how the closed runs ended;',
    'vitae and level are at the end of the run; furthest = where the run that resolved the most nodes ended.',
    '',
    table(RUN_COLUMNS.map(([h]) => h), body.summary.map((row) => RUN_COLUMNS.map(([, k]) => dash(row[k])))),
  )
  return out.join('\n')
}

const REPORT_LISTS = {
  'card-usage': ['cards'], 'card-gaps': ['threats', 'unspentDice', 'defeats'], 'signature-usage': ['signatures'],
  'card-vs-bot': ['columns', 'cards'], 'run-summary': ['summary'],
}

/** Checks the body is the named report. Throws a one-line Error otherwise. */
export function checkBody(body, report) {
  if (!body || body.report !== report) throw new Error(`response is not a ${report} report`)
  const lists = REPORT_LISTS[report]
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

  const format = {
    'card-usage': formatCardUsage, 'card-gaps': formatCardGaps, 'signature-usage': formatSignatureUsage,
    'card-vs-bot': formatCardVsBot, 'run-summary': formatRunSummary,
  }[opts.report]
  const text = opts.json ? JSON.stringify(body, null, 2) : format(body)
  stdout.write(`${text}\n`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2))
}
