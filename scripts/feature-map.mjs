#!/usr/bin/env node
// scripts/feature-map.mjs — the feature map's inventory and edges.
//
//   node scripts/feature-map.mjs           # write docs/feature-map/features.json
//   node scripts/feature-map.mjs --check   # exit 1 when the committed file differs from a fresh run
//
// A feature is a file route under axiomancer-mobile/app/ (layouts and tests
// excluded) or a top-level engine area under axiomancer-mechanics/src/ (the
// folders in ENGINE_AREA_EXCLUDE excluded). Two edge kinds:
//
//   flow      route -> route, from navigation calls (router.push / replace /
//             navigate / dismissTo, <Link href>, <Redirect href>) and from a
//             layout's tab bar (<Tabs>), which links its routes to each other;
//   coupling  route -> engine area and engine area -> engine area, from imports.
//
// A route's module tree is its file plus the local modules it imports,
// transitively, minus the app shell: the modules the root layout already loads.
// Shell modules are on every screen, so a navigation call found in the shell
// (the gates) is a flow edge from every route the layout wraps. Shell imports
// of the engine are not attributed to any route: they would couple every route
// to every area and say nothing.
//
// The output shape is a contract: later phases add fields, never rename.
// Imports and navigation calls are read with the TypeScript parser already in
// the workspace (parse only, no type checking). No new dependency.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(ROOT, 'axiomancer-mechanics', 'package.json'))
const ts = require('typescript')

export const OUT_PATH = 'docs/feature-map/features.json'
export const MOBILE_DIR = 'axiomancer-mobile'
export const APP_DIR = 'axiomancer-mobile/app'
export const ENGINE_DIR = 'axiomancer-mechanics/src'

/** Top-level engine folders that are tooling, not features. */
export const ENGINE_AREA_EXCLUDE = ['CLI', 'Utils', 'test-utils']

/** Non-tab, non-dev routes that are minigames rather than world screens. */
export const MINIGAME_ROUTES = ['hazard', 'hazard-deck', 'labyrinth']

const CODE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs']
const NAV_METHODS = new Set(['push', 'replace', 'navigate', 'dismissTo'])
const NAV_TAGS = new Set(['Link', 'Redirect'])
const TAB_NAVIGATOR = 'Tabs'
const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist', 'web-build', '__tests__'])

const posix = (p) => p.split(path.sep).join('/')
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const isTestFile = (rel) => /(^|\/)__tests__\//.test(rel) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)
const isCode = (rel) => CODE_EXT.some((e) => rel.endsWith(e)) && !rel.endsWith('.d.ts')

/** Every file under `rel` (repo-relative, posix, sorted); skips installed and test folders. */
function walk(root, rel) {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) return []
  const out = []
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = rel ? `${rel}/${ent.name}` : ent.name
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) out.push(...walk(root, child))
    } else if (ent.isFile()) out.push(child)
  }
  return out.sort(cmp)
}

// ─── Inventory ────────────────────────────────────────────────────────────────

const stripExt = (p) => p.replace(/\.[cm]?[jt]sx?$/, '')

/** `app/(tabs)/deck/index.tsx` -> `(tabs)/deck`; `app/index.tsx` -> `index`; `app/devart/rooms.tsx` -> `devart/rooms`. */
export function routePathOf(appRel) {
  const noExt = stripExt(appRel)
  if (noExt === 'index') return 'index'
  return noExt.replace(/\/index$/, '')
}

/** True for a file under app/ that is a screen: code, not a layout, not a test, not `+html`. */
export function isRouteFile(appRel) {
  if (!isCode(appRel) || isTestFile(appRel)) return false
  const base = appRel.split('/').pop()
  return !base.startsWith('_') && !base.startsWith('+html')
}

const titleCase = (s) => s.replace(/[-/]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())

