#!/usr/bin/env node
// scripts/check-prose.mjs — the house-voice lint for shipped `.ts` content
// (phase 70). Zero dependencies.
//
//   node scripts/check-prose.mjs             # lint every content surface
//   node scripts/check-prose.mjs <files...>  # lint just these (hook mode)
//   node scripts/check-prose.mjs --list      # print the rules + surfaces
//
// THE PIPELINE LIBERATION (2026-08-22) authorized autonomous narrative
// shipping; the guardrail did not follow. `check-lexicon.mjs` scans `.md`
// only, so every player-facing string — dialogue trees, map-event prose,
// labyrinth rooms, card and enemy text, mobile copy — shipped un-linted, and
// `content-curator.md` told its own agent to "self-check your `.ts` strings
// against the registry by hand". A hand-check is not a gate.
//
// What it lints: STRING LITERALS ONLY, from an explicit file list.
//   - literals, because linting raw TypeScript would read `!==` as an
//     exclamation mark and every identifier as prose;
//   - an explicit list, because adding a content surface should be a
//     deliberate act — and a listed file that yields no strings FAILS, so a
//     moved or renamed file cannot quietly stop being checked.
//
// Exemptions (file-level, mirroring the `.md` pragma in check-lexicon.mjs):
//   // lexicon-ok: <registry-id>, <id>   — a legitimate retired-term mention
//   // prose-ok: <rule-id>, <rule-id>    — a legitimate voice-rule exception
// Both may carry ' — why' after the list; the justification is ignored.
//
// Exit codes: 0 clean; 1 findings (file:line: rule -> what to do).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { loadRegistry } from './check-lexicon.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The authored content surfaces, from the archived `archive-pre-revamp:plan/archive/2026-09-28-revamp-r0/.claude/agents/content-curator.md`'s
 * own "Where narrative content lives" table. Explicit, not a glob.
 */
export const CONTENT_SURFACES = [
  'axiomancer-mechanics/src/World/MapEvents/content.ts',
  'axiomancer-mechanics/src/World/Labyrinth/content/act1.content.ts',
  'axiomancer-mechanics/src/World/Labyrinth/content/act2.content.ts',
  'axiomancer-mechanics/src/World/Labyrinth/content/act3.content.ts',
  'axiomancer-mechanics/src/World/Hazard/hazard.content.ts',
  'axiomancer-mechanics/src/World/RestChoice/restchoice.content.ts',
  'axiomancer-mechanics/src/World/Blacksmith/blacksmith.content.ts',
  'axiomancer-mechanics/src/World/quest.library.ts',
  'axiomancer-mechanics/src/Enemy/enemy.library.ts',
  'axiomancer-mechanics/src/Cards/cards.library.ts',
  // The card text itself (B4 inventory F4, Phase CS1): rules lines sit under
  // `free` / `paid` / `paidSummary`, so they get the voice and retired-term
  // rules but not MB-1's narration limits.
  'axiomancer-mechanics/src/Cards/library/starters.cards.ts',
  'axiomancer-mechanics/src/Cards/library/blood-price.cards.ts',
  'axiomancer-mobile/state/presenters/rest.copy.ts',
  'axiomancer-mobile/state/presenters/cache.copy.ts',
  'axiomancer-mobile/state/presenters/mercy-check.copy.ts',
  // Spec 177 (NV1b): the files the Chapter 1 drafts touch, so a line added
  // there cannot ship unlinted. Their narration fields are in NARRATOR_FIELDS.
  'axiomancer-mechanics/src/World/MapEvents/arrival-lines.ts',
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
]

/**
 * House voice rules. Sourced from `axiomancer-mechanics/docs/narrative/
 * LEXICON.md` ("Ban from house narration") and the voice summary in
 * `archive-pre-revamp:plan/archive/2026-09-28-revamp-r0/.claude/agents/content-curator.md` (archived R0). Each is a claim about PLAYER-FACING
 * prose, so each is checked against string literals only.
 */
