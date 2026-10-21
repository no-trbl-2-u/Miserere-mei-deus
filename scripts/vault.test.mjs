// scripts/vault.test.mjs — the vault working copy (phase OV1b, A3 and A4).
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
import { cleanEnv, ensure, mainRoot, status } from './vault.mjs'

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
  t.after(() => rmSync(tmp, { recursive: true, force: true }))
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
