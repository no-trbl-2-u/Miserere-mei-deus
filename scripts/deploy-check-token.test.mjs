import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveGithubToken } from './deploy-check-token.mjs'

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'deploy-check.mjs')
/** A throwaway git repo with one commit and no .env, so the script reads its HEAD and no local token. */
const REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-check-'))
for (const a of [['init', '-q'], ['-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'x']]) {
  execFileSync('git', a, { cwd: REPO })
}
/** Run deploy-check in that repo with only the given env vars. */
const run = (env) => spawnSync(process.execPath, [SCRIPT], {
  cwd: REPO, encoding: 'utf8', timeout: 20000,
  env: { PATH: process.env.PATH, DEPLOY_PROVIDER: 'github-actions', GH_REPO: 'x/y', ...env },
})

test('GH_TOKEN wins over the fallbacks', () => {
  assert.equal(resolveGithubToken({ GH_TOKEN: 'a', GITHUB_TOKEN: 'b', GH_PAT: 'c' }), 'a')
})
test('falls back to GITHUB_TOKEN, then GH_PAT', () => {
  assert.equal(resolveGithubToken({ GITHUB_TOKEN: 'b', GH_PAT: 'c' }), 'b')
  assert.equal(resolveGithubToken({ GH_PAT: 'c' }), 'c')
})
test('blank values are skipped; none gives undefined', () => {
  assert.equal(resolveGithubToken({ GH_TOKEN: ' ', GITHUB_TOKEN: '', GH_PAT: 'c' }), 'c')
  assert.equal(resolveGithubToken({}), undefined)
})

test('deploy-check itself takes the fallback: with only GITHUB_TOKEN set it does not stop on a missing token', () => {
  const none = run({})
  assert.equal(none.status, 3)
  assert.match(none.stderr, /GH_TOKEN .*is not set/)
  const fallback = run({ GITHUB_TOKEN: 'dummy-token' })
  assert.doesNotMatch(fallback.stderr ?? '', /is not set/)
})
