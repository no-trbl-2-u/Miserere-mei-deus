// scripts/art-department-sealed.test.mjs
//
// `art-department/` is the top-level tree for tooling that makes art and the
// build-time masters it makes. Two constraints are what make T's any-language
// ruling safe to grant: NOTHING IN THE TREE IS IMPORTED BY THE APP, and
// NOTHING IN IT SHIPS. D98 records why the tree is deliberately not an npm
// workspace -- `.easignore`'s keep-list says `npm ci` resolves every declared
// workspace, so a declared workspace must be uploaded to EAS, and this tree
// exists partly to hold masters that must never reach a build.
//
// Until this file landed those constraints were true only by discipline. The
// repo already learned on `Potential Assets/` (AGENTS.md rule 9) that a
// boundary nobody checks is a boundary that leaks, so this guard mirrors
// `axiomancer-mobile/scripts/potential-assets-sealed.test.mjs`.
//
// What is ALLOWED, and must stay allowed -- the repo is supposed to know the
// tree exists:
//   - `.easignore`, AGENTS.md, `plan/` briefs and bearings naming it in prose;
//   - the root `art:doctor` / `art:test` / `art:rig` scripts, which reach the
//     tree BY PATH -- that is the sanctioned access D98 prescribes;
//   - `.github/workflows/verify-art-department.yml`, which owns the path;
//   - the tree's own tools reading and writing their own tree, and reading a
//     shipped painting out of `axiomancer-mobile/assets/` as a source. That is
//     inside-out, and inside-out is the direction the work flows.
//
// What is FORBIDDEN: any file outside the tree RESOLVING a path into it, the
// tree becoming a declared workspace, the root scripts reaching it through
// `npm --workspace`, the `.easignore` exclusion going away, and a spritesheet
// master reappearing under the app's bundled `assets/` tree.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TREE = 'art-department'
const MOBILE = path.join(REPO, 'axiomancer-mobile')
const SELF = 'scripts/art-department-sealed.test.mjs'

/** Directories Metro can reach from the app entry. */
const BUNDLED = ['app', 'components', 'state', 'lib', 'assets', 'hooks', 'constants', 'theme']

/**
 * Files outside the tree permitted to resolve a path into it, each with its
 * reason. Empty on purpose: D98's whole claim is that nothing does.
 */
const RESOLVERS_ALLOWED = new Map([])

/** Workflows permitted to name the tree, each with its reason. */
const WORKFLOWS_ALLOWED = new Map([
  ['verify-art-department.yml', 'owns the path: it is the verify lane for changes under the tree'],
])

/** Root scripts that reach the tree, each with its reason. They must reach it by path. */
const ROOT_SCRIPTS_ALLOWED = new Map([
  ['art:doctor', 'reports unsatisfied Python dependencies by name'],
  ['art:test', "runs the tree's own suite"],
  ['art:rig', 'runs the spritesheet rig'],
])

/**
 * The tree named as a PATH SEGMENT. The lookbehind keeps
 * `verify-art-department.yml` out, and the lookahead keeps
 * `art-department-sealed.test.mjs` out: both name a file, not this directory.
 */
const TREE_PATH = /(?<![\w-])art-department(?![\w.-])/

/**
 * Executable code, where naming the tree outside a comment means reaching into
 * it at run time. Enumerating call shapes was the first attempt and it leaked:
 * a bare `[^)]*` run cannot cross a nested call's `)`, so
 * `join(baseDir(), 'art-department/x')` slipped through, and a dynamic
 * `import('art-department/x')` matched neither the call list nor the
 * `from '...'` form. The question is not which function is called -- it is
 * whether running code names the tree at all.
 *
 * JSON and YAML are deliberately NOT scanned this way: they execute nothing,
 * and their two legitimate mentions (the root `art:*` scripts and
 * `verify-art-department.yml`) have dedicated allowlisted assertions below,
 * which fail on any mention that is not on the list.
 */
const SCANNED_CODE = /\.(ts|tsx|js|jsx|mjs|cjs|py|sh)$/

/** True when the tree reference at `index` sits inside a comment on that line. */
function inComment(line, index) {
  const before = line.slice(0, index)
  return /\/\/|\/\*|^\s*\*|#/.test(before)
}

/**
 * Every line of `text` that names the tree as a path outside a comment, as
 * `{ line, text }` (1-based). Prose about the boundary is free; code is not.
 */
export function treeReferenceLines(text) {
  const out = []
  text.split(/\r?\n/).forEach((line, i) => {
    const m = TREE_PATH.exec(line)
    if (!m) return
    if (inComment(line, m.index)) return
    out.push({ line: i + 1, text: line.trim() })
  })
  return out
}

/** The offending repo-relative paths among `files`, each `{ abs, rel }`. */
function scanForReferences(files) {
  const offenders = []
  for (const { abs, rel } of files) {
    if (!fs.existsSync(abs)) continue
    const hits = treeReferenceLines(fs.readFileSync(abs, 'utf-8'))
    if (hits.length) offenders.push(`${rel}:${hits[0].line}`)
  }
  return offenders
}

