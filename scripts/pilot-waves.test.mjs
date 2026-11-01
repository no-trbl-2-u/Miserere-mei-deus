// scripts/pilot-waves.test.mjs: `/pilot peek` prints the waves from the
// chunks' `needs` and launches nothing (phase NX1g, A11).
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseSpec } from './plan-check.mjs'
import { simulate } from './plan/order.mjs'
import { aliasMap, render, waves } from './pilot-waves.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const README = `# Plan

**Asap** (built first)

- (none)

**Held** (waits on a person's word)

- 41.4 (T's call)

## Roadmap

| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 40 | Forty | [40-forty.md](40-forty.md) | planned | 3 left |
| 41 | Forty-one | [41-forty-one.md](41-forty-one.md) | planned | 4 left |
`

const spec = (num, title, lines) => `# ${num} — ${title}

> ${title}.

## Why

Because.

## Chunks

Measure: ${lines.length} open

${lines.join('\n')}
`

const SPECS = {
  '40-forty.md': spec('40', 'Forty', [
    '- [ ] **40.1** The base · M · closes A1 · needs — · alias: FT1a',
    '- [ ] **40.2** On the base · L · closes A2 · needs 40.1 · alias: FT1b',
    '- [ ] **40.3** Beside it · S · closes A3 · needs —',
  ]),
  '41-forty-one.md': spec('41', 'Forty-one', [
    '- [ ] **41.1** Alone · M · closes A1 · needs —',
    '- [ ] **41.2** After both · M · closes A2 · needs 40.2, 41.1',
    '- [ ] **41.3** Last · S · closes A3 · needs 41.2',
    '- [ ] **41.4** Held one · S · closes A4 · needs —',
  ]),
}

const plan = () => ({ readme: README, specs: Object.entries(SPECS).map(([f, t]) => parseSpec(f, t)), closed: new Set(), claims: {} })
const ids = (w) => w.map((c) => c.id)

test('waves follow the chunks\' needs: wave k+1 is what wave k unlocks', () => {
  const r = waves(simulate(plan()), { aliases: aliasMap(Object.values(SPECS)) })
  assert.deepEqual(r.waves.map(ids), [['40.1', '40.3', '41.1'], ['40.2'], ['41.2'], ['41.3']])
  assert.deepEqual(r.apart.map((c) => [c.id, c.why]), [['41.4', 'held']])
  assert.equal(r.waves[1][0].model, 'opus', 'an L chunk gets Opus')
  assert.equal(r.waves[0][0].model, 'sonnet')
  assert.equal(r.waves[0][0].alias, 'FT1a')
})

test('a scope by alias or spec keeps only those chunks; an open need outside it waits', () => {
  const aliases = aliasMap(Object.values(SPECS))
  const r = waves(simulate(plan()), { scope: ['FT1b', '41'], aliases })
  assert.deepEqual(r.waves.map(ids), [['41.1']])
  const why = Object.fromEntries(r.apart.map((c) => [c.id, c.why]))
  assert.equal(why['40.2'], 'needs 40.1 (outside this run)')
  assert.equal(why['41.2'], 'needs 40.2 (waiting)')
  assert.equal(why['41.4'], 'held')
  assert.deepEqual(waves(simulate(plan()), { scope: ['ZZ9'] }).unknown, ['ZZ9'])
})

test('a pending close counts as done, and a claim by someone else is set apart', () => {
  const sim = simulate({ ...plan(), closed: new Set(['40.1']), claims: { '41.1': { who: 'T s:abcd1234', mine: false } } })
  const r = waves(sim)
  assert.deepEqual(r.waves.map(ids), [['40.2', '40.3'], ['41.2'], ['41.3']])
  assert.ok(r.apart.some((c) => c.id === '41.1' && c.why === 'claimed by T s:abcd1234'))
})

test('the peek text names each wave, its chunks and what is set apart', () => {
  const text = render(waves(simulate(plan()), { aliases: aliasMap(Object.values(SPECS)) }), { ref: 'origin/main' })
  assert.match(text, /^\/pilot peek \(plan at origin\/main\): 4 waves, 6 chunks\. Launches nothing\./)
  assert.match(text, /^wave 2 \(starts once wave 1's prerequisite PRs merge\)$/m)
  assert.match(text, /^ {2}40\.2 \(FT1b\) .* opus .*needs 40\.1/m)
  assert.match(text, /^apart \(not launched\)\n {2}41\.4 +held$/m)
})

test('/pilot peek on a plan fixture prints the waves and writes nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-peek-'))
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' })
  try {
    git('init', '-q')
    fs.mkdirSync(path.join(dir, 'plan'))
    fs.writeFileSync(path.join(dir, 'plan', 'README.md'), README)
    for (const [f, t] of Object.entries(SPECS)) fs.writeFileSync(path.join(dir, 'plan', f), t)
    git('add', '.')
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'fixture')
    const r = spawnSync(process.execPath, [path.join(HERE, 'pilot-waves.mjs'), '--ref', 'HEAD'], { cwd: dir, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /4 waves, 6 chunks\. Launches nothing\./)
    assert.match(r.stdout, /^wave 1\n {2}40\.1 \(FT1a\)/m)
    assert.equal(git('status', '--porcelain', '--ignored').stdout, '', 'peek writes no ledger, no claim file, nothing')
    assert.ok(!fs.existsSync(path.join(dir, '.nexus')))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
