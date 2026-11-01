#!/usr/bin/env node
// scripts/check-plan-queues.mjs — structural lint for the plan queue files
// (Phase LG1a). Zero dependencies.
//
//   node scripts/check-plan-queues.mjs            # lint the four live queues
//   node scripts/check-plan-queues.mjs <path>...  # lint other paths (tests); kind from the file name
//
// The queues are plan/AUDIT.md, plan/CRITIQUE.md, plan/CANDIDATES.md
// (each a list of `### ` rows with `- key:` bodies) and, while a repo still
// has one, the Status block of a v1 build plan (`- [<status>] Phase <id> — …`
// rows with six-space continuation lines). Since the nexus v2 cut-over (NX1d)
// Miserere has no build plan: its specs and roadmap are linted by
// scripts/plan-check.mjs, and the status lint runs only on a path given. pr-resolve union-merges them, so a bad
// merge can cut a row apart (c95114a2: a header left with one body line, its
// observation and evidence glued under the next row; 49829988: a header left
// with its issue line, then eleven blank lines). The rules:
//   - each row header has its file's shape: checkbox and tags (`headerFault`);
//   - its body sits directly under it: the header is preceded by a blank
//     line or a section heading and followed at once by a `- ` bullet, and
//     no fixed field of the file's row schema appears twice in one row;
//   - no row repeats (the same header twice; the same phase id twice);
//   - no run of blank lines is longer than the file's norm.
// Run by the root `npm test` (scripts/check-plan-queues.test.mjs), so
// verify-gate fails a push that splits a row.
//
// Exit codes: 0 clean; 1 findings (one per line on stderr).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const CHECKBOX = String.raw`\[[ x]\]`

/**
 * Each queue file's row shape. `tag` is one bracketed tag after the optional
 * checkbox; `fields` are the row schema's fixed keys, each allowed once per
 * row; `maxBlank` is the longest blank run the file carries today.
 */
export const QUEUES = {
  audit: {
    file: 'plan/AUDIT.md',
    tag: String.raw`\[[^\]\n]+\]`,
    shape: '### [ ]|[x] [tag]… <title>',
    fields: ['category', 'detail', 'impact', 'ease', 'next'],
    maxBlank: 1,
  },
  critique: {
    file: 'plan/CRITIQUE.md',
    tag: String.raw`\[(?:HIGH|MED|LOW)\]`,
    shape: '### [x]? [HIGH|MED|LOW] <title>',
    tagRequired: true,
    // A Pending row is open; a Done row is ticked.
    sections: { Pending: 'open', Done: 'ticked' },
    fields: ['pass', 'viewport', 'category', 'observation', 'evidence', 'suggested fix', 'source'],
    maxBlank: 2,
  },
  candidates: {
    file: 'plan/CANDIDATES.md',
    tag: String.raw`\[(?:owner|score \d+(?:\.\d+)?)\]`,
    shape: '### [ ]|[x] [owner]? [score N]? <title>',
    fields: ['proposed', 'source signals', 'rationale', 'proposed scope', 'conflicts', 'estimated phases'],
    maxBlank: 2,
  },
}

