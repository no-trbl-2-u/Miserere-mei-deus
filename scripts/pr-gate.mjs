#!/usr/bin/env node
// scripts/pr-gate.mjs
//
// The decision behind the `verify-gate` check (phase RV1a,
// `plan/README.md` A2). Path-filtered
// `verify-*` workflows cannot be required checks: a required
// `verify-mobile` that never runs on a mechanics-only PR blocks it forever.
// `verify-gate` always reports instead: green only when every `verify-*`
// the diff triggers is green on the PR's head. Every changed path must be
// owned by some `verify-*` filter or be loop bookkeeping; a path neither
// owns fails the gate, named with the filter nearest it by directory
// (phase LG1b), so a new directory cannot stay unverified for good.
//
//   node scripts/pr-gate.mjs classify --pr <n>            # exits 1 on an unowned path
//   node scripts/pr-gate.mjs wait --pr <n> --head <sha> [--timeout-min 45] [--interval-s 30]
//
// The decision (`decideGate`) is pure; only `main` reads GitHub.

import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { classifyPaths, parseWorkflowFilter } from './eval/ledger-lib.mjs'

/** Conclusions that count as a pass; `skipped` means every job's own `if` declined. */
export const PASSING = Object.freeze(['success', 'skipped', 'neutral'])

/** How long `wait` polls before it reports red with the reason. */
export const WAIT_CAP_MINUTES = 45

/**
 * The latest run of each workflow file on the head, by creation time, so a
 * re-run replaces the run it repeats.
 *
 * @param {{ path: string, status: string, conclusion: string|null, createdAt: string }[]} runs workflow runs on the head.
 * @returns {Map<string, object>} keyed by workflow file name (`verify-mobile.yml`).
 */
export function latestByWorkflow(runs) {
  const out = new Map()
  for (const r of runs) {
    const file = r.path.split('/').pop()
    const had = out.get(file)
    if (!had || r.createdAt > had.createdAt) out.set(file, r)
  }
  return out
}

/**
 * A filter entry's literal directory: its segments up to the first glob,
 * without the file or `**` it ends on.
 *
 * @param {string} pattern a `paths:` entry.
 * @returns {string[]} the directory segments.
 * @example patternDir('axiomancer-mobile/state/presenters/*.copy.ts') // ['axiomancer-mobile', 'state', 'presenters']
 */
