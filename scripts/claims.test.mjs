// scripts/claims.test.mjs — the claims record (phase HW1b, A4 and A5).
//
//   node --test scripts/claims.test.mjs
//
// Hermetic: every test runs against a temporary bare repository made with
// `git init --bare` in the OS temp dir as `origin`. No network, never the real
// origin's `claims` branch. Git runs with no global or system config (a fresh
// box, a CI runner), so commit-tree has no identity but the one claims.mjs
// supplies. The race test starts two real processes at the same instant.

import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  DEFAULT_TTL_HOURS,
  MAX_RETRIES,
  checkClaim,
  opClaim,
  opPrune,
  opRelease,
  opRenew,
  parseRecord,
  serializeRecord,
  writeWithRetry,
} from './claims.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const SCRIPT = path.join(HERE, 'claims.mjs')

const T0 = Date.parse('2026-10-30T12:00:00.000Z')
const at = (hours) => new Date(T0 + hours * 3600 * 1000).toISOString()

// --- fixtures ---------------------------------------------------------

const tmpRoots = []
test.after(() => {
  for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

function baseEnv(extra = {}) {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_') || key.startsWith('CLAIMS_') || key === 'CLAIM_OWNER') delete env[key]
  }
  return { ...env, ...extra }
}

/** A temp dir holding a bare `origin` and `n` clones of it (plain `git init` + remote). */
function makeWorld(n = 2) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claims-test-'))
  tmpRoots.push(dir)
  const gitconfig = path.join(dir, 'gitconfig')
  fs.writeFileSync(gitconfig, '')
  const env = baseEnv({ GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitconfig })
  const g = (cwd, args, opts = {}) => {
    const r = spawnSync('git', args, { cwd, env, encoding: 'utf-8', windowsHide: true, ...opts })
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
    return r.stdout
  }
  const origin = path.join(dir, 'origin.git')
  g(dir, ['init', '--bare', '--quiet', origin])
  const clones = []
  for (let i = 0; i < n; i += 1) {
    const clone = path.join(dir, `clone${i}`)
    g(dir, ['init', '--quiet', clone])
    g(clone, ['remote', 'add', 'origin', origin])
    clones.push(clone)
  }
  const cli = (clone, args, now) => {
    const r = spawnSync(process.execPath, [SCRIPT, ...args, '--cwd', clone], {
      env: now ? { ...env, CLAIMS_NOW: now } : env,
      encoding: 'utf-8',
      windowsHide: true,
    })
    return { code: r.status, stdout: r.stdout, stderr: r.stderr }
  }
  const record = () => parseRecord(g(origin, ['cat-file', 'blob', 'claims:claims.json']))
  const rawRecord = () => g(origin, ['cat-file', 'blob', 'claims:claims.json'])
  const commits = () => Number(g(origin, ['rev-list', '--count', 'claims']).trim())
  return { dir, env, g, origin, clones, cli, record, rawRecord, commits }
}

// --- the record, pure -------------------------------------------------

test('parseRecord reads CRLF, a BOM and an empty file; serializeRecord writes sorted LF', () => {
  const crlf = '﻿{\r\n  "B1": { "owner": "x", "at": "a", "renewed": "a", "ttlHours": 24 }\r\n}\r\n'
  assert.deepEqual(Object.keys(parseRecord(crlf)), ['B1'])
  assert.deepEqual(parseRecord(''), {})
  assert.deepEqual(parseRecord('\r\n'), {})
  const text = serializeRecord({ Z: { owner: 'o' }, A: { owner: 'o' } })
  assert.equal(text.includes('\r'), false)
  assert.ok(text.endsWith('}\n'))
  assert.ok(text.indexOf('"A"') < text.indexOf('"Z"'))
})

test('opClaim is all or nothing and names the holder', () => {
  const now = T0
  const held = opClaim({}, now, { ids: ['X'], owner: 'a' }).record
  const refused = opClaim(held, now, { ids: ['Y', 'X'], owner: 'b' })
  assert.equal(refused.refused, true)
  assert.equal(refused.changed, false)
  assert.match(refused.lines.join('\n'), /^held X by a until /m)
  assert.equal(refused.lines.some((l) => l.includes('Y')), false)
})

test('a re-claim by the holder renews it and keeps `at`', () => {
  const first = opClaim({}, T0, { ids: ['X'], owner: 'a' }).record
  const again = opClaim(first, T0 + 3600e3, { ids: ['X'], owner: 'a' }).record
  assert.equal(again.X.at, first.X.at)
  assert.equal(again.X.renewed, at(1))
})

