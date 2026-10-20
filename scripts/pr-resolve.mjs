#!/usr/bin/env node
// scripts/pr-resolve.mjs — keeps open `loop:pr` PRs mergeable (Phase R11, D87).
// Zero dependencies. Run by .github/workflows/pr-resolve.yml on every push to
// `main`; modelled on the `hunt` repo's scripts/pr/resolve.mjs.
//
//   node scripts/pr-resolve.mjs scan
//       For each open, same-repo `loop:pr` PR that GitHub reports CONFLICTING:
//       merge origin/main into its branch. Conflicts only in append-only files
//       (telemetry shards, the plan queues, lessons) are settled by a union of
//       rows, then committed and pushed. Any other conflict is aborted and the
//       branch is listed for a Haiku run; the list goes to $GITHUB_OUTPUT as
//       `claude=<json [{pr, branch}]>` (stdout when not on Actions).
//   node scripts/pr-resolve.mjs prepare --branch <b>
//       Pre-run for that Haiku run: check out <b>, merge origin/main, settle
//       the union files, leave conflict markers in the rest and write their
//       paths to .git/pr-resolve-files.txt for the prompt to name.
//   node scripts/pr-resolve.mjs finish --branch <b>
//       Post-run: fail if any listed file still has a marker; else stage,
//       commit the merge and push <b>.
//
// Never force-pushes, never rebases, never touches `main`. A union merge of
// an append-only file can double a row both sides edited (hunt's lesson
// `union-edit-doubles`); `unionMerge` counts each line three ways (base,
// ours, theirs) so an edited row keeps only its edited form.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILES_LIST = path.join(ROOT, '.git', 'pr-resolve-files.txt')

/**
 * Paths whose conflicts are settled by a union of rows: append-only logs and
 * queues where both sides add rows and neither side's rows may be lost.
 * @param {string} file repo-relative path
 * @returns {boolean}
 */
export function isUnionPath(file) {
  return (
    /^telemetry\/[^/]+\.md$/.test(file) ||
    [
      'plan/AUDIT.md',
      'plan/CRITIQUE.md',
      'plan/PHASE_CANDIDATES.md',
      'plan/lessons.md',
    ].includes(file)
  )
}

/** Count occurrences of each line. @param {string[]} lines */
function counts(lines) {
  const m = new Map()
  for (const l of lines) m.set(l, (m.get(l) || 0) + 1)
  return m
}

/**
 * How many copies of a line a three-way merge should keep. Each side's
 * change against the base counts once: both adding the same row keeps one
 * copy, one side editing a row (removing its old form) removes it, and
 * independent additions both survive.
 * @param {number} b copies in base  @param {number} o in ours  @param {number} t in theirs
 * @returns {number}
 */
export function keepCount(b, o, t) {
  const dO = o - b
  const dT = t - b
  let keep
  if (dO >= 0 && dT >= 0) keep = b + Math.max(dO, dT)
  else if (dO <= 0 && dT <= 0) keep = b + Math.min(dO, dT)
  else keep = b + dO + dT
  return Math.max(0, keep)
}

/**
 * Union merge of an append-only file: every row either side added survives,
 * no row appears more often than `keepCount` allows, and (for telemetry)
 * table rows stay in timestamp order. Pure; the I/O lives in the CLI.
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @param {{ telemetry?: boolean }} [opts]
 * @returns {string}
 */
export function unionMerge(base, ours, theirs, opts = {}) {
  const B = base.split('\n')
  const O = ours.split('\n')
  const T = theirs.split('\n')
  const cb = counts(B)
  const co = counts(O)
  const ct = counts(T)

  // Order: ours as the spine, then theirs' rows that ours lacks, each placed
  // after the nearest preceding line it shares with ours.
  const out = [...O]
  let anchor = -1
  for (const line of T) {
    const idx = out.indexOf(line, anchor + 1)
    if (idx !== -1) {
      anchor = idx
      continue
    }
    out.splice(anchor + 1, 0, line)
    anchor += 1
  }

  // Trim each non-blank line to its three-way count (blank lines are layout).
  const seen = new Map()
  const trimmed = out.filter((line) => {
    if (line.trim() === '') return true
    const n = (seen.get(line) || 0) + 1
    seen.set(line, n)
    return n <= keepCount(cb.get(line) || 0, co.get(line) || 0, ct.get(line) || 0)
  })

  if (!opts.telemetry) return trimmed.join('\n')
  // Telemetry rows start with an ISO timestamp; keep them sorted in place.
  const isRow = (l) => /^\| \d{4}-\d{2}-\d{2}/.test(l)
  const rows = trimmed.filter(isRow).sort()
  let i = 0
  return trimmed.map((l) => (isRow(l) ? rows[i++] : l)).join('\n')
}

