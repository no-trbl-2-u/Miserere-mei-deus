#!/usr/bin/env node
// scripts/eval/parent-replay.mjs
//
// Do the tests fail on the parent? (phase EV1b, brief A4). For every PR in
// `docs/reports/eval/ledger.json`, each test file it added or changed runs
// in a detached worktree at the PR's merge (the control) and then at the
// merge's first parent with the PR's version of the file laid over. A file
// that passes there could not fail. Ticked acceptance lines whose named
// tests all could not fail are listed as unproven. Writes
// `docs/reports/eval/parent-replay.json` and the parent-replay section of
// `docs/reports/eval/latest.md`. The pure parts live in
// `parent-replay-lib.mjs`.
//
//   node scripts/eval/parent-replay.mjs [--pr 521,523] [--dry-run]
//
// The worktree reuses this checkout's `node_modules` through junctions, so
// a dependency that moved between the parent and today runs at today's
// version; the control run at the merge catches a file that breaks on it.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  checkTicks, firstParent, newTitles, renderReplaySection, runnerFor, seedTickStatus,
  spliceSection, verdictFor,
} from './parent-replay-lib.mjs'
import { ROOT, checkout, closeWorktree, git, openWorktree, runTests } from './worktree.mjs'

const OUT_DIR = join(ROOT, 'docs/reports/eval')

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

function readEnv(key) {
  if (process.env[key]) return process.env[key]
  const env = join(ROOT, '.env')
  if (!existsSync(env)) return undefined
  const line = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${key}=`))
  return line ? line.slice(key.length + 1).trim() : undefined
}

const token = readEnv('GH_TOKEN')
if (token) process.env.GH_TOKEN = token
const REPO = readEnv('GH_REPO') || 'no-trbl-2-u/Miserere-mei-deus'

function show(sha, path) {
  try {
    return execFileSync('git', ['show', `${sha}:${path}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 })
  } catch {
    return null
  }
}

function prBody(number) {
  try {
    return execFileSync('gh', ['pr', 'view', String(number), '--repo', REPO, '--json', 'body', '--jq', '.body'], { cwd: ROOT, encoding: 'utf8' })
  } catch (e) {
    console.warn(`parent-replay: no body for #${number}: ${e.message.split('\n')[0]}`)
    return ''
  }
}

/** A run's outcome without its case list, which `parent-replay.json` does not need. */
function tally(result) {
  if (!result) return null
  const count = (status) => result.cases.filter((c) => c.status === status).length
  return { ok: result.ok, passed: count('passed'), failed: count('failed'), message: result.message }
}

function replayPr(dir, row) {
  const merge = row.mergeCommit
  const parent = firstParent(git(['rev-list', '--parents', '-n', '1', merge]))
  const tests = row.files.filter((f) => runnerFor(f) && show(merge, f) != null)
  if (tests.length === 0 || !parent) return null

  checkout(dir, merge)
  const control = runTests(dir, tests)

  checkout(dir, parent)
  git(['checkout', merge, '--', ...tests], dir)  // the PR's version of each test over the parent
  const onParent = runTests(dir, tests)

  const files = tests.map((path) => {
    const before = show(parent, path)
    const fresh = newTitles(show(merge, path), before)
    return {
      path,
      status: before == null ? 'added' : 'changed',
      freshTitles: [...fresh],
      control: tally(control[path]),
      parent: tally(onParent[path]),
      ...verdictFor(control[path] ?? null, onParent[path] ?? null, fresh),
    }
  })
  return { number: row.number, title: row.title, merge, parent, files }
}

function main() {
  const ledger = JSON.parse(readFileSync(join(OUT_DIR, 'ledger.json'), 'utf8'))
  const only = arg('--pr', null)?.split(',').map(Number)
  const rows = ledger.rows.filter((r) => r.mergeCommit && (!only || only.includes(r.number)))
  const head = git(['rev-parse', 'HEAD'])
  const stamp = { commit: head.slice(0, 8), date: git(['show', '-s', '--format=%cI', head]) }

  const dir = openWorktree('eval-parent-replay-')
  const prs = []
  try {
    for (const row of rows) {
      const t0 = Date.now()
      const pr = replayPr(dir, row)
      if (!pr) continue
      prs.push(pr)
      const tally = pr.files.map((f) => f.verdict).join(', ')
      console.log(`#${row.number}: ${pr.files.length} file(s) in ${Math.round((Date.now() - t0) / 1000)}s: ${tally}`)
    }
  } finally {
    closeWorktree(dir)
  }

  for (const pr of prs) pr.body = prBody(pr.number)
  const ticks = checkTicks(prs)
  const seedTicks = [[521, 'A4'], [523, 'A6']].map(([pr, id]) => ({ pr, id, status: seedTickStatus(ticks.find((t) => t.pr === pr && t.id === id)) }))
  const replay = { stamp, ledgerStamp: ledger.stamp.commit, prs: prs.map(({ body, ...p }) => p), ticks, seedTicks }
  const section = renderReplaySection(replay)

  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`${section}\n`)
    return
  }
  writeFileSync(join(OUT_DIR, 'parent-replay.json'), `${JSON.stringify(replay, null, 2)}\n`)
  const latest = join(OUT_DIR, 'latest.md')
  writeFileSync(latest, spliceSection(readFileSync(latest, 'utf8'), section))
  const unproven = ticks.filter((t) => t.unproven).length
  console.log(`parent replay: ${prs.reduce((n, p) => n + p.files.length, 0)} test files over ${prs.length} PRs, ${unproven} unproven tick(s) -> docs/reports/eval/latest.md`)
}

main()
