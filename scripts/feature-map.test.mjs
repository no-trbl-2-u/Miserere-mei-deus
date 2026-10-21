// scripts/feature-map.test.mjs — the feature map's inventory, edges, coverage and drift check.
//
//   node --test scripts/feature-map.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { OUT_PATH, buildFeatureMap, coverageDiff, edges, hrefSegment, inventory, main, routePathOf, serialize } from './feature-map.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const FIXTURE = {
  'axiomancer-mobile/app/_layout.tsx': `import { Gate } from '@/components/Gate'\nexport default function L() { return <Gate /> }\n`,
  'axiomancer-mobile/components/Gate.tsx': `import { useRouter } from '@/lib/router'\nexport function Gate() { const router = useRouter(); router.push('/rest' as never); return null }\n`,
  'axiomancer-mobile/lib/router.ts': `// router.push('/village') in a comment is not a call\nexport const useRouter = () => ({ push(_h: string) {} })\n`,
  'axiomancer-mobile/lib/pick.ts': `export type Where = 'village'\nexport function pick(): Where { return 'village' }\n`,
  'axiomancer-mobile/app/index.tsx': [
    `import { useRouter, Redirect } from '@/lib/router'`,
    `import { pick } from '@/lib/pick'`,
    `export default function I() { const router = useRouter(); router.push('/saves?mode=new'); return <Redirect href={\`/\${pick()}\`} /> }`,
    '',
  ].join('\n'),
  'axiomancer-mobile/app/(tabs)/_layout.tsx': `import { Tabs } from '@/lib/router'\nexport default function T() { return <Tabs /> }\n`,
  'axiomancer-mobile/app/(tabs)/deck/index.tsx': `export default function D() { return null }\n`,
  'axiomancer-mobile/app/(tabs)/map/index.tsx': `export default function M() { return null }\n`,
  'axiomancer-mobile/app/(tabs)/deck/__tests__/Deck.test.tsx': `import { x } from '@mechanics/Combat/c'\n`,
  'axiomancer-mobile/app/saves/index.tsx': `import { createThing } from '@mechanics'\nimport { Panel } from '@/components/Panel'\nexport default function S() { return <Panel /> }\n`,
  'axiomancer-mobile/components/Panel.tsx': `import { w } from '@mechanics/World/w'\nexport function Panel() { return null }\n`,
  'axiomancer-mobile/app/rest/index.tsx': `export default function R() { return null }\n`,
  'axiomancer-mobile/app/village/index.tsx': `export default function V() { return null }\n`,
  'axiomancer-mobile/app/hazard/index.tsx': `export default function H() { return null }\n`,
  'axiomancer-mobile/app/devart/rooms.tsx': `export default function Rooms() { return null }\n`,
  'axiomancer-mechanics/src/index.ts': `export { createThing } from './Character'\nexport { w } from './World/w'\n`,
  'axiomancer-mechanics/src/Character/index.ts': `import { w } from '../World/w'\nimport { u } from '../Utils/u'\nexport const createThing = () => w + u\n`,
  'axiomancer-mechanics/src/Character/c.test.ts': `import { c } from '../Combat'\n`,
  'axiomancer-mechanics/src/Combat/index.ts': `export const c = 1\n`,
  'axiomancer-mechanics/src/World/w.ts': `export const w = 1\n`,
  'axiomancer-mechanics/src/Utils/u.ts': `export const u = 1\n`,
  'axiomancer-mechanics/src/test-utils/t.ts': `export const t = 1\n`,
}

function makeFixture(extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-'))
  for (const [rel, text] of Object.entries({ ...FIXTURE, ...extra })) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), text)
  }
  return dir
}

const has = (list, e) => list.some((x) => x.kind === e.kind && x.from === e.from && x.to === e.to && (!e.file || x.file === e.file))

test('route paths: index is `index`, tab and nested routes keep their folder', () => {
  assert.equal(routePathOf('index.tsx'), 'index')
  assert.equal(routePathOf('(tabs)/deck/index.tsx'), '(tabs)/deck')
  assert.equal(routePathOf('devart/rooms.tsx'), 'devart/rooms')
  assert.equal(hrefSegment('/(tabs)/deck'), 'deck')
  assert.equal(hrefSegment('/combat-encounter?seed=16'), 'combat-encounter')
  assert.equal(hrefSegment('/?menu=1'), '')
  assert.equal(hrefSegment('deck'), null)
})

test('inventory: one entry per route and engine area, layouts, tests and excluded folders left out', () => {
  const dir = makeFixture()
  const features = inventory(dir)
  assert.deepEqual(features.map((f) => f.id), [
    'area:Character', 'area:Combat', 'area:World',
    'route:(tabs)/deck', 'route:(tabs)/map', 'route:devart/rooms', 'route:hazard', 'route:index', 'route:rest', 'route:saves', 'route:village',
  ])
  const byId = Object.fromEntries(features.map((f) => [f.id, f]))
  assert.deepEqual(byId['route:index'], { id: 'route:index', name: 'Index', kind: 'route', group: 'world', source: 'axiomancer-mobile/app/index.tsx' })
  assert.deepEqual(byId['route:devart/rooms'], { id: 'route:devart/rooms', name: 'Devart Rooms', kind: 'dev-route', group: 'dev', source: 'axiomancer-mobile/app/devart/rooms.tsx' })
  assert.equal(byId['route:(tabs)/deck'].group, 'tabs')
  assert.equal(byId['route:hazard'].group, 'minigames')
  assert.deepEqual(byId['area:World'], { id: 'area:World', name: 'World', kind: 'engine-area', group: 'engine', source: 'axiomancer-mechanics/src/World' })
})

