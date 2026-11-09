// Guards the footgun scratchpad-script-no-resolve: the pre-bash rule blocks
// `node <script>` when the script imports a package no node_modules above it holds.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { findScratchpadTrap, packageOf, resolvableFrom } from './scratchpad-resolve.mjs'

const guard = fileURLToPath(new URL('./guard.mjs', import.meta.url))
const NO_PATH = { NODE_PATH: '' }

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'scratch-resolve-'))
}

function write(dir, name, body) {
  const f = path.join(dir, name)
  fs.writeFileSync(f, body)
  return f
}

test('packageOf names bare packages only', () => {
  assert.equal(packageOf('sharp'), 'sharp')
  assert.equal(packageOf('playwright/test'), 'playwright')
  assert.equal(packageOf('@scope/pkg/deep'), '@scope/pkg')
  for (const s of ['node:fs', 'fs', 'fs/promises', './a.mjs', '../a', '/abs/a.mjs', 'file:///x/y.mjs', '#internal', 'C:\\a.mjs']) {
    assert.equal(packageOf(s), null, s)
  }
})

test('a scratchpad script importing a repo package is flagged', () => {
  const dir = tmp()
  const f = write(dir, 'shot.mjs', "import sharp from 'sharp'\nimport fs from 'node:fs'\n")
  const hit = findScratchpadTrap(`node ${f}`, dir, NO_PATH)
  assert.deepEqual(hit?.missing, ['sharp'])
  assert.equal(hit?.file, f)
})

test('each import form is seen: dynamic, require, side-effect, re-export', () => {
  const dir = tmp()
  const f = write(
    dir,
    'forms.cjs',
    "const a = require('alpha')\nawait import(\"beta/sub\")\nimport 'gamma'\nexport { x } from '@d/e'\n",
  )
  const hit = findScratchpadTrap(`cd x && node --no-warnings ${f} arg`, dir, NO_PATH)
  assert.deepEqual(hit?.missing.sort(), ['@d/e', 'alpha', 'beta', 'gamma'])
})

test('a package held by a node_modules above the script is allowed', () => {
  const dir = tmp()
  fs.mkdirSync(path.join(dir, 'node_modules', 'sharp'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'sub'))
  const f = write(path.join(dir, 'sub'), 'ok.mjs', "import sharp from 'sharp'\n")
  assert.equal(findScratchpadTrap(`node ${f}`, dir, NO_PATH), null)
  assert.ok(resolvableFrom(path.join(dir, 'sub'), 'sharp', NO_PATH))
})

test('built-ins, relative, absolute and file:// imports are allowed', () => {
  const dir = tmp()
  const f = write(
    dir,
    'fine.mjs',
    "import fs from 'node:fs'\nimport p from 'path'\nimport a from './a.mjs'\nconst s = await import('file:///repo/node_modules/sharp/lib/index.js')\n",
  )
  assert.equal(findScratchpadTrap(`node ${f}`, dir, NO_PATH), null)
})

test('a relative script path resolves against the cwd; a missing file or non-node command is allowed', () => {
  const dir = tmp()
  write(dir, 'rel.mjs', "import 'playwright'\n")
  assert.deepEqual(findScratchpadTrap('node rel.mjs', dir, NO_PATH)?.missing, ['playwright'])
  assert.equal(findScratchpadTrap('node nope.mjs', dir, NO_PATH), null)
  assert.equal(findScratchpadTrap('echo node rel.mjs', dir, NO_PATH), null)
  assert.equal(findScratchpadTrap('git commit -m "run node rel.mjs"', dir, NO_PATH), null)
})

test('NODE_PATH counts as a place a package resolves from', () => {
  const dir = tmp()
  const lib = tmp()
  fs.mkdirSync(path.join(lib, 'sharp'))
  const f = write(dir, 'np.mjs', "import 'sharp'\n")
  assert.equal(findScratchpadTrap(`node ${f}`, dir, { NODE_PATH: lib }), null)
})

test('guard pre-bash exits 2 with the footgun named, and 0 for a clean script', () => {
  const dir = tmp()
  const bad = write(dir, 'bad.mjs', "import 'sharp-not-installed-anywhere'\n")
  const good = write(dir, 'good.mjs', "import fs from 'node:fs'\n")
  const run = (command) =>
    spawnSync(process.execPath, [guard, 'pre-bash'], {
      input: JSON.stringify({ tool_input: { command } }),
      encoding: 'utf-8',
      env: { ...process.env, NODE_PATH: '' },
    })
  const blocked = run(`node ${bad}`)
  assert.equal(blocked.status, 2)
  assert.match(blocked.stderr, /scratchpad-script-no-resolve/)
  assert.equal(run(`node ${good}`).status, 0)
})
