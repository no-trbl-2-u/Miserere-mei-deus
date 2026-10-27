// scripts/measured-compare.mjs
//
// Pure functions for the measured-truth run (phase R12a): run-to-run drift
// between two history lines, the `[content]` AUDIT rows a drift files, the
// `latest.md` table and the DevLog section `/digest` includes. No I/O here;
// `scripts/measured-truth.mjs` is the only module that reads or writes.
//
// A history line is `{ date, commit, runs, seed, cells, decks }`; a cell is
// `{ fight, isBoss, playerLevel, enemyLevel, spread, deck, winRate,
// meanRounds, lowestVitaeFractionMean, lowestVitaeFractionP10,
// playerHpTakenMean, selfBurnMean }`, and a sampled-family cell (phase EM1)
// adds `winRateMin`, `winRateMax`, `lowestVitaeFractionP10Min` and
// `lowestVitaeFractionP10Max`; a family's `decks` entry carries `family: true`.
// A line may also carry `rewardLanes` (phase CH1d): one row per roster
// character and a no-character baseline, each with the lanes in its reward
// pool and each lane's share of the offers at run start and after three worn
// relics. It is a section of its own: `compare` reads cells only, so it never
// drifts.
// Lines written before a field existed lack it, and every reader here treats a
// missing field as absent, never as 0. This is a measurement, not a gate
// (D57): nothing here fails on a number.

/** Default drift thresholds; `docs/reports/measured/thresholds.json` overrides them. */
export const DEFAULT_THRESHOLDS = Object.freeze({ winRatePoints: 10, lowestVitaeP10: 0.15, meanRounds: 2 })

/** The metrics a drift is checked on, with how each reads its threshold and prints. */
export const DRIFT_METRICS = Object.freeze({
  winRate: { limit: (t) => t.winRatePoints / 100, format: (x) => `${Math.round(x * 100)}%` },
  lowestVitaeFractionP10: { limit: (t) => t.lowestVitaeP10, format: (x) => x.toFixed(2) },
  meanRounds: { limit: (t) => t.meanRounds, format: (x) => x.toFixed(1) },
})

/** Float slack so a move of exactly the threshold counts as a drift. */
const EPSILON = 1e-9

/**
 * The key a cell is matched on between two runs.
 *
 * @param {{ fight: string, deck: string, spread: string }} cell a history cell.
 * @returns {string} `fight|deck|spread`.
 * @example cellKey({ fight: 'bw-17/death-beholder', deck: 'grey', spread: 'even' }) // 'bw-17/death-beholder|grey|even'
 */
export function cellKey(cell) {
  return `${cell.fight}|${cell.deck}|${cell.spread}`
}

/**
 * Drifts between two consecutive history lines: a metric that moved by at
 * least its threshold for the same (fight, deck, spread). The first line
 * never drifts.
 *
 * @param {{ current: object, previous: object|null, thresholds?: object }} args history lines and thresholds.
 * @returns {object[]} one `{ fight, deck, spread, metric, previous, current, delta, commit, previousCommit }` per drift.
 * @example compare({ current, previous: null }) // []
 */
export function compare({ current, previous, thresholds = DEFAULT_THRESHOLDS }) {
  if (!previous) return []
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds }
  const before = new Map(previous.cells.map((c) => [cellKey(c), c]))
  const drifts = []
  for (const cell of current.cells) {
    const old = before.get(cellKey(cell))
    if (!old) continue
    for (const [metric, { limit }] of Object.entries(DRIFT_METRICS)) {
      if (typeof cell[metric] !== 'number' || typeof old[metric] !== 'number') continue
      const delta = cell[metric] - old[metric]
      if (Math.abs(delta) + EPSILON < limit(t)) continue
      drifts.push({
        fight: cell.fight, deck: cell.deck, spread: cell.spread, metric,
        previous: old[metric], current: cell[metric], delta,
        commit: current.commit, previousCommit: previous.commit,
      })
    }
  }
  return drifts
}

/**
 * The dedupe prefix of a drift's AUDIT row: one open row per (fight, deck, metric).
 *
 * @param {{ fight: string, deck: string, metric: string }} drift from `compare`.
 * @returns {string} the heading prefix every row for this key starts with.
 * @example auditRowPrefix({ fight: 'bw-17/death-beholder', deck: 'grey', metric: 'winRate' })
 *   // '### [ ] [content] measured drift: bw-17/death-beholder grey winRate '
 */
export function auditRowPrefix(drift) {
  return `### [ ] [content] measured drift: ${drift.fight} ${drift.deck} ${drift.metric} `
}

/**
 * The heading line of a drift's AUDIT row.
 *
 * @param {object} drift from `compare`.
 * @param {string} date ISO date of the run.
 * @returns {string} the heading.
 */
