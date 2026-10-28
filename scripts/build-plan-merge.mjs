#!/usr/bin/env node
// scripts/build-plan-merge.mjs — git merge driver for plan/steps/01_build_plan.md
// (Phase ML1b). Zero dependencies.
//
//   node scripts/build-plan-merge.mjs <base> <ours> <theirs> [<path>]
//
// Git runs it as `merge.buildplan.driver` (registered by the SessionStart hook
// in .claude/settings.json; `.gitattributes` names the path) with %O %A %B %P,
// and reads the result from <ours>.
//
// Every `/plot asap` inserts its rows directly above the first open row and
// appends its entry to the end of the Queue change log, so two plots in flight
// clash on the same two spots although neither touched the other's lines.
// The rows are an ordered list whose order is priority, not a keyed set, so
// this driver does not merge by key the way lessons-merge.mjs does. It takes
// git's own line merge and settles only the clashes that need no judgment:
//   - both sides inserted at the same spot: ours' lines, then theirs' (each
//     side's own order kept; under `git merge origin/main` on a PR branch the
//     branch's newer plot lands on top, which is /plot asap's own rule);
//   - one side inserted beside the clashing lines and the other edited them
//     (a plot above the row a phase PR ticks): the insertion around the edit;
//   - both sides edited different lines of an equal-length clash (two
//     neighbouring rows ticked): each line taken from the side that changed it.
// Anything else (both sides rewrote one line, a deletion against an edit) is
// left as ordinary conflict markers. A result in which a phase id has more
// Status rows than either side had is REFUSED as a whole: a duplicated row
// reddens no lint, so the driver is the only thing that would catch it.
//
// Exit codes: 0 merged cleanly; 1 conflicts left in <ours> for a human.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { conflictText, mergeFile } from './lessons-merge.mjs'

const MARKER = 40
const ROW = /^- \[[^\]]*\](?: \(#\d+\))? Phase (\S+) —/

/**
 * How many Status rows each phase id has.
 * @param {string} text  @returns {Map<string, number>}
 */
export function phaseRowCounts(text) {
  const counts = new Map()
  for (const line of text.split('\n')) {
    const m = ROW.exec(line)
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1)
  }
  return counts
}

/**
 * The lines one side added around an unchanged base: side = before + base, or
 * base + after. Null when the side changed the base itself.
 * @param {string[]} base  @param {string[]} side
 * @returns {{ before: string[], after: string[] } | null}
 */
function around(base, side) {
  const at = (off) => off >= 0 && base.every((l, i) => side[off + i] === l)
  const cut = side.length - base.length
  if (at(cut)) return { before: side.slice(0, cut), after: [] }
  if (at(0)) return { before: [], after: side.slice(base.length) }
  return null
}

/**
 * Settle one clash of git's line merge, or return null to leave it to a human.
 * Pure.
 * @param {string[]} b  base lines  @param {string[]} o  ours  @param {string[]} t  theirs
 * @param {(base: string, ours: string, theirs: string) => string | null} [mergeLine]
 *   Optional: settles one line both sides edited (a table row, cell by cell).
 * @returns {string[] | null}
 */
export function resolveHunk(b, o, t, mergeLine) {
  const ao = around(b, o)
  const at = around(b, t)
  if (ao && at) return [...ao.before, ...at.before, ...b, ...ao.after, ...at.after]
  if (ao) return [...ao.before, ...t, ...ao.after]
  if (at) return [...at.before, ...o, ...at.after]
  if (b.length === o.length && b.length === t.length) {
    const lines = b.map((l, i) => {
      if (o[i] === t[i] || t[i] === l) return o[i]
      if (o[i] === l) return t[i]
      return mergeLine ? mergeLine(l, o[i], t[i]) : null
    })
    if (lines.every((l) => l !== null)) return lines
  }
  return null
}

/**
 * git's line merge of three texts, with every clash that needs no judgment
 * settled; the rest stay as conflict markers. Shared by the other plan merge
 * drivers (deadlines-merge.mjs).
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @param {{ mergeLine?: (base: string, ours: string, theirs: string) => string | null,
 *           tidy?: (settled: string[], base: string[]) => string[] }} [opts]
 *   mergeLine settles one line both sides edited; tidy post-processes each settled clash.
 * @returns {{ text: string, open: number }}
 */
export function settleClashes(base, ours, theirs, opts = {}) {
  const out = mergeFile(base, ours, theirs, ['--diff3', `--marker-size=${MARKER}`])
  const mark = (c) => c.repeat(MARKER)
  const lines = []
  let open = 0
  let part = null
  let hunk = { o: [], b: [], t: [] }
  for (const line of out.split('\n')) {
    if (line.startsWith(mark('<'))) {
      part = 'o'
      hunk = { o: [], b: [], t: [] }
    } else if (part && line.startsWith(mark('|'))) part = 'b'
    else if (part && line.startsWith(mark('='))) part = 't'
    else if (part && line.startsWith(mark('>'))) {
      const settled = resolveHunk(hunk.b, hunk.o, hunk.t, opts.mergeLine)
      if (settled) lines.push(...(opts.tidy ? opts.tidy(settled, hunk.b) : settled))
      else {
        open += 1
        lines.push('<<<<<<< ours', ...hunk.o, '=======', ...hunk.t, '>>>>>>> theirs')
      }
      part = null
    } else if (part) hunk[part].push(line)
    else lines.push(line)
  }
  return { text: lines.join('\n'), open }
}

/**
 * Merge three versions of the build plan.
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @returns {{ ok: true, text: string } | { ok: false, reason: string, text: string }}
 */
export function mergeBuildPlan(base, ours, theirs) {
  const { text, open } = settleClashes(base, ours, theirs)
  if (open) return { ok: false, reason: `${open} clash${open > 1 ? 'es' : ''} both sides edited`, text }

  const [o, t] = [phaseRowCounts(ours), phaseRowCounts(theirs)]
  const dup = [...phaseRowCounts(text)].filter(([id, n]) => n > Math.max(o.get(id) ?? 0, t.get(id) ?? 0)).map(([id]) => id)
  if (dup.length) {
    return { ok: false, reason: `the merge gives Phase ${dup.join(', ')} a second row`, text: conflictText(base, ours, theirs) }
  }
  return { ok: true, text }
}

function main() {
  const [basePath, oursPath, theirsPath, file] = process.argv.slice(2)
  if (!basePath || !oursPath || !theirsPath) {
    process.stderr.write('usage: build-plan-merge.mjs <base> <ours> <theirs> [<path>]\n')
    process.exit(2)
  }
  const [base, ours, theirs] = [basePath, oursPath, theirsPath].map((p) => fs.readFileSync(p, 'utf8'))
  const r = mergeBuildPlan(base, ours, theirs)
  fs.writeFileSync(oursPath, r.text)
  if (r.ok) process.exit(0)
  process.stderr.write(`build-plan-merge: ${file || oursPath}: ${r.reason}; left conflict markers\n`)
  process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
