// scripts/deadlines.test.mjs — the deadline reminder's rules (scripts/deadlines-lib.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    daysUntil,
    dueNeeds,
    itemNeed,
    liveMarkdown,
    nextNeed,
    parseItems,
    parsePhaseRows,
    reminderText,
    whenText,
} from './deadlines-lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const DEADLINES = `# Deadlines

## Items

| Status | Due | Item | Window | Rows |
|---|---|---|---|---|
| [ ] | 2026-10-24 | Loop-only work | W1 | A1, A2 |
| [ ] | 2026-10-25 | Attended solves | W1 | B1 |
| [ ] | 2026-10-26 | Unplotted thing | W1 | needs plot |
| [ ] | 2026-10-27 | Half-plotted thing | W1 | A1, Z9 |
| [x] | 2026-10-20 | A done task | W1 | T |
| [ ] | 2026-10-28 | An open task | W1 | T |
| [ ] | 2026-12-01 | Far away | W4 | needs plot |
| [ ] | 2026-10-21 | Attended, not ready | W1 | C1 |

## How a window closes
`

const BUILD_PLAN = `- [x] (#600) Phase A0 — shipped (plotted). Requires nothing.
- [ ] Phase A1 — loop work. Requires A0.
- [ ] Phase A2 — loop work. Requires A1.
- [ ] Phase B1 — solves (attended): T times them. Requires A0.
- [ ] Phase C1 — later solves (attended): waits. Requires A2.
- [blocked: owner-led — T's session 2026-09-28] Phase D1 — owner work. Requires A0.
`

const items = parseItems(DEADLINES)
const phases = parsePhaseRows(BUILD_PLAN)
const byName = (name) => items.find((i) => i.name === name)

test('parseItems reads every table row and its rows cell', () => {
    assert.equal(items.length, 8)
    assert.deepEqual(byName('Loop-only work').rows, ['A1', 'A2'])
    assert.equal(byName('Unplotted thing').rows, 'needs plot')
    assert.equal(byName('A done task').rows, 'T')
    assert.equal(byName('A done task').done, true)
})

test('parsePhaseRows reads shipped, attended, owner-led and Requires', () => {
    assert.equal(phases.get('A0').shipped, true)
    assert.deepEqual(phases.get('A2').requires, ['A1'])
    assert.equal(phases.get('B1').waitsOnT, true)
    assert.equal(phases.get('D1').waitsOnT, true)
    assert.equal(phases.get('A1').waitsOnT, false)
    assert.deepEqual(phases.get('A0').requires, [])
})

test('itemNeed: loop-only work is silent', () => {
    assert.equal(itemNeed(byName('Loop-only work'), phases), null)
})

test('itemNeed: an attended row whose prerequisites shipped needs T', () => {
    assert.deepEqual(itemNeed(byName('Attended solves'), phases), { kind: 'needs you', detail: 'B1 ready for you' })
})

test('itemNeed: an attended row still waiting on loop work is silent', () => {
    assert.equal(itemNeed(byName('Attended, not ready'), phases), null)
})

test('itemNeed: needs plot, and a named id with no row, need a plot', () => {
    assert.equal(itemNeed(byName('Unplotted thing'), phases).kind, 'needs a plot')
    assert.deepEqual(itemNeed(byName('Half-plotted thing'), phases), { kind: 'needs a plot', detail: 'no row for Z9' })
})

test('itemNeed: T tasks need T until ticked', () => {
    assert.equal(itemNeed(byName('A done task'), phases), null)
    assert.equal(itemNeed(byName('An open task'), phases).kind, 'needs you')
})

test('dueNeeds keeps the horizon and overdue items, earliest first', () => {
    const needs = dueNeeds(items, phases, '2026-10-26')
    assert.deepEqual(needs.map((n) => n.name), ['Attended solves', 'Unplotted thing', 'Half-plotted thing', 'An open task'])
    assert.equal(needs[0].days, -1)
    assert.equal(nextNeed(items, phases, '2026-10-26').name, 'Far away')
})

test('daysUntil and whenText', () => {
    assert.equal(daysUntil('2026-10-30', '2026-10-31'), 1)
    assert.equal(daysUntil('2026-11-02', '2026-10-31'), -2)
    assert.equal(whenText(0), 'today')
    assert.equal(whenText(1), 'tomorrow')
    assert.equal(whenText(3), 'in 3 days')
    assert.equal(whenText(-1), '1 day overdue')
    assert.equal(whenText(-4), '4 days overdue')
})

test('reminderText leads with the list, or names the next item when empty', () => {
    const text = reminderText(dueNeeds(items, phases, '2026-10-26'), null, '2026-10-26')
    assert.match(text, /^DEADLINE REMINDER/)
    assert.match(text, /Attended solves — needs you \(B1 ready for you\)\. Due Sun, Oct 25, 1 day overdue\./)
    const empty = reminderText([], nextNeed(items, phases, '2026-11-01'), '2026-11-01')
    assert.match(empty, /Nothing needs T in the next two weeks\. Next: Far away/)
})

test('liveMarkdown renders a table and says how it is generated', () => {
    const md = liveMarkdown(dueNeeds(items, phases, '2026-10-26'), null, '2026-10-26')
    assert.match(md, /^# Live deadlines/)
    assert.match(md, /\| Due \| Item \| What it needs \| Window \|/)
    assert.match(md, /Do not edit by hand/)
})

test('the real plan parses: every Items row has a date, a window and rows', () => {
    const real = parseItems(fs.readFileSync(path.join(ROOT, 'plan/deadlines.md'), 'utf8'))
    assert.ok(real.length > 0, 'plan/deadlines.md has an Items table')
    for (const item of real) {
        assert.match(item.due, /^\d{4}-\d{2}-\d{2}$/)
        assert.match(item.window, /^W\d+$/)
        assert.ok(item.rows === 'needs plot' || item.rows === 'T' || item.rows.length > 0, item.name)
    }
})
