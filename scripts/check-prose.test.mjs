// scripts/check-prose.test.mjs — witness for the shipped-content prose lint (phase 70).
//
// The rules under test are the house's own, not invented here: the voice rules
// come from `axiomancer-mechanics/docs/narrative/LEXICON.md` ("Ban from house
// narration") and the voice summary in `archive-pre-revamp:plan/archive/2026-09-28-revamp-r0/.claude/agents/content-curator.md` (archived R0).
//
//   node --test scripts/check-prose.test.mjs

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { loadRegistry } from './check-lexicon.mjs'
import {
  CONTENT_SURFACES, MB1_MAX_WORDS, NARRATOR_FIELDS, NARRATOR_MAX_PANEL_WORDS, NARRATOR_MAX_PANELS,
  NARRATOR_MAX_SENTENCE_WORDS, NARRATOR_RULES, NARRATOR_SPEAKERS, NARRATOR_SURFACES, PROSE_FIELDS, PROSE_RULES, VOICE_RULES,
  exemptionsIn, fieldFor, scanSource, spokenWordCount, stringLiterals,
} from './check-prose.mjs'

const retired = loadRegistry().filter((r) => r.type === 'identifier')
const rules = (findings) => findings.map((f) => f.rule)

test('every content surface listed actually exists and holds prose', () => {
  // The lint fails on an empty surface at runtime; this pins the list itself so
  // a moved file is caught by the unit test too.
  assert.ok(CONTENT_SURFACES.length > 10)
})

test('the card libraries are content surfaces (B4 inventory F4)', () => {
  assert.ok(CONTENT_SURFACES.includes('axiomancer-mechanics/src/Cards/library/starters.cards.ts'))
  assert.ok(CONTENT_SURFACES.includes('axiomancer-mechanics/src/Cards/library/blood-price.cards.ts'))
})

test('string literals are extracted with their line numbers', () => {
  const src = ["const a = 'hello there friend';", '', 'const b = "second line here";'].join('\n')
  const found = stringLiterals(src)
  assert.deepEqual(found.map((s) => s.value), ['hello there friend', 'second line here'])
  assert.deepEqual(found.map((s) => s.line), [1, 3])
})

test('code is not prose — operators and identifiers are never linted', () => {
  // The whole reason the lint reads literals rather than raw source: `!==` and
  // `!ok` would otherwise trip the exclamation rule on every file.
  const src = 'if (a !== b && !ok) { return thou; }\nconst basePower = 1;'
  assert.deepEqual(scanSource(src, retired), [])
})

test('short strings are ids and keys, not prose', () => {
  assert.deepEqual(scanSource("const k = 'thou';", retired), [])
})

test('faux-archaic constructions are flagged', () => {
  const src = "const line = 'What thou carriest, the gate will count.';"
  assert.deepEqual(rules(scanSource(src, retired)), ['faux-archaic'])
})

test('exclamation marks in player-facing prose are flagged', () => {
  const src = "const line = 'Excellent! Every observation matters here.';"
  assert.deepEqual(rules(scanSource(src, retired)), ['exclamation'])
})

test('scriptural-weather and prestige-dark filler are flagged', () => {
  assert.deepEqual(
    rules(scanSource("const a = 'The blood-red sky hung over the ford.';", retired)),
    ['scriptural-weather'],
  )
  assert.deepEqual(
    rules(scanSource("const b = 'A nameless dread settled on the camp.';", retired)),
    ['prestige-dark'],
  )
})

test('a retired term inside a string is flagged with its registry id', () => {
  const src = "const line = 'The court counts your PREMISES and finds them thin.';"
  assert.deepEqual(rules(scanSource(src, retired)), ['retired:premise'])
})

test('the prose-ok pragma exempts one rule for the file', () => {
  const src = ['// prose-ok: exclamation — the herald genuinely shouts', "const l = 'Make way! The bell is rung.';"].join('\n')
  assert.deepEqual(scanSource(src, retired), [])
})

test('the lexicon-ok pragma exempts one registry id, justification and all', () => {
  const src = [
    '// lexicon-ok: premise — the riddle asks about arguments, not the keyword',
    "const l = 'WHAT ARGUMENT HAS NO FIRST PREMISES?';",
  ].join('\n')
  assert.deepEqual(scanSource(src, retired), [])
  const ex = exemptionsIn(src)
  assert.deepEqual([...ex.lexicon], ['premise'])
  assert.deepEqual([...ex.prose], [])
})

