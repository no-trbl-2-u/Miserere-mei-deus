#!/usr/bin/env node
// scripts/feature-map-render.mjs — the feature map's README and canvas.
//
//   node scripts/feature-map-render.mjs           # write docs/feature-map/README.md, Map.canvas, Features/*.md and Features/*.canvas
//   node scripts/feature-map-render.mjs --check   # exit 1 when a committed file differs from a fresh render, Features/ holds an extra file, or a canvas fails canvasProblems
//
// Reads docs/feature-map/features.json (written by scripts/feature-map.mjs),
// docs/game-model.md and, when present, the alias table
// scripts/feature-map.names.json, and writes deterministically:
//
//   README.md   one table row per feature between the feature-table markers,
//               then the anomaly list and the unnamed features. The markers are
//               the contract with `node scripts/vault.mjs features`, which
//               copies the lines between them into the vault: each appears
//               exactly once, on a line of its own, start before end.
//   Map.canvas  JSON Canvas 1.0, the overview: one `file` node per feature group
//               opening that group's canvas, a legend, and the player-flow
//               edges between groups. No feature node, no coupling edge.
//   Features/   one note per feature (renderNotes): its flags and group tag in
//               frontmatter, the player-flow targets as wikilinks, the coupling
//               targets as plain text so Graph view draws flow only, and the
//               missing pitch evidence. Beside them one canvas per group
//               (renderGroupCanvasObject): a `file` card per member opening its
//               note, the flow edges between members, and a column of the
//               outside features they lead to. The node colour marks whether
//               the feature needs a pitch. A write deletes a stale note that
//               carries `generated: feature-map` and a stale group canvas.
//
// Canvas `file` paths and note links are vault-relative (`Features/<name>.md`):
// the files are only ever opened from the vault, where docs/feature-map/ is
// mirrored by `node scripts/vault.mjs features`.
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

export const FEATURE_MAP_DIR = 'docs/feature-map'
export const FEATURES_PATH = 'docs/feature-map/features.json'
export const GAME_MODEL_PATH = 'docs/game-model.md'
export const README_PATH = 'docs/feature-map/README.md'
export const CANVAS_PATH = 'docs/feature-map/Map.canvas'
/** The evidence pass's alias table, `{ "<feature id>": { name, aliases } }`; optional. */
export const NAMES_PATH = 'scripts/feature-map.names.json'
/** One generated note per feature; the folder is mirrored into the vault as `Features/`. */
export const NOTES_DIR = 'docs/feature-map/Features'
/** The frontmatter `generated:` value that marks a note as the renderer's own. */
export const NOTE_MARKER = 'feature-map'

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
    'The picture is `Map.canvas` (copied into the vault as `Feature Map.canvas`): one block per group, each opening',
    "that group's canvas in `Features/`, whose cards open the feature notes. Coupling is listed in the notes, never drawn.",
    'Briefs: `plan/phases/phase_FM1_feature_map.md`, `plan/phases/phase_FM2_modular_feature_map.md`.',
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

/** Characters no note file name may hold: path separators, Windows' reserved set, and Obsidian's link syntax. */
export const UNSAFE_IN_FILE_NAME = /[\\/:*?"<>|#^[\]]/g

/**
 * The file-name rule: every unsafe character becomes `-`, runs of whitespace
 * become one space, and leading or trailing spaces and dots are trimmed. An
 * empty result falls back to the same rule applied to the id.
 */
export function safeFileName(name, id = '') {
  const clean = (s) => String(s).replace(UNSAFE_IN_FILE_NAME, '-').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '')
  return clean(name) || clean(id) || 'feature'
}

/**
 * One note file stem per feature id, unique ignoring case (the vault may sit
 * on a case-insensitive disk). In feature order the first holder of a stem
 * keeps it; a later feature whose stem is taken gets its made-safe id
 * appended in brackets.
 */
export function noteStems(map) {
  const stems = new Map()
  const taken = new Set()
  for (const f of orderedFeatures(map)) {
    let stem = safeFileName(f.name, f.id)
    if (taken.has(stem.toLowerCase())) stem = `${stem} (${safeFileName(f.id)})`
    taken.add(stem.toLowerCase())
    stems.set(f.id, stem)
  }
  return stems
}

/** A note's repo path; its links are vault-relative, `Features/<stem>`. */
export const notePath = (stem) => `${NOTES_DIR}/${stem}.md`

const yamlString = (s) => JSON.stringify(String(s))
const linkLabel = (s) => String(s).replace(/[[\]|]/g, '-')

