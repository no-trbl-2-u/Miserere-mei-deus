#!/usr/bin/env node
// scripts/pr-judge.mjs
//
// The `judge` job of `pr-review.yml` (phase LG1f,
// `plan/README.md` A6). The acceptance step (LG1c,
// `scripts/pr-acceptance.mjs`) checks that every ticked `- [x] A<n>` line
// names a proof; the judge runs each one on the PR head. A named test file
// runs on its own runner (`node --test`, vitest or jest, as the parent
// replay picks them); a named `npm`, `node` or `npx` command runs as written,
// with no shell, from the repo root. Each proof runs once however many lines
// name it, under a per-proof time limit. The job summary gives a pass or fail
// per acceptance line; `(no test: ...)` lines and shots are listed, not run;
// unproven and missing lines are the acceptance step's to fail. Any failed
// proof fails the job, and `verify-gate` fails with it.
//
//   node scripts/pr-judge.mjs plan --body-file <path>   # what would run; writes count= to GITHUB_OUTPUT
//   node scripts/pr-judge.mjs run --body-file <path> [--timeout-minutes <n>]
//   node scripts/pr-judge.mjs run --pr <n>              # local: read the body with gh
//
// `planJudge` and `decideJudge` are pure; `runProof` spawns, and only `main`
// reads git and GitHub.

import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runnerFor } from './eval/parent-replay-lib.mjs'
import { checkLine, parseAcceptance } from './pr-acceptance.mjs'

/** Per-proof time limit when the caller names none. */
export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