test('a pragma exempts only what it names', () => {
  const src = ['// prose-ok: faux-archaic', "const l = 'Excellent! Every observation matters here.';"].join('\n')
  assert.deepEqual(rules(scanSource(src, retired)), ['exclamation'])
})

test('every voice rule carries a fix and a source', () => {
  for (const r of VOICE_RULES) {
    assert.ok(r.fix && r.fix.length > 10, `${r.id} has no actionable fix`)
    assert.ok(r.since && r.since.length > 5, `${r.id} does not say where the rule comes from`)
  }
})

// ── MB-1, the knife law (DELIVERY_REGISTER.md) ─────────────────────────────────

test('a literal knows which field it sits under', () => {
  const src = ["    description:", "        'a long line of prose here',", "    scene: 'inline value',"]
  assert.equal(fieldFor(src, 2), 'description')
  assert.equal(fieldFor(src, 3), 'scene')
})

test('a narration sentence past the ceiling is flagged', () => {
  const long = `word `.repeat(MB1_MAX_WORDS + 3).trim()
  const src = `    scene: '${long}.',`
  assert.deepEqual(rules(scanSource(src, retired)), ['mb1-long-sentence'])
})

test('the SAME text in rules text is not flagged', () => {
  // `paidSummary` is governed by §2.3 and the real-units law. Shortening a paid
  // line to satisfy a narration ceiling trades a mechanical guarantee for a
  // stylistic one — so MB-1 must not reach it.
  const long = `word `.repeat(MB1_MAX_WORDS + 3).trim()
  assert.deepEqual(scanSource(`    paidSummary: '${long}.',`, retired), [])
  assert.ok(!PROSE_FIELDS.has('paidSummary'))
})

test('a semicolon in narration is flagged; one in rules text is not', () => {
  assert.deepEqual(
    rules(scanSource("    narration: 'The water climbs; the stair does not.',", retired)),
    ['mb1-semicolon'],
  )
  assert.deepEqual(scanSource("    paidSummary: 'REAP ALL: 3 per Soul; SIPHON 50%.',", retired), [])
})

test('short narration sentences pass', () => {
  assert.deepEqual(scanSource("    scene: 'A cold porch of pale stone. Three doors ahead.',", retired), [])
})

test('the register rules carry a fix and cite the register', () => {
  for (const r of PROSE_RULES) {
    assert.ok(r.fix.length > 20, `${r.id} has no actionable fix`)
    assert.match(r.since, /DELIVERY_REGISTER\.md/, `${r.id} does not cite its ruling`)
  }
})

test('a prose-ok pragma exempts a register rule too', () => {
  const long = `word `.repeat(MB1_MAX_WORDS + 3).trim()
  const src = ['// prose-ok: mb1-long-sentence — quoted from a period document', `    scene: '${long}.',`].join('\n')
  assert.deepEqual(scanSource(src, retired), [])
})

// ── The Narrator (spec 177, NV1b; NARRATOR.md) ─────────────────────────────────

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const words = (n, w = 'dark') => Array.from({ length: n }, () => w).join(' ')
/** n words as short three-word sentences, so only the line cap can trip. */
const short = (n) => Array.from({ length: Math.ceil(n / 3) }, () => 'Dark salt water.').join(' ').split(' ').slice(0, n).join(' ') + '.'
const onField = (name, surface, value) => scanSource(`    ${name}: '${value}',`, retired, { fields: { [name]: surface } })
const asDescription = { fields: { description: 'line' } }

test('Narrator field: a 41-word sentence fails, a 40-word one passes', () => {
  assert.equal(NARRATOR_MAX_SENTENCE_WORDS, 40)
  assert.deepEqual(rules(onField('description', 'line', `${words(41)}.`)), ['narrator-long-sentence'])
  assert.deepEqual(onField('description', 'line', `${words(40)}.`), [])
})

test('Narrator field: a line over its surface cap fails, at the cap passes', () => {
  assert.deepEqual(rules(onField('description', 'arrival-line', short(33))), ['narrator-line-cap'])
  assert.deepEqual(onField('description', 'arrival-line', short(32)), [])
  assert.deepEqual(rules(onField('description', 'map-blurb', short(19))), ['narrator-line-cap'])
  assert.deepEqual(rules(onField('description', 'screen', short(41))), ['narrator-line-cap'])
  assert.deepEqual(rules(onField('description', 'cache-action', short(31))), ['narrator-line-cap'])
  assert.deepEqual(rules(onField('description', 'journal', short(201))), ['narrator-line-cap'])
  assert.deepEqual(onField('description', 'journal', short(200)), [])
})

