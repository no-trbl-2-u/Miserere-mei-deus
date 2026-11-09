#!/usr/bin/env node
// scripts/sim-breaks.mjs
//
// Files what the sim runs broke as GitHub issues (phase SM2d). `npm run sim:run
// -- --breaks <file>` appends one JSON line per break (a crash, a stuck run, a
// stuck fight, a quest no road can finish, a node left unresolved); this reads
// the file and files ONE issue per break key (`<persona>:<map>/<node>:<kind>`):
//
//   - a key with an open issue files nothing;
//   - a key whose issue was closed as completed is reopened with a comment
//     naming the new seed and build (the fix did not hold);
//   - a key whose issue was closed as not planned stays closed;
//   - a new key opens `sim break: <kind> at <map>/<node> (<persona>)`, labelled
//     `bug` and `sim-break` (created if missing), never a `triage:*` or
//     `loop:opened` label, so /triage routes it as a bug. At most 10 new
//     issues a run; the rest are listed.
//
// The key rides in the issue body as `<!-- sim-break-key: KEY -->`. It talks to
// GitHub through `gh api` (REST). A measurement, never a gate: it exits 1 only
// when GitHub refuses a call or the file cannot be read.
//
// Usage:
//   npm run sim:breaks -- --file <breaks.jsonl> [--repo owner/name] [--max 10] [--dry-run]

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

export const USAGE = 'usage: npm run sim:breaks -- --file <breaks.jsonl> [--repo owner/name] [--max <n>] [--dry-run]'

/** New issues filed in one run. */
export const MAX_NEW_ISSUES = 10

export const LABELS = [
  { name: 'bug', color: 'd73a4a', description: "Something isn't working" },
  { name: 'sim-break', color: 'b60205', description: 'Filed by the nightly sim runs' },
]

const MARKER = /<!--\s*sim-break-key:\s*(.+?)\s*-->/

export function parseArgs(argv) {
  const opts = { file: null, repo: null, max: MAX_NEW_ISSUES, dryRun: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') { opts.dryRun = true; continue }
    if (arg === '--help' || arg === '-h') { opts.help = true; continue }
    const m = /^--(file|repo|max)(?:=(.*))?$/.exec(arg)
    if (!m) throw new Error(`unknown argument '${arg}'`)
    const value = m[2] ?? argv[++i]
    if (value === undefined || value === '') throw new Error(`--${m[1]} needs a value`)
    if (m[1] === 'max') {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 0) throw new Error(`--max must be a non-negative integer, not '${value}'`)
      opts.max = n
    } else opts[m[1]] = value
  }
  return opts
}

/** The break lines of a file, one per key (the first seed that hit it), in file order. */
export function readBreaks(text) {
  const seen = new Map()
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    const b = JSON.parse(line)
    if (typeof b.key !== 'string' || typeof b.kind !== 'string') throw new Error(`not a break line: ${line.slice(0, 80)}`)
    if (!seen.has(b.key)) seen.set(b.key, b)
  }
  return [...seen.values()]
}

export function titleOf(b) {
  return `sim break: ${b.kind} at ${b.state.map}/${b.state.node} (${b.persona})`
}

export function replayCommand(b) {
  return `npm run sim:run -- --policy ${b.persona} --runs 1 --seed ${b.seed}`
}

function stateLines(b) {
  const s = b.state
  const quests = s.quests.length === 0 ? 'none' : s.quests.map((q) => `${q.name} (next: ${q.next})`).join('; ')
  return [
    `- map/node: ${s.map}/${s.node}`,
    `- step: ${s.step}, screen: ${s.screen}`,
    `- level ${s.level}, VITAE ${s.vitae}/${s.maxVitae}, deck ${s.deckSize} cards`,
    `- active quests: ${quests}`,
  ]
}

/** The issue body: the marker, the break, the state and the replay. */
export function bodyOf(b) {
  const events = b.state.lastEvents.length === 0 ? '(none)' : b.state.lastEvents.map((e) => `- ${e}`).join('\n')
  return [
    `<!-- sim-break-key: ${b.key} -->`,
    `The nightly sim runs hit a **${b.kind}**.`,
    '',
    `- persona: \`${b.persona}\` (${b.characterId ?? 'unknown character'})`,
    `- seed: ${b.seed}`,
    `- build: ${b.build ?? 'unknown'}`,
    `- key: \`${b.key}\``,
    '',
    b.message,
    '',
    '### State',
    ...stateLines(b),
    '',
    '### Last run events',
    events,
    '',
    '### Replay',
    '```',
    replayCommand(b),
    '```',
  ].join('\n')
}

export function reopenComment(b) {
  return `The sim hit this again after it was closed as completed: seed ${b.seed}, build ${b.build ?? 'unknown'}, persona \`${b.persona}\`. The fix did not hold.\n\nReplay: \`${replayCommand(b)}\``
}

