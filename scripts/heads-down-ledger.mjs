#!/usr/bin/env node
// scripts/heads-down-ledger.mjs: RETIRED (phase NX1g). A thin shim.
//
// Miserere's own `/heads-down` ledger (`.heads-down/<id>.json`, phase HW1c) is
// retired for the kit's `scripts/ledger.mjs` (`.nexus/sessions/<id>.json`),
// which `/pilot` and nexus's `/heads-down` both keep. This file is left only so
// a run that started before the retirement (session 747f1213, the NX1 run)
// keeps beating to the end. Delete it once no `.heads-down/*.json` is unended.
//
// What it does: on its first call for a session it moves that session's old
// ledger into ledger.mjs's store (the old file is left in place, marked
// `migratedTo`), then translates the old verbs onto ledger.mjs:
//
//   beat --session <id> [--worker <row>] [--set k=v …] [--push k=v …] [--prompt-file <f>] [--note <t>]
//       -> NEXUS_SESSION=<id> ledger.mjs beat --set [workers.<row>.]k=v … --add k=v … --set-file
//          workers.<row>.prompt=<f> --add beats=<note>. `--push claims=<row>` lands in `claimed`
//          (ledger.mjs's own `claims` is the session's claims id).
//   show [--session <id>]  -> ledger.mjs show <id> --json (no id: the latest unended pilot or heads-down run)
//   latest                 -> that run's id; exit 1 and no output when there is none
//   end --session <id>     -> NEXUS_SESSION=<id> ledger.mjs end
//   start                  -> refused (exit 2): a new run is `/pilot`, which opens its ledger with ledger.mjs beat.
//
// `--root <dir>` (or $HEADS_DOWN_ROOT) names the checkout that holds both stores; default the primary checkout.

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { DIR, LOCK, fresh, main as ledger, nextStar, readAll, withLock } from './ledger.mjs'
import { primaryRoot } from './owner.mjs'

export const OLD_DIR = '.heads-down'

// The old script's guards, kept: a session id names a file, so it is one plain token (no separators, no `..`);
// a row and every dotted key segment reach into the ledger through ledger.mjs `apply()`, so none may be a
// prototype key (`--worker __proto__` would otherwise write onto Object.prototype).
export const SESSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
export const ROW_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
export const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])

export class UsageError extends Error {}

/** `id` as a session id, or a UsageError. */
export function checkSession(id) {
  if (!SESSION_RE.test(id ?? '') || id.includes('..')) throw new UsageError(`heads-down-ledger: bad session id: ${id}`)
  return id
}

/** A dotted key path with no empty or prototype segment, or a UsageError. */
export function checkPath(p) {
  if (!p || p.split('.').some((s) => !s || FORBIDDEN.has(s))) throw new UsageError(`heads-down-ledger: bad key: ${p}`)
  return p
}
const RUN_KINDS = new Set(['pilot', 'heads-down'])

/** Move the old ledger for `id` into ledger.mjs's store, once. Returns true when it moved one now. */
export function migrate(root, id) {
  const old = path.join(root, OLD_DIR, `${checkSession(id)}.json`)
  if (!fs.existsSync(old)) return false
  const dir = path.join(root, DIR)
  return withLock(path.join(dir, LOCK), () => {
    const all = readAll(dir)
    if (all.some((l) => l.id === id)) return false
    const o = JSON.parse(fs.readFileSync(old, 'utf8'))
    const l = {
      ...fresh(id, nextStar(all), new Date(o.startedAt ?? Date.now())),
      kind: 'heads-down',
      owner: `heads-down:${id}`,
      scope: o.scope ?? '',
      waves: o.waves ?? [],
      workers: o.workers ?? {},
      gate: o.gate ?? { answers: [], defaults: [], parked: [] },
      digest: o.digest ?? null,
      beats: o.beats ?? [],
      claimed: o.claims ?? [],
      migratedFrom: `${OLD_DIR}/${id}.json`,
    }
    if (o.endedAt) l.state = 'ended'
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, `${id}.json`), `${JSON.stringify(l, null, 2)}\n`)
    fs.writeFileSync(old, `${JSON.stringify({ ...o, migratedTo: `${DIR}/${id}.json` }, null, 2)}\n`)
    return true
  })
}

