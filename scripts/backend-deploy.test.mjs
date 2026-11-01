// Pins the shape of .github/workflows/backend-deploy.yml (phase BE1b): what
// triggers it, that it deploys only from main, that the Cloudflare and Worker
// secrets reach only the steps that use them (never `npm ci`), and that it
// migrates, deploys, then sets the Worker secret, in that order. Also pins the
// real D1 database id in backend/wrangler.toml.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const workflow = readFileSync(new URL('.github/workflows/backend-deploy.yml', root), 'utf8').replace(/\r\n/g, '\n')
const wrangler = readFileSync(new URL('backend/wrangler.toml', root), 'utf8').replace(/\r\n/g, '\n')

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