/** Runs `gh` with args; returns `{ status, stdout, stderr }`. */
export function runGh(args, { spawn = spawnSync } = {}) {
  const res = spawn('gh', args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
  return { status: res.status ?? 1, stdout: String(res.stdout ?? ''), stderr: String(res.stderr ?? '') }
}

/** Every issue carrying the sim-break label (any state), by key: the open one wins, else the newest closed. */
export function indexIssues(gh, repo) {
  const byKey = new Map()
  for (let page = 1; page < 50; page++) {
    const res = gh(['api', `repos/${repo}/issues?labels=sim-break&state=all&per_page=100&page=${page}`])
    if (res.status !== 0) throw new Error(`listing issues failed: ${res.stderr.trim() || `exit ${res.status}`}`)
    const issues = JSON.parse(res.stdout || '[]')
    for (const issue of issues) {
      if (issue.pull_request) continue
      const m = MARKER.exec(issue.body ?? '')
      if (!m) continue
      const have = byKey.get(m[1])
      if (!have || (have.state !== 'open' && (issue.state === 'open' || issue.number > have.number))) byKey.set(m[1], issue)
    }
    if (issues.length < 100) break
  }
  return byKey
}

function ensureLabels(gh, repo) {
  for (const label of LABELS) {
    const got = gh(['api', `repos/${repo}/labels/${label.name}`])
    if (got.status === 0) continue
    const made = gh(['api', '--method', 'POST', `repos/${repo}/labels`, '-f', `name=${label.name}`, '-f', `color=${label.color}`, '-f', `description=${label.description}`])
    if (made.status !== 0) throw new Error(`creating label ${label.name} failed: ${made.stderr.trim()}`)
  }
}

/**
 * File the breaks. Returns `{ filed, reopened, open, left, deferred, errors }`
 * (keys for each), after a gh call each; nothing is sent with `dryRun`.
 */
export function fileBreaks(breaks, repo, { gh = runGh, max = MAX_NEW_ISSUES, dryRun = false } = {}) {
  const out = { filed: [], reopened: [], open: [], left: [], deferred: [], errors: [] }
  if (breaks.length === 0) return out
  const known = indexIssues(gh, repo)
  if (!dryRun) ensureLabels(gh, repo)
  for (const b of breaks) {
    const issue = known.get(b.key)
    if (issue?.state === 'open') { out.open.push(b.key); continue }
    if (issue) {
      if (issue.state_reason === 'not_planned') { out.left.push(b.key); continue }
      if (!dryRun) {
        const c = gh(['api', '--method', 'POST', `repos/${repo}/issues/${issue.number}/comments`, '-f', `body=${reopenComment(b)}`])
        const r = c.status === 0 ? gh(['api', '--method', 'PATCH', `repos/${repo}/issues/${issue.number}`, '-f', 'state=open']) : c
        if (r.status !== 0) { out.errors.push(`${b.key}: reopening #${issue.number} failed: ${r.stderr.trim()}`); continue }
      }
      out.reopened.push(b.key)
      continue
    }
    if (out.filed.length >= max) { out.deferred.push(b.key); continue }
    if (!dryRun) {
      const res = gh(['api', '--method', 'POST', `repos/${repo}/issues`, '-f', `title=${titleOf(b)}`, '-f', `body=${bodyOf(b)}`, '-f', 'labels[]=bug', '-f', 'labels[]=sim-break'])
      if (res.status !== 0) { out.errors.push(`${b.key}: filing failed: ${res.stderr.trim()}`); continue }
    }
    out.filed.push(b.key)
  }
  return out
}

export function main(argv, { stdout = process.stdout, stderr = process.stderr, gh = runGh, env = process.env, read = readFileSync, exists = existsSync } = {}) {
  let opts
  try {
    opts = parseArgs(argv)
  } catch (err) {
    stderr.write(`sim-breaks: ${err.message}\n${USAGE}\n`)
    return 2
  }
  if (opts.help) { stdout.write(`${USAGE}\n`); return 0 }
  if (!opts.file) { stderr.write(`sim-breaks: --file is required\n${USAGE}\n`); return 2 }
  const repo = opts.repo ?? env.GITHUB_REPOSITORY
  if (!repo) { stderr.write('sim-breaks: no repo (set GITHUB_REPOSITORY or pass --repo owner/name)\n'); return 2 }
  let breaks
  try {
    breaks = exists(opts.file) ? readBreaks(read(opts.file, 'utf-8')) : []
  } catch (err) {
    stderr.write(`sim-breaks: cannot read ${opts.file}: ${err.message}\n`)
    return 1
  }
  if (breaks.length === 0) {
    stdout.write('sim-breaks: no breaks to file\n')
    return 0
  }
  let res
  try {
    res = fileBreaks(breaks, repo, { gh, max: opts.max, dryRun: opts.dryRun })
  } catch (err) {
    stderr.write(`sim-breaks: ${err.message}\n`)
    return 1
  }
  const tag = opts.dryRun ? ' (dry run)' : ''
  stdout.write(`sim-breaks${tag}: ${breaks.length} break key(s): ${res.filed.length} filed, ${res.reopened.length} reopened, ${res.open.length} already open, ${res.left.length} closed as not planned, ${res.deferred.length} over the cap of ${opts.max}\n`)
  for (const [label, keys] of [['filed', res.filed], ['reopened', res.reopened], ['over the cap (not filed)', res.deferred]]) {
    for (const key of keys) stdout.write(`  ${label}: ${key}\n`)
  }
  for (const e of res.errors) stderr.write(`sim-breaks: ${e}\n`)
  return res.errors.length > 0 ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2))
}