export const VOICE_RULES = [
  {
    id: 'faux-archaic',
    re: /\b(thee|thou|thy|thine|hath|doth|ye)\b/i,
    fix: 'the house voice is "cold and old", not faux-archaic — say it plainly in modern words',
    since: 'docs/narrative/LEXICON.md "Ban from house narration"',
  },
  {
    id: 'exclamation',
    re: /!/,
    fix: 'no exclamation marks in player-facing prose — let the sentence carry the weight',
    since: 'archive-pre-revamp:plan/archive/2026-09-28-revamp-r0/.claude/agents/content-curator.md "Voice constitution"',
  },
  {
    id: 'scriptural-weather',
    re: /wrathful heavens|blood-red sky|judgmental thunder/i,
    fix: 'scriptural-weather shorthand is banned — give the scene a concrete, local detail',
    since: 'docs/narrative/LEXICON.md "Ban from house narration"',
  },
  {
    id: 'prestige-dark',
    re: /\bineffable\b|\bnameless dread\b|\bunspeakable evil\b/i,
    fix: 'prestige-dark filler is banned — name the thing, or cut the sentence',
    since: 'docs/narrative/LEXICON.md "Ban from house narration"',
  },
]

/**
 * Fields whose value is NARRATION, and so subject to MB-1 (`docs/narrative/DELIVERY_REGISTER.md`).
 *
 * `paidSummary` is deliberately absent: it is rules text, governed by §2.3 and
 * the real-units-or-no-number law. Shortening a paid line to satisfy a
 * narration ceiling would trade a mechanical guarantee for a stylistic one.
 * The voice and retired-term rules still apply to every literal — a retired
 * keyword in rules text is just as wrong.
 */
export const PROSE_FIELDS = new Set([
  'description', 'scene', 'narration', 'text', 'remark', 'flavor', 'intro',
  'body', 'quiet', 'heavy', 'journalEntry', 'blurb', 'summary',
  'prompt', 'lines', 'line', 'refusal', 'riddle', 'title', 'subtitle',
])

/**
 * MB-1, the knife law (`docs/narrative/DELIVERY_REGISTER.md`), mechanically checkable half.
 * Narration only — see PROSE_FIELDS.
 */
export const MB1_MAX_WORDS = 20

export const PROSE_RULES = [
  {
    id: 'mb1-long-sentence',
    fix: `MB-1: narration runs short — target under twelve words, hard ceiling ${MB1_MAX_WORDS}`,
    since: 'DELIVERY_REGISTER.md MB-1',
    test: (value) => sentencesOf(value).some((s) => wordCount(s) > MB1_MAX_WORDS),
  },
  {
    id: 'mb1-semicolon',
    fix: 'MB-1: a semicolon in player-facing prose is a defect — full stops are '
      + 'the register. Split the sentence; do not swap the semicolon for a comma',
    since: 'DELIVERY_REGISTER.md MB-1',
    test: (value) => value.includes(';'),
  },
]

export const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length
export const sentencesOf = (value) =>
  value.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 3)

/**
 * THE NARRATOR (spec 177, `axiomancer-mechanics/docs/narrative/NARRATOR.md`).
 *
 * One of the game's three voices. On the fields listed in NARRATOR_FIELDS the
 * Narrator's rules replace `mb1-long-sentence` (20 words) and `faux-archaic`;
 * every other field is linted exactly as before. `mb1-semicolon`, `exclamation`
 * and the retired-term and filler rules still apply to Narrator fields.
 */

/** Surface names mapped to their whole-line word cap. `story` has no cap on the whole: it is panels. */
export const NARRATOR_SURFACES = {
  'map-blurb':    { cap: 18, label: 'map blurb' },
  'arrival-line': { cap: 32, label: 'arrival line' },
  'cache-action': { cap: 30, label: 'loot cache action' },
  'line':         { cap: 45, label: 'hazard, rest, dream, travel, quest and description line' },
  'screen':       { cap: 40, label: 'screen copy' },
  'journal':      { cap: 200, label: 'journal' },
  'story':        { cap: null, label: 'story screen or cutscene panel', panels: true },
}

