#!/usr/bin/env node
// scripts/lessons-merge.mjs — git merge driver for plan/lessons.md and
// plan/NEEDS_T.md (Phase ML1a). Zero dependencies.
//
//   node scripts/lessons-merge.mjs <base> <ours> <theirs> [<path>]
//
// Git runs it as `merge.lessons.driver` (registered by the SessionStart hook
// in .claude/settings.json; `.gitattributes` names the two paths) with
// %O %A %B %P, and reads the result from <ours>.
//
// A line merge keeps both copies of a lesson two branches each bumped, with
// no conflict markers, so check-lessons went red on whatever branch got it.
// This driver merges rows by slug instead:
//   - a slug on both sides becomes one row: the higher `seen`, the later
//     `last`, `guarded by` over `open`, and the citation list at the end of
//     the trap unioned in first-seen order;
//   - a row only one side has or changed is taken as that side wrote it, and
//     untouched rows keep their place (the file's line order comes from a
//     real diff3 of the file with every row replaced by its slug);
//   - anything it cannot settle without guessing (both sides rewrote the
//     rule, a row deleted on one side and changed on the other, a malformed
//     row, a clash outside the rows) or a result check-lessons rejects (the
//     byte cap, the open cap) is REFUSED: it writes ordinary conflict markers
//     to <ours> and exits 1, so a human chooses what to shorten.
// The caps, row regexes and row detection are imported from
// check-lessons.mjs so the lint and the driver cannot drift.
//
// Exit codes: 0 merged cleanly; 1 refused (conflict markers left in <ours>).

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LESSON, NEEDS_T, lintLessons, lintNeedsT, rowMask } from './check-lessons.mjs'

const TOKEN = '@@lessons-merge-row@@ '
const MARKER = 40

class Refusal extends Error {}
const refuse = (reason) => {
  throw new Refusal(reason)
}

/** @param {string} file repo-relative or absolute path @returns {'lessons' | 'needs-t'} */
export function kindFor(file) {
  return path.basename(file || '') === 'NEEDS_T.md' ? 'needs-t' : 'lessons'
}

/**
 * Split one side into its rows (by slug) and a skeleton with each row
 * replaced by a slug token.
 * @param {string} text  @param {'lessons' | 'needs-t'} kind  @param {string} side
 */
function parse(text, kind, side) {
  const lines = text.split('\n')
  const re = kind === 'lessons' ? LESSON : NEEDS_T
  const rows = new Map()
  const skeleton = rowMask(lines, kind).map((mask, i) => {
    const line = lines[i]
    if (line.startsWith(TOKEN)) refuse(`${side} line ${i + 1} looks like a merge token`)
    if (mask !== 'row') return line
    const m = re.exec(line)
    if (!m) refuse(`${side} line ${i + 1} is not a well-formed row`)
    if (rows.has(m[1])) refuse(`${side} already has two rows for '${m[1]}'`)
    rows.set(m[1], { line, m })
    return TOKEN + m[1]
  })
  return { rows, skeleton }
}

/** Three-way pick of one field; undefined when both sides changed it differently. */
function pick3(b, o, t) {
  if (o === t) return o
  if (b !== undefined && o === b) return t
  if (b !== undefined && t === b) return o
  return undefined
}

/**
 * Union the parenthesised citation list that ends a trap, when the two traps
 * differ only inside it: ours' text kept, theirs' new ids appended.
 * @param {string} o  @param {string} t
 * @returns {string | undefined}
 */
export function unionCitations(o, t) {
  const re = /^(.*)\(([^()]*)\)([^()]*)$/s
  const mo = re.exec(o)
  const mt = re.exec(t)
  if (!mo || !mt || mo[1] !== mt[1] || mo[3] !== mt[3]) return undefined
  const ids = (s) => s.split(/[;,]\s*/).map((x) => x.trim()).filter(Boolean)
  const have = ids(mo[2])
  const extra = ids(mt[2]).filter((id) => !have.includes(id))
  if (!extra.length) return o
  const sep = /;/.test(mo[2] + mt[2]) ? '; ' : ', '
  return `${mo[1]}(${[mo[2].trim(), ...extra].filter(Boolean).join(sep)})${mo[3]}`
}

/**
 * Merge the rows one slug has on each side. Pure.
 * @param {{line: string, m: RegExpExecArray} | undefined} b
 * @param {{line: string, m: RegExpExecArray}} o
 * @param {{line: string, m: RegExpExecArray}} t
 * @param {'lessons' | 'needs-t'} kind
 * @returns {string}
 */
function mergeRow(b, o, t, kind) {
  if (o.line === t.line) return o.line
  if (b && o.line === b.line) return t.line
  if (b && t.line === b.line) return o.line
  const slug = o.m[1]
  const field = (i, name) => {
    const v = pick3(b?.m[i], o.m[i], t.m[i])
    if (v === undefined) refuse(`both sides changed the ${name} of '${slug}'`)
    return v
  }
  const seenIdx = kind === 'lessons' ? 4 : 5
  const seen = Math.max(Number(o.m[seenIdx]), Number(t.m[seenIdx]))
  const last = [o.m[seenIdx + 1], t.m[seenIdx + 1]].sort()[1]
  if (kind === 'needs-t') {
    return `- **${slug}** · ${field(2, 'move')} · blocks: ${field(3, 'blocks')} · workaround: ${field(4, 'workaround')} · seen ${seen}× · last ${last}`
  }
  const trap = pick3(b?.m[2], o.m[2], t.m[2]) ?? unionCitations(o.m[2], t.m[2])
  if (trap === undefined) refuse(`both sides rewrote the trap of '${slug}'`)
  const rule = field(3, 'rule')
  const [so, st] = [o.m[6], t.m[6]]
  let status
  if (so === 'open' && st !== 'open') status = st
  else if (st === 'open' && so !== 'open') status = so
  else status = field(6, 'guard')
  return `- **${slug}** · ${trap} → ${rule} · seen ${seen}× · last ${last} · ${status}`
}

