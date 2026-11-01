// scripts/claims.test.mjs: the kit's claims (scripts/claims.mjs, v2 since NX1f) with Miserere's layer on top
// (scripts/claims-local.mjs: --owner / CLAIM_OWNER, row aliases, the v1 record) and the branch migration
// (scripts/claims-migrate.mjs).
//
//   node --test scripts/claims.test.mjs
//
// Hermetic: every test runs against a temporary bare repository made with `git init --bare` in the OS temp dir as
// `origin`. No network, never the real origin's `claims` branch, no gh (NEXUS_GH_LOGIN is set empty). Git runs with
// no system config and a scratch global config. The race test starts two real processes at the same instant.

import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { parse, state } from './claims-codec.mjs'
import { aliasTable, asOwner, bareIds, claimOwner, fromV1, resolveId, runSession, v1Value } from './claims-local.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const SCRIPT = path.join(HERE, 'claims.mjs')
const MIGRATE = path.join(HERE, 'claims-migrate.mjs')

// --- fixtures ---------------------------------------------------------

const tmpRoots = []
test.after(() => {
  for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

function baseEnv(extra = {}) {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_') || key.startsWith('NEXUS_') || key.startsWith('CLAUDE') || key === 'CLAIM_OWNER') delete env[key]
  }
  return { ...env, NEXUS_GH_LOGIN: '', NEXUS_CONTRIBUTOR: '1', ...extra }
}

const SPEC = '# 133 — fixture\n\n## Chunks\n\n- [ ] **133.5** One · L · closes A9 · needs — · alias: NX1e\n- [ ] **133.6** Two · M · closes A10 · needs — · alias: NX1f\n'
const ARCHIVE = '# Archive\n\n- 2026-10-31 · 113.4 (alias: SM1d) · The app posts the whole run · (this commit)\n'

/** A temp dir holding a bare `origin` and `n` clones of it, each with a plan/ fixture. */
function makeWorld(n = 2) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claims-test-'))
  tmpRoots.push(dir)
  const gitconfig = path.join(dir, 'gitconfig')
  fs.writeFileSync(gitconfig, '[user]\n\tname = tester\n\temail = tester@example.invalid\n')
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
    fs.mkdirSync(path.join(clone, 'plan'))
    fs.writeFileSync(path.join(clone, 'plan', '133-fixture.md'), SPEC)
    fs.writeFileSync(path.join(clone, 'plan', 'ARCHIVE.md'), ARCHIVE)
    clones.push(clone)
  }
  const run = (script, clone, args, extra = {}) => {
    const r = spawnSync(process.execPath, [script, ...args], { cwd: clone, env: { ...env, NEXUS_SESSION: 'sess-a', ...extra }, encoding: 'utf-8', windowsHide: true })
    return { code: r.status, stdout: r.stdout, stderr: r.stderr }
  }
  const cli = (clone, args, extra) => run(SCRIPT, clone, args, extra)
  const rawRecord = () => g(origin, ['cat-file', 'blob', 'claims:claims.json'])
  const record = () => JSON.parse(rawRecord())
  const commits = () => Number(g(origin, ['rev-list', '--count', 'claims']).trim())
  /** Seed the branch with `text` as claims.json (a v1 record, say), as one commit. */
  const seed = (text) => {
    const blob = g(clones[0], ['hash-object', '-w', '--stdin'], { input: text }).trim()
    const tree = g(clones[0], ['mktree'], { input: `100644 blob ${blob}\tclaims.json\n` }).trim()
    const sha = g(clones[0], ['commit-tree', tree, '-m', 'seed']).trim()
    g(clones[0], ['push', '--quiet', 'origin', `${sha}:refs/heads/claims`])
  }
  return { dir, env, g, origin, clones, cli, run, record, rawRecord, commits, seed }
}

const iso = (ms) => new Date(ms).toISOString()

// --- the local layer, pure --------------------------------------------

