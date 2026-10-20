#!/usr/bin/env node
// scripts/perf-audit.mjs
//
// The weekly performance audit. Runs the engine bench and the web measurer
// three times each, keeps the median of every metric, checks it against
// `docs/reports/perf/budgets.json` and the last line of
// `docs/reports/perf/history.jsonl`, appends this run to the history and
// files a `[perf]` row in plan/AUDIT.md (plus its issue) for every finding.
// Report-only: it exits 0 whenever it measured, whatever the numbers say,
// and non-zero only when a measurer crashed.
//
// Usage:
//   npm run perf:audit
//   npm run perf:audit -- --dry-run         # print everything, write nothing
//   npm run perf:audit -- --seed-budgets    # write budgets.json from this run
//
// `.github/workflows/perf-audit.yml` runs it every Sunday and commits what it wrote.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { cpus, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { addIssueLine, budgetRunnerMismatch, compare, fileFindings, runnerChange, seedBudgets, summarize } from './perf-compare.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPORT_DIR = join(ROOT, 'docs/reports/perf')
const BUDGETS = join(REPORT_DIR, 'budgets.json')
const HISTORY = join(REPORT_DIR, 'history.jsonl')
const AUDIT = join(ROOT, 'plan/AUDIT.md')
const RUNS = 3

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SEED = args.has('--seed-budgets')

function log(msg) { process.stderr.write(`perf-audit: ${msg}\n`) }

/**
 * Runs a measurer and parses the JSON object on the last line of its stdout.
 * A measurer that exits non-zero or prints no JSON is a broken audit.
 *
 * @param {string} label name for the log.
 * @param {string} cmd executable.
 * @param {string[]} argv arguments.
 * @param {object} [opts] spawn options (cwd, env).
 * @returns {object} the parsed result.
 */
function measure(label, cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: process.platform === 'win32',
    maxBuffer: 16 * 1024 * 1024,
    ...opts,
  })
  if (r.status !== 0) {
    log(`${label} exited ${r.status ?? r.signal}`)
    process.exit(1)
  }
  const last = r.stdout.trim().split('\n').pop() ?? ''
  try {
    return JSON.parse(last)
  } catch {
    log(`${label} printed no JSON result: ${last.slice(0, 200)}`)
    process.exit(1)
  }
}

/** Reads a file as text, or returns the fallback when it does not exist. */
function readOr(path, fallback) {
  return existsSync(path) ? readFileSync(path, 'utf8') : fallback
}

/** The last history line, or null when there is none. */
function lastHistoryLine() {
  const lines = readOr(HISTORY, '').split('\n').filter((l) => l.trim())
  return lines.length ? JSON.parse(lines[lines.length - 1]) : null
}

/** Opens the issue for a new `[perf]` row; a failure is a warning, never a crash. */
function openIssue(title, body) {
  const dir = mkdtempSync(join(tmpdir(), 'perf-audit-'))
  const bodyFile = join(dir, 'body.md')
  writeFileSync(bodyFile, body)
  const r = spawnSync('node', [
    'scripts/loop-issue.mjs', 'open',
    '--severity', 'med', '--category', 'perf', '--source', 'audit',
    '--title', title, '--body-file', bodyFile,
  ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  const number = r.stdout?.trim()
  if (r.status !== 0 || !/^\d+$/.test(number ?? '')) {
    log(`warning: could not open an issue for "${title}"`)
    return null
  }
  return number
}

function main() {
  const runs = []
  for (let i = 0; i < RUNS; i++) {
    log(`run ${i + 1}/${RUNS}: engine bench`)
    const engine = measure('perf-bench', 'npm', ['run', '-s', 'perf-bench', '--workspace', 'axiomancer-mechanics'])
    log(`run ${i + 1}/${RUNS}: web`)
    // perf-web reuses the shared export on a stamp hit, so only a stale
    // first run exports.
    const web = measure('perf-web', 'node', ['scripts/perf-web.mjs'], {
      cwd: join(ROOT, 'axiomancer-mobile'),
    })
    runs.push({ ...web, ...engine })
  }

  const metrics = summarize(runs)
  const date = new Date().toISOString().slice(0, 10)
  const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim()
  const runner = { cpu: cpus()[0]?.model?.trim() ?? 'unknown', cores: cpus().length }
  const current = { date, commit, runner, metrics }
  const previous = lastHistoryLine()
  const budgets = SEED ? { runner: runner.cpu, ...seedBudgets(metrics) } : JSON.parse(readOr(BUDGETS, '{}'))
  const notes = [runnerChange(current, previous), budgetRunnerMismatch(current, budgets)].filter(Boolean)
  if (notes.length) current.note = notes.join('; ')

  const findings = compare({ current, previous, budgets })
  const ctx = { commit, previousCommit: previous?.commit }
  let { text: audit, added, evidenced } = fileFindings(readOr(AUDIT, ''), findings, date, ctx)

  process.stdout.write(`${JSON.stringify({ history: current, budgets, findings }, null, 2)}\n`)
  for (const { title } of added) log(`would file: ${title}`)
  for (const metric of evidenced) log(`evidence on the open ${metric} row`)
  if (DRY_RUN) {
    log(`dry run: ${findings.length} finding(s); nothing written`)
    return
  }

  for (const { title } of added) {
    const block = audit.slice(audit.indexOf(title)).split('\n\n')[0]
    const issue = openIssue(title.replace(/^### \[ \] /, ''), `${block}\n\n_Filed by the weekly performance audit (\`scripts/perf-audit.mjs\`)._\n`)
    if (issue) audit = addIssueLine(audit, title, issue)
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  if (SEED) writeFileSync(BUDGETS, `${JSON.stringify(budgets, null, 2)}\n`)
  appendFileSync(HISTORY, `${JSON.stringify(current)}\n`)
  if (findings.length) writeFileSync(AUDIT, audit)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `findings=${findings.length}\n`)
  log(`${findings.length} finding(s); history appended${SEED ? ', budgets seeded' : ''}`)
}

main()
