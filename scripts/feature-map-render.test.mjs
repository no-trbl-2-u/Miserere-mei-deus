// scripts/feature-map-render.test.mjs — the feature map's README and canvas.
//
//   node --test scripts/feature-map-render.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CANVAS_PATH, COLORS, FEATURES_PATH, GAME_MODEL_PATH, README_PATH, TABLE_END, TABLE_START,
  anomalies, canvasProblems, drawnEdges, main, renderCanvas, renderCanvasObject, renderReadme,
} from './feature-map-render.mjs'
import { featureTable } from './vault.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ev = (value) => ({ value, source: 'fixture' })

/** A features.json carrying the evidence fields. */
const MAP = {
  version: 1,
  features: [
    { id: 'area:Combat', name: 'A fight', kind: 'engine-area', group: 'engine', source: 'axiomancer-mechanics/src/Combat', named: true, reachable: ev(true), driven: ev(true), tested: ev(true), needsPitch: { value: false, missing: [], source: 'fixture' } },
    { id: 'area:World', name: 'World', kind: 'engine-area', group: 'engine', source: 'axiomancer-mechanics/src/World', named: false, reachable: ev(true), driven: ev(false), tested: ev(true), needsPitch: { value: true, missing: ['no braindump pitch', 'no decision'], source: 'fixture' } },
    { id: 'route:(tabs)/deck', name: 'Deck', kind: 'route', group: 'tabs', source: 'axiomancer-mobile/app/(tabs)/deck/index.tsx', named: true, reachable: ev(true), driven: ev(true), tested: ev(false), needsPitch: { value: false, missing: [], source: 'fixture' } },
    { id: 'route:(tabs)/map', name: 'Map', kind: 'route', group: 'tabs', source: 'axiomancer-mobile/app/(tabs)/map/index.tsx', named: true, reachable: ev(true), driven: ev(true), tested: ev(true), needsPitch: { value: false, missing: [], source: 'fixture' } },
    { id: 'route:index', name: 'Title', kind: 'route', group: 'world', source: 'axiomancer-mobile/app/index.tsx', aliases: ['The foes'], named: true, reachable: ev(true), driven: ev(true), tested: ev(true), needsPitch: { value: false, missing: [], source: 'fixture' } },
    { id: 'route:rest', name: 'Rest | camp', kind: 'route', group: 'world', source: 'axiomancer-mobile/app/rest/index.tsx', named: true, reachable: ev(true), driven: ev(false), tested: ev(false), needsPitch: { value: true, missing: 'no braindump pitch', source: 'fixture' } },
    { id: 'route:hazard', name: 'Hazard', kind: 'route', group: 'minigames', source: 'axiomancer-mobile/app/hazard/index.tsx', named: true, reachable: ev(false), driven: ev(false), tested: ev(true), needsPitch: { value: true, missing: [], source: 'fixture' } },
    { id: 'route:devart', name: 'Devart', kind: 'dev-route', group: 'dev', source: 'axiomancer-mobile/app/devart/index.tsx', named: false, reachable: ev(true), driven: ev(false), tested: ev(false), needsPitch: { value: false, missing: [], source: 'fixture' } },
  ],
  edges: [
    { kind: 'flow', from: 'route:index', to: 'route:rest', file: 'axiomancer-mobile/app/index.tsx' },
    { kind: 'flow', from: 'route:index', to: 'route:rest', file: 'axiomancer-mobile/lib/go.ts' },
    { kind: 'flow', from: 'route:index', to: 'route:devart', file: 'axiomancer-mobile/app/index.tsx' },
    { kind: 'flow', from: 'route:(tabs)/deck', to: 'route:(tabs)/map', file: 'axiomancer-mobile/app/(tabs)/_layout.tsx' },
    { kind: 'flow', from: 'route:(tabs)/map', to: 'route:(tabs)/deck', file: 'axiomancer-mobile/app/(tabs)/_layout.tsx' },
    { kind: 'flow', from: 'route:(tabs)/deck', to: 'route:hazard', file: 'axiomancer-mobile/components/HazardGate.tsx' },
    { kind: 'flow', from: 'route:rest', to: 'route:hazard', file: 'axiomancer-mobile/components/HazardGate.tsx' },
    { kind: 'flow', from: 'route:hazard', to: 'route:hazard', file: 'axiomancer-mobile/app/hazard/index.tsx' },
    { kind: 'flow', from: 'route:rest', to: 'route:index', file: 'axiomancer-mobile/components/item-reward/ItemRewardGate.tsx' },
    { kind: 'coupling', from: 'route:rest', to: 'area:World', file: 'axiomancer-mobile/app/rest/index.tsx' },
    { kind: 'coupling', from: 'route:rest', to: 'area:World', file: 'axiomancer-mobile/components/Rest.tsx' },
    { kind: 'coupling', from: 'area:World', to: 'area:Combat', file: 'axiomancer-mechanics/src/World/a.ts' },
    { kind: 'coupling', from: 'area:Combat', to: 'area:World', file: 'axiomancer-mechanics/src/Combat/b.ts' },
  ],
}

