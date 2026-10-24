#!/usr/bin/env node
// scripts/eval/mutation-pr.mjs
//
// Mutation on a PR's changed lines (phase LG1g, brief A7): StrykerJS mutates
// only the lines the PR adds or changes in `axiomancer-mechanics/src`, then
// in the `axiomancer-mobile` app folders with whatever budget is left, and
// writes the score and every survivor's file and line as markdown. Report
// only: it exits 0 whatever it finds, and on its own errors. Run by job
// `mutation` in `pr-review.yml`; the pure parts live in `mutation-lib.mjs`
// and the worktree runner in `mutation.mjs`.
//
//   node scripts/eval/mutation-pr.mjs scope --base <sha> [--head <sha>]
//   node scripts/eval/mutation-pr.mjs run --base <sha> [--head <sha>] [--budget <seconds>] [--out <file>]
//
// `scope` prints the line ranges and writes `count=<workspaces>` to
// `$GITHUB_OUTPUT`, so the job installs dependencies only when there is
// something to mutate. A workspace reached with under two minutes of budget
// left is skipped and says so.

import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { PR_SCOPES, parseChangedLines, renderPrReport, scopeChangedLines } from './mutation-lib.mjs'
import { closeWorktree, openWorktree, runTarget } from './mutation.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const MIN_SECONDS = 120

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()

function scopeOf(base, head) {
  const diff = git(['diff', '--no-color', '--unified=0', `${base}...${head}`, '--', ...PR_SCOPES.map((s) => s.cwd)])
  return scopeChangedLines(parseChangedLines(diff))
}

/** A config file that is the workspace's EV1c config with `mutate` replaced. */
function rangeConfig(dir, scope) {
  const file = join(dir, `stryker-pr-${scope.key}.config.mjs`)
  const base = pathToFileURL(resolve(ROOT, scope.config)).href
  writeFileSync(file, `import base from ${JSON.stringify(base)}\nexport default { ...base, mutate: ${JSON.stringify(scope.mutate)} }\n`)
  return file
}

async function run(base, head, budgetSeconds) {
  const scopes = scopeOf(base, head)
  const targets = []
  if (scopes.length === 0) return { base, head, budgetSeconds, targets }
  const deadline = Date.now() + budgetSeconds * 1000
  const configs = mkdtempSync(join(tmpdir(), 'mutation-pr-'))
  const dir = openWorktree(head)
  try {
    for (const scope of scopes) {
      const left = Math.floor((deadline - Date.now()) / 1000)
      if (left < MIN_SECONDS) {
        targets.push({ name: scope.name, lines: scope.lines, files: [], seconds: 0, outcome: 'skipped: budget spent', partial: null, survivors: [] })
        continue
      }
      const result = await runTarget(dir, { ...scope, config: rangeConfig(configs, scope) }, left)
      console.log(`${scope.name}: ${result.outcome}, ${result.survivors.length} survivor(s), ${result.seconds}s`)
      for (const s of result.survivors) console.log(`  ${s.status} ${s.path}:${s.line} ${s.mutator} -> ${s.replacement}`)
      targets.push({ ...result, lines: scope.lines })
    }
  } finally {
    closeWorktree(dir)
    rmSync(configs, { recursive: true, force: true })
  }
  return { base, head, budgetSeconds, targets }
}

async function main() {
  const [command] = process.argv.slice(2)
  const base = git(['rev-parse', arg('--base', 'origin/main')])
  const head = git(['rev-parse', arg('--head', 'HEAD')])
  if (command === 'scope') {
    const scopes = scopeOf(base, head)
    for (const s of scopes) console.log(`${s.name}: ${s.files} file(s), ${s.lines} line(s)\n  ${s.mutate.join('\n  ')}`)
    if (scopes.length === 0) console.log('no changed source lines to mutate')
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `count=${scopes.length}\n`)
    return
  }
  if (command !== 'run') {
    console.error('usage: mutation-pr.mjs scope|run --base <sha> [--head <sha>] [--budget <seconds>] [--out <file>]')
    process.exitCode = 2
    return
  }
  const budgetSeconds = Number(arg('--budget', 900))
  let report
  try {
    report = renderPrReport(await run(base, head, budgetSeconds))
  } catch (err) {
    report = renderPrReport({ base, head, budgetSeconds, targets: [{ name: 'all', files: [], seconds: 0, outcome: `failed: ${String(err.message).split('\n')[0].slice(0, 200)}`, partial: null, survivors: [] }] })
  }
  const out = arg('--out', null)
  if (out) writeFileSync(out, `${report}\n`)
  else process.stdout.write(`${report}\n`)
}

main()