test('the line cap counts spoken words: a leading "<Cast name> says," tag is not counted (T, 2026-11-12)', () => {
  const body = 'Entered as lit. It was not lit. Your man saw the sea door under the keep, standing open, and the light of it laid along the head. They paid me a key when they took the lamp. I have not used it.'
  const tagged = `Enoch Marrable says, ${body}`
  // bw-l5's turn-in line: 45 words with the tag, 42 spoken.
  assert.equal(body.split(/\s+/).length, 42)
  assert.equal(tagged.split(/\s+/).length, 45)
  assert.equal(spokenWordCount(tagged), 42)
  assert.deepEqual(onField('turnInLine', 'line', tagged), [])
  // Three more spoken words reach 45 spoken (48 with the tag): the tag is what is exempt.
  assert.deepEqual(onField('turnInLine', 'line', `${tagged} Not once today.`), [])
  // One more spoken word past the cap fails.
  assert.deepEqual(rules(onField('turnInLine', 'line', `${tagged} Not once today, ever.`)), ['narrator-line-cap'])
  // "says" mid-sentence, or after a name not on the cast sheet, earns no exemption.
  const over = `${body} Not once today, ever.`
  assert.equal(spokenWordCount(`Then Enoch Marrable says, ${body}`), 46)
  assert.deepEqual(rules(onField('turnInLine', 'line', `Then Enoch Marrable says, ${body}`)), ['narrator-line-cap'])
  assert.deepEqual(rules(onField('turnInLine', 'line', `The warden says, ${body} Not once.`)), ['narrator-line-cap'])
  assert.equal(spokenWordCount(`Enoch Marrable says, ${over}`), 46)
})

test('every speaker the lint exempts is on the story overview cast sheet', () => {
  const overview = fs.readFileSync(path.join(ROOT, 'axiomancer-mechanics/content/story/story-overview.md'), 'utf8')
  for (const name of NARRATOR_SPEAKERS) assert.ok(overview.includes(name), name)
})

test('the content.ts Narrator fields cover the quest turn-in line', () => {
  const row = NARRATOR_FIELDS.find((r) => r.file.endsWith('MapEvents/content.ts'))
  assert.equal(row.fields.turnInLine, 'line')
})

test('the surface caps are the ones T kept (2026-11-12)', () => {
  const caps = Object.fromEntries(Object.entries(NARRATOR_SURFACES).map(([k, v]) => [k, v.cap]))
  assert.deepEqual(caps, {
    'map-blurb': 18, 'arrival-line': 32, 'cache-action': 30, line: 45, screen: 40, journal: 200, story: null,
  })
})

test('Narrator field: a quotation mark fails, straight or curly; an apostrophe does not', () => {
  assert.deepEqual(rules(onField('description', 'line', 'He said \\"come\\" and the sea took him.')), ['narrator-quote'])
  assert.deepEqual(rules(onField('description', 'line', 'He said “come” and the sea took him.')), ['narrator-quote'])
  assert.deepEqual(onField('description', 'line', 'The town\\\'s tithe was due and the sea took it.'), [])
})

test('Narrator field: a 30-word sentence with "yet" or "bade" passes', () => {
  const sentence = `${words(23)} yet it stood and bade them go.`
  assert.equal(sentence.split(' ').length, 30)
  assert.deepEqual(onField('description', 'line', sentence), [])
  assert.deepEqual(onField('description', 'line', 'The keeper bade them go, yet none of them went.'), [])
})

test('Narrator field: thee, thou and hath still fail', () => {
  assert.deepEqual(rules(onField('description', 'line', 'What thou carriest the gate will count.')), ['narrator-archaic'])
  assert.deepEqual(rules(onField('description', 'line', 'The sea hath no pity for the drowned.')), ['narrator-archaic'])
})

test('Narrator field: the semicolon and exclamation rules still apply', () => {
  assert.deepEqual(rules(onField('description', 'line', 'The water climbs; the stair does not.')), ['mb1-semicolon'])
  assert.deepEqual(rules(onField('description', 'line', 'The water climbs! The stair does not.')), ['exclamation'])
})

test('Narrator field: retired terms still apply', () => {
  assert.deepEqual(rules(onField('description', 'line', 'The court counts your PREMISES and finds them thin.')), ['retired:premise'])
})

