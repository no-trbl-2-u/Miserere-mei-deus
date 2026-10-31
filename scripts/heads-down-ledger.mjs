#!/usr/bin/env node
// scripts/heads-down-ledger.mjs
//
// The `/heads-down` session ledger (phase HW1c, A7). One JSON file per
// orchestrator session, `.heads-down/<session id>.json`, in the PRIMARY
// checkout (not a worktree, not the scratchpad: a restarted session gets a
// new scratchpad and could not find it). The root `.gitignore` ignores
// `.heads-down/`, so a ledger never conflicts and never rides a PR.
//
//   .heads-down/<session id>.json
//   .heads-down/<session id>/prompts/<row>.md     each worker's saved prompt
//
// The ledger records the scope and the waves, each worker (row, agentId,
// worktree, branch, model, promptFile, status, pr), the claims, the gate
// answers, the defaults and the parked questions, and the callout digest's
// path. `/heads-down resume` reads the latest unended ledger and picks the
// run back up from it.
//
// Verbs (every one takes --session <id> except `latest`; $HEADS_DOWN_SESSION
// is the default id):
//
//   start --session <id> [--scope <text>] [--waves <json>]
//       Creates the ledger. Refuses to overwrite an existing one (exit 1).
//   beat --session <id> [--worker <row>] [--set path=value ...]
//        [--json <object>] [--push path=value ...] [--prompt-file <file>]
//        [--note <text>]
//       Updates the ledger and stamps `updatedAt`. `--set` writes a string
//       (or a number/boolean/null/JSON value when the text parses as one) at
//       a dotted path; `--json` deep-merges an object; `--push` appends to
//       the array at a dotted path (the arrays `claims`, `gate.answers`,
//       `gate.defaults`, `gate.parked`). `--worker <row>` roots every path at
//       `workers.<row>.`. `--prompt-file` copies a file to
//       `.heads-down/<id>/prompts/<row>.md` and records `promptFile`
//       (needs --worker). `--note` appends a timestamped line to `beats`.
//   show [--session <id>]
//       Prints the ledger as JSON (the latest unended one when no id).
//   latest
//       Prints the id of the latest unended ledger (newest `startedAt`);
//       exit 1 and no output when there is none.
//   end --session <id>
//       Stamps `endedAt`. An ended ledger is never resumed.
//
// Common flags: --root <dir> (the checkout that holds `.heads-down/`;
// default the primary checkout of the current repo, or $HEADS_DOWN_ROOT).
//
// Exit codes: 0 ok, 1 refused or none, 2 usage error, 3 tooling error.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const LEDGER_DIR = '.heads-down'
const SESSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const ROW_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export class UsageError extends Error {}

/** The primary checkout: the parent of the repo's common git dir. */
export function primaryRoot(cwd = process.cwd()) {
  const r = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd,
    encoding: 'utf8',
  })
  if (r.status !== 0) throw new Error(`cannot find the primary checkout: ${(r.stderr || '').trim()}`)
  const common = r.stdout.trim()
  return path.basename(common) === '.git' ? path.dirname(common) : common
}

export function resolveRoot(root) {
  if (root) return path.resolve(root)
  if (process.env.HEADS_DOWN_ROOT) return path.resolve(process.env.HEADS_DOWN_ROOT)
  return primaryRoot()
}

const checkSession = (id) => {
  if (!id) throw new UsageError('--session <id> is required')
  if (!SESSION_RE.test(id)) throw new UsageError(`bad session id: ${id}`)
  return id
}
const checkRow = (row) => {
  if (!ROW_RE.test(row)) throw new UsageError(`bad row id: ${row}`)
  return row
}

export const ledgerPath = (root, id) => path.join(root, LEDGER_DIR, `${id}.json`)
export const promptPath = (root, id, row) => path.join(root, LEDGER_DIR, id, 'prompts', `${row}.md`)