test('expired claims count as free and drop on the next write', () => {
  const old = { E: { owner: 'gone', at: at(-30), renewed: at(-30), ttlHours: 24 } }
  assert.equal(checkClaim(old, T0, { id: 'E' }).code, 0)
  const next = opClaim(old, T0, { ids: ['N'], owner: 'a' }).record
  assert.deepEqual(Object.keys(next), ['N'])
  assert.equal(DEFAULT_TTL_HOURS, 24)
})

test('opRenew, opRelease and opPrune touch only what they should', () => {
  const r = opClaim(opClaim({}, T0, { ids: ['A'], owner: 'a' }).record, T0, { ids: ['B'], owner: 'b' }).record
  const renewed = opRenew(r, T0 + 3600e3, { owner: 'a' })
  assert.equal(renewed.changed, true)
  assert.equal(renewed.record.A.renewed, at(1))
  assert.equal(renewed.record.B.renewed, at(0))
  assert.equal(opRenew(r, T0, { owner: 'nobody' }).changed, false)
  const rel = opRelease(r, T0, { ids: ['A', 'B'], owner: 'a' })
  assert.deepEqual(Object.keys(rel.record), ['B'])
  assert.ok(rel.lines.includes('skipped B held by b'))
  assert.deepEqual(Object.keys(opRelease(r, T0, { ids: [], owner: 'b', all: true }).record), ['A'])
  assert.equal(opPrune(r, T0).changed, false)
  assert.deepEqual(opPrune(r, T0 + 25 * 3600e3).record, {})
})

// --- the CLI against a temporary bare origin --------------------------

test('the first claim creates the orphan branch with one LF claims.json', () => {
  const w = makeWorld(1)
  const r = w.cli(w.clones[0], ['claim', 'HW1b', '--owner', 'tick:1'], at(0))
  assert.equal(r.code, 0, r.stderr)
  assert.match(r.stdout, /^claimed HW1b by tick:1 until 2026-10-31T12:00:00.000Z$/m)
  assert.equal(w.g(w.origin, ['rev-list', '--parents', '-n', '1', 'claims']).trim().split(' ').length, 1)
  assert.equal(w.g(w.origin, ['ls-tree', '--name-only', 'claims']).trim(), 'claims.json')
  assert.equal(w.rawRecord().includes('\r'), false)
  assert.deepEqual(w.record().HW1b, { owner: 'tick:1', at: at(0), renewed: at(0), ttlHours: 24 })
  // A second write builds on the fetched tip: one more commit, parent = old tip.
  const tip = w.g(w.origin, ['rev-parse', 'claims']).trim()
  assert.equal(w.cli(w.clones[0], ['claim', 'HW1c', '--owner', 'tick:1'], at(0)).code, 0)
  assert.equal(w.commits(), 2)
  assert.equal(w.g(w.origin, ['rev-parse', 'claims^']).trim(), tip)
  // No working tree was touched: the clone has no commits and no files.
  assert.deepEqual(fs.readdirSync(w.clones[0]), ['.git'])
})

test('claim is all or nothing across processes, and the refusal names the holder', () => {
  const w = makeWorld(2)
  const [a, b] = w.clones
  assert.equal(w.cli(a, ['claim', 'X', '--owner', 'alice'], at(0)).code, 0)
  const r = w.cli(b, ['claim', 'Y', 'X', '--owner', 'bob'], at(1))
  assert.equal(r.code, 1)
  assert.match(r.stdout, /^held X by alice until 2026-10-31T12:00:00.000Z$/m)
  assert.deepEqual(Object.keys(w.record()), ['X'])
  assert.equal(w.cli(b, ['check', 'Y'], at(1)).code, 0)
})

test('check exit codes: 0 free, 0 mine, 1 held, 2 usage, 3 tooling', () => {
  const w = makeWorld(1)
  const [a] = w.clones
  let r = w.cli(a, ['check', 'Q'], at(0))
  assert.deepEqual([r.code, r.stdout.trim()], [0, 'free Q'])
  assert.equal(w.cli(a, ['claim', 'Q', '--owner', 'alice'], at(0)).code, 0)
  r = w.cli(a, ['check', 'Q'], at(1))
  assert.deepEqual([r.code, r.stdout.trim()], [1, 'held Q by alice until 2026-10-31T12:00:00.000Z'])
  r = w.cli(a, ['check', 'Q', '--owner', 'bob'], at(1))
  assert.equal(r.code, 1)
  r = w.cli(a, ['check', 'Q', '--owner', 'alice'], at(1))
  assert.deepEqual([r.code, r.stdout.trim()], [0, 'mine Q until 2026-10-31T12:00:00.000Z'])
  assert.equal(w.cli(a, ['check'], at(1)).code, 2)
  assert.equal(w.cli(a, ['claim', 'Q'], at(1)).code, 2)
  assert.equal(w.cli(a, ['frobnicate'], at(1)).code, 2)
  r = w.cli(a, ['check', 'Q', '--remote', path.join(w.dir, 'no-such.git')], at(1))
  assert.equal(r.code, 3)
  assert.match(r.stderr, /^claims: git ls-remote/m)
})