/** True when text still carries a git conflict marker. @param {string} text */
export function hasMarker(text) {
  return /^(<{7}|={7}|>{7})( |$)/m.test(text)
}

// --- CLI -----------------------------------------------------------------

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', ...opts })
}
function gh(args) {
  return execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8' })
}
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** Open same-repo loop:pr PRs with a settled mergeable state. */
function openLoopPrs() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const prs = JSON.parse(
      gh(['pr', 'list', '--state', 'open', '--label', 'loop:pr',
        '--json', 'number,headRefName,mergeable,isCrossRepository']),
    ).filter((p) => !p.isCrossRepository)
    if (!prs.some((p) => p.mergeable === 'UNKNOWN')) return prs
    sleep(10_000) // GitHub computes mergeability lazily after a push
  }
  return JSON.parse(
    gh(['pr', 'list', '--state', 'open', '--label', 'loop:pr',
      '--json', 'number,headRefName,mergeable,isCrossRepository']),
  ).filter((p) => !p.isCrossRepository)
}

function stage(n, file) {
  try {
    return git(['show', `:${n}:${file}`])
  } catch {
    return '' // added on one side only
  }
}

/** Merge origin/main into the checked-out branch; settle union files. */
function mergeMain(branch) {
  git(['fetch', 'origin', 'main', branch])
  git(['switch', '-C', branch, `origin/${branch}`])
  try {
    git(['merge', '--no-edit', 'origin/main'], { stdio: 'pipe' })
    return { merged: true, rest: [] }
  } catch {
    // conflicts: fall through
  }
  const conflicted = git(['diff', '--name-only', '--diff-filter=U'])
    .split('\n').filter(Boolean)
  const rest = []
  for (const file of conflicted) {
    if (!isUnionPath(file)) {
      rest.push(file)
      continue
    }
    const merged = unionMerge(stage(1, file), stage(2, file), stage(3, file), {
      telemetry: file.startsWith('telemetry/'),
    })
    fs.writeFileSync(path.join(ROOT, file), merged)
    git(['add', '--', file])
  }
  return { merged: false, rest }
}

function commitAndPush(branch) {
  git(['commit', '--no-edit'])
  git(['push', 'origin', `HEAD:${branch}`])
}

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

function main() {
  const mode = process.argv[2]
  if (mode === 'scan') {
    const needClaude = []
    for (const pr of openLoopPrs()) {
      if (pr.mergeable !== 'CONFLICTING') continue
      const branch = pr.headRefName
      const { merged, rest } = mergeMain(branch)
      if (merged) {
        git(['push', 'origin', `HEAD:${branch}`])
        console.log(`#${pr.number} ${branch}: merged main cleanly`)
      } else if (rest.length === 0) {
        commitAndPush(branch)
        console.log(`#${pr.number} ${branch}: settled by union`)
      } else {
        git(['merge', '--abort'])
        needClaude.push({ pr: pr.number, branch })
        console.log(`#${pr.number} ${branch}: needs a Haiku resolve (${rest.join(', ')})`)
      }
    }
    git(['switch', 'main'])
    const line = `claude=${JSON.stringify(needClaude)}`
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`)
    else console.log(line)
    return
  }
  const branch = arg('--branch')
  if (!branch || branch === 'main') {
    console.error('pr-resolve: --branch <loop/*> is required and must not be main')
    process.exit(2)
  }
  if (mode === 'prepare') {
    const { merged, rest } = mergeMain(branch)
    fs.writeFileSync(FILES_LIST, rest.join('\n'))
    console.log(merged ? 'merged cleanly' : `conflicted: ${rest.join(', ') || '(union only)'}`)
    return
  }
  if (mode === 'finish') {
    const files = fs.existsSync(FILES_LIST)
      ? fs.readFileSync(FILES_LIST, 'utf8').split('\n').filter(Boolean)
      : []
    for (const file of files) {
      if (hasMarker(fs.readFileSync(path.join(ROOT, file), 'utf8'))) {
        console.error(`pr-resolve: conflict marker left in ${file}`)
        process.exit(1)
      }
      git(['add', '--', file])
    }
    const midMerge = fs.existsSync(path.join(ROOT, '.git', 'MERGE_HEAD'))
    if (midMerge) commitAndPush(branch)
    else git(['push', 'origin', `HEAD:${branch}`])
    return
  }
  console.error('usage: pr-resolve.mjs scan | prepare --branch <b> | finish --branch <b>')
  process.exit(2)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