export function auditRowTitle(drift, date) {
  const { format } = DRIFT_METRICS[drift.metric]
  return `${auditRowPrefix(drift)}${format(drift.previous)} -> ${format(drift.current)} (${drift.spread}, ${date})`
}

/**
 * Renders one `[content]` row in the plan/AUDIT.md Pending shape.
 *
 * @param {object} drift from `compare`.
 * @param {string} date ISO date of the run.
 * @returns {string} the markdown block, ending in a newline.
 */
export function renderAuditRow(drift, date) {
  const { format } = DRIFT_METRICS[drift.metric]
  return [
    auditRowTitle(drift, date),
    '- category: content',
    '- impact: 4',
    '- ease: 3',
    `- detail: the measured-truth run moved ${drift.metric} for ${drift.fight} with the ${drift.deck} deck `
      + `(${drift.spread} spread) from ${format(drift.previous)} at ${drift.previousCommit ?? '-'} `
      + `to ${format(drift.current)} at ${drift.commit ?? '-'} `
      + '(`docs/reports/measured/history.jsonl`, `latest.md`).',
    '- next: T\'s call. A balance drift is fixed by retuning a card, deck or enemy, which `/iterate` '
      + 'may not do (D88, D99); this row waits for a brief T approves. `/iterate` may bisect the commits '
      + 'between the two history lines and add what it finds here, nothing more.',
    '',
  ].join('\n')
}

/**
 * Files drifts into plan/AUDIT.md text. A (fight, deck, metric) with an open
 * row gets an evidence line on that row instead of a second row; so does a
 * second spread of a key filed earlier in the same run.
 *
 * @param {string} auditText the current plan/AUDIT.md.
 * @param {object[]} drifts from `compare`.
 * @param {string} date ISO date of the run.
 * @returns {{ text: string, added: { drift: object, title: string }[], evidenced: string[] }}
 * @throws When the text has no `## Pending` heading and there is a row to add.
 */
export function fileDrifts(auditText, drifts, date) {
  let lines = auditText.split('\n')
  const added = []
  const evidenced = []
  const fresh = new Map()
  const evidence = (d) => {
    const { format } = DRIFT_METRICS[d.metric]
    return `- evidence ${date}: ${d.spread} ${format(d.previous)} -> ${format(d.current)} at ${d.commit ?? '-'}`
  }
  for (const drift of drifts) {
    const prefix = auditRowPrefix(drift)
    const key = prefix
    if (fresh.has(key)) {
      fresh.get(key).extra.push(evidence(drift))
      evidenced.push(key.trim())
      continue
    }
    const at = lines.findIndex((l) => l.startsWith(prefix))
    if (at === -1) {
      fresh.set(key, { drift, extra: [] })
      continue
    }
    let end = at + 1
    while (end < lines.length && (lines[end].startsWith('- ') || /^\s+\S/.test(lines[end]))) end++
    lines = [...lines.slice(0, end), evidence(drift), ...lines.slice(end)]
    evidenced.push(key.trim())
  }
  if (fresh.size) {
    const pending = lines.findIndex((l) => l.trim() === '## Pending')
    if (pending === -1) throw new Error('plan/AUDIT.md has no "## Pending" section')
    const blocks = [...fresh.values()].map(({ drift, extra }) => {
      added.push({ drift, title: auditRowTitle(drift, date) })
      return [renderAuditRow(drift, date).replace(/\n$/, ''), ...extra].join('\n')
    })
    lines = [...lines.slice(0, pending + 1), '', ...blocks.join('\n\n').split('\n'), '', ...lines.slice(pending + 1)]
  }
  return { text: lines.join('\n'), added, evidenced }
}

/** The optional cell fields a history line keeps when the report has them. */
const OPTIONAL_CELL_FIELDS = Object.freeze([
  'selfBurnMean', 'winRateMin', 'winRateMax', 'lowestVitaeFractionP10Min', 'lowestVitaeFractionP10Max',
])

/**
 * The history line a CLI report becomes: the stamp plus slimmed cells.
 *
 * @param {object} report the `npm run measured-truth -- --json` object.
 * @param {{ date: string, commit: string }} stamp when and where it was measured.
 * @returns {object} `{ date, commit, runs, seed, cells, decks }`.
 */
export function historyLine(report, { date, commit }) {
  const cells = report.cells.map((c) => ({
    fight: c.fight, isBoss: c.isBoss, playerLevel: c.playerLevel, enemyLevel: c.enemyLevel,
    spread: c.spread, deck: c.deck,
    winRate: c.winRate, meanRounds: c.meanRounds,
    lowestVitaeFractionMean: c.lowestVitaeFractionMean, lowestVitaeFractionP10: c.lowestVitaeFractionP10,
    playerHpTakenMean: c.playerHpTakenMean,
    ...Object.fromEntries(OPTIONAL_CELL_FIELDS.filter((k) => typeof c[k] === 'number').map((k) => [k, c[k]])),
  }))
  return {
    date, commit, runs: report.runs, seed: report.seed, cells, decks: report.decks,
    ...(report.rewardLanes ? { rewardLanes: report.rewardLanes } : {}),
  }
}