function routeFeature(appRel) {
  const routePath = routePathOf(appRel)
  const bare = routePath.replace(/^\(tabs\)\//, '')
  const first = bare.split('/')[0]
  let kind = 'route'
  let group = 'world'
  if (routePath.startsWith('(tabs)/')) group = 'tabs'
  else if (first.startsWith('dev')) { kind = 'dev-route'; group = 'dev' }
  else if (MINIGAME_ROUTES.includes(first)) group = 'minigames'
  return { id: `route:${routePath}`, name: titleCase(bare), kind, group, source: `${APP_DIR}/${appRel}` }
}

/** Every feature in the tree at `root`, sorted by id. */
export function inventory(root = ROOT) {
  const features = []
  for (const rel of walk(root, APP_DIR)) {
    const appRel = rel.slice(APP_DIR.length + 1)
    if (isRouteFile(appRel)) features.push(routeFeature(appRel))
  }
  const engineAbs = path.join(root, ENGINE_DIR)
  if (fs.existsSync(engineAbs)) {
    for (const ent of fs.readdirSync(engineAbs, { withFileTypes: true })) {
      if (!ent.isDirectory() || ENGINE_AREA_EXCLUDE.includes(ent.name) || SKIP_DIRS.has(ent.name)) continue
      features.push({ id: `area:${ent.name}`, name: ent.name, kind: 'engine-area', group: 'engine', source: `${ENGINE_DIR}/${ent.name}` })
    }
  }
  return features.sort((a, b) => cmp(a.id, b.id))
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function makeParser(root) {
  const cache = new Map()
  return function parse(rel) {
    if (cache.has(rel)) return cache.get(rel)
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    const kind = rel.endsWith('.tsx') || rel.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind)
    const info = { sf, imports: [], navs: [], tabBar: false }
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        info.imports.push({ spec: node.moduleSpecifier.text, names: importedNames(node) })
      } else if (ts.isCallExpression(node)) {
        const callee = node.expression
        const arg = node.arguments[0]
        if (arg && ts.isStringLiteralLike(arg) && (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === 'require'))) {
          info.imports.push({ spec: arg.text, names: null })
        } else if (arg && ts.isPropertyAccessExpression(callee) && NAV_METHODS.has(callee.name.text) && /router/i.test(callee.expression.getText(sf))) {
          info.navs.push(arg)
        }
      } else if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sf) === TAB_NAVIGATOR) {
        info.tabBar = true
      } else if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && NAV_TAGS.has(node.tagName.getText(sf))) {
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr) || attr.name.getText(sf) !== 'href' || !attr.initializer) continue
          const init = attr.initializer
          if (ts.isStringLiteral(init)) info.navs.push(init)
          else if (ts.isJsxExpression(init) && init.expression) info.navs.push(init.expression)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    cache.set(rel, info)
    return info
  }
}

/** The names an import or export-from declaration binds from its module; null when it takes the whole module. */
function importedNames(node) {
  if (ts.isExportDeclaration(node)) {
    if (!node.exportClause || !ts.isNamedExports(node.exportClause)) return null
    return node.exportClause.elements.map((e) => (e.propertyName ?? e.name).text)
  }
  const clause = node.importClause
  if (!clause) return []
  if (clause.name) return null
  const nb = clause.namedBindings
  if (!nb) return []
  if (ts.isNamespaceImport(nb)) return null
  return nb.elements.map((e) => (e.propertyName ?? e.name).text)
}

/** Resolves a local module specifier to the repo-relative code files it can load (platform variants included). */
function makeResolver(root) {
  const exists = (rel) => {
    try { return fs.statSync(path.join(root, rel)).isFile() } catch { return false }
  }
  const variants = ['', '.web', '.native', '.ios', '.android']
  return function resolve(fromRel, spec) {
    let base
    if (spec.startsWith('@mechanics')) {
      base = spec === '@mechanics' ? `${ENGINE_DIR}/index` : `${ENGINE_DIR}/${spec.slice('@mechanics/'.length)}`
    } else if (spec.startsWith('@/')) {
      base = `${MOBILE_DIR}/${spec.slice(2)}`
    } else if (spec.startsWith('.')) {
      base = posix(path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec)))
    } else return []
    if (isCode(base) && exists(base)) return [base]
    const out = []
    for (const stem of [base, `${base}/index`]) {
      for (const v of variants) for (const ext of CODE_EXT) if (exists(`${stem}${v}${ext}`)) out.push(`${stem}${v}${ext}`)
      if (out.length) break
    }
    return out
  }
}

// ─── Route-href resolution ────────────────────────────────────────────────────

/** `/combat-encounter?seed=1` -> `combat-encounter`; `/(tabs)/deck` -> `deck`; `/` -> `` ; null when not a root path. */
export function hrefSegment(href) {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return null
  let seg = href.split('?')[0].split('#')[0].replace(/^\/+/, '').replace(/\/+$/, '')
  if (seg.startsWith('(tabs)/')) seg = seg.slice('(tabs)/'.length)
  return seg
}

