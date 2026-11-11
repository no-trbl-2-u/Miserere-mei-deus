#!/usr/bin/env node
// scripts/check-deadlines.mjs — the deadline lint (phase DL1a). Zero dependencies.
//
//   node scripts/check-deadlines.mjs     # exit 1 and list every disagreement
//
// Fails when plan/deadlines.md and the Status block of plan/steps/01_build_plan.md
// disagree:
//   - in the dated model only (a file with no `## Budget`): an open build-plan row (`[ ]`, `[-]`,
//     `[blocked: …]`) that no Items row names and no `## Unscheduled` line excuses. The queue model
//     (T, 2026-11-10) lists T's acts only, so it has no such rule: nothing there checks that a
//     chunk waiting on T has an act;
//   - an `## Unscheduled` line with no reason;
//   - an Items row (or `## Unscheduled` line) naming a phase id with no build-plan row,
//     in its `Rows` or its `Waits on` cell (phase DL2a);
//   - one phase id named twice in the Items table (`Rows` and `Waits on` both count, in
//     one Item or two),
//     or by an Items row and `## Unscheduled`;
//   - an Item whose `Rows` names an open loop row (not attended, not owner-led): every Item is
//     a T act, and a loop row goes in the `Waits on` of the act it unblocks (phase DL2b);
//   - a dated table row outside `## Items`: a second schedule that ticking an Item
//     never updates (T, 2026-11-03, when the MVP schedule merged into the Items table);
//   - an Items row whose due date falls outside its window in the `## Windows` table,
//     or whose window has no row there;
//   - a phase Item whose Status cell disagrees with the one `deadlines.mjs --write`
//     derives from the build plan (a hand edit; `T` Items are hand-ticked and exempt).
//   - an open Item whose text names `PR #N` where the checkout's history of main holds a commit that
//     merged #N (a merge commit or a squash); a T Item is only ever ticked by hand, so it would lead
//     every reminder after the work is done. The subjects come from git log, never the network; a
//     history that does not reach the merge, or no git at all, finds nothing.
//   - an act whose `Rows` is `T: pr #N`, `T: spec <family>` or `T: file <path>` (spec 169, A5): ticked
//     while the proof does not hold (a `pr` proof is exempt: a shallow clone may not reach the merge),
//     or a `T:` cell that is none of the three. `--write` ticks the act once the proof holds.
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

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARCHIVE_FILE, SPEC_FILE, datedRowsOutsideItems, derivedStatus, hasBudgetSection, inWindow, mergedPrItems, parseBudget, proofHolds, parseItems, parseUnscheduled, parseWindows, planRows } from './deadlines-lib.mjs'
import { pendingCloses, pendingFiles } from './plan/pending.mjs'
import { settledView } from './plan/settled.mjs'

const DEADLINES = 'plan/deadlines.md'
const BUILD_PLAN = 'plan/steps/01_build_plan.md'

/**
 * The files a row id resolves from, read from a repo root: the build plan (null once
 * it is retired), every v2 spec `plan/NN-<slug>.md`, the roadmap and the archive.
 * Shared with deadlines.mjs so the reminder and the lint read one plan.
 * @returns {{buildPlan: string | null, specs: {file: string, md: string}[], readme: string | null, archive: string | null}}
 */
export const readPlanSources = (root) => {
    // The plan as it reads once plan/pending/ settles (phase NX1e): a branch's pending
    // `## Edit` / `## Add` (a plot's Held line, its new chunks for an open spec) apply in
    // memory, and a pending close counts its chunk as closed (`pending`), as plan-check reads it.
    const files = pendingFiles(root)
    const view = files.length ? settledView(root, { only: (p) => p.startsWith('plan/') }) : null
    const readOrNull = (rel) => (view ? view.read(rel) : fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null)
    const specs = fs.readdirSync(path.join(root, 'plan'))
        .filter((name) => SPEC_FILE.test(name))
        .sort()
        .map((name) => ({ file: `plan/${name}`, md: readOrNull(`plan/${name}`) }))
        .filter((s) => s.md !== null)
    return { buildPlan: readOrNull(BUILD_PLAN), specs, readme: readOrNull('plan/README.md'), archive: readOrNull(ARCHIVE_FILE), pending: pendingCloses(files) }
}

/**
 * Every disagreement between the deadline plan and the rows it names, as messages naming
 * the file, the row and what to change. Empty when they agree.
 * @param {string} deadlinesMd
 * @param {string | {buildPlan?: string | null, specs?: {file: string, md: string}[], readme?: string | null, archive?: string | null}} plan
 *   the build plan's text, or every source readPlanSources returns
 * @param {string[]} [subjects] commit subjects of main (git log --format=%s); none by default
 * @returns {string[]}
 */
