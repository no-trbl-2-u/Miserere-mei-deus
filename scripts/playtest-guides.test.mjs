// scripts/playtest-guides.test.mjs — guard for axiomancer-mobile/docs/playtest-guides/.
//
// Part of the root `npm test` suite. The field guides tell a playtester agent
// which `testID`s to press and which state fixtures to boot; this test keeps
// them from rotting:
//
//   1. every id in a guide's "Test IDs" table exists as a testID literal
//      somewhere under axiomancer-mobile/app or axiomancer-mobile/components
//      (`testID="x"`, `testID={'x'}`, `testID={`x-${…}`}`, `testID: 'x'`,
//      `.withTestId('x')`). An id with a `<placeholder>` matches a template
//      literal by its static prefix; a fully static id matches either an
//      exact literal or a template whose static prefix it extends.
//   2. every fixture id a guide names (`?fixture=<id>` or a backticked token
//      shaped like a registry id) is in
//      axiomancer-mechanics/src/Game/fixtures/state-fixture.registry.ts.
//   3. every guide has the seven fixed sections in order, and the README
//      links each guide.
//   4. every backticked token shaped like a testID in sections 4 to 6 (the
//      steps and both stuck lists) is declared, as the table ids are.
//   5. every id a guide names is declared in a module that some file under
//      axiomancer-mobile/app imports, directly or transitively, so a guide
//      cannot send a player to a component no route mounts.
//   6. a line that says an overlay auto-clears, auto-finishes or
//      auto-dismisses names a timer constant its id's module declares, and a
//      line that says "tap to <verb>" for an id names an element that has an
//      `onPress`.
//
//   node --test scripts/playtest-guides.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import { makeParser, makeResolver } from './feature-map.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MOBILE = path.join(ROOT, 'axiomancer-mobile')
const GUIDES_DIR = path.join(MOBILE, 'docs', 'playtest-guides')
const REGISTRY = path.join(ROOT, 'axiomancer-mechanics', 'src', 'Game', 'fixtures', 'state-fixture.registry.ts')
const GUIDES = ['combat.md', 'hazard.md', 'minigames.md', 'narrative.md', 'map.md']
const SECTIONS = [
  /What (this screen|these screens) (is|are) for/,
  /Enter it directly/,
  /Test IDs/,
  /A correct play, step by step/,
  /Looks stuck but isn't/,
  /Actually stuck/,
  /Read the log/,
]

