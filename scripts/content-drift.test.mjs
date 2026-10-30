// scripts/content-drift.test.mjs — the drift gate for the hand-synced content
// tables (phase 68, from the 2026-08-22 content-pipelines audit §2 rec 10).
//
// Each case below covers a surface the audit found drifting with NO failing
// test: the glyph table copied between two runtimes and the keyword atlas
// that feeds the `axio_keywords` MCP tool. The mechanic-kind surface is gated in TypeScript
// instead — see `CARD_SPECIAL_MECHANIC_KINDS` in axiomancer-mechanics and the
// KW-2 lint in axiomancer-mobile.
//
//   node --test scripts/content-drift.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  atlasKeywordKinds, atlasKeywords, catalogGlyphTable, ledgerLaneIds, libraryLaneIds,
  systemGlossaryTerms,
  mobileGlyphTable, mobileRegistryKeywords, PATHS,
} from './content-drift.mjs'

const keys = (o) => Object.keys(o)

// ── The glyph table, copied mobile → catalog ─────────────────────────────────
//
// These two genuinely ARE copies of one table (same keywords, same 24x24 path
// data), duplicated because they render in different runtimes. Deduplicating
// them is a refactor; asserting they agree is what makes the duplication safe.

test('the mobile and catalog glyph tables cover the same keywords', () => {
  const mobile = mobileGlyphTable()
  const catalog = catalogGlyphTable()
  assert.deepEqual(
    [...mobile.keys()].filter((k) => !catalog.has(k)),
    [],
    `keywords in ${PATHS.mobileGlyphs} that ${PATHS.catalogGlyphs} does not draw`,
  )
  assert.deepEqual(
    [...catalog.keys()].filter((k) => !mobile.has(k)),
    [],
    `keywords in ${PATHS.catalogGlyphs} that ${PATHS.mobileGlyphs} does not draw`,
  )
})

test('the mobile and catalog glyph tables draw the same shapes', () => {
  const mobile = mobileGlyphTable()
  const catalog = catalogGlyphTable()
  const different = [...mobile.entries()]
    .filter(([k, d]) => catalog.has(k) && catalog.get(k) !== d)
    .map(([k]) => k)
  assert.deepEqual(different, [], 'same keyword, different path data')
})

test('the glyph parsers found a real table, not an empty one', () => {
  // Without this the two assertions above pass vacuously the moment either
  // file is reformatted past its extractor.
  // Floors lowered to the tables' true size after the keyword audit
  // (2026-09-27, after the card purge), the R4 carrier sweep (2026-09-29,
  // which took POISON, DOOM, PETRIFY and QUARTER), the R5 sweep
  // (2026-09-30, MARK, DRAW and CLEANSE) and R7b (OATH and HEX, with the
  // card types): 4 keys each.
  assert.ok(mobileGlyphTable().size >= 4)
  assert.ok(catalogGlyphTable().size >= 4)
})

// ── The keyword atlas vs the live registry ───────────────────────────────────

/**
 * Registry keywords with no atlas row, and why. The atlas's own row policy
 * ("a term earns a row at ~3+ cards"; one-card mechanics stay card-local)
 * makes these legitimate absences rather than drift.
 */
const REGISTRY_WITHOUT_ATLAS_ROW = new Set([])

/**
 * Atlas rows that deliberately gloss NOWHERE, and why. Each is a word the atlas
 * documents but the game does not treat as a keyword.
 */
const ATLAS_WITHOUT_REGISTRY_ROW = new Set([
  // THE BIG NUMBERS REWRITE decision D6: "Deal 24" is plain English. Keywording
  // it would spend the face-term budget on the one verb needing no explanation
  // (MTG's rule: keyword what COMPRESSES). The atlas documents it as the
  // library's primary verb; it has no gloss because it needs none.
  'DEAL',
])