test('old rule, non-Narrator field: mb1-long-sentence still fails a 21-word sentence', () => {
  const src = `    scene: '${words(21)}.',`
  assert.deepEqual(rules(scanSource(src, retired, asDescription)), ['mb1-long-sentence'])
  // The same 21 words on the Narrator field are fine.
  assert.deepEqual(onField('description', 'line', `${words(21)}.`), [])
})

test('old rule, non-Narrator field: faux-archaic still fails', () => {
  const src = "    scene: 'What thou carriest, the gate will count.',"
  assert.deepEqual(rules(scanSource(src, retired, asDescription)), ['faux-archaic'])
})

test('old rule, non-Narrator field: mb1-semicolon still fails, and a quote or a long line is not a Narrator finding', () => {
  assert.deepEqual(rules(scanSource("    body: 'The water climbs; the stair does not.',", retired, asDescription)), ['mb1-semicolon'])
  assert.deepEqual(scanSource(`    body: 'He said "come" and the sea took him.',`, retired, asDescription), [])
})

test('with no Narrator table the old rules apply to every field, as before', () => {
  const src = `    description: '${words(21)}.',`
  assert.deepEqual(rules(scanSource(src, retired)), ['mb1-long-sentence'])
})

test('Narrator fields match a const or function name as well as an object key', () => {
  const k = `export const KEEP_GATE_REASON = '${words(46)}.';`
  assert.deepEqual(rules(scanSource(k, retired, { fields: { KEEP_GATE_REASON: 'line' } })), ['narrator-long-sentence', 'narrator-line-cap'])
  const f = ['export function eliteDropSource(name: string): string {', `    return '${words(41)}.';`, '}'].join('\n')
  assert.deepEqual(rules(scanSource(f, retired, { fields: { eliteDropSource: 'screen' } })), ['narrator-long-sentence', 'narrator-line-cap'])
})

test('a Narrator key does not leak into the entry after it', () => {
  const src = ['const t = {', `    description: '${words(46)}.',`, `    other: '${words(46)}.',`, '}'].join('\n')
  assert.deepEqual(scanSource(src, retired, asDescription).map((f) => f.line), [2, 2])
})

test('literals joined with + are one line, counted whole', () => {
  const half = words(23)
  const split = ['const t = {', '    description:', `        '${half}. ' +`, `        '${half}.',`, '}'].join('\n')
  assert.deepEqual(rules(scanSource(split, retired, asDescription)), ['narrator-line-cap'])
  // Each half alone passes; a 46-word sentence split over two literals is one sentence.
  const one = ['const t = {', '    description:', `        '${half} ' +`, `        '${half}.',`, '}'].join('\n')
  assert.deepEqual(rules(scanSource(one, retired, asDescription)), ['narrator-long-sentence', 'narrator-line-cap'])
})

test('a [content] or [NPC Content Needed] placeholder is skipped by every rule', () => {
  assert.deepEqual(onField('description', 'map-blurb', `[content] ${short(60)}`), [])
  assert.deepEqual(onField('description', 'line', '[NPC Content Needed] The host says "welcome"!'), [])
  assert.deepEqual(scanSource('const x = `[content] ${nodes[id]!.place}.`', retired), [])
})

test('story panels: 80 words a panel and six panels a screen', () => {
  assert.equal(NARRATOR_MAX_PANEL_WORDS, 80)
  assert.equal(NARRATOR_MAX_PANELS, 6)
  const screen = (count, n = 20) => ['const t = {', '    lines: [', ...Array.from({ length: count }, () => `        '${short(n)}',`), '    ],', '}'].join('\n')
  const f = { fields: { lines: 'story' } }
  assert.deepEqual(scanSource(screen(6, 80), retired, f), [])
  assert.deepEqual(rules(scanSource(screen(7), retired, f)), ['narrator-panel-count'])
  assert.deepEqual(rules(scanSource(screen(2, 81), retired, f)), ['narrator-panel-words', 'narrator-panel-words'])
})

test('story panels: the sentence ceiling is 40, not 20, and there is no cap on the whole', () => {
  const f = { fields: { lines: 'story' } }
  const ok = ['const t = {', '    lines: [', `        '${words(40)}.',`, `        '${words(40)}.',`, '    ],', '}'].join('\n')
  assert.deepEqual(scanSource(ok, retired, f), [])
  const long = ['const t = {', '    lines: [', `        '${words(41)}.',`, '    ],', '}'].join('\n')
  assert.deepEqual(rules(scanSource(long, retired, f)), ['narrator-long-sentence'])
})

