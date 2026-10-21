#!/usr/bin/env node
// scripts/vault.mjs — the Obsidian vault's working copy (phase OV1b). Zero dependencies.
//
//   node scripts/vault.mjs ensure   # clone vault/ when missing, else fast-forward it
//   node scripts/vault.mjs status   # head commit, ahead/behind, dirty
//
// The vault is its own repo (no-trbl-2-u/miserere-vault), cloned into `vault/`
// at the MAIN checkout's root and ignored by Miserere (`/vault/`). From a linked
// worktree both verbs still act on the main checkout's `vault/`, so every
// session on the machine shares one copy with Obsidian. `ensure` never merges,
// rebases or stashes: a dirty or diverged tree is named and left for a person.
// VAULT_REMOTE overrides the clone URL (tests, forks). See docs/vault.md.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_REMOTE = 'https://github.com/no-trbl-2-u/miserere-vault.git'

// A git hook exports these for its own repo; inherited, they would point every
// call below at Miserere instead of the vault.
const HOOK_ENV = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']
export const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !HOOK_ENV.includes(k)))

/** Run git; never throws. Returns { ok, out, err }. */
export function runGit(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, env: cleanEnv() })
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() || String(r.error ?? '') }
}

/** The main checkout's root, even from a linked worktree: the parent of git's common dir. */
export function mainRoot({ cwd = process.cwd(), git = runGit } = {}) {
  const r = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd)
  if (!r.ok) throw new Error(`not inside a git checkout (${cwd}): ${r.err}`)
  return path.dirname(path.resolve(cwd, r.out))
}

export const vaultDir = (opts = {}) => path.join(mainRoot(opts), 'vault')

// `ahead behind` of HEAD against its upstream, or null when there is no upstream.
function counts(dir, git) {
  const r = git(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], dir)
  if (!r.ok) return null
  const [ahead, behind] = r.out.split(/\s+/).map(Number)
  return { ahead, behind }
}

/**
 * Clone or fast-forward the vault. Returns { code, lines } and prints nothing,
 * so tests can read the outcome; the CLI prints `lines`.
 */
export function ensure({ cwd = process.cwd(), git = runGit, remote = process.env.VAULT_REMOTE || DEFAULT_REMOTE } = {}) {
  const root = mainRoot({ cwd, git })
  const dir = path.join(root, 'vault')
  if (!existsSync(dir)) {
    const r = git(['clone', '--quiet', remote, 'vault'], root)
    if (!r.ok) {
      return {
        code: 1,
        lines: [
          `vault: clone of ${remote} into ${dir} failed:`,
          r.err,
          'In a cloud session, attach no-trbl-2-u/miserere-vault to the session first (add_repo).',
        ],
      }
    }
    return { code: 0, lines: [`vault: cloned ${remote} into ${dir}`] }
  }
  if (!existsSync(path.join(dir, '.git'))) {
    return { code: 1, lines: [`vault: ${dir} exists but is not a git clone; move it aside and run ensure again.`] }
  }
  const dirty = git(['status', '--porcelain'], dir)
  if (!dirty.ok) return { code: 1, lines: [`vault: git status failed in ${dir}:`, dirty.err] }
  if (dirty.out) {
    const n = dirty.out.split('\n').length
    return {
      code: 1,
      lines: [
        `vault: refusing to pull, the tree is dirty (${n} changed path${n === 1 ? '' : 's'}) in ${dir}.`,
        'Commit them (git -C vault commit -am "vault: <summary>") or let Obsidian Git commit, then run ensure again.',
      ],
    }
  }
  const fetch = git(['fetch', '--quiet'], dir)
  if (!fetch.ok) return { code: 1, lines: [`vault: git fetch failed in ${dir}:`, fetch.err] }
  const c = counts(dir, git)
  if (!c) return { code: 1, lines: [`vault: the current branch in ${dir} has no upstream; nothing to pull.`] }
  if (c.ahead > 0 && c.behind > 0) {
    return {
      code: 1,
      lines: [
        `vault: refusing to pull, the branch has diverged (ahead ${c.ahead}, behind ${c.behind}) in ${dir}.`,
        'Resolve it by hand; ensure never merges or rebases.',
      ],
    }
  }
  if (c.behind > 0) {
    const pull = git(['pull', '--ff-only', '--quiet'], dir)
    if (!pull.ok) return { code: 1, lines: [`vault: git pull --ff-only failed in ${dir}:`, pull.err] }
    return { code: 0, lines: [`vault: fast-forwarded ${c.behind} commit${c.behind === 1 ? '' : 's'} in ${dir}`] }
  }
  if (c.ahead > 0) return { code: 0, lines: [`vault: up to date, ahead ${c.ahead} (push when ready) in ${dir}`] }
  return { code: 0, lines: [`vault: up to date in ${dir}`] }
}

/** Head commit, ahead/behind against the last-fetched upstream, dirty. Always code 0. */
export function status({ cwd = process.cwd(), git = runGit } = {}) {
  const dir = path.join(mainRoot({ cwd, git }), 'vault')
  if (!existsSync(path.join(dir, '.git'))) {
    return { code: 0, lines: [`vault: ${dir}`, 'head: none (not cloned; run node scripts/vault.mjs ensure)'] }
  }
  const head = git(['log', '-1', '--format=%h %s'], dir)
  const c = counts(dir, git)
  const dirty = git(['status', '--porcelain'], dir)
  return {
    code: 0,
    lines: [
      `vault: ${dir}`,
      `head: ${head.ok && head.out ? head.out : 'none'}`,
      c ? `upstream: ahead ${c.ahead}, behind ${c.behind} (as of the last fetch)` : 'upstream: none',
      `dirty: ${dirty.ok && dirty.out ? 'yes' : 'no'}`,
    ],
  }
}

export function main(argv = process.argv.slice(2)) {
  const verb = argv[0]
  const run = { ensure, status }[verb]
  if (!run) {
    console.error('usage: node scripts/vault.mjs ensure|status')
    return 2
  }
  let result
  try {
    result = run()
  } catch (e) {
    result = { code: 1, lines: [`vault: ${e.message}`] }
  }
  const print = result.code === 0 ? console.log : console.error
  for (const line of result.lines) if (line) print(line)
  return result.code
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) process.exitCode = main()
