#!/usr/bin/env node
// scripts/claims.mjs
//
// The claims record (phase HW1b). `claims.json` lives on an orphan `claims`
// branch of origin and says who is building which build-plan row before that
// row's PR exists. Once the PR opens, the PR is the claim and the holder
// releases its entry, so the record only ever holds pre-PR work.
//
//   claims.json = { "<id>": { "owner": "<o>", "at": "<iso>", "renewed": "<iso>", "ttlHours": 24 } }
//
// A claim is live until `renewed + ttlHours`. A claim past that counts as
// free, and the next write drops it. Expiry is the only sweep; `prune` is
// there for a human.
//
// Every write is a compare-and-swap with git plumbing and never touches a
// working tree: fetch the branch tip into a private ref, build the new
// claims.json with `hash-object -w`, `mktree` and `commit-tree` (parent = the
// fetched tip; the very first claim makes a root commit), then
// `git push <remote> <sha>:refs/heads/claims` with no force. A push that loses
// the race is rejected as a non-fast-forward; the writer re-fetches, re-applies
// its change to the new tip and tries again, up to MAX_RETRIES more times.
// Every `push:` trigger in .github/workflows/ is `branches: [main]`, so a push
// to `claims` fires nothing (claims.test.mjs pins that).
//
// Subcommands:
//
//   claim <id...> --owner <o> [--ttl <hours>]
//       All or nothing. Every id must be free, expired or already the
//       owner's; otherwise nothing is written and each held id prints
//       `held <id> by <owner> until <iso>`. A re-claim of the owner's own id
//       renews it (keeps `at`).                      exit 0 claimed, 1 refused
//   renew --owner <o> [--ttl <hours>]
//       Renews every live claim the owner holds.     exit 0
//   release <id...> --owner <o>   |   release --all --owner <o>
//       Drops the owner's claims on those ids (or all of them). An id held by
//       someone else is left alone and printed `skipped <id> held by <owner>`.
//                                                    exit 0
//   check <id> [--owner <o>]
//       `free <id>`, `mine <id> until <iso>` (held by --owner) or
//       `held <id> by <owner> until <iso>`.          exit 0 free or mine, 1 held
//   list [--json]
//       Every live claim, `<id>\t<owner>\tuntil <iso>`, or the JSON object.
//   prune
//       Drops every expired claim (`pruned <id> (<owner>)`).
//
// Common flags: --remote <name or url> (default `origin`, or $CLAIMS_REMOTE),
// --cwd <dir> (the git repo to run in; default the current directory).
// $CLAIMS_NOW (an ISO time) overrides the clock, for tests.
//
// Exit codes: 0 ok, 1 refused or held, 2 usage error, 3 tooling error (git,
// network, auth, or the push lost the race MAX_RETRIES + 1 times). A caller
// that gets 3 falls back to its older checks: the claim is best-effort.

import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import path from 'node:path'

export const BRANCH = 'claims'
export const FILE = 'claims.json'
export const DEFAULT_TTL_HOURS = 24
export const MAX_RETRIES = 5

export const EXIT = { ok: 0, refused: 1, usage: 2, tooling: 3 }

export class ToolingError extends Error {}
class UsageError extends Error {}

// --- the record (pure) ------------------------------------------------

/** Parse claims.json text tolerantly: a BOM, CRLF and an empty file are all fine. */
export function parseRecord(text) {
  const clean = String(text ?? '').replace(/^﻿/, '').replace(/\r\n/g, '\n').trim()
  if (!clean) return {}
  const data = JSON.parse(clean)
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ToolingError(`${FILE} is not a JSON object`)
  }
  return data
}

/** The canonical text: sorted ids, two-space indent, LF, trailing newline. */
export function serializeRecord(record) {
  const sorted = {}
  for (const id of Object.keys(record).sort()) sorted[id] = record[id]
  return JSON.stringify(sorted, null, 2) + '\n'
}

export function expiresAt(entry) {
  const renewed = Date.parse(entry?.renewed ?? entry?.at ?? '')
  const ttl = Number(entry?.ttlHours ?? DEFAULT_TTL_HOURS)
  if (!Number.isFinite(renewed) || !Number.isFinite(ttl)) return 0
  return renewed + ttl * 3600 * 1000
}

