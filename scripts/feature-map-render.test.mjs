// scripts/feature-map-render.test.mjs — the feature map's README, canvas and notes.
//
//   node --test scripts/feature-map-render.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CANVAS_PATH, COLORS, FEATURES_PATH, GAME_MODEL_PATH, GROUPS, NAMES_PATH, NOTES_DIR, README_PATH, TABLE_END, TABLE_START,
  anomalies, canvasProblems, drawnEdges, isGeneratedNote, isGroupCanvas, main, noteStems, renderCanvas, renderGroupCanvasObject,
  renderGroupCanvases, renderNotes, renderOverviewObject, renderReadme, renderedCanvasProblems, render, safeFileName, vaultPath,
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

test('anomalies: a section named only through the alias table matches its feature', () => {
  const names = { 'area:World': { name: 'World', aliases: ['the world', 'region'] } }
  assert.deepEqual(anomalies(MAP, GAME_MODEL, names).unmatched, ['Cards'])
  assert.match(renderReadme(MAP, GAME_MODEL, names), /match no feature\n\n- Cards\n\n/)
})

const fileNodes = (canvas) => canvas.nodes.filter((n) => n.type === 'file')
const generatedFiles = (map) => new Set([...Object.keys(renderNotes(map)), ...Object.keys(renderGroupCanvases(map))].map(vaultPath))

test('overview: valid, one file node per group opening its group canvas, a legend, no feature node', () => {
  const canvas = JSON.parse(renderCanvas(MAP))
  assert.deepEqual(canvasProblems(canvas, generatedFiles(MAP)), [])
  assert.deepEqual(fileNodes(canvas).map((n) => n.file), [
    'Features/Tabs.canvas', 'Features/World routes.canvas', 'Features/Minigames.canvas', 'Features/Engine areas.canvas', 'Features/Dev routes.canvas',
  ])
  assert.deepEqual(canvas.nodes.filter((n) => n.type !== 'file').map((n) => n.id), ['legend'])
  for (const f of MAP.features) assert.ok(!canvas.nodes.some((n) => n.id === f.id), `no node for ${f.id}`)
  for (const n of canvas.nodes) assert.doesNotMatch(n.text || n.label || '', /\d/, `no numbers on the map (${n.id})`)
})

test('overview: one flow edge per ordered group pair with a drawn flow edge, no coupling, no shell gate', () => {
  const canvas = renderOverviewObject(MAP)
  // index->rest stays in world, deck<->map in tabs; index->devart leaves world for dev; the gate edges into hazard are not drawn.
  assert.deepEqual(canvas.edges.map((e) => e.id), ['flow:group:world->group:dev'])
  const both = { ...MAP, edges: [...MAP.edges, { kind: 'flow', from: 'route:devart', to: 'route:index', file: 'x.tsx' }, { kind: 'flow', from: 'route:rest', to: 'route:(tabs)/map', file: 'y.tsx' }] }
  assert.deepEqual(renderOverviewObject(both).edges.map((e) => e.id), ['flow:group:world->group:tabs', 'flow:group:world->group:dev', 'flow:group:dev->group:world'])
  for (const e of renderOverviewObject(both).edges) {
    assert.equal(e.color, COLORS.flow)
    assert.equal(e.fromEnd, undefined, 'each direction is its own edge')
  }
})

test('group canvas: one file card per member opening its note, inside the group node, coloured by pitch', () => {
  const canvas = renderGroupCanvasObject(MAP, 'world')
  assert.deepEqual(canvasProblems(canvas, generatedFiles(MAP)), [])
  const group = canvas.nodes.find((n) => n.id === 'group:world')
  assert.equal(group.label, 'World routes')
  const members = fileNodes(canvas).filter((n) => !n.id.startsWith('elsewhere:'))
  assert.deepEqual(members.map((n) => n.file), ['Features/Title.md', 'Features/Rest - camp.md'])
  for (const n of members) assert.ok(n.x >= group.x && n.y >= group.y && n.x + n.width <= group.x + group.width && n.y + n.height <= group.y + group.height, `${n.id} sits inside the group`)
  const byId = Object.fromEntries(canvas.nodes.map((n) => [n.id, n]))
  assert.equal(byId['route:rest'].color, COLORS.needsPitch)
  assert.equal(byId['route:index'].color, COLORS.pitched)
  for (const n of fileNodes(renderGroupCanvasObject(BARE, 'world'))) assert.equal(n.color, undefined)
})

