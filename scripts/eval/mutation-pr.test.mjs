// scripts/eval/mutation-pr.test.mjs — the diff scoping of the PR mutation
// job (phase LG1g, A7): changed lines from a zero-context diff, the Stryker
// line ranges each workspace gets, and the report-only comment.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { NARROW_OVER, PR_MARKER, mutatedFiles, narrowRelated, ownTests, parseChangedLines, prOutcome, rangeConfigSource, renderPrReport, scopeChangedLines, sourceReadingTests } from './mutation-lib.mjs'

test('rangeConfigSource hands the changed files to the base config through EVAL_STRYKER_MUTATE, then replaces mutate', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'range-config-'))
  const before = process.env.EVAL_STRYKER_MUTATE
  try {
    // A base config that records the env it saw while loading.
    writeFileSync(join(dir, 'base.mjs'), 'export default { seen: process.env.EVAL_STRYKER_MUTATE, mutate: ["old.ts"], keep: 1 }\n')
    const entries = ['app/cutscene/index.tsx:10-20', 'state/x.ts:3-3']
    writeFileSync(join(dir, 'range.mjs'), rangeConfigSource(pathToFileURL(join(dir, 'base.mjs')).href, entries))
    const config = (await import(pathToFileURL(join(dir, 'range.mjs')).href)).default
    assert.deepEqual(JSON.parse(config.seen), entries)
    assert.deepEqual(config.mutate, entries)
    assert.equal(config.keep, 1)
  } finally {
    if (before === undefined) delete process.env.EVAL_STRYKER_MUTATE
    else process.env.EVAL_STRYKER_MUTATE = before
    rmSync(dir, { recursive: true, force: true })
  }
})

test('the mobile config relates its jest tests to the files in EVAL_STRYKER_MUTATE, else to the two presenters', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const config = pathToFileURL(join(root, 'scripts/eval/stryker/mobile.config.mjs')).href
  const tests = (env) => {
    const code = `const { default: c } = await import(${JSON.stringify(config)}); console.log(JSON.stringify(c.jest.config.testMatch))`
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
      cwd: join(root, 'axiomancer-mobile'),
      env: { ...process.env, EVAL_STRYKER_MUTATE: env },
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
    return JSON.parse(out.trim().split('\n').at(-1))
  }
  const set = tests(JSON.stringify(['app/cutscene/index.tsx:10-20']))
  assert.ok(set.some((t) => t.endsWith('state/e2e/cutscene-leaves-first.test.tsx')), 'the changed file\'s own test is run')
  const fixed = tests('')
  assert.ok(!fixed.some((t) => t.endsWith('state/e2e/cutscene-leaves-first.test.tsx')), 'unset, only the presenters\' tests are run')
  assert.ok(fixed.length > 0)
})

test('mutatedFiles strips the line ranges from EVAL_STRYKER_MUTATE and falls back to the fixed list when it is unset', () => {
  assert.deepEqual(mutatedFiles(['fixed.ts'], '["app/cutscene/index.tsx:10-20","state/x.ts:3-3","bare.ts"]'), ['app/cutscene/index.tsx', 'state/x.ts', 'bare.ts'])
  assert.deepEqual(mutatedFiles(['fixed.ts'], undefined), ['fixed.ts'])
  assert.deepEqual(mutatedFiles(['fixed.ts'], ''), ['fixed.ts'])
})

test('ownTests: the tests named after a file or importing it, not those that only mock it', () => {
  const texts = {
    '/m/state/e2e/cutscene-pages.NV1o.test.ts': "import { x } from '../somewhere'",
    '/m/state/e2e/scene.test.tsx': "import { pageCutscene } from '@/state/presenters/cutscene-pages'",
    '/m/state/e2e/mocked.test.tsx': "jest.mock('@/state/presenters/cutscene-pages', () => ({}))",
    '/m/state/e2e/other.test.tsx': "import { y } from '@/state/presenters/event.engine'",
    '/m/state/e2e/quest.screen.test.tsx': "import QuestScreen from '@/app/quest/index'",
    '/m/state/e2e/q2.test.tsx': "const Q = require('../../app/quest')",
  }
  const read = (t) => texts[t]
  const all = Object.keys(texts)
  assert.deepEqual(ownTests('state/presenters/cutscene-pages.ts', all, read), ['/m/state/e2e/cutscene-pages.NV1o.test.ts', '/m/state/e2e/scene.test.tsx'])
  assert.deepEqual(ownTests('app/quest/index.tsx', all, read), ['/m/state/e2e/quest.screen.test.tsx', '/m/state/e2e/q2.test.tsx'])
})

