#!/usr/bin/env node
// scripts/telemetry-view.mjs — print every telemetry shard as one table.
//
//   npm run telemetry                       # all rows, oldest first
//   npm run telemetry -- --since 2026-09-20 # rows on or after a UTC date
//   npm run telemetry -- --tail 50          # only the newest N rows
//   npm run telemetry -- --kind script      # one event kind and its -end rows
//
// The invocation log is split into one file per session per UTC date
// under `telemetry/` (see `.claude/hooks/telemetry.mjs`, header point 3),
// so two branches never append to the same file and the log cannot
// conflict on merge. This script is the read side: it collects the data
// rows from every shard, including the pre-split
// `telemetry/legacy-to-2026-09-23.md`, sorts them by timestamp, and
// prints a single markdown table on stdout.
//
// Read-only and zero dependencies. Exit codes: 0 ok; 2 bad arguments.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** The table header every shard shares; printed once above all rows. */
export const TABLE_HEAD = '| when (UTC) | event | name | model | dur | detail |\n|---|---|---|---|---|---|'

/** A telemetry data row: a table line whose first cell is an ISO timestamp. */
const ROW_RE = /^\| 20\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ \|/

/** The timestamp cell of a data row, used as its sort key. */
const whenOf = (row) => row.slice(2, 22)

/** The event cell of a data row. */
const eventOf = (row) => row.split('|')[2].trim()

/**
 * Every data row from every `*.md` shard in `dir`, oldest first.
 * Rows with the same timestamp keep their shard's order (Array#sort is
 * stable), so a start row and its end row written in the same second
 * stay paired. A missing directory yields no rows, not an error.
 */
export function collectRows(dir) {
  if (!fs.existsSync(dir)) return []
  const rows = []
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.md')) continue
    const text = fs.readFileSync(path.join(dir, name), 'utf-8')
    for (const line of text.split(/\r?\n/)) if (ROW_RE.test(line)) rows.push(line)
  }
  return rows.sort((a, b) => (whenOf(a) < whenOf(b) ? -1 : whenOf(a) > whenOf(b) ? 1 : 0))
}

/**
 * Apply the CLI filters to already-sorted rows.
 * @param rows  sorted data rows
 * @param opts  { since?: 'YYYY-MM-DD', tail?: number, kind?: string }
 *              `kind` keeps one event kind and its `-end` rows, so
 *              `--kind script` lists the visual/e2e runs and their outcomes.
 */
export function filterRows(rows, { since, tail, kind } = {}) {
  let out = since ? rows.filter((r) => whenOf(r).slice(0, 10) >= since) : rows
  if (kind) out = out.filter((r) => eventOf(r) === kind || eventOf(r) === `${kind}-end`)
  if (tail) out = out.slice(-tail)
  return out
}

/** Parse argv into filter options, or throw with a usage message. */
export function parseArgs(argv) {
  const opts = {}
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (flag === '--since' && /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
      opts.since = value
      i++
    } else if (flag === '--tail' && /^\d+$/.test(value ?? '') && Number(value) > 0) {
      opts.tail = Number(value)
      i++
    } else if (flag === '--kind' && /^[a-z][a-z-]*$/.test(value ?? '')) {
      opts.kind = value
      i++
    } else {
      throw new Error(`unknown or malformed argument: ${flag}\nusage: telemetry-view.mjs [--since YYYY-MM-DD] [--tail N] [--kind EVENT]`)
    }
  }
  return opts
}

// Run only when executed directly, so the test can import the helpers.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let opts
  try {
    opts = parseArgs(process.argv.slice(2))
  } catch (err) {
    console.error(err.message)
    process.exit(2)
  }
  const rows = filterRows(collectRows(path.join(ROOT, 'telemetry')), opts)
  process.stdout.write(`${TABLE_HEAD}\n${rows.join('\n')}${rows.length ? '\n' : ''}`)
}
