// Pins the shape of .github/workflows/backend-deploy.yml (phase BE1b): what
// triggers it, that it deploys only from main, that the Cloudflare and Worker
// secrets reach only the steps that use them (never `npm ci`), and that it
// migrates, deploys, then sets the Worker secret, in that order. Also pins the
// real D1 database id in backend/wrangler.toml.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const workflow = readFileSync(new URL('.github/workflows/backend-deploy.yml', root), 'utf8').replace(/\r\n/g, '\n')
// Comments out: a name that only a comment mentions is not a secret the Worker declares.
const wranglerRaw = readFileSync(new URL('backend/wrangler.toml', root), 'utf8').replace(/\r\n/g, '\n')
const wrangler = wranglerRaw.replace(/^\s*#.*$/gm, '').replace(/\s+#.*$/gm, '')

const SECRET_REF = /\$\{\{\s*secrets\.(\w+)\s*\}\}/g

/** The text before `steps:` (triggers, job header) and one block per step, keyed by its name. */
function parse(text) {
  const at = text.indexOf('\n    steps:\n')
  assert.ok(at > 0, 'the deploy job has a steps list')
  const head = text.slice(0, at)
  const steps = text
    .slice(at)
    .split(/\n(?=      - name: )/)
    .slice(1)
    .map((block) => ({ name: block.match(/^      - name: (.+)$/m)[1].trim(), block }))
  return { head, steps }
}

const { head, steps } = parse(workflow)
const step = (pattern) => {
  const found = steps.filter((s) => pattern.test(s.block))
  assert.equal(found.length, 1, `exactly one step matches ${pattern}`)
  return found[0]
}
const secretsIn = (text) => [...text.matchAll(SECRET_REF)].map((m) => m[1]).sort()

test('it runs on a push to main touching backend/**, and by hand', () => {
  assert.match(head, /\n  push:\n    branches: \[main\]\n    paths:\n(?:      - .+\n)*      - 'backend\/\*\*'\n/)
  assert.match(head, /\n  workflow_dispatch:\n/)
  assert.doesNotMatch(head, /pull_request/, 'a PR never deploys')
})

test('it also deploys on every mechanics file the Worker bundles (BUG1b)', () => {
  const paths = [...head.matchAll(/^      - '([^']+)'$/gm)].map((m) => m[1])
  const bundled = new Set()
  for (const file of readdirSync(new URL('backend/src/', root)).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(new URL(`backend/src/${file}`, root), 'utf8')
    for (const m of text.matchAll(/from '(?:\.\.\/)+axiomancer-mechanics\/src\/([^']+)'/g)) {
      bundled.add(`axiomancer-mechanics/src/${m[1]}.ts`)
    }
  }
  assert.ok(bundled.has('axiomancer-mechanics/src/Combat/combat.play-log-contract.ts'), 'the play-log contract is bundled')
  assert.ok(bundled.has('axiomancer-mechanics/src/World/Hazard/puzzle/hazard-puzzle.attempt-contract.ts'), 'the attempt contract is bundled')
  for (const file of bundled) assert.ok(paths.includes(file), `${file} is bundled by the Worker but is not a deploy trigger path`)
  for (const p of paths.filter((p) => p.startsWith('axiomancer-mechanics/'))) {
    assert.ok(bundled.has(p), `${p} is a deploy trigger but the Worker does not import it`)
  }
})

test('the job deploys only from main, so a dispatch on another branch does nothing', () => {
  assert.match(head, /\n    if: github\.ref == 'refs\/heads\/main'\n/)
})

test('no secret is set at workflow or job level', () => {
  assert.deepEqual(secretsIn(head), [])
})

test('npm ci sees no secret', () => {
  const install = step(/run: npm ci\b/)
  assert.deepEqual(secretsIn(install.block), [])
  assert.doesNotMatch(install.block, /\n        env:/)
})

test('it migrates, deploys, then sets the Worker secret, each with the Cloudflare credentials', () => {
  const migrate = step(/npx wrangler d1 migrations apply miserere --remote/)
  const deploy = step(/npx wrangler deploy\b/)
  const secret = step(/npx wrangler secret put PUZZLE_API_TOKEN/)
  const order = [migrate, deploy, secret].map((s) => steps.indexOf(s))
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  assert.ok(steps.indexOf(step(/run: npm ci\b/)) < order[0], 'install comes before the first wrangler call')
  for (const s of [migrate, deploy]) {
    assert.deepEqual(secretsIn(s.block), ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'], s.name)
    assert.match(s.block, /working-directory: backend/, s.name)
  }
  assert.deepEqual(secretsIn(secret.block), ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'PUZZLE_API_TOKEN'])
  assert.match(secret.block, /working-directory: backend/)
  assert.match(secret.block, /printf '%s' "\$PUZZLE_API_TOKEN" \| npx wrangler secret put PUZZLE_API_TOKEN/, 'the token goes in on stdin, never as an argument')
})