export const STATUS = {
  file: 'plan/steps/01_build_plan.md',
  heading: '## Status (at-a-glance)',
  row: /^- \[( |x|-|skipped|blocked: [^\]]+)\] (?:\(#\d+\) )?Phase ([A-Za-z0-9.]+)\b/,
  maxBlank: 1,
}

/** The kind of queue a path names, by file name. */
export function kindOf(file) {
  const base = path.basename(file)
  if (base.includes('AUDIT')) return 'audit'
  if (base.includes('CRITIQUE')) return 'critique'
  if (base.includes('CANDIDATES')) return 'candidates'
  if (base.includes('build_plan')) return 'status'
  return null
}

/**
 * Why a `### ` header does not have its queue's shape, or null. Pure.
 * @param {string} line
 * @param {keyof typeof QUEUES} kind
 * @param {string} [section] the `## ` heading the row sits under
 */
export function headerFault(line, kind, section = '') {
  const q = QUEUES[kind]
  const tags = q.tagRequired ? `(?:${q.tag} ?)+` : `(?:${q.tag} ?)*`
  const m = new RegExp(`^### (${CHECKBOX} )?${tags}([^\\s\\[].*)$`).exec(line)
  if (!m || !m[2].trim()) return `header does not match '${q.shape}'`
  const want = q.sections?.[section.replace(/^## /, '').trim()]
  if (want === 'open' && m[1] === '[x] ') return `ticked row under '${section}'`
  if (want === 'ticked' && m[1] !== '[x] ') return `open row under '${section}'`
  return null
}

function blankRuns(lines, max, from = 0, to = lines.length) {
  const findings = []
  let run = 0
  for (let i = from; i <= to; i++) {
    if (i < to && lines[i].trim() === '') {
      run += 1
      continue
    }
    if (run > max) findings.push(`line ${i - run + 1}: ${run} blank lines in a row (max ${max})`)
    run = 0
  }
  return findings
}

/**
 * Lint a `### `-row queue file (AUDIT, CRITIQUE, PHASE_CANDIDATES). Pure.
 * @param {string} text
 * @param {keyof typeof QUEUES} kind
 * @returns {{ findings: string[], rows: number }}
 */
export function lintQueue(text, kind) {
  const q = QUEUES[kind]
  const lines = text.split('\n')
  const findings = []
  const seen = new Map()
  const fieldRe = new RegExp(`^- (${q.fields.join('|')}):`)
  let section = ''
  let row = null
  let rows = 0
  lines.forEach((line, i) => {
    const n = i + 1
    if (/^#{1,2} /.test(line)) {
      section = line.startsWith('## ') ? line : section
      row = null
      return
    }
    if (!line.startsWith('### ')) {
      const m = row && fieldRe.exec(line)
      if (m) {
        if (row.fields.has(m[1])) {
          findings.push(`line ${n}: '- ${m[1]}:' twice in the row at line ${row.n} (another row's body is under it)`)
        }
        row.fields.add(m[1])
      }
      return
    }
    rows += 1
    row = { n, fields: new Set() }
    const fault = headerFault(line, kind, section)
    if (fault) findings.push(`line ${n}: ${fault}`)
    const prev = lines[i - 1] ?? ''
    if (prev.trim() !== '' && !/^#{1,2} /.test(prev)) {
      findings.push(`line ${n}: header follows line ${n - 1} with no blank line (the row above was cut short)`)
    }
    if (!(lines[i + 1] ?? '').startsWith('- ')) {
      findings.push(`line ${n}: the row's body does not start on the next line with a '- ' bullet`)
    }
    if (seen.has(line)) findings.push(`line ${n}: the row at line ${seen.get(line)} repeats`)
    else seen.set(line, n)
  })
  findings.push(...blankRuns(lines, q.maxBlank))
  return { findings, rows }
}

/**
 * Lint the Status block of the build plan. Pure.
 * @param {string} text
 * @returns {{ findings: string[], rows: number }}
 */
export function lintStatus(text) {
  const lines = text.split('\n')
  const start = lines.findIndex((l) => l.trim() === STATUS.heading)
  if (start < 0) return { findings: [`no '${STATUS.heading}' heading`], rows: 0 }
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l))
  if (end < 0) end = lines.length
  const findings = []
  const ids = new Map()
  let rows = 0
  let inRow = false
  for (let i = start + 1; i < end; i++) {
    const line = lines[i]
    const n = i + 1
    if (line.startsWith('- [')) {
      rows += 1
      inRow = true
      const m = STATUS.row.exec(line)
      if (!m) {
        findings.push(`line ${n}: does not match '- [ |x|-|skipped|blocked: …] (#N)? Phase <id> — …'`)
        continue
      }
      if (ids.has(m[2])) findings.push(`line ${n}: Phase ${m[2]} repeats (first on line ${ids.get(m[2])})`)
      else ids.set(m[2], n)
      continue
    }
    if (/^ {2,}\S/.test(line)) {
      if (!inRow) findings.push(`line ${n}: an indented row line with no row above it (the row was cut apart)`)
      continue
    }
    inRow = false
  }
  findings.push(...blankRuns(lines, STATUS.maxBlank, start + 1, end))
  return { findings, rows }
}

/** Lint one file by kind. Pure. */
export function lintFile(text, kind) {
  return kind === 'status' ? lintStatus(text) : lintQueue(text, kind)
}

function main() {
  const args = process.argv.slice(2)
  const files = args.length
    ? args.map((a) => path.resolve(a))
    : [...Object.values(QUEUES).map((q) => q.file), STATUS.file].map((f) => path.join(ROOT, f)).filter((f) => f !== path.join(ROOT, STATUS.file) || fs.existsSync(f))
  const out = []
  const counts = []
  for (const file of files) {
    const kind = kindOf(file)
    const rel = path.relative(ROOT, file)
    if (!kind) {
      out.push(`${rel}: not a plan queue file`)
      continue
    }
    const { findings, rows } = lintFile(fs.readFileSync(file, 'utf8'), kind)
    out.push(...findings.map((f) => `${rel}: ${f}`))
    counts.push(`${path.basename(file)} ${rows}`)
  }
  if (out.length) {
    process.stderr.write(`${out.join('\n')}\n`)
    process.exit(1)
  }
  process.stdout.write(`check-plan-queues: ${counts.join(', ')} row(s), structure clean\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