test('claimOwner: --owner, else CLAIM_OWNER, else none; a run owner is its session, any other is who and session', () => {
  assert.equal(claimOwner('heads-down:1', { CLAIM_OWNER: 'x' }), 'heads-down:1')
  assert.equal(claimOwner('', { CLAIM_OWNER: 'heads-down:747f1213' }), 'heads-down:747f1213')
  assert.equal(claimOwner('', {}), '')
  const me = asOwner({ who: 'T', session: 'abc', star: 'vega', host: 'h' }, 'heads-down:1')
  assert.deepEqual([me.who, me.session, me.star, me.host], ['T', '1', '', 'h'], 'a run owner is its session')
  assert.deepEqual([asOwner({ who: 'T', session: 'abc' }, 'pilot:747f1213').session, runSession('pilot:747f1213')], ['747f1213', '747f1213'])
  const plot = asOwner({ who: 'T', session: 'abc' }, 'plot-eq3')
  assert.deepEqual([plot.who, plot.session, runSession('plot-eq3')], ['plot-eq3', 'plot-eq3', ''])
  assert.equal(asOwner({ who: 'T', session: 'abc' }, '').who, 'T')
})

test('aliases resolve from chunk lines, then the archive; a chunk id and an unknown id stay', () => {
  const table = aliasTable([SPEC], ARCHIVE)
  assert.equal(resolveId('NX1f', table), '133.6')
  assert.equal(resolveId('NX1e', table), '133.5')
  assert.equal(resolveId('SM1d', table), '113.4')
  assert.equal(resolveId('133.6', table), '133.6')
  assert.equal(resolveId('136', table), '136')
  assert.equal(resolveId('ZZ9z', table), 'ZZ9z')
})

test('a v1 entry reads as v2 with the same owner and expiry, under its chunk', () => {
  const renewed = Date.parse('2026-11-01T06:00:00.000Z')
  const v = v1Value({ owner: 'heads-down:747f1213', at: iso(renewed - 3600e3), renewed: iso(renewed), ttlHours: 24 })
  assert.equal(v, `heads-down:747f1213|-|-|${iso(renewed)}|s:heads-down:747f1213`, 'no local who: kept whole')
  assert.equal(v1Value({ owner: 'heads-down:747f1213', renewed: iso(renewed) }, 'TJ'), `TJ|-|-|${iso(renewed)}|s:747f1213`, 'a run owner becomes its session')
  const short = parse(v1Value({ owner: 'o', at: iso(renewed), renewed: iso(renewed), ttlHours: 1 }))
  assert.equal(state(short, renewed + 0.5 * 3600e3), 'live')
  assert.equal(state(short, renewed + 1.5 * 3600e3), 'stale', 'a 1 h v1 claim still ends after 1 h')
  const map = fromV1({ NX1f: { owner: 'o', at: iso(renewed), renewed: iso(renewed), ttlHours: 24 }, 136: 'p|-|-|x|s:p' }, aliasTable([SPEC]))
  assert.deepEqual(Object.keys(map).sort(), ['133.6', '136'])
  const v2 = { '133.6': 'a|b|c|d|s:e' }
  assert.equal(fromV1(v2, () => assert.fail('no table needed')), v2, 'a v2 map is left as it is')
})

test('audit reads a chunk closed on an aliased ARCHIVE line as archived, even when spec prose still names it', async () => {
  const { verdict } = await import('./claims.mjs')
  const c = parse('heads-down:1|-|-|2026-11-01T00:00:00.000Z|s:heads-down:1')
  const plan = { archive: bareIds(ARCHIVE), specs: ['see **113.4** for the old run'], names: ['plan/113-x.md'] }
  assert.equal(verdict('113.4', c, plan, { now: Date.parse('2026-11-01T01:00:00.000Z') }), 'archived')
  assert.equal(bareIds('# Archive\n'), '# Archive\n')
})

// --- the CLI against a temporary bare origin --------------------------

test('the verbs /next calls: whoami, claim, list, renew, pr, prune, release', () => {
  const w = makeWorld(1)
  const [a] = w.clones
  let r = w.cli(a, ['whoami'])
  assert.equal(r.code, 0, r.stderr)
  assert.match(r.stdout, /^contributor · claims as tester · session sess-a/)
  r = w.cli(a, ['claim', '133.6'])
  assert.equal(r.code, 0, r.stderr)
  assert.match(r.stdout, /^133\.6: free$/m)
  assert.equal(w.g(w.origin, ['ls-tree', '--name-only', 'claims']).trim().split('\n').sort().join(','), 'README.md,claims.json')
  assert.equal(parse(w.record()['133.6']).who, 'tester')
  assert.match(w.cli(a, ['list']).stdout, /^133\.6 +live +tester · .* · sess-a · .* · this session$/m)
  assert.match(w.cli(a, ['renew']).stdout, /^renewed: 133\.6$/m)
  assert.equal(w.cli(a, ['pr', '133.6', '4242']).code, 0)
  assert.equal(parse(w.record()['133.6']).pr, 4242)
  assert.match(w.cli(a, ['prune']).stdout, /^pruned: /m, 'prune runs (gh unreachable: the PR is kept)')
  r = w.cli(a, ['release', '133.6'])
  assert.match(r.stdout, /^released: 133\.6$/m)
  assert.deepEqual(w.record(), {})
  assert.equal(w.cli(a, ['frobnicate']).code, 2)
})

