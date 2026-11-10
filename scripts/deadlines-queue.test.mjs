// scripts/deadlines-queue.test.mjs — the queue model of plan/deadlines.md (T, 2026-11-10):
// a `## Budget`, acts that carry their milestone's date, a forecast per milestone and a
// reminder that lists only this week's acts. Fixtures only; no clock, no network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { itemHours, liveMarkdown, parseBudget, parseItems, planRows, queuePlan, reminderText } from './deadlines-lib.mjs'
import { checkDeadlines } from './check-deadlines.mjs'

const SPEC = [
    '- [ ] **50.1** T writes the lines (attended) · S · closes A1 · needs — · alias: QA1',
    '- [ ] **50.2** the lines in the game · M · closes A2 · needs 50.1 · alias: QA2',
    '- [ ] **50.3** a loop row nobody lists · S · closes A3 · needs — · alias: QA3',
].join('\n')
const SOURCES = { specs: [{ file: 'plan/50-queue.md', md: SPEC }] }

const plan = (budget = 'Hours a week: 7') => `# Deadlines

## Windows

| Window | Dates | Milestone |
|---|---|---|
| W1 | Nov 10 - Nov 17 | first |
| W2 | Nov 18 - Dec 26 | second |

## Budget

${budget}

## Items

| Status | Due | Item | Goal | How AI helps | Window | Rows | Waits on |
|---|---|---|---|---|---|---|---|
| [ ] | 2026-11-17 | Write the lines (3 h) | - | - | W1 | QA1 | - |
| [ ] | 2026-11-17 | Pitch the screen (plot, 2 h) | - | - | W1 | needs plot | - |
| [ ] | 2026-11-17 | Play the lines (1 h) | - | - | W1 | T | QA2 |
| [ ] | 2026-11-17 | Review it (4 h) | - | - | W1 | T | - |
| [x] | 2026-11-17 | Done already (5 h) | - | - | W1 | T | - |
| [ ] | 2026-12-26 | Decide a thing | - | - | W2 | T | - |
| [ ] | 2026-12-26 | The last session (the rest of it) (2.5 h) | - | - | W2 | T | - |
`

test('parseBudget reads the hours a week; a file without the section is the dated model', () => {
    assert.equal(parseBudget(plan()), 7)
    assert.equal(parseBudget(plan('Hours a week: 6.5')), 6.5)
    assert.equal(parseBudget(plan('about seven')), null)
    assert.equal(parseBudget('# Deadlines\n\n## Items\n'), null)
})

test('itemHours reads the last "(… N h)" of a name, and null when it states none', () => {
    assert.equal(itemHours('Write the lines (3 h)'), 3)
    assert.equal(itemHours('Route the nodes (plot, 1 h)'), 1)
    assert.equal(itemHours('Session (the rest of B1) (2.5 h)'), 2.5)
    assert.equal(itemHours('A fix (1 h). The second half is open'), 1)
    assert.equal(itemHours('Decide a thing'), null)
})

test('queuePlan: hours queue up to each milestone, against the hours T has before it', () => {
    const { phases } = planRows(SOURCES)
    const q = queuePlan(parseItems(plan()), phases, '2026-11-10', 7)
    assert.deepEqual(q.milestones.map((m) => [m.due, m.days, m.acts, m.openHours, m.cumHours, m.available, m.overBy, m.finish]), [
        ['2026-11-17', 7, 4, 10, 10, 7, 3, '2026-11-20'],
        ['2026-12-26', 46, 2, 2.5, 12.5, 46, 0, '2026-11-23'],
    ])
    assert.deepEqual(q.noHours, ['Decide a thing'])
})