/** The latest unended pilot or heads-down run in ledger.mjs's store (newest start), or null. */
export function latest(root) {
  const runs = readAll(path.join(root, DIR)).filter((l) => RUN_KINDS.has(l.kind) && l.state !== 'ended')
  return runs.sort((a, b) => String(b.started).localeCompare(String(a.started)))[0] ?? null
}

/** The old verb's flags as ledger.mjs beat arguments. */
export function translate(flags) {
  if (flags.worker && (!ROW_RE.test(flags.worker) || FORBIDDEN.has(flags.worker))) throw new UsageError(`heads-down-ledger: bad row id: ${flags.worker}`)
  const out = []
  const at = (k) => (flags.worker ? `workers.${flags.worker}.${k}` : k)
  const split = (kv) => {
    const i = kv.indexOf('=')
    if (i < 1) throw new UsageError(`heads-down-ledger: "${kv}" is not key=value`)
    return [checkPath(kv.slice(0, i)), kv.slice(i + 1)]
  }
  for (const kv of flags.set) {
    const [k, v] = split(kv)
    out.push('--set', `${at(k)}=${v}`)
  }
  for (const kv of flags.push) {
    const [k, v] = split(kv)
    out.push('--add', `${k === 'claims' && !flags.worker ? 'claimed' : at(k)}=${v}`)
  }
  if (flags.promptFile) {
    if (!flags.worker) throw new UsageError('heads-down-ledger: --prompt-file needs --worker <row>')
    out.push('--set-file', `workers.${flags.worker}.prompt=${flags.promptFile}`)
  }
  if (flags.note) out.push('--add', `beats=${JSON.stringify({ at: new Date().toISOString(), note: flags.note })}`)
  return out
}

export function parse(argv) {
  const f = { cmd: argv[0], session: process.env.HEADS_DOWN_SESSION ?? '', root: process.env.HEADS_DOWN_ROOT ?? '', worker: '', set: [], push: [], promptFile: '', note: '' }
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]
    const v = argv[i + 1]
    if (v === undefined && a.startsWith('--')) throw new UsageError(`heads-down-ledger: ${a} needs a value`)
    if (a === '--session') f.session = v
    else if (a === '--root') f.root = v
    else if (a === '--worker') f.worker = v
    else if (a === '--set') f.set.push(v)
    else if (a === '--push') f.push.push(v)
    else if (a === '--prompt-file') f.promptFile = v
    else if (a === '--note') f.note = v
    else if (a === '--json') throw new UsageError('heads-down-ledger: --json is retired; use --set k=<json> per key')
    else throw new UsageError(`heads-down-ledger: unknown argument ${a}`)
    i++
  }
  return f
}

export function run(argv, { out = console.log, err = console.error } = {}) {
  try {
    return dispatch(argv, { out, err })
  } catch (e) {
    if (!(e instanceof UsageError)) throw e
    err(e.message)
    return 2
  }
}

function dispatch(argv, { out, err }) {
  if (argv[0] === 'start') {
    err('heads-down-ledger: retired (phase NX1g). Start a run with /pilot; it opens its ledger with `node scripts/ledger.mjs beat`.')
    return 2
  }
  const f = parse(argv)
  const root = path.resolve(f.root || primaryRoot())
  const env = { ...process.env, NEXUS_SESSION: f.session }
  const opts = { env, root, out, err }
  if (f.cmd === 'latest') {
    const l = latest(root)
    if (!l) return 1
    out(l.id)
    return 0
  }
  if (f.session) checkSession(f.session)
  if (f.cmd === 'show' && !f.session) {
    const l = latest(root)
    if (!l) {
      err('heads-down-ledger: no unended run')
      return 1
    }
    return ledger(['show', l.id, '--json'], opts)
  }
  if (!['beat', 'show', 'end'].includes(f.cmd)) {
    err('usage: node scripts/heads-down-ledger.mjs beat|show|end --session <id> | latest (retired: use scripts/ledger.mjs)')
    return 2
  }
  if (!f.session) {
    err(`heads-down-ledger: ${f.cmd} needs --session <id>`)
    return 2
  }
  checkSession(f.session)
  // Every flag is checked before anything is written: a refused beat neither migrates nor forwards.
  const args = f.cmd === 'beat' ? translate(f) : []
  migrate(root, f.session)
  if (f.cmd === 'show') return ledger(['show', f.session, '--json'], opts)
  if (f.cmd === 'end') return ledger(['end'], opts)
  return ledger(['beat', ...args], opts)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = run(process.argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 2
  }
}
