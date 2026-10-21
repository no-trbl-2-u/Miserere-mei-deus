// scripts/feature-map.evidence.mjs — the feature map's names and evidence flags.
//
// Called by scripts/feature-map.mjs once the inventory and the edges exist.
// Each feature gains, after `source` and in this order:
//
//   named       true when scripts/feature-map.names.json gives it a display
//               name from docs/game-model.md vocabulary; `name` is then that
//               display name, otherwise the path-derived one;
//   reachable   a player-flow path from the entry route `index` (a route), or
//               a coupling path from a reachable route (an engine area);
//   driven      an e2e or critique driver in axiomancer-mobile/scripts/ names
//               the route's href (a route), or names a route coupled to the
//               area (an engine area);
//   tested      a test file imports the route file or a module only that
//               route loads, or names its href (a route); a test file imports
//               a module in the area (an engine area);
//   needsPitch  no braindump/ pitch file and no plan/*.decisions.md D-number
//               names the feature by its display name or an alias.
//
// Every flag carries the source that set it. Names match case-sensitively on
// word boundaries, so "Rest" is not found in "the rest of".

import fs from 'node:fs'
import path from 'node:path'

export const NAMES_PATH = 'scripts/feature-map.names.json'
export const DRIVER_DIR = 'axiomancer-mobile/scripts'
/** An e2e driver, the critique drive and the screen smoke: the browser drives over the app. */
export const DRIVER_PATTERN = /^([a-z0-9-]+-e2e|critique-drive|smoke-screens)\.mjs$/
export const TEST_ROOTS = ['axiomancer-mobile', 'axiomancer-mechanics']
export const PITCH_DIR = 'braindump'
export const DECISIONS_GLOB = /^[^/]+\.decisions\.md$/
export const ENTRY_ROUTE = 'route:index'
/** How many paths a source lists before it ends in `...`. */
export const SOURCE_LIST_CAP = 3

const TEST_SKIP = new Set(['node_modules', '.expo', 'dist', 'web-build', 'coverage', '.git'])

/** Up to SOURCE_LIST_CAP sorted paths, `, ...` when there are more; null when none. */
export function listSource(paths, cmp) {
  const sorted = [...new Set(paths)].sort(cmp)
  if (!sorted.length) return null
  const head = sorted.slice(0, SOURCE_LIST_CAP).join(', ')
  return sorted.length > SOURCE_LIST_CAP ? `${head}, ...` : head
}

/** The alias table at `root`; throws on an entry that names no feature or has no name. */
export function loadNames(root, ids) {
  const abs = path.join(root, NAMES_PATH)
  if (!fs.existsSync(abs)) return {}
  const table = JSON.parse(fs.readFileSync(abs, 'utf8'))
  for (const [id, entry] of Object.entries(table)) {
    if (!ids.has(id)) throw new Error(`feature-map: ${NAMES_PATH} names ${id}, which is not a feature`)
    if (!entry || typeof entry.name !== 'string' || !entry.name) throw new Error(`feature-map: ${NAMES_PATH} entry ${id} has no name`)
    if (entry.aliases !== undefined && (!Array.isArray(entry.aliases) || entry.aliases.some((a) => typeof a !== 'string' || !a))) {
      throw new Error(`feature-map: ${NAMES_PATH} entry ${id} has a bad aliases list`)
    }
  }
  return table
}

/** Every code file under `rel`, test folders included; installed and build folders skipped. */
function walkAll(root, rel, isCode, cmp) {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) return []
  const out = []
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = `${rel}/${ent.name}`
    if (ent.isDirectory()) { if (!TEST_SKIP.has(ent.name)) out.push(...walkAll(root, child, isCode, cmp)) }
    else if (ent.isFile() && isCode(child)) out.push(child)
  }
  return out.sort(cmp)
}

/** A template interpolation that holds the app's origin: `${baseUrl}/deck` names the deck route. */
const BASE_URL = /url|base|origin/i

/**
 * Route ids whose href a file names as a string: a literal or template head
 * that starts with `/` (a bare `/` is a path separator, not the entry route),
 * or the text after a base-URL interpolation (where a bare `/` is the entry).
 */