test('queuePlan: this week is the ready acts in table order until the hours are spent; a done act never shows', () => {
    const { phases } = planRows(SOURCES)
    const q = queuePlan(parseItems(plan()), phases, '2026-11-10', 7)
    assert.deepEqual(q.week.map((w) => [w.name, w.kind, w.hours]), [
        ['Write the lines (3 h)', 'needs you', 3],
        ['Pitch the screen (plot, 2 h)', 'needs a plot', 2],
    ])
    assert.equal(q.later, 3)
    assert.deepEqual(q.waiting, [{ name: 'Play the lines (1 h)', owes: ['QA2'] }])
})

test('queuePlan: the first ready act shows even when it is larger than the week', () => {
    const { phases } = planRows(SOURCES)
    const q = queuePlan(parseItems(plan()), phases, '2026-11-10', 2)
    assert.deepEqual(q.week.map((w) => w.name), ['Write the lines (3 h)'])
})

test('the reminder in the queue model: a forecast per milestone, this week, then the rest as counts', () => {
    const { phases } = planRows(SOURCES)
    const q = queuePlan(parseItems(plan()), phases, '2026-11-10', 7)
    const text = reminderText([], null, '2026-11-10', q)
    assert.match(text, /^DEADLINE REMINDER \(2026-11-10; /)
    assert.match(text, /Tue, Nov 17 \(in 7 days\): 4 acts open, 10 h queued up to it, 7 h available: over by 3 h; at this pace the queue reaches it Fri, Nov 20\./)
    assert.match(text, /Sat, Dec 26 \(in 46 days\): 2 acts open, 12\.5 h queued up to it, 46 h available: fits, with 33\.5 h to spare\./)
    assert.match(text, /- Write the lines \(3 h\) — needs you \(QA1 ready for you\)\./)
    assert.match(text, /Then: 3 more ready after these; 1 wait on the loop \(QA2\); 1 state no hours\./)
    assert.ok(!text.includes('Done already'))
    assert.ok(!text.includes('Review it'), 'an act past the week is counted, not listed')
})

test('the reminder with an empty queue says so', () => {
    const q = queuePlan([], new Map(), '2026-11-10', 7)
    assert.match(reminderText([], null, '2026-11-10', q), /The queue is empty: nothing needs T\./)
})

test('LIVE_DEADLINES.md in the queue model carries the milestones, this week and what waits on the loop', () => {
    const { phases } = planRows(SOURCES)
    const md = liveMarkdown([], null, '2026-11-10', queuePlan(parseItems(plan()), phases, '2026-11-10', 7))
    assert.match(md, /^# Live deadlines — the queue\n/)
    assert.match(md, /\| 1 \| Write the lines \(3 h\) \| 3 \| needs you: QA1 ready for you \|/)
    assert.match(md, /## Waiting on the loop\n\n- Play the lines \(1 h\) — the loop still owes QA2/)
    assert.match(md, /## No hours stated\n\n- Decide a thing/)
})

test('without a queue plan the reminder and the live file keep the dated shape', () => {
    assert.match(reminderText([], null, '2026-11-10'), /Nothing needs T in the next two weeks\./)
    assert.match(liveMarkdown([], null, '2026-11-10'), /^# Live deadlines — the next two weeks\n/)
})

test('the lint in the queue model: a loop row needs no line, and the other rules still hold', () => {
    assert.deepEqual(checkDeadlines(plan(), SOURCES), [])
    const dated = plan().replace(/\n## Budget\n\n.*\n/, '\n')
    assert.ok(checkDeadlines(dated, SOURCES).some((e) => /open row QA3 \[ \] has no Item/.test(e)), 'the dated model still asks for a line')
    const outside = plan().replace('| [ ] | 2026-12-26 | Decide a thing | - | - | W2 |', '| [ ] | 2026-12-26 | Decide a thing | - | - | W1 |')
    assert.ok(checkDeadlines(outside, SOURCES).some((e) => /is due 2026-12-26, outside W1/.test(e)))
    const missing = plan().replace('| W1 | T | QA2 |', '| W1 | T | QZ9 |')
    assert.ok(checkDeadlines(missing, SOURCES).some((e) => /names QZ9, which has no row/.test(e)))
})