/** Shell syntax the judge will not run: it spawns one program, no shell. */
const SHELL_SYNTAX = /[|&;<>`]|\$\(|\$\{|\$[A-Za-z_]/

/**
 * A backticked command split into argv the way a shell would split plain
 * words and quoted strings. Returns null for shell syntax (pipes, `&&`,
 * redirects, substitutions, variables), which the judge does not run.
 *
 * @param {string} text the command.
 * @returns {string[]|null} argv, or null.
 * @example splitCommand('node -e "process.exit(0)"') // ['node', '-e', 'process.exit(0)']
 */
export function splitCommand(text) {
  const argv = []
  let cur = null
  let quote = null
  for (const ch of String(text)) {
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      cur ??= ''
    } else if (/\s/.test(ch)) {
      if (cur !== null) argv.push(cur)
      cur = null
    } else {
      if (SHELL_SYNTAX.test(ch)) return null
      cur = (cur ?? '') + ch
    }
  }
  if (quote) return null
  if (cur !== null) argv.push(cur)
  if (argv.some((a) => /\$\(|\$\{|\$[A-Za-z_]/.test(a))) return null
  return argv
}

/**
 * How one proof runs: a test file on its runner, a command as written.
 * A shot, or a file no runner owns, is listed and not run; a command with
 * shell syntax cannot run and fails.
 *
 * @param {{ kind: 'file'|'command', value: string }} proof a proof the acceptance step resolved.
 * @returns {{ key: string, label: string, argv?: string[], cwd?: string, skip?: string, error?: string }} the invocation.
 */
export function proofInvocation(proof) {
  if (proof.kind === 'command') {
    const argv = splitCommand(proof.value)
    if (!argv) return { key: `cmd:${proof.value}`, label: proof.value, error: 'uses shell syntax; the judge runs one command with no shell' }
    return { key: `cmd:${proof.value}`, label: proof.value, argv, cwd: '' }
  }
  const file = proof.value
  const r = runnerFor(file)
  if (!r) {
    const skip = /\.png$/.test(file) ? 'a shot; verify:visual checks it' : 'no runner owns this file'
    return { key: `file:${file}`, label: file, skip }
  }
  if (r.runner === 'node') return { key: `file:${file}`, label: `node --test ${file}`, argv: ['node', '--test', file], cwd: '' }
  const rel = file.slice(r.cwd.length + 1)
  const argv = r.runner === 'jest'
    ? ['npx', '--no-install', 'jest', '--ci', '--runTestsByPath', rel]
    : ['npx', '--no-install', 'vitest', 'run', rel]
  return { key: `file:${file}`, label: `${r.runner} ${file}`, argv, cwd: r.cwd }
}

/**
 * What the judge does with one PR body: each ticked line with its proofs'
 * invocations, and the distinct invocations to run.
 *
 * @param {string} body the PR body.
 * @param {string[]} headFiles every tracked path on the head.
 * @returns {{ lines: { id: string, status: string, reason: string|null, proofs: ReturnType<typeof proofInvocation>[] }[], runs: ReturnType<typeof proofInvocation>[] }} the plan; `runs` holds only invocations with argv.
 * @example planJudge('## Acceptance\n- [x] A1 ok `npm test`\n', []).runs.map((r) => r.label) // ['npm test']
 */
export function planJudge(body, headFiles) {
  const runs = new Map()
  const lines = parseAcceptance(body).map((l) => {
    const c = checkLine(l, headFiles)
    const proofs = c.status === 'proven'
      ? [...c.files.map((value) => ({ kind: 'file', value })), ...c.commands.map((value) => ({ kind: 'command', value }))].map(proofInvocation)
      : []
    for (const p of proofs) if (p.argv && !runs.has(p.key)) runs.set(p.key, p)
    return { id: c.id, status: c.status, reason: c.reason, proofs }
  })
  return { lines, runs: [...runs.values()] }
}

/**
 * The judge's verdict once its runs are done. A line passes when every
 * proof it names that ran passed; it fails when one failed or could not
 * run. A line whose proofs are all listed (shots) is `listed`; an opt-out
 * is `opt-out`; an unproven or missing line is `acceptance`, the
 * acceptance step's to fail.
 *
 * @param {ReturnType<typeof planJudge>} plan the plan.
 * @param {Record<string, { ok: boolean, timedOut?: boolean, code?: number|null, ms?: number, tail?: string }>} results keyed by invocation key.
 * @returns {{ state: 'green'|'red'|'none', lines: object[] }} red when any line fails; none when nothing is ticked.
 */
export function decideJudge(plan, results) {
  if (!plan.lines.length) return { state: 'none', lines: [] }
  const lines = plan.lines.map((l) => {
    if (l.status === 'opt-out') return { ...l, verdict: 'opt-out', proofs: [] }
    if (l.status !== 'proven') return { ...l, verdict: 'acceptance', proofs: [] }
    const proofs = l.proofs.map((p) => {
      if (p.error) return { ...p, outcome: 'fail', why: p.error }
      if (p.skip) return { ...p, outcome: 'listed', why: p.skip }
      const r = results[p.key]
      if (!r) return { ...p, outcome: 'fail', why: 'did not run' }
      if (r.ok) return { ...p, outcome: 'pass', ms: r.ms }
      return { ...p, outcome: 'fail', ms: r.ms, why: r.timedOut ? `timed out after ${Math.round((r.ms ?? 0) / 1000)} s` : `exit ${r.code}`, tail: r.tail }
    })
    const verdict = proofs.some((p) => p.outcome === 'fail') ? 'fail'
      : proofs.some((p) => p.outcome === 'pass') ? 'pass' : 'listed'
    return { ...l, verdict, proofs }
  })
  return { state: lines.some((l) => l.verdict === 'fail') ? 'red' : 'green', lines }
}

/**
 * The summary the job prints and writes to the step summary.
 *
 * @param {ReturnType<typeof decideJudge>} d the verdict.
 * @returns {string} markdown.
 */
export function describeJudge(d) {
  if (d.state === 'none') return 'judge: no ticked `A<n>` line in the PR body (nothing to run)'
  const secs = (ms) => (ms === undefined ? '' : ` (${(ms / 1000).toFixed(1)} s)`)
  const out = [`judge: ${d.state}`]
  for (const l of d.lines) {
    if (l.verdict === 'opt-out') out.push(`- ${l.id}: listed, not run: no test, for T: ${l.reason}`)
    else if (l.verdict === 'acceptance') out.push(`- ${l.id}: not run: names no proof the head holds (the acceptance step reports it)`)
    else {
      out.push(`- ${l.id}: ${l.verdict}`)
      for (const p of l.proofs) out.push(`  - \`${p.label}\`: ${p.outcome}${p.why ? `, ${p.why}` : ''}${secs(p.ms)}`)
    }
  }
  const failed = d.lines.flatMap((l) => l.proofs).filter((p) => p.outcome === 'fail' && p.tail)
  const seen = new Set()
  for (const p of failed) {
    if (seen.has(p.key)) continue
    seen.add(p.key)
    out.push('', `<details><summary>${p.label}: last output</summary>`, '', '```', p.tail.trimEnd(), '```', '', '</details>')
  }
  return out.join('\n')
}

