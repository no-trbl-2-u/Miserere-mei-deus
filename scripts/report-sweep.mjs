#!/usr/bin/env node
// scripts/report-sweep.mjs — finds hand-written reports the loop has not filed
// (Phase RS1). Zero dependencies.
//
//   node scripts/report-sweep.mjs            # list unfiled reports, one per line
//   node scripts/report-sweep.mjs --file     # also add one CRITIQUE Pending row each
//   node scripts/report-sweep.mjs --root <dir>   # sweep another tree (tests)
//
// A report is a Markdown file directly under a package's `docs/reports/`
// (`axiomancer-*/docs/reports/*.md`). It is unfiled when it is neither listed
// in `plan/report-sweep-baseline.json` (the reports already handled when the
// sweep began) nor cited by its repo-relative path in `plan/CRITIQUE.md` or
// `plan/AUDIT.md`. The root `docs/reports/` is the loop's own output and is
// never swept. A filed row cites the report's path as its evidence, so the
// next sweep sees it as cited and files nothing twice.
//
// `/march` Step 1 runs it with `--file` after triage (skills/march.md).
//
// Exit codes: 0 always (a sweep is a report, not a gate); 2 on a bad tree.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const BASELINE = 'plan/report-sweep-baseline.json'
export const QUEUES = ['plan/CRITIQUE.md', 'plan/AUDIT.md']
const PACKAGE = /^axiomancer-[^/]+$/

/** Every Markdown file directly under a package `docs/reports/` in `root`, repo-relative, sorted. */
export function listReports(root) {
  const out = []
  for (const pkg of fs.readdirSync(root, { withFileTypes: true })) {
    if (!pkg.isDirectory() || !PACKAGE.test(pkg.name)) continue
    const dir = path.join(root, pkg.name, 'docs', 'reports')
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.isFile() && f.name.endsWith('.md')) out.push(`${pkg.name}/docs/reports/${f.name}`)
    }
  }
  return out.sort()
}

/** The baselined paths: `{ "reports": ["axiomancer-…/docs/reports/x.md", …] }`. */
export function readBaseline(root) {
  const file = path.join(root, BASELINE)
  if (!fs.existsSync(file)) return new Set()
  return new Set(JSON.parse(fs.readFileSync(file, 'utf8')).reports ?? [])
}

/** The text of the queues a citation is looked for in. */
export function readQueues(root) {
  return QUEUES.map((q) => path.join(root, q))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n')
}

/** Reports neither baselined nor cited by path in the queue text. */
export function unfiled(reports, baseline, queueText) {
  return reports.filter((r) => !baseline.has(r) && !queueText.includes(r))
}

/** `<short sha> <date>` of the last commit touching `rel`, or null when it has none. */
export function lastCommit(root, rel) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%h %cs', '--', rel], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return out || null
  } catch {
    return null
  }
}

/** The CRITIQUE Pending row for one unfiled report. */
export function critiqueRow(rel, commit) {
  const at = commit ? `commit ${commit.split(' ')[0]}` : 'uncommitted'
  return [
    `### [MED] unfiled report \`${rel}\`: read it and file its findings`,
    `- pass: report sweep (${at})`,
    '- viewport: n/a',
    '- category: process',
    `- observation: a hand-written report landed under a package's \`docs/reports/\` with no CRITIQUE or AUDIT row citing it, so its findings had not reached the loop. Read it, file each finding as its own CRITIQUE or AUDIT row (or record that it holds none), and move this row to Done.`,
    `- evidence: \`${rel}\`${commit ? ` (last commit ${commit})` : ''}`,
    '- suggested fix: one row per finding in the queue it belongs to; a finding already shipped or filed is noted and skipped.',
    '- source: report-sweep (scripts/report-sweep.mjs)',
  ].join('\n')
}

/**
 * `critique` with `rows` added to `## Pending`, after the HIGH rows and before
 * the first MED or LOW one, each followed by the file's two blank lines.
 */
export function addPendingRows(critique, rows) {
  if (!rows.length) return critique
  const lines = critique.split('\n')
  const start = lines.findIndex((l) => l === '## Pending')
  if (start < 0) throw new Error('plan/CRITIQUE.md has no "## Pending" heading')
  let at = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i]) || (/^### /.test(lines[i]) && !/^### \[HIGH\]/.test(lines[i]))) {
      at = i
      break
    }
  }
  const block = rows.flatMap((r) => [...r.split('\n'), '', ''])
  // Before a following `## ` heading, keep the blank run that already precedes it.
  if (/^## /.test(lines[at] ?? '')) {
    let b = at
    while (b > start + 1 && lines[b - 1] === '') b--
    lines.splice(b, 0, '', '', ...block.slice(0, -2))
  } else {
    lines.splice(at, 0, ...block)
  }
  return lines.join('\n')
}

/** Run the sweep on `root`; with `file`, write the rows into its CRITIQUE. */
export function sweep(root, { file = false } = {}) {
  const found = unfiled(listReports(root), readBaseline(root), readQueues(root))
    .map((rel) => ({ rel, commit: lastCommit(root, rel) }))
  if (file && found.length) {
    const critiquePath = path.join(root, 'plan/CRITIQUE.md')
    const text = fs.readFileSync(critiquePath, 'utf8')
    fs.writeFileSync(critiquePath, addPendingRows(text, found.map((f) => critiqueRow(f.rel, f.commit))))
  }
  return found
}

function main(argv) {
  const rootAt = argv.indexOf('--root')
  const root = rootAt >= 0 ? path.resolve(argv[rootAt + 1]) : ROOT
  const file = argv.includes('--file')
  let found
  try {
    found = sweep(root, { file })
  } catch (err) {
    console.error(`report-sweep: ${err.message}`)
    process.exit(2)
  }
  if (!found.length) {
    console.log('report-sweep: no unfiled reports')
    return
  }
  for (const f of found) console.log(`${f.rel}  ${f.commit ?? '(uncommitted)'}`)
  console.log(`report-sweep: ${found.length} unfiled${file ? ', filed to plan/CRITIQUE.md Pending' : ''}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
