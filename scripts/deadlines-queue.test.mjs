// scripts/deadlines-queue.test.mjs — the queue model of plan/deadlines.md (T, 2026-11-10):
// a `## Budget`, acts that carry their milestone's date, a forecast per milestone and a
// reminder that lists only this week's acts. Fixtures only; no clock, no network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { itemHours, liveMarkdown, parseBudget, parseItems, planRows, queuePlan, reminderText } from './deadlines-lib.mjs'
import { checkDeadlines, readPlanSources } from './check-deadlines.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

// The CLI's wiring, on the live plan: scripts/deadlines.mjs reads the budget, builds the queue and hands
// it to the reminder and to --write. A dropped or mis-ordered argument in main() fails here.
const liveQueue = (today) => {
    const md = fs.readFileSync(path.join(ROOT, 'plan/deadlines.md'), 'utf8')
    const budget = parseBudget(md)
    assert.ok(budget > 0, 'the live plan states a budget')
    return queuePlan(parseItems(md), planRows(readPlanSources(ROOT)).phases, today, budget)
}

test('the CLI prints the queue reminder for the live plan, at the live budget', () => {
    const today = '2026-11-10'
    const out = execFileSync(process.execPath, ['scripts/deadlines.mjs', `--today=${today}`], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '', GITHUB_ACTIONS: '' } })
    assert.equal(out, `${reminderText([], null, today, liveQueue(today))}\n`)
    assert.match(out, /Milestones, at \d+(\.\d+)? h a week:/)
    assert.doesNotMatch(out, /next 2 weeks in LIVE_DEADLINES\.md/)
})

test('--write, in a scratch checkout: the Status of a shipped act is ticked and LIVE_DEADLINES.md is the queue at the budget the file states', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deadlines-queue-'))
    try {
        fs.mkdirSync(path.join(dir, 'scripts', 'plan'), { recursive: true })
        fs.mkdirSync(path.join(dir, 'plan', 'pending'), { recursive: true })
        for (const f of ['deadlines.mjs', 'deadlines-lib.mjs', 'check-deadlines.mjs', 'owner.mjs']) fs.copyFileSync(path.join(ROOT, 'scripts', f), path.join(dir, 'scripts', f))
        for (const f of fs.readdirSync(path.join(ROOT, 'scripts', 'plan')).filter((n) => n.endsWith('.mjs'))) fs.copyFileSync(path.join(ROOT, 'scripts', 'plan', f), path.join(dir, 'scripts', 'plan', f))
        // QA1 has shipped: its line left the spec and the archive keeps its alias.
        const spec = SPEC.split('\n').slice(1).join('\n')
        fs.writeFileSync(path.join(dir, 'plan', '50-queue.md'), `${spec}\n`)
        fs.writeFileSync(path.join(dir, 'plan', 'ARCHIVE.md'), '- 2026-11-09 · 50.1 (alias: QA1) · the lines are written · (#9001)\n')
        fs.writeFileSync(path.join(dir, 'plan', 'deadlines.md'), plan('Hours a week: 4'))
        const env = { ...process.env, CI: '', GITHUB_ACTIONS: '' }
        execFileSync(process.execPath, ['scripts/deadlines.mjs', '--write', '--today=2026-11-10'], { cwd: dir, encoding: 'utf8', env })

        const md = fs.readFileSync(path.join(dir, 'plan', 'deadlines.md'), 'utf8')
        assert.match(md, /\| \[x\] \| 2026-11-17 \| Write the lines \(3 h\) \|/, 'the shipped act is ticked')
        const sources = { specs: [{ file: 'plan/50-queue.md', md: `${spec}\n` }], archive: fs.readFileSync(path.join(dir, 'plan', 'ARCHIVE.md'), 'utf8') }
        const queue = queuePlan(parseItems(md), planRows(sources).phases, '2026-11-10', 4)
        const live = fs.readFileSync(path.join(dir, 'LIVE_DEADLINES.md'), 'utf8')
        assert.equal(live, liveMarkdown([], null, '2026-11-10', queue))
        assert.match(live, /The forecast assumes 4 h a week\./)
        assert.match(live, /\| 1 \| Pitch the screen \(plot, 2 h\) \| 2 \| needs a plot: no build-plan rows yet \|/)
        assert.ok(!live.includes('Write the lines'), 'a ticked act leaves the queue')
        // With QA1 shipped the loop can build QA2, which "Play the lines" still waits on.
        assert.match(live, /- Play the lines \(1 h\) — the loop still owes QA2/)

        const out = execFileSync(process.execPath, ['scripts/deadlines.mjs', '--today=2026-11-10'], { cwd: dir, encoding: 'utf8', env })
        assert.equal(out, `${reminderText([], null, '2026-11-10', queue)}\n`)
        assert.match(out, /Milestones, at 4 h a week:/)
    } finally {
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

test('--remind is silent in CI, in the queue model too', () => {
    const out = execFileSync(process.execPath, ['scripts/deadlines.mjs', '--remind', '--today=2026-11-10'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: 'true' } })
    assert.equal(out, '')
})

test('an attended act whose needs are not shipped names the rows the loop owes, and no owed rows prints no brackets', () => {
    const spec = '- [ ] **51.1** a loop row · S · closes A1 · needs — · alias: QB1\n- [ ] **51.2** T reviews it (attended) · S · closes A2 · needs 51.1 · alias: QB2\n'
    const { phases } = planRows({ specs: [{ file: 'plan/51-wait.md', md: spec }] })
    const items = parseItems(plan().replace('| [ ] | 2026-11-17 | Write the lines (3 h) | - | - | W1 | QA1 | - |', '| [ ] | 2026-11-17 | Review the row (1 h) | - | - | W1 | QB2 | - |'))
    const q = queuePlan(items.filter((i) => i.name === 'Review the row (1 h)'), phases, '2026-11-10', 7)
    assert.deepEqual(q.waiting, [{ name: 'Review the row (1 h)', owes: ['QB1'] }])
    assert.match(reminderText([], null, '2026-11-10', q), /Then: 1 wait on the loop \(QB1\)\./)
    const bare = { ...q, waiting: [{ name: 'Review the row (1 h)', owes: [] }] }
    assert.match(reminderText([], null, '2026-11-10', bare), /Then: 1 wait on the loop\./)
})

test('the lint in the queue model points a loop row in Rows at Waits on, never at a list the queue lacks', () => {
    const loopInRows = plan().replace('| W1 | T | QA2 |', '| W1 | QA3 | - |')
    const errors = checkDeadlines(loopInRows, SOURCES)
    assert.ok(errors.some((e) => /names loop row QA3 in Rows/.test(e) && /the queue lists no loop rows of its own/.test(e)))
    assert.ok(!errors.some((e) => /## Unscheduled/.test(e)))
})