/** The features each feature points at by kind, from drawnEdges: a both-way pair counts for both ends. */
function targetsByKind(map, kind) {
  const out = new Map(map.features.map((f) => [f.id, new Set()]))
  for (const e of drawnEdges(map)) {
    if (e.kind !== kind) continue
    out.get(e.from).add(e.to)
    if (e.both) out.get(e.to).add(e.from)
  }
  return out
}

/** One generated note per feature: frontmatter flags and tags, Leads to as wikilinks, Uses as plain text. */
export function renderNotes(map) {
  const stems = noteStems(map)
  const ordered = orderedFeatures(map)
  const rank = new Map(ordered.map((f, i) => [f.id, i]))
  const byId = new Map(map.features.map((f) => [f.id, f]))
  const inOrder = (ids) => [...ids].sort((a, b) => rank.get(a) - rank.get(b))
  const flows = targetsByKind(map, 'flow')
  const uses = targetsByKind(map, 'coupling')
  const gated = gateTargets(map)
  const out = {}
  for (const f of ordered) {
    const pitch = flag(f.needsPitch)
    const tags = [`feature-map/${f.group}`, ...(pitch === 'yes' ? ['needs-pitch'] : [])]
    const group = (GROUPS.find((x) => x.id === f.group) || { label: f.group }).label
    const leads = inOrder(flows.get(f.id)).map((t) => `- [[Features/${stems.get(t)}|${linkLabel(byId.get(t).name)}]]`)
    const used = inOrder(uses.get(f.id)).map((t) => `- ${byId.get(t).name}`)
    const missing = pitch === 'yes' ? missingList(f.needsPitch.missing) : []
    const lines = [
      '---',
      `kind: ${yamlString(f.kind)}`,
      `group: ${yamlString(f.group)}`,
      `reachable: ${yamlString(flag(f.reachable))}`,
      `driven: ${yamlString(flag(f.driven))}`,
      `tested: ${yamlString(flag(f.tested))}`,
      `needsPitch: ${yamlString(pitch)}`,
      `source: ${yamlString(f.source || '')}`,
      `generated: ${NOTE_MARKER}`,
      'tags:',
      ...tags.map((t) => `  - ${t}`),
      '---',
      '',
      `# ${f.name}`,
      '',
      `Generated by \`scripts/feature-map-render.mjs\` from \`features.json\`; do not edit. Notes about this feature go in \`Threads/\`.`,
      '',
      `${KIND_LABEL[f.kind] || f.kind} in ${group}, from \`${f.source || 'unknown'}\`.`,
      '',
      '## Leads to',
      '',
      ...(gated.has(f.id) ? ['Opens from any screen.', ''] : []),
      ...(leads.length ? leads : ['No player-flow edge leads out of it.']),
      '',
      '## Uses',
      '',
      'Code it uses, as plain text so Graph view draws player flow only.',
      '',
      ...(used.length ? used : ['- nothing']),
      '',
      '## Pitch',
      '',
      ...(pitch === 'yes'
        ? [missing.length ? `Needs a pitch. Missing: ${missing.join('; ')}` : 'Needs a pitch.']
        : [pitch === 'no' ? 'Has a pitch.' : 'Not known yet.']),
      '',
    ]
    out[notePath(stems.get(f.id))] = lines.join('\n')
  }
  return out
}

const groupLabel = (g) => (GROUPS.find((x) => x.id === g) || { label: g }).label

/** Features by group, groups in canvas order: `[[groupId, members], ...]`. */
function featuresByGroup(map) {
  const byGroup = new Map()
  for (const f of orderedFeatures(map)) {
    if (!byGroup.has(f.group)) byGroup.set(f.group, [])
    byGroup.get(f.group).push(f)
  }
  return [...byGroup.entries()].sort(([a], [b]) => groupIndex(a) - groupIndex(b) || cmp(a, b))
}

/** A path under docs/feature-map/ as the vault sees it, which is where the canvases are opened. */
export const vaultPath = (rel) => rel.slice(FEATURE_MAP_DIR.length + 1)

/** A group canvas's repo path, `Features/<group label>.canvas`. */
export const groupCanvasPath = (group) => `${NOTES_DIR}/${safeFileName(groupLabel(group), group)}.canvas`

/** Whether a repo path is a group canvas the renderer owns: a `.canvas` in Features/ named for a known group. */
export function isGroupCanvas(rel) {
  return GROUPS.some((g) => groupCanvasPath(g.id) === rel)
}

/** Overview layout: one block per group, a row of three. */
export const OVERVIEW_LAYOUT = { columns: 3, width: 420, height: 320, gap: 120 }

/**
 * The overview, `Map.canvas`: one `file` node per group opening its group
 * canvas, a legend, and one flow edge per ordered pair of groups with a drawn
 * flow edge between their features. No feature node and no coupling edge.
 */