function hrefsNamed(ctx, rel) {
  const { ts } = ctx
  const sf = ctx.parse(rel).sf
  const found = new Set()
  const take = (text, afterInterpolation) => {
    if (text === '/' && !afterInterpolation) return
    const seg = ctx.hrefSegment(text)
    if (seg !== null && ctx.segs.has(seg)) found.add(ctx.segs.get(seg))
  }
  const visit = (n) => {
    if (ts.isStringLiteral(n) || n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral || n.kind === ts.SyntaxKind.TemplateHead) take(n.text, false)
    else if (ts.isTemplateSpan(n) && BASE_URL.test(n.expression.getText(sf))) take(n.literal.text, true)
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return found
}

/** BFS from `starts` over `adj`; returns node -> path (array of ids), first and shortest. */
function bfs(starts, adj) {
  const paths = new Map(starts.map((s) => [s, [s]]))
  const queue = [...starts]
  while (queue.length) {
    const at = queue.shift()
    for (const to of adj.get(at) ?? []) {
      if (paths.has(to)) continue
      paths.set(to, [...paths.get(at), to])
      queue.push(to)
    }
  }
  return paths
}

function adjacency(edgeList, kind) {
  const adj = new Map()
  for (const e of edgeList) {
    if (e.kind !== kind) continue
    if (!adj.has(e.from)) adj.set(e.from, [])
    if (!adj.get(e.from).includes(e.to)) adj.get(e.from).push(e.to)
  }
  return adj
}

/** `reachable` for every feature id. */
export function reachability(features, edgeList) {
  const ids = new Set(features.map((f) => f.id))
  const out = new Map()
  const routes = ids.has(ENTRY_ROUTE) ? bfs([ENTRY_ROUTE], adjacency(edgeList, 'flow')) : new Map()
  const areas = bfs([...routes.keys()], adjacency(edgeList, 'coupling'))
  for (const f of features) {
    let value = false
    let source = `no flow path from ${ENTRY_ROUTE}`
    if (f.id === ENTRY_ROUTE) { value = true; source = 'entry route' }
    else if (f.kind !== 'engine-area' && routes.has(f.id)) { value = true; source = `flow path from ${ENTRY_ROUTE}: ${routes.get(f.id).join(' -> ')}` }
    else if (f.kind === 'engine-area') {
      if (areas.has(f.id)) { value = true; source = `coupling path from a reachable route: ${areas.get(f.id).join(' -> ')}` }
      else source = 'no coupling path from a reachable route'
    }
    out.set(f.id, { value, source })
  }
  return out
}

/** `driven` for every feature id. */
export function drivenness(features, edgeList, ctx) {
  const drivers = fs.existsSync(path.join(ctx.root, DRIVER_DIR))
    ? fs.readdirSync(path.join(ctx.root, DRIVER_DIR), { withFileTypes: true })
      .filter((e) => e.isFile() && DRIVER_PATTERN.test(e.name)).map((e) => `${DRIVER_DIR}/${e.name}`).sort(ctx.cmp)
    : []
  const byRoute = new Map()
  for (const rel of drivers) {
    for (const id of hrefsNamed(ctx, rel)) {
      if (!byRoute.has(id)) byRoute.set(id, [])
      byRoute.get(id).push(rel)
    }
  }
  const byArea = new Map()
  for (const e of edgeList) {
    if (e.kind !== 'coupling' || !e.from.startsWith('route:') || !byRoute.has(e.from)) continue
    if (!byArea.has(e.to)) byArea.set(e.to, [])
    byArea.get(e.to).push(...byRoute.get(e.from))
  }
  const out = new Map()
  for (const f of features) {
    const paths = (f.kind === 'engine-area' ? byArea : byRoute).get(f.id) ?? []
    out.set(f.id, { value: paths.length > 0, source: listSource(paths, ctx.cmp) })
  }
  return out
}

/** `tested` for every feature id. */
export function testedness(features, ctx) {
  const routes = features.filter((f) => f.kind !== 'engine-area')
  // A module counts for a route when the route file is it, or only that route's own tree loads it.
  const owners = new Map()
  for (const f of routes) {
    for (const rel of ctx.trees.get(f.id) ?? []) {
      if (!owners.has(rel)) owners.set(rel, new Set())
      owners.get(rel).add(f.id)
    }
  }
  const moduleRoute = new Map(routes.map((f) => [f.source, f.id]))
  for (const [rel, set] of owners) if (set.size === 1 && !moduleRoute.has(rel)) moduleRoute.set(rel, [...set][0])

  const hits = new Map(features.map((f) => [f.id, []]))
  const tests = TEST_ROOTS.flatMap((r) => walkAll(ctx.root, r, ctx.isCode, ctx.cmp)).filter((rel) => ctx.isTestFile(rel))
  for (const rel of tests) {
    const named = new Set(hrefsNamed(ctx, rel))
    for (const imp of ctx.parse(rel).imports) {
      const targets = ctx.resolve(rel, imp.spec)
      for (const t of targets) if (moduleRoute.has(t)) named.add(moduleRoute.get(t))
      for (const area of ctx.areasOf(targets, imp.names)) named.add(`area:${area}`)
    }
    for (const id of named) if (hits.has(id)) hits.get(id).push(rel)
  }
  const out = new Map()
  for (const f of features) out.set(f.id, { value: hits.get(f.id).length > 0, source: listSource(hits.get(f.id), ctx.cmp) })
  return out
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** True when `term` appears in `text` as a whole word, case as written. */
export function namesTerm(text, term) {
  return new RegExp(`(?<![A-Za-z0-9_])${escapeRe(term)}(?![A-Za-z0-9_])`).test(text)
}

/** The pitch evidence: braindump files and decision entries, each with the label a source cites. */
export function pitchEvidence(root, cmp) {
  const docs = []
  const dir = path.join(root, PITCH_DIR)
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.md')).sort(cmp)) {
      docs.push({ label: `${PITCH_DIR}/${name}`, text: fs.readFileSync(path.join(dir, name), 'utf8') })
    }
  }
  const plan = path.join(root, 'plan')
  if (fs.existsSync(plan)) {
    for (const name of fs.readdirSync(plan).filter((n) => DECISIONS_GLOB.test(n)).sort(cmp)) {
      const text = fs.readFileSync(path.join(plan, name), 'utf8').replace(/\r\n/g, '\n')
      const parts = text.split(/^(?=\*\*D\d+\b)/m)
      for (const part of parts) {
        const m = /^\*\*D(\d+)\b/.exec(part)
        if (m) docs.push({ label: `plan/${name} D${m[1]}`, text: part })
      }
    }
  }
  return docs
}

