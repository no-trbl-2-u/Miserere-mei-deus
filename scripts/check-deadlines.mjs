#!/usr/bin/env node
// scripts/check-deadlines.mjs — the deadline lint (phase DL1a). Zero dependencies.
//
//   node scripts/check-deadlines.mjs     # exit 1 and list every disagreement
//
// Fails when plan/deadlines.md and the Status block of plan/steps/01_build_plan.md
// disagree:
//   - an open build-plan row (`[ ]`, `[-]`, `[blocked: …]`) that no Items row names
//     and no `## Unscheduled` line excuses, or an `## Unscheduled` line with no reason;
//   - an Items row (or `## Unscheduled` line) naming a phase id with no build-plan row,
//     in its `Rows` or its `Waits on` cell (phase DL2a);
//   - one phase id named twice in the Items table (`Rows` and `Waits on` both count, in
//     one Item or two),
//     or by an Items row and `## Unscheduled`;
//   - an Item whose `Rows` names an open loop row (not attended, not owner-led): every Item is
//     a T act, and a loop row goes in the `Waits on` of the act it unblocks (phase DL2b);
//   - an Items row whose due date falls outside its window in the `## Windows` table,
//     or whose window has no row there;
//   - a phase Item whose Status cell disagrees with the one `deadlines.mjs --write`
//     derives from the build plan (a hand edit; `T` Items are hand-ticked and exempt).
//   - one row id with two homes (phase NX1c): a v2 spec chunk's `alias:` named twice,
//     on a chunk and an ARCHIVE.md line, or matching a build-plan row.
// Both files are read through scripts/deadlines-lib.mjs's parsers, never re-parsed here.
// A row id resolves from the build plan or from a v2 spec's chunk alias
// (`plan/NN-<slug>.md`, `… · alias: SM1a`; readPlanSources below), so the lint reads
// the same before and after the nexus v2 cut-over.
//
// It never fails on a `needs plot` Item, an overdue Item or an open `T` task: those
// are the reminder's job, every chat.
//
// The limit, written down: an Item whose *premise* is superseded while the rows it
// names still exist passes every rule above (the 2026-10-20 "W1 demo: T plays the
// three demos" Item named live rows after that playthrough had already happened).
// No lint sees that drift; the reconcile step in /plot and /messy is the only guard.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARCHIVE_FILE, derivedStatus, inWindow, parseItems, planRows, parseUnscheduled, parseWindows, SPEC_FILE } from './deadlines-lib.mjs'

const DEADLINES = 'plan/deadlines.md'
const BUILD_PLAN = 'plan/steps/01_build_plan.md'

/**
 * The files a row id resolves from, read from a repo root: the build plan (null once
 * it is retired), every v2 spec `plan/NN-<slug>.md`, the roadmap and the archive.
 * Shared with deadlines.mjs so the reminder and the lint read one plan.
 * @returns {{buildPlan: string | null, specs: {file: string, md: string}[], readme: string | null, archive: string | null}}
 */
export const readPlanSources = (root) => {
    const readOrNull = (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null)
    const specs = fs.readdirSync(path.join(root, 'plan'))
        .filter((name) => SPEC_FILE.test(name))
        .sort()
        .map((name) => ({ file: `plan/${name}`, md: fs.readFileSync(path.join(root, 'plan', name), 'utf8') }))
    return { buildPlan: readOrNull(BUILD_PLAN), specs, readme: readOrNull('plan/README.md'), archive: readOrNull(ARCHIVE_FILE) }
}

/**
 * Every disagreement between the deadline plan and the rows it names, as messages naming
 * the file, the row and what to change. Empty when they agree.
 * @param {string} deadlinesMd
 * @param {string | {buildPlan?: string | null, specs?: {file: string, md: string}[], readme?: string | null, archive?: string | null}} plan
 *   the build plan's text, or every source readPlanSources returns
 * @returns {string[]}
 */
