#!/usr/bin/env node
// scripts/pr-settle.mjs — settle a merged PR's plan/pending/ files on main (phase NX1e).
// Zero dependencies.
//
// Every change lands by PR, so no checkout here is nexus's owner and nobody runs v2's settle
// at orient (`skills/next/land.md` §1). The merge is the moment instead: `pr-resolve.yml`'s
// scan runs on every push to main, one run at a time, and calls this first
// (`scripts/pr-resolve.mjs scan`; by hand, `node scripts/pr-merge.mjs settle`). In a
// throwaway detached worktree of origin/main it:
//   1. reads the alias of every chunk a pending file closes, from its spec line, and the PR
//      that brought each pending file in (the merge commit's `Merge pull request #N`, or a
//      squash's `(#N)`);
//   2. runs the kit's settle (`scripts/plan/settle.mjs --no-commit`, as the owner) unchanged;
//   3. rewrites each ARCHIVE.md line settle wrote into Miserere's shape:
//      `- <date> · <chunk> (alias: <X>) · <says> · <range> (#<PR>)`, so the deadline tools
//      still resolve the alias once the chunk's line has left its spec;
//   4. runs the plan lints (plan-check, check-deadlines) before and after, and refuses a
//      settle that adds a failure;
//   5. commits with settle's message and pushes HEAD to main, never forced; a rejected push
//      fetches and starts again, three times at most.
// Nothing pending is a quiet no-op, so the settle commit's own push settles nothing.
// A settle that needs a hand (settle's exit 2) or turns the lints red pushes nothing and says
// why: the pending files stay, and every reader still counts their closes as closed.
//
//   node scripts/pr-settle.mjs [--dry-run]     # exit 0 settled or nothing to do, 1 refused, 3 push lost 3x

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkDeadlines, readPlanSources } from './check-deadlines.mjs'
import { parseSpecChunks, SPEC_FILE } from './deadlines-lib.mjs'
import { runCheck } from './plan-check.mjs'
import { parsePending, pendingFiles } from './plan/pending.mjs'
import { main as settle } from './plan/settle.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_TRIES = 3

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

/** Every chunk id → its aliases, from the specs in `root`'s plan/. */
export function chunkAliases(root) {
  const dir = path.join(root, 'plan')
  const out = new Map()
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => SPEC_FILE.test(n)) : []) {
    for (const c of parseSpecChunks(fs.readFileSync(path.join(dir, name), 'utf8').replace(/\r\n/g, '\n'))) {
      if (c.aliases.length) out.set(c.chunk, c.aliases)
    }
  }
  return out
}

/**
 * The PR that brought `file` onto HEAD's first-parent line: the subject of the first merge
 * there that holds the commit adding it (`Merge pull request #N from …`), or, for a commit on
 * the first-parent line itself, a squash subject's trailing `(#N)`. Null when neither says.
 */