/**
 * `git merge-file --diff3` on three texts, run in a scratch directory.
 * @returns {string}
 */
function mergeFile(base, ours, theirs, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-merge-'))
  try {
    for (const [name, text] of Object.entries({ ours, base, theirs })) fs.writeFileSync(path.join(dir, name), text)
    try {
      return execFileSync('git', ['merge-file', '-p', ...extra, 'ours', 'base', 'theirs'], {
        cwd: dir,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
    } catch (err) {
      // merge-file exits with the conflict count; a positive count still printed the merge
      if (typeof err.status === 'number' && err.status > 0 && err.status < 128 && typeof err.stdout === 'string') return err.stdout
      throw err
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Line order: a diff3 of the skeletons. A clash made only of row tokens keeps
 * both sides (ours first); a clash touching any other line is refused.
 * @param {string[]} b  @param {string[]} o  @param {string[]} t
 * @returns {string[]}
 */
function mergeSkeleton(b, o, t) {
  const out = mergeFile(b.join('\n'), o.join('\n'), t.join('\n'), ['--diff3', `--marker-size=${MARKER}`])
  const mark = (c) => c.repeat(MARKER)
  const merged = []
  let part = null
  let hunk = { ours: [], theirs: [] }
  for (const line of out.split('\n')) {
    if (line.startsWith(mark('<'))) {
      part = 'ours'
      hunk = { ours: [], theirs: [] }
    } else if (part && line.startsWith(mark('|'))) part = 'base'
    else if (part && line.startsWith(mark('='))) part = 'theirs'
    else if (part && line.startsWith(mark('>'))) {
      const lines = [...hunk.ours, ...hunk.theirs]
      if (lines.some((l) => !l.startsWith(TOKEN))) refuse('both sides changed the same lines outside the rows')
      merged.push(...lines)
      part = null
    } else if (part === 'ours' || part === 'theirs') hunk[part].push(line)
    else if (part !== 'base') merged.push(line)
  }
  return merged
}

/**
 * Merge three versions of a lessons or NEEDS_T file by slug. Pure apart from
 * the scratch `git merge-file` it runs for line order.
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @param {'lessons' | 'needs-t'} kind
 * @returns {{ ok: true, text: string } | { ok: false, reason: string }}
 */
export function mergeLessons(base, ours, theirs, kind = 'lessons') {
  try {
    const B = parse(base, kind, 'base')
    const O = parse(ours, kind, 'ours')
    const T = parse(theirs, kind, 'theirs')
    const rows = new Map()
    for (const slug of new Set([...B.rows.keys(), ...O.rows.keys(), ...T.rows.keys()])) {
      const [b, o, t] = [B.rows.get(slug), O.rows.get(slug), T.rows.get(slug)]
      if (o && t) rows.set(slug, mergeRow(b, o, t, kind))
      else if (!b) rows.set(slug, (o || t).line)
      else if (o && o.line !== b.line) refuse(`'${slug}' was deleted by theirs and changed by ours`)
      else if (t && t.line !== b.line) refuse(`'${slug}' was deleted by ours and changed by theirs`)
    }
    const emitted = new Set()
    const lines = []
    for (const line of mergeSkeleton(B.skeleton, O.skeleton, T.skeleton)) {
      if (!line.startsWith(TOKEN)) {
        lines.push(line)
        continue
      }
      const slug = line.slice(TOKEN.length)
      if (!rows.has(slug) || emitted.has(slug)) continue
      emitted.add(slug)
      lines.push(rows.get(slug))
    }
    const lost = [...rows.keys()].filter((s) => !emitted.has(s))
    if (lost.length) refuse(`no place for ${lost.join(', ')}`)
    const text = lines.join('\n')
    const { findings } = kind === 'lessons' ? lintLessons(text) : lintNeedsT(text)
    if (findings.length) refuse(`the merge breaks check-lessons: ${findings.join('; ')}`)
    return { ok: true, text }
  } catch (err) {
    if (err instanceof Refusal) return { ok: false, reason: err.message }
    throw err
  }
}

/**
 * What a refusal leaves behind: git's own line merge with ordinary markers,
 * or the two whole sides between markers when the line merge was clean (a
 * clean line merge is how the duplicate rows used to slip through).
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @returns {string}
 */
export function conflictText(base, ours, theirs) {
  const out = mergeFile(base, ours, theirs, ['-L', 'ours', '-L', 'base', '-L', 'theirs'])
  if (/^<{7} /m.test(out)) return out
  const nl = (s) => (s.endsWith('\n') ? s : `${s}\n`)
  return `<<<<<<< ours\n${nl(ours)}=======\n${nl(theirs)}>>>>>>> theirs\n`
}

function main() {
  const [basePath, oursPath, theirsPath, file] = process.argv.slice(2)
  if (!basePath || !oursPath || !theirsPath) {
    process.stderr.write('usage: lessons-merge.mjs <base> <ours> <theirs> [<path>]\n')
    process.exit(2)
  }
  const [base, ours, theirs] = [basePath, oursPath, theirsPath].map((p) => fs.readFileSync(p, 'utf8'))
  const r = mergeLessons(base, ours, theirs, kindFor(file))
  if (r.ok) {
    fs.writeFileSync(oursPath, r.text)
    process.exit(0)
  }
  fs.writeFileSync(oursPath, conflictText(base, ours, theirs))
  process.stderr.write(`lessons-merge: refused ${file || oursPath}: ${r.reason}; left conflict markers\n`)
  process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