export function isLive(entry, now) {
  return expiresAt(entry) > now
}

const iso = (ms) => new Date(ms).toISOString()

/** Split a record into its live claims and the expired ones the next write drops. */
export function splitLive(record, now) {
  const live = {}
  const expired = {}
  for (const [id, entry] of Object.entries(record)) {
    if (isLive(entry, now)) live[id] = entry
    else expired[id] = entry
  }
  return { live, expired }
}

function heldLine(id, entry) {
  return `held ${id} by ${entry.owner} until ${iso(expiresAt(entry))}`
}

// Each operation takes (record, now) and returns
//   { record, changed, refused, lines }
// `record` is the record to write (expired claims already dropped) when
// `changed`; `refused` means nothing is written and the exit code is 1.

export function opClaim(record, now, { ids, owner, ttlHours = DEFAULT_TTL_HOURS }) {
  const { live } = splitLive(record, now)
  const held = ids.filter((id) => live[id] && live[id].owner !== owner)
  if (held.length > 0) {
    return { record, changed: false, refused: true, lines: held.map((id) => heldLine(id, live[id])) }
  }
  const next = { ...live }
  const lines = []
  for (const id of ids) {
    const at = live[id]?.at ?? iso(now)
    next[id] = { owner, at, renewed: iso(now), ttlHours }
    lines.push(`claimed ${id} by ${owner} until ${iso(expiresAt(next[id]))}`)
  }
  return { record: next, changed: true, refused: false, lines }
}

export function opRenew(record, now, { owner, ttlHours }) {
  const { live } = splitLive(record, now)
  const next = { ...live }
  const lines = []
  for (const [id, entry] of Object.entries(live)) {
    if (entry.owner !== owner) continue
    next[id] = { ...entry, renewed: iso(now), ttlHours: ttlHours ?? entry.ttlHours ?? DEFAULT_TTL_HOURS }
    lines.push(`renewed ${id} until ${iso(expiresAt(next[id]))}`)
  }
  const changed = lines.length > 0
  if (!changed) lines.push(`renewed nothing: ${owner} holds no live claim`)
  return { record: next, changed, refused: false, lines }
}

export function opRelease(record, now, { ids, owner, all = false }) {
  const { live } = splitLive(record, now)
  const next = { ...live }
  const lines = []
  const targets = all ? Object.keys(live).filter((id) => live[id].owner === owner) : ids
  for (const id of targets) {
    const entry = live[id]
    if (!entry) continue
    if (entry.owner !== owner) {
      lines.push(`skipped ${id} held by ${entry.owner}`)
      continue
    }
    delete next[id]
    lines.push(`released ${id}`)
  }
  const changed = lines.some((l) => l.startsWith('released '))
  if (lines.length === 0) lines.push(`released nothing: ${owner} holds none of those`)
  return { record: next, changed, refused: false, lines }
}

export function opPrune(record, now) {
  const { live, expired } = splitLive(record, now)
  const lines = Object.entries(expired).map(([id, e]) => `pruned ${id} (${e.owner})`)
  if (lines.length === 0) lines.push('pruned nothing')
  return { record: live, changed: Object.keys(expired).length > 0, refused: false, lines }
}

/** check: 0 free or held by `owner`, 1 held by anyone else. */
export function checkClaim(record, now, { id, owner }) {
  const entry = splitLive(record, now).live[id]
  if (!entry) return { code: EXIT.ok, line: `free ${id}` }
  if (owner && entry.owner === owner) return { code: EXIT.ok, line: `mine ${id} until ${iso(expiresAt(entry))}` }
  return { code: EXIT.refused, line: heldLine(id, entry) }
}

// --- git plumbing -----------------------------------------------------

// Commits need an identity; a CI runner or a fresh box may have none
// configured, so the record's commits carry a fixed one unless the caller set
// its own in the environment.
function gitEnv() {
  const env = { ...process.env }
  env.GIT_AUTHOR_NAME ||= 'claims.mjs'
  env.GIT_AUTHOR_EMAIL ||= 'claims@miserere.invalid'
  env.GIT_COMMITTER_NAME ||= env.GIT_AUTHOR_NAME
  env.GIT_COMMITTER_EMAIL ||= env.GIT_AUTHOR_EMAIL
  env.GIT_TERMINAL_PROMPT = '0'
  return env
}

