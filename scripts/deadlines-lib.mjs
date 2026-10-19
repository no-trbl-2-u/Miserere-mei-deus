// scripts/deadlines-lib.mjs — the pure half of the deadline reminder (T, 2026-10-19).
// Zero dependencies; no file or clock access (the CLI in deadlines.mjs passes both in).
//
// plan/deadlines.md is the whole plan. Its "## Items" table lists every deadline
// item: a due date, a name, the window, and either the build-plan phase ids that
// finish it, `needs plot`, or `T` (a task only T does). A T task is done when its
// Status cell is `[x]`.
//
// The reminder names only what is stuck without T, due within the horizon (or
// overdue):
//   - "needs a plot": the item is `needs plot`, or it names a phase id that has no
//     build-plan row yet;
//   - "needs you": a `T` task not yet done, or a named row that is open, waits on
//     T (attended, or blocked owner-led) and whose `Requires` are all shipped.
// Everything the loop can finish alone stays silent.

export const HORIZON_DAYS = 14

const ITEM_ROW = /^\|\s*(\[[ x]\])\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(W\d+)\s*\|\s*(.+?)\s*\|\s*$/
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

/**
 * Read the build plan's phase rows: status, attended or owner-led, and Requires.
 * @param {string} md
 * @returns {Map<string, {shipped: boolean, waitsOnT: boolean, requires: string[]}>}
 */
export const parsePhaseRows = (md) =>
    new Map(
        md
            .split('\n')
            .map((line) => line.match(PHASE_ROW))
            .filter(Boolean)
            .map(([, status, id, rest]) => [
                id,
                {
                    shipped: status.trim() === 'x' || status.trim() === 'skipped',
                    waitsOnT: /\(attended\)/.test(rest) || /owner-led/.test(status),
                    requires: parseRequires(rest),
                },
            ]),
    )

const parseRequires = (rest) => {
    const m = rest.match(/Requires ([^.]*)\./)
    if (!m || /^nothing$/i.test(m[1].trim())) return []
    return m[1].split(',').map((s) => s.trim()).filter(Boolean)
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
