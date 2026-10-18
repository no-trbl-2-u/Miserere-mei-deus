#!/usr/bin/env node
// scripts/eval/seeded-replay.mjs
//
// Planted defects (phase EV1c, brief A6). Each real bug of 2026-10-14 is
// planted again by reverting its fix's source in a detached worktree that
// this mode never pushes, and each mechanical gate meets it: the CI path filters,
// the related tests as they stood at the fix's parent, and the related
// tests at the fix with its source reverted. A file failing in either leg
// reruns at the unplanted fix; one that fails there too is noise. Writes
// `docs/reports/eval/seeded.json` and the seeded section of
// `docs/reports/eval/latest.md`. The pure parts live in `seeded-lib.mjs`.
//
//   node scripts/eval/seeded-replay.mjs [--dry-run]
//   node scripts/eval/seeded-replay.mjs --judge review [--dry-run]
//
// `--judge review` (phase RV1c, brief A7) scores the shadow reviewer
// instead: see `seeded-review.mjs`. It is the one mode that pushes.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { classifyPaths, parseWorkflowFilter } from './ledger-lib.mjs'
import { spliceMarked } from './mutation-lib.mjs'
import { runnerFor } from './parent-replay-lib.mjs'
import { SECTION_END, SECTION_START, SEEDS, ciVerdict, plantedPaths, relatedTests, renderSeededSection, testVerdict } from './seeded-lib.mjs'
import { judgeReview } from './seeded-review.mjs'
import { ROOT, checkout, closeWorktree, git, openWorktree, runTests as runInTree } from './worktree.mjs'

const OUT_DIR = join(ROOT, 'docs/reports/eval')
const RUN_TIMEOUT_MS = 10 * 60 * 1000
const runTests = (dir, paths) => runInTree(dir, paths, RUN_TIMEOUT_MS)

function verifyWorkflows() {
  const dir = join(ROOT, '.github/workflows')
  return readdirSync(dir)
    .filter((f) => /^verify-.*\.ya?ml$/.test(f))
    .sort()
    .map((file) => ({ file, ...parseWorkflowFilter(readFileSync(join(dir, file), 'utf8')) }))
    .filter((wf) => wf.paths !== null)
}

function replaySeed(dir, seed, workflows) {
  const fix = git(['rev-parse', `${seed.fix}^{commit}`])
  const parent = git(['rev-parse', `${fix}^`])
  const changed = git(['diff', '--name-only', parent, fix]).split('\n').filter(Boolean)
  const planted = plantedPaths(changed)
  const fixTests = changed.filter((f) => runnerFor(f))
  const { triggered } = classifyPaths(planted, workflows)

  checkout(dir, parent)
  const beforeTests = relatedTests(planted, git(['ls-files'], dir).split('\n'), fixTests)
  const beforeRuns = runTests(dir, beforeTests)

  checkout(dir, fix)
  git(['checkout', parent, '--', ...planted], dir)
  const afterTests = relatedTests(planted, git(['ls-files'], dir).split('\n'), fixTests)
  const afterRuns = runTests(dir, afterTests)

  // The control: every file that failed in either leg runs at the fix itself.
  checkout(dir, fix)
  const suspects = [...new Set([...beforeTests, ...afterTests].filter((f) => (beforeRuns[f] && !beforeRuns[f].ok) || (afterRuns[f] && !afterRuns[f].ok)))]
  const control = suspects.length ? runTests(dir, suspects) : {}
  const noisy = suspects.filter((f) => control[f] && !control[f].ok)

  const before = { tests: beforeTests, ...testVerdict(beforeRuns, noisy) }
  const after = { tests: afterTests, ...testVerdict(afterRuns, noisy) }
  return { ...seed, fix: fix.slice(0, 8), planted, triggered, gates: { ci: ciVerdict(triggered, before), before, after } }
}

async function main() {
  if (process.argv.includes('--judge')) {
    const judge = process.argv[process.argv.indexOf('--judge') + 1]
    if (judge !== 'review') {
      console.error(`seeded-replay: unknown judge '${judge}' (only 'review')`)
      process.exit(2)
    }
    await judgeReview({ dryRun: process.argv.includes('--dry-run') })
    return
  }
  const head = git(['rev-parse', 'HEAD'])
  const stamp = { commit: head.slice(0, 8), date: git(['show', '-s', '--format=%cI', head]) }
  const workflows = verifyWorkflows()
  const dir = openWorktree('eval-seeded-')
  const seeds = []
  try {
    for (const seed of SEEDS) {
      const t0 = Date.now()
      const s = replaySeed(dir, seed, workflows)
      seeds.push(s)
      console.log(`${s.id} #${s.pr}: ci ${s.gates.ci.verdict}, before ${s.gates.before.verdict}, after ${s.gates.after.verdict} (${Math.round((Date.now() - t0) / 1000)}s)`)
    }
  } finally {
    closeWorktree(dir)
  }
  // A mechanical rerun keeps the review judge's last blocks; only --judge review rewrites them.
  const previous = readSeeded()
  const replay = { stamp, seeds: seeds.map((s) => (previous?.[s.id] ? { ...s, review: previous[s.id] } : s)) }
  const section = renderSeededSection(replay)
  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`${section}\n`)
    return
  }
  writeFileSync(join(OUT_DIR, 'seeded.json'), `${JSON.stringify(replay, null, 2)}\n`)
  const latest = join(OUT_DIR, 'latest.md')
  writeFileSync(latest, spliceMarked(readFileSync(latest, 'utf8'), section, SECTION_START, SECTION_END))
  console.log('seeded replay -> docs/reports/eval/latest.md')
}

function readSeeded() {
  try {
    const json = JSON.parse(readFileSync(join(OUT_DIR, 'seeded.json'), 'utf8'))
    return Object.fromEntries(json.seeds.filter((s) => s.review).map((s) => [s.id, s.review]))
  } catch {
    return null
  }
}

await main()