export const checkDeadlines = (deadlinesMd, plan, subjects = [], exists = () => false) => {
    const items = parseItems(deadlinesMd)
    const resolved = planRows(typeof plan === 'string' ? { buildPlan: plan } : plan)
    const phases = resolved.phases
    const unscheduled = parseUnscheduled(deadlinesMd)
    const windows = parseWindows(deadlinesMd)
    const errors = resolved.errors.map((e) => `${DEADLINES}: ${e}`)
    // The section, not its number, marks the queue model: a mistyped hours line must say so here,
    // never fall back to the dated model and ask every open row for a line.
    const queueModel = hasBudgetSection(deadlinesMd)
    if (queueModel && parseBudget(deadlinesMd) === null) {
        errors.push(`${DEADLINES}: ## Budget states no hours a week; write one line "Hours a week: <number above 0>" under it.`)
    }

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
                errors.push(`${DEADLINES}: Item "${item.name}" names loop row ${id} in Rows; every Item is a T act, so move ${id} to the Waits on cell of the T act it unblocks${queueModel ? '; the queue lists no loop rows of its own' : ', or under ## Unscheduled'}.`)
            }
        }
        if (item.proof?.error) errors.push(`${DEADLINES}: Item "${item.name}" has an unreadable proof: ${item.proof.error}.`)
        else if (item.proof && item.done && item.proof.kind !== 'pr' && !proofHolds(item.proof, phases, { subjects, exists })) {
            // A pr proof is exempt: a shallow clone may not reach the merge, so its absence proves nothing.
            errors.push(`${DEADLINES}: Item "${item.name}" is ticked, but its proof \`T: ${item.proof.kind} ${item.proof.arg}\` does not hold; untick it or fix the proof.`)
        }
        const want = derivedStatus(item, phases, { subjects, exists })
        if (want && want !== (item.done ? '[x]' : '[ ]')) {
            errors.push(`${DEADLINES}: Item "${item.name}" has Status ${item.done ? '[x]' : '[ ]'}, but its rows say ${want}; run \`node scripts/deadlines.mjs --write\` instead of editing the cell.`)
        }
        const window = windows.get(item.window)
        if (!window) {
            errors.push(`${DEADLINES}: Item "${item.name}" is in window ${item.window}, which has no row in the ## Windows table; add the window or fix the cell.`)
        } else if (!inWindow(item.due, window)) {
            errors.push(`${DEADLINES}: Item "${item.name}" is due ${item.due}, outside ${item.window}; move the date into the window or change the window.`)
        } else if (queueModel && item.due.slice(5) !== `${String(window.to[0]).padStart(2, '0')}-${String(window.to[1]).padStart(2, '0')}`) {
            // The queue: an act has no date of its own, and every distinct date is a milestone the reminder forecasts.
            errors.push(`${DEADLINES}: Item "${item.name}" is due ${item.due}, which is not ${item.window}'s milestone date (the window's last day); an act carries its milestone's date, never its own.`)
        }
    }

    for (const { item, due, pr, subject } of mergedPrItems(items, subjects)) {
        errors.push(`${DEADLINES}: open Item "${item}" (due ${due}) names PR #${pr}, which merged in "${subject}"; tick the Item, or rewrite it to drop the pull request number.`)
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

    // One list (T, 2026-11-03): a dated table row outside ## Items is a second schedule, which
    // ticking an Item never updates, so done work reads as overdue (the MVP schedule's lesson).
    for (const row of datedRowsOutsideItems(deadlinesMd)) {
        errors.push(`${DEADLINES}: a dated table row sits outside ## Items ("${row}"); every dated piece is one Items row, with its Goal and How AI helps cells, so the table there is the only list to tick.`)
    }

    // The queue model (a `## Budget` section; T, 2026-11-10) lists T's acts only: a loop row needs
    // no line here, so the coverage rule below belongs to the dated model alone.
    if (queueModel) return errors

    for (const [id, row] of phases) {
        if (!row.open || namedBy.has(id) || excused.has(id)) continue
        errors.push(`${row.source ?? BUILD_PLAN}: open row ${id} [${row.status || ' '}] has no Item in ${DEADLINES}; give it an Items row with a date, or a "- ${id} — <reason>" line under ## Unscheduled.`)
    }

    return errors
}

/**
 * The commit subjects of main in this checkout: origin/main when that ref exists, else HEAD.
 * Any git failure (no git, no repository, a shallow clone) reads as an empty list.
 * @returns {string[]}
 */
export const mainSubjects = (root) => {
    for (const ref of ['origin/main', 'HEAD']) {
        try {
            const out = execFileSync('git', ['log', '--format=%s', ref], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 })
            return out.split('\n').filter(Boolean)
        } catch {
            // try the next ref
        }
    }
    return []
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
    const errors = checkDeadlines(read(DEADLINES), readPlanSources(root), mainSubjects(root), (rel) => fs.existsSync(path.join(root, rel)))
    if (errors.length) {
        process.stderr.write(`check-deadlines: ${errors.length} disagreement(s)\n${errors.map((e) => `  - ${e}`).join('\n')}\n`)
        process.exit(1)
    }
    process.stdout.write('check-deadlines: plan/deadlines.md and the build plan agree\n')
}