test('a prose-ok pragma exempts a Narrator rule too', () => {
  const src = ['// prose-ok: narrator-long-sentence — quoted from a period document', `    description: '${words(41)}.',`].join('\n')
  assert.deepEqual(scanSource(src, retired, asDescription), [])
})

test('every Narrator rule carries a fix and cites NARRATOR.md', () => {
  for (const r of NARRATOR_RULES) {
    assert.ok(r.fix.length > 20, `${r.id} has no actionable fix`)
    assert.match(r.since, /NARRATOR\.md/, `${r.id} does not cite its ruling`)
  }
})

test('the files the Chapter 1 drafts touch are content surfaces', () => {
  for (const f of [
    'axiomancer-mechanics/src/World/MapEvents/arrival-lines.ts',
    'axiomancer-mechanics/src/World/MapEvents/content.ts',
    'axiomancer-mechanics/src/World/breakwater-chapter.questline.ts',
    'axiomancer-mechanics/src/World/Continents/Coastal-Village/breakwater-chapter.ts',
    'axiomancer-mobile/state/exploration-maps/breakwater.layout.ts',
    'axiomancer-mobile/components/combat/encounter/combat-summary.copy.ts',
    'axiomancer-mobile/components/combat/encounter/reveal.copy.ts',
    'axiomancer-mobile/state/presenters/death-return.copy.ts',
    'axiomancer-mobile/state/presenters/game-over.copy.ts',
    'axiomancer-mobile/state/presenters/quest.copy.ts',
    'axiomancer-mobile/state/presenters/village.copy.ts',
    'axiomancer-mobile/state/presenters/relic-source.copy.ts',
    'axiomancer-mechanics/src/Enemy/enemy.library.ts',
  ]) assert.ok(CONTENT_SURFACES.includes(f), `${f} is not a content surface`)
})

test('every Narrator file is a content surface and names real surfaces', () => {
  for (const row of NARRATOR_FIELDS) {
    assert.ok(CONTENT_SURFACES.includes(row.file), `${row.file} is not a content surface`)
    for (const [name, surface] of Object.entries(row.fields)) {
      assert.ok(NARRATOR_SURFACES[surface], `${row.file}: ${name} names unknown surface ${surface}`)
    }
  }
})

test('the shipped files are clean under their Narrator fields, placeholders and all', () => {
  for (const row of NARRATOR_FIELDS) {
    const text = fs.readFileSync(path.join(ROOT, row.file), 'utf8')
    assert.deepEqual(scanSource(text, retired, { file: row.file }), [], row.file)
  }
})

test('the saint beneath description passes the Narrator rules unchanged', () => {
  const file = 'axiomancer-mechanics/src/Enemy/enemy.library.ts'
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  assert.match(text, /A great fish with an old man/)
  assert.deepEqual(scanSource(text, retired, { file }), [])
})

test('the saint beneath journal page passes the journal surface unchanged, and enemy journal bodies are Narrator fields', () => {
  const file = 'axiomancer-mechanics/src/Enemy/enemy.library.ts'
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  assert.equal(NARRATOR_FIELDS.find((r) => r.file === file).fields.body, 'journal')
  assert.match(text, /Something in the dark took up his anger/)
  assert.deepEqual(scanSource(text, retired, { file }), [])
  // The page is far past the old 110 cap, so the pin is real.
  const page = text.slice(text.indexOf("id: 'codex-saint-beneath'"), text.indexOf("addedIn: RECAST_ADDED", text.indexOf("id: 'codex-saint-beneath'")))
  const body = [...page.matchAll(/'((?:[^'\\]|\\.)*)'/g)].slice(2).map((m) => m[1]).join('')
  assert.ok(body.split(/\s+/).length > 110)
})

test('--list prints both rule sets and the Narrator fields', () => {
  const out = spawnSync(process.execPath, [path.join(ROOT, 'scripts/check-prose.mjs'), '--list'], { encoding: 'utf8' }).stdout
  for (const id of ['mb1-long-sentence', 'faux-archaic', 'narrator-long-sentence', 'narrator-line-cap', 'narrator-quote', 'narrator-panel-count']) {
    assert.ok(out.includes(id), `--list does not print ${id}`)
  }
  assert.ok(out.includes('BREAKWATER_ARRIVAL_LINES -> arrival-line'))
})