export const checkDeadlines = (deadlinesMd, plan) => {
    const items = parseItems(deadlinesMd)
    const resolved = planRows(typeof plan === 'string' ? { buildPlan: plan } : plan)
    const phases = resolved.phases
    const unscheduled = parseUnscheduled(deadlinesMd)
    const windows = parseWindows(deadlinesMd)
    const errors = resolved.errors.map((e) => `${DEADLINES}: ${e}`)

    // An id in `Rows` or in `Waits on` is named; each place is recorded so a clash names both.
    const namedBy = new Map()
    const name = (id, item, label) => namedBy.set(id, [...(namedBy.get(id) ?? []), { item: item.name, label }])
    for (const item of items) {
        if (Array.isArray(item.rows)) for (const id of item.rows) name(id, item, `"${item.name}"`)
        for (const id of item.waitsOn) name(id, item, `"${item.name}" (Waits on)`)
    }

    for (const item of items) {
        const named = [...(Array.isArray(item.rows) ? item.rows : []), ...item.waitsOn]
        for (const id of named.filter((id) => !phases.has(id))) {
            errors.push(`${DEADLINES}: Item "${item.name}" names ${id}, which has no row in ${BUILD_PLAN}; fix the id or plot the row.`)
        }
        for (const id of Array.isArray(item.rows) ? item.rows : []) {
            const row = phases.get(id)
            if (row && row.open && !row.waitsOnT) {
                errors.push(`${DEADLINES}: Item "${item.name}" names loop row ${id} in Rows; every Item is a T act, so move ${id} to the Waits on cell of the T act it unblocks, or under ## Unscheduled.`)
            }
        }
        const want = derivedStatus(item, phases)
        if (want && want !== (item.done ? '[x]' : '[ ]')) {
            errors.push(`${DEADLINES}: Item "${item.name}" has Status ${item.done ? '[x]' : '[ ]'}, but its rows say ${want}; run \`node scripts/deadlines.mjs --write\` instead of editing the cell.`)
        }
        const window = windows.get(item.window)
        if (!window) {
            errors.push(`${DEADLINES}: Item "${item.name}" is in window ${item.window}, which has no row in the ## Windows table; add the window or fix the cell.`)
        } else if (!inWindow(item.due, window)) {
            errors.push(`${DEADLINES}: Item "${item.name}" is due ${item.due}, outside ${item.window}; move the date into the window or change the window.`)
        }
    }

    for (const [id, places] of namedBy) {
        if (places.length > 1 && places.every((p) => p.item === places[0].item)) {
            errors.push(`${DEADLINES}: Item "${places[0].item}" names ${id} twice (${places.map((p) => p.label).join(', ')}); keep it in one cell.`)
        } else if (places.length > 1) {
            errors.push(`${DEADLINES}: ${id} is named by ${places.length} Items (${places.map((p) => p.label).join(', ')}); keep it in one.`)
        }
    }

    const excused = new Map()
    for (const { id, reason } of unscheduled) {
        if (!reason) errors.push(`${DEADLINES}: ## Unscheduled lists ${id} with no reason; write one after an em dash.`)
        if (!phases.has(id)) errors.push(`${DEADLINES}: ## Unscheduled lists ${id}, which has no row in ${BUILD_PLAN}; remove the line or fix the id.`)
        if (namedBy.has(id)) errors.push(`${DEADLINES}: ${id} is both under ## Unscheduled and named by Item "${namedBy.get(id)[0].item}"; keep one.`)
        if (excused.has(id)) errors.push(`${DEADLINES}: ## Unscheduled lists ${id} twice; keep one line.`)
        excused.set(id, reason)
    }

    for (const [id, row] of phases) {
        if (!row.open || namedBy.has(id) || excused.has(id)) continue
        errors.push(`${row.source ?? BUILD_PLAN}: open row ${id} [${row.status || ' '}] has no Item in ${DEADLINES}; give it an Items row with a date, or a "- ${id} — <reason>" line under ## Unscheduled.`)
    }

    return errors
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
    const errors = checkDeadlines(read(DEADLINES), readPlanSources(root))
    if (errors.length) {
        process.stderr.write(`check-deadlines: ${errors.length} disagreement(s)\n${errors.map((e) => `  - ${e}`).join('\n')}\n`)
        process.exit(1)
    }
    process.stdout.write('check-deadlines: plan/deadlines.md and the build plan agree\n')
}