test('group canvas: flow edges between members, both-way pairs merged, no coupling and no shell gate', () => {
  const tabs = renderGroupCanvasObject(MAP, 'tabs')
  assert.deepEqual(tabs.edges.map((e) => [e.id, e.fromEnd]), [['flow:route:(tabs)/deck->route:(tabs)/map', 'arrow']])
  assert.deepEqual(renderGroupCanvasObject(MAP, 'engine').edges, [], 'the engine areas only couple')
  assert.deepEqual(renderGroupCanvasObject(MAP, 'minigames').edges, [], 'hazard is reached only by a shell gate')
  for (const g of GROUPS) for (const e of renderGroupCanvasObject(MAP, g.id).edges) assert.equal(e.color, COLORS.flow)
})

test('group canvas: flow that leaves the group ends on an outside card in the Elsewhere column', () => {
  const world = renderGroupCanvasObject(MAP, 'world')
  const elsewhere = world.nodes.find((n) => n.id === 'elsewhere')
  assert.equal(elsewhere.label, 'Elsewhere')
  assert.ok(elsewhere.x > world.nodes.find((n) => n.id === 'group:world').width, 'a column apart')
  const away = fileNodes(world).filter((n) => n.id.startsWith('elsewhere:'))
  assert.deepEqual(away.map((n) => n.file), ['Features/Devart.md'])
  for (const n of away) assert.ok(n.x >= elsewhere.x && n.y + n.height <= elsewhere.y + elsewhere.height)
  assert.deepEqual(world.edges.map((e) => e.id), ['flow:route:index->elsewhere:route:devart', 'flow:route:index->route:rest'])
  // dev only receives a one-way edge from world, so it has no Elsewhere column; a both-way one shows from both sides.
  assert.equal(renderGroupCanvasObject(MAP, 'dev').nodes.some((n) => n.id === 'elsewhere'), false)
  const both = { ...MAP, edges: [...MAP.edges, { kind: 'flow', from: 'route:devart', to: 'route:index', file: 'x.tsx' }] }
  assert.deepEqual(renderGroupCanvasObject(both, 'dev').edges.map((e) => [e.id, e.fromEnd]), [['flow:route:devart->elsewhere:route:index', 'arrow']])
})

test('group canvases: one per group with a feature, at Features/<group label>.canvas, owned by the renderer', () => {
  const canvases = renderGroupCanvases(MAP)
  assert.deepEqual(Object.keys(canvases), GROUPS.map((g) => `${NOTES_DIR}/${g.label}.canvas`))
  for (const rel of Object.keys(canvases)) assert.ok(isGroupCanvas(rel), rel)
  assert.equal(isGroupCanvas(`${NOTES_DIR}/Mine.canvas`), false)
  assert.equal(isGroupCanvas(`${NOTES_DIR}/Tabs.md`), false)
  const files = generatedFiles(MAP)
  for (const text of Object.values(canvases)) assert.deepEqual(canvasProblems(JSON.parse(text), files), [])
})

test('canvases: deterministic and independent of input order', () => {
  const shuffled = { ...MAP, features: [...MAP.features].reverse(), edges: [...MAP.edges].reverse() }
  assert.equal(renderCanvas(MAP), renderCanvas(MAP))
  assert.equal(renderCanvas(shuffled), renderCanvas(MAP))
  assert.deepEqual(renderGroupCanvases(shuffled), renderGroupCanvases(MAP))
  assert.equal(renderReadme(shuffled, GAME_MODEL), renderReadme(MAP, GAME_MODEL))
})

test('canvasProblems catches a broken canvas and a file node naming no generated file', () => {
  const canvas = renderGroupCanvasObject(MAP, 'world')
  canvas.nodes.push({ ...canvas.nodes[1] })
  canvas.nodes.push({ id: 'nofile', type: 'file', x: 0, y: 0, width: 1, height: 1 })
  canvas.nodes.push({ id: 'stray', type: 'file', file: 'Features/Nowhere.md', x: 0, y: 0, width: 1, height: 1 })
  canvas.edges.push({ id: 'bad', fromNode: 'nowhere', toNode: 'route:index', color: '9' })
  const problems = canvasProblems(canvas, generatedFiles(MAP))
  assert.ok(problems.some((p) => p.startsWith('duplicate id')))
  assert.ok(problems.some((p) => p.includes('unknown fromNode nowhere')))
  assert.ok(problems.some((p) => p.includes('bad color 9')))
  assert.ok(problems.includes('node nofile: file node without a file'))
  assert.ok(problems.includes('node stray: file Features/Nowhere.md is not a generated file'))
  assert.equal(canvasProblems(canvas).some((p) => p.includes('stray')), false, 'without a file set only the shape is checked')
})

