#!/usr/bin/env node
// scripts/eval/mutation.mjs
//
// Mutation scores (phase EV1c, brief A5): StrykerJS on the combat resolution
// modules and the two combat presenters. Each target runs in place inside a
// detached worktree whose `node_modules` are junctions to this checkout's,
// so a killed run can never leave a mutant in the real tree. Writes
// `docs/reports/eval/mutation.json` and the mutation section of
// `docs/reports/eval/latest.md`. The pure parts live in `mutation-lib.mjs`.
//
//   npm run eval:mutation [-- --only mechanics|mobile] [--budget <seconds per target>] [--dry-run]
//
// The targets run side by side. The budget bounds the run so it fits one
// tick: a target past it is stopped and recorded as "over budget" with the
// partial counts from Stryker's progress lines, and no score. Progress
// streams to `$TMPDIR/eval-mutation-<target>.log`.

import { spawn, execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SECTION_END, SECTION_START, parseProgress, renderMutationSection, spliceMarked, summarizeReport } from './mutation-lib.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = join(ROOT, 'docs/reports/eval')
const NODE_MODULES = ['node_modules', 'axiomancer-mechanics/node_modules', 'axiomancer-mobile/node_modules']

export const TARGETS = [
  { name: 'mechanics: combat resolution', key: 'mechanics', cwd: 'axiomancer-mechanics', config: 'scripts/eval/stryker/mechanics.config.mjs' },
  { name: 'mobile: combat presenters', key: 'mobile', cwd: 'axiomancer-mobile', config: 'scripts/eval/stryker/mobile.config.mjs' },
]

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()

/**
 * A detached worktree at `ref` whose `node_modules` link to this checkout's.
 *
 * @param {string} [ref] the commit to check out.
 * @returns {string} the worktree's path; remove it with `closeWorktree`.
 */
export function openWorktree(ref = 'HEAD') {
  const dir = mkdtempSync(join(tmpdir(), 'eval-mutation-'))
  rmSync(dir, { recursive: true, force: true })
  git(['worktree', 'add', '--detach', '--quiet', dir, ref])
  for (const rel of NODE_MODULES) {
    const target = join(ROOT, rel)
    const link = join(dir, rel)
    if (existsSync(target) && existsSync(dirname(link)) && !existsSync(link)) symlinkSync(target, link, 'junction')
  }
  return dir
}

export const closeWorktree = (dir) => git(['worktree', 'remove', '--force', dir])

/**
 * Runs Stryker on one target inside a worktree, stopped at the budget.
 *
 * @param {string} dir the worktree from `openWorktree`.
 * @param {{ name: string, key: string, cwd: string, config: string, mutate?: string[] }} target the workspace; `config` is repo-relative or absolute, and `mutate` (when given) is what the config mutates.
 * @param {number} budgetSeconds the run is killed past this.
 * @returns {Promise<object>} the outcome, tallies and survivors.
 */
export function runTarget(dir, target, budgetSeconds) {
  const json = join(dir, `.eval-mutation-${target.key}.json`)
  const log = join(tmpdir(), `eval-mutation-${target.key}.log`)
  const config = resolve(ROOT, target.config)
  const mutate = target.mutate ?? (readFileSync(config, 'utf8').match(/mutate:\s*\[([\s\S]*?)\]/)?.[1] ?? '').match(/'[^']+'/g)?.map((s) => s.slice(1, -1)) ?? []
  const t0 = Date.now()
  return new Promise((done) => {
    const child = spawn('npx', ['--no-install', 'stryker', 'run', config, '--inPlace'], {
      cwd: join(dir, target.cwd),
      env: { ...process.env, CI: '1', FORCE_COLOR: '0', EVAL_STRYKER_JSON: json },
      detached: true,
    })
    let output = ''
    const keep = (chunk) => { output += chunk; appendFileSync(log, chunk) }
    writeFileSync(log, '')
    child.stdout.on('data', keep)
    child.stderr.on('data', keep)
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL') } catch {} }, budgetSeconds * 1000)
    child.on('close', (code) => {
      clearTimeout(timer)
      const seconds = Math.round((Date.now() - t0) / 1000)
      const report = !timedOut && existsSync(json) ? JSON.parse(readFileSync(json, 'utf8')) : null
      const progress = parseProgress(output)
      const outcome = timedOut
        ? `over budget (${budgetSeconds}s)${progress ? `: ${progress.tested} of ${progress.total} tested, ${progress.survived} survived` : ''}`
        : report ? 'ok' : `failed (exit ${code}): ${output.split('\n').filter((l) => /ERROR/.test(l)).slice(0, 2).join(' ').slice(0, 200)}`
      const { files, survivors } = report ? summarizeReport(report, `${target.cwd}/`) : { files: [], survivors: [] }
      done({ name: target.name, cwd: target.cwd, mutate, seconds, outcome, partial: report ? null : progress, files, survivors })
    })
  })
}

async function main() {
  const only = arg('--only', null)
  const budget = Number(arg('--budget', 1500))
  const head = git(['rev-parse', 'HEAD'])
  const stamp = { commit: head.slice(0, 8), date: git(['show', '-s', '--format=%cI', head]) }
  const previous = existsSync(join(OUT_DIR, 'mutation.json')) ? JSON.parse(readFileSync(join(OUT_DIR, 'mutation.json'), 'utf8')) : null

  const dir = openWorktree()
  const targets = []
  try {
    const results = await Promise.all(TARGETS.map((target) => {
      if (only && target.key !== only) return previous?.targets.find((t) => t.name === target.name) ?? null
      return runTarget(dir, target, budget).then((result) => {
        console.log(`${target.name}: ${result.outcome}, ${result.files.length} file(s), ${result.survivors.length} survivor(s), ${result.seconds}s`)
        return result
      })
    }))
    targets.push(...results.filter(Boolean))
  } finally {
    closeWorktree(dir)
  }

  const mutation = { stamp, targets }
  const section = renderMutationSection(mutation)
  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`${section}\n`)
    return
  }
  writeFileSync(join(OUT_DIR, 'mutation.json'), `${JSON.stringify(mutation, null, 2)}\n`)
  const latest = join(OUT_DIR, 'latest.md')
  writeFileSync(latest, spliceMarked(readFileSync(latest, 'utf8'), section, SECTION_START, SECTION_END))
  console.log('mutation scores -> docs/reports/eval/latest.md')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