test('a claim is all or nothing, and another session is refused, naming the holder', () => {
  const w = makeWorld(2)
  const [a, b] = w.clones
  assert.equal(w.cli(a, ['claim', '133.5']).code, 0)
  const r = w.cli(b, ['claim', '133.5'], { NEXUS_SESSION: 'sess-b' })
  assert.equal(r.code, 1)
  assert.match(r.stdout, /^133\.5: refused, held by tester on /m)
  assert.match(r.stdout, /nothing claimed/)
  assert.equal(w.cli(b, ['release', '133.5'], { NEXUS_SESSION: 'sess-b' }).code, 1, 'not that session\'s to release')
  assert.deepEqual(Object.keys(w.record()), ['133.5'])
})

test('--owner and CLAIM_OWNER: one claimant across sessions, aliases claimed as their chunks, a wave as a package', () => {
  const w = makeWorld(2)
  const [a, b] = w.clones
  const owner = 'heads-down:747f1213'
  // The orchestrator claims a wave by row id, in one call.
  let r = w.cli(a, ['claim', 'NX1e', 'NX1f', '--owner', owner], { NEXUS_SESSION: 'orchestrator' })
  assert.equal(r.code, 0, r.stdout + r.stderr)
  assert.deepEqual(Object.keys(w.record()), ['133.5', '133.6'])
  const c = parse(w.record()['133.6'])
  assert.deepEqual([c.who, c.session], ['tester', '747f1213'])
  // /pilot after NX1f: a plain call as that session (NEXUS_SESSION) holds the same claims.
  assert.match(w.cli(b, ['renew', '133.5'], { NEXUS_SESSION: '747f1213' }).stdout, /^renewed: 133\.5$/m)
  // A worker in another session and checkout renews and releases under the same owner, by CLAIM_OWNER.
  const worker = { NEXUS_SESSION: 'worker', CLAIM_OWNER: owner }
  assert.match(w.cli(b, ['claim', 'NX1f'], worker).stdout, /^133\.6: yours$/m, 'a renewal')
  assert.match(w.cli(b, ['renew'], worker).stdout, /^renewed: 133\.5, 133\.6$/m)
  // NX1e's loop-land attaches the PR with `pr <chunk> <n>`: NEXUS_SESSION set, CLAIM_OWNER inherited.
  assert.equal(w.cli(b, ['pr', '133.5', '1284'], worker).code, 0)
  assert.equal(parse(w.record()['133.5']).pr, 1284)
  // Someone else is refused.
  assert.equal(w.cli(b, ['claim', '133.6'], { NEXUS_SESSION: 'other' }).code, 1)
  assert.match(w.cli(b, ['release', 'NX1f'], worker).stdout, /^released: 133\.6$/m)
  // --all releases every claim of the owner and nobody else's.
  assert.equal(w.cli(a, ['claim', '136'], { NEXUS_SESSION: 'plotter' }).code, 0)
  assert.match(w.cli(a, ['release', '--all', '--owner', owner]).stdout, /^released: 133\.5$/m)
  assert.deepEqual(Object.keys(w.record()), ['136'])
})

