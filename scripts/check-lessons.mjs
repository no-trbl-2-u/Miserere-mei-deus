#!/usr/bin/env node
// scripts/check-lessons.mjs — lint for the counted lessons ladder (Phase R11).
// Zero dependencies.
//
//   node scripts/check-lessons.mjs                 # lint plan/lessons.md, reflexes.md, NEEDS_T.md
//   node scripts/check-lessons.mjs <lessons> [<reflexes>] [<needs-t>]   # lint other paths (tests, hooks)
//
// The rules (the format lives in the plan/lessons.md header):
//   - every lesson bullet under a `<!-- @domain:x -->` anchor matches
//       - **<slug>** · <trap> → <rule> · seen <N>× · last <YYYY-MM-DD> · open
//     or ends `· guarded by <what>` in place of `open`;
//   - slugs are lowercase-kebab and unique across the file;
//   - each bullet is at most 500 bytes;
//   - at most 40 lessons are `open` (the budget forces graduation);
//   - plan/reflexes.md is at most 50 lines;
//   - a lesson's rule never hands the fix to T ("T to …"): T's moves go
//     in plan/NEEDS_T.md, which has its own one-line format, and no slug
//     sits in both files.
// Run by the root `npm test` (scripts/check-lessons.test.mjs) and by
// .claude/hooks/guard.mjs post-write whenever either file is written. The
// merge driver (scripts/lessons-merge.mjs) imports the caps, row regexes
// and rowMask from here, so the two cannot disagree on a valid row.
//
// Exit codes: 0 clean; 1 findings (one per line on stderr).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const MAX_BYTES = 500
export const MAX_OPEN = 40
export const MAX_REFLEX_LINES = 50

export const LESSON = /^- \*\*([a-z0-9]+(?:-[a-z0-9]+)*)\*\* · (.+) → (.+) · seen (\d+)× · last (\d{4}-\d{2}-\d{2}) · (open|guarded by .+)$/
export const NEEDS_T = /^- \*\*([a-z0-9]+(?:-[a-z0-9]+)*)\*\* · (.+) · blocks: (.+) · workaround: (.+) · seen (\d+)× · last (\d{4}-\d{2}-\d{2})$/
// A rule that hands the fix to T: that item belongs in plan/NEEDS_T.md.
const T_MOVE = /\bT (?:to|must|should|needs to) /

/**
 * Which lines of a lessons or NEEDS_T file are rows. Pure; shared with the
 * merge driver (scripts/lessons-merge.mjs) so both agree on what a row is.
 * A lessons row is a `- ` bullet under a `<!-- @domain:x -->` anchor (until
 * `## Adding a domain`); a NEEDS_T row is a `- ` bullet under `## Open`.
 * @param {string[]} lines
 * @param {'lessons' | 'needs-t'} kind
 * @returns {Array<'row' | 'body' | null>} 'body' is a non-row line inside a lessons domain
 */
