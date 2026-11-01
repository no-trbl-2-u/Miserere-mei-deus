#!/usr/bin/env node
// scripts/pr-resolve.mjs — keeps open `loop:pr` and `plot` PRs mergeable (Phase R11, D87).
// Zero dependencies. Run by .github/workflows/pr-resolve.yml on every push to
// `main`; modelled on the `hunt` repo's scripts/pr/resolve.mjs.
//
//   node scripts/pr-resolve.mjs scan
//       For each open, same-repo `loop:pr` or `plot` PR GitHub reports CONFLICTING:
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
//   node scripts/pr-resolve.mjs update --branch <b>
//       The update the merge job's tree check makes (phase MD1c): `mergeMain`
//       plus the push, run in a throwaway worktree with this checkout's scripts
//       as the drivers (never the branch's), for a PR whose merged tree is red. Exit 3 (nothing pushed) when the
//       branch was already current or the merge conflicted.
//
// After a merge it commits (or, for `finish`, is about to commit), it re-derives
// the Status cell of every deadline Item (`rederiveStatus`: `deadlines.mjs
// --write`, LIVE_DEADLINES.md put back), so rows that shipped on main do not
// leave the PR red on check-deadlines.
//
// Never force-pushes, never rebases, never touches `main`. A union merge of
// an append-only file can double a row both sides edited (hunt's lesson
// `union-edit-doubles`); `unionMerge` counts each line three ways (base,
// ours, theirs) so an edited row keeps only its edited form. The line order
// comes from git's own three-way merge, so a row one side moved (Pending to
// Done) moves whole; an anchor walk split such rows (lesson
// `union-anchor-split`).

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
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
 * table rows stay in timestamp order. Deterministic; its only I/O is the
 * scratch files `mergeFileUnion` hands git.
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @param {{ telemetry?: boolean }} [opts]
 * @returns {string}
 */
export function unionMerge(base, ours, theirs, opts = {}) {
  const cb = counts(base.split('\n'))
  const co = counts(ours.split('\n'))
  const ct = counts(theirs.split('\n'))
  const out = mergeFileUnion(base, ours, theirs).split('\n')

  const keep = (line) => keepCount(cb.get(line) || 0, co.get(line) || 0, ct.get(line) || 0)

  // A clashing hunk keeps both sides, so a row one side closed comes back
  // under its old heading. That heading trims to zero; the body lines it
  // carried are the surplus copies, so they go first.
  const isHead = (l) => /^#{1,6} /.test(l)
  const stranded = new Array(out.length).fill(false)
  for (let i = 0; i < out.length; i += 1) {
    if (!isHead(out[i]) || keep(out[i]) > 0) continue
    for (let j = i + 1; j < out.length && out[j].trim() !== '' && !isHead(out[j]); j += 1) stranded[j] = true
  }
  const total = counts(out)
  const drop = new Array(out.length).fill(false)
  const surplus = new Map()
  for (const [line, n] of total) if (line.trim() !== '' && n > keep(line)) surplus.set(line, n - keep(line))
  for (let i = 0; i < out.length; i += 1) {
    const left = surplus.get(out[i]) || 0
    if (stranded[i] && left > 0) {
      drop[i] = true
      surplus.set(out[i], left - 1)
    }
  }

  // Trim each non-blank line to its three-way count (blank lines are layout).
  const seen = new Map()
  const kept = out.filter((line, i) => {
    if (drop[i]) return false
    if (line.trim() === '') return true
    const n = (seen.get(line) || 0) + 1
    seen.set(line, n)
    return n <= keep(line)
  })

  // Dropped rows leave their blank separators behind; no blank run may grow
  // past the longest either side wrote.
  const longestRun = (text) => Math.max(0, ...(text.match(/\n(\s*\n)+/g) || []).map((m) => m.split('\n').length - 2))
  const maxRun = Math.max(longestRun(ours), longestRun(theirs))
  let run = 0
  const trimmed = kept.filter((line) => {
    run = line.trim() === '' ? run + 1 : 0
    return run <= maxRun
  })

  if (!opts.telemetry) return trimmed.join('\n')
  // Telemetry rows start with an ISO timestamp; keep them sorted in place.
  const isRow = (l) => /^\| \d{4}-\d{2}-\d{2}/.test(l)
  const rows = trimmed.filter(isRow).sort()
  let i = 0
  return trimmed.map((l) => (isRow(l) ? rows[i++] : l)).join('\n')
}