export function renderOverviewObject(map) {
  const { columns, width, height, gap } = OVERVIEW_LAYOUT
  const groups = featuresByGroup(map).map(([g]) => g)
  const legend = {
    id: 'legend',
    type: 'text',
    text: [
      '**Feature map**',
      'Each block is a group of features: open it to see its canvas, then open a card to read its note.',
      'Cyan edge: the player goes from a feature in one group to a feature in the other.',
      'What a feature uses in code is listed in its note, never drawn.',
      'In a group canvas a red card needs a pitch and a green one has one.',
    ].join('\n'),
    x: 0,
    y: 0,
    width: columns * width + (columns - 1) * gap,
    height: 200,
  }
  const top = legend.height + gap
  const blocks = groups.map((g, i) => ({
    id: `group:${g}`,
    type: 'file',
    file: vaultPath(groupCanvasPath(g)),
    x: (i % columns) * (width + gap),
    y: top + Math.floor(i / columns) * (height + gap),
    width,
    height,
  }))
  const groupOf = new Map(map.features.map((f) => [f.id, f.group]))
  const pairs = new Set()
  for (const e of drawnEdges(map)) {
    const a = groupOf.get(e.from)
    const b = groupOf.get(e.to)
    if (e.kind !== 'flow' || a === b) continue
    pairs.add(`${a}\u0000${b}`)
    if (e.both) pairs.add(`${b}\u0000${a}`)
  }
  const rank = new Map(groups.map((g, i) => [g, i]))
  const edges = [...pairs]
    .map((key) => key.split('\u0000'))
    .sort(([a1, b1], [a2, b2]) => rank.get(a1) - rank.get(a2) || rank.get(b1) - rank.get(b2))
    .map(([a, b]) => ({ id: `flow:group:${a}->group:${b}`, fromNode: `group:${a}`, toNode: `group:${b}`, color: COLORS.flow }))
  return { nodes: [legend, ...blocks], edges }
}

/**
 * One group's canvas: a `file` node per member opening its note, inside a
 * group node, the flow edges between members (one per pair, an arrow at each
 * end when linked both ways), and a column to the right, inside a group node
 * "Elsewhere", holding a `file` node for each feature outside the group that a
 * member's flow edge leads to. No coupling edge is drawn.
 */
export function renderGroupCanvasObject(map, group) {
  const { columns, nodeWidth, nodeHeight, gap, padding, groupGap } = LAYOUT
  const stems = noteStems(map)
  const ordered = orderedFeatures(map)
  const rank = new Map(ordered.map((f, i) => [f.id, i]))
  const members = ordered.filter((f) => f.group === group)
  const inside = new Set(members.map((f) => f.id))
  const byId = new Map(map.features.map((f) => [f.id, f]))
  const card = (f, id, x, y) => {
    const node = { id, type: 'file', file: vaultPath(notePath(stems.get(f.id))), x, y, width: nodeWidth, height: nodeHeight }
    const pitch = flag(f.needsPitch)
    if (pitch !== 'unknown') node.color = pitch === 'yes' ? COLORS.needsPitch : COLORS.pitched
    return node
  }
  const outsideId = (id) => `elsewhere:${id}`
  const outside = new Set()
  const edges = []
  for (const e of drawnEdges(map)) {
    if (e.kind !== 'flow') continue
    const fromIn = inside.has(e.from)
    const toIn = inside.has(e.to)
    let edge = null
    if (fromIn && toIn) edge = { fromNode: e.from, toNode: e.to, both: e.both }
    else if (fromIn) {
      outside.add(e.to)
      edge = { fromNode: e.from, toNode: outsideId(e.to), both: e.both }
    } else if (toIn && e.both) {
      outside.add(e.from)
      edge = { fromNode: e.to, toNode: outsideId(e.from), both: true }
    }
    if (!edge) continue
    const out = { id: `flow:${edge.fromNode}->${edge.toNode}`, fromNode: edge.fromNode, toNode: edge.toNode, color: COLORS.flow }
    if (edge.both) out.fromEnd = 'arrow'
    edges.push(out)
  }
  edges.sort((a, b) => cmp(a.id, b.id))
  const groupWidth = padding * 2 + columns * nodeWidth + (columns - 1) * gap
  const rowsN = Math.max(1, Math.ceil(members.length / columns))
  const nodes = [
    { id: `group:${group}`, type: 'group', x: 0, y: 0, width: groupWidth, height: padding * 2 + rowsN * nodeHeight + (rowsN - 1) * gap, label: groupLabel(group) },
  ]
  const cards = members.map((f, i) =>
    card(f, f.id, padding + (i % columns) * (nodeWidth + gap), padding + Math.floor(i / columns) * (nodeHeight + gap)),
  )
  const away = [...outside].sort((a, b) => rank.get(a) - rank.get(b))
  if (away.length) {
    const x = groupWidth + groupGap
    nodes.push({ id: 'elsewhere', type: 'group', x, y: 0, width: padding * 2 + nodeWidth, height: padding * 2 + away.length * nodeHeight + (away.length - 1) * gap, label: 'Elsewhere' })
    away.forEach((id, i) => cards.push(card(byId.get(id), outsideId(id), x + padding, padding + i * (nodeHeight + gap))))
  }
  return { nodes: [...nodes, ...cards], edges }
}