function git(cwd, args, { input, allowFail = false } = {}) {
  const r = spawnSync('git', args, { cwd, input, encoding: 'utf-8', env: gitEnv(), windowsHide: true })
  if (r.error) throw new ToolingError(`git ${args[0]}: ${r.error.message}`)
  const out = { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
  if (out.status !== 0 && !allowFail) {
    throw new ToolingError(`git ${args.join(' ')} failed (${out.status}): ${out.stderr.trim()}`)
  }
  return out
}

/**
 * Fetch the remote tip of `claims` and read its record. The tip goes into a
 * private ref unique to this process, so two writers in one repository (or
 * in worktrees sharing one) never fight over a ref lock; it is deleted after.
 */
export function fetchTip(cwd, remote) {
  const ls = git(cwd, ['ls-remote', '--exit-code', remote, `refs/heads/${BRANCH}`], { allowFail: true })
  if (ls.status === 2) return { sha: null, record: {} }
  if (ls.status !== 0) throw new ToolingError(`git ls-remote ${remote} failed (${ls.status}): ${ls.stderr.trim()}`)
  const tmp = `refs/claims-fetch/${process.pid}-${crypto.randomBytes(4).toString('hex')}`
  try {
    git(cwd, ['fetch', '--quiet', '--no-tags', '--no-write-fetch-head', remote, `+refs/heads/${BRANCH}:${tmp}`])
    const sha = git(cwd, ['rev-parse', '--verify', `${tmp}^{commit}`]).stdout.trim()
    const blob = git(cwd, ['cat-file', 'blob', `${sha}:${FILE}`], { allowFail: true })
    const record = blob.status === 0 ? parseRecord(blob.stdout) : {}
    return { sha, record }
  } finally {
    git(cwd, ['update-ref', '-d', tmp], { allowFail: true })
  }
}

/** Build the commit for `record` on `parent` (null makes the orphan root). */
export function buildCommit(cwd, record, parent, message) {
  const blob = git(cwd, ['hash-object', '-w', '--stdin', '--no-filters'], { input: serializeRecord(record) }).stdout.trim()
  const tree = git(cwd, ['mktree'], { input: `100644 blob ${blob}\t${FILE}\n` }).stdout.trim()
  const args = ['commit-tree', '--no-gpg-sign', tree, '-m', message]
  if (parent) args.push('-p', parent)
  return git(cwd, args).stdout.trim()
}

/** Push without force; a non-fast-forward (the race lost) comes back non-zero. */
function pushCommit(cwd, remote, sha) {
  return git(cwd, ['push', '--quiet', remote, `${sha}:refs/heads/${BRANCH}`], { allowFail: true })
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function clock() {
  const forced = process.env.CLAIMS_NOW ? Date.parse(process.env.CLAIMS_NOW) : NaN
  return Number.isFinite(forced) ? forced : Date.now()
}

/**
 * Run one write operation as a compare-and-swap. `op(record, now)` is re-run
 * on every fresh tip, so a retry re-decides against what the winner wrote: a
 * claim that lost the race comes back refused, naming the winner.
 */
export function writeWithRetry(cwd, remote, op, message) {
  let lastError = ''
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const tip = fetchTip(cwd, remote)
    const result = op(tip.record, clock())
    if (result.refused || !result.changed) return result
    const sha = buildCommit(cwd, result.record, tip.sha, message)
    const push = pushCommit(cwd, remote, sha)
    if (push.status === 0) return result
    lastError = `push of ${sha.slice(0, 8)} rejected: ${push.stderr.trim().split('\n').pop()}`
    sleepMs(50 + Math.floor(Math.random() * 200) * (attempt + 1))
  }
  throw new ToolingError(`${lastError}; gave up after ${MAX_RETRIES} retries`)
}

// --- CLI --------------------------------------------------------------

export function parseArgs(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--all' || a === '--json') {
      flags[a.slice(2)] = true
    } else if (a.startsWith('--')) {
      const val = argv[i + 1]
      if (val === undefined || val.startsWith('--')) throw new UsageError(`${a} needs a value`)
      flags[a.slice(2)] = val
      i += 1
    } else {
      positional.push(a)
    }
  }
  return { verb: positional[0], ids: positional.slice(1), flags }
}