/** Recursively list source files under `dir`, skipping tests and node_modules. */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue
      walk(full, out)
    } else if (/\.(tsx?|jsx?|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/** Add `file` to the set kept under `key`. */
function note(map, key, file) {
  if (!map.has(key)) map.set(key, new Set())
  map.get(key).add(file)
}

/**
 * Collect every testID string the app declares.
 * Returns { exact: Set<string>, prefixes: Set<string>, files: Map } where
 * `prefixes` are the static heads of template-literal ids (`combat-die-` for
 * `combat-die-${die.id}`) and `files` maps each exact id or prefix to the
 * repo-relative files that declare it.
 */
export function collectDeclaredTestIds(dirs) {
  const exact = new Set()
  const prefixes = new Set()
  const files = new Map()
  const idLine = /testID|withTestId/
  const literal = /(['"])([A-Za-z0-9_.:-]+)\1/g
  const template = /`([A-Za-z0-9_.:-]*)\$\{/g
  for (const dir of dirs) {
    for (const file of walk(dir)) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/')
      const src = fs.readFileSync(file, 'utf8')
      for (const line of src.split('\n')) {
        if (!idLine.test(line)) continue
        for (const m of line.matchAll(literal)) {
          exact.add(m[2])
          note(files, m[2], rel)
        }
        for (const m of line.matchAll(template)) {
          if (m[1].length === 0) continue
          prefixes.add(m[1])
          note(files, m[1], rel)
        }
        // A template with no `${` on the same line as a testID is exact too.
        for (const m of line.matchAll(/`([A-Za-z0-9_.:-]+)`/g)) {
          exact.add(m[1])
          note(files, m[1], rel)
        }
      }
    }
  }
  return { exact, prefixes, files }
}

/** The declared exact ids and prefixes that back `id` (the keys `isDeclared` accepts it by). */
function backingKeys(id, declared) {
  const placeholder = id.indexOf('<')
  const keys = []
  if (placeholder >= 0) {
    const head = id.slice(0, placeholder)
    if (head.length === 0) return keys
    for (const p of declared.prefixes) if (p === head || head.startsWith(p) || p.startsWith(head)) keys.push(p)
    return keys
  }
  if (declared.exact.has(id)) keys.push(id)
  for (const p of declared.prefixes) if (id.startsWith(p)) keys.push(p)
  return keys
}

/** The repo-relative files that declare `id`, sorted. */
export function declaringFiles(id, declared) {
  const out = new Set()
  for (const key of backingKeys(id, declared)) for (const f of declared.files?.get(key) ?? []) out.add(f)
  return [...out].sort()
}

/** True when `id` from a guide table is backed by a declared testID. */
export function isDeclared(id, declared) {
  const placeholder = id.indexOf('<')
  if (placeholder >= 0) {
    const head = id.slice(0, placeholder)
    if (head.length === 0) return false
    for (const p of declared.prefixes) if (p === head || head.startsWith(p) || p.startsWith(head)) return true
    return false
  }
  if (declared.exact.has(id)) return true
  for (const p of declared.prefixes) if (id.startsWith(p)) return true
  return false
}

/** Parse the first column of the "Test IDs" table into a list of ids. */
export function parseGuideTestIds(markdown) {
  const start = markdown.indexOf('## 3. Test IDs')
  const end = markdown.indexOf('## 4.', start)
  assert.ok(start >= 0 && end > start, 'guide has a "## 3. Test IDs" section followed by "## 4."')
  const ids = []
  for (const line of markdown.slice(start, end).split('\n')) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map((c) => c.trim())
    const first = cells[1] ?? ''
    if (first === 'testID' || /^-+$/.test(first)) continue
    for (const m of first.matchAll(/`([^`]+)`/g)) ids.push(m[1])
  }
  return ids
}

/** Fixture ids a guide names: `?fixture=<id>` plus registry-shaped tokens. */
export function parseGuideFixtureIds(markdown) {
  const ids = new Set()
  for (const m of markdown.matchAll(/fixture=([a-z0-9-]+)/g)) ids.add(m[1])
  const shaped = /^(fresh-start|(apprentice|wanderer|sage|kid-l\d+|l\d+|broke-l\d+)-[a-z0-9-]+)$/
  for (const m of markdown.matchAll(/`([a-z0-9-]+)`/g)) if (shaped.test(m[1])) ids.add(m[1])
  return [...ids]
}

/** Registry ids, read straight from the TypeScript source. */
export function readRegistryIds() {
  const src = fs.readFileSync(REGISTRY, 'utf8')
  return new Set([...src.matchAll(/^\s*id:\s*'([a-z0-9-]+)'/gm)].map((m) => m[1]))
}

/** A backticked token shaped like a testID: lowercase words joined by `-`, `<placeholder>` parts allowed. */
const ID_SHAPE = /^[a-z][a-z0-9]*(?:-(?:[a-z0-9]+|<[A-Za-z]+>))+$/

/** The testID-shaped backticked tokens in `text` that are not fixture ids or DOM `aria-*` attributes. */
export function idTokens(text, registryIds = new Set()) {
  const out = []
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    if (ID_SHAPE.test(m[1]) && !m[1].startsWith('aria-') && !registryIds.has(m[1])) out.push(m[1])
  }
  return out
}

/** The text of sections 4 to 6 (the steps and both stuck lists). */
export function stepSections(markdown) {
  const start = markdown.indexOf('## 4.')
  const end = markdown.indexOf('## 7.', start)
  assert.ok(start >= 0 && end > start, 'guide has a "## 4." section followed by "## 7."')
  return markdown.slice(start, end)
}

/** A8: testID-shaped tokens in sections 4 to 6 that nothing declares. */
export function undeclaredStepIds(markdown, declared, registryIds) {
  return [...new Set(idTokens(stepSections(markdown), registryIds))].filter((id) => !isDeclared(id, declared))
}

/** Every repo-relative mobile module some file under app/ imports, directly or transitively (app files included). */
export function reachableFromApp(parse, resolve) {
  const isTest = (rel) => /(^|\/)__tests__\//.test(rel) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)
  const start = walk(path.join(MOBILE, 'app')).map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
  const seen = new Set(start)
  const queue = [...start]
  while (queue.length) {
    const rel = queue.shift()
    for (const imp of parse(rel).imports) {
      for (const t of resolve(rel, imp.spec)) {
        if (!t.startsWith('axiomancer-mobile/') || seen.has(t) || isTest(t)) continue
        seen.add(t)
        queue.push(t)
      }
    }
  }
  return seen
}

/** A9: one failure line per id whose declaring modules no file under app/ reaches. */
export function unreachableIds(ids, declared, reachable) {
  const out = []
  for (const id of new Set(ids)) {
    const owners = declaringFiles(id, declared)
    if (owners.length === 0 || owners.some((f) => reachable.has(f))) continue
    out.push(`${id} is declared only in ${owners.map((f) => path.basename(f)).join(', ')}, which no file under app/ imports`)
  }
  return out
}

/** The ids a guide line makes its claim about: a table row's first column, else every id on the line. */
function claimIds(line, registryIds) {
  if (line.startsWith('|')) return idTokens(line.split('|')[1] ?? '', registryIds)
  return idTokens(line, registryIds)
}

/** `village-card-<cardId>` and `village-card-${card.cardId}` both normalise to `village-card-<>`. */
const normalId = (id) => id.replace(/<[^>]+>/g, '<>')

/** The normalised testID a JSX attribute initializer carries, or null when it is not a literal or template. */
function attrId(ts, init) {
  let expr = init
  if (expr && ts.isJsxExpression(expr)) expr = expr.expression
  if (!expr) return null
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text
  if (ts.isTemplateExpression(expr)) return expr.head.text + expr.templateSpans.map((sp) => `<>${sp.literal.text}`).join('')
  return null
}

/** For each JSX element in `rel` whose testID is `id`: does it carry an `onPress`? */
function pressability(ts, parse, rel, id) {
  const want = normalId(id)
  const found = []
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = node.attributes.properties.filter((a) => ts.isJsxAttribute(a))
      const tid = attrs.find((a) => a.name.getText() === 'testID')
      if (tid && attrId(ts, tid.initializer) === want) found.push(attrs.some((a) => a.name.getText() === 'onPress'))
    }
    ts.forEachChild(node, visit)
  }
  visit(parse(rel).sf)
  return found
}

/** True when `rel` declares a constant named `name`. */
function declaresConst(rel, name) {
  return new RegExp(`\\bconst\\s+${name}\\b`).test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
}

const AUTO_CLAIM = /\bauto-?(clear|finish|dismiss)/i
const TAP_CLAIM = /\btap to [a-z]+/i

/** A10: one failure line per auto-clear claim with no timer constant, and per "tap to" claim on an element with no `onPress`. */
export function claimFailures(markdown, declared, ts, parse, registryIds = new Set()) {
  const out = []
  for (const line of markdown.split('\n')) {
    const ids = claimIds(line, registryIds).filter((id) => isDeclared(id, declared))
    if (AUTO_CLAIM.test(line)) {
      const consts = [...line.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((m) => m[1])
      const timed = ids.some((id) => declaringFiles(id, declared).some((f) => consts.some((c) => declaresConst(f, c))))
      if (!timed) out.push(`auto-clear claim names no timer constant its id's module declares: ${line.trim()}`)
    }
    if (TAP_CLAIM.test(line)) {
      for (const id of ids) {
        const elements = declaringFiles(id, declared).flatMap((f) => pressability(ts, parse, f, id))
        if (!elements.some(Boolean)) out.push(`"tap to" claim on ${id}, whose element has no onPress: ${line.trim()}`)
      }
    }
  }
  return out
}

const declared = collectDeclaredTestIds([path.join(MOBILE, 'app'), path.join(MOBILE, 'components')])
const registry = readRegistryIds()
const require = createRequire(path.join(ROOT, 'axiomancer-mechanics', 'package.json'))
const ts = require('typescript')
const parse = makeParser(ROOT)
const resolve = makeResolver(ROOT)
const reachable = reachableFromApp(parse, resolve)

test('the guide set is complete and the README indexes it', () => {
  const readme = fs.readFileSync(path.join(GUIDES_DIR, 'README.md'), 'utf8')
  for (const g of GUIDES) {
    assert.ok(fs.existsSync(path.join(GUIDES_DIR, g)), `${g} exists`)
    assert.ok(readme.includes(`(./${g})`), `README links ${g}`)
  }
  assert.ok(/read the guide for a screen before acting on it/i.test(readme), 'README states the read-first rule')
})

for (const g of GUIDES) {
  const md = fs.readFileSync(path.join(GUIDES_DIR, g), 'utf8')

  test(`${g}: sections appear in the fixed order`, () => {
    let cursor = 0
    SECTIONS.forEach((title, i) => {
      const heading = new RegExp(`^## ${i + 1}\\. ${title.source}`, 'm')
      const m = heading.exec(md.slice(cursor))
      assert.ok(m, `${g} has section "## ${i + 1}. ${title.source}" after the previous one`)
      cursor += m.index + 1
    })
  })

  test(`${g}: every Test IDs table entry is a real testID`, () => {
    const ids = parseGuideTestIds(md)
    assert.ok(ids.length > 0, `${g} lists at least one testID`)
    const missing = ids.filter((id) => !isDeclared(id, declared))
    assert.deepEqual(missing, [], `${g} names testIDs not found under app/ or components/`)
  })

  test(`${g}: every testID in the steps and stuck lists is a real testID`, () => {
    assert.deepEqual(undeclaredStepIds(md, declared, registry), [], `${g} sections 4 to 6 name testIDs not found under app/ or components/`)
  })

  test(`${g}: every id it names is mounted from app/`, () => {
    const ids = [...parseGuideTestIds(md), ...idTokens(stepSections(md), registry)]
    assert.deepEqual(unreachableIds(ids, declared, reachable), [], `${g} names ids no route can mount`)
  })

  test(`${g}: auto-clear and tap claims match the code`, () => {
    assert.deepEqual(claimFailures(md, declared, ts, parse, registry), [], `${g} claims a timer or a tap the tree does not have`)
  })

  test(`${g}: every fixture id is in the registry`, () => {
    const missing = parseGuideFixtureIds(md).filter((id) => !registry.has(id))
    assert.deepEqual(missing, [], `${g} names fixtures missing from state-fixture.registry.ts`)
  })
}

test('the id matcher rejects ids nobody declares', () => {
  const fake = { exact: new Set(['a-b']), prefixes: new Set(['combat-die-']) }
  assert.equal(isDeclared('a-b', fake), true)
  assert.equal(isDeclared('combat-die-<id>', fake), true)
  assert.equal(isDeclared('combat-die-7', fake), true)
  assert.equal(isDeclared('combat-coach-dismiss', fake), false)
  assert.equal(isDeclared('<x>', fake), false)
})

// Negative fixtures: lines copied from the guides before phase PH1c, each of
// which the matching check must reject.

test('a step naming an undeclared id fails the step check', () => {
  const md = '## 4. A correct play\n1. Press `combat-victory-seal-close`.\n## 5. x\n## 6. y\n## 7. z\n'
  assert.deepEqual(undeclaredStepIds(md, declared, registry), ['combat-victory-seal-close'])
})

test('the old combat.md carry-on step names an id no route mounts', () => {
  const old = '7. Pick a reward (`combat-reward-<cardId>` → `combat-reward-confirm`) or `combat-reward-skip`; close `combat-summary-close`; press `combat-victory-panel-carry-on` (or the friendship/defeat exit). You are back on the map.'
  const failures = unreachableIds(idTokens(old, registry), declared, reachable)
  assert.equal(failures.length, 1)
  assert.match(failures[0], /combat-victory-panel-carry-on/)
  assert.match(failures[0], /CombatVictoryPanel\.tsx/)
})

test('the old hazard.md resolve-flash line fails the timer check', () => {
  const old = '- `hazard-resolve-flash` likewise auto-clears.'
  assert.equal(claimFailures(old, declared, ts, parse, registry).length, 1)
})

test('the old hazard.md hand row fails the tap check', () => {
  const old = '| `hazard-hand` / `hazard-hand-<uid>` | Hand; tap to stage |'
  const failures = claimFailures(old, declared, ts, parse, registry)
  assert.equal(failures.length, 2)
  assert.match(failures[1], /hazard-hand-<uid>/)
})

test('a timed overlay and a pressable row pass the claim checks', () => {
  const lines = [
    '| `hazard-dice-roll` | Dice-roll overlay (auto-finishes after `DICE_ROLL_OVERLAY_MS` → `finishHazardRolling`) |',
    '| `village-card-<cardId>-buy` | Tap to buy (disabled when refused) |',
  ].join('\n')
  assert.deepEqual(claimFailures(lines, declared, ts, parse, registry), [])
})
