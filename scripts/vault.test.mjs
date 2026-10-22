// scripts/vault.test.mjs — the vault working copy (phase OV1b, A3 and A4) and
// the feature-map copy into it (phase FM1e, A12).
// Every case runs against a temp bare repo standing in for
// no-trbl-2-u/miserere-vault and a temp host repo standing in for Miserere's
// main checkout; nothing touches the network or this checkout's vault/.
//
//   node --test scripts/vault.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { isZoned } from './check-lexicon.mjs'
import { cleanEnv, ensure, FEATURES_HEADER, featuresNote, featureTable, features, mainRoot, status, TABLE_END, TABLE_START } from './vault.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Throwaway repos: a fixed identity and no signing, whatever the machine's global config says.
const sh = (cwd, ...args) =>
  execFileSync(
    'git',
    ['-c', 'user.name=vault-test', '-c', 'user.email=vault-test@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: cleanEnv() },
  ).trim()

const same = (a, b) => path.resolve(a).replace(/\\/g, '/').toLowerCase() === path.resolve(b).replace(/\\/g, '/').toLowerCase()

function commitFile(dir, name, body, msg) {
  writeFileSync(path.join(dir, name), body)
  sh(dir, 'add', name)
  sh(dir, 'commit', '-q', '-m', msg)
}

/** Commit in the seed clone and push it to the bare remote. */
function publish(seed, name, body, msg) {
  commitFile(seed, name, body, msg)
  sh(seed, 'push', '-q', 'origin', 'main')
}

/** A bare "vault" remote seeded with one commit, a seed clone to push from, and a host checkout. */
function fixture(t) {
  const tmp = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'vault-test-')))
  // A git child can still be writing under .git as the hook runs: retry ENOTEMPTY.
  t.after(() => rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))
  const remote = path.join(tmp, 'miserere-vault.git')
  sh(tmp, 'init', '-q', '--bare', '--initial-branch=main', remote)
  const seed = path.join(tmp, 'seed')
  sh(tmp, 'clone', '-q', remote, seed)
  sh(seed, 'symbolic-ref', 'HEAD', 'refs/heads/main')
  commitFile(seed, '00 Goal.md', '# Goal\n', 'vault: skeleton')
  sh(seed, 'push', '-q', '-u', 'origin', 'main')
  const host = path.join(tmp, 'host')
  mkdirSync(host)
  sh(host, 'init', '-q', '--initial-branch=main')
  commitFile(host, '.gitignore', '/vault/\n', 'host: init')
  return { tmp, remote, seed, host, vault: path.join(host, 'vault') }
}

test('ensure clones the vault into <root>/vault when it is missing', (t) => {
  const f = fixture(t)
  const r = ensure({ cwd: f.host, remote: f.remote })
  assert.equal(r.code, 0, r.lines.join('\n'))
  assert.match(r.lines.join('\n'), /cloned/)
  assert.equal(readFileSync(path.join(f.vault, '00 Goal.md'), 'utf8'), '# Goal\n')
  // A3: the ignored clone leaves the host tree clean.
  assert.equal(sh(f.host, 'status', '--porcelain'), '')
})

test('ensure fast-forwards a clean clone that is behind', (t) => {
  const f = fixture(t)
  assert.equal(ensure({ cwd: f.host, remote: f.remote }).code, 0)
  publish(f.seed, 'Inbox.md', '- an idea\n', 'vault: inbox')
  const tip = sh(f.seed, 'rev-parse', 'HEAD')
  const r = ensure({ cwd: f.host, remote: f.remote })
  assert.equal(r.code, 0, r.lines.join('\n'))
  assert.match(r.lines.join('\n'), /fast-forwarded 1 commit/)
  assert.equal(sh(f.vault, 'rev-parse', 'HEAD'), tip)
  assert.match(ensure({ cwd: f.host, remote: f.remote }).lines.join('\n'), /up to date/)
})