/**
 * Run one invocation in its own process group, killed whole at the limit.
 *
 * @param {{ argv: string[], cwd: string, label: string }} inv the invocation.
 * @param {{ root: string, timeoutMs?: number, echo?: boolean }} opts the repo root and the limit.
 * @returns {Promise<{ ok: boolean, code: number|null, timedOut: boolean, ms: number, tail: string }>} the result; tail is the last 4 KB of output.
 */
export function runProof(inv, { root, timeoutMs = DEFAULT_TIMEOUT_MS, echo = false }) {
  const started = Date.now()
  const [cmd, ...args] = inv.argv
  const program = cmd === 'node' ? process.execPath : cmd
  return new Promise((done) => {
    let tail = ''
    const keep = (chunk) => {
      if (echo) process.stdout.write(chunk)
      tail = (tail + chunk).slice(-4096)
    }
    let child
    try {
      child = spawn(program, args, { cwd: join(root, inv.cwd), detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: 'true' } })
    } catch (e) {
      done({ ok: false, code: null, timedOut: false, ms: 0, tail: String(e?.message ?? e) })
      return
    }
    let timedOut = false
    let settled = false
    const finish = (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      done({ ok: !timedOut && code === 0, code, timedOut, ms: Date.now() - started, tail })
    }
    const timer = setTimeout(() => {
      timedOut = true
      try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
    }, timeoutMs)
    child.stdout.on('data', keep)
    child.stderr.on('data', keep)
    child.on('error', (e) => { tail += String(e?.message ?? e); finish(null) })
    // `exit`, not `close`: a grandchild left holding the pipe must not hold the judge.
    child.on('exit', (code) => setTimeout(() => finish(code), 50))
  })
}

/**
 * Run every distinct invocation in a plan, one at a time.
 *
 * @param {ReturnType<typeof planJudge>} plan the plan.
 * @param {(inv: object) => Promise<object>} run runs one invocation.
 * @returns {Promise<Record<string, object>>} results keyed by invocation key.
 */
export async function runPlan(plan, run) {
  const results = {}
  for (const inv of plan.runs) results[inv.key] = await run(inv)
  return results
}

// --- I/O ----------------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}

function report(text) {
  console.log(text)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n\n`)
}

async function main() {
  const mode = process.argv[2]
  const pr = arg('--pr')
  const bodyFile = arg('--body-file')
  if (!['plan', 'run'].includes(mode) || (!pr && !bodyFile)) {
    console.error('usage: pr-judge.mjs plan|run --body-file <path> | --pr <n> [--head <sha>] [--timeout-minutes <n>]')
    process.exit(2)
  }
  const repo = process.env.GH_REPO || 'no-trbl-2-u/Miserere-mei-deus'
  const body = bodyFile
    ? readFileSync(bodyFile, 'utf8')
    : execFileSync('gh', ['pr', 'view', pr, '--repo', repo, '--json', 'body', '--jq', '.body'], { cwd: ROOT, encoding: 'utf8' })
  const head = arg('--head')
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const headFiles = (head ? git(['ls-tree', '-r', '--name-only', head]) : git(['ls-files'])).split('\n').filter(Boolean)
  const plan = planJudge(body, headFiles)
  if (mode === 'plan') {
    console.log(`judge: ${plan.runs.length} proof(s) to run${plan.runs.map((r) => `\n- \`${r.label}\``).join('')}`)
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `count=${plan.runs.length}\n`)
    return
  }
  const minutes = Number(arg('--timeout-minutes'))
  const timeoutMs = minutes > 0 ? minutes * 60 * 1000 : DEFAULT_TIMEOUT_MS
  const results = await runPlan(plan, (inv) => {
    console.log(`::group::${inv.label}`)
    return runProof(inv, { root: ROOT, timeoutMs, echo: true }).finally(() => console.log('::endgroup::'))
  })
  const d = decideJudge(plan, results)
  report(describeJudge(d))
  if (d.state === 'red') process.exit(1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