test('it sets the tester token last, only when its repo secret exists, and never fails without it (TK1a A4)', () => {
  const owner = step(/npx wrangler secret put PUZZLE_API_TOKEN/)
  const tester = step(/npx wrangler secret put PUZZLE_TESTER_TOKEN/)
  assert.ok(steps.indexOf(owner) < steps.indexOf(tester), 'the owner token is set first')
  assert.equal(steps.indexOf(tester), steps.length - 1, 'the tester step is the last')
  assert.deepEqual(secretsIn(tester.block), ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'PUZZLE_TESTER_TOKEN'])
  assert.match(tester.block, /working-directory: backend/)
  assert.match(tester.block, /if \[ -z "\$PUZZLE_TESTER_TOKEN" \]; then\n(?:.*\n)*?\s+exit 0\n\s+fi\n/, 'an unset secret skips with exit 0')
  assert.match(tester.block, /printf '%s' "\$PUZZLE_TESTER_TOKEN" \| npx wrangler secret put PUZZLE_TESTER_TOKEN/, 'the token goes in on stdin, never as an argument')
  assert.doesNotMatch(tester.block, /\n        if:/, 'the step itself always runs; the shell decides')
  assert.doesNotMatch(step(/::error::missing repo secret/).block, /PUZZLE_TESTER_TOKEN/, 'a missing tester secret is not a deploy failure')
})

test('wrangler.toml documents both Worker secrets in its comments and declares neither as a plain var', () => {
  assert.match(wranglerRaw, /# - PUZZLE_API_TOKEN, the owner token/)
  assert.match(wranglerRaw, /# - PUZZLE_TESTER_TOKEN /)
  assert.doesNotMatch(wrangler, /PUZZLE_(?:API|TESTER)_TOKEN/, 'a secret is set with wrangler secret put, never written into the file')
  const vars = wrangler.match(/^\[vars\]\n((?:.+\n)*)/m)?.[1] ?? ''
  assert.deepEqual([...vars.matchAll(/^(\w+) =/gm)].map((m) => m[1]), ['BALLOT_ORIGINS'], 'the vars table holds the one public setting, no token')
})

/** Run the tester step's own shell with a fake `npx` that records its arguments and stdin; `env` is the step's env. */
function runTesterStep(env) {
  const dir = mkdtempSync(join(tmpdir(), 'backend-deploy-'))
  try {
    const run = step(/npx wrangler secret put PUZZLE_TESTER_TOKEN/).block.split(/\n        run: \|\n/)[1]
    assert.ok(run, 'the step has a multi-line run')
    const script = run.split('\n').map((l) => l.replace(/^          /, '')).join('\n')
    writeFileSync(join(dir, 'npx'), '#!/bin/sh\necho "$@" > "$CALLS"\ncat > "$STDIN"\n')
    chmodSync(join(dir, 'npx'), 0o755)
    const r = spawnSync('bash', ['-e', '-c', script], {
      encoding: 'utf8',
      env: { PATH: `${dir}:${process.env.PATH}`, CALLS: join(dir, 'calls'), STDIN: join(dir, 'stdin'), ...env },
    })
    const read = (n) => { try { return readFileSync(join(dir, n), 'utf8') } catch { return null } }
    return { status: r.status, stdout: r.stdout, calls: read('calls'), stdin: read('stdin') }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test("the tester step's shell skips with exit 0, and never calls wrangler, when the secret is unset or empty", () => {
  for (const env of [{}, { PUZZLE_TESTER_TOKEN: '' }]) {
    const r = runTesterStep(env)
    assert.equal(r.status, 0, JSON.stringify(r))
    assert.match(r.stdout, /PUZZLE_TESTER_TOKEN repo secret not set; skipping/)
    assert.equal(r.calls, null, 'wrangler never ran')
  }
})

test("the tester step's shell sets the secret on stdin when it exists", () => {
  const r = runTesterStep({ PUZZLE_TESTER_TOKEN: 'tester-value' })
  assert.equal(r.status, 0, JSON.stringify(r))
  assert.equal(r.calls.trim(), 'wrangler secret put PUZZLE_TESTER_TOKEN', 'the value is not an argument')
  assert.equal(r.stdin, 'tester-value')
})

test('a missing secret fails the run before anything is installed or deployed', () => {
  const check = step(/::error::missing repo secret/)
  assert.ok(steps.indexOf(check) < steps.indexOf(step(/run: npm ci\b/)))
  for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'PUZZLE_API_TOKEN']) {
    assert.match(check.block, new RegExp(`\\[ -n "\\$${name}" \\] \\|\\| missing=`), name)
  }
  assert.match(check.block, /exit 1/)
})

test('one deploy at a time, never cancelled mid-migration', () => {
  assert.match(head, /\nconcurrency:\n  group: backend-deploy\n  cancel-in-progress: false\n/)
})

test('wrangler.toml names the Worker and the real miserere database', () => {
  assert.match(wrangler, /^name = "miserere-api"$/m)
  assert.match(wrangler, /^database_name = "miserere"$/m)
  const id = wrangler.match(/^database_id = "([^"]+)"$/m)?.[1]
  assert.match(id ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  assert.notEqual(id, '00000000-0000-0000-0000-000000000000', 'the placeholder id is gone')
})

test('wrangler.toml carries the retention cron after the 03:43 sim batch (SM2g)', () => {
  assert.match(wrangler, /^\[triggers\]\ncrons = \["17 5 \* \* \*"\]$/m)
})