/** The same features as the inventory pass writes them, before evidence. */
const BARE = {
  version: 1,
  features: MAP.features.map(({ id, name, kind, group, source }) => ({ id, name, kind, group, source })),
  edges: MAP.edges,
}

const GAME_MODEL = ['# Game model', '', '## Cards', 'x', '## A fight', '## The foes', '## The world', '## What the game does not have', '## Where this comes from', ''].join('\n')

const tableRows = (readme) => featureTable(readme).split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Feature'))

test('README: markers once each, on their own lines, one table row per feature, honoured by vault.mjs', () => {
  const readme = renderReadme(MAP, GAME_MODEL)
  const lines = readme.split('\n')
  assert.equal(lines.filter((l) => l === TABLE_START).length, 1)
  assert.equal(lines.filter((l) => l === TABLE_END).length, 1)
  assert.ok(lines.indexOf(TABLE_START) < lines.indexOf(TABLE_END))
  assert.equal(tableRows(readme).length, MAP.features.length)
  assert.ok(readme.indexOf('## Anomalies') > readme.indexOf(TABLE_END), 'the anomaly list comes after the table')
})

test('README: rows in group order with flags, kind and the missing pitch evidence', () => {
  const rows = tableRows(renderReadme(MAP, GAME_MODEL))
  assert.deepEqual(rows.map((r) => r.split(' | ')[0].slice(2)), ['Deck', 'Map', 'Title', 'Rest \\| camp', 'Hazard', 'A fight', 'World', 'Devart'])
  assert.equal(rows[0], '| Deck | route | yes | yes | no | no |')
  assert.equal(rows[3], '| Rest \\| camp | route | yes | no | no | yes: no braindump pitch |')
  assert.equal(rows[4], '| Hazard | route | no | no | yes | yes |')
  assert.equal(rows[6], '| World | engine area | yes | no | yes | yes: no braindump pitch; no decision |')
  assert.equal(rows[7], '| Devart | dev route | yes | no | no | no |')
})