test('renew moves `renewed` forward and keeps the claim past its first expiry', () => {
  const w = makeWorld(1)
  const [a] = w.clones
  assert.equal(w.cli(a, ['claim', 'R', '--owner', 'alice', '--ttl', '1'], at(0)).code, 0)
  const r = w.cli(a, ['renew', '--owner', 'alice'], at(0.75))
  assert.equal(r.code, 0)
  assert.match(r.stdout, /^renewed R until 2026-10-30T13:45:00.000Z$/m)
  assert.equal(w.record().R.at, at(0))
  assert.equal(w.cli(a, ['check', 'R'], at(1.5)).code, 1, 'renewed claim still held at +1.5 h')
  assert.equal(w.cli(a, ['check', 'R'], at(2)).code, 0, 'free once renewed + ttl passes')
  // Renewing nothing writes nothing.
  const before = w.commits()
  assert.match(w.cli(a, ['renew', '--owner', 'nobody'], at(0.75)).stdout, /renewed nothing/)
  assert.equal(w.commits(), before)
})

test('release frees only the owner\'s claims; --all frees every one of them', () => {
  const w = makeWorld(2)
  const [a, b] = w.clones
  assert.equal(w.cli(a, ['claim', 'P1', 'P2', 'P3', '--owner', 'alice'], at(0)).code, 0)
  let r = w.cli(b, ['release', 'P1', '--owner', 'bob'], at(0))
  assert.equal(r.code, 0)
  assert.match(r.stdout, /^skipped P1 held by alice$/m)
  assert.equal(w.cli(b, ['check', 'P1'], at(0)).code, 1)
  r = w.cli(a, ['release', 'P1', '--owner', 'alice'], at(0))
  assert.match(r.stdout, /^released P1$/m)
  assert.equal(w.cli(b, ['check', 'P1'], at(0)).code, 0)
  r = w.cli(a, ['release', '--all', '--owner', 'alice'], at(0))
  assert.match(r.stdout, /^released P2$/m)
  assert.match(r.stdout, /^released P3$/m)
  assert.deepEqual(w.record(), {})
})

test('an expired claim is free to another owner and the write drops it', () => {
  const w = makeWorld(2)
  const [a, b] = w.clones
  assert.equal(w.cli(a, ['claim', 'E1', 'E2', '--owner', 'alice'], at(0)).code, 0)
  assert.equal(w.cli(b, ['claim', 'E1', '--owner', 'bob'], at(23)).code, 1, 'still live at +23 h')
  const r = w.cli(b, ['claim', 'E1', '--owner', 'bob'], at(25))
  assert.equal(r.code, 0, r.stdout + r.stderr)
  assert.deepEqual(Object.keys(w.record()), ['E1'])
  assert.equal(w.record().E1.owner, 'bob')
})

test('prune drops expired claims, list shows only live ones', () => {
  const w = makeWorld(1)
  const [a] = w.clones
  assert.equal(w.cli(a, ['claim', 'Z', '--owner', 'alice', '--ttl', '1'], at(0)).code, 0)
  assert.equal(w.cli(a, ['claim', 'K', '--owner', 'alice'], at(0)).code, 0)
  let r = w.cli(a, ['list'], at(2))
  assert.equal(r.stdout, 'K\talice\tuntil 2026-10-31T12:00:00.000Z\n')
  r = w.cli(a, ['list', '--json'], at(2))
  assert.deepEqual(Object.keys(JSON.parse(r.stdout)), ['K'])
  r = w.cli(a, ['prune'], at(2))
  assert.match(r.stdout, /^pruned Z \(alice\)$/m)
  assert.deepEqual(Object.keys(w.record()), ['K'])
  const before = w.commits()
  assert.equal(w.cli(a, ['prune'], at(2)).stdout.trim(), 'pruned nothing')
  assert.equal(w.commits(), before, 'a prune with nothing to drop writes nothing')
})

