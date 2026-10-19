// axiomancer-mobile/scripts/potential-assets-sealed.test.mjs
//
// `Potential Assets/` is the reference trove: candidate art, licensed packs and
// extracted material that the GAME MUST NEVER SHIP. T's standing rule is that
// the engine never references it and it never enters a build. Until now that
// rule was true only by discipline — nothing checked it — which is exactly how
// a tracked 400MB directory ends up inside an APK after one careless import.
//
// What is allowed: nothing, currently. Build-time TOOLING may read the trove
// — that is the point of a trove — but as of the 2026-10-19 unhooking no script
// does: `extract-game-icons.mjs` takes its library root as an argument, so the
// repo no longer knows where the icon archive lives. The allowance list stays
// so that the next tool to want the trove has to justify itself in writing
// rather than slip in.
//
// What is forbidden: any module the bundler can reach resolving a path into the
// trove, and anything that would drop the exclusion from the build context.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(MOBILE, '..')
const TROVE = 'Potential Assets'

/** Directories Metro can reach from the app entry. */
const BUNDLED = ['app', 'components', 'state', 'lib', 'assets', 'hooks', 'constants']

/** Build-time tooling permitted to read the trove, each with its reason. */
const TOOLING_ALLOWED = new Map([])

/** A reference that actually resolves a path, as opposed to naming it in prose. */
const RESOLVES = /(?:require|import|readFileSync|readdirSync|createReadStream|join|resolve)\s*\([^)]*Potential Assets/

function sourceFiles(dir) {
  const root = path.join(MOBILE, dir)
  if (!fs.existsSync(root)) return []
  const out = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue
    const p = path.join(entry.parentPath ?? entry.path, entry.name)
    if (p.includes('__tests__') || /\.test\.[a-z]+$/.test(entry.name)) continue
    out.push(p)
  }
  return out
}

test('no bundled module resolves a path into Potential Assets', () => {
  const offenders = []
  for (const dir of BUNDLED) {
    for (const file of sourceFiles(dir)) {
      const text = fs.readFileSync(file, 'utf-8')
      if (RESOLVES.test(text)) offenders.push(path.relative(REPO, file).replace(/\\/g, '/'))
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these ship in the bundle and resolve a path into "${TROVE}". Copy the asset into ` +
      'assets/images/ and record it in that directory\'s provenance.json instead',
  )
})

test('the build context still excludes Potential Assets', () => {
  const easignore = path.join(REPO, '.easignore')
  assert.ok(fs.existsSync(easignore), '.easignore is missing, so an EAS build would upload the trove')
  const lines = fs.readFileSync(easignore, 'utf-8').split(/\r?\n/).map((l) => l.trim())
  assert.ok(
    lines.includes(`/${TROVE}/`) || lines.includes(`${TROVE}/`),
    `.easignore no longer excludes "${TROVE}/": an EAS build would upload every byte of it`,
  )
})

test('only the named build-time tooling reads the trove, and its reason still holds', () => {
  const scripts = sourceFiles('scripts')
  const readers = scripts
    .filter((f) => RESOLVES.test(fs.readFileSync(f, 'utf-8')))
    .map((f) => path.relative(MOBILE, f).replace(/\\/g, '/'))
  const unexpected = readers.filter((r) => !TOOLING_ALLOWED.has(r))
  assert.deepEqual(
    unexpected,
    [],
    'new tooling reads the trove. That is allowed, but add it to TOOLING_ALLOWED with the ' +
      'reason its output is safe to ship, so the allowance stays a list rather than a habit',
  )
  // An allowance that no longer applies is worse than none: it excuses a file
  // that may since have changed shape.
  for (const [rel] of TOOLING_ALLOWED) {
    assert.ok(
      fs.existsSync(path.join(MOBILE, rel)),
      `TOOLING_ALLOWED names ${rel}, which no longer exists — drop the stale allowance`,
    )
  }
})

test('the generated icon geometry is checked in, so the library is not needed at runtime', () => {
  const generated = path.join(MOBILE, 'components', 'icons', 'game-icon-paths.ts')
  assert.ok(
    fs.existsSync(generated),
    'game-icon-paths.ts is missing: without it the app would have to read the icon library at runtime',
  )
  const text = fs.readFileSync(generated, 'utf-8')
  assert.ok(!RESOLVES.test(text), 'the generated file resolves a trove path instead of inlining geometry')
})
