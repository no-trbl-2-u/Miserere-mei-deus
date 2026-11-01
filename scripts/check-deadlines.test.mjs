// scripts/check-deadlines.test.mjs — the deadline lint (scripts/check-deadlines.mjs, phase DL1a).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { checkDeadlines, readPlanSources } from './check-deadlines.mjs'

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

// A0 shipped, A1 open and attended, W1 wraps (its Requires on a continuation line), K1 skipped,
// P1 partial, X1 blocked; one shipped row outside the Status block is ignored.
const BUILD_PLAN = `# Build plan

## Status (at-a-glance)

- [x] (#600) Phase A0 — shipped. Requires nothing.
- [ ] Phase A1 — open work for T (attended). Requires A0.
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

// Phase DL2b: an Item's Rows names only T's acts; a loop row goes in the Waits on of the act it unblocks.
const LOOP_PLAN = BUILD_PLAN.replace('- [skipped]', '- [ ] Phase L1 — open loop work (plotted by T). Requires A0.\n- [skipped]')

test('DL2b A3: a loop row in Rows fails, naming the Item and the row and where to move it', () => {
    const rows = [...COVER_ALL, '| [ ] | 2026-11-06 | Build it | W2 | L1 | - |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), LOOP_PLAN)
    assert.deepEqual(errors, [
        'plan/deadlines.md: Item "Build it" names loop row L1 in Rows; every Item is a T act, so move L1 to the Waits on cell of the T act it unblocks, or under ## Unscheduled.',
    ])
})

test('DL2b A3: the same loop row under the Waits on of a T act passes', () => {
    // guard-test: DL2a already covers a Waits on id; this pins that the A3 rule leaves the cell it points to alone.
    const rows = [...COVER_ALL, '| [ ] | 2026-11-06 | Play it | W2 | T | L1 |']
    assert.deepEqual(checkDeadlines(deadlines(rows, EXCUSE_REST), LOOP_PLAN), [])
})

test('DL2b A3: attended, owner-led, shipped and skipped rows, T and needs plot all pass in Rows', () => {
    // guard-test: the exempt kinds passed before the rule existed; this pins that the rule flags only open loop rows.
    const rows = [
        ...COVER_ALL,
        '| [ ] | 2026-11-06 | Owner work | W2 | X1 | L1 |',
        '| [x] | 2026-11-07 | Shipped work | W2 | A0 |',
        '| [x] | 2026-11-08 | Skipped work | W2 | K1 |',
        '| [ ] | 2026-11-09 | Plot it | W2 | needs plot | - |',
        '| [ ] | 2026-11-10 | Do it | W2 | T | - |',
    ]
    assert.deepEqual(checkDeadlines(deadlines(rows, '- P1 — pre-revamp partial.'), LOOP_PLAN), [])
})

test('DL2b A3: a loop row in Rows and in the same Item\'s Waits on gets its own message', () => {
    const rows = [COVER_ALL[1], '| [ ] | 2026-11-06 | Play it | W2 | A1 | A1 |']
    const errors = checkDeadlines(deadlines(rows, EXCUSE_REST), BUILD_PLAN)
    assert.deepEqual(errors, ['plan/deadlines.md: Item "Play it" names A1 twice ("Play it", "Play it" (Waits on)); keep it in one cell.'])
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
        'plan/deadlines.md: Item "Play it" names A1 twice ("Play it", "Play it" (Waits on)); keep it in one cell.',
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

test('the real plan has no v1 build plan left (nexus v2 cut-over, NX1d); the NX1c test below reads it whole', () => {
    assert.equal(fs.existsSync(path.join(ROOT, 'plan/steps/01_build_plan.md')), false)
})

test('NX1c: the real plan agrees when read through readPlanSources, specs and all', () => {
    const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
    assert.deepEqual(checkDeadlines(read('plan/deadlines.md'), readPlanSources(ROOT)), [])
})

// NX1c: after the nexus v2 cut-over the open rows live as spec chunks with their old ids as aliases.
// The same Items as COVER_ALL resolve: A1 and W1 wait on T (A1 says attended, W1 is on the Held lane),
// P1 and X1 are chunks too, and A0 and K1 shipped (archive lines).
const SPEC = [
    '# Spec 21: carried rows',
    '',
    '## Chunks',
    '',
    'Measure: 4 open · 0 closed · next A5',
    '',
    '- [ ] **21.1** open work for T (attended) · S · closes A1 · needs — · alias: A1',
    '- [ ] **21.2** a wrapped chunk whose header runs · M · closes A2',
    '  · needs 21.1 · alias: W1',
    '  - a sub-bullet, not a continuation',
    '- [ ] **21.3** partial with carry-overs · S · closes A3 · needs — · alias: `P1`',
    '- [ ] **21.4** owner work · S · closes A4 · needs — · alias: X1',
    '',
].join('\n')
const README = [
    '# Roadmap',
    '',
    '## Lanes',
    '',
    "**Held** (waits on a person's word):",
    '',
    '- **21.2** · T plays it · since: 2026-11-11 · until: 2026-11-20 · max_age: 14d',
    "- **21.4** · owner-led · since: 2026-11-11 · until: T's word · max_age: 30d",
    '',
    '## Specs',
    '',
].join('\n')
const ARCHIVE = [
    '# Archive',
    '',
    '- 2026-10-01 · 20.1 (alias: A0) · shipped · a1b2c3d',
    '- 2026-10-02 · 20.2 (alias: K1) · skipped by T · b2c3d4e',
    '- 2026-10-03 · 20.3 · a chunk with no alias · c3d4e5f',
    '',
].join('\n')
const V2 = { buildPlan: null, specs: [{ file: 'plan/21-carried.md', md: SPEC }], readme: README, archive: ARCHIVE }

test('NX1c: a plan carried into a v2 spec passes the same Items through its aliases', () => {
    assert.deepEqual(checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), BUILD_PLAN), [])
    assert.deepEqual(checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), V2), [])
})

test('NX1c: an open alias with no Item is named in its spec file', () => {
    const errors = checkDeadlines(deadlines(COVER_ALL, '- P1 — pre-revamp partial.'), V2)
    assert.deepEqual(errors, ['plan/21-carried.md: open row X1 [ ] has no Item in plan/deadlines.md; give it an Items row with a date, or a "- X1 — <reason>" line under ## Unscheduled.'])
})

test('NX1c: an Item naming an alias that resolves nowhere has no row', () => {
    const errors = checkDeadlines(deadlines([...COVER_ALL, '| [ ] | 2026-10-25 | Ghost | W1 | SM9z |'], EXCUSE_REST), V2)
    assert.match(errors[0], /Item "Ghost" names SM9z, which has no row/)
})

test('NX1c: an alias named twice fails the lint: on two chunks, on a chunk and an archive line, beside a build-plan row', () => {
    const twice = SPEC.replace('alias: X1', 'alias: X1, A1')
    assert.deepEqual(checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), { ...V2, specs: [{ file: 'plan/21-carried.md', md: twice }] }), [
        'plan/deadlines.md: A1 is named 2 times (plan/21-carried.md chunk 21.1, plan/21-carried.md chunk 21.4); an id has one home: keep one alias.',
    ])
    const archived = `${ARCHIVE}- 2026-10-04 · 20.4 (alias: P1) · again · d4e5f6a\n`
    assert.match(checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), { ...V2, archive: archived })[0],
        /P1 is named 2 times \(plan\/21-carried\.md chunk 21\.3, plan\/ARCHIVE\.md chunk 20\.4\)/)
    const both = checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), { ...V2, buildPlan: BUILD_PLAN })
    assert.ok(both.some((e) => /A1 is named 2 times \(plan\/steps\/01_build_plan\.md, plan\/21-carried\.md chunk 21\.1\)/.test(e)), both.join('\n'))
})

test('NX1c: readPlanSources reads the build plan, every NN-<slug>.md spec, the roadmap and the archive', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadlines-sources-'))
    try {
        fs.mkdirSync(path.join(dir, 'plan', 'steps'), { recursive: true })
        fs.writeFileSync(path.join(dir, 'plan', '21-carried.md'), SPEC)
        fs.writeFileSync(path.join(dir, 'plan', '2026-09-25-notes.prompt.md'), '- [ ] **99.1** not a spec · S · closes A1 · needs — · alias: Z9\n')
        fs.writeFileSync(path.join(dir, 'plan', 'README.md'), README)
        fs.writeFileSync(path.join(dir, 'plan', 'ARCHIVE.md'), ARCHIVE)
        const v2 = readPlanSources(dir)
        assert.equal(v2.buildPlan, null)
        assert.deepEqual(v2.specs.map((s) => s.file), ['plan/21-carried.md'])
        assert.deepEqual(checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), v2), [])
        fs.writeFileSync(path.join(dir, 'plan', 'steps', '01_build_plan.md'), BUILD_PLAN)
        assert.equal(readPlanSources(dir).buildPlan, BUILD_PLAN)
    } finally {
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

test('NX1e: a chunk closed in plan/pending/ counts as done, and a pending roadmap edit is read as settled', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadlines-pending-'))
    try {
        fs.mkdirSync(path.join(dir, 'plan', 'pending'), { recursive: true })
        fs.writeFileSync(path.join(dir, 'plan', '21-carried.md'), SPEC)
        // 21.4's Held line arrives through a pending edit (a plot's), not on disk.
        const held = "- **21.4** · owner-led · since: 2026-11-11 · until: T's word · max_age: 30d"
        fs.writeFileSync(path.join(dir, 'plan', 'README.md'), README.replace(`${held}\n`, ''))
        fs.writeFileSync(path.join(dir, 'plan', 'ARCHIVE.md'), ARCHIVE)
        fs.writeFileSync(path.join(dir, 'plan', 'pending', 'plot-owner.md'), [
            '---', 'date: 2026-11-01', '---', '## Edit plan/README.md', '~~~ old',
            '- **21.2** · T plays it · since: 2026-11-11 · until: 2026-11-20 · max_age: 14d', '~~~', '~~~ new',
            '- **21.2** · T plays it · since: 2026-11-11 · until: 2026-11-20 · max_age: 14d', held, '~~~', '',
        ].join('\n'))
        assert.deepEqual(checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), readPlanSources(dir)), [])
        // An Item may name 21.4 (X1) in Rows only while it waits on T: its pending Held line says so.
        const ownerAct = [...COVER_ALL, '| [ ] | 2026-10-26 | Owner act | W1 | X1 |']
        assert.deepEqual(checkDeadlines(deadlines(ownerAct, '- P1 — pre-revamp partial.'), readPlanSources(dir)), [])
        // The close of 21.1 (alias A1) rides in the PR as a pending file: the Item it finishes must say so.
        fs.writeFileSync(path.join(dir, 'plan', 'pending', '21.1.md'), '---\nclose: 21.1\ndate: 2026-11-01\nsays: the open work\n---\n')
        const sources = readPlanSources(dir)
        assert.deepEqual([...sources.pending], ['21.1'])
        assert.match(checkDeadlines(deadlines(COVER_ALL, EXCUSE_REST), sources)[0], /Item "Loop work" has Status \[ \], but its rows say \[x\]/)
        const ticked = [COVER_ALL[0].replace('| [ ] |', '| [x] |'), COVER_ALL[1]]
        assert.deepEqual(checkDeadlines(deadlines(ticked, EXCUSE_REST), sources), [])
    } finally {
        fs.rmSync(dir, { recursive: true, force: true })
    }
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
    // Since the nexus v2 cut-over (NX1d) the reconcile is in each skill's Miserere section 7.
    ['skills/plot.md', '### 7.2 Aliases, Held lines and the deadline plan', '### 7.1 Open the PR'],
    ['skills/messy.md', '## 7. Miserere: kept on top of the kit', '## 7. Miserere: kept on top of the kit'],
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

test('DL2b A7: /plot and /messy file a new loop row under the Waits on of a T act, never an Item of its own', () => {
    const plot = section(fs.readFileSync(path.join(ROOT, 'skills/plot.md'), 'utf8'), '### 7.2 Aliases, Held lines and the deadline plan')
    assert.match(plot, /every Item is a T act/)
    assert.match(plot, /`Waits on` cell of the T act it\s+unblocks/)
    assert.match(plot, /is ticked `\[x\]` by hand/)
    const messy = section(fs.readFileSync(path.join(ROOT, 'skills/messy.md'), 'utf8'), '## 7. Miserere: kept on top of the kit')
    assert.match(messy, /Every Item is a T act/)
    assert.match(messy, /`Waits on` cell, never into an Item's\s+`Rows`/)
})

test('A9: /plot gives every chunk it adds an Item or an ## Unscheduled line', () => {
    const body = section(fs.readFileSync(path.join(ROOT, 'skills/plot.md'), 'utf8'), '### 7.2 Aliases, Held lines and the deadline plan')
    assert.match(body, /Every chunk the plot added/)
    assert.match(body, /## Unscheduled/)
    assert.match(body, /node scripts\/deadlines\.mjs --write/)
})