test('main: writes both files, --check passes on a fresh render and fails on drift', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-render-'))
  fs.mkdirSync(path.join(dir, 'docs', 'feature-map'), { recursive: true })
  fs.writeFileSync(path.join(dir, FEATURES_PATH), JSON.stringify(MAP))
  fs.writeFileSync(path.join(dir, GAME_MODEL_PATH), GAME_MODEL)
  fs.mkdirSync(path.join(dir, 'scripts'))
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
    main([], dir)
    fs.writeFileSync(path.join(dir, NAMES_PATH), JSON.stringify({ 'area:World': { name: 'World', aliases: ['Cards'] } }))
    assert.equal(main(['--check'], dir), 1, 'a new alias changes the anomaly list')
  } finally {
    console.log = log
    console.error = error
  }
})

test('the committed README and canvases are a fresh render of the committed features.json', () => {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, FEATURES_PATH), 'utf8'))
  const out = render(ROOT)
  assert.deepEqual(renderedCanvasProblems(out), [])
  const overview = JSON.parse(fs.readFileSync(path.join(ROOT, CANVAS_PATH), 'utf8'))
  assert.equal(fileNodes(overview).length, new Set(map.features.map((f) => f.group)).size)
  for (const [rel, text] of Object.entries(out)) if (rel.endsWith('.canvas')) assert.equal(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'), text, rel)
  const members = Object.keys(out).filter((rel) => rel.startsWith(`${NOTES_DIR}/`) && rel.endsWith('.canvas'))
    .flatMap((rel) => fileNodes(JSON.parse(out[rel])).filter((n) => !n.id.startsWith('elsewhere:')))
  assert.equal(members.length, map.features.length, 'every feature is a card in exactly one group canvas')
  assert.equal(tableRows(fs.readFileSync(path.join(ROOT, README_PATH), 'utf8')).length, map.features.length)
})

const note = (map, stem) => renderNotes(map)[`${NOTES_DIR}/${stem}.md`]
const section = (text, heading) => text.split(`## ${heading}\n\n`)[1].split('\n## ')[0]
const frontmatter = (text) => Object.fromEntries(
  text.split('---\n')[1].split('\n').filter((l) => /^\w+: /.test(l)).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 2)]),
)

test('notes: one per feature, in Features/, file names unique', () => {
  const notes = renderNotes(MAP)
  const paths = Object.keys(notes)
  assert.equal(paths.length, MAP.features.length)
  assert.equal(new Set(paths.map((p) => p.toLowerCase())).size, paths.length)
  for (const p of paths) assert.ok(p.startsWith(`${NOTES_DIR}/`) && p.endsWith('.md'), p)
  assert.ok(`${NOTES_DIR}/Rest - camp.md` in notes, 'the pipe in "Rest | camp" is made safe')
})

test('notes: the file-name rule replaces unsafe characters and a collision keeps both features', () => {
  assert.equal(safeFileName('A/b: c?  [d]#e^f|g*h"i<j>k\\l'), 'A-b- c- -d--e-f-g-h-i-j-k-l')
  assert.equal(safeFileName(' .Trailing. '), 'Trailing')
  assert.equal(safeFileName('///', 'route:x'), '---')
  assert.equal(safeFileName('...', 'route:x'), 'route-x')
  const map = {
    ...MAP,
    features: [
      ...MAP.features,
      { id: 'route:deck2', name: 'deck', kind: 'route', group: 'world', source: 'x' },
      { id: 'route:deck3', name: 'Deck ', kind: 'route', group: 'world', source: 'y' },
      { id: 'route:deck4', name: 'Deck?', kind: 'route', group: 'world', source: 'z' },
    ],
  }
  const stems = noteStems(map)
  assert.equal(stems.get('route:(tabs)/deck'), 'Deck', 'the first feature in map order keeps the name')
  assert.equal(stems.get('route:deck2'), 'deck (route-deck2)')
  assert.equal(stems.get('route:deck3'), 'Deck (route-deck3)', 'trimmed to a taken name')
  assert.equal(stems.get('route:deck4'), 'Deck-', 'made safe, and free')
  assert.equal(new Set([...stems.values()].map((s) => s.toLowerCase())).size, map.features.length)
  assert.equal(Object.keys(renderNotes(map)).length, map.features.length)
})