export function patternDir(pattern) {
  const segs = pattern.split('/').slice(0, -1)
  const glob = segs.findIndex((s) => /[*?[]/.test(s))
  return glob < 0 ? segs : segs.slice(0, glob)
}

/**
 * The workflow whose filter would own an unowned path by directory: the one
 * with an entry sharing the most leading directories with it. Ties go to the
 * first workflow in the list (they arrive sorted by file name).
 *
 * @param {string} path an unowned changed path.
 * @param {{ file: string, paths: string[] }[]} workflows the parsed `verify-*` filters.
 * @returns {{ file: string, pattern: string }|null} null when no entry shares a directory.
 * @example nearestOwner('scripts/new.mjs', [{ file: 'verify-drift.yml', paths: ['scripts/content-drift.mjs'] }]).file // 'verify-drift.yml'
 */
export function nearestOwner(path, workflows) {
  const dirs = path.split('/').slice(0, -1)
  let best = null
  let bestShared = 0
  for (const wf of workflows) {
    for (const pattern of wf.paths) {
      if (pattern.startsWith('!')) continue
      const pd = patternDir(pattern)
      let shared = 0
      while (shared < pd.length && shared < dirs.length && pd[shared] === dirs[shared]) shared++
      if (shared > bestShared) { best = { file: wf.file, pattern }; bestShared = shared }
    }
  }
  return best
}

/**
 * The gate's state for one head.
 *
 * @param {string[]} files the PR's changed paths.
 * @param {{ file: string, name: string, paths: string[] }[]} workflows the parsed `verify-*` pull_request filters.
 * @param {{ path: string, status: string, conclusion: string|null, createdAt: string }[]} runs `pull_request` workflow runs on the head.
 * @returns {{ state: 'green'|'red'|'wait', triggered: string[], uncovered: string[], unowned: { path: string, nearest: { file: string, pattern: string }|null }[], passed: string[], pending: string[], failed: { file: string, conclusion: string }[] }} the decision; any unowned path makes it red.
 * @example decideGate(['plan/x.md'], [], []).state // 'green'
 */
export function decideGate(files, workflows, runs) {
  const { triggered, uncovered } = classifyPaths(files, workflows)
  const latest = latestByWorkflow(runs)
  const passed = []
  const pending = []
  const failed = []
  for (const file of triggered) {
    const run = latest.get(file)
    if (!run || run.status !== 'completed') pending.push(file)
    else if (PASSING.includes(run.conclusion)) passed.push(file)
    else failed.push({ file, conclusion: run.conclusion ?? 'unknown' })
  }
  const unowned = uncovered.map((path) => ({ path, nearest: nearestOwner(path, workflows) }))
  const state = failed.length || unowned.length ? 'red' : pending.length ? 'wait' : 'green'
  return { state, triggered, uncovered, unowned, passed, pending, failed }
}

/**
 * The one-paragraph summary the job prints and writes to the step summary.
 *
 * @param {ReturnType<typeof decideGate>} d the decision.
 * @returns {string} markdown.
 */
export function describe(d) {
  const lines = [`verify-gate: ${d.state}`]
  lines.push(`- triggered: ${d.triggered.join(', ') || 'none'}`)
  if (d.passed.length) lines.push(`- green: ${d.passed.join(', ')}`)
  if (d.pending.length) lines.push(`- waiting on: ${d.pending.join(', ')}`)
  if (d.failed.length) lines.push(`- red: ${d.failed.map((f) => `${f.file} (${f.conclusion})`).join(', ')}`)
  if (!d.unowned.length) lines.push('- unowned paths: none')
  else {
    lines.push(`- unowned paths (no \`verify-*\` filter owns them and they are not bookkeeping, so the gate fails):`)
    for (const u of d.unowned) {
      lines.push(u.nearest
        ? `  - \`${u.path}\`: extend \`${u.nearest.file}\` (nearest entry by directory: \`${u.nearest.pattern}\`)`
        : `  - \`${u.path}\`: no \`verify-*\` filter shares its directory; add it to one (\`verify-root.yml\` owns what the root \`npm test\` checks) or to \`BOOKKEEPING_PREFIXES\``)
    }
  }
  return lines.join('\n')
}

// --- I/O ----------------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function verifyWorkflows() {
  const dir = join(ROOT, '.github/workflows')
  return readdirSync(dir)
    .filter((f) => /^verify-.*\.ya?ml$/.test(f))
    .sort()
    .map((file) => ({ file, ...parseWorkflowFilter(readFileSync(join(dir, file), 'utf8')) }))
    .filter((wf) => wf.paths !== null)
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

function gh(args) {
  return JSON.parse(execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) || 'null')
}

function report(text) {
  console.log(text)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n\n`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const [mode] = process.argv.slice(2)
  const pr = arg('--pr')
  const repo = process.env.GH_REPO || 'no-trbl-2-u/Miserere-mei-deus'
  if (!['classify', 'wait'].includes(mode) || !pr) {
    console.error('usage: pr-gate.mjs classify --pr <n> | wait --pr <n> --head <sha>')
    process.exit(2)
  }
  // One filename per line: a paginated `--jq` prints one result per page.
  const files = execFileSync('gh', ['api', '--paginate', `repos/${repo}/pulls/${pr}/files?per_page=100`, '--jq', '.[].filename'],
    { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
  const workflows = verifyWorkflows()

  if (mode === 'classify') {
    const d = decideGate(files, workflows, [])
    const state = d.unowned.length ? 'red' : d.triggered.length ? 'classified' : 'no verify-* triggered'
    report(describe({ ...d, pending: [], state }))
    if (d.unowned.length) process.exit(1)
    return
  }

  const head = arg('--head')
  const cap = Number(arg('--timeout-min', String(WAIT_CAP_MINUTES))) * 60000
  const interval = Number(arg('--interval-s', '30')) * 1000
  const start = Date.now()
  for (;;) {
    const runs = (gh(['api', `repos/${repo}/actions/runs?head_sha=${head}&event=pull_request&per_page=100`])?.workflow_runs ?? [])
      .map((r) => ({ path: r.path, status: r.status, conclusion: r.conclusion, createdAt: r.created_at }))
    const d = decideGate(files, workflows, runs)
    if (d.state === 'green') { report(describe(d)); return }
    if (d.state === 'red') { report(describe(d)); process.exit(1) }
    if (Date.now() - start > cap) {
      report(`${describe(d)}\n- gave up after ${cap / 60000} minutes: a triggered verify-* never finished on ${head}`)
      process.exit(1)
    }
    console.log(`waiting on ${d.pending.join(', ')}`)
    await sleep(interval)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