test('narrowRelated keeps a small related set, narrows a large one to the own tests, and keeps a large one with none', () => {
  const big = Array.from({ length: NARROW_OVER + 1 }, (_, i) => `/m/s${i}.test.ts`)
  const read = (t) => (t === '/m/s3.test.ts' ? "import { a } from '@/state/presenters/cutscene-pages'" : '')
  assert.deepEqual(narrowRelated('state/presenters/cutscene-pages.ts', big.slice(0, NARROW_OVER), read), { tests: big.slice(0, NARROW_OVER), narrowed: false })
  assert.deepEqual(narrowRelated('state/presenters/cutscene-pages.ts', big, read), { tests: ['/m/s3.test.ts'], narrowed: true })
  assert.deepEqual(narrowRelated('state/presenters/lonely.ts', big, read), { tests: big, narrowed: false })
})

test('sourceReadingTests: a test that reads a mutated file from disk is left out; an index file is named with its folder', () => {
  const texts = {
    '/m/a.test.tsx': "fs.readFileSync(path.join(__dirname, '../../components/quest/QuestGiverScene.tsx'), 'utf8')",
    '/m/b.test.tsx': "import { RelicRise } from '@/components/quest/QuestGiverScene'",
    '/m/c.test.tsx': "readFileSync(join(root, 'app/cutscene/index.tsx'))",
    '/m/d.test.tsx': "readFileSync(join(root, 'app/quest/index.tsx'))",
  }
  const read = (t) => texts[t]
  const all = Object.keys(texts)
  assert.deepEqual(sourceReadingTests(all, ['components/quest/QuestGiverScene.tsx'], read), ['/m/a.test.tsx'])
  assert.deepEqual(sourceReadingTests(all, ['app/quest/index.tsx'], read), ['/m/d.test.tsx'])
})

test('the mobile config narrows a PR file with a large related set to its own tests (cutscene-pages)', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const config = pathToFileURL(join(root, 'scripts/eval/stryker/mobile.config.mjs')).href
  const code = `const { default: c } = await import(${JSON.stringify(config)}); console.log(JSON.stringify(c.jest.config.testMatch))`
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: join(root, 'axiomancer-mobile'),
    env: { ...process.env, EVAL_STRYKER_MUTATE: JSON.stringify(['state/presenters/cutscene-pages.ts:1-47']) },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const set = JSON.parse(out.trim().split('\n').at(-1))
  assert.ok(set.length > 0 && set.length <= NARROW_OVER, `narrowed, got ${set.length}`)
  assert.ok(set.every((t) => /cutscene-pages/.test(t.split('/').at(-1))), set.join(', '))
})

const DIFF = [
  'diff --git a/axiomancer-mechanics/src/Combat/health.ts b/axiomancer-mechanics/src/Combat/health.ts',
  'index 1111111..2222222 100644',
  '--- a/axiomancer-mechanics/src/Combat/health.ts',
  '+++ b/axiomancer-mechanics/src/Combat/health.ts',
  '@@ -10,2 +10,3 @@ export function heal(',
  '-  return a',
  '-  return b',
  '+  return a + 1',
  '+  return b',
  '+  // c',
  '@@ -40 +41 @@ export function hurt(',
  '-  x',
  '+  y',
  '@@ -60,3 +61,0 @@',
  '-  gone',
  '-  gone',
  '-  gone',
  'diff --git a/axiomancer-mechanics/src/Combat/old.ts b/axiomancer-mechanics/src/Combat/old.ts',
  'deleted file mode 100644',
  '--- a/axiomancer-mechanics/src/Combat/old.ts',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  '-a',
  '-b',
  'diff --git a/axiomancer-mechanics/src/Combat/new.ts b/axiomancer-mechanics/src/Combat/new.ts',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/axiomancer-mechanics/src/Combat/new.ts',
  '@@ -0,0 +1,4 @@',
  '+a',
  '+b',
  '+c',
  '+d',
  '',
].join('\n')

test('parseChangedLines: new-side ranges per file; deletions and deleted files drop out', () => {
  const changed = parseChangedLines(DIFF)
  assert.deepEqual([...changed.keys()], ['axiomancer-mechanics/src/Combat/health.ts', 'axiomancer-mechanics/src/Combat/new.ts'])
  assert.deepEqual(changed.get('axiomancer-mechanics/src/Combat/health.ts'), [[10, 12], [41, 41]])
  assert.deepEqual(changed.get('axiomancer-mechanics/src/Combat/new.ts'), [[1, 4]])
  assert.equal(parseChangedLines('').size, 0)
})