function sourceFiles(dir) {
  const root = path.join(MOBILE, dir)
  if (!fs.existsSync(root)) return []
  const out = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue
    if (!SCANNED_CODE.test(entry.name)) continue
    const abs = path.join(entry.parentPath ?? entry.path, entry.name)
    out.push({ abs, rel: path.relative(REPO, abs).replace(/\\/g, '/') })
  }
  return out
}

/** Every tracked file in the repo, as repo-relative POSIX paths. */
function trackedFiles(...args) {
  return execFileSync('git', ['-C', REPO, 'ls-files', ...args], { encoding: 'utf-8' })
    .split(/\r?\n/)
    .filter(Boolean)
}

test('the detector tells code reaching into the tree from prose about it', () => {
  // A sealing guard passes on a clean tree by construction, so the thing worth
  // proving is that it can fail at all, and on the right inputs. These are the
  // shapes that have to be caught -- including the two an earlier call-shape
  // regex let through -- and the mentions that must stay legal.
  const caught = [
    "import sheet from '../../../art-department/masters/enemies/float-eye.sheet.png'",
    "const mod = await import('art-department/tools/index.mjs')",
    "import('art-department/tools/index.mjs').then((m) => m.run())",
    "require('../art-department/tools/x.js')",
    "const p = path.join(baseDir(), 'art-department', 'masters')",
    "fs.readFileSync(`${root}/art-department/masters/a.json`)",
    "ASSET_ROOTS.push(resolve(__dirname, '..', 'art-department'))",
    'SHEET = Path("art-department") / "masters"',
  ]
  const ignored = [
    '// the masters live in art-department/, and nothing may resolve a path into that tree',
    " * lives under the art-department tree, and nothing here may resolve a path into it",
    '# the rig writes into art-department/masters/ -- its own tree',
    "const WORKFLOWS = ['verify-art-department.yml', 'verify-drift.yml']",
    "const guard = 'scripts/art-department-sealed.test.mjs'",
  ]
  for (const line of caught) {
    assert.equal(treeReferenceLines(line).length, 1, `missed an inward reference: ${line}`)
  }
  for (const line of ignored) {
    assert.deepEqual(treeReferenceLines(line), [], `fired on a legitimate mention: ${line}`)
  }
})

