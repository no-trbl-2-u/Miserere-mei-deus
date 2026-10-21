// scripts/feature-map.evidence.test.mjs — the feature map's names and evidence flags.
//
//   node --test scripts/feature-map.evidence.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { OUT_PATH, buildFeatureMap } from './feature-map.mjs'
import { listSource, namesTerm, pitchFlag } from './feature-map.evidence.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const FIXTURE = {
  'axiomancer-mobile/app/_layout.tsx': `export default function L() { return null }\n`,
  'axiomancer-mobile/app/index.tsx': `const router = { push(_h: string) {} }\nexport default function I() { router.push('/rest'); router.push('/village'); return null }\n`,
  'axiomancer-mobile/app/rest/index.tsx': `import { RestPanel } from '@/components/RestPanel'\nimport { w } from '@mechanics/World/w'\nexport default function R() { return RestPanel(w) }\n`,
  'axiomancer-mobile/app/village/index.tsx': `export default function V() { return null }\n`,
  'axiomancer-mobile/app/orphan/index.tsx': `export default function O() { return null }\n`,
  'axiomancer-mobile/components/RestPanel.tsx': `export function RestPanel(_w: number) { return null }\n`,
  'axiomancer-mobile/components/__tests__/RestPanel.test.tsx': `import { RestPanel } from '../RestPanel'\ntest('x', () => RestPanel(1))\n`,
  'axiomancer-mobile/app/village/__tests__/village.test.tsx': `test('route', () => expect('/village').toBeTruthy())\nconst p = \`\${dir}/orphan\`\n`,
  'axiomancer-mobile/scripts/walk-e2e.mjs': [
    'await page.goto(`${baseUrl}/`)',
    'await page.goto(`${baseUrl}/rest`)',
    'const shot = `${outDir}/orphan`',
    "const parts = shot.split('/')",
    '',
  ].join('\n'),
  'axiomancer-mobile/scripts/helper.mjs': `export const where = '/village'\n`,
  'axiomancer-mechanics/src/World/w.ts': `import { c } from '../Cards/c'\nexport const w = c\n`,
  'axiomancer-mechanics/src/World/w.test.ts': `import { w } from './w'\n`,
  'axiomancer-mechanics/src/Cards/c.ts': `export const c = 1\n`,
  'axiomancer-mechanics/src/Log/l.ts': `export const l = 1\n`,
  'scripts/feature-map.names.json': JSON.stringify({
    'route:rest': { name: 'Rest', aliases: ['RestChoice'] },
    'area:World': { name: 'The world', aliases: ['Lantern Deep'] },
  }),
  'braindump/2026-01-01-pitch.md': '# A pitch\n\nThe Lantern Deep gets a second stair. Take the rest of the day off.\n',
  'plan/x.decisions.md': 'The Village preamble is not a decision.\n\n**D3 — RestChoice offers one choice.** Heal or cut.\n\n**D4 — Cards stay put.** Nothing else.\n',
}

function makeFixture(extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-evidence-'))
  for (const [rel, text] of Object.entries({ ...FIXTURE, ...extra })) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), text)
  }
  return dir
}

const byId = (map) => Object.fromEntries(map.features.map((f) => [f.id, f]))

test('names: an aliased feature takes its display name, an unaliased one keeps its path name', () => {
  const f = byId(buildFeatureMap(makeFixture()))
  assert.equal(f['route:rest'].name, 'Rest')
  assert.equal(f['route:rest'].named, true)
  assert.equal(f['area:World'].name, 'The world')
  assert.equal(f['area:World'].named, true)
  assert.equal(f['route:village'].name, 'Village')
  assert.equal(f['route:village'].named, false)
  assert.deepEqual(Object.keys(f['route:rest']), ['id', 'name', 'kind', 'group', 'source', 'named', 'reachable', 'driven', 'tested', 'needsPitch'])
})

test('names: a table entry for a feature that does not exist fails the run', () => {
  const dir = makeFixture({ 'scripts/feature-map.names.json': JSON.stringify({ 'route:gone': { name: 'Gone' } }) })
  assert.throws(() => buildFeatureMap(dir), /route:gone, which is not a feature/)
})

test('reachable: a flow path from index for routes, a coupling path for areas, with the path as source', () => {
  const f = byId(buildFeatureMap(makeFixture()))
  assert.deepEqual(f['route:index'].reachable, { value: true, source: 'entry route' })
  assert.deepEqual(f['route:rest'].reachable, { value: true, source: 'flow path from route:index: route:index -> route:rest' })
  assert.deepEqual(f['route:orphan'].reachable, { value: false, source: 'no flow path from route:index' })
  assert.deepEqual(f['area:World'].reachable, { value: true, source: 'coupling path from a reachable route: route:rest -> area:World' })
  assert.deepEqual(f['area:Cards'].reachable, { value: true, source: 'coupling path from a reachable route: route:rest -> area:World -> area:Cards' })
  assert.deepEqual(f['area:Log'].reachable, { value: false, source: 'no coupling path from a reachable route' })
})