/** A sentence ceiling for every Narrator surface (NARRATOR.md rules 1 and 3). */
export const NARRATOR_MAX_SENTENCE_WORDS = 40
/** A story panel holds at most this many words; a story screen at most this many panels (T, 2026-11-12). */
export const NARRATOR_MAX_PANEL_WORDS = 80
export const NARRATOR_MAX_PANELS = 6

/**
 * Where the Narrator writes. `fields` maps a name to a surface; a literal is a
 * Narrator literal when the object key it sits under, or else the top-level
 * `const`/`function` that holds it, is named here. Literals joined with `+`
 * are one line. Enemy journal bodies are the `journal` surface (cap 200: T,
 * 2026-11-12, raised so his own saint beneath page passes unchanged).
 */
export const NARRATOR_FIELDS = [
  { file: 'axiomancer-mechanics/src/World/MapEvents/content.ts', fields: {
    description: 'line', prompt: 'line', lockedLine: 'line', BREAKWATER_REST_DREAMS: 'line',
    card: 'cache-action', item: 'cache-action', lines: 'story',
  } },
  { file: 'axiomancer-mechanics/src/World/MapEvents/arrival-lines.ts', fields: {
    BREAKWATER_ARRIVAL_LINES: 'arrival-line',
  } },
  { file: 'axiomancer-mechanics/src/World/breakwater-chapter.questline.ts', fields: {
    description: 'line', BREAKWATER_CHAPTER_STEPS: 'line',
  } },
  { file: 'axiomancer-mechanics/src/World/Continents/Coastal-Village/breakwater-chapter.ts', fields: {
    KEEP_GATE_REASON: 'line', BRIDGE_GATE_REASON: 'line',
  } },
  { file: 'axiomancer-mobile/state/exploration-maps/breakwater.layout.ts', fields: {
    description: 'map-blurb',
  } },
  { file: 'axiomancer-mobile/components/combat/encounter/combat-summary.copy.ts', fields: {
    DEFEAT_CAUSE_LINES: 'screen',
  } },
  { file: 'axiomancer-mobile/components/combat/encounter/reveal.copy.ts', fields: {
    WITHDRAW_COST: 'screen',
  } },
  { file: 'axiomancer-mobile/state/presenters/death-return.copy.ts', fields: {
    DEATH_RETURN_BODY: 'screen', DEATH_RETURN_KEPT: 'screen',
  } },
  { file: 'axiomancer-mobile/state/presenters/game-over.copy.ts', fields: {
    GAME_OVER_BODY: 'screen',
  } },
  { file: 'axiomancer-mobile/state/presenters/quest.copy.ts', fields: {
    QUEST_GIVER_FALLBACK: 'line', QUEST_LOCKED_LINE: 'line',
  } },
  // The three counter lines only; the host, innkeeper and shopkeeper lines are spoken (the People).
  { file: 'axiomancer-mobile/state/presenters/village.copy.ts', fields: {
    VILLAGE_REST_LINE: 'screen', VILLAGE_CARD_SHOP_LINE: 'screen', VILLAGE_EQUIPMENT_LINE: 'screen',
  } },
  { file: 'axiomancer-mobile/state/presenters/relic-source.copy.ts', fields: {
    questRewardSource: 'screen', spareGearSource: 'screen', eliteDropSource: 'screen',
  } },
  { file: 'axiomancer-mechanics/src/Enemy/enemy.library.ts', fields: {
    description: 'line', body: 'journal',
  } },
]