export function rowMask(lines, kind) {
  let inRows = false
  return lines.map((line) => {
    if (kind === 'needs-t') {
      if (/^## /.test(line)) {
        inRows = /^## Open\s*$/.test(line)
        return null
      }
      return inRows && line.startsWith('- ') ? 'row' : null
    }
    if (/^<!-- @domain:[a-z0-9-]+ -->$/.test(line)) {
      inRows = true
      return null
    }
    if (/^## Adding a domain/.test(line)) inRows = false
    if (!inRows) return null
    return line.startsWith('- ') ? 'row' : 'body'
  })
}

/**
 * Lint the text of a lessons file. Pure.
 * @param {string} text
 * @returns {{ findings: string[], open: number, lessons: number }}
 */
export function lintLessons(text) {
  const findings = []
  const slugs = new Map()
  let open = 0
  let lessons = 0
  const lines = text.split('\n')
  rowMask(lines, 'lessons').forEach((kind, i) => {
    const n = i + 1
    const line = lines[i]
    if (kind !== 'row') {
      if (kind === 'body' && /^\d+\. /.test(line)) {
        findings.push(`line ${n}: numbered entry — lessons are '- **slug** · …' bullets`)
      }
      return
    }
    lessons += 1
    const bytes = Buffer.byteLength(line, 'utf8')
    if (bytes > MAX_BYTES) findings.push(`line ${n}: ${bytes} bytes (max ${MAX_BYTES})`)
    const m = LESSON.exec(line)
    if (!m) {
      findings.push(`line ${n}: does not match '- **slug** · trap → rule · seen N× · last YYYY-MM-DD · open|guarded by …'`)
      return
    }
    const [, slug, , rule, seen] = m
    if (Number(seen) < 1) findings.push(`line ${n}: seen must be at least 1×`)
    if (slugs.has(slug)) findings.push(`line ${n}: duplicate slug '${slug}' (first on line ${slugs.get(slug)})`)
    else slugs.set(slug, n)
    if (T_MOVE.test(rule)) findings.push(`line ${n}: '${slug}' hands the fix to T: file it in plan/NEEDS_T.md, not as a lesson`)
    if (m[6] === 'open') open += 1
  })
  if (open > MAX_OPEN) findings.push(`${open} open lessons (max ${MAX_OPEN}): guard or merge one before adding another`)
  return { findings, open, lessons, slugs: [...slugs.keys()] }
}

/**
 * Lint the text of plan/NEEDS_T.md, the list of T's own moves. Pure.
 * @param {string} text
 * @param {string[]} [lessonSlugs] slugs already used in lessons.md
 * @returns {{ findings: string[], items: number }}
 */
export function lintNeedsT(text, lessonSlugs = []) {
  const findings = []
  const slugs = new Map()
  const lessons = new Set(lessonSlugs)
  let items = 0
  const lines = text.split('\n')
  rowMask(lines, 'needs-t').forEach((kind, i) => {
    if (kind !== 'row') return
    const n = i + 1
    const line = lines[i]
    items += 1
    const bytes = Buffer.byteLength(line, 'utf8')
    if (bytes > MAX_BYTES) findings.push(`line ${n}: ${bytes} bytes (max ${MAX_BYTES})`)
    const m = NEEDS_T.exec(line)
    if (!m) {
      findings.push(`line ${n}: does not match '- **slug** · what T does · blocks: … · workaround: … · seen N× · last YYYY-MM-DD'`)
      return
    }
    const [, slug, , , , seen] = m
    if (Number(seen) < 1) findings.push(`line ${n}: seen must be at least 1×`)
    if (slugs.has(slug)) findings.push(`line ${n}: duplicate slug '${slug}' (first on line ${slugs.get(slug)})`)
    else slugs.set(slug, n)
    if (lessons.has(slug)) findings.push(`line ${n}: '${slug}' is also a lesson: T's move lives here only`)
  })
  return { findings, items }
}

/**
 * Lint the reflexes file's size. Pure.
 * @param {string} text
 * @returns {string[]}
 */
export function lintReflexes(text) {
  const lines = text.replace(/\n$/, '').split('\n').length
  return lines > MAX_REFLEX_LINES ? [`reflexes.md: ${lines} lines (max ${MAX_REFLEX_LINES})`] : []
}

function main() {
  const [lessonsArg, reflexesArg, needsTArg] = process.argv.slice(2)
  const lessonsPath = path.resolve(lessonsArg || path.join(ROOT, 'plan', 'lessons.md'))
  const reflexesPath = path.resolve(reflexesArg || path.join(ROOT, 'plan', 'reflexes.md'))
  const needsTPath = path.resolve(needsTArg || path.join(ROOT, 'plan', 'NEEDS_T.md'))
  const out = []
  const { findings, open, lessons, slugs } = lintLessons(fs.readFileSync(lessonsPath, 'utf8'))
  out.push(...findings.map((f) => `${path.relative(ROOT, lessonsPath)}: ${f}`))
  if (fs.existsSync(reflexesPath)) out.push(...lintReflexes(fs.readFileSync(reflexesPath, 'utf8')))
  let items = 0
  if (fs.existsSync(needsTPath)) {
    const r = lintNeedsT(fs.readFileSync(needsTPath, 'utf8'), slugs)
    items = r.items
    out.push(...r.findings.map((f) => `${path.relative(ROOT, needsTPath)}: ${f}`))
  }
  if (out.length) {
    process.stderr.write(`${out.join('\n')}\n`)
    process.exit(1)
  }
  process.stdout.write(`check-lessons: ${lessons} lesson(s), ${open} open, ${items} needs-T item(s), format clean\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