test('driven: a driver names the href; a non-driver, a non-URL interpolation and a bare slash do not count', () => {
  const f = byId(buildFeatureMap(makeFixture()))
  const driver = 'axiomancer-mobile/scripts/walk-e2e.mjs'
  assert.deepEqual(f['route:rest'].driven, { value: true, source: driver })
  assert.deepEqual(f['route:index'].driven, { value: true, source: driver }, '`${baseUrl}/` is the entry route')
  assert.deepEqual(f['route:village'].driven, { value: false, source: null }, 'helper.mjs is not a driver')
  assert.deepEqual(f['route:orphan'].driven, { value: false, source: null }, '`${outDir}/orphan` is a file path')
  assert.deepEqual(f['area:World'].driven, { value: true, source: driver }, 'a driven route couples to it')
  assert.deepEqual(f['area:Cards'].driven, { value: false, source: null }, 'only direct route coupling counts')
})

test('tested: a test imports the route file or its own module, names its href, or imports the area', () => {
  const f = byId(buildFeatureMap(makeFixture()))
  assert.deepEqual(f['route:rest'].tested, { value: true, source: 'axiomancer-mobile/components/__tests__/RestPanel.test.tsx' })
  assert.deepEqual(f['route:village'].tested, { value: true, source: 'axiomancer-mobile/app/village/__tests__/village.test.tsx' })
  assert.deepEqual(f['route:orphan'].tested, { value: false, source: null })
  assert.deepEqual(f['area:World'].tested, { value: true, source: 'axiomancer-mechanics/src/World/w.test.ts' })
  assert.deepEqual(f['area:Log'].tested, { value: false, source: null })
})

test('needsPitch: named by an alias only, by a D-number, by its path name, and not named at all', () => {
  const f = byId(buildFeatureMap(makeFixture()))
  assert.deepEqual(f['area:World'].needsPitch, { value: false, missing: null, source: 'braindump/2026-01-01-pitch.md' }, 'named only through the alias "Lantern Deep"')
  assert.deepEqual(f['route:rest'].needsPitch, { value: false, missing: null, source: 'plan/x.decisions.md D3' }, '"the rest of" is not "Rest"; RestChoice in D3 is')
  assert.deepEqual(f['area:Cards'].needsPitch, { value: false, missing: null, source: 'plan/x.decisions.md D4' })
  assert.equal(f['route:village'].needsPitch.value, true, 'a preamble outside any D-number does not count')
  assert.equal(f['route:village'].needsPitch.source, null)
  assert.match(f['route:village'].needsPitch.missing, /no braindump\/ pitch file and no plan\/\*\.decisions\.md D-number names it \("Village"\)/)
  assert.match(f['area:Log'].needsPitch.missing, /\("Log"\)/)
})

test('helpers: word matching is case-sensitive and whole-word; source lists cap at three', () => {
  assert.ok(namesTerm('The Anvil hones.', 'Anvil'))
  assert.ok(!namesTerm('Anvils', 'Anvil'))
  assert.ok(!namesTerm('the rest of it', 'Rest'))
  assert.ok(namesTerm('a loot-cache node', 'loot-cache'))
  assert.deepEqual(pitchFlag(['X'], []), { value: true, missing: 'no braindump/ pitch file and no plan/*.decisions.md D-number names it ("X")', source: null })
  assert.equal(listSource([], undefined), null)
  assert.equal(listSource(['d', 'a', 'c', 'b']), 'a, b, c, ...')
  assert.equal(listSource(['b', 'a', 'a']), 'a, b')
})

test('the committed map carries every flag with its source on every feature', () => {
  const committed = JSON.parse(fs.readFileSync(path.join(ROOT, OUT_PATH), 'utf8'))
  for (const f of committed.features) {
    assert.equal(typeof f.named, 'boolean', f.id)
    for (const flag of ['reachable', 'driven', 'tested', 'needsPitch']) {
      assert.equal(typeof f[flag].value, 'boolean', `${f.id} ${flag}`)
      assert.ok('source' in f[flag], `${f.id} ${flag} has a source`)
    }
    assert.equal(f.needsPitch.value, f.needsPitch.missing !== null, `${f.id} needsPitch names its missing evidence exactly when set`)
    if (f.reachable.value || f.id === 'route:index') assert.ok(f.reachable.source)
  }
})
