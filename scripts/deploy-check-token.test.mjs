import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveGithubToken } from './deploy-check-token.mjs'

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