test('a CRLF claims.json on the branch is read tolerantly and rewritten LF', () => {
  const w = makeWorld(1)
  const [a] = w.clones
  const text = '{\r\n  "C": { "owner": "carol", "at": "' + at(0) + '", "renewed": "' + at(0) + '", "ttlHours": 24 }\r\n}\r\n'
  const blob = w.g(a, ['hash-object', '-w', '--stdin', '--no-filters'], { input: text }).trim()
  const tree = w.g(a, ['mktree'], { input: `100644 blob ${blob}\tclaims.json\n` }).trim()
  const sha = w.g(a, ['commit-tree', tree, '-m', 'seed'], {
    env: { ...w.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
  }).trim()
  w.g(a, ['push', '--quiet', 'origin', `${sha}:refs/heads/claims`])
  assert.equal(w.cli(a, ['check', 'C'], at(1)).code, 1)
  assert.equal(w.cli(a, ['claim', 'D', '--owner', 'dan'], at(1)).code, 0)
  assert.equal(w.rawRecord().includes('\r'), false)
  assert.deepEqual(Object.keys(w.record()), ['C', 'D'])
})

test('a push that loses the race is re-fetched and re-decided against the winner', () => {
  const w = makeWorld(2)
  const [a, b] = w.clones
  assert.equal(w.cli(a, ['claim', 'seed', '--owner', 'alice'], at(0)).code, 0)
  let calls = 0
  const op = (record, now) => {
    calls += 1
    // Between this writer's fetch and its push, another writer takes the id.
    if (calls === 1) assert.equal(w.cli(b, ['claim', 'W', '--owner', 'bob'], at(0)).code, 0)
    return opClaim(record, now, { ids: ['W'], owner: 'alice' })
  }
  const prev = { ...process.env }
  Object.assign(process.env, w.env)
  try {
    const result = writeWithRetry(a, 'origin', op, 'test')
    assert.equal(calls, 2, 'the rejected push re-fetched once')
    assert.equal(result.refused, true)
    assert.match(result.lines[0], /^held W by bob /)
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in prev)) delete process.env[key]
    Object.assign(process.env, prev)
  }
  assert.equal(w.record().W.owner, 'bob')
  assert.equal(MAX_RETRIES, 5)
})

// Two real processes, released at the same instant, claim one id.
function raceOnce(w, cloneA, cloneB, id) {
  const driver = path.join(w.dir, 'race-driver.mjs')
  fs.writeFileSync(driver, [
    `import { run } from ${JSON.stringify(pathToFileURL(SCRIPT).href)}`,
    'const startAt = Number(process.argv[2])',
    'while (Date.now() < startAt) {}',
    'const r = run(process.argv.slice(3))',
    'process.stdout.write(r.stdout)',
    'process.stderr.write(r.stderr)',
    'process.exitCode = r.code',
    '',
  ].join('\n'))
  const startAt = String(Date.now() + 1500)
  const go = (clone, owner) => new Promise((resolve) => {
    const child = spawn(process.execPath, [driver, startAt, 'claim', id, '--owner', owner, '--cwd', clone], {
      env: w.env,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('close', (code) => resolve({ owner, code, stdout, stderr }))
  })
  return Promise.all([go(cloneA, 'racer-a'), go(cloneB, 'racer-b')])
}

function assertOneWinner(w, results, id) {
  const winners = results.filter((r) => r.code === 0)
  const losers = results.filter((r) => r.code === 1)
  assert.equal(winners.length, 1, JSON.stringify(results))
  assert.equal(losers.length, 1, JSON.stringify(results))
  const winner = winners[0].owner
  assert.match(losers[0].stdout, new RegExp(`^held ${id} by ${winner} until `, 'm'))
  assert.equal(w.record()[id].owner, winner)
}

test('race: two concurrent claims for one id from two clones, exactly one wins', async () => {
  const w = makeWorld(2)
  // Round 1 races to create the orphan branch; round 2 races on an existing tip.
  assertOneWinner(w, await raceOnce(w, w.clones[0], w.clones[1], 'RACE1'), 'RACE1')
  assertOneWinner(w, await raceOnce(w, w.clones[0], w.clones[1], 'RACE2'), 'RACE2')
})

test('race: two concurrent claims from one repository, exactly one wins', async () => {
  const w = makeWorld(1)
  assertOneWinner(w, await raceOnce(w, w.clones[0], w.clones[0], 'SAME1'), 'SAME1')
  // Each writer fetched into its own private ref and deleted it.
  assert.equal(w.g(w.clones[0], ['for-each-ref', 'refs/claims-fetch/']).trim(), '')
})

// --- the hook, the workflows and the loop's texts (A5) ----------------

test('the pre-push hook lets a claims-only push through and still guards the rest', (t) => {
  const sh = spawnSync('sh', ['-c', 'exit 0'], { windowsHide: true })
  if (sh.error) return t.skip('no sh on PATH')
  const w = makeWorld(1)
  const repo = w.clones[0]
  fs.mkdirSync(path.join(repo, 'telemetry'))
  fs.writeFileSync(path.join(repo, 'telemetry', 'row.md'), 'uncommitted\n')
  const hook = path.join(ROOT, '.githooks', 'pre-push')
  const run = (input) => spawnSync('sh', [hook], { cwd: repo, env: w.env, input, encoding: 'utf-8' }).status
  const z = '0'.repeat(40)
  assert.equal(run(`${z.replace(/0/g, 'a')} ${'a'.repeat(40)} refs/heads/claims ${z}\n`), 0)
  assert.equal(run(`refs/heads/x ${'a'.repeat(40)} refs/heads/x ${z}\n`), 1)
  assert.equal(run(`a ${'a'.repeat(40)} refs/heads/claims ${z}\nrefs/heads/x ${'a'.repeat(40)} refs/heads/x ${z}\n`), 1)
})

test('every push: trigger in .github/workflows/ is branches: [main], so a claims push fires nothing', () => {
  const dir = path.join(ROOT, '.github', 'workflows')
  let pushes = 0
  for (const name of fs.readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))) {
    const lines = fs.readFileSync(path.join(dir, name), 'utf-8').replace(/\r\n/g, '\n').split('\n')
    for (const line of lines) {
      assert.doesNotMatch(line, /^on:\s*(\[[^\]]*\bpush\b|push\b)/, `${name}: bare push trigger`)
    }
    lines.forEach((line, i) => {
      const m = /^(\s+)push:\s*$/.exec(line)
      if (!m) return
      pushes += 1
      const block = []
      for (let j = i + 1; j < lines.length && (lines[j].trim() === '' || lines[j].search(/\S/) > m[1].length); j += 1) {
        block.push(lines[j].trim())
      }
      assert.ok(block.includes('branches: [main]'), `${name}:${i + 1} push trigger is not branches: [main]`)
      assert.equal(block.some((l) => l.startsWith('tags:') || l.startsWith('branches-ignore:')), false, `${name}:${i + 1}`)
    })
  }
  assert.ok(pushes > 0)
})

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r\n/g, '\n')

