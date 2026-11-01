// scripts/heads-down-ledger.test.mjs: the retired /heads-down ledger is a shim onto
// scripts/ledger.mjs (phase NX1g). A run that began on the old store keeps beating.
//
// Hermetic: every call points at a temp --root, never the real primary checkout.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
// `/pilot peek`'s tests ride here, so package.json's one-line test list is left alone while NX1f's branch
// edits it too. When this shim retires, name scripts/pilot-waves.test.mjs in that list instead.
import './pilot-waves.test.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT = path.join(HERE, 'heads-down-ledger.mjs')

const roots = []
test.after(() => {
  for (const d of roots) fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

function root() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-shim-'))
  roots.push(d)
  return d
}

function call(r, args) {
  const env = { ...process.env }
  for (const k of ['HEADS_DOWN_ROOT', 'HEADS_DOWN_SESSION', 'NEXUS_SESSION', 'CLAUDE_CODE_SESSION_ID']) delete env[k]
  const p = spawnSync(process.execPath, [SCRIPT, ...args, '--root', r], { encoding: 'utf8', env })
  return { code: p.status, out: p.stdout.trim(), err: p.stderr.trim() }
}

const OLD = {
  session: 'abcd1234', startedAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z', endedAt: null,
  scope: 'NX1a NX1g', waves: [['NX1a'], ['NX1g']],
  workers: { NX1a: { status: 'pr-open', pr: 1270, branch: 'loop/ship-NX1a-x' } },
  claims: ['NX1a', 'NX1g'], gate: { answers: ['a1'], defaults: [], parked: [] }, digest: '/tmp/digest.md', beats: [],
}

function seed() {
  const r = root()
  fs.mkdirSync(path.join(r, '.heads-down'))
  fs.writeFileSync(path.join(r, '.heads-down', 'abcd1234.json'), JSON.stringify(OLD))
  return r
}

const store = (r) => JSON.parse(fs.readFileSync(path.join(r, '.nexus', 'sessions', 'abcd1234.json'), 'utf8'))

test('a live old run migrates into ledger.mjs on its first beat and keeps every field', () => {
  const r = seed()
  const b = call(r, ['beat', '--session', 'abcd1234', '--worker', 'NX1g', '--set', 'status=running', '--set', 'pr=1290'])
  assert.equal(b.code, 0, b.err)
  const l = store(r)
  assert.equal(l.kind, 'heads-down')
  assert.equal(l.owner, 'heads-down:abcd1234', 'existing heads-down:<id> claims keep their owner')
  assert.equal(l.state, 'live')
  assert.deepEqual(l.claimed, ['NX1a', 'NX1g'])
  assert.equal(l.claims, 'abcd1234')
  assert.deepEqual(l.waves, OLD.waves)
  assert.equal(l.workers.NX1a.pr, 1270)
  assert.deepEqual(l.workers.NX1g, { status: 'running', pr: 1290 })
  assert.equal(l.digest, '/tmp/digest.md')
  const old = JSON.parse(fs.readFileSync(path.join(r, '.heads-down', 'abcd1234.json'), 'utf8'))
  assert.equal(old.migratedTo, '.nexus/sessions/abcd1234.json')
})

test('push, note and prompt-file land in the new store; show, latest and end forward', () => {
  const r = seed()
  const prompt = path.join(r, 'p.md')
  fs.writeFileSync(prompt, 'build NX1g\n')
  assert.equal(call(r, ['beat', '--session', 'abcd1234', '--push', 'gate.parked={"q":"why?"}', '--push', 'claims=NX1h', '--note', 'wave 2']).code, 0)
  assert.equal(call(r, ['beat', '--session', 'abcd1234', '--worker', 'NX1g', '--prompt-file', prompt]).code, 0)
  const l = store(r)
  assert.deepEqual(l.gate.parked, [{ q: 'why?' }])
  assert.deepEqual(l.claimed, ['NX1a', 'NX1g', 'NX1h'])
  assert.equal(l.beats.at(-1).note, 'wave 2')
  assert.equal(l.workers.NX1g.prompt, 'build NX1g')
  assert.deepEqual(call(r, ['latest']), { code: 0, out: 'abcd1234', err: '' })
  const shown = call(r, ['show', '--session', 'abcd1234'])
  assert.equal(JSON.parse(shown.out).workers.NX1a.status, 'pr-open')
  assert.equal(JSON.parse(call(r, ['show']).out).id, 'abcd1234')
  assert.equal(call(r, ['end', '--session', 'abcd1234']).code, 0)
  assert.equal(store(r).state, 'ended')
  assert.equal(call(r, ['latest']).code, 1, 'an ended run is never resumed')
})

test('start is refused: a new run is /pilot', () => {
  const r = root()
  const s = call(r, ['start', '--session', 'new12345', '--scope', 'x'])
  assert.equal(s.code, 2)
  assert.match(s.err, /\/pilot/)
  assert.ok(!fs.existsSync(path.join(r, '.heads-down', 'new12345.json')))
})