function needOwner(flags) {
  if (!flags.owner) throw new UsageError('--owner <o> is required')
  return flags.owner
}

function ttlOf(flags) {
  if (flags.ttl === undefined) return undefined
  const ttl = Number(flags.ttl)
  if (!Number.isFinite(ttl) || ttl <= 0) throw new UsageError('--ttl must be a positive number of hours')
  return ttl
}

const USAGE = [
  'usage: node scripts/claims.mjs <verb> [args] [--remote <r>] [--cwd <dir>]',
  '  claim <id...> --owner <o> [--ttl <hours>]',
  '  renew --owner <o> [--ttl <hours>]',
  '  release <id...> --owner <o>  |  release --all --owner <o>',
  '  check <id> [--owner <o>]',
  '  list [--json]',
  '  prune',
].join('\n')

/** Run the CLI; returns { code, stdout, stderr } so tests can call it in-process. */
export function run(argv) {
  const out = []
  try {
    const { verb, ids, flags } = parseArgs(argv)
    const cwd = flags.cwd ? path.resolve(flags.cwd) : process.cwd()
    const remote = flags.remote || process.env.CLAIMS_REMOTE || 'origin'
    const write = (op, message) => {
      const result = writeWithRetry(cwd, remote, op, message)
      out.push(...result.lines)
      return result.refused ? EXIT.refused : EXIT.ok
    }
    switch (verb) {
      case 'claim': {
        const owner = needOwner(flags)
        if (ids.length === 0) throw new UsageError('claim needs at least one id')
        const ttlHours = ttlOf(flags) ?? DEFAULT_TTL_HOURS
        return done(write((r, now) => opClaim(r, now, { ids, owner, ttlHours }), `claims: ${owner} claims ${ids.join(' ')}`))
      }
      case 'renew': {
        const owner = needOwner(flags)
        const ttlHours = ttlOf(flags)
        return done(write((r, now) => opRenew(r, now, { owner, ttlHours }), `claims: ${owner} renews`))
      }
      case 'release': {
        const owner = needOwner(flags)
        if (ids.length === 0 && !flags.all) throw new UsageError('release needs ids or --all')
        return done(write((r, now) => opRelease(r, now, { ids, owner, all: Boolean(flags.all) }),
          `claims: ${owner} releases ${flags.all ? 'all' : ids.join(' ')}`))
      }
      case 'prune':
        return done(write((r, now) => opPrune(r, now), 'claims: prune expired'))
      case 'check': {
        if (ids.length !== 1) throw new UsageError('check takes exactly one id')
        const { record } = fetchTip(cwd, remote)
        const { code, line } = checkClaim(record, clock(), { id: ids[0], owner: flags.owner })
        out.push(line)
        return done(code)
      }
      case 'list': {
        const { live } = splitLive(fetchTip(cwd, remote).record, clock())
        if (flags.json) out.push(serializeRecord(live).trimEnd())
        else for (const [id, e] of Object.entries(live)) out.push(`${id}\t${e.owner}\tuntil ${iso(expiresAt(e))}`)
        return done(EXIT.ok)
      }
      default:
        throw new UsageError(verb ? `unknown verb: ${verb}` : 'no verb given')
    }
  } catch (err) {
    if (err instanceof UsageError) return { code: EXIT.usage, stdout: '', stderr: `claims: ${err.message}\n${USAGE}\n` }
    return { code: EXIT.tooling, stdout: lines(out), stderr: `claims: ${err.message}\n` }
  }

  function done(code) {
    return { code, stdout: lines(out), stderr: '' }
  }
}

const lines = (arr) => (arr.length ? arr.join('\n') + '\n' : '')

// Run main only when invoked as a script, not when imported by tests.
const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
      import.meta.url.endsWith(path.basename(process.argv[1] ?? ''))
  } catch {
    return false
  }
})()
if (isMain) {
  const { code, stdout, stderr } = run(process.argv.slice(2))
  if (stdout) process.stdout.write(stdout)
  if (stderr) process.stderr.write(stderr)
  process.exitCode = code
}
