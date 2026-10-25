#!/usr/bin/env node
// scripts/vault.mjs — the Obsidian vault's working copy (phase OV1b). Zero dependencies.
//
//   node scripts/vault.mjs ensure   # clone vault/ when missing, else fast-forward it
//   node scripts/vault.mjs status   # head commit, ahead/behind, dirty
//   node scripts/vault.mjs features # copy the repo's feature map into the vault (FM1e, FM2c)
//
// The vault is its own repo (no-trbl-2-u/miserere-vault), cloned into `vault/`
// at the MAIN checkout's root and ignored by Miserere (`/vault/`). From a linked
// worktree both verbs still act on the main checkout's `vault/`, so every
// session on the machine shares one copy with Obsidian. `ensure` never merges,
// rebases or stashes: a dirty or diverged tree is named and left for a person.
// VAULT_REMOTE overrides the clone URL (tests, forks). See docs/vault.md.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { isGeneratedNote, isGroupCanvas, NOTES_DIR } from './feature-map-render.mjs'

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

// The feature map (phases FM1e, FM2c). The repo generates docs/feature-map/ (FM1c,
// FM2a, FM2b); `features` copies it into the vault and overwrites nothing else:
//   docs/feature-map/Map.canvas -> vault/Feature Map.canvas   (byte for byte)
//   docs/feature-map/README.md  -> vault/02 Features.md       (the feature table)
//   docs/feature-map/Features/  -> vault/Features/            (mirrored, below)
// The Features/ mirror writes new and changed files and leaves matching ones
// alone. A file in vault/Features/ the repo no longer has is deleted only when
// the generator owns it: a note whose frontmatter carries `generated:
// feature-map`, or a group canvas (named for a feature group, or holding the
// generator's `group:<id>` node with every card opening a Features/ file).
// Anything else there is left and named, so a note T drops in survives.
// CONTRACT with the generator: README.md holds the feature table between two
// marker lines, each exactly once and on a line of its own, start before end:
//   <!-- feature-table:start -->
//   <!-- feature-table:end -->
// 02 Features.md is FEATURES_HEADER, a blank line, then the lines between the
// markers verbatim. A missing source file is skipped with a message (exit 0:
// the map is not generated yet); a README without well-formed markers breaks
// the contract (exit 1) and nothing is written. See docs/vault.md.
export const FEATURE_MAP_DIR = path.join('docs', 'feature-map')
export const TABLE_START = '<!-- feature-table:start -->'
export const TABLE_END = '<!-- feature-table:end -->'
export const FEATURES_HEADER = "Generated from the repo's feature map (docs/feature-map/README.md); do not edit, /vault overwrites this file."
export const FEATURE_FILES = [
  { from: 'Map.canvas', to: 'Feature Map.canvas' },
  { from: 'README.md', to: '02 Features.md' },
]

/** The lines between the feature-table markers, verbatim; throws when the markers are not well formed. */
export function featureTable(readme) {
  const lines = readme.split('\n')
  const at = (marker) => lines.flatMap((l, i) => (l.replace(/\r$/, '') === marker ? [i] : []))
  const starts = at(TABLE_START)
  const ends = at(TABLE_END)
  if (starts.length !== 1 || ends.length !== 1 || starts[0] > ends[0]) {
    throw new Error(
      `expected ${TABLE_START} and ${TABLE_END} once each, on lines of their own, start first (found ${starts.length} start, ${ends.length} end)`,
    )
  }
  return lines.slice(starts[0] + 1, ends[0]).join('\n')
}

/** 02 Features.md's body for a README: the header, a blank line, the table. */
export function featuresNote(readme) {
  const table = featureTable(readme)
  return `${FEATURES_HEADER}\n\n${table}${table.endsWith('\n') ? '' : '\n'}`
}

export const FEATURES_DIR = 'Features'

/** Whether a canvas in vault/Features/ is a group canvas the generator wrote. */
export function isGeneratedCanvas(name, text) {
  if (isGroupCanvas(`${NOTES_DIR}/${name}`)) return true
  let canvas
  try {
    canvas = JSON.parse(text)
  } catch {
    return false
  }
  const nodes = Array.isArray(canvas?.nodes) ? canvas.nodes : []
  const files = nodes.filter((n) => n?.type === 'file')
  return (
    nodes.some((n) => n?.type === 'group' && typeof n.id === 'string' && n.id.startsWith('group:')) &&
    files.length > 0 &&
    files.every((n) => typeof n.file === 'string' && n.file.startsWith(`${FEATURES_DIR}/`))
  )
}