test('notes: frontmatter carries the flags, source, the marker and the group and pitch tags', () => {
  const rest = note(MAP, 'Rest - camp')
  assert.deepEqual(frontmatter(rest), {
    kind: '"route"', group: '"world"', reachable: '"yes"', driven: '"no"', tested: '"no"', needsPitch: '"yes"',
    source: '"axiomancer-mobile/app/rest/index.tsx"', generated: 'feature-map',
  })
  assert.match(rest, /\ntags:\n {2}- feature-map\/world\n {2}- needs-pitch\n---\n/)
  assert.match(note(MAP, 'Deck'), /\ntags:\n {2}- feature-map\/tabs\n---\n/, 'no needs-pitch tag when it has one')
  assert.ok(isGeneratedNote(rest))
  assert.match(rest, /Generated by `scripts\/feature-map-render\.mjs`/)
  for (const text of Object.values(renderNotes(BARE))) {
    const fm = frontmatter(text)
    for (const k of ['reachable', 'driven', 'tested', 'needsPitch']) assert.equal(fm[k], '"unknown"')
    assert.doesNotMatch(text, /needs-pitch/)
  }
})

test('notes: Leads to links exactly the drawn flow edges, both ends of a both-way pair', () => {
  const notes = renderNotes(MAP)
  const stems = noteStems(MAP)
  const fromNotes = []
  for (const f of MAP.features) {
    const links = [...section(notes[`${NOTES_DIR}/${stems.get(f.id)}.md`], 'Leads to').matchAll(/^- \[\[Features\/([^|\]]+)\|[^\]]+\]\]$/gm)]
    for (const [, stem] of links) fromNotes.push(`${f.id}->${[...stems].find(([, s]) => s === stem)[0]}`)
  }
  const drawn = drawnEdges(MAP).filter((e) => e.kind === 'flow').flatMap((e) => [`${e.from}->${e.to}`, ...(e.both ? [`${e.to}->${e.from}`] : [])])
  assert.deepEqual(fromNotes.sort(), drawn.sort())
  assert.equal(section(note(MAP, 'Map'), 'Leads to'), '- [[Features/Deck|Deck]]\n')
})

test('notes: a shell-gate target opens from any screen, a feature with no flow out says so', () => {
  assert.equal(section(note(MAP, 'Hazard'), 'Leads to'), 'Opens from any screen.\n\nNo player-flow edge leads out of it.\n')
  assert.equal(section(note(MAP, 'Title'), 'Leads to'), 'Opens from any screen.\n\n- [[Features/Rest - camp|Rest - camp]]\n- [[Features/Devart|Devart]]\n')
  assert.equal(section(note(MAP, 'Devart'), 'Leads to'), 'No player-flow edge leads out of it.\n')
  assert.doesNotMatch(note(MAP, 'Deck'), /Hazard/, 'the gate edge from deck is not a Leads to line')
})