/** `needsPitch` for one feature, given its display name and aliases. */
export function pitchFlag(terms, docs) {
  const hit = docs.find((d) => terms.some((t) => namesTerm(d.text, t)))
  if (hit) return { value: false, missing: null, source: hit.label }
  const quoted = terms.map((t) => `"${t}"`).join(', ')
  return { value: true, missing: `no braindump/ pitch file and no plan/*.decisions.md D-number names it (${quoted})`, source: null }
}

/** The features with names and evidence flags added after `source`. */
export function annotate(features, edgeList, ctx) {
  const ids = new Set(features.map((f) => f.id))
  const names = loadNames(ctx.root, ids)
  const reach = reachability(features, edgeList)
  const driven = drivenness(features, edgeList, ctx)
  const tested = testedness(features, ctx)
  const docs = pitchEvidence(ctx.root, ctx.cmp)
  return features.map((f) => {
    const entry = names[f.id]
    const name = entry ? entry.name : f.name
    const terms = entry ? [entry.name, ...(entry.aliases ?? [])] : [f.name]
    return {
      ...f,
      name,
      named: Boolean(entry),
      reachable: reach.get(f.id),
      driven: driven.get(f.id),
      tested: tested.get(f.id),
      needsPitch: pitchFlag(terms, docs),
    }
  })
}
