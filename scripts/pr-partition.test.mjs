// scripts/pr-partition.test.mjs — the review manifest (phase RV3, D95):
// one assignment per module of changed source, consumers from the
// reverse-import closure, a "do not report" list per assignment, the
// agent count capped by tier and the reading list by characters, the
// Tests lens whole, a control adversary on medium and high.
//
//   node --test scripts/pr-partition.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CHAR_CEILING, DEFECT_CLASSES, MAX_AGENTS, MIN_CHARS, buildReverseGraph, clusterKey, defectClassFor, importSpecifiers, leakyFiles,
  partition, renderManifest, resolveImport, reverseClosure,
} from './pr-partition.mjs'

const M = 'axiomancer-mobile'
const K = 'axiomancer-mechanics/src'

const sources = new Map([
  [`${K}/index.ts`, "export * from './Combat/effects'"],
  [`${K}/Combat/effects.ts`, "import { x } from '../Effects/types'\nexport const e = 1"],
  [`${K}/Effects/types.ts`, 'export type X = 1'],
  [`${M}/state/presenters/combat-encounter.engine.ts`, "import { e } from '@mechanics'\nimport { k } from '@/state/combat/keywords'"],
  [`${M}/state/combat/keywords.ts`, 'export const k = 1'],
  [`${M}/components/combat/encounter/CombatBoard.tsx`, "import { vm } from '@/state/presenters/combat-encounter.engine'\nimport { Dock } from './CombatFooterDock'"],
  [`${M}/components/combat/encounter/CombatFooterDock.tsx`, 'export const Dock = 1'],
  [`${M}/components/combat/encounter/__tests__/CombatBoard.test.tsx`, "import '../CombatBoard'"],
  [`${M}/app/combat-encounter/index.tsx`, "import { Board } from '@/components/combat/encounter/CombatBoard'"],
  ['scripts/pr-resolve.mjs', "import { a } from './eval/ledger-lib.mjs'"],
  ['scripts/eval/ledger-lib.mjs', 'export const a = 1'],
  ['scripts/pr-risk.mjs', "import { a } from './eval/ledger-lib.mjs'"],
])
const reverse = buildReverseGraph(sources)
// Real sizes are tiny here; MIN_CHARS + 1 keeps every cluster from folding as a sliver.
const sizes = new Map([...sources].map(([p]) => [p, MIN_CHARS + 1]))
const tiny = new Map([...sources].map(([p, t]) => [p, t.length]))

test('importSpecifiers reads from, bare import, dynamic import and require', () => {
  const text = "import a from './a'\nimport './side'\nconst b = require('./b')\nconst c = await import('./c')\nimport type { T } from \"./t\""
  assert.deepEqual(importSpecifiers(text), ['./a', './side', './b', './c', './t'])
})

test('resolveImport follows the repo aliases and extensions; packages are leaves', () => {
  const files = new Set(sources.keys())
  assert.equal(resolveImport(`${M}/a/b.tsx`, '@/state/combat/keywords', files), `${M}/state/combat/keywords.ts`)
  assert.equal(resolveImport(`${M}/a/b.tsx`, '@mechanics', files), `${K}/index.ts`)
  assert.equal(resolveImport(`${M}/a/b.tsx`, '@mechanics/Combat/effects', files), `${K}/Combat/effects.ts`)
  assert.equal(resolveImport(`${K}/Combat/effects.ts`, '../Effects/types', files), `${K}/Effects/types.ts`)
  assert.equal(resolveImport(`${K}/Combat/effects.ts`, '../Effects/types.js', files), `${K}/Effects/types.ts`, 'ESM .js suffix resolves to the .ts source')
  assert.equal(resolveImport('scripts/pr-resolve.mjs', './eval/ledger-lib.mjs', files), 'scripts/eval/ledger-lib.mjs')
  assert.equal(resolveImport('scripts/pr-resolve.mjs', 'node:fs', files), null)
  assert.equal(resolveImport(`${M}/a/b.tsx`, 'react-native', files), null)
})

test('buildReverseGraph lists importers per file, sorted', () => {
  assert.deepEqual(reverse.get('scripts/eval/ledger-lib.mjs'), ['scripts/pr-resolve.mjs', 'scripts/pr-risk.mjs'])
  assert.deepEqual(reverse.get(`${M}/state/presenters/combat-encounter.engine.ts`), [`${M}/components/combat/encounter/CombatBoard.tsx`])
})

test('reverseClosure follows two hops, skips the changed set and test files', () => {
  const c = reverseClosure([`${M}/state/presenters/combat-encounter.engine.ts`], reverse)
  assert.deepEqual([...c.keys()].sort(), [`${M}/app/combat-encounter/index.tsx`, `${M}/components/combat/encounter/CombatBoard.tsx`])
  assert.equal(c.get(`${M}/app/combat-encounter/index.tsx`).hop, 2)
  assert.equal(reverseClosure([`${K}/Effects/types.ts`], reverse, 1).size, 1, 'depth 1 stops at effects.ts')
})