/** The Narrator's rules. `ctx` is `{ surface }`, one of NARRATOR_SURFACES. */
export const NARRATOR_RULES = [
  {
    id: 'narrator-long-sentence',
    fix: `Narrator: a sentence runs at most ${NARRATOR_MAX_SENTENCE_WORDS} words — split it`,
    since: 'NARRATOR.md rule 1',
    test: (value) => sentencesOf(value).some((s) => wordCount(s) > NARRATOR_MAX_SENTENCE_WORDS),
  },
  {
    id: 'narrator-line-cap',
    fix: 'Narrator: this line is over its surface\'s word cap (NARRATOR.md rule 2) — cut it',
    since: 'NARRATOR.md rule 2',
    test: (value, ctx) => ctx.surface.cap != null && wordCount(value) > ctx.surface.cap,
  },
  {
    id: 'narrator-panel-words',
    fix: `Narrator: a story panel holds at most ${NARRATOR_MAX_PANEL_WORDS} words — split the panel`,
    since: 'NARRATOR.md rule 3',
    test: (value, ctx) => ctx.surface.panels === true && wordCount(value) > NARRATOR_MAX_PANEL_WORDS,
  },
  {
    id: 'narrator-quote',
    fix: 'Narrator: no quotation marks; set reported speech off with a comma',
    since: 'NARRATOR.md rule 4',
    test: (value) => /["“”]/.test(value),
  },
  {
    id: 'narrator-archaic',
    fix: 'Narrator: "thee", "thou", "hath" and their kin are never used (a "yet" or a "bade" is fine, sparingly)',
    since: 'NARRATOR.md rule 8',
    test: (value) => /\b(thee|thou|thy|thine|hath|doth)\b/i.test(value),
  },
]

/** The array-level rule: a story screen is at most NARRATOR_MAX_PANELS panels. */
export const NARRATOR_PANEL_COUNT_RULE = {
  id: 'narrator-panel-count',
  fix: `Narrator: a story screen holds at most ${NARRATOR_MAX_PANELS} panels — cut or split the scene`,
  since: 'NARRATOR.md rule 3',
}

/** Rules the Narrator's replace on a Narrator field. */
const REPLACED_ON_NARRATOR_FIELDS = new Set(['mb1-long-sentence', 'faux-archaic'])

const PLACEHOLDER_RE = /^\s*\[(?:content|NPC Content Needed)\]/

/** The file's `fields` table, `{ name: surface }`, or null when the file has no Narrator fields. */
export function narratorFieldsFor(file) {
  const row = NARRATOR_FIELDS.find((r) => r.file === file)
  return row ? row.fields : null
}

/**
 * Lex `text` into the Narrator view of its string literals.
 *
 * Returns `{ scopes, panelCounts }`. `scopes` maps a literal's start index to
 * `{ name, surface, group }` for each literal under a Narrator field (`group`
 * holds the whole `+`-joined line and the start index of its first literal);
 * `panelCounts` lists `{ index, name, count }` for each `story` array.
 * Comments are skipped here, so an apostrophe in one cannot hide a field.
 */
export function narratorScopes(text, fields) {
  const tokens = []
  let i = 0
  const n = text.length
  while (i < n) {
    const c = text[i]
    if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue }
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue }
    if (c === "'" || c === '"' || c === '`') {
      const start = i
      i++
      while (i < n && text[i] !== c) {
        if (text[i] === '\\') i++
        else if (c !== '`' && text[i] === '\n') break
        i++
      }
      tokens.push({ t: 's', index: start, value: text.slice(start + 1, i) })
      i++
      continue
    }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[\w$]+/.exec(text.slice(i, i + 80))
      tokens.push({ t: 'i', value: m[0], index: i })
      i += m[0].length
      continue
    }
    if (c === '?' && (text[i + 1] === '.' || text[i + 1] === '?')) { i += 2; continue }
    if ('()[]{}:,+?;'.includes(c)) tokens.push({ t: 'p', value: c, index: i })
    i++
  }

  const scopes = new Map()
  const panelCounts = []
  const frames = [{ open: null, key: null, curKey: null, tern: 0, count: 0, index: 0 }]
  let decl = null
  let group = null
  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k]
    const top = frames[frames.length - 1]
    if (tok.t === 'i') {
      const prev = tokens[k - 1]
      if (frames.length === 1 && prev?.t === 'i' && ['const', 'let', 'var', 'function', 'class'].includes(prev.value)) {
        decl = tok.value
      }
    } else if (tok.t === 'p') {
      const v = tok.value
      if (v === '(' || v === '[' || v === '{') {
        frames.push({
          open: v, key: v === '{' ? null : (top.curKey ?? top.key), curKey: null, tern: 0, count: 0, index: tok.index,
        })
      } else if (v === ')' || v === ']' || v === '}') {
        if (frames.length > 1) {
          const f = frames.pop()
          const surface = f.open === '[' && f.key != null && Object.hasOwn(fields, f.key) ? fields[f.key] : null
          if (surface && NARRATOR_SURFACES[surface]?.panels) panelCounts.push({ index: f.index, name: f.key, count: f.count })
        }
      } else if (v === ',' || v === ';') {
        top.curKey = null
        top.tern = 0
      } else if (v === '?') {
        top.tern++
      } else if (v === ':') {
        if (top.tern > 0) top.tern--
        else {
          const prev = tokens[k - 1]
          if (prev && (prev.t === 'i' || prev.t === 's')) top.curKey = prev.value
        }
      }
    } else {
      const next = tokens[k + 1]
      if (next?.t === 'p' && next.value === ':' && top.tern === 0) continue // a quoted key, not a value
      const prev = tokens[k - 1]
      const continues = Boolean(group) && prev?.t === 'p' && prev.value === '+' && tokens[k - 2]?.t === 's'
      const key = top.curKey ?? top.key
      let name = null
      if (continues) name = group.name
      else if (key != null && Object.hasOwn(fields, key)) name = key
      else if (decl != null && Object.hasOwn(fields, decl)) name = decl
      if (!continues) {
        group = name == null ? null : { name, head: tok.index, value: tok.value }
        top.count++
      } else {
        group.value += tok.value
      }
      if (name != null) scopes.set(tok.index, { name, surface: NARRATOR_SURFACES[fields[name]], group })
    }
  }
  return { scopes, panelCounts }
}

