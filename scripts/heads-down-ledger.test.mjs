// scripts/heads-down-ledger.test.mjs — the /heads-down session ledger (phase HW1c, A7).
//
//   node --test scripts/heads-down-ledger.test.mjs
//
// Hermetic: every test points the script at a temp directory with --root, so
// it never touches the real primary checkout's `.heads-down/`.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const SCRIPT = path.join(HERE, 'heads-down-ledger.mjs')

const tmpRoots = []
test.after(() => {
  for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-ledger-test-'))
  tmpRoots.push(dir)
  return dir
}

function ledger(root, args, env = {}) {
  const e = { ...process.env, ...env }
  delete e.HEADS_DOWN_ROOT
  delete e.HEADS_DOWN_SESSION
  const r = spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8', env: { ...e, ...env } })
  return { code: r.status, out: r.stdout.trim(), err: r.stderr.trim() }
}

const readJson = (root, id) => JSON.parse(fs.readFileSync(path.join(root, '.heads-down', `${id}.json`), 'utf8'))

test('start writes .heads-down/<session>.json with scope and waves, and refuses a second start', () => {
  const root = tmp()
  const waves = JSON.stringify([{ n: 1, rows: ['HW1c'] }])
  const r = ledger(root, ['start', '--session', 'abc123', '--scope', 'HW1c', '--waves', waves])
  assert.equal(r.code, 0)
  const l = readJson(root, 'abc123')
  assert.equal(l.session, 'abc123')
  assert.equal(l.scope, 'HW1c')
  assert.deepEqual(l.waves, [{ n: 1, rows: ['HW1c'] }])
  assert.equal(l.endedAt, null)
  assert.deepEqual(l.gate, { answers: [], defaults: [], parked: [] })
  assert.deepEqual(l.claims, [])
  assert.equal(ledger(root, ['start', '--session', 'abc123']).code, 1)
})

test('beat records a worker, pushes onto arrays, stamps updatedAt and saves the prompt', () => {
  const root = tmp()
  ledger(root, ['start', '--session', 's1'], { HEADS_DOWN_NOW: '2026-10-30T10:00:00.000Z' })
  const promptSrc = path.join(tmp(), 'p.md')
  fs.writeFileSync(promptSrc, 'build HW1c\n')
  const r = ledger(
    root,
    [
      'beat', '--session', 's1', '--worker', 'HW1c',
      '--set', 'agentId=a1', '--set', 'status=running', '--set', 'model=sonnet',
      '--set', 'branch=loop/ship-HW1c', '--prompt-file', promptSrc, '--note', 'wave 1 launched',
    ],
    { HEADS_DOWN_NOW: '2026-10-30T11:00:00.000Z' },
  )
  assert.equal(r.code, 0, r.err)
  assert.equal(
    ledger(root, ['beat', '--session', 's1', '--push', 'claims=HW1c', '--push', 'gate.defaults={"call":"x","took":"y"}']).code,
    0,
  )
  assert.equal(ledger(root, ['beat', '--session', 's1', '--worker', 'HW1c', '--set', 'pr=1180', '--set', 'status=pr-open']).code, 0)
  assert.equal(ledger(root, ['beat', '--session', 's1', '--set', 'digest=C:/scratch/digest.md']).code, 0)
  const l = readJson(root, 's1')
  assert.equal(l.workers.HW1c.agentId, 'a1')
  assert.equal(l.workers.HW1c.status, 'pr-open')
  assert.equal(l.workers.HW1c.pr, 1180)
  assert.equal(l.workers.HW1c.promptFile, '.heads-down/s1/prompts/HW1c.md')
  assert.equal(fs.readFileSync(path.join(root, l.workers.HW1c.promptFile), 'utf8'), 'build HW1c\n')
  assert.deepEqual(l.claims, ['HW1c'])
  assert.deepEqual(l.gate.defaults, [{ call: 'x', took: 'y' }])
  assert.equal(l.digest, 'C:/scratch/digest.md')
  assert.equal(l.beats[0].note, 'wave 1 launched')
  assert.notEqual(l.updatedAt, '2026-10-30T10:00:00.000Z')
})

test('beat refuses a missing ledger, a bad path and a prompt file without a worker', () => {
  const root = tmp()
  assert.equal(ledger(root, ['beat', '--session', 'nope', '--set', 'a=b']).code, 2)
  ledger(root, ['start', '--session', 's2'])
  assert.equal(ledger(root, ['beat', '--session', 's2', '--set', '__proto__.x=1']).code, 2)
  assert.equal(ledger(root, ['beat', '--session', 's2', '--prompt-file', 'x']).code, 2)
  assert.equal(ledger(root, ['start', '--session', '../evil']).code, 2)
})

test('latest names the newest unended ledger; end retires it; show reads it', () => {
  const root = tmp()
  assert.equal(ledger(root, ['latest']).code, 1)
  ledger(root, ['start', '--session', 'old'], { HEADS_DOWN_NOW: '2026-10-29T10:00:00.000Z' })
  ledger(root, ['start', '--session', 'new'], { HEADS_DOWN_NOW: '2026-10-30T10:00:00.000Z' })
  const a = ledger(root, ['latest'])
  assert.deepEqual([a.code, a.out], [0, 'new'])
  assert.equal(ledger(root, ['end', '--session', 'new']).code, 0)
  assert.ok(readJson(root, 'new').endedAt)
  const b = ledger(root, ['latest'])
  assert.deepEqual([b.code, b.out], [0, 'old'])
  assert.equal(JSON.parse(ledger(root, ['show']).out).session, 'old')
  assert.equal(JSON.parse(ledger(root, ['show', '--session', 'new']).out).session, 'new')
  assert.equal(ledger(root, ['beat', '--session', 'new', '--set', 'a=b']).code, 1)
  ledger(root, ['end', '--session', 'old'])
  assert.equal(ledger(root, ['latest']).code, 1)
  assert.equal(ledger(root, ['show']).code, 1)
})

test('a usage error exits 2 and an unknown verb is refused', () => {
  const root = tmp()
  assert.equal(ledger(root, ['frobnicate']).code, 2)
  assert.equal(ledger(root, ['start']).code, 2)
})

test('the root .gitignore ignores .heads-down/', () => {
  const lines = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim())
  assert.ok(lines.includes('.heads-down/'), '.gitignore has a .heads-down/ line')
})

test('the root npm test runs this suite', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  assert.match(pkg.scripts.test, /scripts\/heads-down-ledger\.test\.mjs/)
})
