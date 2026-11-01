// scripts/nexus-sync-body.test.mjs — the weekly nexus sync PR's body (phase NX1h, A12, A14), on
// fixtures (scripts/fixtures/nexus-sync/): no change, a conflict, a heads-down.md change and a file
// merged around our lanes. Each pins the six A14 sections in order, the diagram's colour per
// outcome, and the /heads-down line (first and loud when it changed, last and quiet when not).
//
//   node --test scripts/nexus-sync-body.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  changedSections, HEADS_DOWN_CHANGED, HEADS_DOWN_SAME, mapRowFor, OUTCOMES, outcomeOf, partOf, pilotRows, renderBody, repoPathOf, tracksAny,
} from './nexus-sync-body.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIX = path.join(ROOT, 'scripts/fixtures/nexus-sync')
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(FIX, `${name}.json`), 'utf8'))
const deviations = fs.readFileSync(path.join(ROOT, 'docs/nexus-deviations.md'), 'utf8')
const body = (name, extra = {}) => renderBody({ ...fixture(name), fromVersion: '2.0.0+51b70f4', deviations, ...extra })

/** The six A14 sections, in order: the banner, what we get, the diagram, the files, before/after, what we do not get. */
const SECTIONS = ['**Only T merges this PR.**', '## What nexus is giving us', '```mermaid', '## Every file this sync touches', '## Before and after', '## What we are not getting']

function assertSections(text, name) {
  let at = -1
  for (const s of SECTIONS) {
    const i = text.indexOf(s)
    assert.ok(i > at, `${name}: "${s}" is present and after the section before it`)
    at = i
  }
  assert.match(text, /nexus 2\.0\.0\+51b70f4 @ `51b70f4` → 2\.0\.0\+f63295d @ `f63295d`/, `${name}: the banner names both versions and refs`)
  assert.match(text, /\d+ taken · \d+ merged · \d+ conflicts? kept as ours · \d+ kept ours/, `${name}: the banner counts files by outcome`)
}

/** Every file node in the diagram carries its outcome's class, and every class is drawn in its colour. */
function assertColours(text, want) {
  const diagram = /```mermaid\n([\s\S]*?)```/.exec(text)[1]
  for (const [file, outcome] of Object.entries(want)) {
    const node = diagram.split('\n').find((l) => l.includes(`["${file}<br/>`))
    assert.ok(node, `a node for ${file}`)
    assert.ok(node.endsWith(`:::${outcome}`), `${file} is coloured ${outcome}: ${node}`)
  }
  for (const [k, o] of Object.entries(OUTCOMES)) assert.match(diagram, new RegExp(`classDef ${k} fill:${o.fill}`), `${k} is drawn ${o.fill}`)
  assert.equal(OUTCOMES.taken.fill, '#2da44e', 'taken is green')
  assert.equal(OUTCOMES.merged.fill, '#d4a72c', 'merged is amber')
  assert.equal(OUTCOMES.conflict.fill, '#cf222e', 'a conflict is red')
}

test('no change: the six sections, and one line where a table would be empty', () => {
  const text = body('no-change')
  assertSections(text, 'no-change')
  assertColours(text, { 'plan/nexus.lock': 'taken' })
  assert.match(text, /Nothing that reaches this repo/)
  assert.match(text, /No skill, workflow or loop script changes behaviour in this sync\./)
  assert.match(text, /Everything nexus changed in a file we carry arrives/)
  assert.doesNotMatch(text, /\| File \| Why it stays ours/, 'no empty not-getting table')
  assert.ok(text.trimEnd().split('\n').slice(-3).join('\n').includes(HEADS_DOWN_SAME), 'the quiet /heads-down line closes the body')
  assert.doesNotMatch(text, /nexus changed \/heads-down/)
  // Custom skills and lanes files are not changed files: no node, no row.
  assert.doesNotMatch(text, /march\.lanes\.md<br\/>/)
})

test('already on the kit: the body says nothing to sync in one line', () => {
  const text = renderBody({ report: { message: 'already on nexus 2.0.0+51b70f4', why: 'the lock is the kit this CLI carries', sync: { from: {}, to: {}, counts: {} } } })
  assert.match(text.split('\n')[0], /^\*\*Nothing to sync\.\*\* already on nexus/)
})