/**
 * Line order for a union merge: `git merge-file --union`, a real diff3, so
 * each side's moves and edits apply where they were made and only clashing
 * hunks keep both sides (ours first). Run in a scratch directory.
 * @param {string} base  @param {string} ours  @param {string} theirs
 * @returns {string}
 */
function mergeFileUnion(base, ours, theirs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-resolve-'))
  try {
    const files = { ours, base, theirs }
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text)
    try {
      return execFileSync('git', ['merge-file', '-p', '--union', 'ours', 'base', 'theirs'], {
        cwd: dir,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
    } catch (err) {
      // merge-file exits with the conflict count; a positive count still printed the merge
      if (typeof err.status === 'number' && err.status > 0 && typeof err.stdout === 'string') return err.stdout
      throw err
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
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

/** PR labels kept mergeable: the loop's code PRs and `/plot`'s plan PRs. */
export const RESOLVE_LABELS = ['loop:pr', 'plot']

/** Open same-repo PRs under any RESOLVE_LABELS label (gh ANDs repeated --label). */
function listResolvable() {
  const seen = new Map()
  for (const label of RESOLVE_LABELS) {
    const prs = JSON.parse(
      gh(['pr', 'list', '--state', 'open', '--label', label,
        '--json', 'number,headRefName,mergeable,isCrossRepository']),
    )
    for (const p of prs) if (!p.isCrossRepository) seen.set(p.number, p)
  }
  return [...seen.values()]
}

/** Open same-repo loop:pr and plot PRs with a settled mergeable state. */
function openLoopPrs() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const prs = listResolvable()
    if (!prs.some((p) => p.mergeable === 'UNKNOWN')) return prs
    sleep(10_000) // GitHub computes mergeability lazily after a push
  }
  return listResolvable()
}

function stage(n, file, cwd = ROOT) {
  try {
    return git(['show', `:${n}:${file}`], { cwd })
  } catch {
    return '' // added on one side only
  }
}

/**
 * The slug-aware merge drivers `.gitattributes` names. The SessionStart hook
 * registers them for a Claude session; a workflow runner never runs that
 * hook, so without this a merge here falls back to a line merge and the union
 * below keeps both sides' bumps of one lesson as two rows (lesson
 * `lessons-merge-dup-slug`).
 */
export const MERGE_DRIVERS = [
  { key: 'lessons', name: 'lessons.md and NEEDS_T.md by slug', driver: 'node scripts/lessons-merge.mjs %O %A %B %P' },
  { key: 'deadlines', name: 'plan/deadlines.md, insertions unioned and rows by cell', driver: 'node scripts/deadlines-merge.mjs %O %A %B %P' },
]

/**
 * The driver command with its script path made absolute under `scriptsRoot`
 * (a checkout of main), so a merge in another worktree runs main's driver and
 * never the branch's copy.
 * @param {string} driver a MERGE_DRIVERS command  @param {string} scriptsRoot
 * @returns {string}
 */
export function driverCommand(driver, scriptsRoot) {
  return driver.replace(/^node (scripts\/\S+)/, (_, rel) => `node "${path.join(scriptsRoot, rel)}"`)
}

/**
 * Register MERGE_DRIVERS in the repo at `cwd` (idempotent). With `scriptsRoot`
 * the commands point at that checkout's scripts by absolute path.
 * @param {string} [cwd]  @param {string | null} [scriptsRoot]
 */
export function registerMergeDrivers(cwd = ROOT, scriptsRoot = null) {
  for (const d of MERGE_DRIVERS) {
    execFileSync('git', ['config', `merge.${d.key}.name`, d.name], { cwd })
    execFileSync('git', ['config', `merge.${d.key}.driver`, scriptsRoot ? driverCommand(d.driver, scriptsRoot) : d.driver], { cwd })
  }
}

/**
 * Re-derive the Status cell of every phase Item in plan/deadlines.md once a
 * merge has put the build plan in its final state (the merge driver runs
 * mid-merge, when the build plan may not be merged yet, so it cannot do this).
 * `deadlines.mjs --write` also rewrites LIVE_DEADLINES.md, which the daily
 * workflow owns; that file goes back to the merged tree's copy. A changed
 * plan/deadlines.md is staged.
 * @param {string} [cwd] repository directory  @param {string | null} [scriptsRoot] a checkout of main to run the script from instead of `cwd`'s own
 * @returns {boolean} true when plan/deadlines.md changed
 */
export function rederiveStatus(cwd = ROOT, scriptsRoot = null) {
  if (!fs.existsSync(path.join(cwd, 'plan', 'deadlines.md'))) return false
  if (scriptsRoot) {
    // main's deadlines.mjs on a scratch copy of the worktree's plan/: it finds its files from its own
    // location, and the branch's copy of the script must never run.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-rederive-'))
    try {
      fs.cpSync(path.join(scriptsRoot, 'scripts'), path.join(tmp, 'scripts'), { recursive: true })
      fs.cpSync(path.join(cwd, 'plan'), path.join(tmp, 'plan'), { recursive: true })
      execFileSync(process.execPath, ['scripts/deadlines.mjs', '--write'], { cwd: tmp, stdio: 'pipe' })
      const next = fs.readFileSync(path.join(tmp, 'plan', 'deadlines.md'), 'utf8')
      if (next === fs.readFileSync(path.join(cwd, 'plan', 'deadlines.md'), 'utf8')) return false
      fs.writeFileSync(path.join(cwd, 'plan', 'deadlines.md'), next)
      git(['add', '--', 'plan/deadlines.md'], { cwd })
      return true
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }
  if (!fs.existsSync(path.join(cwd, 'scripts', 'deadlines.mjs'))) return false
  execFileSync(process.execPath, ['scripts/deadlines.mjs', '--write'], { cwd, stdio: 'pipe' })
  const tracked = git(['ls-files', '--', 'LIVE_DEADLINES.md'], { cwd }).trim() !== ''
  if (tracked) git(['checkout', '--', 'LIVE_DEADLINES.md'], { cwd })
  else fs.rmSync(path.join(cwd, 'LIVE_DEADLINES.md'), { force: true })
  const changed = git(['diff', '--name-only', '--', 'plan/deadlines.md'], { cwd }).trim() !== ''
  if (changed) git(['add', '--', 'plan/deadlines.md'], { cwd })
  return changed
}

/**
 * Merge origin/main into `branch` in the repository at `cwd`; settle union
 * files; re-derive the deadline Status cells. A clean merge is already
 * committed here, so a Status change amends that merge commit.
 * @param {string} branch  @param {string} [cwd] repository directory (default the repo root)
 * @param {string | null} [scriptsRoot] a checkout of main whose scripts run the drivers and the Status re-derive, by absolute path; `cwd` then only sees plain git
 * @returns {{ merged: boolean, rest: string[] }}
 */
export function mergeMain(branch, cwd = ROOT, scriptsRoot = null) {
  registerMergeDrivers(cwd, scriptsRoot)
  git(['fetch', 'origin', 'main', branch], { cwd })
  git(['switch', '-C', branch, `origin/${branch}`], { cwd })
  let clean = true
  try {
    git(['merge', '--no-edit', 'origin/main'], { cwd, stdio: 'pipe' })
  } catch {
    clean = false // conflicts: fall through
  }
  if (clean) {
    if (rederiveStatus(cwd, scriptsRoot)) {
      const parents = git(['rev-list', '--parents', '-n', '1', 'HEAD'], { cwd }).trim().split(' ').length - 1
      if (parents > 1) git(['commit', '--amend', '--no-edit'], { cwd })
      else git(['commit', '-m', 'plan: re-derive deadline Status after merging main'], { cwd })
    }
    return { merged: true, rest: [] }
  }
  const conflicted = git(['diff', '--name-only', '--diff-filter=U'], { cwd })
    .split('\n').filter(Boolean)
  const rest = []
  for (const file of conflicted) {
    if (!isUnionPath(file)) {
      rest.push(file)
      continue
    }
    const merged = unionMerge(stage(1, file, cwd), stage(2, file, cwd), stage(3, file, cwd), {
      telemetry: file.startsWith('telemetry/'),
    })
    fs.writeFileSync(path.join(cwd, file), merged)
    git(['add', '--', file], { cwd })
  }
  if (rest.length === 0) rederiveStatus(cwd, scriptsRoot) // the merge commit is still to come
  return { merged: false, rest }
}

/**
 * Bring `branch` up to date with origin/main (the merge drivers registered,
 * union files settled, Status re-derived) and push it (phase MD1c). Pass a
 * `scriptsRoot` and a `cwd` that is not it, or the branch's own scripts run as
 * the drivers; `updateBranchIsolated` does that. Never a
 * force, never `main`; a conflict the drivers and the union cannot settle is
 * aborted and the branch is left as it was.
 * @param {string} branch  @param {string} [cwd] repository directory
 * @param {(head: string) => void} [beforePush] called with the new head just before the push, so a marker can name it first
 * @param {string | null} [scriptsRoot] a checkout of main to run drivers and scripts from (see mergeMain)
 * @returns {{ state: 'updated' | 'current' | 'conflict', head?: string, rest?: string[] }}
 */
export function updateBranch(branch, cwd = ROOT, beforePush, scriptsRoot = null) {
  if (!branch || branch === 'main') throw new Error('updateBranch: a PR branch is required, never main')
  const { merged, rest } = mergeMain(branch, cwd, scriptsRoot)
  if (!merged) {
    if (rest.length > 0) {
      git(['merge', '--abort'], { cwd })
      return { state: 'conflict', rest }
    }
    git(['commit', '--no-edit'], { cwd })
  }
  const head = git(['rev-parse', 'HEAD'], { cwd }).trim()
  if (head === git(['rev-parse', `origin/${branch}`], { cwd }).trim()) return { state: 'current', head }
  beforePush?.(head)
  git(['push', 'origin', `HEAD:${branch}`], { cwd })
  return { state: 'updated', head }
}

/**
 * `updateBranch` in a throwaway detached worktree of `root`, with `root`'s
 * scripts as the merge drivers and the Status re-derive. `root` is a checkout
 * of main that is never switched, so the PR branch's own copies of those
 * scripts never run. The real call sites are the merge job's in-process
 * `treeCheck` (scripts/pr-merge.mjs) and the `update` mode below.
 * @param {string} branch  @param {(head: string) => void} [beforePush]
 * @param {string} [root] the checkout of main whose scripts run
 * @returns {{ state: 'updated' | 'current' | 'conflict', head?: string, rest?: string[] }}
 */
export function updateBranchIsolated(branch, beforePush, root = ROOT) {
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-update-wt-'))
  try {
    git(['worktree', 'add', '-q', '--detach', wt, 'origin/main'], { cwd: root })
    return updateBranch(branch, wt, beforePush, root)
  } finally {
    fs.rmSync(wt, { recursive: true, force: true })
    try {
      git(['worktree', 'prune'], { cwd: root })
    } catch {
      // a throwaway runner
    }
  }
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
    if (midMerge) {
      rederiveStatus()
      commitAndPush(branch)
    }
    else git(['push', 'origin', `HEAD:${branch}`])
    return
  }
  if (mode === 'update') {
    const r = updateBranchIsolated(branch)
    console.log(r.state === 'conflict' ? `conflict: ${r.rest.join(', ')}` : `${r.state} ${r.head}`)
    if (r.state !== 'updated') process.exit(3)
    return
  }
  console.error('usage: pr-resolve.mjs scan | prepare --branch <b> | finish --branch <b> | update --branch <b>')
  process.exit(2)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