test('notes: Uses lists coupling targets as plain text, never a link', () => {
  const uses = section(note(MAP, 'Rest - camp'), 'Uses')
  assert.match(uses, /^- World$/m)
  assert.equal(section(note(MAP, 'A fight'), 'Uses').includes('- World'), true, 'a both-way pair counts at both ends')
  for (const text of Object.values(renderNotes(MAP))) assert.doesNotMatch(section(text, 'Uses'), /\[\[/)
})

test('notes: the pitch section names the missing evidence', () => {
  assert.equal(section(note(MAP, 'World'), 'Pitch'), 'Needs a pitch. Missing: no braindump pitch; no decision\n')
  assert.equal(section(note(MAP, 'Hazard'), 'Pitch'), 'Needs a pitch.\n')
  assert.equal(section(note(MAP, 'Deck'), 'Pitch'), 'Has a pitch.\n')
  assert.equal(section(renderNotes(BARE)[`${NOTES_DIR}/Deck.md`], 'Pitch'), 'Not known yet.\n')
})

test('notes: deterministic and independent of input order', () => {
  const shuffled = { ...MAP, features: [...MAP.features].reverse(), edges: [...MAP.edges].reverse() }
  assert.deepEqual(renderNotes(shuffled), renderNotes(MAP))
})

test('main: --check fails on a stale note and an extra one; a write deletes only marked extras', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-notes-'))
  fs.mkdirSync(path.join(dir, 'docs', 'feature-map'), { recursive: true })
  fs.writeFileSync(path.join(dir, FEATURES_PATH), JSON.stringify(MAP))
  fs.writeFileSync(path.join(dir, GAME_MODEL_PATH), GAME_MODEL)
  const log = console.log
  const error = console.error
  console.log = () => {}
  console.error = () => {}
  try {
    assert.equal(main([], dir), 0)
    assert.equal(main(['--check'], dir), 0)
    const deck = path.join(dir, NOTES_DIR, 'Deck.md')
    fs.appendFileSync(deck, 'edited by hand\n')
    assert.equal(main(['--check'], dir), 1, 'a stale note')
    main([], dir)
    const gone = path.join(dir, NOTES_DIR, 'Gone.md')
    fs.writeFileSync(gone, '---\nkind: "route"\ngenerated: feature-map\n---\n\n# Gone\n')
    assert.equal(main(['--check'], dir), 1, 'an extra note')
    const mine = path.join(dir, NOTES_DIR, 'Mine.md')
    fs.writeFileSync(mine, '---\ngenerated: by-hand\n---\n\n# Mine\n\ngenerated: feature-map\n')
    assert.equal(main([], dir), 0)
    assert.equal(fs.existsSync(gone), false, 'a marked extra is deleted')
    assert.equal(fs.existsSync(mine), true, 'an unmarked extra is left')
    assert.equal(main(['--check'], dir), 1, 'and --check still names it')
  } finally {
    console.log = log
    console.error = error
  }
})

test('main: --check fails on a stale or extra group canvas; a write deletes a stale one and keeps a stray canvas', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-canvases-'))
  fs.mkdirSync(path.join(dir, 'docs', 'feature-map'), { recursive: true })
  fs.writeFileSync(path.join(dir, FEATURES_PATH), JSON.stringify(MAP))
  fs.writeFileSync(path.join(dir, GAME_MODEL_PATH), GAME_MODEL)
  const log = console.log
  const error = console.error
  console.log = () => {}
  console.error = () => {}
  try {
    assert.equal(main([], dir), 0)
    for (const g of GROUPS) assert.ok(fs.existsSync(path.join(dir, NOTES_DIR, `${g.label}.canvas`)), g.label)
    fs.writeFileSync(path.join(dir, NOTES_DIR, 'Tabs.canvas'), '{"nodes":[],"edges":[]}\n')
    assert.equal(main(['--check'], dir), 1, 'a stale group canvas')
    main([], dir)
    // Emptying the dev group leaves its canvas stale: the generator owns it, so a write deletes it.
    const noDev = { ...MAP, features: MAP.features.filter((f) => f.group !== 'dev') }
    fs.writeFileSync(path.join(dir, FEATURES_PATH), JSON.stringify(noDev))
    const stray = path.join(dir, NOTES_DIR, 'Mine.canvas')
    fs.writeFileSync(stray, '{"nodes":[],"edges":[]}\n')
    assert.equal(main(['--check'], dir), 1, 'an extra group canvas')
    assert.equal(main([], dir), 0)
    assert.equal(fs.existsSync(path.join(dir, NOTES_DIR, 'Dev routes.canvas')), false, 'the stale group canvas is deleted')
    assert.equal(fs.existsSync(stray), true, 'a canvas not named for a group is left')
  } finally {
    console.log = log
    console.error = error
  }
})

test('the committed notes are a fresh render, one per feature, beside the group canvases', () => {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, FEATURES_PATH), 'utf8'))
  const notes = renderNotes(map)
  const canvases = renderGroupCanvases(map)
  assert.deepEqual(fs.readdirSync(path.join(ROOT, NOTES_DIR)).sort(), [...Object.keys(notes), ...Object.keys(canvases)].map((p) => path.basename(p)).sort())
  for (const [rel, text] of Object.entries(notes)) assert.equal(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'), text, rel)
})
