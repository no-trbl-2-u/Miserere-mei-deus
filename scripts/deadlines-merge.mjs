#!/usr/bin/env node
// scripts/deadlines-merge.mjs — git merge driver for plan/deadlines.md
// (Phase MD1a). Zero dependencies.
//
//   node scripts/deadlines-merge.mjs <base> <ours> <theirs> [<path>]
//
// Git runs it as `merge.deadlines.driver` (registered by the SessionStart hook
// in .claude/settings.json and by pr-resolve's MERGE_DRIVERS; `.gitattributes`
// names the path) with %O %A %B %P, and reads the result from <ours>.
//
// Every plot edits this file in the same three places: an Items row (by due
// date), a line at the end of `## Unscheduled`, and a line at the top of
// `## Change log`; the daily refresh rewrites Status cells beside them. So two
// plots in flight clash although neither touched the other's lines.
//
// It reuses the clash-settling core of build-plan-merge.mjs (same-spot
// insertions unioned, ours first; an insertion beside an edit; equal-length
// clashes of edited lines) and adds:
//   - a table row both sides edited is merged cell by cell, each cell from the
//     side that changed it; a cell both changed to different values stays a
//     conflict for a human;
//   - an Items block that settles out of a clash keeps its new rows in due-date
//     order (stable);
//   - the whole merge is REFUSED when an `## Unscheduled` id ends up with more
//     lines, or an Items row more copies, than either side had: a doubled row
//     passes no lint on its own line, so the driver is the only thing to catch it.
//
// Status cells are not re-derived here (the build plan may not be merged yet);
// they are left for `node scripts/deadlines.mjs --write` to re-derive after the
// merge. Having pr-resolve run it is not built yet (phase MD1b).
//
// Exit codes: 0 merged cleanly; 1 conflicts left in <ours> for a human.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { settleClashes } from './build-plan-merge.mjs'
import { conflictText } from './lessons-merge.mjs'

const ITEM_ROW = /^\| \[[ x]\] \| (\d{4}-\d{2}-\d{2}) \|/
const UNSCHEDULED_ID = /^- (\S+) —/

const isTableRow = (l) => l.startsWith('|')

/**
 * Merge one table row both sides edited, cell by cell. Null when the rows do
 * not line up or a cell was changed to two different values.
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @returns {string | null}
 */
export function mergeRow(base, ours, theirs) {
  if (![base, ours, theirs].every(isTableRow)) return null
  const [b, o, t] = [base, ours, theirs].map((l) => l.split('|'))
  if (b.length !== o.length || b.length !== t.length) return null
  const cells = b.map((c, i) => (o[i] === t[i] || t[i] === c ? o[i] : o[i] === c ? t[i] : null))
  return cells.every((c) => c !== null) ? cells.join('|') : null
}

/** The Item name cell: a row's identity, which a Status, Due or Rows edit leaves alone. */
const itemName = (l) => l.split('|')[3]?.trim()

/**
 * Keep rows a clash added in due-date order: when the settled block is Items
 * rows only, the rows that are new (their Item name is not among the base
 * block's) are stable-sorted by date among their own slots. A base row keeps
 * its place whether or not a side edited it, since the table is not strictly
 * date-ordered.
 * @param {string[]} settled  @param {string[]} base  @returns {string[]}
 */
export function tidyItems(settled, base) {
  if (!settled.length || !settled.every((l) => ITEM_ROW.test(l))) return settled
  const known = new Set(base.map(itemName))
  const isNew = settled.map((l) => !known.has(itemName(l)))
  const sorted = settled
    .filter((_, i) => isNew[i])
    .map((l, i) => ({ l, i, d: ITEM_ROW.exec(l)[1] }))
    .sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : x.i - y.i))
    .map((x) => x.l)
  let n = 0
  return settled.map((l, i) => (isNew[i] ? sorted[n++] : l))
}

/**
 * Counts of each Unscheduled id and each Items row text.
 * @param {string} text  @returns {{ ids: Map<string, number>, rows: Map<string, number> }}
 */
export function dupCounts(text) {
  const ids = new Map()
  const rows = new Map()
  let section = ''
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) section = line
    else if (section === '## Unscheduled') {
      const m = UNSCHEDULED_ID.exec(line)
      if (m) ids.set(m[1], (ids.get(m[1]) ?? 0) + 1)
    } else if (section === '## Items' && ITEM_ROW.test(line)) rows.set(line, (rows.get(line) ?? 0) + 1)
  }
  return { ids, rows }
}

/**
 * Merge three versions of plan/deadlines.md.
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @returns {{ ok: true, text: string } | { ok: false, reason: string, text: string }}
 */
export function mergeDeadlines(base, ours, theirs) {
  const { text, open } = settleClashes(base, ours, theirs, { mergeLine: mergeRow, tidy: tidyItems })
  if (open) return { ok: false, reason: `${open} clash${open > 1 ? 'es' : ''} both sides edited`, text }

  const [o, t, m] = [ours, theirs, text].map(dupCounts)
  const more = (key) =>
    [...m[key]].filter(([k, n]) => n > 1 && n > Math.max(o[key].get(k) ?? 0, t[key].get(k) ?? 0)).map(([k]) => k)
  const ids = more('ids')
  const rows = more('rows')
  if (ids.length || rows.length) {
    const what = [
      ids.length ? `the merge gives Unscheduled ${ids.join(', ')} a second line` : '',
      rows.length ? `the merge doubles ${rows.length} Items row${rows.length > 1 ? 's' : ''}` : '',
    ].filter(Boolean)
    return { ok: false, reason: what.join('; '), text: conflictText(base, ours, theirs) }
  }
  return { ok: true, text }
}

function main() {
  const [basePath, oursPath, theirsPath, file] = process.argv.slice(2)
  if (!basePath || !oursPath || !theirsPath) {
    process.stderr.write('usage: deadlines-merge.mjs <base> <ours> <theirs> [<path>]\n')
    process.exit(2)
  }
  const [base, ours, theirs] = [basePath, oursPath, theirsPath].map((p) => fs.readFileSync(p, 'utf8'))
  const r = mergeDeadlines(base, ours, theirs)
  fs.writeFileSync(oursPath, r.text)
  if (r.ok) process.exit(0)
  process.stderr.write(`deadlines-merge: ${file || oursPath}: ${r.reason}; left conflict markers\n`)
  process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