test('the migration on a fixture branch: v1 entries become v2 under their chunks, every claim kept', () => {
  const w = makeWorld(2)
  const [a, b] = w.clones
  const now = Date.now()
  const v1 = {
    NX1e: { owner: 'heads-down:747f1213', at: iso(now - 7200e3), renewed: iso(now - 600e3), ttlHours: 24 },
    NX1f: { owner: 'heads-down:747f1213', at: iso(now - 7000e3), renewed: iso(now - 7000e3), ttlHours: 24 },
    136: { owner: 'plot-eq3', at: iso(now - 60e3), renewed: iso(now - 60e3), ttlHours: 24 },
  }
  w.seed(`${JSON.stringify(v1, null, 2)}\n`)
  // Before any write, v2 reads the v1 record as it means.
  const listed = w.cli(b, ['list', '--json'])
  assert.equal(listed.code, 0, listed.stderr)
  const rows = JSON.parse(listed.stdout)
  assert.deepEqual(rows.map((x) => [x.id, x.who, x.state]).sort(), [['133.5', 'tester', 'live'], ['133.6', 'tester', 'live'], ['136', 'plot-eq3', 'live']])
  // A dry run writes nothing.
  const before = w.commits()
  assert.match(w.run(MIGRATE, a, ['--dry-run']).stdout, /would migrate \(dry run\)/)
  assert.equal(w.commits(), before)
  // The migration writes once, and a second run finds nothing to do.
  const r = w.run(MIGRATE, a, [])
  assert.equal(r.code, 0, r.stderr)
  assert.match(r.stdout, /migrated$/m)
  assert.equal(w.commits(), before + 1)
  const rec = w.record()
  assert.deepEqual(Object.keys(rec).sort(), ['133.5', '133.6', '136'])
  assert.equal(rec['133.5'], `tester|-|-|${iso(now - 600e3)}|s:747f1213`)
  assert.equal(parse(rec['136']).session, 'plot-eq3')
  assert.match(w.run(MIGRATE, a, []).stdout, /nothing to migrate$/m)
  assert.equal(w.commits(), before + 1)
  // The migrated claims are still their owners': the heads-down worker renews, plot-eq3 releases.
  assert.match(w.cli(b, ['renew', 'NX1f'], { CLAIM_OWNER: 'heads-down:747f1213' }).stdout, /^renewed: 133\.6$/m)
  assert.match(w.cli(b, ['renew', 'NX1e'], { NEXUS_SESSION: '747f1213' }).stdout, /^renewed: 133\.5$/m, '/pilot resume renews them as the session')
  assert.match(w.cli(b, ['release', '136', '--owner', 'plot-eq3']).stdout, /^released: 136$/m)
})

test('the first v2 write on a v1 branch migrates it with no claim lost', () => {
  const w = makeWorld(1)
  const [a] = w.clones
  const now = Date.now()
  w.seed(`${JSON.stringify({ NX1e: { owner: 'heads-down:1', at: iso(now), renewed: iso(now), ttlHours: 24 } })}\n`)
  assert.equal(w.cli(a, ['claim', '133.6']).code, 0)
  assert.deepEqual(Object.keys(w.record()), ['133.5', '133.6'])
  assert.equal(parse(w.record()['133.5']).session, '1')
  assert.equal(w.cli(a, ['claim', 'NX1e']).code, 1, 'still heads-down:1\'s')
})

