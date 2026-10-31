// scripts/env-run.test.mjs: the cross-platform env wrapper the e2e:combat-round:*
// npm scripts use (phase HD1b, A6).

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { parseEnvRun } from './env-run.mjs'

const SCRIPT = fileURLToPath(new URL('./env-run.mjs', import.meta.url))

test('leading KEY=value arguments are the env, the rest is the command', () => {
  assert.deepEqual(parseEnvRun(['ENCOUNTER_KIND=boss', 'PRESET=sage', 'node', 'x.mjs', 'A=b']), {
    env: { ENCOUNTER_KIND: 'boss', PRESET: 'sage' },
    cmd: 'node',
    args: ['x.mjs', 'A=b'],
  })
  assert.deepEqual(parseEnvRun(['node']), { env: {}, cmd: 'node', args: [] })
})

test('the child sees the variables and the exit code passes through', () => {
  const ok = spawnSync(
    process.execPath,
    [SCRIPT, 'WITHDRAW=1', 'LEVEL_UP=', 'node', '-e', 'process.exit(process.env.WITHDRAW === "1" && process.env.LEVEL_UP === "" ? 0 : 9)'],
    { encoding: 'utf8' },
  )
  assert.equal(ok.status, 0)
  const bad = spawnSync(process.execPath, [SCRIPT, 'node', '-e', 'process.exit(4)'], { encoding: 'utf8' })
  assert.equal(bad.status, 4)
})

test('no command is a usage error', () => {
  const r = spawnSync(process.execPath, [SCRIPT, 'A=1'], { encoding: 'utf8' })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /usage/)
})