test('ensure refuses a dirty tree, names it, and does not pull', (t) => {
  const f = fixture(t)
  ensure({ cwd: f.host, remote: f.remote })
  const before = sh(f.vault, 'rev-parse', 'HEAD')
  publish(f.seed, 'Inbox.md', '- remote idea\n', 'vault: inbox')
  writeFileSync(path.join(f.vault, 'draft.md'), 'unsaved\n')
  const r = ensure({ cwd: f.host, remote: f.remote })
  assert.equal(r.code, 1)
  assert.match(r.lines.join('\n'), /dirty \(1 changed path\)/)
  assert.equal(sh(f.vault, 'rev-parse', 'HEAD'), before, 'no pull happened')
})

test('ensure refuses a diverged branch, names both counts, and never merges', (t) => {
  const f = fixture(t)
  ensure({ cwd: f.host, remote: f.remote })
  commitFile(f.vault, 'Threads.md', 'local\n', 'vault: local')
  const local = sh(f.vault, 'rev-parse', 'HEAD')
  publish(f.seed, 'Inbox.md', '- one\n', 'vault: one')
  publish(f.seed, 'Inbox.md', '- two\n', 'vault: two')
  const r = ensure({ cwd: f.host, remote: f.remote })
  assert.equal(r.code, 1)
  assert.match(r.lines.join('\n'), /diverged \(ahead 1, behind 2\)/)
  assert.equal(sh(f.vault, 'rev-parse', 'HEAD'), local, 'HEAD untouched')
  assert.equal(sh(f.vault, 'status', '--porcelain'), '', 'no merge left behind')
})

test('from a linked worktree, ensure and status resolve the main checkout vault', (t) => {
  const f = fixture(t)
  const wt = path.join(f.tmp, 'wt')
  sh(f.host, 'worktree', 'add', '-q', '-b', 'side', wt)
  assert.ok(same(mainRoot({ cwd: wt }), f.host), `mainRoot from worktree: ${mainRoot({ cwd: wt })}`)
  assert.ok(same(mainRoot({ cwd: path.join(f.host) }), f.host))
  const r = ensure({ cwd: wt, remote: f.remote })
  assert.equal(r.code, 0, r.lines.join('\n'))
  assert.equal(readFileSync(path.join(f.vault, '00 Goal.md'), 'utf8'), '# Goal\n')
  assert.throws(() => readFileSync(path.join(wt, 'vault', '00 Goal.md')), 'nothing cloned into the worktree')
  const s = status({ cwd: wt }).lines.join('\n')
  assert.ok(s.replace(/\\/g, '/').toLowerCase().includes(f.vault.replace(/\\/g, '/').toLowerCase()), s)
})

test('status prints head, ahead/behind and dirty, and exits 0', (t) => {
  const f = fixture(t)
  assert.match(status({ cwd: f.host }).lines.join('\n'), /not cloned/)
  ensure({ cwd: f.host, remote: f.remote })
  let s = status({ cwd: f.host })
  assert.equal(s.code, 0)
  assert.match(s.lines.join('\n'), /head: [0-9a-f]{7,} vault: skeleton/)
  assert.match(s.lines.join('\n'), /ahead 0, behind 0/)
  assert.match(s.lines.join('\n'), /dirty: no/)
  commitFile(f.vault, 'note.md', 'x\n', 'vault: note')
  writeFileSync(path.join(f.vault, 'draft.md'), 'y\n')
  s = status({ cwd: f.host })
  assert.equal(s.code, 0)
  assert.match(s.lines.join('\n'), /ahead 1, behind 0/)
  assert.match(s.lines.join('\n'), /dirty: yes/)
})

test('the git runner is injectable', () => {
  const calls = []
  const fake = (args, cwd) => {
    calls.push(args.join(' '))
    return { ok: true, out: path.join(cwd, '.git'), err: '' }
  }
  const root = path.resolve('/fake/root')
  assert.ok(same(mainRoot({ cwd: root, git: fake }), root))
  assert.deepEqual(calls, ['rev-parse --path-format=absolute --git-common-dir'])
})