test('clusterKey is the module the ledger clusters leaks at', () => {
  assert.equal(clusterKey(`${K}/Combat/effects.ts`), `${K}/Combat`)
  assert.equal(clusterKey(`${M}/state/presenters/x.ts`), `${M}/state/presenters`)
  assert.equal(clusterKey(`${M}/components/combat/encounter/CombatBoard.tsx`), `${M}/components/combat`)
  assert.equal(clusterKey('scripts/pr-resolve.mjs'), 'scripts')
  assert.equal(clusterKey('scripts/eval/ledger-lib.mjs'), 'scripts')
  assert.equal(clusterKey('.github/workflows/pr-review.yml'), '.github/workflows')
  assert.equal(clusterKey('package.json'), '(root)')
})

test('defectClassFor maps each module kind to the ledger class it leaked', () => {
  assert.equal(defectClassFor(`${M}/components/combat/encounter/CombatBoard.tsx`), 'ui-layout')
  assert.equal(defectClassFor(`${M}/state/presenters/card-program.engine.ts`), 'rules-logic')
  assert.equal(defectClassFor(`${K}/Combat/effects.ts`), 'rules-logic')
  assert.equal(defectClassFor('scripts/pr-resolve.mjs'), 'tooling-uncovered')
  assert.equal(defectClassFor('.github/workflows/pr-review.yml'), 'tooling-uncovered')
  assert.equal(defectClassFor('axiomancer-mechanics/content/cards/x.ts'), 'units-labels')
  assert.equal(defectClassFor(`${M}/state/save/migrations.ts`), 'saves-schema')
  for (const c of Object.values(DEFECT_CLASSES)) assert.ok(c.hunt.length > 80, 'each hunt is a real brief')
})

test('leakyFiles counts ledger PRs with a follow-up per source file, tests excluded', () => {
  const leaks = leakyFiles({ rows: [
    { files: ['a.ts', 'a.test.ts', 'plan/x.md'], followUps: [{}] },
    { files: ['a.ts'], followUps: [{}] },
    { files: ['b.ts'], followUps: [] },
  ] })
  assert.deepEqual([...leaks], [['a.ts', 2]])
  assert.equal(leakyFiles(null).size, 0)
})

const changed = (...paths) => paths.map((p) => ({ path: p, additions: 10, deletions: 2 }))

test('one assignment per module, consumers attached to the changed file they reach', () => {
  const m = partition({
    changed: changed(`${M}/state/presenters/combat-encounter.engine.ts`, `${M}/components/combat/encounter/CombatFooterDock.tsx`, 'scripts/pr-resolve.mjs'),
    tier: 'risk:high', reverse, sizes,
  })
  assert.deepEqual(m.agents.map((a) => a.module), [`${M}/state/presenters`, `${M}/components/combat`, 'scripts'])
  const [presenters, components, scripts] = m.agents
  assert.deepEqual(presenters.consumers.map((c) => c.path), [`${M}/components/combat/encounter/CombatBoard.tsx`, `${M}/app/combat-encounter/index.tsx`])
  assert.deepEqual(components.consumers.map((c) => c.path), [], 'CombatBoard already belongs to the presenter change it reaches first')
  assert.deepEqual(scripts.consumers, [])
  assert.equal(presenters.defectClass, 'rules-logic')
  assert.equal(components.defectClass, 'ui-layout')
  assert.equal(scripts.defectClass, 'tooling-uncovered')
})

test('every assignment excludes every other assignment\'s changed files', () => {
  const m = partition({ changed: changed(`${K}/Combat/effects.ts`, `${M}/state/combat/keywords.ts`, 'scripts/pr-risk.mjs'), tier: 'risk:high', reverse, sizes })
  for (const a of m.agents) {
    for (const f of a.changed) assert.ok(!a.exclude.includes(f.path))
    for (const other of m.agents.filter((o) => o !== a)) for (const f of other.changed) assert.ok(a.exclude.includes(f.path), `${a.id} excludes ${f.path}`)
  }
})

