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
//   - "waiting on the loop": an attended row's `Requires` are not all shipped yet.
// An Item may also list `Waits on` rows (a sixth column, phase DL2a): loop rows a T
// act needs. They never tick the Item; the reminder names the open ones beside the act.
// Everything the loop can finish alone stays silent.
//
// A row id resolves from the build plan or, from the nexus v2 cut-over on, from a v2
// spec chunk's `alias:` (planRows below, phase NX1c); every rule above reads the same.

export const HORIZON_DAYS = 14
export const BUILD_PLAN_FILE = 'plan/README.md'
export const ARCHIVE_FILE = 'plan/ARCHIVE.md'

// Group 6 is the optional `Waits on` cell: a five-column row still matches, with it undefined.
export const ITEM_ROW = /^\|\s*(\[[ x]\])\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(W\d+)\s*\|\s*(.+?)\s*(?:\|\s*(.*?)\s*)?\|\s*$/
const PHASE_ROW = /^- \[([^\]]*)\]\s+(?:\(#\d+\)\s+)?Phase\s+([A-Za-z0-9]+)\s+—\s+(.*)$/

/**
 * Parse the Items table of plan/deadlines.md.
 * @param {string} md
 * @returns {{done: boolean, due: string, name: string, window: string, rows: string[] | 'needs plot' | 'T', waitsOn: string[]}[]}
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
        .map(([, status, due, name, window, rowsCell, waitsCell]) => ({
            done: status === '[x]',
            due,
            name,
            window,
            rows: parseRowsCell(rowsCell),
            waitsOn: parseWaitsCell(waitsCell),
        }))
}

/** The `Waits on` cell: comma-separated phase ids; `-`, empty or absent means none. */
export const parseWaitsCell = (cell) => {
    const plain = (cell ?? '').replace(/`/g, '').trim()
    if (plain === '' || plain === '-') return []
    return plain.split(',').map((id) => id.trim()).filter(Boolean)
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

// --- nexus v2 specs (phase NX1c) ---------------------------------------------
// At the cut-over each open build-plan row becomes a chunk of a v2 spec
// (`plan/NN-<slug>.md`) that keeps its old id as an alias, so an Items row naming
// `SM1a` still resolves:
//   - [ ] **21.3** Cards read their lane · M · closes A2 · needs 21.2 · alias: SM1a
// An alias is a row id like any other. Open: its chunk line is in a spec. Waits on
// T: the chunk is on the README's Held lane, or its line says `(attended)`. Shipped:
// a finished chunk leaves its spec, so its ARCHIVE.md line carries the alias in the
// parentheses v2's gate allows after the id:
//   - 2026-11-12 · 21.3 (alias: SM1a) · Cards read their lane · a1b2c3d
// A need is met once its chunk's line is gone from every spec (v2's rule), so
// `requires` lists only the needs still open, each by its first alias when it has one.

/** A v2 spec's file name: `NN-<slug>.md` (nexus scripts/plan-check.mjs SPEC_FILE). */
export const SPEC_FILE = /^(\d{2,})-[a-z0-9][a-z0-9-]*\.md$/
const CHUNK_HEAD = /^- \[([ x])\] \*\*(\d{2,}\.\w+)\*\* (.*)$/
const ARCHIVE_ALIAS = /^- \d{4}-\d{2}-\d{2} · (\d{2,}\.\w+) \(([^)]*)\) · /
const HELD_LINE = /^- \*\*(\d{2,}\.\w+)\*\* · /

/** The ids an `alias:` field lists (comma separated, backticks allowed). */
const aliasIds = (text) => {
    const m = text.match(/(?:^|·)\s*alias(?:es)?:\s*([^·)]+)/)
    return m ? m[1].replace(/`/g, '').split(',').map((s) => s.trim()).filter(Boolean) : []
}

/**
 * A spec's chunk lines, each with its wrapped header joined (continuation lines
 * indented two spaces that are not sub-bullets, as v2's plan-check joins them).
 * @returns {{chunk: string, ticked: boolean, aliases: string[], needs: string[], attended: boolean}[]}
 */
export const parseSpecChunks = (md) => {
    const lines = md.split('\n')
    const out = []
    let fenced = false
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*(```|~~~)/.test(lines[i])) fenced = !fenced
        const m = !fenced && lines[i].match(CHUNK_HEAD)
        if (!m) continue
        let text = m[3]
        while (i + 1 < lines.length && /^ {2}\S/.test(lines[i + 1]) && !/^ {2}- /.test(lines[i + 1])) text += ` ${lines[++i].trim()}`
        const fields = text.split(' · ').map((f) => f.trim())
        const needsField = fields.find((f) => f.startsWith('needs '))?.slice(6).trim() ?? ''
        out.push({
            chunk: m[2],
            ticked: m[1] === 'x',
            aliases: aliasIds(text),
            needs: needsField === '—' || needsField === '-' ? [] : needsField.split(',').map((s) => s.trim()).filter(Boolean),
            attended: /\(attended\)/.test(text),
        })
    }
    return out
}

/** The chunk ids on the roadmap's Held lane (plan/README.md, `**Held**` up to the next lane or heading). */
export const parseHeld = (readme) => {
    const held = new Set()
    let inHeld = false
    for (const line of (readme ?? '').split('\n')) {
        if (/^\*\*Held\*\*/.test(line)) inHeld = true
        else if (/^\*\*[A-Z]/.test(line) || /^#{1,3} /.test(line)) inHeld = false
        else if (inHeld) {
            const m = line.match(HELD_LINE)
            if (m) held.add(m[1])
        }
    }
    return held
}

/** ARCHIVE.md lines that name aliases: `- <date> · <chunk> (alias: X, Y) · …`. */
export const parseArchiveAliases = (archive) =>
    (archive ?? '')
        .split('\n')
        .map((line) => line.match(ARCHIVE_ALIAS))
        .filter(Boolean)
        .map(([, chunk, paren]) => ({ chunk, aliases: aliasIds(paren) }))
        .filter((a) => a.aliases.length)

/**
 * Every row id the deadline tools resolve, from the build plan and from v2 specs'
 * aliases, in the shape parsePhaseRows returns plus the file each came from.
 * `errors` names every id given two homes: an alias on two chunks (or twice on one),
 * on a chunk and an archive line, or an alias that is also a build-plan row.
 * @param {{buildPlan?: string | null, specs?: {file: string, md: string}[], readme?: string | null, archive?: string | null}} sources
 * @returns {{phases: Map<string, {status: string, shipped: boolean, open: boolean, waitsOnT: boolean, requires: string[], source: string}>, errors: string[]}}
 */
export const planRows = ({ buildPlan = null, specs = [], readme = null, archive = null }) => {
    const phases = new Map()
    const homes = new Map()
    const home = (id, where) => homes.set(id, [...(homes.get(id) ?? []), where])
    if (buildPlan != null) {
        for (const [id, row] of parsePhaseRows(buildPlan)) {
            phases.set(id, { ...row, source: BUILD_PLAN_FILE })
            home(id, BUILD_PLAN_FILE)
        }
    }
    const held = parseHeld(readme)
    const chunks = specs.flatMap(({ file, md }) => parseSpecChunks(md).filter((c) => !c.ticked).map((c) => ({ ...c, file })))
    const live = new Set(chunks.map((c) => c.chunk))
    const firstAlias = new Map(chunks.map((c) => [c.chunk, c.aliases[0] ?? c.chunk]))
    const needOpen = (need) => (need.includes('.') ? live.has(need) : chunks.some((c) => c.chunk.startsWith(`${need}.`)))
    for (const c of chunks) {
        const requires = c.needs.filter(needOpen).map((need) => firstAlias.get(need) ?? need)
        for (const id of c.aliases) {
            home(id, `${c.file} chunk ${c.chunk}`)
            if (phases.has(id)) continue
            phases.set(id, { status: ' ', shipped: false, open: true, waitsOnT: c.attended || held.has(c.chunk), requires, source: c.file })
        }
    }
    for (const a of parseArchiveAliases(archive)) {
        for (const id of a.aliases) {
            home(id, `${ARCHIVE_FILE} chunk ${a.chunk}`)
            if (phases.has(id)) continue
            phases.set(id, { status: 'x', shipped: true, open: false, waitsOnT: false, requires: [], source: ARCHIVE_FILE })
        }
    }
    const errors = [...homes]
        .filter(([, where]) => where.length > 1)
        .map(([id, where]) => `${id} is named ${where.length} times (${where.join(', ')}); an id has one home: keep one alias.`)
    return { phases, errors }
}

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
        const [, status, due, name, window, rowsCell, waitsCell] = m
        const want = derivedStatus({ done: status === '[x]', due, name, window, rows: parseRowsCell(rowsCell), waitsOn: parseWaitsCell(waitsCell) }, phases)
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

/** The `Waits on` rows still open in the build plan, in the order the Item lists them. */
const owedRows = (item, phases) => (item.waitsOn ?? []).filter((id) => phases.get(id)?.open)

/**
 * What an item needs from T now, or null when the loop can carry it. An open `Waits on`
 * row is named in the detail; it never ticks the Item and never hides it.
 * @returns {null | {kind: 'needs a plot' | 'needs you' | 'waiting on the loop', detail: string}}
 */
export const itemNeed = (item, phases) => {
    if (item.done) return null
    if (item.rows === 'needs plot') return { kind: 'needs a plot', detail: 'no build-plan rows yet' }
    const owed = owedRows(item, phases)
    const owes = owed.length ? `the loop still owes ${owed.join(', ')}` : ''
    if (item.rows === 'T') {
        return { kind: 'needs you', detail: owes ? `your task; ${owes}` : 'your task' }
    }
    const missing = item.rows.filter((id) => !phases.has(id))
    if (missing.length) return { kind: 'needs a plot', detail: `no row for ${missing.join(', ')}` }
    const open = item.rows.filter((id) => phases.get(id).waitsOnT && !phases.get(id).shipped)
    const ready = open.filter((id) => phases.get(id).requires.every((r) => phases.get(r)?.shipped))
    if (ready.length) return { kind: 'needs you', detail: [`${ready.join(', ')} ready for you`, owes].filter(Boolean).join('; ') }
    const unmet = open.flatMap((id) => phases.get(id).requires.filter((r) => !phases.get(r)?.shipped))
    const owing = [...new Set([...unmet, ...owed])]
    return owing.length ? { kind: 'waiting on the loop', detail: `the loop still owes ${owing.join(', ')}` } : null
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
        '> build-plan rows yet ("needs a plot"), a task or attended row ready for T ("needs you"), or an attended row',
        '> whose prerequisites are not shipped ("waiting on the loop"). A T act lists the loop rows it waits on.',
        '',
        body,
        '',
    ].join('\n')
}
