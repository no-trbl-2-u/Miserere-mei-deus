// scripts/deadlines.test.mjs — the deadline reminder's rules (scripts/deadlines-lib.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    daysUntil,
    derivedStatus,
    dueNeeds,
    itemNeed,
    liveMarkdown,
    nextNeed,
    parseItems,
    parsePhaseRows,
    parseSpecChunks,
    planRows,
    parseUnscheduled,
    parseWindows,
    inWindow,
    reminderText,
    rewriteItemStatus,
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

test('A5: an attended row still waiting on loop work is never silent: it names what the loop owes', () => {
    assert.deepEqual(itemNeed(byName('Attended, not ready'), phases), { kind: 'waiting on the loop', detail: 'the loop still owes A2' })
    const text = reminderText(dueNeeds(items, phases, '2026-10-20'), null, '2026-10-20')
    assert.match(text, /Attended, not ready — waiting on the loop \(the loop still owes A2\)\./)
})

test('itemNeed: needs plot, and a named id with no row, need a plot', () => {
    assert.equal(itemNeed(byName('Unplotted thing'), phases).kind, 'needs a plot')
    assert.deepEqual(itemNeed(byName('Half-plotted thing'), phases), { kind: 'needs a plot', detail: 'no row for Z9' })
})

test('itemNeed: a ticked needs-plot Item is silent', () => {
    const [ticked, open] = parseItems([
        '# Deadlines',
        '',
        '## Items',
        '',
        '| Status | Due | Item | Window | Rows |',
        '|---|---|---|---|---|',
        '| [x] | 2026-10-26 | Plotted already | W1 | needs plot |',
        '| [ ] | 2026-10-26 | Not plotted | W1 | needs plot |',
        '',
    ].join('\n'))
    assert.equal(itemNeed(ticked, phases), null)
    assert.deepEqual(itemNeed(open, phases), { kind: 'needs a plot', detail: 'no build-plan rows yet' })
})

test('itemNeed: T tasks need T until ticked', () => {
    assert.equal(itemNeed(byName('A done task'), phases), null)
    assert.equal(itemNeed(byName('An open task'), phases).kind, 'needs you')
})

