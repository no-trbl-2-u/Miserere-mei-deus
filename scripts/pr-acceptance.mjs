#!/usr/bin/env node
// scripts/pr-acceptance.mjs
//
// The acceptance-proof step of the `verify-gate` check (phase LG1c,
// `plan/phases/phase_LG1_loop_gates.md` A3). A PR body's `## Acceptance`
// section ticks the brief's IDs it closes; each ticked `- [x] A<n>` line
// must name its proof: a backticked test file or `verify:visual` shot that
// exists on the PR head, or a backticked `npm`, `node` or `npx` command. A
// line may instead end with `(no test: <reason>)`, which the summary lists
// for T. A ticked line with neither, or one naming a proof file the head
// does not hold, fails the gate. A body with no Acceptance section (a fix
// with no brief) passes.
//
//   node scripts/pr-acceptance.mjs --pr <n> [--head <sha>]   # the gate step
//   node scripts/pr-acceptance.mjs --body-file <path>        # check a body before `gh pr create`
//
// The decision (`decideAcceptance`) is pure; only `main` reads git and GitHub.

import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The programs a backticked command proof may start with. */
export const PROOF_COMMANDS = Object.freeze(['npm', 'node', 'npx'])

/** A backticked token that names a proof file: a test suite or a shot. */
const PROOF_FILE = /(\.(test|spec)\.[cm]?[jt]sx?|\.png)$/

const TICKED = /^- \[[xX]\] (A\d+[a-z]?)\b\s*(.*)$/
const OPT_OUT = /\(no test:\s*([^)]*\S)\s*\)\s*\.?\s*$/

/**
 * The ticked lines of a PR body's `## Acceptance` section. An item's
 * indented continuation lines join it; unticked items and lines that tick
 * no `A<n>` are not the gate's business.
 *
 * @param {string} body the PR body.
 * @returns {{ id: string, text: string }[]} one entry per ticked line; empty when the section is absent.
 * @example parseAcceptance('## Acceptance\n- [x] A1 holds `npm test`\n').map((l) => l.id) // ['A1']
 */
export function parseAcceptance(body) {
  const lines = String(body ?? '').replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex((l) => /^##\s+Acceptance\s*$/.test(l.trim()))
  if (start < 0) return []
  const items = []
  let open = null
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}\s/.test(line)) break
    if (/^\s*-\s/.test(line) && !/^\s{2,}/.test(line)) {
      const m = TICKED.exec(line.trim())
      open = m ? { id: m[1], text: m[2].trim() } : null
      if (open) items.push(open)
    } else if (open && /^\s+\S/.test(line)) {
      open.text = `${open.text} ${line.trim()}`
    } else if (!line.trim()) {
      open = null
    }
  }
  return items
}

/**
 * Resolve a proof-file token against the head's tracked files: an exact
 * path, or a bare file name that some tracked file carries.
 *
 * @param {string} token the backticked text.
 * @param {string[]} headFiles every tracked path on the head.
 * @returns {string|null} the matched path, or null.
 */
export function resolveProofFile(token, headFiles) {
  const t = token.replace(/^\.\//, '')
  if (headFiles.includes(t)) return t
  if (t.includes('/')) return null
  return headFiles.find((f) => f.split('/').pop() === t) ?? null
}

/**
 * One ticked line's verdict.
 *
 * @param {{ id: string, text: string }} line a parsed line.
 * @param {string[]} headFiles every tracked path on the head.
 * @returns {{ id: string, text: string, status: 'proven'|'opt-out'|'unproven'|'missing', files: string[], commands: string[], missing: string[], reason: string|null }} the verdict.
 */
export function checkLine(line, headFiles) {
  const tokens = [...line.text.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim())
  const commands = tokens.filter((t) => PROOF_COMMANDS.includes(t.split(/\s+/)[0]) && /\s/.test(t))
  const files = []
  const missing = []
  for (const t of tokens) {
    if (/\s/.test(t) || !PROOF_FILE.test(t)) continue
    const hit = resolveProofFile(t, headFiles)
    if (hit) files.push(hit)
    else missing.push(t)
  }
  const reason = OPT_OUT.exec(line.text)?.[1] ?? null
  const status = missing.length ? 'missing'
    : files.length || commands.length ? 'proven'
      : reason ? 'opt-out' : 'unproven'
  return { id: line.id, text: line.text, status, files, commands, missing, reason }
}

/**
 * The acceptance step's state for one PR body.
 *
 * @param {string} body the PR body.
 * @param {string[]} headFiles every tracked path on the head.
 * @returns {{ state: 'green'|'red'|'none', lines: ReturnType<typeof checkLine>[] }} red when any ticked line is unproven or names a missing file; none when nothing is ticked.
 * @example decideAcceptance('## Acceptance\n- [x] A1 ships (no test: doc only)\n', []).state // 'green'
 */
export function decideAcceptance(body, headFiles) {
  const lines = parseAcceptance(body).map((l) => checkLine(l, headFiles))
  if (!lines.length) return { state: 'none', lines }
  const red = lines.some((l) => l.status === 'unproven' || l.status === 'missing')
  return { state: red ? 'red' : 'green', lines }
}

/**
 * The summary the step prints and writes to the step summary.
 *
 * @param {ReturnType<typeof decideAcceptance>} d the decision.
 * @returns {string} markdown.
 */
export function describeAcceptance(d) {
  if (d.state === 'none') return 'acceptance proof: no ticked `A<n>` line in the PR body (nothing to check)'
  const out = [`acceptance proof: ${d.state}`]
  for (const l of d.lines) {
    if (l.status === 'proven') {
      out.push(`- ${l.id}: proven by ${[...l.files, ...l.commands].map((p) => `\`${p}\``).join(', ')}`)
    } else if (l.status === 'opt-out') {
      out.push(`- ${l.id}: no test, for T: ${l.reason}`)
    } else if (l.status === 'missing') {
      out.push(`- ${l.id}: names ${l.missing.map((p) => `\`${p}\``).join(', ')}, which the head does not hold`)
    } else {
      out.push(`- ${l.id}: names no proof; add a backticked test file, shot or \`npm\`/\`node\`/\`npx\` command, or end the line with \`(no test: <reason>)\``)
    }
  }
  return out.join('\n')
}

// --- I/O ----------------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function report(text) {
  console.log(text)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n\n`)
}

function main() {
  const pr = arg('--pr')
  const bodyFile = arg('--body-file')
  if (!pr && !bodyFile) {
    console.error('usage: pr-acceptance.mjs --pr <n> [--head <sha>] | --body-file <path>')
    process.exit(2)
  }
  const repo = process.env.GH_REPO || 'no-trbl-2-u/Miserere-mei-deus'
  const body = bodyFile
    ? readFileSync(bodyFile, 'utf8')
    : execFileSync('gh', ['pr', 'view', pr, '--repo', repo, '--json', 'body', '--jq', '.body'], { cwd: ROOT, encoding: 'utf8' })
  const head = arg('--head')
  const headFiles = (head ? git(['ls-tree', '-r', '--name-only', head]) : git(['ls-files'])).split('\n').filter(Boolean)
  const d = decideAcceptance(body, headFiles)
  report(describeAcceptance(d))
  if (d.state === 'red') process.exit(1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
