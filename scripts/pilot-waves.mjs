#!/usr/bin/env node
// scripts/pilot-waves.mjs
//
// `/pilot peek` and `/pilot`'s Step 1 (skills/pilot.md): the chunks a run
// takes, cut into waves from their `needs`. It reads the plan the way /next
// picks (scripts/plan/order.mjs `simulate`: the Asap lane, priority rows, the
// table; Held, `plan only`, other bases and chunks someone else claims are
// skipped) and then groups the pickable chunks: wave 1 is every chunk whose
// needs are all done, wave k+1 every chunk whose last open need is in wave k.
// A chunk whose open need is outside the run's scope waits, and is listed
// apart with that need; so is a held, blocked or claimed one, with why.
//
// It only reads. It launches nothing, claims nothing and writes no ledger,
// which is what makes `/pilot peek` safe to run at any time.
//
//   node scripts/pilot-waves.mjs [<chunk id | alias | spec NN> …] [--ref <ref>] [--json]
//
// No scope: every pickable chunk. A spec number (`133`) takes that spec's
// chunks; an alias (`NX1g`, the chunk line's `alias:`) its chunk. `--ref`
// defaults to origin/main: the plan is read from origin, never the checkout's
// copy, which may be behind (nexus /heads-down hard rule 2).
//
// Two chunks that edit the same files are not parallel even with no `needs`
// between them; the plan does not say which files a chunk touches, so the
// orchestrator moves one of them a wave later by hand (skills/pilot.md Step 1).

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { SPEC_FILE } from './plan-check.mjs'
import { load, simulate } from './plan/order.mjs'
import { planReader } from './plan/progress.mjs'

/** Worker model per chunk size (skills/pilot.md Step 2): Opus for L, Sonnet otherwise. */
export const modelFor = (c) => (c.size === 'L' ? 'opus' : 'sonnet')

const CHUNK_ALIAS = /^- \[ \] \*\*([^*]+)\*\* .*·\s*alias(?:es)?:\s*([^·]+?)\s*$/gm

/** `{ alias -> chunk id }` from spec texts (a chunk line's `alias: A, B`). */
export function aliasMap(texts) {
  const out = {}
  for (const t of texts) {
    for (const m of t.matchAll(CHUNK_ALIAS)) {
      for (const a of m[2].replace(/`/g, '').split(',').map((s) => s.trim()).filter(Boolean)) out[a] = m[1]
    }
  }
  return out
}

/**
 * The waves. `sim` is order.mjs `simulate`'s result; `scope` the ids, aliases
 * or spec numbers asked for (empty: everything pickable). Returns
 * `{ waves: [[chunk…]…], apart: [{ …chunk, why }], unknown: [token…] }`; each
 * chunk carries `wave`, `alias` and `model`.
 */
export function waves(sim, { scope = [], aliases = {} } = {}) {
  const byAlias = (id) => Object.entries(aliases).filter(([, v]) => v === id).map(([a]) => a)
  const all = [...sim.next, ...sim.blocked, ...sim.inFlight]
  const ids = new Set()
  const specs = new Set()
  const unknown = []
  for (const tok of scope) {
    const id = aliases[tok] ?? tok
    if (/^\d{2,}$/.test(id) && all.some((c) => c.spec === id)) specs.add(id)
    else if (all.some((c) => c.id === id)) ids.add(id)
    else unknown.push(tok)
  }
  const inScope = (c) => (!scope.length ? true : ids.has(c.id) || specs.has(c.spec))
  const dress = (c) => ({ ...c, alias: byAlias(c.id).join(', '), model: modelFor(c) })
  const wave = new Map()
  const apart = []
  const waiting = new Map()
  // `sim.next` is in build order, so every need a chunk has in it comes first.
  for (const c of sim.next) {
    if (!inScope(c)) continue
    const open = (c.needs ?? []).filter((n) => sim.next.some((x) => x.id === n))
    const outside = open.filter((n) => !wave.has(n))
    if (outside.length) {
      const why = outside.map((n) => (waiting.has(n) ? `needs ${n} (waiting)` : `needs ${n} (outside this run)`)).join(', ')
      waiting.set(c.id, true)
      apart.push({ ...dress(c), why })
      continue
    }
    wave.set(c.id, 1 + Math.max(0, ...open.map((n) => wave.get(n))))
  }
  for (const c of sim.inFlight) if (inScope(c)) apart.push({ ...dress(c), why: `claimed by ${c.who}` })
  for (const c of sim.blocked) if (inScope(c)) apart.push({ ...dress(c), why: c.why })
  const out = []
  for (const c of sim.next) {
    const w = wave.get(c.id)
    if (!w) continue
    ;(out[w - 1] ??= []).push({ ...dress(c), wave: w })
  }
  return { waves: out, apart, unknown }
}

/** The peek, as text. */
export function render({ waves: ws, apart, unknown }, { ref = 'origin/main' } = {}) {
  const count = ws.reduce((n, w) => n + w.length, 0)
  const lines = [`/pilot peek (plan at ${ref}): ${ws.length} wave${ws.length === 1 ? '' : 's'}, ${count} chunk${count === 1 ? '' : 's'}. Launches nothing.`]
  const label = (c) => `${c.id}${c.alias ? ` (${c.alias})` : ''}`
  const needs = (c) => (c.needs?.length ? `needs ${c.needs.join(', ')}` : 'needs —')
  ws.forEach((w, i) => {
    lines.push('', `wave ${i + 1}${i ? ` (starts once wave ${i}'s prerequisite PRs merge)` : ''}`)
    for (const c of w) lines.push(`  ${label(c).padEnd(16)} ${String(c.size ?? '?').padEnd(2)} ${c.model.padEnd(7)} ${needs(c).padEnd(22)} ${c.title}`)
  })
  if (!ws.length) lines.push('', 'Nothing can move: no chunk in scope is ready.')
  if (ws.length === 1 && count === 1) lines.push('', 'One chunk now: parallelism is low, and that is the honest answer.')
  if (apart.length) {
    lines.push('', 'apart (not launched)')
    for (const c of apart) lines.push(`  ${label(c).padEnd(16)} ${c.why}`)
  }
  if (unknown.length) lines.push('', `not in the plan: ${unknown.join(', ')}`)
  return lines.join('\n')
}

async function main(argv) {
  const val = (flag) => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const ref = val('--ref') ?? 'origin/main'
  const scope = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--ref')
  const cwd = path.resolve(execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim())
  const plan = await load(cwd, ref, { vault: false })
  const reader = planReader(cwd, ref)
  const aliases = aliasMap(reader.names().filter((n) => SPEC_FILE.test(n)).map((n) => reader.read(n)))
  const result = waves(simulate(plan), { scope, aliases })
  console.log(argv.includes('--json') ? JSON.stringify(result, null, 2) : render(result, { ref }))
  return result.unknown.length ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (e) => {
      console.error(e instanceof Error ? e.message : String(e))
      process.exitCode = 1
    },
  )
}