const PRAGMA_RE = /\/\/\s*(lexicon-ok|prose-ok):\s*([^\n]+)/g

/** File-level exemptions, as `{ lexicon: Set, prose: Set }`. */
export function exemptionsIn(text) {
  const out = { lexicon: new Set(), prose: new Set() }
  for (const m of text.matchAll(PRAGMA_RE)) {
    const ids = m[2].split(/\s+[—–]\s+/, 1)[0].split(',').map((s) => s.trim()).filter(Boolean)
    for (const id of ids) out[m[1] === 'lexicon-ok' ? 'lexicon' : 'prose'].add(id)
  }
  return out
}

/**
 * Every string literal in `text`, with its 1-based line.
 *
 * Deliberately simple: single-, double-, and back-quoted runs, with escapes
 * skipped. Template interpolations come through as part of the literal, which
 * is fine — a `${}` never contains prose the rules care about, and treating
 * one as text has no false-positive path for any rule here.
 */
export function stringLiterals(text) {
  const out = []
  const lines = text.split(/\r?\n/)
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
  let m
  while ((m = re.exec(text)) !== null) {
    const value = m[1] ?? m[2] ?? m[3]
    if (value == null) continue
    const line = text.slice(0, m.index).split(/\r?\n/).length
    out.push({ value, line, index: m.index, field: fieldFor(lines, line) })
  }
  return out
}

/**
 * The object key a literal sits under, or null. Walks back a few lines because
 * a wrapped value puts its key above the text (`description:\n    '…' +`).
 *
 * This is what lets MB-1 apply to narration and NOT to rules text — see
 * PROSE_FIELDS.
 */
