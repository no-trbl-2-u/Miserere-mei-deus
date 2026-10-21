#!/usr/bin/env node
// scripts/check-deadlines.mjs — the deadline lint (phase DL1a). Zero dependencies.
//
//   node scripts/check-deadlines.mjs     # exit 1 and list every disagreement
//
// Fails when plan/deadlines.md and the Status block of plan/steps/01_build_plan.md
// disagree:
//   - an open build-plan row (`[ ]`, `[-]`, `[blocked: …]`) that no Items row names
//     and no `## Unscheduled` line excuses, or an `## Unscheduled` line with no reason;
//   - an Items row (or `## Unscheduled` line) naming a phase id with no build-plan row;
//   - one phase id named by two Items rows, or by an Items row and `## Unscheduled`;
//   - an Items row whose due date falls outside its window in the `## Windows` table,
//     or whose window has no row there.
// Both files are read through scripts/deadlines-lib.mjs's parsers, never re-parsed here.
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
import { inWindow, parseItems, parsePhaseRows, parseUnscheduled, parseWindows } from './deadlines-lib.mjs'

const DEADLINES = 'plan/deadlines.md'
const BUILD_PLAN = 'plan/steps/01_build_plan.md'

/**
 * Every disagreement between the deadline plan and the build plan, as messages naming
 * the file, the row and what to change. Empty when they agree.
 * @param {string} deadlinesMd
 * @param {string} buildPlanMd
 * @returns {string[]}
 */
export const checkDeadlines = (deadlinesMd, buildPlanMd) => {
    const items = parseItems(deadlinesMd)
    const phases = parsePhaseRows(buildPlanMd)
    const unscheduled = parseUnscheduled(deadlinesMd)
    const windows = parseWindows(deadlinesMd)
    const errors = []

    const namedBy = new Map()
    for (const item of items) {
        if (!Array.isArray(item.rows)) continue
        for (const id of item.rows) namedBy.set(id, [...(namedBy.get(id) ?? []), item.name])
    }

    for (const item of items) {
        if (Array.isArray(item.rows)) {
            for (const id of item.rows.filter((id) => !phases.has(id))) {
                errors.push(`${DEADLINES}: Item "${item.name}" names ${id}, which has no row in ${BUILD_PLAN}; fix the id or plot the row.`)
            }
        }
        const window = windows.get(item.window)
        if (!window) {
            errors.push(`${DEADLINES}: Item "${item.name}" is in window ${item.window}, which has no row in the ## Windows table; add the window or fix the cell.`)
        } else if (!inWindow(item.due, window)) {
            errors.push(`${DEADLINES}: Item "${item.name}" is due ${item.due}, outside ${item.window}; move the date into the window or change the window.`)
        }
    }

    for (const [id, names] of namedBy) {
        if (names.length > 1) {
            errors.push(`${DEADLINES}: ${id} is named by ${names.length} Items (${names.map((n) => `"${n}"`).join(', ')}); keep it in one.`)
        }
    }

    const excused = new Map()
    for (const { id, reason } of unscheduled) {
        if (!reason) errors.push(`${DEADLINES}: ## Unscheduled lists ${id} with no reason; write one after an em dash.`)
        if (!phases.has(id)) errors.push(`${DEADLINES}: ## Unscheduled lists ${id}, which has no row in ${BUILD_PLAN}; remove the line or fix the id.`)
        if (namedBy.has(id)) errors.push(`${DEADLINES}: ${id} is both under ## Unscheduled and named by Item "${namedBy.get(id)[0]}"; keep one.`)
        if (excused.has(id)) errors.push(`${DEADLINES}: ## Unscheduled lists ${id} twice; keep one line.`)
        excused.set(id, reason)
    }

    for (const [id, row] of phases) {
        if (!row.open || namedBy.has(id) || excused.has(id)) continue
        errors.push(`${BUILD_PLAN}: open row ${id} [${row.status || ' '}] has no Item in ${DEADLINES}; give it an Items row with a date, or a "- ${id} — <reason>" line under ## Unscheduled.`)
    }

    return errors
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
    const errors = checkDeadlines(read(DEADLINES), read(BUILD_PLAN))
    if (errors.length) {
        process.stderr.write(`check-deadlines: ${errors.length} disagreement(s)\n${errors.map((e) => `  - ${e}`).join('\n')}\n`)
        process.exit(1)
    }
    process.stdout.write('check-deadlines: plan/deadlines.md and the build plan agree\n')
}