/** Map from href segment to route id, so `/deck` and `/(tabs)/deck` both name `route:(tabs)/deck`. */
function segmentIndex(features) {
  const idx = new Map()
  for (const f of features) {
    if (!f.id.startsWith('route:')) continue
    const p = f.id.slice('route:'.length)
    idx.set(p === 'index' ? '' : p.replace(/^\(tabs\)\//, ''), f.id)
  }
  return idx
}

/**
 * The string values a navigation argument can take. Literals are read as they
 * are; a template keeps its static head; an identifier, call or property is
 * followed to its declaration (same file, or the local module it is imported
 * from, one hop at a time) and the string literals there are its candidates.
 */
function makeValueResolver(parse, resolve) {
  const MAX_DEPTH = 8

  function findDecl(sf, name) {
    let found = null
    const visit = (node) => {
      if (found) return
      if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isTypeAliasDeclaration(node))
        && node.name && ts.isIdentifier(node.name) && node.name.text === name) { found = node; return }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    return found
  }

  function importSource(rel, name) {
    for (const imp of parse(rel).imports) {
      if (imp.names && imp.names.includes(name)) return resolve(rel, imp.spec)[0] ?? null
    }
    return null
  }

  function literalsIn(rel, node, depth, seen) {
    const out = []
    const visit = (n) => {
      if (ts.isStringLiteralLike(n)) out.push(n.text)
      else if (ts.isTypeReferenceNode(n) && ts.isIdentifier(n.typeName)) out.push(...valuesOfName(rel, n.typeName.text, depth + 1, seen))
      ts.forEachChild(n, visit)
    }
    visit(node)
    return out
  }

  function valuesOfName(rel, name, depth, seen) {
    const key = `${rel}#${name}`
    if (depth > MAX_DEPTH || seen.has(key)) return []
    seen.add(key)
    const decl = findDecl(parse(rel).sf, name)
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer && !ts.isFunctionLike(decl.initializer)) {
      return [...values(rel, decl.initializer, depth + 1, seen), ...(decl.type ? literalsIn(rel, decl.type, depth, seen) : [])]
    }
    if (decl) return literalsIn(rel, decl, depth, seen)
    const src = importSource(rel, name)
    return src ? valuesOfName(src, name, depth + 1, seen) : []
  }

  function propertyValues(rel, prop) {
    const out = []
    const visit = (n) => {
      if (ts.isPropertyAssignment(n) && n.name.getText(parse(rel).sf) === prop && ts.isStringLiteralLike(n.initializer)) out.push(n.initializer.text)
      ts.forEachChild(n, visit)
    }
    visit(parse(rel).sf)
    return out
  }

  function values(rel, expr, depth = 0, seen = new Set()) {
    while (ts.isAsExpression(expr) || ts.isParenthesizedExpression(expr) || ts.isSatisfiesExpression(expr) || ts.isNonNullExpression(expr)) expr = expr.expression
    if (ts.isStringLiteralLike(expr)) return [expr.text]
    if (ts.isTemplateExpression(expr)) {
      const head = expr.head.text
      if (head.includes('?')) return [head]
      const tail = expr.templateSpans.length === 1 ? expr.templateSpans[0].literal.text : ''
      return values(rel, expr.templateSpans[0].expression, depth + 1, seen).map((v) => head + v + tail)
    }
    if (ts.isIdentifier(expr)) return valuesOfName(rel, expr.text, depth + 1, seen)
    if (ts.isCallExpression(expr)) {
      const out = [...values(rel, expr.expression, depth + 1, seen)]
      for (const a of expr.arguments) if (ts.isIdentifier(a)) out.push(...values(rel, a, depth + 1, seen))
      return out
    }
    if (ts.isPropertyAccessExpression(expr)) return propertyValues(rel, expr.name.text)
    if (ts.isConditionalExpression(expr)) return [...values(rel, expr.whenTrue, depth + 1, seen), ...values(rel, expr.whenFalse, depth + 1, seen)]
    return []
  }

  return values
}

// ─── Edges ────────────────────────────────────────────────────────────────────

