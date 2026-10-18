// scripts/eval/worktree.mjs
//
// The detached worktree the eval replays and the reviewer's parent-test
// check run tests in (phases EV1b, EV1c, RV1c). Its `node_modules` are
// junctions to this checkout's, so a dependency that moved between a past
// commit and today runs at today's version; each caller runs a control at
// the commit the tests belong to so a file that breaks on that is noise.

import { spawnSync, execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseJsonReport, parseTap, runnerFor } from './parent-replay-lib.mjs'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const NODE_MODULES = ['node_modules', 'axiomancer-mechanics/node_modules', 'axiomancer-mobile/node_modules']

export const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()

/** A fresh detached worktree at HEAD; remove it with `closeWorktree`. */
export function openWorktree(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  rmSync(dir, { recursive: true, force: true })
  git(['worktree', 'add', '--detach', '--quiet', dir, 'HEAD'])
  return dir
}

export function closeWorktree(dir) {
  git(['worktree', 'remove', '--force', dir])
}

function linkModules(dir) {
  for (const rel of NODE_MODULES) {
    const target = join(ROOT, rel)
    const link = join(dir, rel)
    if (existsSync(target) && existsSync(dirname(link)) && !existsSync(link)) symlinkSync(target, link, 'junction')
  }
}

/** Moves the worktree to `sha`, dropping every untracked file but the junctions. */
export function checkout(dir, sha) {
  git(['checkout', '--force', '--detach', '--quiet', sha], dir)
  git(['clean', '-fdq', '-e', 'node_modules'], dir)
  linkModules(dir)
}

function run(cmd, args, cwd, timeoutMs) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, CI: '1', FORCE_COLOR: '0' } })
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '', timedOut: r.error?.code === 'ETIMEDOUT' }
}

/**
 * Runs the given test files in `dir`, one call per runner.
 *
 * @param {string} dir the worktree.
 * @param {string[]} paths repo-relative test files.
 * @param {number} [timeoutMs] per runner call.
 * @returns {Record<string, { ok: boolean, cases: object[], message?: string }>} results keyed by path.
 */
export function runTests(dir, paths, timeoutMs = 15 * 60 * 1000) {
  const results = {}
  const groups = {}
  for (const p of paths) {
    const r = runnerFor(p)
    if (r) (groups[r.runner] ??= { cwd: r.cwd, files: [] }).files.push(p)
  }
  for (const [runner, { cwd, files }] of Object.entries(groups)) {
    if (runner === 'node') {
      for (const f of files) {
        const r = run(process.execPath, ['--test', '--test-reporter=tap', f], dir, timeoutMs)
        results[f] = parseTap(r.stdout, r.timedOut ? 1 : r.code)
      }
      continue
    }
    const rel = files.map((f) => f.slice(cwd.length + 1))
    const outFile = join(dir, `.eval-${runner}.json`)
    rmSync(outFile, { force: true })
    const args = runner === 'jest'
      ? ['--no-install', 'jest', '--ci', '--json', `--outputFile=${outFile}`, '--runTestsByPath', ...rel]
      : ['--no-install', 'vitest', 'run', '--reporter=json', `--outputFile=${outFile}`, ...rel]
    const r = run('npx', args, join(dir, cwd), timeoutMs)
    const parsed = parseJsonReport(existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : null, dir)
    for (const f of files) {
      results[f] = parsed[f] ?? { ok: false, cases: [], message: r.timedOut ? 'timed out' : `no result (exit ${r.code}): ${r.stderr.slice(-300)}` }
    }
    rmSync(outFile, { force: true })
  }
  return results
}
