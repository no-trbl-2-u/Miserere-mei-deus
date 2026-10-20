// scripts/eval/worktree-root.test.mjs — the modules the reviewer runs from
// .review-tooling/scripts/ resolve the repository root from git, not from
// their own path (phase RV3; the sixth verdict on #666). A copy of the
// module placed under a scratch directory inside the repo must still name
// the real root.
//
//   node --test scripts/eval/worktree-root.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: HERE, encoding: 'utf8' }).trim()
const same = (a, b) => resolve(a).replace(/\\/g, '/').toLowerCase() === resolve(b).replace(/\\/g, '/').toLowerCase()

test('worktree.mjs and pr-risk.mjs name the repo root from their real location', async () => {
  const { ROOT: wt } = await import('./worktree.mjs')
  const { ROOT: pp } = await import('../pr-partition.mjs')
  assert.ok(same(wt, REPO), `worktree ROOT ${wt}`)
  assert.ok(same(pp, REPO), `pr-partition ROOT ${pp}`)
})

test('a copy under .review-tooling-test/scripts/ still names the repo root, not the copy', async () => {
  const scratch = join(REPO, '.review-tooling-test')
  rmSync(scratch, { recursive: true, force: true })
  mkdirSync(join(scratch, 'scripts', 'eval'), { recursive: true })
  cpSync(join(REPO, 'scripts'), join(scratch, 'scripts'), { recursive: true, filter: (p) => !/node_modules/.test(p) })
  try {
    const wt = await import(pathToFileURL(join(scratch, 'scripts', 'eval', 'worktree.mjs')).href)
    const pp = await import(pathToFileURL(join(scratch, 'scripts', 'pr-partition.mjs')).href)
    const pr = await import(pathToFileURL(join(scratch, 'scripts', 'pr-risk.mjs')).href)
    assert.ok(same(wt.ROOT, REPO), `copied worktree ROOT ${wt.ROOT}`)
    assert.ok(same(pp.ROOT, REPO), `copied pr-partition ROOT ${pp.ROOT}`)
    assert.ok(!same(wt.ROOT, scratch) && !same(pp.ROOT, scratch), 'never the copy')
    // pr-risk keeps ROOT private; its CLI must still read the repo from the copy.
    const out = execFileSync('node', [join(scratch, 'scripts', 'pr-risk.mjs'), 'HEAD~1..HEAD'], { cwd: scratch, encoding: 'utf8' })
    assert.match(out, /risk:(low|medium|high)/)
    assert.ok(pr, 'the copied pr-risk module loads')
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})