test('every keyword the atlas registers has a gloss in a live registry', () => {
  // The direction that matters: the atlas feeds `axio_keywords`, which agents
  // read as current law. A row for a word the game no longer glosses publishes
  // a keyword that does not exist.
  //
  // Card keywords live in mobile's `KEYWORD_GLOSS`; system terms in its
  // `SYSTEM_GLOSSARY`. (The ENEMY keyword registry was deleted with the
  // keywords in revamp phase R2b, D63.)
  const registry = {
    ...mobileRegistryKeywords(), ...systemGlossaryTerms(),
  }
  const orphans = keys(atlasKeywords())
    .filter((k) => !registry[k] && !ATLAS_WITHOUT_REGISTRY_ROW.has(k))
  assert.deepEqual(orphans, [], `atlas rows with no registry gloss (${PATHS.keywordAtlas})`)
})

test('the atlas exemption list holds no word the registries actually gloss', () => {
  const registry = {
    ...mobileRegistryKeywords(), ...systemGlossaryTerms(),
  }
  assert.deepEqual([...ATLAS_WITHOUT_REGISTRY_ROW].filter((k) => registry[k]), [])
})

test('registry keywords missing an atlas row are all accounted for', () => {
  const atlas = atlasKeywords()
  const missing = keys(mobileRegistryKeywords())
    .filter((k) => !atlas[k] && !REGISTRY_WITHOUT_ATLAS_ROW.has(k))
  assert.deepEqual(missing, [], 'new registry keyword with no atlas row and no exemption')
})

test('the exemption list holds no keyword that left the registry', () => {
  const registry = mobileRegistryKeywords()
  assert.deepEqual([...REGISTRY_WITHOUT_ATLAS_ROW].filter((k) => !registry[k]), [])
})

test('the keyword parsers found real tables', () => {
  // Floors lowered to the tables' true size after the keyword audit
  // (2026-09-27, after the card purge) and the enemy reset (R2b, 2026-09-29,
  // which took the eleven enemy keywords out of the atlas) and the R4
  // carrier sweep (2026-09-29, seven signature-only words), the R5 sweep
  // (2026-09-30, MARK, DRAW and CLEANSE) and R7b (OATH and HEX, with the
  // card types): registry 8, atlas 13.
  assert.ok(keys(mobileRegistryKeywords()).length >= 8)
  assert.ok(keys(atlasKeywords()).length >= 11)
})

// ── The atlas's Card / Rule split (Phase CS1, card-spec ballot §9) ───────────

test('the atlas sorts every row into a Card, Rule or system section', () => {
  const kinds = atlasKeywordKinds()
  assert.deepEqual(keys(atlasKeywords()).filter((k) => !kinds.has(k)), [], 'atlas rows outside a kind section')
  assert.equal(kinds.get('EXILE'), 'rule')
  assert.equal(kinds.get('GLOBAL'), 'rule')
  assert.equal(kinds.get('DEAL'), 'card')
  assert.equal(kinds.get('CONVICTION'), 'system')
  assert.equal(kinds.get('WARD'), 'enemy')
})

test('the kind extractor throws on an atlas with no kind sections', () => {
  assert.throws(() => atlasKeywordKinds('# atlas\n| **DEAL** | x | y |'), /extracted nothing/)
})

// ── Ledger <-> library parity for the Blood Price lane (Phase CS1, A6) ───────
//
// The ledger is T's ruling on which slots the lane keeps; the library is what
// ships. Parity is by slot id (`bp-<slot><option>`), not name, and leaves out
// the Curse, which the ledger lists outside the slot table.

test('the Blood Price lane ships exactly the slots the ledger keeps', () => {
  const ledger = keys(ledgerLaneIds())
  const library = keys(libraryLaneIds())
  assert.deepEqual(ledger.filter((id) => !library.includes(id)), [], `kept in ${PATHS.bloodPriceLedger} but not in the library`)
  assert.deepEqual(library.filter((id) => !ledger.includes(id)), [], `in ${PATHS.bloodPriceCards} but not kept by the ledger`)
})

test('the parity extractors applied Revision 2 and found the whole lane', () => {
  const ledger = ledgerLaneIds()
  assert.equal(keys(ledger).length, 30)
  assert.ok(ledger['bp-e-01n'], 'Revision 2 added slots are read')
  assert.ok(!ledger['bp-e-01a'], 'Revision 2 cut slots are removed')
  assert.throws(() => ledgerLaneIds('## Verdicts\nnothing kept'), /extracted nothing/)
  assert.throws(() => libraryLaneIds('const ENTRIES = []'), /extracted nothing/)
})