test('the agent count is capped by tier; the lightest clusters merge, same package first', () => {
  const many = changed(`${K}/Combat/effects.ts`, `${K}/Effects/types.ts`, `${M}/state/combat/keywords.ts`, `${M}/components/combat/encounter/CombatFooterDock.tsx`, 'scripts/pr-risk.mjs', 'scripts/eval/ledger-lib.mjs')
  assert.equal(MAX_AGENTS['risk:low'], 2)
  const low = partition({ changed: many, tier: 'risk:low', reverse, sizes })
  assert.equal(low.agents.length, 2)
  assert.equal(low.control, null, 'no control adversary on low')
  const high = partition({ changed: many, tier: 'risk:high', reverse, sizes })
  assert.equal(high.agents.length, 5, 'one per module under the cap')
  assert.ok(high.control, 'a control adversary on high')
  assert.ok(low.agents.some((a) => a.module.includes(' + ')), 'a merged cluster names both modules')
  // Five modules in two packages on medium (cap 4): the one merge stays inside a package.
  const five = changed(`${K}/Combat/effects.ts`, `${K}/Effects/types.ts`, `${M}/state/combat/keywords.ts`, `${M}/components/combat/encounter/CombatFooterDock.tsx`, `${M}/app/combat-encounter/index.tsx`)
  const medium = partition({ changed: five, tier: 'risk:medium', reverse, sizes })
  assert.equal(medium.agents.length, 4)
  const merged = medium.agents.find((a) => a.module.includes(' + '))
  assert.equal(new Set(merged.module.split(' + ').map((k) => k.split('/')[0])).size, 1, 'merged within one package')
})

test('a sliver with no consumers folds into its package rather than spawning a reader', () => {
  const m = partition({ changed: changed(`${K}/Combat/effects.ts`, `${K}/Effects/types.ts`), tier: 'risk:high', reverse, sizes: tiny })
  assert.equal(m.agents.length, 1)
  assert.match(m.agents[0].module, / \+ /)
})

test('a module over the character ceiling is split into more than one assignment', () => {
  const huge = new Map(sizes)
  huge.set(`${M}/state/presenters/combat-encounter.engine.ts`, CHAR_CEILING - 10)
  huge.set(`${M}/state/presenters/deck.engine.ts`, CHAR_CEILING - 10)
  const m = partition({
    changed: changed(`${M}/state/presenters/combat-encounter.engine.ts`, `${M}/state/presenters/deck.engine.ts`), tier: 'risk:high', reverse, sizes: huge,
  })
  assert.equal(m.agents.length, 2)
  for (const a of m.agents) assert.ok(a.changed.reduce((n, f) => n + huge.get(f.path), 0) <= CHAR_CEILING, 'owned changed source stays under the ceiling')
})

test('plan, docs and loop records get no agent; tests go to the Tests lens; other files to every reader', () => {
  const m = partition({
    changed: changed('plan/x.md', 'docs/reports/y.md', `${M}/components/combat/encounter/__tests__/CombatBoard.test.tsx`, 'package.json', 'scripts/pr-risk.mjs'),
    tier: 'risk:medium', reverse, sizes,
  })
  assert.deepEqual(m.records, ['plan/x.md', 'docs/reports/y.md'])
  assert.deepEqual(m.tests.testFiles, [`${M}/components/combat/encounter/__tests__/CombatBoard.test.tsx`])
  assert.deepEqual(m.unpartitioned, ['package.json'])
  assert.equal(m.agents.length, 1)
  assert.deepEqual(m.control.files, ['scripts/pr-risk.mjs', 'package.json'])
})

test('a records-only diff spawns no assignment', () => {
  const m = partition({ changed: changed('plan/x.md', 'telemetry/a.md'), tier: 'risk:low', reverse, sizes })
  assert.equal(m.agents.length, 0)
  assert.match(renderManifest(m), /0 spawned/)
})

test('ledger leaks ride on the owned file', () => {
  const leaks = new Map([[`${M}/state/presenters/combat-encounter.engine.ts`, 7]])
  const m = partition({ changed: changed(`${M}/state/presenters/combat-encounter.engine.ts`), tier: 'risk:high', reverse, sizes, leaks })
  assert.equal(m.agents[0].changed[0].leaks, 7)
  assert.match(renderManifest(m), /7 ledger leaks/)
})

test('renderManifest writes one section per assignment with the hunt, the owned lists and the do-not-report list', () => {
  const m = partition({
    changed: changed(`${M}/state/presenters/combat-encounter.engine.ts`, 'scripts/pr-resolve.mjs'), tier: 'risk:high', reverse, sizes, pr: 42,
  })
  const md = renderManifest(m)
  assert.match(md, /^# Review manifest for PR #42$/m)
  assert.match(md, /^### Assignment a1: axiomancer-mobile\/state\/presenters$/m)
  assert.match(md, /^### Assignment a2: scripts$/m)
  assert.match(md, /\*\*Hunt first:\*\* presenter or rules logic/)
  assert.match(md, /\*\*Hunt first:\*\* loop tooling/)
  assert.match(md, /\*\*Owned consumers\*\*[\s\S]*CombatBoard\.tsx` \(hop 1/)
  assert.match(md, /\*\*Do not report\*\*[^\n]*\n- `scripts\/pr-resolve\.mjs`/)
  assert.match(md, /^### Tests lens$/m)
  assert.match(md, /^### Control adversary$/m)
  assert.doesNotMatch(md, /null/)
})
