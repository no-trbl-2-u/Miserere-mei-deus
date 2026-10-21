#!/usr/bin/env node
// scripts/feature-map-render.mjs — the feature map's README and canvas.
//
//   node scripts/feature-map-render.mjs           # write docs/feature-map/README.md and Map.canvas
//   node scripts/feature-map-render.mjs --check   # exit 1 when either committed file differs from a fresh render
//
// Reads docs/feature-map/features.json (written by scripts/feature-map.mjs),
// docs/game-model.md and, when present, the alias table
// scripts/feature-map.names.json, and writes two files deterministically:
//
//   README.md   one table row per feature between the feature-table markers,
//               then the anomaly list and the unnamed features. The markers are
//               the contract with `node scripts/vault.mjs features`, which
//               copies the lines between them into the vault: each appears
//               exactly once, on a line of its own, start before end.
//   Map.canvas  JSON Canvas 1.0: one text node per feature inside one group node
//               per feature group, flow and coupling edges in two colours, and
//               the node colour marks whether the feature needs a pitch.
//
// The evidence fields (named, reachable, driven, tested, needsPitch) are added
// by the evidence pass; a field that is absent renders as "unknown", so the
// renderer works on a features.json that predates it.
//
// Readability on a phone: the shell gates (components/**/*Gate.tsx) put a flow
// edge from every route to each gate's target. Those edges are not drawn; the
// target's node says it opens from any screen instead. Every other edge is
// drawn once per pair of features, whatever number of files it was found in,
// and a pair linked both ways is one edge with an arrow at each end.
// No numbers and no specs on the map: names, flags and edges only.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const FEATURES_PATH = 'docs/feature-map/features.json'
export const GAME_MODEL_PATH = 'docs/game-model.md'
export const README_PATH = 'docs/feature-map/README.md'
export const CANVAS_PATH = 'docs/feature-map/Map.canvas'
/** The evidence pass's alias table, `{ "<feature id>": { name, aliases } }`; optional. */
export const NAMES_PATH = 'scripts/feature-map.names.json'

export const TABLE_START = '<!-- feature-table:start -->'
export const TABLE_END = '<!-- feature-table:end -->'

/** Groups top to bottom on the canvas, and their order in the table. */
export const GROUPS = [
  { id: 'tabs', label: 'Tabs' },
  { id: 'world', label: 'World routes' },
  { id: 'minigames', label: 'Minigames' },
  { id: 'engine', label: 'Engine areas' },
  { id: 'dev', label: 'Dev routes' },
]

export const KIND_LABEL = { route: 'route', 'dev-route': 'dev route', 'engine-area': 'engine area' }

/** game-model.md sections that describe no feature by design. */
export const GAME_MODEL_SKIP = ['What the game does not have', 'Where this comes from']

/** A flow edge found in one of these files is a shell gate: it leaves every route. */
export const SHELL_GATE_FILE = /^axiomancer-mobile\/components\/(?:[^/]+\/)*[A-Za-z]*Gate\.tsx$/

/** JSON Canvas preset colours: 1 red, 2 orange, 3 yellow, 4 green, 5 cyan, 6 purple. */
export const COLORS = { flow: '5', coupling: '6', needsPitch: '1', pitched: '4' }

export const LAYOUT = { columns: 3, nodeWidth: 260, nodeHeight: 90, gap: 40, padding: 40, groupGap: 120 }

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const groupIndex = (g) => {
  const i = GROUPS.findIndex((x) => x.id === g)
  return i === -1 ? GROUPS.length : i
}

/** Features in table and canvas order: by group, then by id. */
export function orderedFeatures(map) {
  return [...map.features].sort((a, b) => groupIndex(a.group) - groupIndex(b.group) || cmp(a.id, b.id))
}

/** A flag's value as yes, no or unknown. */
export function flag(field) {
  if (field && typeof field === 'object' && typeof field.value === 'boolean') return field.value ? 'yes' : 'no'
  if (typeof field === 'boolean') return field ? 'yes' : 'no'
  return 'unknown'
}