export function prOf(cwd, file) {
  const c = git(['log', '-1', '--diff-filter=A', '--format=%H', '--', file], cwd)
  if (!c) return null
  const firstParent = git(['rev-list', '--first-parent', 'HEAD'], cwd).split('\n')
  if (firstParent.includes(c)) return /\(#(\d+)\)\s*$/.exec(git(['show', '-s', '--format=%s', c], cwd))?.[1] ?? null
  const brought = new Set(git(['rev-list', '--merges', '--ancestry-path', `${c}..HEAD`], cwd).split('\n').filter(Boolean))
  const merge = git(['rev-list', '--first-parent', '--merges', 'HEAD'], cwd).split('\n').filter((h) => brought.has(h)).at(-1)
  if (!merge) return null
  return /^Merge pull request #(\d+)\b/.exec(git(['show', '-s', '--format=%s', merge], cwd))?.[1] ?? /\(#(\d+)\)\s*$/.exec(git(['show', '-s', '--format=%s', merge], cwd))?.[1] ?? null
}

/**
 * ARCHIVE.md as Miserere writes it: each line `added` (settle's, `- <date> · <id> · <says> ·
 * <range>`) gains its chunk's `(alias: …)` after the id and ` (#<PR>)` after the range.
 *
 * @param {string} archive the file after settle.  @param {string[]} added the lines settle appended.
 * @param {Map<string, string[]>} aliases chunk id → aliases.  @param {Map<string, string>} prs chunk id → PR number.
 * @returns {string}
 */
export function shapeArchive(archive, added, aliases, prs) {
  const todo = new Set(added)
  return archive
    .split('\n')
    .map((line) => {
      if (!todo.has(line)) return line
      todo.delete(line)
      const m = /^- (\d{4}-\d{2}-\d{2}) · (\d{2,}\.\w+) · (.*)$/.exec(line)
      if (!m) return line
      const [, date, id, rest] = m
      const alias = aliases.get(id)?.length ? ` (alias: ${aliases.get(id).join(', ')})` : ''
      const pr = prs.get(id) && !/\(#\d+\)\s*$/.test(rest) ? ` (#${prs.get(id)})` : ''
      return `- ${date} · ${id}${alias} · ${rest}${pr}`
    })
    .join('\n')
}

/** The plan lints the settle is held to, run in-process on `root`'s plan: failure messages. */
export function planLints(root) {
  const failures = []
  try {
    failures.push(...runCheck({ repoAbs: root }).failures.map((f) => `plan-check: ${f}`))
  } catch (err) {
    failures.push(`plan-check: ${String(err?.message ?? err).split('\n')[0]}`)
  }
  try {
    failures.push(...checkDeadlines(fs.readFileSync(path.join(root, 'plan/deadlines.md'), 'utf8'), readPlanSources(root)).map((f) => `check-deadlines: ${f}`))
  } catch (err) {
    failures.push(`check-deadlines: ${String(err?.message ?? err).split('\n')[0]}`)
  }
  return failures
}

/** Settle's own subject for the files it settled (its 72-character rule). */
export function settleMessage(ids) {
  const message = `plan: settle ${ids.join(', ')}`
  return message.length > 72 ? ['-m', `plan: settle ${ids.length} pending files`, '-m', ids.join(', ')] : ['-m', message]
}

/**
 * One settle attempt in the worktree `wt` (detached at origin/main). Returns what happened;
 * on `settled` HEAD holds the settle commit, ready to push.
 *
 * @param {string} wt  @param {{ lint?: (root: string) => string[], log?: (s: string) => void }} [deps]
 * @returns {{ state: 'nothing' | 'settled' | 'refused', ids?: string[], reason?: string }}
 */
export function settleOnce(wt, { lint = planLints, log = console.log } = {}) {
  const files = pendingFiles(wt)
  if (!files.length) return { state: 'nothing' }
  const aliases = chunkAliases(wt)
  const prs = new Map()
  const idOf = new Map()
  for (const f of files) {
    let id = path.basename(f.file, '.md')
    try {
      id = parsePending(f.text, f.file).close ?? id
    } catch {
      // settle names what is wrong with it
    }
    idOf.set(f.file, id)
    const pr = prOf(wt, f.file)
    if (pr) prs.set(id, pr)
  }
  const before = lint(wt)
  const archiveFile = path.join(wt, 'plan', 'ARCHIVE.md')
  const archiveBefore = fs.existsSync(archiveFile) ? fs.readFileSync(archiveFile, 'utf8').replace(/\r\n/g, '\n') : ''
  const code = settle(['--no-commit'], { cwd: wt, owner: true })
  if (code === 2) return { state: 'refused', reason: 'settle left lines for a hand (exit 2); the pending files stay' }
  if (code !== 0 && code !== 1) return { state: 'refused', reason: `settle exited ${code}` }
  const ids = files.filter((f) => !fs.existsSync(path.join(wt, f.file))).map((f) => idOf.get(f.file))
  if (!ids.length) return { state: 'refused', reason: 'settle settled nothing (each file it skipped is named above)' }
  if (fs.existsSync(archiveFile)) {
    const after = fs.readFileSync(archiveFile, 'utf8').replace(/\r\n/g, '\n')
    const seen = new Set(archiveBefore.split('\n'))
    const added = after.split('\n').filter((l) => l && !seen.has(l))
    const shaped = shapeArchive(after, added, aliases, prs)
    if (shaped !== after) {
      fs.writeFileSync(archiveFile, shaped)
      git(['add', '--', 'plan/ARCHIVE.md'], wt)
    }
  }
  const was = new Set(before)
  const worse = lint(wt).filter((f) => !was.has(f))
  if (worse.length) return { state: 'refused', ids, reason: `the settle turns the plan lints red: ${worse[0].slice(0, 300)}` }
  git(['commit', '-q', ...settleMessage(ids)], wt)
  log(`pr-settle: settled ${ids.join(', ')}${prs.size ? ` (PRs ${[...new Set(prs.values())].map((n) => `#${n}`).join(', ')})` : ''}`)
  return { state: 'settled', ids }
}

/**
 * Settle origin/`branch`'s pending files and push the result, in a throwaway worktree of
 * `root`. `dryRun` reports and pushes nothing.
 *
 * @param {{ root?: string, branch?: string, dryRun?: boolean, lint?: (root: string) => string[], log?: (s: string) => void }} [opts]
 * @returns {{ state: 'nothing' | 'settled' | 'refused' | 'lost', ids?: string[], reason?: string }}
 */
export function settleMain({ root = ROOT, branch = 'main', dryRun = false, lint = planLints, log = console.log } = {}) {
  for (let i = 0; i < MAX_TRIES; i++) {
    git(['fetch', '-q', 'origin', branch], root)
    const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-settle-wt-'))
    try {
      git(['worktree', 'add', '-q', '--detach', wt, `origin/${branch}`], root)
      const r = settleOnce(wt, { lint, log })
      if (r.state !== 'settled' || dryRun) return r
      try {
        git(['push', '-q', 'origin', `HEAD:${branch}`], wt)
        return r
      } catch (err) {
        log(`pr-settle: push rejected (${String(err?.stderr ?? err?.message ?? err).split('\n')[0]}); fetching and settling again`)
      }
    } finally {
      try {
        git(['worktree', 'remove', '--force', wt], root)
      } catch {
        fs.rmSync(wt, { recursive: true, force: true })
        try {
          git(['worktree', 'prune'], root)
        } catch {
          // a throwaway runner
        }
      }
    }
  }
  return { state: 'lost', reason: `the push to ${branch} was rejected ${MAX_TRIES} times` }
}

function cli() {
  const dryRun = process.argv.includes('--dry-run')
  const r = settleMain({ dryRun })
  if (r.state === 'nothing') console.log('pr-settle: nothing pending')
  else if (r.state === 'settled') console.log(`pr-settle: ${dryRun ? '(dry run) would push' : 'pushed'} the settle of ${r.ids.join(', ')}`)
  else console.log(`::warning::pr-settle: ${r.reason}`)
  process.exitCode = r.state === 'refused' ? 1 : r.state === 'lost' ? 3 : 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli()