/** Whether a deck id names a sampled family in this line. */
function isFamily(line, deck) {
  return line.decks?.[deck]?.family === true
}

/** Deck ids and spreads in first-seen order; `families` picks the sampled ones. */
function axes(line, { families = false } = {}) {
  const decks = [...new Set(line.cells.map((c) => c.deck))].filter((d) => isFamily(line, d) === families)
  const spreads = [...new Set(line.cells.map((c) => c.spread))]
  return { decks, spreads }
}

/** `win% / p10` for one cell, or `-`. */
function cellText(cell) {
  return cell ? `${Math.round(cell.winRate * 100)}% / ${cell.lowestVitaeFractionP10.toFixed(2)}` : '-'
}

/** `median win% / median p10 (lowest-highest win%)` for one family cell, or `-`. */
export function familyCellText(cell) {
  if (!cell) return '-'
  const pct = (x) => `${Math.round(x * 100)}%`
  const range = typeof cell.winRateMin === 'number' ? ` (${pct(cell.winRateMin)}-${pct(cell.winRateMax)})` : ''
  return `${cellText(cell)}${range}`
}

/** The fight-by-column table rows for a history line: the plain decks, or the families. */
function tableRows(line, filter = () => true, { families = false } = {}) {
  const { decks, spreads } = axes(line, { families })
  const text = families ? familyCellText : cellText
  const header = ['fight', 'level', ...decks.flatMap((d) => spreads.map((s) => `${d} ${s}`))]
  const rows = [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`]
  const fights = [...new Set(line.cells.filter(filter).map((c) => c.fight))]
  for (const fight of fights) {
    const row = line.cells.filter((c) => c.fight === fight)
    const first = row[0]
    const cols = decks.flatMap((d) => spreads.map((s) => text(row.find((c) => c.deck === d && c.spread === s))))
    rows.push(`| ${fight}${first.isBoss ? ' (door)' : ''} | L${first.playerLevel} v L${first.enemyLevel} | ${cols.join(' | ')} |`)
  }
  return rows
}

/**
 * The stamp every reading of the table carries.
 *
 * @param {object} line a history line.
 * @returns {string} `measured at <commit>, <date>, <runs> runs, seed <seed>`.
 */
export function stamp(line) {
  return `measured at ${line.commit}, ${line.date}, ${line.runs} runs, seed ${line.seed}`
}

/** Mean of a field over cells that carry it, to one place, or `-` when none does. */
function meanText(cells, field) {
  const xs = cells.map((c) => c[field]).filter((x) => typeof x === 'number')
  return xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '-'
}

/**
 * The Self-burn section: per deck, the mean VITAE per fight taken from foes
 * against lost to its own INFERNO, over all cells and at the doors.
 *
 * @param {object} line a history line.
 * @returns {string[]} the section's lines, or none when no cell carries `selfBurnMean`.
 */
export function selfBurnRows(line) {
  if (!line.cells.some((c) => typeof c.selfBurnMean === 'number')) return []
  const decks = [...new Set(line.cells.map((c) => c.deck))]
  const rows = [
    '## Self-burn',
    '',
    'Mean VITAE per fight the deck lost to the foe\'s threats against what it lost to its own INFERNO '
      + '(medians for a sampled family).',
    '',
    '| deck | from foes, all fights | own INFERNO, all fights | from foes, doors | own INFERNO, doors |',
    '|---|---|---|---|---|',
  ]
  for (const deck of decks) {
    const all = line.cells.filter((c) => c.deck === deck)
    const doors = all.filter((c) => c.isBoss)
    rows.push(`| ${deck} | ${meanText(all, 'playerHpTakenMean')} | ${meanText(all, 'selfBurnMean')} `
      + `| ${meanText(doors, 'playerHpTakenMean')} | ${meanText(doors, 'selfBurnMean')} |`)
  }
  return [...rows, '']
}

/** `lane 62%, lane 38%` for a state's shares, or `-` when it offered nothing. */
function shareText(shares) {
  const parts = Object.entries(shares ?? {}).map(([lane, x]) => `${lane} ${Math.round(x * 100)}%`)
  return parts.length ? parts.join(', ') : '-'
}

/**
 * The Reward lanes by character section: per character (and a no-character
 * baseline), the lanes in the reward pool and each lane's share of the cards
 * offered at run start and after three worn relics.
 *
 * @param {object} line a history line.
 * @returns {string[]} the section's lines, or none when the line carries no `rewardLanes` (an old line).
 */
export function rewardLaneRows(line) {
  const report = line.rewardLanes
  if (!report) return []
  const rows = [
    '## Reward lanes by character',
    '',
    `Each state rolls ${report.rolls} seeded combat rewards (seed ${report.seed}). **start** is the run as dealt, `
      + 'the starting relic worn; **late** adds relics until three are worn, each the library lane relic that '
      + 'adds the most lanes the pool lacks (ties in library order). A lane reads its share of the cards offered; '
      + '`grey fallback` is a pool with no lane in it.',
    '',
  ]
  if (!report.rows.some((r) => r.character !== null)) {
    rows.push('No roster character yet: the no-character baseline row only.', '')
  }
  rows.push('| character | state | relics worn | lanes in the pool | share of offers |', '|---|---|---|---|---|')
  for (const r of report.rows) {
    for (const [label, state] of [['start', r.start], ['late', r.late]]) {
      const lanes = state.lanes.length ? state.lanes.join(', ') : 'grey fallback'
      const worn = state.worn.length ? state.worn.join(', ') : 'none'
      rows.push(`| ${r.character === null ? 'no character' : r.name} | ${label} | ${worn} | ${lanes} | ${shareText(state.shares)} |`)
    }
  }
  return [...rows, '']
}

/**
 * Renders `docs/reports/measured/latest.md` from a history line.
 *
 * @param {object} line a history line.
 * @returns {string} the whole file.
 */
export function renderLatest(line) {
  const deckLines = Object.entries(line.decks).map(([id, d]) => (d.family
    ? `- **${id}**: ${d.draws.length} draws of ${d.drawSize} distinct cards from a ${d.poolSize}-card pool `
      + `(${d.laneIds.join(' + ')}); mean dead-card rate ${Math.round(d.deadCardRate * 100)}% `
      + '(every draw is in `history.jsonl`).'
    : `- **${id}**: ${d.deckCards.length} cards; dead-card rate ${Math.round(d.deadCardRate * 100)}% `
      + '(mean share of the deck never played in a cell).'))
  const familyRows = axes(line, { families: true }).decks.length
    ? [
        '## Sampled decks',
        '',
        'Each family is measured as seeded draws, each played as a deck. A cell reads **median win rate / median '
          + 'lowest-VITAE p10 (lowest-highest win rate over the draws)**.',
        '',
        ...tableRows(line, () => true, { families: true }),
        '',
      ]
    : []
  return [
    '# Measured truth',
    '',
    '<!-- Generated by scripts/measured-truth.mjs; do not edit. -->',
    '',
    `> ${stamp(line)}`,
    '',
    'Each Act 1 ledger fight, with the player at the level a full clear brings to it, playing each measured '
      + 'deck with the greedy witness. A cell reads **win rate / lowest-VITAE p10** (one fight in ten gets at '
      + 'least this close to death, as a fraction of max VITAE). A measurement, not a gate (D57), and not a '
      + 'licence to tune (D88). Cite it with its commit.',
    '',
    ...tableRows(line),
    '',
    ...familyRows,
    ...selfBurnRows(line),
    ...rewardLaneRows(line),
    '## Decks',
    '',
    ...deckLines,
    '',
  ].join('\n')
}

/**
 * The DevLog section `/digest` includes.
 *
 * @param {object|null} current the last history line, or null when none exists.
 * @param {object|null} previous the line before it, or null.
 * @param {object[]} drifts `compare({ current, previous })`.
 * @param {{ sinceDate?: string }} [opts] the date of the last DevLog entry; a
 *   run older than it renders one line, not a table.
 * @returns {string} Markdown, starting with a `### Measured truth` heading.
 */
export function renderDigestSection(current, previous, drifts, opts = {}) {
  const head = '### Measured truth'
  if (!current) return `${head}\n\nNo measured-truth run yet.\n`
  if (opts.sinceDate && current.date < opts.sinceDate) {
    return `${head}\n\nNo run since the last entry (last ${stamp(current)}).\n`
  }
  const out = [head, '', `> ${stamp(current)}${previous ? `; compared with ${previous.commit} (${previous.date})` : ''}`, '']
  out.push('Doors, win rate / lowest-VITAE p10:', '', ...tableRows(current, (c) => c.isBoss), '')
  if (!previous) {
    out.push('First run: nothing to compare against.')
  } else if (!drifts.length) {
    out.push('No drift past the thresholds.')
  } else {
    out.push(`${drifts.length} drift(s) past the thresholds, each filed as a \`[content]\` AUDIT row:`, '')
    for (const d of drifts) {
      const { format } = DRIFT_METRICS[d.metric]
      out.push(`- ${d.fight}, ${d.deck} ${d.spread}: ${d.metric} ${format(d.previous)} -> ${format(d.current)}`)
    }
  }
  out.push('')
  return out.join('\n')
}