const missingList = (m) => (Array.isArray(m) ? m.filter(Boolean).map(String) : m ? [String(m)] : [])

/** The needs-a-pitch cell: yes with the missing evidence, no, or unknown. */
export function pitchCell(feature) {
  const v = flag(feature.needsPitch)
  if (v !== 'yes') return v
  const missing = missingList(feature.needsPitch.missing)
  return missing.length ? `yes: ${missing.join('; ')}` : 'yes'
}

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

export function isShellGateEdge(edge) {
  return edge.kind === 'flow' && SHELL_GATE_FILE.test(edge.file || '')
}

/** The `## ` section headings of game-model.md, minus GAME_MODEL_SKIP. */
export function gameModelSections(text) {
  return text
    .split(/\r?\n/)
    .flatMap((l) => (/^## /.test(l) ? [l.slice(3).trim()] : []))
    .filter((h) => !GAME_MODEL_SKIP.includes(h))
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** The names a feature answers to: its display name and its aliases, from the feature or the alias table. */
function namesOf(feature, names) {
  const own = Array.isArray(feature.aliases) ? feature.aliases : []
  const entry = names[feature.id]
  const table = entry && Array.isArray(entry.aliases) ? entry.aliases : []
  return [feature.name, ...own, ...table].map(norm).filter(Boolean)
}

/**
 * The A8 anomalies:
 *   unreachable  a route or dev route whose `reachable` is no; null when no
 *                feature carries reachability evidence yet;
 *   deadEnds     a route or dev route with no outgoing flow edge to another
 *                feature, shell gates aside (back is never an edge);
 *   unmatched    a game-model.md section whose heading is no feature's name
 *                or alias.
 */
export function anomalies(map, gameModelText, names = {}) {
  const routes = orderedFeatures(map).filter((f) => f.kind !== 'engine-area')
  const hasEvidence = map.features.some((f) => f.reachable !== undefined)
  const unreachable = hasEvidence ? routes.filter((f) => flag(f.reachable) === 'no') : null
  const exits = new Set(
    map.edges.filter((e) => e.kind === 'flow' && e.from !== e.to && !isShellGateEdge(e)).map((e) => e.from),
  )
  const deadEnds = routes.filter((f) => !exits.has(f.id))
  const known = new Set(map.features.flatMap((f) => namesOf(f, names)))
  const unmatched = gameModelSections(gameModelText).filter((h) => !known.has(norm(h)))
  return { unreachable, deadEnds, unmatched }
}

const bullets = (items, none) => (items.length ? items.map((s) => `- ${s}`) : [`- ${none}`])
const nameAndId = (f) => `${f.name} (\`${f.id}\`)`

export function renderReadme(map, gameModelText, names = {}) {
  const rows = orderedFeatures(map).map((f) =>
    `| ${cell(f.name)} | ${cell(KIND_LABEL[f.kind] || f.kind)} | ${flag(f.reachable)} | ${flag(f.driven)} | ${flag(f.tested)} | ${cell(pitchCell(f))} |`,
  )
  const a = anomalies(map, gameModelText, names)
  const unnamedKnown = map.features.some((f) => typeof f.named === 'boolean')
  const unnamed = orderedFeatures(map).filter((f) => f.named === false)
  const lines = [
    '# The feature map',
    '',
    'Generated by `scripts/feature-map-render.mjs` from `features.json`; do not edit.',
    'Every route of the app and every engine area, with its evidence flags and whether it still needs a pitch.',
    'The picture is `Map.canvas` (copied into the vault as `Feature Map.canvas`).',
    'Brief: `plan/phases/phase_FM1_feature_map.md`.',
    '',
    TABLE_START,
    '| Feature | Kind | Reachable | Driven | Tested | Needs a pitch |',
    '|---|---|---|---|---|---|',
    ...rows,
    TABLE_END,
    '',
    '## Anomalies',
    '',
    '### Built but unreachable',
    '',
    ...(a.unreachable === null
      ? ['- unknown: features.json carries no reachability evidence yet.']
      : bullets(a.unreachable.map(nameAndId), 'none')),
    '',
    '### Routes with no way out but back',
    '',
    'Routes with no outgoing player-flow edge to another feature, not counting the shell gates every screen shares.',
    '',
    ...bullets(a.deadEnds.map(nameAndId), 'none'),
    '',
    '### game-model.md sections that match no feature',
    '',
    ...bullets(a.unmatched, 'none'),
    '',
    '## Unnamed features',
    '',
    'Features with no name from `game-model.md` vocabulary; each keeps its path-derived name.',
    '',
    ...(unnamedKnown ? bullets(unnamed.map(nameAndId), 'none') : ['- unknown: features.json does not say which features are named yet.']),
    '',
  ]
  return lines.join('\n')
}

/** Edges as drawn: shell gates dropped, one edge per pair and kind, both-way pairs merged. */
export function drawnEdges(map) {
  const ids = new Set(map.features.map((f) => f.id))
  const seen = new Set()
  for (const e of map.edges) {
    if (e.from === e.to || isShellGateEdge(e) || !ids.has(e.from) || !ids.has(e.to)) continue
    seen.add(`${e.kind}\u0000${e.from}\u0000${e.to}`)
  }
  const out = []
  for (const key of [...seen].sort()) {
    const [kind, from, to] = key.split('\u0000')
    const back = `${kind}\u0000${to}\u0000${from}`
    if (seen.has(back) && cmp(to, from) < 0) continue
    out.push({ kind, from, to, both: seen.has(back) })
  }
  return out
}

/** Targets of shell gate edges: features that open from any screen. */
function gateTargets(map) {
  return new Set(map.edges.filter(isShellGateEdge).map((e) => e.to))
}

export function nodeText(feature, fromAnyScreen) {
  const lines = [`**${feature.name}**`, KIND_LABEL[feature.kind] || feature.kind]
  const pitch = flag(feature.needsPitch)
  if (pitch === 'yes') lines.push('needs a pitch')
  else if (pitch === 'unknown') lines.push('pitch unknown')
  if (fromAnyScreen) lines.push('opens from any screen')
  return lines.join('\n')
}

export function renderCanvasObject(map) {
  const { columns, nodeWidth, nodeHeight, gap, padding, groupGap } = LAYOUT
  const gated = gateTargets(map)
  const nodes = []
  const byGroup = new Map()
  for (const f of orderedFeatures(map)) {
    if (!byGroup.has(f.group)) byGroup.set(f.group, [])
    byGroup.get(f.group).push(f)
  }
  const groupIds = [...byGroup.keys()].sort((a, b) => groupIndex(a) - groupIndex(b) || cmp(a, b))
  const groupWidth = padding * 2 + columns * nodeWidth + (columns - 1) * gap
  const legend = {
    id: 'legend',
    type: 'text',
    text: [
      '**Feature map**',
      'Cyan edge: the player goes from one to the other.',
      'Purple edge: one uses the other in code.',
      'Red node: needs a pitch. Green node: has one.',
      'Uncoloured node: not known yet.',
    ].join('\n'),
    x: 0,
    y: 0,
    width: groupWidth,
    height: 180,
  }
  const featureNodes = []
  let y = legend.height + groupGap
  for (const g of groupIds) {
    const members = byGroup.get(g)
    const rowsN = Math.ceil(members.length / columns)
    const height = padding * 2 + rowsN * nodeHeight + (rowsN - 1) * gap
    nodes.push({ id: `group:${g}`, type: 'group', x: 0, y, width: groupWidth, height, label: (GROUPS.find((x) => x.id === g) || { label: g }).label })
    members.forEach((f, i) => {
      const node = {
        id: f.id,
        type: 'text',
        text: nodeText(f, gated.has(f.id)),
        x: padding + (i % columns) * (nodeWidth + gap),
        y: y + padding + Math.floor(i / columns) * (nodeHeight + gap),
        width: nodeWidth,
        height: nodeHeight,
      }
      const pitch = flag(f.needsPitch)
      if (pitch !== 'unknown') node.color = pitch === 'yes' ? COLORS.needsPitch : COLORS.pitched
      featureNodes.push(node)
    })
    y += height + groupGap
  }
  const edges = drawnEdges(map).map((e) => {
    const edge = { id: `${e.kind}:${e.from}->${e.to}`, fromNode: e.from, toNode: e.to, color: COLORS[e.kind] }
    if (e.both) edge.fromEnd = 'arrow'
    return edge
  })
  return { nodes: [legend, ...nodes, ...featureNodes], edges }
}

export function renderCanvas(map) {
  return `${JSON.stringify(renderCanvasObject(map), null, '\t')}\n`
}

/** JSON Canvas 1.0 shape check; returns a list of problems (empty when valid). */
export function canvasProblems(canvas) {
  const problems = []
  if (!canvas || !Array.isArray(canvas.nodes) || !Array.isArray(canvas.edges)) return ['nodes and edges must be arrays']
  const ids = new Set()
  const colour = (c) => c === undefined || /^[1-6]$/.test(c) || /^#[0-9a-fA-F]{6}$/.test(c)
  for (const n of canvas.nodes) {
    if (typeof n.id !== 'string' || !n.id) problems.push('node without an id')
    if (ids.has(n.id)) problems.push(`duplicate id ${n.id}`)
    ids.add(n.id)
    if (!['text', 'file', 'link', 'group'].includes(n.type)) problems.push(`node ${n.id}: bad type ${n.type}`)
    for (const k of ['x', 'y', 'width', 'height']) if (!Number.isInteger(n[k])) problems.push(`node ${n.id}: ${k} must be an integer`)
    if (n.type === 'text' && typeof n.text !== 'string') problems.push(`node ${n.id}: text node without text`)
    if (n.type === 'group' && n.label !== undefined && typeof n.label !== 'string') problems.push(`node ${n.id}: bad label`)
    if (!colour(n.color)) problems.push(`node ${n.id}: bad color ${n.color}`)
  }
  for (const e of canvas.edges) {
    if (typeof e.id !== 'string' || !e.id) problems.push('edge without an id')
    if (ids.has(e.id)) problems.push(`duplicate id ${e.id}`)
    ids.add(e.id)
    if (!canvas.nodes.some((n) => n.id === e.fromNode)) problems.push(`edge ${e.id}: unknown fromNode ${e.fromNode}`)
    if (!canvas.nodes.some((n) => n.id === e.toNode)) problems.push(`edge ${e.id}: unknown toNode ${e.toNode}`)
    for (const k of ['fromEnd', 'toEnd']) if (e[k] !== undefined && !['none', 'arrow'].includes(e[k])) problems.push(`edge ${e.id}: bad ${k}`)
    if (!colour(e.color)) problems.push(`edge ${e.id}: bad color ${e.color}`)
  }
  return problems
}

export function render(root = ROOT) {
  const map = JSON.parse(fs.readFileSync(path.join(root, FEATURES_PATH), 'utf8'))
  const gameModel = fs.readFileSync(path.join(root, GAME_MODEL_PATH), 'utf8')
  const namesFile = path.join(root, NAMES_PATH)
  const names = fs.existsSync(namesFile) ? JSON.parse(fs.readFileSync(namesFile, 'utf8')) : {}
  return { [README_PATH]: renderReadme(map, gameModel, names), [CANVAS_PATH]: renderCanvas(map) }
}

export function main(argv = process.argv.slice(2), root = ROOT) {
  const check = argv.includes('--check')
  const out = render(root)
  if (check) {
    const stale = Object.entries(out).filter(([rel, text]) => {
      const p = path.join(root, rel)
      return !fs.existsSync(p) || fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== text
    })
    for (const [rel] of stale) console.error(`feature-map-render: ${rel} is stale; run node scripts/feature-map-render.mjs`)
    return stale.length ? 1 : 0
  }
  for (const [rel, text] of Object.entries(out)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), text)
    console.log(`feature-map-render: wrote ${rel}`)
  }
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main()