test('scopeChangedLines: workspace-relative ranges, tests and non-source left out, empty workspaces dropped', () => {
  const changed = new Map([
    ['axiomancer-mechanics/src/Combat/health.ts', [[10, 12], [41, 41]]],
    ['axiomancer-mechanics/src/Combat/health.test.ts', [[1, 9]]],
    ['axiomancer-mechanics/src/test-utils/fight.ts', [[1, 9]]],
    ['axiomancer-mechanics/scripts/tool.ts', [[1, 9]]],
    ['axiomancer-mechanics/src/CLI/combat-sim.cli.ts', [[22, 22]]],
    ['axiomancer-mobile/state/presenters/rest.copy.ts', [[3, 3]]],
    ['axiomancer-mobile/components/Card.tsx', [[7, 8]]],
    ['axiomancer-mobile/state/mocks/combat.mock.ts', [[1, 2]]],
    ['axiomancer-mobile/__tests__/x.tsx', [[1, 2]]],
    ['scripts/pr-gate.mjs', [[1, 2]]],
  ])
  const scopes = scopeChangedLines(changed)
  assert.deepEqual(scopes.map((s) => [s.key, s.cwd, s.mutate, s.files, s.lines]), [
    ['mechanics', 'axiomancer-mechanics', ['src/Combat/health.ts:10-12', 'src/Combat/health.ts:41-41'], 1, 4],
    ['mobile', 'axiomancer-mobile', ['components/Card.tsx:7-8', 'state/presenters/rest.copy.ts:3-3'], 2, 3],
  ])
  assert.equal(scopes[0].config, 'scripts/eval/stryker/mechanics.config.mjs')
  assert.ok(!('include' in scopes[0]), 'the matcher stays out of the runnable scope')
  assert.deepEqual(scopeChangedLines(new Map([['scripts/pr-gate.mjs', [[1, 2]]], ['plan/AUDIT.md', [[1, 1]]]])), [])
})

const tally = (killed, survived) => ({ total: killed + survived, killed, timeout: 0, survived, noCoverage: 0, invalid: 0, score: Math.round((killed / (killed + survived)) * 1000) / 10 })

test('renderPrReport: score and each survivor with its file and line, behind the comment marker', () => {
  const md = renderPrReport({
    base: 'aaaaaaaa11', head: 'bbbbbbbb22', budgetSeconds: 900,
    targets: [
      { name: 'mechanics', lines: 4, files: [{ path: 'axiomancer-mechanics/src/Combat/health.ts', tally: tally(3, 1) }], seconds: 81, outcome: 'ok', partial: null,
        survivors: [{ path: 'axiomancer-mechanics/src/Combat/health.ts', line: 10, mutator: 'ArithmeticOperator', replacement: 'a - 1', status: 'Survived' }] },
      { name: 'mobile', lines: 3, files: [], seconds: 0, outcome: 'skipped: budget spent', partial: null, survivors: [] },
    ],
  })
  assert.ok(md.startsWith(PR_MARKER))
  assert.match(md, /Base `aaaaaaaa`, head `bbbbbbbb`, budget 15 min/)
  assert.match(md, /never fails a check/)
  assert.match(md, /\| mechanics \| 4 \| 4 \| 3 \| 0 \| 1 \| 0 \| 75% \| ok, 81s \|/)
  assert.match(md, /\| mobile \| 3 \| - \| - \| - \| - \| - \| n\/a \| skipped: budget spent, 0s \|/)
  assert.match(md, /### Survivors: mechanics\n\n[^\n]+\n[^\n]+\n\| `axiomancer-mechanics\/src\/Combat\/health\.ts:10` \| ArithmeticOperator \| `a - 1` \| Survived \|/)
  assert.doesNotMatch(md, /Survivors: mobile/)
})

test('renderPrReport: an over-budget run shows its partial counts; no changed source says so', () => {
  const over = renderPrReport({ base: 'a', head: 'b', budgetSeconds: 900, targets: [{ name: 'mechanics', lines: 40, files: [], seconds: 870, outcome: 'over budget (870s): 50 of 90 tested, 6 survived', partial: { tested: 50, total: 90, survived: 6, timedOut: 1 }, survivors: [] }] })
  assert.match(over, /\| mechanics \| 40 \| 90 \| - \| 1 \| 6 \| - \| n\/a \| over budget/)
  const none = renderPrReport({ base: 'a', head: 'b', budgetSeconds: 900, targets: [] })
  assert.match(none, /nothing was mutated/)
  assert.doesNotMatch(none, /\| Workspace/)
})

test('prOutcome and the score cell: colour codes stripped, no related test said plainly, all-static named', () => {
  assert.equal(prOutcome('failed (exit 1): \x1b[91m07:03:56 (10177) ERROR Stryker\x1b[39m No tests were executed. Stryker will exit prematurely.'), 'no test relates to these lines')
  assert.equal(prOutcome('failed (exit 1): \x1b[91mERROR\x1b[39m boom'), 'failed (exit 1): ERROR boom')
  assert.equal(prOutcome('ok'), 'ok')
  const md = renderPrReport({ base: 'a', head: 'b', budgetSeconds: 900, targets: [{ name: 'mechanics', lines: 11, files: [{ path: 'x', tally: { total: 75, killed: 0, timeout: 0, survived: 0, noCoverage: 0, invalid: 75, score: null } }], seconds: 35, outcome: 'ok', partial: null, survivors: [] }] })
  assert.match(md, /\| 75 \| 0 \| 0 \| 0 \| 0 \| n\/a \(all static or ignored\) \| ok, 35s \|/)
})
