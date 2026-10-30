// scripts/content-drift.mjs — extractors for the hand-synced content tables
// that the 2026-08-22 content-pipelines audit found drifting with no failing
// test. Zero dependencies; pure functions over file text so the same parsers
// serve the drift test and any future report.
//
// Why parsers and not imports: the tables live in different runtimes (React
// Native + TS, a Node HTML generator, markdown) across the npm workspaces and
// the repo root. A test that imported them would have to run inside one
// workspace, and would then only fire on that workspace's CI path triggers —
// which is exactly how a catalog-only edit drifts unseen.
//
// EVERY extractor here self-checks: it throws when it finds nothing. A silent
// zero would make the drift gate pass vacuously the first time someone
// reformats one of the parsed files, which is the failure class this module
// exists to close.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const PATHS = {
  mobileGlyphs: 'axiomancer-mobile/components/combat/glyphShapes.ts',
  catalogGlyphs: 'scripts/build-catalog.mjs',
  mobileKeywords: 'axiomancer-mobile/state/combat/keywords.ts',
  keywordAtlas: 'axiomancer-mechanics/docs/keyword-atlas.md',
  bloodPriceLedger: 'plan/card-ledger/rehearsal-blood-price.md',
  bloodPriceCards: 'axiomancer-mechanics/src/Cards/library/blood-price.cards.ts',
}

export const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf-8')

const nonEmpty = (value, what) => {
  const size = value instanceof Map ? value.size : Object.keys(value).length
  if (size === 0) {
    throw new Error(
      `content-drift: extracted nothing for ${what}. The parsed file changed shape — ` +
        `fix the extractor rather than letting the drift gate pass on an empty set.`,
    )
  }
  return value
}

/** Body of `{...}` starting at the first brace at/after `from`, brace-matched. */
export function braceBlock(text, from) {
  const start = text.indexOf('{', from)
  if (start < 0) return ''
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return text.slice(start + 1, i)
  }
  return ''
}

/**
 * A glyph table as `Map<KEYWORD, pathData>`. Both copies declare named shape
 * consts and then alias them onto keywords, so resolve the alias to the path
 * data itself — comparing keyword→const-name would pass while the two copies
 * drew different shapes under the same local name.
 */
export function glyphTable(text, { shapeRe, tableAnchor }) {
  const shapes = new Map()
  for (const m of text.matchAll(shapeRe)) shapes.set(m[1], m[2])
  nonEmpty(shapes, 'glyph shape constants')

  const body = braceBlock(text, text.indexOf(tableAnchor))
  const table = new Map()
  for (const m of body.matchAll(/([A-Z][A-Z_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const d = shapes.get(m[2])
    if (d) table.set(m[1], d)
  }
  return nonEmpty(table, 'glyph table entries')
}

export const mobileGlyphTable = () =>
  glyphTable(read(PATHS.mobileGlyphs), {
    shapeRe: /const ([A-Z_]+): GlyphShape = \{ d: '([^']+)'/g,
    tableAnchor: 'export const GLYPH_SHAPES',
  })

export const catalogGlyphTable = () =>
  glyphTable(read(PATHS.catalogGlyphs), {
    shapeRe: /const (SHAPE_[A-Z_]+) = \{ d: "([^"]+)"/g,
    tableAnchor: 'const GLYPH_SHAPES',
  })

/** Registry keyword names (Title-Case keys of the mobile `KEYWORD_GLOSS`). */
export function mobileRegistryKeywords() {
  const text = read(PATHS.mobileKeywords)
  const body = braceBlock(text, text.indexOf('const KEYWORD_GLOSS'))
  // Keys sit at one indent level inside the object; values are strings that
  // may wrap across lines, so anchor on the key position, not the value.
  const names = new Set()
  for (const m of body.matchAll(/^ {4}('([^']+)'|([A-Za-z][A-Za-z0-9]*)):/gm)) {
    names.add((m[2] ?? m[3]).toUpperCase())
  }
  return nonEmpty(Object.fromEntries([...names].map((n) => [n, true])), 'mobile keyword registry')
}

/**
 * SYSTEM terms from mobile's `SYSTEM_GLOSSARY` — the words the atlas documents
 * that are systems rather than card keywords (CONVICTION, TOLL, RESERVE,
 * GHOST, RUNGS, WILD/X). Glossed in their own table, not `KEYWORD_GLOSS`, so
 * the third registry counts too.
 */
export function systemGlossaryTerms() {
  const text = read(PATHS.mobileKeywords)
  const names = new Set()
  for (const m of text.matchAll(/\{\s*term:\s*'([^']+)'/g)) {
    // `RESERVE & PIPS` / `WILD / X` / `CONVICTION ◆` — the atlas row leads with
    // the first bare word, so index on that.
    const first = m[1].split(/[^A-Za-z]+/).filter(Boolean)[0]
    if (first) names.add(first.toUpperCase())
  }
  return nonEmpty(Object.fromEntries([...names].map((n) => [n, true])), 'system glossary')
}

/** Keyword names from the atlas's tables, normalized (`DRAW N` → `DRAW`). */
export function atlasKeywords() {
  const text = read(PATHS.keywordAtlas)
  const names = new Set()
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue
    const cells = line.split('|').map((c) => c.trim()).slice(1, -1)
    if (!cells.length || /^:?-+:?$/.test(cells[0])) continue
    // Hallmark rows lead with the theme; every other table leads with the keyword.
    const raw = cells.length >= 6 ? cells[1] : cells[0]
    if (/^(keyword|theme|term)$/i.test(raw)) continue
    // Strip inline code AND bold markers: the atlas prints `**DEAL N**`, and
    // a parser that only ate backticks read that as `**DEAL`, which matched
    // nothing and made every registry keyword look row-less.
    const name = raw.replace(/[`*_]/g, '').trim().split(/\s+/)[0].toUpperCase()
    if (name) names.add(name)
  }
  return nonEmpty(Object.fromEntries([...names].map((n) => [n, true])), 'keyword atlas rows')
}

/**
 * Atlas rows by section kind (Phase CS1; T, card-spec ballot §9): `card` for
 * the rows under "## Card keywords", `rule` under "## Rule keywords",
 * `system` under "## System terms", `enemy` under "## Enemy keywords". The mechanics twin is
 * `parseAtlasKeywords` in `src/Cards/card-rules.ts`, which the budget lint
 * reads.
 */
export function atlasKeywordKinds(text = read(PATHS.keywordAtlas)) {
  const kinds = new Map()
  let kind = null
  for (const line of text.split(/\r?\n/)) {
    const h2 = /^## (.+)$/.exec(line)
    if (h2) {
      const t = h2[1].toLowerCase()
      kind = t.startsWith('card keywords') ? 'card'
        : t.startsWith('rule keywords') ? 'rule'
        : t.startsWith('system terms') ? 'system'
        : t.startsWith('enemy keywords') ? 'enemy'
        : null
      continue
    }
    if (!kind || !line.trim().startsWith('|')) continue
    const first = line.split('|')[1]?.trim() ?? ''
    if (!first || /^:?-+:?$/.test(first) || /^(keyword|term)$/i.test(first)) continue
    const word = first.replace(/[`*]/g, '').split(/[^A-Za-z]+/).filter(Boolean)[0]?.toUpperCase()
    if (word) kinds.set(word, kind)
  }
  return nonEmpty(kinds, 'atlas rows by kind')
}