/** Barrel name -> engine area, from `export { ... } from './Area/...'` lines in the engine's index. */
function barrelAreas(root, parse) {
  const map = new Map()
  const rel = `${ENGINE_DIR}/index.ts`
  if (!fs.existsSync(path.join(root, rel))) return map
  const sf = parse(rel).sf
  for (const st of sf.statements) {
    if (!ts.isExportDeclaration(st) || !st.moduleSpecifier || !ts.isStringLiteral(st.moduleSpecifier)) continue
    const m = /^\.\/([^/]+)/.exec(st.moduleSpecifier.text)
    if (!m || !st.exportClause || !ts.isNamedExports(st.exportClause)) continue
    for (const el of st.exportClause.elements) map.set(el.name.text, m[1].replace(/\.[cm]?[jt]sx?$/, ''))
  }
  return map
}

/** The engine areas one import touches: by path, or through the barrel by name. */
function engineAreasOf(targets, names, barrel) {
  const areas = new Set()
  for (const t of targets) {
    if (!t.startsWith(`${ENGINE_DIR}/`)) continue
    const rest = t.slice(ENGINE_DIR.length + 1)
    if (rest.includes('/')) areas.add(rest.split('/')[0])
    else if (stripExt(rest) === 'index' && names) for (const n of names) if (barrel.has(n)) areas.add(barrel.get(n))
  }
  return areas
}

/** Local mobile modules reachable from `start`, not crossing into other screens, layouts or `stopAt`. */
function mobileClosure(start, parse, resolve, isScreen, stopAt = new Set()) {
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const rel = queue.shift()
    for (const imp of parse(rel).imports) {
      for (const t of resolve(rel, imp.spec)) {
        if (!t.startsWith(`${MOBILE_DIR}/`) || seen.has(t) || isTestFile(t) || isScreen(t) || stopAt.has(t)) continue
        seen.add(t)
        queue.push(t)
      }
    }
  }
  return seen
}

const edgeKey = (e) => `${e.kind}\u0000${e.from}\u0000${e.to}\u0000${e.file}`

/** Flow and coupling edges for `features` in the tree at `root`, sorted and deduped. */
export function edges(root = ROOT, features = inventory(root)) {
  const parse = makeParser(root)
  const resolve = makeResolver(root)
  const values = makeValueResolver(parse, resolve)
  const barrel = barrelAreas(root, parse)
  const ids = new Set(features.map((f) => f.id))
  const segs = segmentIndex(features)
  const out = new Map()
  const add = (e) => {
    if (e.from === e.to || !ids.has(e.from) || !ids.has(e.to)) return
    out.set(edgeKey(e), e)
  }

  const appFiles = walk(root, APP_DIR)
  const isScreen = (rel) => rel.startsWith(`${APP_DIR}/`) && isCode(rel) && !isTestFile(rel)
  const routeOf = new Map(features.filter((f) => f.id.startsWith('route:')).map((f) => [f.source, f.id]))

  const flowTargets = (rel) => {
    const found = new Set()
    for (const nav of parse(rel).navs) {
      for (const v of values(rel, nav)) {
        const seg = hrefSegment(v)
        if (seg !== null && segs.has(seg)) found.add(segs.get(seg))
      }
    }
    return found
  }

  // The shell: each layout's module tree, wrapping the routes in its folder.
  const layouts = appFiles.filter((r) => isCode(r) && /(^|\/)_layout\.[cm]?[jt]sx?$/.test(r))
  const rootLayout = layouts.find((r) => r.slice(APP_DIR.length + 1).startsWith('_layout'))
  const shell = rootLayout ? mobileClosure(rootLayout, parse, resolve, isScreen) : new Set()
  for (const layout of layouts) {
    const dir = path.posix.dirname(layout)
    const wrapped = features.filter((f) => f.id.startsWith('route:') && f.source.startsWith(`${dir}/`))
    const tree = layout === rootLayout ? shell : new Set([...mobileClosure(layout, parse, resolve, isScreen)].filter((r) => r === layout || !shell.has(r)))
    for (const rel of [...tree].sort(cmp)) {
      for (const to of flowTargets(rel)) for (const f of wrapped) add({ kind: 'flow', from: f.id, to, file: rel })
    }
    // A layout that renders the tab bar links each of its routes to the others.
    if (parse(layout).tabBar) for (const a of wrapped) for (const b of wrapped) add({ kind: 'flow', from: a.id, to: b.id, file: layout })
  }

  // Each route's own tree: its flows and its engine imports. The tree is the
  // route's own modules (those the shell does not load) plus the shell modules
  // they import directly, read one level deep and not followed further.
  for (const [source, id] of [...routeOf].sort((a, b) => cmp(a[0], b[0]))) {
    const own = [...mobileClosure(source, parse, resolve, isScreen, shell)]
    const edge = new Set()
    for (const rel of own) for (const imp of parse(rel).imports) for (const t of resolve(rel, imp.spec)) if (shell.has(t) && !isTestFile(t)) edge.add(t)
    const tree = [...new Set([...own, ...edge])].sort(cmp)
    for (const rel of tree) {
      for (const to of flowTargets(rel)) add({ kind: 'flow', from: id, to, file: rel })
      for (const imp of parse(rel).imports) {
        for (const area of engineAreasOf(resolve(rel, imp.spec), imp.names, barrel)) add({ kind: 'coupling', from: id, to: `area:${area}`, file: rel })
      }
    }
  }

  // Engine area -> engine area, from imports inside the engine.
  for (const rel of walk(root, ENGINE_DIR)) {
    if (!isCode(rel) || isTestFile(rel)) continue
    const rest = rel.slice(ENGINE_DIR.length + 1)
    if (!rest.includes('/')) continue
    const from = `area:${rest.split('/')[0]}`
    for (const imp of parse(rel).imports) {
      for (const area of engineAreasOf(resolve(rel, imp.spec), imp.names, barrel)) add({ kind: 'coupling', from, to: `area:${area}`, file: rel })
    }
  }

  return [...out.values()].sort((a, b) => cmp(edgeKey(a), edgeKey(b)))
}