test('a Claude Code session claims once the guard hook has marked it, and is refused before', () => {
  const w = makeWorld(1)
  const [a] = w.clones
  const session = { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: '11111111-2222-3333-4444-555555555555' }
  const r = w.cli(a, ['whoami'], session)
  assert.equal(r.code, 1)
  assert.match(r.stderr, /loaded no project hooks/)
  const guard = path.join(ROOT, '.claude', 'hooks', 'guard.mjs')
  const input = JSON.stringify({ session_id: session.CLAUDE_CODE_SESSION_ID, cwd: a, tool_input: { command: 'ls' } })
  assert.equal(spawnSync(process.execPath, [guard, 'pre-bash'], { cwd: a, env: w.env, input, encoding: 'utf-8' }).status, 0)
  assert.ok(fs.existsSync(path.join(a, '.nexus', 'hooks', session.CLAUDE_CODE_SESSION_ID)), 'the guard marks the session')
  assert.equal(w.cli(a, ['whoami'], session).code, 0)
  assert.equal(w.cli(a, ['claim', '133.6'], session).code, 0)
  // A worktree's call marks the primary checkout (gitdir: and commondir), where claims.mjs looks.
  w.g(a, ['commit', '-q', '--allow-empty', '-m', 'base'])
  const wt = path.join(w.dir, 'wt')
  w.g(a, ['worktree', 'add', '-q', '-b', 'side', wt])
  const other = { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: '99999999-2222-3333-4444-555555555555' }
  const wtInput = JSON.stringify({ session_id: other.CLAUDE_CODE_SESSION_ID, cwd: wt, tool_input: { command: 'ls' } })
  assert.equal(spawnSync(process.execPath, [guard, 'pre-bash'], { cwd: wt, env: w.env, input: wtInput, encoding: 'utf-8' }).status, 0)
  assert.ok(fs.existsSync(path.join(a, '.nexus', 'hooks', other.CLAUDE_CODE_SESSION_ID)), 'marked at the primary checkout')
  assert.equal(fs.existsSync(path.join(wt, '.nexus')), false, 'not in the worktree')
  // The markers never dirty the tree (the Stop hook's dirty-tree check): .nexus/ is ignored.
  assert.match(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8'), /^\.nexus\/$/m)
})

test('free says whether a chunk may be claimed; assign is the owner\'s alone', () => {
  const w = makeWorld(1)
  const [a] = w.clones
  assert.match(w.cli(a, ['free', '133.6']).stdout, /^133\.6: free$/m)
  assert.equal(w.cli(a, ['claim', '133.6']).code, 0)
  const r = w.cli(a, ['free', '133.6'], { NEXUS_SESSION: 'other' })
  assert.equal(r.code, 1)
  assert.match(r.stdout, /^133\.6: held by tester on /m)
  const asg = w.cli(a, ['assign', '133.5', '--to', 'pat', '--login', 'pat-gh'])
  assert.notEqual(asg.code, 0)
  assert.match(asg.stderr, /only the owner assigns chunks/)
  assert.equal(w.record()['133.5'], undefined)
})

// Two real processes, released at the same instant, claim one chunk.
function raceOnce(w, cloneA, cloneB, id) {
  const driver = path.join(w.dir, 'race-driver.mjs')
  fs.writeFileSync(driver, [
    `import { main } from ${JSON.stringify(pathToFileURL(SCRIPT).href)}`,
    'const startAt = Number(process.argv[2])',
    'while (Date.now() < startAt) {}',
    'let code = 1',
    'try { code = main(process.argv.slice(3)) } catch (e) { console.error(String(e)) }',
    'process.exitCode = code',
    '',
  ].join('\n'))
  const startAt = String(Date.now() + 1500)
  const go = (clone, session) => new Promise((resolve) => {
    const child = spawn(process.execPath, [driver, startAt, 'claim', id], { cwd: clone, env: { ...w.env, NEXUS_SESSION: session }, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('close', (code) => resolve({ session, code, stdout, stderr }))
  })
  return Promise.all([go(cloneA, 'racer-a'), go(cloneB, 'racer-b')])
}

test('race: two concurrent claims for one chunk from two clones, exactly one wins', async () => {
  const w = makeWorld(2)
  for (const id of ['140.1', '140.2']) {
    const results = await raceOnce(w, w.clones[0], w.clones[1], id)
    const winners = results.filter((r) => r.code === 0)
    assert.equal(winners.length, 1, JSON.stringify(results))
    assert.equal(parse(w.record()[id]).session, winners[0].session)
  }
})

// --- the hook, the workflows and the loop's texts ---------------------

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

// /next claims a chunk before anything else and a PR'd claim ends at merge (the kit's text). Every verb next.md
// names is one claims.mjs has.
test('next.md: a chunk is claimed before anything else, a PR holds the claim, and every verb it names exists', () => {
  const next = read('skills/next.md')
  assert.ok(next.includes('**Claim before anything else**: `node scripts/claims.mjs\n  claim <id>`'), 'claim first')
  assert.ok(next.includes('a\n   PR\'d claim ends at merge'), 'a PR holds the claim')
  const usage = read('scripts/claims.mjs')
  for (const verb of ['whoami', 'list', 'claim', 'renew', 'pr', 'release', 'prune', 'free', 'audit']) {
    assert.match(usage, new RegExp(`case '${verb}':`), `claims.mjs has ${verb}`)
  }
})

test('the shipped-chunk notes release the claim once the PR is open', () => {
  const lanes = read('skills/march.lanes.md')
  const step125 = section(lanes, '#### Step 12.5 — Phase mirror comment')
  assert.ok(step125.includes('node scripts/claims.mjs release'), 'Step 12.5 releases')
  assert.ok(step125.includes('the PR is the claim'), 'Step 12.5 says why')
})

// claims.mjs stays the kit's text plus marked Miserere lines, so the weekly sync's three-way merge stays clean.
test('claims.mjs is the kit text with only marked Miserere lines', () => {
  const lines = read('scripts/claims.mjs').split('\n').filter((l) => /claims-local|aliasesAt|asOwner|claimOwner|fromV1|resolveId|--all/.test(l))
  assert.ok(lines.length >= 5)
  const marked = read('scripts/claims.mjs').split('\n').filter((l) => /Miserere/.test(l))
  assert.ok(marked.length >= 5, 'each local change says so')
})
