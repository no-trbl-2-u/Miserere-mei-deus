// scripts/check-deadlines.test.mjs — the deadline lint (scripts/check-deadlines.mjs, phase DL1a).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkDeadlines } from './check-deadlines.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const WINDOWS = `## Windows

| Window | Dates | Goal | Demo T checks at the end |
|---|---|---|---|
| W1 | Oct 20 - Nov 2 | One | a demo |
| W2 | Nov 3 - Nov 16 | Two | a demo |
| W9 | Dec 20 - Jan 3 | Over the year | a demo |
`

const deadlines = (rows, unscheduled = '') => `# Deadlines

${WINDOWS}
## Items

| Status | Due | Item | Window | Rows |
|---|---|---|---|---|
${rows.join('\n')}
${unscheduled ? `\n## Unscheduled\n\nIntro prose.\n\n${unscheduled}\n` : ''}
## How a window closes
`

// A0 shipped, A1 open, W1 wraps (its Requires on a continuation line), K1 skipped,
// P1 partial, X1 blocked; one shipped row outside the Status block is ignored.
const BUILD_PLAN = `# Build plan

## Status (at-a-glance)

- [x] (#600) Phase A0 — shipped. Requires nothing.
- [ ] Phase A1 — open loop work. Requires A0.
- [ ] Phase W1 — a wrapped row (plotted by T) (attended): its text runs
      on past the first line. Requires A1.
- [skipped] Phase K1 — skipped by T. Requires A0.
- [-] Phase P1 — partial with carry-overs.
- [blocked: owner-led — T's session] Phase X1 — owner work. Requires A0.

## Queue change log

- [ ] Phase Q9 — a quoted row in the log, not a phase.
`

const COVER_ALL = [
    '| [ ] | 2026-10-24 | Loop work | W1 | A1 |',
    '| [ ] | 2026-11-05 | Wrapped | W2 | W1 |',
]
const EXCUSE_REST = '- P1 — pre-revamp partial.\n- `X1` — blocked: owner-led.'

test('a plan that covers every open row passes', () => {
    assert.deepEqual(checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), BUILD_PLAN), [])
})

test('A2: an open row with no Item and no Unscheduled line fails, naming the row', () => {
    const errors = checkDeadlines(deadlines(COVER_ALL, '- P1 — pre-revamp partial.'), BUILD_PLAN)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /01_build_plan\.md: open row X1 \[blocked: owner-led/)
    assert.match(errors[0], /## Unscheduled/)
})

test('A2: a wrapped open row is covered like any other', () => {
    const errors = checkDeadlines(deadlines([COVER_ALL[0]], EXCUSE_REST), BUILD_PLAN)
    assert.deepEqual(errors.map((e) => e.match(/open row (\w+)/)?.[1]), ['W1'])
})

test('A2: shipped, skipped and outside-the-Status-block rows need no Item', () => {
    const errors = checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), BUILD_PLAN)
    assert.ok(!errors.some((e) => /A0|K1|Q9/.test(e)))
})

test('A2: an Unscheduled line with no reason fails', () => {
    const errors = checkDeadlines(deadlines(COVER_ALL, '- P1 — pre-revamp partial.\n- X1'), BUILD_PLAN)
    assert.deepEqual(errors, ['plan/deadlines.md: ## Unscheduled lists X1 with no reason; write one after an em dash.'])
})

test('A2: a row both dated and Unscheduled fails', () => {
    const errors = checkDeadlines(deadlines(COVER_ALL, `${EXCUSE_REST}\n- A1 — also here.`), BUILD_PLAN)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /A1 is both under ## Unscheduled and named by Item "Loop work"/)
})

test('A3: an Item naming an unknown id fails, naming the id and the Item', () => {
    const rows = [...COVER_ALL, '| [ ] | 2026-10-25 | Ghost | W1 | A1x, `Z9` |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.equal(errors.length, 2)
    assert.match(errors[0], /Item "Ghost" names A1x, which has no row/)
    assert.match(errors[1], /Item "Ghost" names Z9, which has no row/)
})

test('A3: an Unscheduled line naming an unknown id fails', () => {
    const errors = checkDeadlines(deadlines(COVER_ALL, `${EXCUSE_REST}\n- Z9 — gone.`), BUILD_PLAN)
    assert.deepEqual(errors, ['plan/deadlines.md: ## Unscheduled lists Z9, which has no row in plan/steps/01_build_plan.md; remove the line or fix the id.'])
})

test('A3: one id in two Items fails, naming both', () => {
    const rows = [...COVER_ALL, '| [ ] | 2026-11-06 | Wrapped again | W2 | W1, A1 |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.deepEqual(errors, [
        'plan/deadlines.md: A1 is named by 2 Items ("Loop work", "Wrapped again"); keep it in one.',
        'plan/deadlines.md: W1 is named by 2 Items ("Wrapped", "Wrapped again"); keep it in one.',
    ])
})

// Phase DL2a: an id in the sixth column, `Waits on`, is named like one in `Rows`.
test('DL2a A2: an open row named in Waits on is covered, and a five-column row beside it still passes', () => {
    const rows = ['| [ ] | 2026-10-24 | Play it | W1 | T | A1 |', '| [ ] | 2026-11-05 | Wrapped | W2 | W1 |']
    assert.deepEqual(checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN), [])
})

test('DL2a A2: without the Waits on cell the same row is uncovered', () => {
    const rows = ['| [ ] | 2026-10-24 | Play it | W1 | T | - |', '| [ ] | 2026-11-05 | Wrapped | W2 | W1 |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /open row A1 /)
})

test('DL2a A2: an id in Waits on and in another Item, or twice, fails naming both places', () => {
    const rows = [...COVER_ALL, '| [ ] | 2026-10-25 | Play it | W1 | T | A1, A1 |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.deepEqual(errors, ['plan/deadlines.md: A1 is named by 3 Items ("Loop work", "Play it" (Waits on), "Play it" (Waits on)); keep it in one.'])
    const same = [COVER_ALL[1], '| [ ] | 2026-10-25 | Play it | W1 | A1 | A1 |']
    assert.deepEqual(checkDeadlines(deadlines(same, EXCUSE_REST), BUILD_PLAN), [
        'plan/deadlines.md: A1 is named by 2 Items ("Play it", "Play it" (Waits on)); keep it in one.',
    ])
})

test('DL2a A2: an id in Waits on and under Unscheduled fails', () => {
    const rows = [...COVER_ALL, '| [ ] | 2026-10-25 | Play it | W1 | T | P1 |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /P1 is both under ## Unscheduled and named by Item "Play it"/)
})

test('DL2a A2: an unknown id in Waits on fails like one in Rows', () => {
    const rows = [...COVER_ALL, '| [ ] | 2026-10-25 | Play it | W1 | T | `Z9` |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /Item "Play it" names Z9, which has no row/)
})

test('A4: due dates inside their window pass, on both edges and across the year', () => {
    const rows = [
        '| [ ] | 2026-10-20 | First day | W1 | A1 |',
        '| [ ] | 2026-11-16 | Last day | W2 | W1 |',
        '| [ ] | 2027-01-02 | New year | W9 | T |',
        '| [ ] | 2026-12-21 | Old year | W9 | needs plot |',
    ]
    assert.deepEqual(checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN), [])
})

test('A4: a date before or after its window fails', () => {
    const rows = [
        '| [ ] | 2026-10-19 | Too early | W1 | A1 |',
        '| [ ] | 2026-11-17 | Too late | W2 | W1 |',
    ]
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.deepEqual(errors, [
        'plan/deadlines.md: Item "Too early" is due 2026-10-19, outside W1; move the date into the window or change the window.',
        'plan/deadlines.md: Item "Too late" is due 2026-11-17, outside W2; move the date into the window or change the window.',
    ])
})

test('A4: an unknown window fails', () => {
    const rows = [...COVER_ALL, '| [ ] | 2026-10-25 | Nowhere | W7 | T |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.deepEqual(errors, ['plan/deadlines.md: Item "Nowhere" is in window W7, which has no row in the ## Windows table; add the window or fix the cell.'])
})

test('A7: a phase Item whose Status disagrees with its rows fails, naming the Item, the cell and the value', () => {
    const rows = [
        '| [x] | 2026-10-24 | Loop work | W1 | A1 |',
        '| [ ] | 2026-11-05 | Wrapped | W2 | W1 |',
        '| [ ] | 2026-10-26 | Shipped, not ticked | W1 | A0 |',
        '| [x] | 2026-10-27 | Skipped alone | W1 | K1 |',
        '| [ ] | 2026-10-28 | A task | W1 | T |',
        '| [x] | 2026-10-29 | A done task | W1 | T |',
    ]
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.deepEqual(errors, [
        'plan/deadlines.md: Item "Loop work" has Status [x], but its rows say [ ]; run `node scripts/deadlines.mjs --write` instead of editing the cell.',
        'plan/deadlines.md: Item "Shipped, not ticked" has Status [ ], but its rows say [x]; run `node scripts/deadlines.mjs --write` instead of editing the cell.',
    ])
})

test('never fails on a needs-plot Item, an overdue Item or an open T task', () => {
    const rows = [...COVER_ALL, '| [ ] | 2026-10-21 | Unplotted | W1 | needs plot |', '| [ ] | 2026-10-21 | A task | W1 | T |']
    assert.deepEqual(checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN), [])
})

test('the real plan/deadlines.md and build plan agree', () => {
    const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
    assert.deepEqual(checkDeadlines(read('plan/deadlines.md'), read('plan/steps/01_build_plan.md')), [])
})

// A9 (phase DL1c): a superseded premise is the drift no rule above sees, so the guard is a procedure step in
// the two skills that change the queue. Pin that the step is there, in the step that mutates the queue, and
// that the commit stages the file it edits.
const section = (text, heading) => {
    const start = text.indexOf(heading)
    assert.ok(start >= 0, `missing ${heading}`)
    const next = text.indexOf('\n### ', start + heading.length)
    return text.slice(start, next < 0 ? undefined : next)
}

for (const [file, step, commitStep] of [
    ['skills/plot.md', '### Step 4 — Slot', '### Step 5 — Open the PR'],
    ['skills/messy.md', '### Step 4 — Refine', '### Step 5 — Commit'],
]) {
    test(`A9: ${file} carries the deadline reconcile step in its queue step`, () => {
        const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
        const body = section(text, step)
        assert.match(body, /\*\*Reconcile the deadline plan\*\* \(phase DL1c\), in the same commit/)
        assert.match(body, /supersedes, re-scopes or completes/)
        assert.match(body, /premise/)
        assert.match(body, /## Change log/)
        assert.match(body, /node scripts\/check-deadlines\.mjs/)
        assert.match(section(text, commitStep), /git add [^\n]*plan\/deadlines\.md/)
    })
}

test('A9: /plot gives every row it adds an Item or an ## Unscheduled line', () => {
    const body = section(fs.readFileSync(path.join(ROOT, 'skills/plot.md'), 'utf8'), '### Step 4 — Slot')
    assert.match(body, /Every row the plot added/)
    assert.match(body, /## Unscheduled/)
    assert.match(body, /node scripts\/deadlines\.mjs --write/)
})