// ─── Output ───────────────────────────────────────────────────────────────────

/** The full map for the tree at `root`. */
export function buildFeatureMap(root = ROOT) {
  const features = inventory(root)
  return { version: 1, features, edges: edges(root, features) }
}

/** Two-space JSON, LF, trailing newline: identical bytes for an identical map. */
export function serialize(map) {
  return `${JSON.stringify(map, null, 2)}\n`
}

/**
 * What the committed feature list lacks or has extra against the tree: every
 * route file and every non-excluded top-level engine folder, enumerated here
 * on its own so the check does not trust `inventory`.
 */
export function coverageDiff(features, root = ROOT) {
  const expected = new Set()
  for (const rel of walk(root, APP_DIR)) {
    const appRel = rel.slice(APP_DIR.length + 1)
    if (isRouteFile(appRel)) expected.add(rel)
  }
  const engineAbs = path.join(root, ENGINE_DIR)
  if (fs.existsSync(engineAbs)) {
    for (const ent of fs.readdirSync(engineAbs, { withFileTypes: true })) {
      if (ent.isDirectory() && !ENGINE_AREA_EXCLUDE.includes(ent.name) && !SKIP_DIRS.has(ent.name)) expected.add(`${ENGINE_DIR}/${ent.name}`)
    }
  }
  const counts = new Map()
  for (const f of features) counts.set(f.source, (counts.get(f.source) ?? 0) + 1)
  const missing = [...expected].filter((s) => !counts.has(s)).sort(cmp)
  const extra = [...counts].filter(([s, n]) => !expected.has(s) || n > 1).map(([s]) => s).sort(cmp)
  return { missing, extra }
}

export function main(argv = process.argv.slice(2), root = ROOT) {
  const fresh = serialize(buildFeatureMap(root))
  const outAbs = path.join(root, OUT_PATH)
  if (argv.includes('--check')) {
    const committed = fs.existsSync(outAbs) ? fs.readFileSync(outAbs, 'utf8').replace(/\r\n/g, '\n') : null
    if (committed !== fresh) {
      process.stderr.write(`feature-map: ${OUT_PATH} is stale; run \`node scripts/feature-map.mjs\` and commit it.\n`)
      return 1
    }
    const { missing, extra } = coverageDiff(JSON.parse(committed).features, root)
    if (missing.length || extra.length) {
      for (const s of missing) process.stderr.write(`feature-map: missing feature for ${s}\n`)
      for (const s of extra) process.stderr.write(`feature-map: extra feature for ${s}\n`)
      return 1
    }
    return 0
  }
  fs.mkdirSync(path.dirname(outAbs), { recursive: true })
  fs.writeFileSync(outAbs, fresh)
  return 0
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) process.exitCode = main()
