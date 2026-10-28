// scripts/deadlines-lib.mjs — the pure half of the deadline reminder (T, 2026-10-19).
// Zero dependencies; no file or clock access (the CLI in deadlines.mjs passes both in).
//
// plan/deadlines.md is the whole plan. Its "## Items" table lists every deadline
// item: a due date, a name, the window, and either the build-plan phase ids that
// finish it, `needs plot`, or `T` (a task only T does). A T task is done when its
// Status cell is `[x]`, ticked by hand; a phase item's Status is derived from the
// build plan and rewritten by `deadlines.mjs --write` (DL1b).
//
// The reminder names only what is stuck without T, due within the horizon (or
// overdue):
//   - "needs a plot": the item is `needs plot`, or it names a phase id that has no
//     build-plan row yet;
//   - "needs you": a `T` task not yet done, or a named row that is open, waits on
//     T (attended, or blocked owner-led) and whose `Requires` are all shipped.
// Everything the loop can finish alone stays silent.

export const HORIZON_DAYS = 14

export const ITEM_ROW =/^\|\s*(\[[ x]\])\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(W\d+)\s*\|\s*(.+?)\s*\|\s*$/
const PHASE_ROW = /^- \[([^\]]*)\]\s+(?:\(#\d+\)\s+)?Phase\s+([A-Za-z0-9]+)\s+—\s+(.*)$/

/**
 * Parse the Items table of plan/deadlines.md.
 * @param {string} md
 * @returns {{done: boolean, due: string, name: string, window: string, rows: string[] | 'needs plot' | 'T'}[]}
 */
export const parseItems = (md) => {
    const start = md.indexOf('\n## Items')
    if (start < 0) return []
    const end = md.indexOf('\n## ', start + 1)
    const section = md.slice(start, end < 0 ? undefined : end)
    return section
        .split('\n')
        .map((line) => line.match(ITEM_ROW))
        .filter(Boolean)
        .map(([, status, due, name, window, rowsCell]) => ({
            done: status === '[x]',
            due,
            name,
            window,
            rows: parseRowsCell(rowsCell),
        }))
}

/** `needs plot`, `T`, or a comma-separated list of phase ids (backticks allowed). */
const parseRowsCell = (cell) => {
    const plain = cell.replace(/`/g, '').trim()
    if (/^needs plot$/i.test(plain)) return 'needs plot'
    if (plain === 'T') return 'T'
    return plain.split(',').map((id) => id.trim()).filter(Boolean)
}

/** The build plan's "## Status (at-a-glance)" block, or the whole text when it has none (fixtures). */
const statusBlock = (md) => {
    const start = md.indexOf('## Status (at-a-glance)')
    if (start < 0) return md
    const end = md.indexOf('\n## ', start + 1)
    return md.slice(start, end < 0 ? undefined : end)
}

/**
 * The Status block's phase rows, each with its continuation lines joined: most rows
 * added since 2026-10-18 wrap over several indented lines, and a `Requires` clause on
 * a continuation line read as "Requires nothing" until DL1a.
 * @returns {{status: string, id: string, rest: string}[]}
 */
const phaseRowTexts = (md) => {
    const rows = []
    let current = null
    for (const line of statusBlock(md).split('\n')) {
        const m = line.match(PHASE_ROW)
        if (m) {
            current = { status: m[1].trim(), id: m[2], rest: m[3] }
            rows.push(current)
        } else if (current && /^\s+\S/.test(line)) {
            current.rest += ` ${line.trim()}`
        } else {
            current = null
        }
    }
    return rows
}

/**
 * Read the build plan's phase rows: status, attended or owner-led, and Requires.
 * `open` is `[ ]`, `[-]` or `[blocked: …]`; `shipped` is `[x]` or `[skipped]`.
 * @param {string} md
 * @returns {Map<string, {status: string, shipped: boolean, open: boolean, waitsOnT: boolean, requires: string[]}>}
 */
export const parsePhaseRows = (md) =>
    new Map(
        phaseRowTexts(md).map(({ status, id, rest }) => {
            const shipped = status === 'x' || status === 'skipped'
            return [
                id,
                {
                    status,
                    shipped,
                    open: !shipped,
                    waitsOnT: /\(attended\)/.test(rest) || /owner-led/.test(status),
                    requires: parseRequires(rest),
                },
            ]
        }),
    )

// The last "Requires …." clause: a row's prose can say "Requires" before the clause
// itself (HP2e: "B3f dropped from Requires when it was cut").
const parseRequires = (rest) => {
    const m = [...rest.matchAll(/Requires ([^.]*)\./g)].at(-1)
    if (!m || /^nothing$/i.test(m[1].trim())) return []
    return m[1].split(',').map((s) => s.trim()).filter(Boolean)
}

/** A level-2 section of plan/deadlines.md, heading excluded; '' when absent. */
const section = (md, heading) => {
    const text = `\n${md}`
    const start = text.indexOf(`\n## ${heading}\n`)
    if (start < 0) return ''
    const end = text.indexOf('\n## ', start + 1)
    return text.slice(start + heading.length + 5, end < 0 ? undefined : end)
}

const UNSCHEDULED_ROW = /^-\s+`?([A-Za-z0-9]+)`?\s*(?:—\s*(.*))?$/

/**
 * The `## Unscheduled` section: open build-plan rows deliberately left undated, one per
 * line as `- <id> — <reason>`.
 * @returns {{id: string, reason: string}[]}
 */
export const parseUnscheduled = (md) =>
    section(md, 'Unscheduled')
        .split('\n')
        .map((line) => line.match(UNSCHEDULED_ROW))
        .filter(Boolean)
        .map(([, id, reason]) => ({ id, reason: (reason ?? '').trim() }))

const WINDOW_ROW = /^\|\s*(W\d+)\s*\|\s*([A-Z][a-z]{2}) (\d{1,2}) - ([A-Z][a-z]{2}) (\d{1,2})\s*\|/
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * The `## Windows` table's date ranges, as month/day pairs (the table names no year).
 * @returns {Map<string, {from: [number, number], to: [number, number]}>}
 */
export const parseWindows = (md) =>
    new Map(
        section(md, 'Windows')
            .split('\n')
            .map((line) => line.match(WINDOW_ROW))
            .filter((m) => m && MONTHS.includes(m[2]) && MONTHS.includes(m[4]))
            .map(([, name, m1, d1, m2, d2]) => [
                name,
                { from: [MONTHS.indexOf(m1) + 1, Number(d1)], to: [MONTHS.indexOf(m2) + 1, Number(d2)] },
            ]),
    )

const iso = (year, [month, day]) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/**
 * Whether a YYYY-MM-DD date falls inside a window, the window's year taken from the
 * date (a window that runs past December ends the next year).
 */
export const inWindow = (due, window) => {
    const year = Number(due.slice(0, 4))
    return [year, year - 1].some((y) => {
        const endYear = iso(y, window.to) < iso(y, window.from) ? y + 1 : y
        return iso(y, window.from) <= due && due <= iso(endYear, window.to)
    })
}

/**
 * A phase Item's Status, derived from the build plan: `[x]` when every phase id it names
 * is shipped or skipped, `[ ]` otherwise (an id with no row counts as open). Null for a
 * `T` or `needs plot` Item, whose Status nothing derives.
 * @returns {'[x]' | '[ ]' | null}
 */
export const derivedStatus = (item, phases) => {
    if (!Array.isArray(item.rows)) return null
    return item.rows.every((id) => phases.get(id)?.shipped) ? '[x]' : '[ ]'
}

const STATUS_CELL = /^(\|\s*)\[[ x]\]/
const TABLE_SCAFFOLD = /^\|\s*(?:Status\s*\||-)/

/**
 * Rewrite the Status cell of every phase Item in the Items table to its derived value,
 * leaving every other byte of the file as it was. A table line in the Items section that
 * ITEM_ROW does not match is left exactly as it is and returned in `unmatched`.
 * @param {string} md plan/deadlines.md
 * @returns {{md: string, changed: string[], unmatched: string[]}}
 */
export const rewriteItemStatus = (md, phases) => {
    const start = md.indexOf('\n## Items')
    if (start < 0) return { md, changed: [], unmatched: [] }
    const nextHeading = md.indexOf('\n## ', start + 1)
    const end = nextHeading < 0 ? md.length : nextHeading
    const changed = []
    const unmatched = []
    const lines = md.slice(start, end).split('\n').map((line) => {
        if (!line.startsWith('|') || TABLE_SCAFFOLD.test(line)) return line
        const m = line.match(ITEM_ROW)
        if (!m) {
            unmatched.push(line)
            return line
        }
        const [, status, due, name, window, rowsCell] = m
        const want = derivedStatus({ done: status === '[x]', due, name, window, rows: parseRowsCell(rowsCell) }, phases)
        if (!want || want === status) return line
        changed.push(`${name}: ${status} -> ${want}`)
        return line.replace(STATUS_CELL, `$1${want}`)
    })
    return { md: md.slice(0, start) + lines.join('\n') + md.slice(end), changed, unmatched }
}

/** Whole days from `today` to `due` (both YYYY-MM-DD); negative when overdue. */
export const daysUntil = (today, due) =>
    Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)

/** "today", "tomorrow", "in 5 days", "1 day overdue", "3 days overdue". */
export const whenText = (days) =>
    days === 0 ? 'today'
        : days === 1 ? 'tomorrow'
            : days > 1 ? `in ${days} days`
                : `${-days} day${days === -1 ? '' : 's'} overdue`

/**
 * What an item needs from T now, or null when the loop can carry it.
 * @returns {null | {kind: 'needs a plot' | 'needs you', detail: string}}
 */
export const itemNeed = (item, phases) => {
    if (item.rows === 'needs plot') return { kind: 'needs a plot', detail: 'no build-plan rows yet' }
    if (item.rows === 'T') return item.done ? null : { kind: 'needs you', detail: 'your task' }
    const missing = item.rows.filter((id) => !phases.has(id))
    if (missing.length) return { kind: 'needs a plot', detail: `no row for ${missing.join(', ')}` }
    const ready = item.rows.filter((id) => {
        const row = phases.get(id)
        const reqsMet = row.requires.every((r) => phases.get(r)?.shipped)
        return !row.shipped && row.waitsOnT && reqsMet
    })
    return ready.length ? { kind: 'needs you', detail: `${ready.join(', ')} ready for you` } : null
}

/**
 * The reminder list: items that need T, due within the horizon or overdue, earliest first.
 * @returns {{due: string, days: number, name: string, window: string, kind: string, detail: string}[]}
 */
export const dueNeeds = (items, phases, today, horizon = HORIZON_DAYS) =>
    items
        .map((item) => ({ item, need: itemNeed(item, phases), days: daysUntil(today, item.due) }))
        .filter(({ need, days }) => need && days <= horizon)
        .sort((a, b) => a.days - b.days)
        .map(({ item, need, days }) => ({ due: item.due, days, name: item.name, window: item.window, ...need }))

/** The next item that will need T after the horizon, for an otherwise empty reminder. */
export const nextNeed = (items, phases, today, horizon = HORIZON_DAYS) =>
    items
        .map((item) => ({ item, need: itemNeed(item, phases), days: daysUntil(today, item.due) }))
        .filter(({ need, days }) => need && days > horizon)
        .sort((a, b) => a.days - b.days)
        .map(({ item, need, days }) => ({ due: item.due, days, name: item.name, window: item.window, ...need }))[0] ?? null

const dayName = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

/** The short block the session-start hook prints. */
export const reminderText = (needs, next, today) => {
    const head = `DEADLINE REMINDER (${today}; plan/deadlines.md, next 2 weeks in LIVE_DEADLINES.md). Lead your first reply with this list:`
    if (!needs.length) {
        const tail = next ? ` Next: ${next.name} (${next.kind}), due ${dayName(next.due)}, ${whenText(next.days)}.` : ''
        return `${head}\n- Nothing needs T in the next two weeks.${tail}`
    }
    const lines = needs.map((n) => `- ${n.name} — ${n.kind} (${n.detail}). Due ${dayName(n.due)}, ${whenText(n.days)}. [${n.window}]`)
    return [head, ...lines].join('\n')
}

/** LIVE_DEADLINES.md: the next two weeks, regenerated daily by .github/workflows/deadlines.yml. */
export const liveMarkdown = (needs, next, today) => {
    const rows = needs.map((n) => `| ${n.due} (${whenText(n.days)}) | ${n.name} | ${n.kind}: ${n.detail} | ${n.window} |`)
    const body = rows.length
        ? ['| Due | Item | What it needs | Window |', '|---|---|---|---|', ...rows].join('\n')
        : `Nothing needs T in the next two weeks.${next ? ` Next: **${next.name}** (${next.kind}), due ${next.due}.` : ''}`
    return [
        '# Live deadlines — the next two weeks',
        '',
        `> Generated ${today} by \`node scripts/deadlines.mjs --write\` from \`plan/deadlines.md\` (the whole plan) and the`,
        '> build plan. Do not edit by hand: change `plan/deadlines.md`. Lists only what needs T: an item with no',
        '> build-plan rows yet ("needs a plot"), or a task or attended row ready for T ("needs you").',
        '',
        body,
        '',
    ].join('\n')
}