test('coverage: the committed map matches the real tree', () => {
  const committed = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_PATH), 'utf8'))
  assert.deepEqual(coverageDiff(committed.features, ROOT), { missing: [], extra: [] })
  assert.ok(committed.features.some((f) => f.id === 'route:index'))
})

test('coverage: a missing, an extra and a duplicated feature are each caught', () => {
  const dir = makeFixture()
  const features = inventory(dir)
  assert.deepEqual(coverageDiff(features, dir), { missing: [], extra: [] })
  const without = features.filter((f) => f.id !== 'route:rest')
  assert.deepEqual(coverageDiff(without, dir).missing, ['axiomancer-mobile/app/rest/index.tsx'])
  const bogus = [...features, { id: 'route:gone', name: 'Gone', kind: 'route', group: 'world', source: 'axiomancer-mobile/app/gone/index.tsx' }]
  assert.deepEqual(coverageDiff(bogus, dir).extra, ['axiomancer-mobile/app/gone/index.tsx'])
  const doubled = [...features, features.find((f) => f.id === 'area:World')]
  assert.deepEqual(coverageDiff(doubled, dir).extra, ['axiomancer-mechanics/src/World'])
  const excluded = [...features, { id: 'area:Utils', name: 'Utils', kind: 'engine-area', group: 'engine', source: 'axiomancer-mechanics/src/Utils' }]
  assert.deepEqual(coverageDiff(excluded, dir).extra, ['axiomancer-mechanics/src/Utils'])
})

test('flow edges: literal, followed and shell navigation, and the tab bar', () => {
  const dir = makeFixture()
  const list = edges(dir)
  const flow = list.filter((e) => e.kind === 'flow')
  assert.ok(has(flow, { kind: 'flow', from: 'route:index', to: 'route:saves', file: 'axiomancer-mobile/app/index.tsx' }))
  assert.ok(has(flow, { kind: 'flow', from: 'route:index', to: 'route:village', file: 'axiomancer-mobile/app/index.tsx' }), 'a template href is followed to its declaration')
  for (const from of ['route:index', 'route:saves', 'route:village', 'route:(tabs)/deck']) {
    assert.ok(has(flow, { kind: 'flow', from, to: 'route:rest', file: 'axiomancer-mobile/components/Gate.tsx' }), `the shell gate fires from ${from}`)
  }
  assert.ok(!has(flow, { kind: 'flow', from: 'route:rest', to: 'route:rest' }), 'no self edge')
  assert.ok(has(flow, { kind: 'flow', from: 'route:(tabs)/deck', to: 'route:(tabs)/map', file: 'axiomancer-mobile/app/(tabs)/_layout.tsx' }))
  assert.ok(has(flow, { kind: 'flow', from: 'route:(tabs)/map', to: 'route:(tabs)/deck', file: 'axiomancer-mobile/app/(tabs)/_layout.tsx' }))
  assert.ok(!flow.some((e) => e.file === 'axiomancer-mobile/lib/router.ts'), 'a comment is not a navigation call')
})

test('coupling edges: route to area through the barrel and through its modules, area to area, tests and tooling ignored', () => {
  const dir = makeFixture()
  const coupling = edges(dir).filter((e) => e.kind === 'coupling')
  assert.ok(has(coupling, { kind: 'coupling', from: 'route:saves', to: 'area:Character', file: 'axiomancer-mobile/app/saves/index.tsx' }))
  assert.ok(has(coupling, { kind: 'coupling', from: 'route:saves', to: 'area:World', file: 'axiomancer-mobile/components/Panel.tsx' }))
  assert.ok(has(coupling, { kind: 'coupling', from: 'area:Character', to: 'area:World', file: 'axiomancer-mechanics/src/Character/index.ts' }))
  assert.ok(!has(coupling, { kind: 'coupling', from: 'area:Character', to: 'area:Combat' }), 'a test file import is not coupling')
  assert.ok(!has(coupling, { kind: 'coupling', from: 'route:(tabs)/deck', to: 'area:Combat' }), 'a route test is not coupling')
  assert.ok(!coupling.some((e) => e.to === 'area:Utils'), 'excluded folders are not edge ends')
})

test('determinism: two runs serialize to identical bytes, sorted and deduped', () => {
  const dir = makeFixture()
  const a = serialize(buildFeatureMap(dir))
  const b = serialize(buildFeatureMap(dir))
  assert.equal(a, b)
  assert.ok(a.endsWith('}\n') && !a.includes('\r'))
  assert.ok(a.startsWith('{\n  "version": 1,\n'))
  const map = JSON.parse(a)
  const keys = map.edges.map((e) => [e.kind, e.from, e.to, e.file].join('\u0000'))
  assert.deepEqual(keys, [...new Set(keys)].sort())
  assert.deepEqual(map.features.map((f) => f.id), map.features.map((f) => f.id).sort())
  assert.deepEqual(Object.keys(map.edges[0]), ['kind', 'from', 'to', 'file'])
  assert.deepEqual(Object.keys(map.features[0]), ['id', 'name', 'kind', 'group', 'source'])
})

test('--check: fails with no output, passes after a write, fails again on drift', () => {
  const dir = makeFixture()
  const write = process.stderr.write
  process.stderr.write = () => true
  try {
    assert.equal(main(['--check'], dir), 1)
    assert.equal(main([], dir), 0)
    assert.equal(main(['--check'], dir), 0)
    fs.mkdirSync(path.join(dir, 'axiomancer-mobile/app/cache'))
    fs.writeFileSync(path.join(dir, 'axiomancer-mobile/app/cache/index.tsx'), 'export default function C() { return null }\n')
    assert.equal(main(['--check'], dir), 1)
  } finally {
    process.stderr.write = write
  }
})