test('dueNeeds keeps the horizon and overdue items, earliest first', () => {
    const needs = dueNeeds(items, phases, '2026-10-26')
    assert.deepEqual(needs.map((n) => n.name), ['Attended, not ready', 'Attended solves', 'Unplotted thing', 'Half-plotted thing', 'An open task'])
    assert.equal(needs[0].days, -5)
    assert.equal(needs[1].days, -1)
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

const WRAPPED_PLAN = `## Status (at-a-glance)

- [ ] Phase HP4c — Author the thirty (plotted by T, 2026-10-19): ten easy, ten medium and ten hard candidates with
      their labels. Brief \`plan/README.md\` § HP4c. Requires HP4b.
- [ ] Phase HP4d — Thirty on the board (plotted by T, 2026-10-19): \`/devpuzzle\` lists the candidates in three
      bands. Brief \`plan/README.md\` § HP4d. Requires HP4c.
- [ ] Phase HP2e — Calibration solves (plotted by T, 2026-10-18) (attended): B3f dropped from Requires when it was
      cut (T, 2026-10-20). Brief \`plan/README.md\` § HP2e. Requires HP4c, HP4d.

## Per-phase scope
`

const hp4eRow = () => {
    const plan = fs.readFileSync(path.join(ROOT, 'plan/README.md'), 'utf8')
    const lines = plan.split('\n')
    const at = lines.findIndex((l) => /^- \[[^\]]*\]\s+(?:\(#\d+\)\s+)?Phase HP4e — /.test(l))
    if (at < 0) return null
    const rest = lines.slice(at + 1)
    const end = rest.findIndex((l) => !/^\s+\S/.test(l))
    return [lines[at], ...rest.slice(0, end < 0 ? undefined : end)].join('\n')
}

test('A12: a wrapped row reads its Requires from a continuation line', () => {
    const wrapped = parsePhaseRows(WRAPPED_PLAN)
    assert.deepEqual(wrapped.get('HP4c').requires, ['HP4b'])
    assert.deepEqual(wrapped.get('HP4d').requires, ['HP4c'])
    assert.deepEqual(wrapped.get('HP2e').requires, ['HP4c', 'HP4d'], 'the last Requires clause, not the prose one')
    assert.equal(wrapped.get('HP2e').waitsOnT, true)
})

test('A12: the live HP4e row is not ready while its requirements are open, and is once they all ship', () => {
    const row = hp4eRow()
    if (!row) return // HP4e has left the build plan: the fixture above still pins the rule
    assert.ok(row.includes('\n'), 'the live HP4e row wraps')
    const item = { done: false, due: '2026-11-02', name: 'W1 demo', window: 'W1', rows: ['HP4e'] }
    const live = row.replace(/^- \[[^\]]*\]/, '- [ ]')
    // The row may gain requirements (HP5d joined it on 2026-10-21); HP4c and HP4d stay among them.
    const requires = parsePhaseRows(`${live}\n`).get('HP4e').requires
    assert.ok(requires.includes('HP4c') && requires.includes('HP4d'), `HP4e requires ${requires.join(', ')}`)
    const plan = (box) => `${requires.map((id) => `- [${box}] Phase ${id} — ${id}.`).join('\n')}\n${live}\n`
    const open = parsePhaseRows(plan(' '))
    assert.deepEqual(open.get('HP4e').requires, requires)
    assert.deepEqual(itemNeed(item, open), { kind: 'waiting on the loop', detail: `the loop still owes ${requires.join(', ')}` })
    const shipped = parsePhaseRows(plan('x'))
    assert.deepEqual(itemNeed(item, shipped), { kind: 'needs you', detail: 'HP4e ready for you' })
})

test('parsePhaseRows marks open rows and reads only the Status block', () => {
    const plan = `## Status (at-a-glance)\n\n- [-] Phase P1 — partial.\n- [skipped] Phase K1 — skipped.\n- [blocked: owner-led] Phase X1 — owner.\n\n## Queue change log\n\n- [ ] Phase Q9 — quoted.\n`
    const rows = parsePhaseRows(plan)
    assert.deepEqual([...rows.keys()], ['P1', 'K1', 'X1'])
    assert.equal(rows.get('P1').open, true)
    assert.equal(rows.get('K1').open, false)
    assert.equal(rows.get('X1').open, true)
})

test('parseUnscheduled and parseWindows read their sections', () => {
    const md = `## Windows\n\n| Window | Dates | Goal | Demo |\n|---|---|---|---|\n| W1 | Oct 20 - Nov 2 | g | d |\n\n## Unscheduled\n\n- VE1c — loop work.\n- \`PF2\` — after v0.3.\n- B9\n\n## How a window closes\n- not a line\n`
    assert.deepEqual(parseUnscheduled(md), [
        { id: 'VE1c', reason: 'loop work.' },
        { id: 'PF2', reason: 'after v0.3.' },
        { id: 'B9', reason: '' },
    ])
    const w1 = parseWindows(md).get('W1')
    assert.deepEqual(w1, { from: [10, 20], to: [11, 2] })
    assert.equal(inWindow('2026-11-02', w1), true)
    assert.equal(inWindow('2026-11-03', w1), false)
})

const STATUS_PLAN = `## Status (at-a-glance)

- [x] (#600) Phase S1 — shipped. Requires nothing.
- [skipped] Phase S2 — skipped by T.
- [ ] Phase O1 — open.
`

const STATUS_DEADLINES = `# Deadlines

## Items

Prose that mentions | a pipe.

| Status | Due | Item | Window | Rows |
|---|---|---|---|---|
| [ ] | 2026-10-24 | All shipped, stale | W1 | S1, \`S2\` |
|  [x]  | 2026-10-25 | Ticked but open | W1 | S1, O1 |
| [x] | 2026-10-26 | Already right | W1 | S1 |
| [ ] | 2026-10-27 | Unknown id | W1 | Z9 |
| [ ] | 2026-10-28 | Open task | W1 | T |
| [x] | 2026-10-29 | Done task | W1 | T |
| [ ] | 2026-10-30 | Unplotted | W1 | needs plot |
| [-] | 2026-10-31 | Odd cell | W1 | S1 |

## Unscheduled

| [ ] | 2026-11-01 | Not the Items table | W1 | S1 |
`

test('A6: derivedStatus is [x] only when every named row shipped or was skipped', () => {
    const phases = parsePhaseRows(STATUS_PLAN)
    const item = (rows) => ({ done: false, due: '2026-10-24', name: 'i', window: 'W1', rows })
    assert.equal(derivedStatus(item(['S1', 'S2']), phases), '[x]')
    assert.equal(derivedStatus(item(['S1', 'O1']), phases), '[ ]')
    assert.equal(derivedStatus(item(['Z9']), phases), '[ ]')
    assert.equal(derivedStatus(item('T'), phases), null)
    assert.equal(derivedStatus(item('needs plot'), phases), null)
})

test('A6: --write flips phase Items both ways and leaves every other byte alone', () => {
    const { md, changed, unmatched } = rewriteItemStatus(STATUS_DEADLINES, parsePhaseRows(STATUS_PLAN))
    assert.deepEqual(changed, ['All shipped, stale: [ ] -> [x]', 'Ticked but open: [x] -> [ ]'])
    assert.deepEqual(unmatched, ['| [-] | 2026-10-31 | Odd cell | W1 | S1 |'])
    const expected = STATUS_DEADLINES
        .replace('| [ ] | 2026-10-24 | All shipped', '| [x] | 2026-10-24 | All shipped')
        .replace('|  [x]  | 2026-10-25 | Ticked', '|  [ ]  | 2026-10-25 | Ticked')
    assert.equal(md, expected)
    for (const line of ['| [ ] | 2026-10-28 | Open task | W1 | T |', '| [x] | 2026-10-29 | Done task | W1 | T |', '| [ ] | 2026-11-01 | Not the Items table | W1 | S1 |']) {
        assert.ok(md.includes(line), `untouched: ${line}`)
    }
})

test('A6: --write is idempotent', () => {
    const phases = parsePhaseRows(STATUS_PLAN)
    const once = rewriteItemStatus(STATUS_DEADLINES, phases).md
    const twice = rewriteItemStatus(once, phases)
    assert.equal(twice.md, once)
    assert.deepEqual(twice.changed, [])
})

test('A6: the real plan/deadlines.md is already what --write would write', () => {
    const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
    const real = read('plan/deadlines.md')
    const { md, unmatched } = rewriteItemStatus(real, parsePhaseRows(read('plan/README.md')))
    assert.deepEqual(unmatched, [])
    assert.equal(md, real)
})

// Phase DL2a: the sixth column, `Waits on`.
const SIX = `# Deadlines

## Items

| Status | Due | Item | Window | Rows | Waits on |
|---|---|---|---|---|---|
| [ ] | 2026-10-24 | Play the loop's work | W1 | T | A1, A2 |
| [ ] | 2026-10-25 | Decide it | W1 | T | A0 |
| [ ] | 2026-10-26 | Pick it | W1 | T | - |
| [ ] | 2026-10-27 | Old five-column row | W1 | T |
| [ ] | 2026-10-28 | Solve it | W1 | C1 | A1, \`A2\` |
| [ ] | 2026-10-29 | Unplotted | W1 | needs plot | A1 |
| [ ] | 2026-10-30 | Rows done, waits open | W1 | A0 | A1 |

## How a window closes
`

const six = parseItems(SIX)
const sixBy = (name) => six.find((i) => i.name === name)

test('A1: a six-column row parses its Waits on cell; "-", empty and a five-column row are none', () => {
    assert.deepEqual(sixBy("Play the loop's work").waitsOn, ['A1', 'A2'])
    assert.equal(sixBy("Play the loop's work").rows, 'T')
    assert.deepEqual(sixBy('Pick it').waitsOn, [])
    assert.deepEqual(sixBy('Old five-column row').waitsOn, [])
    assert.equal(sixBy('Old five-column row').rows, 'T')
    assert.deepEqual(sixBy('Solve it').waitsOn, ['A1', 'A2'])
    assert.deepEqual(sixBy('Solve it').rows, ['C1'])
    assert.equal(six.length, 7)
    assert.equal(items.every((i) => Array.isArray(i.waitsOn) && i.waitsOn.length === 0), true)
})

test('A4: Waits on never ticks an Item: Status derives from Rows only', () => {
    assert.equal(derivedStatus(sixBy('Rows done, waits open'), phases), '[x]')
    assert.equal(derivedStatus(sixBy('Solve it'), phases), '[ ]')
    assert.equal(derivedStatus(sixBy("Play the loop's work"), phases), null)
    const out = rewriteItemStatus(SIX, phases)
    assert.deepEqual(out.unmatched, [])
    assert.deepEqual(out.changed, ['Rows done, waits open: [ ] -> [x]'])
    assert.ok(out.md.includes('| [x] | 2026-10-30 | Rows done, waits open | W1 | A0 | A1 |'))
    assert.ok(out.md.includes("| [ ] | 2026-10-24 | Play the loop's work | W1 | T | A1, A2 |"))
    assert.equal(rewriteItemStatus(out.md, phases).md, out.md)
})

test('A5: a T act reads "the loop still owes" its open Waits on rows, and "your task" once they ship', () => {
    assert.deepEqual(itemNeed(sixBy("Play the loop's work"), phases), { kind: 'needs you', detail: 'your task; the loop still owes A1, A2' })
    assert.deepEqual(itemNeed(sixBy('Decide it'), phases), { kind: 'needs you', detail: 'your task' })
    assert.deepEqual(itemNeed(sixBy('Old five-column row'), phases), { kind: 'needs you', detail: 'your task' })
    assert.deepEqual(itemNeed(sixBy('Solve it'), phases), { kind: 'waiting on the loop', detail: 'the loop still owes A2, A1' })
    assert.equal(itemNeed(sixBy('Unplotted'), phases).kind, 'needs a plot')
    assert.equal(itemNeed({ ...sixBy("Play the loop's work"), done: true }, phases), null)
    const needs = dueNeeds(six, phases, '2026-10-24')
    assert.match(reminderText(needs, null, '2026-10-24'), /Play the loop's work — needs you \(your task; the loop still owes A1, A2\)\. Due Sat, Oct 24, today\./)
    assert.match(liveMarkdown(needs, null, '2026-10-24'), /needs you: your task; the loop still owes A1, A2/)
})

test('A5: an attended row that is ready shows beside its open Waits on rows', () => {
    const item = { done: false, due: '2026-10-25', name: 'x', window: 'W1', rows: ['B1'], waitsOn: ['A1'] }
    assert.deepEqual(itemNeed(item, phases), { kind: 'needs you', detail: 'B1 ready for you; the loop still owes A1' })
})

// NX1c: the same plan carried into a nexus v2 spec, its old ids kept as chunk aliases. A0 shipped (its
// archive line), A2 and C1 still need open chunks, B1 is attended, D1 waits on the Held lane.
const V2_SPEC = `## Chunks

- [ ] **30.1** loop work · S · closes A1 · needs — · alias: A1
- [ ] **30.2** loop work · S · closes A2 · needs 30.1 · alias: A2
- [ ] **30.3** solves (attended): T times them · S · closes A3 · needs — · alias: B1
- [ ] **30.4** later solves (attended): waits · S · closes A4 · needs 30.2 · alias: C1
- [ ] **30.5** owner work · S · closes A5 · needs — · alias: D1
`
const V2_SOURCES = {
    buildPlan: null,
    specs: [{ file: 'plan/30-carried.md', md: V2_SPEC }],
    readme: "## Lanes\n\n**Held** (waits on a person's word):\n\n- **30.5** · owner work · since: 2026-11-11 · until: T's word · max_age: 30d\n\n## Specs\n",
    archive: '- 2026-10-01 · 29.1 (alias: A0) · shipped · a1b2c3d\n',
}

test('NX1c: an id resolves from the build plan and from a spec chunk alias', () => {
    const fromPlan = planRows({ buildPlan: BUILD_PLAN })
    const fromSpec = planRows(V2_SOURCES)
    assert.deepEqual(fromPlan.errors, [])
    assert.deepEqual(fromSpec.errors, [])
    assert.deepEqual([...fromSpec.phases.keys()].sort(), [...fromPlan.phases.keys()].sort())
    assert.equal(fromPlan.phases.get('A2').source, 'plan/README.md')
    assert.equal(fromSpec.phases.get('A2').source, 'plan/30-carried.md')
    assert.equal(fromSpec.phases.get('A0').source, 'plan/ARCHIVE.md')
    assert.deepEqual(fromSpec.phases.get('C1').requires, ['A2'])
    assert.deepEqual(fromSpec.phases.get('A1').requires, [], 'a need whose chunk left every spec is met')
})

test('NX1c: status derives the same from either source', () => {
    const fromPlan = planRows({ buildPlan: BUILD_PLAN }).phases
    const fromSpec = planRows(V2_SOURCES).phases
    for (const [id, row] of fromPlan) {
        const got = fromSpec.get(id)
        assert.deepEqual([got.shipped, got.open, got.waitsOnT], [row.shipped, row.open, row.waitsOnT], id)
    }
    for (const item of items) {
        assert.deepEqual(derivedStatus(item, fromSpec), derivedStatus(item, fromPlan), item.name)
        assert.deepEqual(itemNeed(item, fromSpec), itemNeed(item, fromPlan), item.name)
    }
    assert.deepEqual(dueNeeds(items, fromSpec, '2026-10-22'), dueNeeds(items, fromPlan, '2026-10-22'))
    assert.deepEqual(rewriteItemStatus(DEADLINES, fromSpec), rewriteItemStatus(DEADLINES, fromPlan))
})

test('NX1c: a shipped alias ticks its Item; a spec with a whole-spec need waits on it', () => {
    const shipped = planRows({ ...V2_SOURCES, archive: `${V2_SOURCES.archive}- 2026-10-02 · 30.3 (alias: B1) · solves · b2c3d4e\n`, specs: [{ file: 'plan/30-carried.md', md: V2_SPEC.replace(/^.*alias: B1\n/m, '') }] })
    assert.equal(derivedStatus({ rows: ['A0', 'B1'] }, shipped.phases), '[x]')
    const spec31 = '- [ ] **31.1** next spec · S · closes A1 · needs 30 · alias: E1\n'
    const whole = planRows({ ...V2_SOURCES, specs: [...V2_SOURCES.specs, { file: 'plan/31-next.md', md: spec31 }] })
    assert.equal(whole.phases.get('E1').requires.length, 1)
    const done = planRows({ ...V2_SOURCES, specs: [{ file: 'plan/31-next.md', md: spec31 }] })
    assert.deepEqual(done.phases.get('E1').requires, [])
})

test('NX1c: parseSpecChunks reads aliases from a comma list and skips fenced examples', () => {
    const md = '```\n- [ ] **07.3** an example · S · closes A4 · needs 07.2 · alias: ZZ1\n```\n- [ ] **07.4** real · M · closes A5 · needs — · alias: `SM1a`, SM1b\n- [ ] **07.5** no alias · S · closes A6 · needs 07.4\n'
    assert.deepEqual(parseSpecChunks(md).map((c) => [c.chunk, c.aliases, c.needs]), [
        ['07.4', ['SM1a', 'SM1b'], []],
        ['07.5', [], ['07.4']],
    ])
})