test('README: a features.json without evidence renders every flag as unknown', () => {
  const readme = renderReadme(BARE, GAME_MODEL)
  const rows = tableRows(readme)
  assert.equal(rows.length, BARE.features.length)
  for (const r of rows) assert.match(r, /\| unknown \| unknown \| unknown \| unknown \|$/)
  assert.match(readme, /### Built but unreachable\n\n- unknown:/)
  assert.match(readme, /## Unnamed features\n\n[^\n]*\n\n- unknown:/)
})

test('anomalies: unreachable routes, dead ends past the shell gates, unmatched game-model sections', () => {
  const a = anomalies(MAP, GAME_MODEL)
  assert.deepEqual(a.unreachable.map((f) => f.id), ['route:hazard'])
  // rest leaves only through a gate, hazard only to itself, devart not at all; deck and map link through the tab bar.
  assert.deepEqual(a.deadEnds.map((f) => f.id), ['route:rest', 'route:hazard', 'route:devart'])
  // "A fight" is a feature name, "The foes" an alias; the two skipped sections never count.
  assert.deepEqual(a.unmatched, ['Cards', 'The world'])
  const readme = renderReadme(MAP, GAME_MODEL)
  assert.match(readme, /### Built but unreachable\n\n- Hazard \(`route:hazard`\)\n/)
  assert.match(readme, /## Unnamed features\n\n[^\n]*\n\n- World \(`area:World`\)\n- Devart \(`route:devart`\)\n/)
})

test('canvas: valid JSON Canvas, one text node per feature, one group node per group', () => {
  const canvas = JSON.parse(renderCanvas(MAP))
  assert.deepEqual(canvasProblems(canvas), [])
  const featureNodes = canvas.nodes.filter((n) => n.type === 'text' && n.id !== 'legend')
  assert.deepEqual(featureNodes.map((n) => n.id).sort(), MAP.features.map((f) => f.id).sort())
  const groups = canvas.nodes.filter((n) => n.type === 'group')
  assert.deepEqual(groups.map((g) => g.label), ['Tabs', 'World routes', 'Minigames', 'Engine areas', 'Dev routes'])
  for (const n of featureNodes) {
    const g = groups.find((x) => x.id === `group:${MAP.features.find((f) => f.id === n.id).group}`)
    assert.ok(n.x >= g.x && n.y >= g.y && n.x + n.width <= g.x + g.width && n.y + n.height <= g.y + g.height, `${n.id} sits inside ${g.id}`)
  }
  for (const n of canvas.nodes) assert.doesNotMatch(n.text || n.label || '', /\d/, `no numbers on the map (${n.id})`)
})

test('canvas: node colour marks needsPitch, absent evidence leaves the node uncoloured', () => {
  const byId = Object.fromEntries(renderCanvasObject(MAP).nodes.map((n) => [n.id, n]))
  assert.equal(byId['area:World'].color, COLORS.needsPitch)
  assert.equal(byId['route:hazard'].color, COLORS.needsPitch)
  assert.equal(byId['area:Combat'].color, COLORS.pitched)
  assert.match(byId['area:World'].text, /needs a pitch/)
  assert.match(byId['route:hazard'].text, /opens from any screen/)
  const bare = renderCanvasObject(BARE).nodes.filter((n) => n.type === 'text' && n.id !== 'legend')
  for (const n of bare) assert.equal(n.color, undefined)
})

test('canvas: edges coloured by kind, shell gates and self loops dropped, one edge per pair', () => {
  const canvas = renderCanvasObject(MAP)
  assert.notEqual(COLORS.flow, COLORS.coupling)
  const ids = canvas.edges.map((e) => e.id)
  assert.deepEqual(ids, [
    'coupling:area:Combat->area:World',
    'coupling:route:rest->area:World',
    'flow:route:(tabs)/deck->route:(tabs)/map',
    'flow:route:index->route:devart',
    'flow:route:index->route:rest',
  ])
  for (const e of canvas.edges) assert.equal(e.color, e.id.startsWith('flow:') ? COLORS.flow : COLORS.coupling)
  const both = canvas.edges.filter((e) => e.fromEnd === 'arrow').map((e) => e.id)
  assert.deepEqual(both, ['coupling:area:Combat->area:World', 'flow:route:(tabs)/deck->route:(tabs)/map'])
  assert.equal(drawnEdges(MAP).length, canvas.edges.length)
})

test('canvas: layout is deterministic and independent of input order', () => {
  const shuffled = { ...MAP, features: [...MAP.features].reverse(), edges: [...MAP.edges].reverse() }
  assert.equal(renderCanvas(MAP), renderCanvas(MAP))
  assert.equal(renderCanvas(shuffled), renderCanvas(MAP))
  assert.equal(renderReadme(shuffled, GAME_MODEL), renderReadme(MAP, GAME_MODEL))
})

test('canvasProblems catches a broken canvas', () => {
  const canvas = renderCanvasObject(MAP)
  canvas.nodes.push({ ...canvas.nodes[1] })
  canvas.edges.push({ id: 'bad', fromNode: 'nowhere', toNode: 'route:index', color: '9' })
  const problems = canvasProblems(canvas)
  assert.ok(problems.some((p) => p.startsWith('duplicate id')))
  assert.ok(problems.some((p) => p.includes('unknown fromNode nowhere')))
  assert.ok(problems.some((p) => p.includes('bad color 9')))
})

test('main: writes both files, --check passes on a fresh render and fails on drift', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-render-'))
  fs.mkdirSync(path.join(dir, 'docs', 'feature-map'), { recursive: true })
  fs.writeFileSync(path.join(dir, FEATURES_PATH), JSON.stringify(MAP))
  fs.writeFileSync(path.join(dir, GAME_MODEL_PATH), GAME_MODEL)
  const log = console.log
  const error = console.error
  console.log = () => {}
  console.error = () => {}
  try {
    assert.equal(main(['--check'], dir), 1, 'missing outputs are stale')
    assert.equal(main([], dir), 0)
    assert.equal(main(['--check'], dir), 0)
    fs.appendFileSync(path.join(dir, README_PATH), 'edited by hand\n')
    assert.equal(main(['--check'], dir), 1)
    main([], dir)
    fs.writeFileSync(path.join(dir, CANVAS_PATH), '{}\n')
    assert.equal(main(['--check'], dir), 1)
  } finally {
    console.log = log
    console.error = error
  }
})

test('the committed README and canvas are a fresh render of the committed features.json', () => {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, FEATURES_PATH), 'utf8'))
  const canvas = JSON.parse(fs.readFileSync(path.join(ROOT, CANVAS_PATH), 'utf8'))
  assert.deepEqual(canvasProblems(canvas), [])
  assert.equal(canvas.nodes.filter((n) => n.type === 'text' && n.id !== 'legend').length, map.features.length)
  assert.equal(tableRows(fs.readFileSync(path.join(ROOT, README_PATH), 'utf8')).length, map.features.length)
})