const canvasText = (obj) => `${JSON.stringify(obj, null, '\t')}\n`

/** One canvas per group that has a feature, keyed by repo path. */
export function renderGroupCanvases(map) {
  return Object.fromEntries(featuresByGroup(map).map(([g]) => [groupCanvasPath(g), canvasText(renderGroupCanvasObject(map, g))]))
}

/** The overview canvas as written. */
export function renderCanvas(map) {
  return canvasText(renderOverviewObject(map))
}

/**
 * JSON Canvas 1.0 shape check; returns a list of problems (empty when valid).
 * `files`, when given, is the set of vault paths a `file` node may name.
 */
export function canvasProblems(canvas, files = null) {
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
    if (n.type === 'file' && (typeof n.file !== 'string' || !n.file)) problems.push(`node ${n.id}: file node without a file`)
    else if (n.type === 'file' && files && !files.has(n.file)) problems.push(`node ${n.id}: file ${n.file} is not a generated file`)
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
  return {
    [README_PATH]: renderReadme(map, gameModel, names),
    [CANVAS_PATH]: renderCanvas(map),
    ...renderNotes(map),
    ...renderGroupCanvases(map),
  }
}

/** Problems in every rendered canvas, each `file` node checked against the rendered files, as `<path>: <problem>` lines. */
export function renderedCanvasProblems(out) {
  const files = new Set(Object.keys(out).filter((rel) => rel.startsWith(`${NOTES_DIR}/`)).map(vaultPath))
  return Object.entries(out)
    .filter(([rel]) => rel.endsWith('.canvas'))
    .flatMap(([rel, text]) => canvasProblems(JSON.parse(text), files).map((p) => `${rel}: ${p}`))
}

/** Files in Features/ the render does not make, as repo paths. */
function extraNotes(root, out) {
  const dir = path.join(root, NOTES_DIR)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).map((f) => `${NOTES_DIR}/${f}`).filter((rel) => !(rel in out)).sort()
}

/** Whether a note's frontmatter carries `generated: feature-map`. */
export const isGeneratedNote = (text) => /^---\r?\n(?:(?!---\r?\n).*\r?\n)*?generated: feature-map\r?\n/.test(text)

export function main(argv = process.argv.slice(2), root = ROOT) {
  const check = argv.includes('--check')
  const out = render(root)
  const broken = renderedCanvasProblems(out)
  for (const p of broken) console.error(`feature-map-render: ${p}`)
  if (broken.length) return 1
  if (check) {
    const stale = Object.entries(out).filter(([rel, text]) => {
      const p = path.join(root, rel)
      return !fs.existsSync(p) || fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== text
    })
    for (const [rel] of stale) console.error(`feature-map-render: ${rel} is stale; run node scripts/feature-map-render.mjs`)
    const extra = extraNotes(root, out)
    for (const rel of extra) console.error(`feature-map-render: ${rel} is not a feature; run node scripts/feature-map-render.mjs`)
    return stale.length || extra.length ? 1 : 0
  }
  for (const [rel, text] of Object.entries(out)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), text)
  }
  const notes = Object.keys(out).filter((rel) => rel.endsWith('.md') && rel.startsWith(`${NOTES_DIR}/`)).length
  const canvases = Object.keys(out).filter((rel) => rel.endsWith('.canvas') && rel.startsWith(`${NOTES_DIR}/`)).length
  console.log(`feature-map-render: wrote ${README_PATH}, ${CANVAS_PATH}, ${notes} notes and ${canvases} group canvases in ${NOTES_DIR}`)
  for (const rel of extraNotes(root, out)) {
    const p = path.join(root, rel)
    if (fs.statSync(p).isFile() && (isGroupCanvas(rel) || isGeneratedNote(fs.readFileSync(p, 'utf8')))) {
      fs.unlinkSync(p)
      console.log(`feature-map-render: deleted ${rel}`)
    } else console.error(`feature-map-render: left ${rel}, not marked generated: ${NOTE_MARKER} and not a group canvas`)
  }
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main()