/**
 * The Blood Price lane as the ledger rules it (Phase CS1, ledger <-> library
 * parity): the slots kept in "## Verdicts", less Revision 2's cut list, plus
 * the ids in Revision 2's "Added" table, as `bp-<slot><option>` ids, sorted.
 * Parity is by slot id, not name: names are placeholders until T names the
 * cards. The Curse sits outside the slot table, so it is not here.
 */
export function ledgerLaneIds(text = read(PATHS.bloodPriceLedger)) {
  const section = (title) => {
    const start = text.indexOf(title)
    if (start < 0) return ''
    const next = text.slice(start + title.length).search(/\n#{2,3} /)
    return next < 0 ? text.slice(start) : text.slice(start, start + title.length + next)
  }
  const slot = (s) => `bp-${s.toLowerCase()}`
  const verdicts = section('## Verdicts')
  const kept = new Set()
  for (const line of verdicts.split(/\r?\n/)) {
    if (!/^\| (Payoff|Engine|Misc) \|/.test(line)) continue
    for (const m of line.matchAll(/\b([PEM]-\d{2}[a-z])\b/g)) kept.add(slot(m[1]))
  }
  const rev2 = section('### Revision 2')
  const cutLine = /\*\*Cut[^*]*\*\*([^\n]*)/.exec(rev2)?.[1] ?? ''
  for (const m of cutLine.matchAll(/\b([PEM]-\d{2}[a-z])\b/g)) kept.delete(slot(m[1]))
  for (const m of rev2.matchAll(/^\| `(bp-[pem]-\d{2}[a-z])` \|/gm)) kept.add(m[1])
  return nonEmpty(Object.fromEntries([...kept].sort().map((id) => [id, true])), 'ledger kept slots')
}

/**
 * The Blood Price lane as the library builds it: every `slot:` in the set's
 * `ENTRIES` table, as `bp-<slot>`, sorted. The lane's `cardIds` is
 * `ENTRIES.map(toCard)`, so this is the lane less the Curse.
 */
export function libraryLaneIds(text = read(PATHS.bloodPriceCards)) {
  const ids = [...text.matchAll(/\bslot: '([pem]-\d{2}[a-z])'/g)].map((m) => `bp-${m[1]}`)
  return nonEmpty(Object.fromEntries(ids.sort().map((id) => [id, true])), 'Blood Price library slots')
}