export function fieldFor(lines, line) {
  for (let i = line - 1; i >= Math.max(0, line - 4); i--) {
    const m = /(\w+):\s*$|(\w+):\s*['"`]/.exec(lines[i] ?? '')
    if (m) return m[1] ?? m[2]
  }
  return null
}

/** Ids, keys, and enum values are not prose. */
const MIN_PROSE_LENGTH = 12

/**
 * Findings for one file's text: `{ rule, line, fix, excerpt }`.
 *
 * `opts.file` (repo-relative) selects the file's Narrator fields from
 * NARRATOR_FIELDS; `opts.fields` passes a `{ name: surface }` table directly
 * (tests). With neither, every field is linted by the old rules.
 */
export function scanSource(text, retiredRows, opts = {}) {
  const exempt = exemptionsIn(text)
  const findings = []
  const fields = opts.fields ?? (opts.file ? narratorFieldsFor(opts.file) : null)
  const narrator = fields ? narratorScopes(text, fields) : null
  const push = (rule, line, value) => findings.push({ rule: rule.id, line, fix: rule.fix, excerpt: value.slice(0, 80) })

  for (const { value, line, index, field } of stringLiterals(text)) {
    // A placeholder is authored later; the lint reads the words that replace it.
    if (PLACEHOLDER_RE.test(value)) continue
    const scope = narrator?.scopes.get(index)
    if (scope?.group.head === index) {
      // The whole `+`-joined line, judged once, at its first literal.
      const whole = scope.group.value
      if (!PLACEHOLDER_RE.test(whole)) {
        for (const rule of NARRATOR_RULES) {
          if (!exempt.prose.has(rule.id) && rule.test(whole, scope)) push(rule, line, whole)
        }
        const semi = PROSE_RULES.find((r) => r.id === 'mb1-semicolon')
        if (!exempt.prose.has(semi.id) && semi.test(whole)) push(semi, line, whole)
      }
    }
    if (value.length < MIN_PROSE_LENGTH) continue
    if (!scope && PROSE_FIELDS.has(field)) {
      for (const rule of PROSE_RULES) {
        if (exempt.prose.has(rule.id)) continue
        if (rule.test(value)) push(rule, line, value)
      }
    }
    for (const rule of VOICE_RULES) {
      if (exempt.prose.has(rule.id)) continue
      if (scope && REPLACED_ON_NARRATOR_FIELDS.has(rule.id)) continue
      if (rule.re.test(value)) push(rule, line, value)
    }
    for (const row of retiredRows) {
      if (exempt.lexicon.has(row.id)) continue
      row.re.lastIndex = 0
      if (row.re.test(value)) {
        findings.push({
          rule: `retired:${row.id}`,
          line,
          fix: row.replacement,
          excerpt: value.slice(0, 80),
        })
      }
    }
  }
  if (narrator && !exempt.prose.has(NARRATOR_PANEL_COUNT_RULE.id)) {
    for (const p of narrator.panelCounts) {
      if (p.count > NARRATOR_MAX_PANELS) {
        const line = text.slice(0, p.index).split(/\r?\n/).length
        push(NARRATOR_PANEL_COUNT_RULE, line, `${p.name}: ${p.count} panels`)
      }
    }
  }
  return findings
}

function main() {
  // Doctrine rows are `.md`-shaped design claims; game prose is linted against
  // the retired TERM rows, which is what a player-facing string can carry.
  const retired = loadRegistry().filter((r) => r.type === 'identifier')

  if (process.argv.includes('--list')) {
    for (const r of VOICE_RULES) console.log(`${r.id}: /${r.re.source}/ — ${r.fix} (${r.since})`)
    for (const r of PROSE_RULES) console.log(`${r.id}: [narration fields; mb1-long-sentence and faux-archaic not on Narrator fields] — ${r.fix} (${r.since})`)
    console.log('\nThe Narrator (spec 177); these replace mb1-long-sentence and faux-archaic on its fields:')
    for (const r of NARRATOR_RULES) console.log(`${r.id}: [Narrator fields only] — ${r.fix} (${r.since})`)
    console.log(`${NARRATOR_PANEL_COUNT_RULE.id}: [story arrays only] — ${NARRATOR_PANEL_COUNT_RULE.fix} (${NARRATOR_PANEL_COUNT_RULE.since})`)
    console.log('\nNarrator surfaces (word cap on the whole line):')
    for (const [id, sf] of Object.entries(NARRATOR_SURFACES)) {
      console.log(`  ${id}: ${sf.cap ?? `none; panels of ${NARRATOR_MAX_PANEL_WORDS} words, ${NARRATOR_MAX_PANELS} a screen`} (${sf.label})`)
    }
    console.log('\nNarrator fields:')
    for (const row of NARRATOR_FIELDS) {
      console.log(`  ${row.file}`)
      for (const [name, surface] of Object.entries(row.fields)) console.log(`    ${name} -> ${surface}`)
    }
    console.log(`\n${CONTENT_SURFACES.length} content surfaces:`)
    for (const s of CONTENT_SURFACES) console.log(`  ${s}`)
    process.exit(0)
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const targets = args.length
    ? args.map((a) => path.relative(ROOT, path.resolve(ROOT, a)).replaceAll('\\', '/'))
    : CONTENT_SURFACES

  const findings = []
  const empty = []
  let scanned = 0
  for (const rel of targets) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) {
      // A listed surface that moved is a lint failure, not a silent skip.
      empty.push(`${rel} (missing)`)
      continue
    }
    const text = fs.readFileSync(abs, 'utf-8')
    const literals = stringLiterals(text)
    if (args.length === 0 && literals.length === 0) empty.push(`${rel} (no string literals)`)
    scanned++
    for (const f of scanSource(text, retired, { file: rel })) {
      findings.push(`${rel}:${f.line}: ${f.rule} — ${f.fix}\n      ${JSON.stringify(f.excerpt)}`)
    }
  }

  if (empty.length) {
    console.error('check-prose: listed content surfaces yielded nothing to lint:')
    empty.forEach((e) => console.error(`  ${e}`))
    console.error('\nA surface that moved must be re-listed in CONTENT_SURFACES, not left')
    console.error('to pass vacuously. Fix the list.')
    process.exit(1)
  }

  if (findings.length) {
    console.error(`check-prose: ${findings.length} house-voice finding(s):`)
    findings.forEach((f) => console.error(`  ${f}`))
    console.error(`\nRewrite the line, or if the use is legitimate add a file-level`)
    console.error(`'// prose-ok: <rule>' / '// lexicon-ok: <id>' pragma with its reason.`)
    console.error(`Voice rules: axiomancer-mechanics/docs/narrative/LEXICON.md.`)
    process.exit(1)
  }
  console.log(
    `check-prose: ${scanned} content surface(s) clean against `
      + `${VOICE_RULES.length} voice + ${PROSE_RULES.length} register + ${NARRATOR_RULES.length + 1} Narrator rule(s) `
      + `+ ${retired.length} retired term(s)`,
  )
}

/**
 * True when this module is the process entry point.
 *
 * The old guard compared `import.meta.url` to `file://${process.argv[1]}`.
 * On Windows `process.argv[1]` is a backslash path (`C:\Users\...`) while
 * `import.meta.url` is `file:///C:/Users/...`, so the comparison was ALWAYS
 * false: every one of these CLIs exited 0 with no output on Windows, and the
 * `PostToolUse` lexicon hook was a silent no-op there. Normalising both sides
 * through `pathToFileURL` fixes it on every platform.
 */
function isDirectRun(moduleUrl) {
    if (!process.argv[1]) return false
    return moduleUrl === pathToFileURL(process.argv[1]).href
}

if (isDirectRun(import.meta.url)) main()