function readLedger(root, id) {
  const file = ledgerPath(root, id)
  if (!fs.existsSync(file)) throw new UsageError(`no ledger for session ${id} in ${path.join(root, LEDGER_DIR)}`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeLedger(root, ledger) {
  const file = ledgerPath(root, ledger.session)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(ledger, null, 2)}\n`)
  fs.renameSync(tmp, file)
}

export function emptyLedger(session, now, { scope = '', waves = [] } = {}) {
  return {
    session,
    startedAt: now,
    updatedAt: now,
    endedAt: null,
    scope,
    waves,
    workers: {},
    claims: [],
    gate: { answers: [], defaults: [], parked: [] },
    digest: null,
    beats: [],
  }
}

const parseValue = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])

function splitPath(p) {
  const parts = p.split('.')
  if (parts.some((s) => !s || FORBIDDEN.has(s))) throw new UsageError(`bad path: ${p}`)
  return parts
}

function setAt(obj, p, value) {
  const parts = splitPath(p)
  let cur = obj
  for (const key of parts.slice(0, -1)) {
    if (cur[key] === null || typeof cur[key] !== 'object') cur[key] = {}
    cur = cur[key]
  }
  cur[parts[parts.length - 1]] = value
}

function pushAt(obj, p, value) {
  const parts = splitPath(p)
  let cur = obj
  for (const key of parts.slice(0, -1)) {
    if (cur[key] === null || typeof cur[key] !== 'object') cur[key] = {}
    cur = cur[key]
  }
  const last = parts[parts.length - 1]
  if (cur[last] === undefined) cur[last] = []
  if (!Array.isArray(cur[last])) throw new UsageError(`${p} is not an array`)
  cur[last].push(value)
}

function mergeInto(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (FORBIDDEN.has(key)) throw new UsageError(`bad key: ${key}`)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (target[key] === null || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {}
      mergeInto(target[key], value)
    } else {
      target[key] = value
    }
  }
}

/** Every ledger in the root, newest `startedAt` first. */
export function listLedgers(root) {
  const dir = path.join(root, LEDGER_DIR)
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    try {
      const ledger = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))
      if (ledger && typeof ledger.session === 'string') out.push(ledger)
    } catch {
      // a half-written or foreign file is not a ledger
    }
  }
  return out.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
}

export function latestUnended(root) {
  return listLedgers(root).find((l) => !l.endedAt) ?? null
}

const now = () => process.env.HEADS_DOWN_NOW || new Date().toISOString()

export function opStart(root, id, { scope, waves } = {}) {
  checkSession(id)
  if (fs.existsSync(ledgerPath(root, id))) return { code: 1, out: `exists ${id}` }
  const parsedWaves = waves === undefined ? [] : parseValue(waves)
  writeLedger(root, emptyLedger(id, now(), { scope: scope ?? '', waves: parsedWaves }))
  return { code: 0, out: `started ${id}` }
}

export function opBeat(root, id, opts = {}) {
  checkSession(id)
  const ledger = readLedger(root, id)
  if (ledger.endedAt) return { code: 1, out: `ended ${id}` }
  const prefix = opts.worker ? `workers.${checkRow(opts.worker)}.` : ''
  if (opts.promptFile && !opts.worker) throw new UsageError('--prompt-file needs --worker <row>')
  if (opts.worker && (ledger.workers[opts.worker] === undefined || ledger.workers[opts.worker] === null)) {
    ledger.workers[opts.worker] = { row: opts.worker }
  }
  for (const text of opts.json ?? []) {
    const patch = parseValue(text)
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new UsageError('--json needs an object')
    if (opts.worker) mergeInto(ledger.workers[opts.worker], patch)
    else mergeInto(ledger, patch)
  }
  for (const pair of opts.set ?? []) {
    const eq = pair.indexOf('=')
    if (eq < 1) throw new UsageError(`--set needs path=value: ${pair}`)
    setAt(ledger, prefix + pair.slice(0, eq), parseValue(pair.slice(eq + 1)))
  }
  for (const pair of opts.push ?? []) {
    const eq = pair.indexOf('=')
    if (eq < 1) throw new UsageError(`--push needs path=value: ${pair}`)
    pushAt(ledger, prefix + pair.slice(0, eq), parseValue(pair.slice(eq + 1)))
  }
  if (opts.promptFile) {
    if (!fs.existsSync(opts.promptFile)) throw new UsageError(`no such prompt file: ${opts.promptFile}`)
    const dest = promptPath(root, id, opts.worker)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(opts.promptFile, dest)
    ledger.workers[opts.worker].promptFile = path.relative(root, dest).split(path.sep).join('/')
  }
  const stamp = now()
  if (opts.note) ledger.beats.push({ at: stamp, note: opts.note })
  ledger.updatedAt = stamp
  writeLedger(root, ledger)
  return { code: 0, out: `beat ${id}` }
}

export function opShow(root, id) {
  const ledger = id ? readLedger(root, checkSession(id)) : latestUnended(root)
  if (!ledger) return { code: 1, out: '' }
  return { code: 0, out: JSON.stringify(ledger, null, 2) }
}

export function opLatest(root) {
  const ledger = latestUnended(root)
  return ledger ? { code: 0, out: ledger.session } : { code: 1, out: '' }
}

export function opEnd(root, id) {
  checkSession(id)
  const ledger = readLedger(root, id)
  if (ledger.endedAt) return { code: 0, out: `ended ${id}` }
  ledger.endedAt = now()
  ledger.updatedAt = ledger.endedAt
  writeLedger(root, ledger)
  return { code: 0, out: `ended ${id}` }
}

const MULTI = new Set(['set', 'push', 'json'])
const SINGLE = new Set(['session', 'root', 'scope', 'waves', 'worker', 'prompt-file', 'note'])

export function parseArgs(argv) {
  const [verb, ...rest] = argv
  const opts = { set: [], push: [], json: [] }
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (!arg.startsWith('--')) throw new UsageError(`unexpected argument: ${arg}`)
    const name = arg.slice(2)
    if (!MULTI.has(name) && !SINGLE.has(name)) throw new UsageError(`unknown flag: ${arg}`)
    const value = rest[++i]
    if (value === undefined) throw new UsageError(`${arg} needs a value`)
    if (MULTI.has(name)) opts[name].push(value)
    else opts[name === 'prompt-file' ? 'promptFile' : name] = value
  }
  return { verb, opts }
}

export function run(argv) {
  const { verb, opts } = parseArgs(argv)
  const root = resolveRoot(opts.root)
  const session = opts.session ?? process.env.HEADS_DOWN_SESSION
  switch (verb) {
    case 'start':
      return opStart(root, session, opts)
    case 'beat':
      return opBeat(root, session, opts)
    case 'show':
      return opShow(root, session)
    case 'latest':
      return opLatest(root)
    case 'end':
      return opEnd(root, session)
    default:
      throw new UsageError(`unknown verb: ${verb ?? '(none)'} (start, beat, show, latest, end)`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { code, out } = run(process.argv.slice(2))
    if (out) console.log(out)
    process.exit(code)
  } catch (err) {
    if (err instanceof UsageError) {
      console.error(`heads-down-ledger: ${err.message}`)
      process.exit(2)
    }
    console.error(`heads-down-ledger: ${err.message}`)
    process.exit(3)
  }
}