test('A3: Miserere ignores /vault/ and the lexicon lint never scans it', () => {
  const ignore = readFileSync(path.join(REPO, '.gitignore'), 'utf8')
  assert.match(ignore, /^\/vault\/$/m)
  assert.equal(isZoned('vault/Inbox.md'), true)
  assert.equal(isZoned('vault/Threads/a.md'), true)
  assert.equal(isZoned('docs/vault.md'), false)
})

// --- FM1e: the feature map copied into the vault -------------------------

const CANVAS = '{"nodes":[{"id":"village","type":"text","text":"Village","x":0,"y":0,"width":200,"height":60}],"edges":[]}\n'
const TABLE = '| Feature | Kind | Needs pitch |\n|---|---|---|\n| Village | route | no |\n'
const README = `# Feature map\n\nIntro prose that stays in the repo.\n\n${TABLE_START}\n${TABLE}${TABLE_END}\n\n## Anomalies\n\n- none\n`

/** The fixture with the vault cloned and, unless told otherwise, the generated feature map in the host checkout. */
function featureFixture(t, { canvas = CANVAS, readme = README } = {}) {
  const f = fixture(t)
  assert.equal(ensure({ cwd: f.host, remote: f.remote }).code, 0)
  const src = path.join(f.host, 'docs', 'feature-map')
  mkdirSync(src, { recursive: true })
  if (canvas !== null) writeFileSync(path.join(src, 'Map.canvas'), canvas)
  if (readme !== null) writeFileSync(path.join(src, 'README.md'), readme)
  return { ...f, src }
}

const read = (dir, name) => readFileSync(path.join(dir, name), 'utf8')
const vaultChanges = (f) => sh(f.vault, 'status', '--porcelain', '--untracked-files=all')

test('featureTable returns the lines between the markers verbatim', () => {
  assert.equal(featureTable(README), TABLE.replace(/\n$/, ''))
  // CRLF markers still match; the table's own line endings pass through untouched.
  const crlf = README.replace(/\n/g, '\r\n')
  assert.equal(featureTable(crlf), TABLE.replace(/\n/g, '\r\n').replace(/\n$/, ''))
  assert.equal(featuresNote(crlf), `${FEATURES_HEADER}\n\n${TABLE.replace(/\n/g, '\r\n')}`)
  assert.equal(featuresNote(README), `${FEATURES_HEADER}\n\n${TABLE}`)
})

test('featureTable rejects a missing, doubled, inline or reversed marker', () => {
  assert.throws(() => featureTable('# no markers\n'), /found 0 start, 0 end/)
  assert.throws(() => featureTable(`${TABLE_START}\n${TABLE_START}\nx\n${TABLE_END}\n`), /found 2 start, 1 end/)
  assert.throws(() => featureTable(`text ${TABLE_START}\nx\n${TABLE_END}\n`), /found 0 start, 1 end/)
  assert.throws(() => featureTable(`${TABLE_END}\nx\n${TABLE_START}\n`), /start first/)
})