test('a conflict: red in the diagram, a row in what we are not getting, with its map row and T\'s two ways out', () => {
  const text = body('conflict')
  assertSections(text, 'conflict')
  assertColours(text, { '.github/workflows/march.yml': 'conflict', 'scripts/cloud/cadence.mjs': 'taken', 'scripts/cloud/chain.mjs': 'taken' })
  assert.match(text, /f0 -\. ours stays \.-> mis/, 'a conflict does not reach Miserere')
  const notGetting = text.slice(text.indexOf('## What we are not getting'))
  assert.match(notGetting, /`\.github\/workflows\/march\.yml` \| 1 conflicting hunk/)
  assert.match(notGetting, /map row "`march\.yml`"/, 'the deviations map row it touches')
  assert.match(notGetting, /Take nexus's version.*or keep ours and say so in `docs\/nexus-deviations\.md`/)
  assert.match(text, /\*\*Workflows\*\*/, 'grouped by the loop part it touches')
  assert.match(text, /March lets the github-actions bot through\. \*does not reach us: `\.github\/workflows\/march\.yml` kept as ours\.\*|Chained, retried and nudged ticks reach the model: march lets the github-actions bot through\. \*does not reach us/)
  assert.match(text, /1 more nexus commit between the refs changes only nexus itself/)
  assert.ok(text.includes(HEADS_DOWN_SAME))
})

test('a heads-down.md change: the first line says so, and names the /pilot rows that track the changed sections', () => {
  const text = body('heads-down')
  assert.equal(text.split('\n')[0], '> [!WARNING]')
  assert.equal(text.split('\n')[1], `> **${HEADS_DOWN_CHANGED}.**`)
  assert.match(text, /the sections §3 Step 4, hard rule 5 of `skills\/heads-down\.md`/)
  const callout = text.slice(0, text.indexOf('> [!CAUTION]'))
  assert.match(callout, /`progress\.mjs` printed at the gate/, 'a row tracking §3 Step 4')
  assert.match(callout, /The ledger \(`scripts\/ledger\.mjs`\)/, 'a row tracking hard rule 5')
  assert.doesNotMatch(callout, /The plan read from origin/, 'a row tracking §3 Step 1.2 did not change')
  assert.doesNotMatch(callout, /Waves cut/, 'an ours row is never listed')
  assertSections(text, 'heads-down')
  assertColours(text, { 'skills/heads-down.md': 'taken', 'scripts/ledger.mjs': 'taken' })
  assert.doesNotMatch(text, new RegExp(HEADS_DOWN_SAME.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')))
})

test('a heads-down.md change before /pilot has its table: the callout still leads and says to read all of /pilot', () => {
  const text = body('heads-down', { pilot: null })
  assert.equal(text.split('\n')[1], `> **${HEADS_DOWN_CHANGED}.**`)
  assert.match(text, /no "Where each part comes from" table yet/)
})

test('a heads-down change seen only in the report (no nexus history) still leads', () => {
  const text = body('heads-down', { commits: null, texts: {} })
  assert.equal(text.split('\n')[1], `> **${HEADS_DOWN_CHANGED}.**`)
  assert.match(text, /could not be read on this run/)
})

test('a file merged around our lanes: amber, with its before/after, and a kept file in grey', () => {
  const text = body('merged-lanes')
  assertSections(text, 'merged-lanes')
  assertColours(text, { 'skills/march.md': 'merged', 'scripts/plan/order.mjs': 'taken', 'scripts/notify.mjs': 'kept' })
  const ba = text.slice(text.indexOf('## Before and after'), text.indexOf('## What we are not getting'))
  assert.match(ba, /\*\*`skills\/march\.md`\*\* \(merged\)/)
  assert.match(ba, /Kit dispatcher, triage then critique then chunk\. \| Kit dispatcher, asap chunks first/)
  assert.match(text, /\*\*Picking work\*\*/)
  assert.match(text, /`skills\/march\.md` \| March picks an asap chunk before a pre lane \| merged with ours/)
  assert.doesNotMatch(text, /march\.lanes\.md<br\/>/, 'the lanes file itself is never a changed file')
  assert.match(text.slice(text.indexOf('## What we are not getting')), /`scripts\/notify\.mjs`/)
})

test('outcomes: every status the CLI writes lands in one of four, or is not a changed file', () => {
  assert.equal(outcomeOf({ status: 'replaced' }), 'taken')
  assert.equal(outcomeOf({ status: 'new' }), 'taken')
  assert.equal(outcomeOf({ status: 'ref moved' }), 'taken')
  assert.equal(outcomeOf({ status: 'merged' }), 'merged')
  assert.equal(outcomeOf({ status: 'assisted' }), 'merged')
  assert.equal(outcomeOf({ status: 'conflict, left as ours' }), 'conflict')
  assert.equal(outcomeOf({ status: 'held back' }), 'conflict')
  assert.equal(outcomeOf({ status: 'assisted, not applied (gate red with it)' }), 'conflict')
  assert.equal(outcomeOf({ status: 'kept-custom', note: 'the kit added its own x since y; the repo\'s is kept' }), 'kept')
  assert.equal(outcomeOf({ status: 'kept-custom', note: 'lanes file: never touched' }), null)
})

test('helpers: kit paths, parts, sections, the pilot table and the map rows', () => {
  assert.equal(repoPathOf('templates/claude/commands/heads-down.md'), '.claude/commands/heads-down.md')
  assert.equal(repoPathOf('templates/.github/workflows/march.yml'), '.github/workflows/march.yml')
  assert.equal(repoPathOf('packages/cli/server/sync.mjs'), null)
  assert.equal(partOf({ subject: 'fix: x', files: ['templates/scripts/cloud/chain.mjs'] }), 'workflows')
  assert.equal(partOf({ subject: 'feat: a chunk', files: ['templates/skills/heads-down.md'] }), 'picking work')
  assert.equal(partOf({ subject: 'feat: plot splits a spec', files: [] }), 'planning')
  assert.deepEqual(changedSections('## 1. A\nx\n', '## 1. A\ny\n'), ['§1'])
  assert.ok(tracksAny('§3 Step 4, hard rule 5', ['hard rule 5']))
  assert.ok(!tracksAny('§3 Step 1.2', ['§3 Step 1']))
  assert.ok(!tracksAny('§3 Step 4', ['§3']))
  assert.ok(tracksAny('§1, `skills/reboot-resume.md`', ['§1']))
  assert.equal(pilotRows('# Skill: pilot\n\nno table'), null)
  assert.equal(mapRowFor('skills/heads-down.md', deviations)?.section, 'Carried')
})

test('the real /pilot table parses when it exists (NX1g), and every nexus row names a section', () => {
  const file = path.join(ROOT, 'skills/pilot.md')
  if (!fs.existsSync(file)) return
  const rows = pilotRows(fs.readFileSync(file, 'utf8'))
  assert.ok(rows?.length, 'skills/pilot.md §6 has rows')
  for (const r of rows.filter((x) => /^nexus\b/i.test(x.from))) assert.match(r.tracks, /§\d|hard rule \d/, r.part)
})