/** Whether the generator owns a file in vault/Features/, so the mirror may delete it. */
export function isGeneratedFeatureFile(name, data) {
  const text = data.toString('utf8')
  if (name.endsWith('.md')) return isGeneratedNote(text)
  if (name.endsWith('.canvas')) return isGeneratedCanvas(name, text)
  return false
}

const filesIn = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => statSync(path.join(dir, f)).isFile()).sort() : [])

/**
 * Mirror docs/feature-map/Features/ into vault/Features/: write new and changed
 * files, leave matching ones, delete only stale files the generator owns.
 * Returns the report lines.
 */
export function mirrorFeatures(srcDir, vault) {
  const src = path.join(srcDir, FEATURES_DIR)
  const dest = path.join(vault, FEATURES_DIR)
  if (!existsSync(src)) return [`vault: skipped ${FEATURES_DIR}/: ${src} does not exist yet (the feature map is not generated).`]
  const lines = []
  const names = filesIn(src)
  let same = 0
  mkdirSync(dest, { recursive: true })
  for (const name of names) {
    const data = readFileSync(path.join(src, name))
    const to = path.join(dest, name)
    if (existsSync(to) && readFileSync(to).equals(data)) {
      same += 1
      continue
    }
    writeFileSync(to, data)
    lines.push(`vault: wrote ${FEATURES_DIR}/${name}`)
  }
  const kept = new Set(names)
  for (const name of filesIn(dest).filter((f) => !kept.has(f))) {
    const p = path.join(dest, name)
    if (isGeneratedFeatureFile(name, readFileSync(p))) {
      unlinkSync(p)
      lines.push(`vault: deleted ${FEATURES_DIR}/${name}, the repo no longer generates it`)
    } else lines.push(`vault: left ${FEATURES_DIR}/${name}, not a generated feature-map file`)
  }
  lines.push(`vault: ${FEATURES_DIR}/ mirrors ${names.length} file${names.length === 1 ? '' : 's'} (${same} already up to date)`)
  return lines
}

/**
 * Copy the feature map from this checkout into the main checkout's vault/.
 * The source is the checkout `cwd` is in (a worktree reads its own docs/);
 * the vault is the shared one `ensure` keeps. Returns { code, lines }.
 */
export function features({ cwd = process.cwd(), git = runGit } = {}) {
  const top = git(['rev-parse', '--show-toplevel'], cwd)
  if (!top.ok) throw new Error(`not inside a git checkout (${cwd}): ${top.err}`)
  const srcDir = path.join(path.resolve(cwd, top.out), FEATURE_MAP_DIR)
  const dir = path.join(mainRoot({ cwd, git }), 'vault')
  if (!existsSync(path.join(dir, '.git'))) {
    return { code: 1, lines: [`vault: ${dir} is not cloned; run node scripts/vault.mjs ensure first.`] }
  }
  // Read and check every source before writing, so a broken README leaves the vault untouched.
  const writes = []
  const lines = []
  for (const { from, to } of FEATURE_FILES) {
    const src = path.join(srcDir, from)
    if (!existsSync(src)) {
      lines.push(`vault: skipped ${to}: ${src} does not exist yet (the feature map is not generated).`)
      continue
    }
    if (from !== 'README.md') {
      writes.push({ to, data: readFileSync(src) })
      continue
    }
    try {
      writes.push({ to, data: Buffer.from(featuresNote(readFileSync(src, 'utf8')), 'utf8') })
    } catch (e) {
      return { code: 1, lines: [`vault: ${src} breaks the feature-table contract: ${e.message}. Nothing was copied.`] }
    }
  }
  for (const { to, data } of writes) {
    const dest = path.join(dir, to)
    if (existsSync(dest) && readFileSync(dest).equals(data)) {
      lines.push(`vault: ${to} is up to date`)
      continue
    }
    writeFileSync(dest, data)
    lines.push(`vault: wrote ${to}`)
  }
  lines.push(...mirrorFeatures(srcDir, dir))
  return { code: 0, lines }
}

export function main(argv = process.argv.slice(2)) {
  const verb = argv[0]
  const run = { ensure, status, features }[verb]
  if (!run) {
    console.error('usage: node scripts/vault.mjs ensure|status|features')
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