test('the repo-wide scan reports a file that breaks the rule', () => {
  // The detector table above proves the matcher; this proves the scan that
  // uses it, against a file on disk, so neither half can rot unnoticed.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'art-dept-guard-'))
  try {
    const clean = path.join(dir, 'clean.mjs')
    const dirty = path.join(dir, 'dirty.mjs')
    fs.writeFileSync(clean, '// art-department/ is named here in prose only\nexport const x = 1\n')
    fs.writeFileSync(dirty, "export const sheet = require('../art-department/masters/enemies/a.png')\n")
    assert.deepEqual(scanForReferences([{ abs: clean, rel: 'clean.mjs' }]), [])
    assert.deepEqual(scanForReferences([{ abs: dirty, rel: 'dirty.mjs' }]), ['dirty.mjs:1'])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('no bundled module resolves a path into art-department', () => {
  const offenders = scanForReferences(BUNDLED.flatMap((dir) => sourceFiles(dir)))
  assert.deepEqual(
    offenders,
    [],
    `these ship in the app bundle and resolve a path into "${TREE}/". The tree holds ` +
      'build-time masters that must never reach a build: have the tool there emit what ' +
      'ships into axiomancer-mobile/assets/ and record it in that directory\'s provenance.json (D98)',
  )
})

test('no tracked file outside the tree resolves a path into it', () => {
  // The scan above covers the mobile bundle. D98's law is repo-wide: mechanics,
  // backend, root scripts, workflows and config may not reach in either. The
  // tree's own files are exempt -- a tool reading and writing its own tree, and
  // reading a shipped painting as its source, is inside-out, not outside-in.
  const files = trackedFiles()
    .filter((rel) => SCANNED_CODE.test(rel))
    .filter((rel) => rel !== SELF)
    .filter((rel) => rel !== TREE && !rel.startsWith(`${TREE}/`))
    .filter((rel) => !RESOLVERS_ALLOWED.has(rel))
    .map((rel) => ({ abs: path.join(REPO, rel), rel }))
  const offenders = scanForReferences(files)
  assert.deepEqual(
    offenders,
    [],
    `these resolve a path into "${TREE}/". Naming the tree in prose, in a CI path filter or ` +
      'in a script that invokes a tool by path is fine; resolving a file out of it is not. ' +
      'If a reader genuinely must, add it to RESOLVERS_ALLOWED with the reason (D98)',
  )
  for (const [rel] of RESOLVERS_ALLOWED) {
    assert.ok(
      fs.existsSync(path.join(REPO, rel)),
      `RESOLVERS_ALLOWED names ${rel}, which no longer exists -- drop the stale allowance`,
    )
  }
})

test('the mobile build config does not know the tree exists', () => {
  // metro.config.js and app.config.ts decide what the bundler can reach and
  // what the build uploads. A mention here is a leak even without a resolve
  // call -- an extra watchFolder or asset root is enough.
  for (const rel of ['metro.config.js', 'app.config.ts', 'app.json', 'eas.json', 'babel.config.js']) {
    const abs = path.join(MOBILE, rel)
    if (!fs.existsSync(abs)) continue
    assert.ok(
      !fs.readFileSync(abs, 'utf-8').includes(TREE),
      `axiomancer-mobile/${rel} names "${TREE}". The build config is how the tree would ` +
        'become reachable from the bundle; keep it out (D98)',
    )
  }
})

test('the build context still excludes art-department', () => {
  const easignore = path.join(REPO, '.easignore')
  assert.ok(fs.existsSync(easignore), '.easignore is missing, so an EAS build would upload the masters')
  const lines = fs.readFileSync(easignore, 'utf-8').split(/\r?\n/).map((l) => l.trim())
  assert.ok(
    lines.includes(`/${TREE}/`) || lines.includes(`${TREE}/`),
    `.easignore no longer excludes "${TREE}/": an EAS build would upload every master byte in it`,
  )
})

test('the tree is not a declared npm workspace, and the root scripts reach it by path', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf-8'))
  assert.ok(
    !(pkg.workspaces ?? []).some((w) => w === TREE || w.startsWith(`${TREE}/`)),
    `"${TREE}" is declared in root workspaces. npm ci resolves every declared workspace, which ` +
      'is exactly why .easignore\'s keep-list cannot exclude one -- declaring this tree would ' +
      'force EAS to upload the masters it exists to keep out (D98)',
  )
  const scripts = pkg.scripts ?? {}
  for (const [name, command] of Object.entries(scripts)) {
    // `art-department/` the directory, not `art-department-sealed.test.mjs`
    // the file this root `test` script happens to run.
    if (!command.includes(`${TREE}/`)) continue
    assert.ok(
      ROOT_SCRIPTS_ALLOWED.has(name),
      `root script "${name}" reaches ${TREE}/. That is allowed, but add it to ` +
        'ROOT_SCRIPTS_ALLOWED with its reason so the access stays a list rather than a habit',
    )
    assert.ok(
      !/(?:--workspace|\s-w\s)/.test(command),
      `root script "${name}" reaches ${TREE}/ through npm --workspace. The tree is reached by ` +
        'path precisely because it is not a workspace (D98)',
    )
  }
  for (const [name] of ROOT_SCRIPTS_ALLOWED) {
    assert.ok(
      Object.hasOwn(scripts, name),
      `ROOT_SCRIPTS_ALLOWED names "${name}", which is no longer a root script -- drop the stale entry`,
    )
  }
})

test('this guard itself is wired into the root test suite', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf-8'))
  assert.ok(
    (pkg.scripts?.test ?? '').includes(SELF),
    `package.json's "test" script does not run ${SELF} -- the guard would exist but npm test ` +
      'would never execute it, so the boundary would be a file, not a check (A7)',
  )
})

test('only the workflow that owns the path names the tree', () => {
  const dir = path.join(REPO, '.github', 'workflows')
  const offenders = fs
    .readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .filter((f) => !WORKFLOWS_ALLOWED.has(f))
    .filter((f) => fs.readFileSync(path.join(dir, f), 'utf-8').includes(TREE))
  assert.deepEqual(
    offenders,
    [],
    `these workflows name "${TREE}". verify-art-department.yml owns this path; another lane ` +
      'touching it either duplicates that gate or installs the tree into a build. Add it to ' +
      'WORKFLOWS_ALLOWED with its reason if it genuinely must',
  )
  for (const [file] of WORKFLOWS_ALLOWED) {
    assert.ok(
      fs.existsSync(path.join(dir, file)),
      `WORKFLOWS_ALLOWED names ${file}, which no longer exists -- drop the stale allowance`,
    )
  }
})

test('the masters live in the tree, not under the app assets', () => {
  // A6: the four files committed in 18b5a9df3 under
  // axiomancer-mobile/assets/images/enemies/anim/ belong here. Per-cell frames
  // that a later phase emits into assets/ DO ship and are fine; a grid master
  // is the thing that must not come back.
  const masters = ['float-eye.sheet.png', 'float-eye.sheet.webp', 'float-eye.sheet.json', 'float-eye.preview.webp']
  for (const name of masters) {
    assert.ok(
      fs.existsSync(path.join(REPO, TREE, 'masters', 'enemies', name)),
      `${TREE}/masters/enemies/${name} is missing: it is the regeneration source of truth the ` +
        "rig's byte-for-byte test compares against",
    )
  }
  assert.ok(
    fs.existsSync(path.join(REPO, TREE, 'masters', 'enemies', 'provenance.json')),
    'the masters carry no provenance record; every art directory in this repo has one',
  )
  const strays = trackedFiles('--', 'axiomancer-mobile/assets').filter((rel) => /\.sheet\.(png|webp|json)$/.test(rel))
  assert.deepEqual(
    strays,
    [],
    `these spritesheet masters are tracked under the app's bundled assets tree. Masters live in ` +
      `${TREE}/masters/; what ships is the per-cell output a phase deliberately copies into assets/ (A6)`,
  )
})