test('features copies the canvas and the table, and leaves every other vault file alone', (t) => {
  const f = featureFixture(t)
  commitFile(f.vault, 'Inbox.md', '- T idea\n', 'vault: inbox')
  commitFile(f.vault, 'Map.canvas', '{"nodes":[],"edges":[]}\n', 'vault: thread canvas')
  commitFile(f.vault, '02 Features.md', 'stale, overwritten\n', 'vault: stale features')
  const r = features({ cwd: f.host })
  assert.equal(r.code, 0, r.lines.join('\n'))
  assert.match(r.lines.join('\n'), /wrote Feature Map\.canvas/)
  assert.match(r.lines.join('\n'), /wrote 02 Features\.md/)
  assert.ok(readFileSync(path.join(f.vault, 'Feature Map.canvas')).equals(readFileSync(path.join(f.src, 'Map.canvas'))))
  assert.equal(read(f.vault, '02 Features.md'), `${FEATURES_HEADER}\n\n${TABLE}`)
  assert.doesNotMatch(read(f.vault, '02 Features.md'), /Intro prose|Anomalies/)
  // Only the two generated files changed; every other note is byte-identical.
  const changed = vaultChanges(f).split('\n').map((l) => l.slice(3).replace(/"/g, '')).sort()
  assert.deepEqual(changed, ['02 Features.md', 'Feature Map.canvas'])
  assert.equal(read(f.vault, '00 Goal.md'), '# Goal\n')
  assert.equal(read(f.vault, 'Inbox.md'), '- T idea\n')
  assert.equal(read(f.vault, 'Map.canvas'), '{"nodes":[],"edges":[]}\n')
})

test('features is idempotent: a second run reports up to date and rewrites nothing', (t) => {
  const f = featureFixture(t)
  assert.equal(features({ cwd: f.host }).code, 0)
  const r = features({ cwd: f.host })
  assert.equal(r.code, 0)
  assert.deepEqual(r.lines, ['vault: Feature Map.canvas is up to date', 'vault: 02 Features.md is up to date'])
})

test('features skips a source that is not generated yet, exits 0, and writes nothing for it', (t) => {
  const f = featureFixture(t, { canvas: null, readme: null })
  const r = features({ cwd: f.host })
  assert.equal(r.code, 0, r.lines.join('\n'))
  assert.equal(r.lines.length, 2)
  for (const line of r.lines) assert.match(line, /skipped .*does not exist yet/)
  assert.equal(vaultChanges(f), '')

  const g = featureFixture(t, { readme: null })
  const s = features({ cwd: g.host })
  assert.equal(s.code, 0)
  assert.match(s.lines.join('\n'), /skipped 02 Features\.md/)
  assert.match(s.lines.join('\n'), /wrote Feature Map\.canvas/)
})

test('features refuses a README that breaks the marker contract and copies nothing', (t) => {
  const f = featureFixture(t, { readme: '# Feature map\n\n| a | b |\n' })
  const r = features({ cwd: f.host })
  assert.equal(r.code, 1)
  assert.match(r.lines.join('\n'), /breaks the feature-table contract.*Nothing was copied/)
  assert.equal(vaultChanges(f), '', 'not even the canvas')
})

test('features without a cloned vault says to run ensure and exits 1', (t) => {
  const f = fixture(t)
  const r = features({ cwd: f.host })
  assert.equal(r.code, 1)
  assert.match(r.lines.join('\n'), /not cloned; run node scripts\/vault\.mjs ensure first/)
})

test('from a linked worktree, features reads that worktree and writes the main checkout vault', (t) => {
  const f = featureFixture(t, { canvas: null, readme: null })
  const wt = path.join(f.tmp, 'wt')
  sh(f.host, 'worktree', 'add', '-q', '-b', 'side', wt)
  mkdirSync(path.join(wt, 'docs', 'feature-map'), { recursive: true })
  writeFileSync(path.join(wt, 'docs', 'feature-map', 'Map.canvas'), CANVAS)
  writeFileSync(path.join(wt, 'docs', 'feature-map', 'README.md'), README)
  assert.equal(features({ cwd: wt }).code, 0)
  assert.equal(read(f.vault, 'Feature Map.canvas'), CANVAS)
  assert.equal(read(f.vault, '02 Features.md'), `${FEATURES_HEADER}\n\n${TABLE}`)
})

test('the CLI runs features as a verb', (t) => {
  const f = featureFixture(t)
  const out = execFileSync(process.execPath, [path.join(REPO, 'scripts', 'vault.mjs'), 'features'], {
    cwd: f.host,
    encoding: 'utf8',
    env: cleanEnv(),
  })
  assert.match(out, /wrote Feature Map\.canvas/)
  assert.equal(read(f.vault, 'Feature Map.canvas'), CANVAS)
})
