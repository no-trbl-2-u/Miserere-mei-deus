#!/usr/bin/env node
// scripts/measured-truth.mjs
//
// The measured-truth run (phase R12a). Runs the engine's measured-truth CLI
// (the Act 1 ledger x stat spread x deck table), appends one line to
// `docs/reports/measured/history.jsonl`, rewrites
// `docs/reports/measured/latest.md`, and files a `[content]` row in
// plan/AUDIT.md (plus its issue) for every drift past
// `docs/reports/measured/thresholds.json` against the previous line. A
// measurement, not a gate (D57): it exits 0 whenever it measured, whatever
// the numbers say, and non-zero only when the measurer crashed.
//
// Usage:
//   npm run measured:truth
//   npm run measured:truth -- --dry-run      # print the table, write nothing
//   npm run measured:truth -- --no-issues    # file AUDIT rows but open no issues
//   npm run measured:truth -- --runs=300 --seed=1 --draws=16
//
// `.github/workflows/measured-truth.yml` runs it on mechanics merges to main
// and on Sundays, and commits what it wrote.

import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compare, fileDrifts, historyLine, renderLatest } from './measured-compare.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPORT_DIR = join(ROOT, 'docs/reports/measured')
const HISTORY = join(REPORT_DIR, 'history.jsonl')
const LATEST = join(REPORT_DIR, 'latest.md')
const THRESHOLDS = join(REPORT_DIR, 'thresholds.json')
const AUDIT = join(ROOT, 'plan/AUDIT.md')

const argv = process.argv.slice(2)
const args = new Set(argv)
const DRY_RUN = args.has('--dry-run')
const NO_ISSUES = args.has('--no-issues')
const flag = (k, fallback) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? fallback
const RUNS = flag('runs', '300')
const SEED = flag('seed', '1')
const DRAWS = flag('draws', '16')

function log(msg) { process.stderr.write(`measured-truth: ${msg}\n`) }

/** Reads a file as text, or returns the fallback when it does not exist. */
function readOr(path, fallback) {
  return existsSync(path) ? readFileSync(path, 'utf8') : fallback
}

/** The last history line, or null when there is none. */
function lastHistoryLine() {
  const lines = readOr(HISTORY, '').split('\n').filter((l) => l.trim())
  return lines.length ? JSON.parse(lines[lines.length - 1]) : null
}

/** Runs the engine CLI and parses its JSON report; a crash or no JSON exits 1. */
function measure() {
  const r = spawnSync('npm', [
    'run', '-s', 'measured-truth', '--workspace', 'axiomancer-mechanics', '--',
    '--json', `--runs=${RUNS}`, `--seed=${SEED}`, `--draws=${DRAWS}`,
  ], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
    shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024,
  })
  if (r.status !== 0) {
    log(`the measured-truth CLI exited ${r.status ?? r.signal}`)
    process.exit(1)
  }
  const last = r.stdout.trim().split('\n').pop() ?? ''
  try {
    return JSON.parse(last)
  } catch {
    log(`the measured-truth CLI printed no JSON report: ${last.slice(0, 200)}`)
    process.exit(1)
  }
}

/** Opens the issue for a new `[content]` row; a failure is a warning, never a crash. */
function openIssue(title, body) {
  const dir = mkdtempSync(join(tmpdir(), 'measured-truth-'))
  const bodyFile = join(dir, 'body.md')
  writeFileSync(bodyFile, body)
  const r = spawnSync('node', [
    'scripts/loop-issue.mjs', 'open',
    '--severity', 'med', '--category', 'content', '--source', 'audit',
    '--title', title, '--body-file', bodyFile,
  ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  const number = r.stdout?.trim()
  if (r.status !== 0 || !/^\d+$/.test(number ?? '')) {
    log(`warning: could not open an issue for "${title}"`)
    return null
  }
  return number
}

/** Records an issue number directly under a filed row's heading. */
function addIssueLine(text, title, issue) {
  const lines = text.split('\n')
  const at = lines.indexOf(title)
  if (at === -1) return text
  return [...lines.slice(0, at + 1), `- issue: #${issue}`, ...lines.slice(at + 1)].join('\n')
}

function main() {
  log(`measuring (${RUNS} runs per cell, seed ${SEED}, ${DRAWS} draws per family)`)
  const report = measure()
  const date = new Date().toISOString().slice(0, 10)
  const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim()
  const current = historyLine(report, { date, commit })
  const previous = lastHistoryLine()
  const thresholds = JSON.parse(readOr(THRESHOLDS, '{}'))
  const drifts = compare({ current, previous, thresholds })
  let { text: audit, added, evidenced } = fileDrifts(readOr(AUDIT, ''), drifts, date)
  const latest = renderLatest(current)

  if (DRY_RUN) {
    process.stdout.write(latest)
    for (const { title } of added) log(`would file: ${title}`)
    for (const key of evidenced) log(`would add evidence to: ${key}`)
    log(`dry run: ${current.cells.length} cells, ${drifts.length} drift(s); nothing written`)
    return
  }

  if (!NO_ISSUES) {
    for (const { title } of added) {
      const block = audit.slice(audit.indexOf(title)).split('\n\n')[0]
      const issue = openIssue(title.replace(/^### \[ \] /, ''), `${block}\n\n_Filed by the measured-truth run (\`scripts/measured-truth.mjs\`)._\n`)
      if (issue) audit = addIssueLine(audit, title, issue)
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  appendFileSync(HISTORY, `${JSON.stringify(current)}\n`)
  writeFileSync(LATEST, latest)
  if (drifts.length) writeFileSync(AUDIT, audit)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `drifts=${drifts.length}\n`)
  log(`${current.cells.length} cells, ${drifts.length} drift(s); history appended, latest.md rewritten`)
}

main()
