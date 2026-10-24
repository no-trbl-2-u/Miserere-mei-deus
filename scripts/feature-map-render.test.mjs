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
  CANVAS_PATH, COLORS, FEATURES_PATH, GAME_MODEL_PATH, NAMES_PATH, NOTES_DIR, README_PATH, TABLE_END, TABLE_START,
  anomalies, canvasProblems, drawnEdges, isGeneratedNote, main, noteStems, renderCanvas, renderCanvasObject,
  renderNotes, renderReadme, safeFileName,
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

test('the committed README and canvas are a fresh render of the committed features.json', () => {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, FEATURES_PATH), 'utf8'))
  const canvas = JSON.parse(fs.readFileSync(path.join(ROOT, CANVAS_PATH), 'utf8'))
  assert.deepEqual(canvasProblems(canvas), [])
  assert.equal(canvas.nodes.filter((n) => n.type === 'text' && n.id !== 'legend').length, map.features.length)
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

test('the committed notes are a fresh render, one per feature', () => {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, FEATURES_PATH), 'utf8'))
  const notes = renderNotes(map)
  assert.deepEqual(fs.readdirSync(path.join(ROOT, NOTES_DIR)).sort(), Object.keys(notes).map((p) => path.basename(p)).sort())
  for (const [rel, text] of Object.entries(notes)) assert.equal(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'), text, rel)
})