function section(text, heading) {
  const start = text.indexOf(heading)
  assert.notEqual(start, -1, `missing ${heading}`)
  const level = heading.match(/^#+/)[0]
  const rest = text.slice(start + heading.length)
  const end = rest.search(new RegExp(`\\n#{1,${level.length}} `))
  return end === -1 ? rest : rest.slice(0, end)
}

test('march.md: a row claimed in claims.json by another owner is not pickable', () => {
  const march = read('skills/march.md')
  const pickable = section(march, '### Pickable phase')
  assert.ok(pickable.includes(
    '4. **is not claimed** by an open `loop:pr` PR or a live claim in\n   `claims.json` held by another owner',
  ), 'Pickable phase rule 4')
  const claims = section(march, '### Claims')
  assert.equal(claims.includes('No `claims` branch is needed'), false)
  for (const needle of ['scripts/claims.mjs', 'orphan `claims` branch', '24 h', 'node scripts/claims.mjs check']) {
    assert.ok(claims.includes(needle), `Claims names ${needle}`)
  }
})

test('ship-a-phase.md: Step 2 claims before reading the brief; Step 12.5 releases once the PR is open', () => {
  const ship = read('skills/ship-a-phase.md')
  const step2 = section(ship, '### Step 2 — Read the brief')
  const claimAt = step2.indexOf('node scripts/claims.mjs claim')
  assert.notEqual(claimAt, -1, 'Step 2 runs claims.mjs claim')
  assert.ok(claimAt < step2.indexOf('plan/phases/phase_<N>_<topic>.md'), 'the claim comes before the brief read')
  for (const needle of [
    '$CLAIM_OWNER',
    'tick:${GITHUB_RUN_ID:-<session id>}',
    'A refused claim (exit 1) skips the row',
    'falls back to the PR and mirror-issue checks',
  ]) {
    assert.ok(step2.includes(needle), `Step 2 says ${needle}`)
  }
  const step125 = section(ship, '### Step 12.5 — Phase mirror comment')
  assert.ok(step125.includes('node scripts/claims.mjs release'), 'Step 12.5 releases')
  assert.ok(step125.includes('the PR is the claim'), 'Step 12.5 says why')
})
