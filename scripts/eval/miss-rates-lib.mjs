// scripts/eval/miss-rates-lib.mjs
//
// Pure parts of the miss-rate table (phase EV1c, brief A7): one row per
// judge, each with its misses, its denominator and the ledger rows they come
// from, computed from the ledger (EV1a), the parent replay (EV1b), the
// planted defects and the mutation scores (EV1c). No I/O here;
// `scripts/eval/miss-rates.mjs` reads the JSON and writes the section.
//
// A judge whose rate this evidence cannot measure says "not measured" and
// why, rather than a number. `/critique` is scored from its pass records
// (phase LG1e, `docs/reports/critique/passes.jsonl`).

import { combineTallies } from './mutation-lib.mjs'

export const SECTION_START = '<!-- eval:miss-rates:start -->'
export const SECTION_END = '<!-- eval:miss-rates:end -->'

/** The seeded escapes the ledger ties to a PR, by seed ID (brief A2). */
export const SEED_PRS = Object.freeze({ S1: [529], S3: [520, 521, 523], S4: [526], S5: [523] })

/**
 * A rate in percent, one decimal, or null with no denominator.
 *
 * @param {number} misses the count.
 * @param {number} of the denominator.
 * @returns {number|null} the rate.
 * @example rate(1, 4) // 25
 */
export function rate(misses, of) {
  return of === 0 ? null : Math.round((misses / of) * 1000) / 10
}

/** The severities a critique finding can carry. */
export const CRITIQUE_SEVERITIES = Object.freeze(['HIGH', 'MED', 'LOW'])

const SHA = /^[0-9a-f]{7,40}$/
const strings = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0)

/**
 * The `/critique` pass records, one JSON object per line (phase LG1e, A5).
 * A record is `{ pass, date, base, head, screens, viewports, findings }`,
 * each finding `{ id, severity }`. Blank lines are skipped; a malformed
 * line throws with its line number.
 *
 * @param {string} text the contents of `docs/reports/critique/passes.jsonl`.
 * @returns {{ pass: number, date: string, base: string, head: string, screens: string[], viewports: string[], findings: { id: string, severity: string }[] }[]} the records, in file order.
 * @example parsePassRecords('').length // 0
 */
export function parsePassRecords(text) {
  const out = []
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return
    const where = `passes.jsonl line ${i + 1}`
    let r
    try {
      r = JSON.parse(line)
    } catch {
      throw new Error(`${where}: not JSON`)
    }
    if (!Number.isInteger(r.pass) || r.pass < 1) throw new Error(`${where}: \`pass\` must be a positive integer`)
    if (typeof r.date !== 'string' || Number.isNaN(Date.parse(r.date))) throw new Error(`${where}: \`date\` must be an ISO date`)
    for (const k of ['base', 'head']) if (typeof r[k] !== 'string' || !SHA.test(r[k])) throw new Error(`${where}: \`${k}\` must be a commit sha`)
    for (const k of ['screens', 'viewports']) if (!strings(r[k]) || r[k].length === 0) throw new Error(`${where}: \`${k}\` must list at least one name`)
    if (!Array.isArray(r.findings)) throw new Error(`${where}: \`findings\` must be a list`)
    for (const f of r.findings) {
      if (typeof f?.id !== 'string' || !f.id.trim()) throw new Error(`${where}: a finding needs an \`id\``)
      if (!CRITIQUE_SEVERITIES.includes(f.severity)) throw new Error(`${where}: finding "${f.id}" severity must be one of ${CRITIQUE_SEVERITIES.join(', ')}`)
    }
    if (out.some((o) => o.pass === r.pass)) throw new Error(`${where}: pass ${r.pass} is recorded twice`)
    out.push(r)
  })
  return out
}

/** A fix subject that cites a critique pass by number, in the `CRITIQUE pass <N> …` claim form. */
const CITES_PASS = /\bCRITIQUE pass (\d+)\b/i

/**
 * Whether a fix subject cites one of a pass's findings: its id, or
 * `CRITIQUE pass <N>` for a pass that filed at least one finding.
 *
 * @param {string} subject the fix commit's subject.
 * @param {{ pass: number, findings: { id: string }[] }} pass a pass record.
 * @returns {boolean} true when the subject names that pass's finding.
 * @example citesPass('fix: dock (CRITIQUE pass 85 footer dock)', { pass: 85, findings: [{ id: 'pass 85 footer dock' }] }) // true
 */
export function citesPass(subject, pass) {
  if (pass.findings.length === 0) return false
  const lower = subject.toLowerCase()
  if (pass.findings.some((f) => lower.includes(f.id.toLowerCase()))) return true
  const m = CITES_PASS.exec(subject)
  return m != null && Number(m[1]) === pass.pass
}

/**
 * `/critique`'s misses (A5). An escape merged inside a recorded pass's
 * `base..head` range was there to be seen; it is a catch when one of its
 * follow-up fixes cites a finding of that pass or a later recorded one,
 * otherwise a miss. Each pass carries `commits`, the first-parent commits
 * of its range, resolved by the caller (this module does no git).
 *
 * @param {object[]} rows the ledger rows.
 * @param {{ pass: number, findings: { id: string }[], commits?: string[] }[]} passes the pass records with their ranges.
 * @param {(row: object) => boolean} isEscape whether a ledger row escaped.
 * @returns {{ exposed: string[], misses: string[], caught: string[] }} PR labels, `#<n> (pass <N>)`.
 */
export function scoreCritique(rows, passes, isEscape) {
  const exposed = []
  const misses = []
  const caught = []
  for (const r of rows.filter(isEscape)) {
    const covering = passes.find((p) => (p.commits ?? []).includes(r.mergeCommit))
    if (!covering) continue
    const label = `#${r.number} (pass ${covering.pass})`
    exposed.push(label)
    const later = passes.filter((p) => p.pass >= covering.pass)
    const hit = r.followUps.some((f) => later.some((p) => citesPass(f.subject, p)))
    ;(hit ? caught : misses).push(label)
  }
  return { exposed, misses, caught }
}

const row = (judge, misses, of, note) => ({ judge, misses, of, rate: rate(misses.length, of), note })
const notMeasured = (judge, note) => ({ judge, misses: null, of: null, rate: null, note })

/**
 * The miss-rate rows.
 *
 * @param {{ ledger: { rows: object[] }, replay: { ticks: object[], seedTicks: object[] }|null, seeded: { seeds: object[] }|null, mutation: { targets: object[] }|null, critique?: object[]|null }} evidence the EV1 data files, plus the `/critique` pass records with their `commits` (LG1e).
 * @returns {{ judge: string, misses: string[]|null, of: number|null, rate: number|null, note: string }[]} one row per judge.
 */
export function computeMissRates({ ledger, replay, seeded, mutation, critique = null }) {
  const rows = ledger.rows
  const planted = seeded?.seeds ?? []
  const out = []

  // CI and its path filters: a planted defect CI did not fail on.
  const uncovered = rows.filter((r) => r.uncovered.length > 0).map((r) => `#${r.number}`)
  const ciMiss = planted.filter((s) => s.gates.ci.verdict === 'missed')
  const noTrigger = planted.filter((s) => s.triggered.length === 0).map((s) => s.id)
  out.push(planted.length
    ? row('CI and its path filters', ciMiss.map((s) => `${s.id} (#${s.pr})`), planted.length,
      `${noTrigger.length} of ${planted.length} planted defects trigger no \`verify-*\` workflow (${noTrigger.join(', ') || 'none'}). Path coverage: ${uncovered.length} of ${rows.length} ledger PRs changed code no filter covers (${uncovered.join(', ')}).`)
    : notMeasured('CI and its path filters', 'no planted-defect run (`seeded.json`) to score it on.'))

  // verify: the related tests as they stood, on the planted defects; mutation survivors as context.
  const verifyMiss = planted.filter((s) => s.gates.before.verdict !== 'caught')
  const scores = (mutation?.targets ?? []).map((t) => {
    if (t.outcome !== 'ok') return `${t.name}: ${t.outcome}`
    const c = combineTallies(t.files.map((f) => f.tally))
    return `${t.name}: ${c.score}% (${c.survived + c.noCoverage} of ${c.total} mutants survive or are uncovered)`
  })
  out.push(planted.length
    ? row('`verify`', verifyMiss.map((s) => `${s.id} (#${s.pr})`), planted.length,
      `Tests as they stood at each fix's parent. Each fix's own tests catch its defect: ${planted.filter((s) => s.gates.after.verdict === 'caught').length} of ${planted.length}. Mutation: ${scores.join('; ') || 'not run'}.`)
    : notMeasured('`verify`', 'no planted-defect run (`seeded.json`) to score it on.'))

  // The antagonist: reviewed PRs carrying a known escape that it passed.
  const escapePrs = new Map()
  for (const [seed, prs] of Object.entries(SEED_PRS)) for (const n of prs) escapePrs.set(n, [...(escapePrs.get(n) ?? []), seed])
  const verdict = (r) => r.antagonist?.verdict ?? 'none'
  const reviewed = rows.filter((r) => escapePrs.has(r.number) && verdict(r) !== 'none')
  const antMiss = reviewed.filter((r) => verdict(r) === 'pass')
  out.push(reviewed.length
    ? row('The antagonist', antMiss.map((r) => `#${r.number} (${escapePrs.get(r.number).join(', ')})`), reviewed.length,
      `Denominator: PRs carrying a seeded escape that the antagonist reviewed before merge. It reviewed ${rows.filter((r) => verdict(r) !== 'none').length} of ${rows.length} ledger PRs; ${rows.filter((r) => verdict(r) === 'not-pass').length} drew a "not a pass".`)
    : notMeasured('The antagonist', 'no PR carrying a seeded escape has an antagonist verdict on record.'))

  // The shadow reviewer (RV1b): shadow-reviewed PRs that escaped anyway,
  // where its last verdict before merge named no MED+ finding.
  const rv = (r) => r.review?.verdict ?? 'none'
  const shadowed = rows.filter((r) => rv(r) !== 'none')
  const escaped = shadowed.filter((r) => escapePrs.has(r.number) || r.followUps.length > 0)
  out.push(shadowed.length
    ? row('The shadow reviewer (`pr-review`)', escaped.filter((r) => !r.review.medPlus).map((r) => `#${r.number}`), escaped.length,
      `Denominator: shadow-reviewed PRs that escaped (a seeded escape, or a fix within 7 days on the same code). A miss is an escape whose last verdict before merge named no MED+ finding. Verdict before merge: ${shadowed.length} of ${rows.length} ledger PRs; "not-pass" merged anyway: ${shadowed.filter((r) => r.review.mergedOnNotPass).map((r) => `#${r.number}`).join(', ') || 'none'}.`)
    : notMeasured('The shadow reviewer (`pr-review`)', 'no ledger PR has a `pr-review` verdict before its merge yet (the reviewer starts with phase RV1b); the Part 4 shadow table reads 20.'))

  // /critique runs after merge on the web build; its pass records say which commits each pass played.
  const critiqueFixes = new Set(rows.flatMap((r) => r.followUps).filter((f) => /CRITIQUE/.test(f.subject)).map((f) => f.sha))
  const context = `Context: ${critiqueFixes.size} follow-up fix(es) in the ledger cite a critique pass.`
  if (critique?.length) {
    const c = scoreCritique(rows, critique, (r) => escapePrs.has(r.number) || r.followUps.length > 0)
    out.push(row('`/critique`', c.misses, c.exposed.length,
      `Denominator: escapes (a seeded escape, or a fix within 7 days on the same code) merged inside a recorded pass's base..head range; ${critique.length} pass(es) recorded (${critique.map((p) => p.pass).join(', ')}). A catch is an escape whose fix cites a finding of that pass or a later one: ${c.caught.join(', ') || 'none'}. ${context}`))
  } else {
    out.push(notMeasured('`/critique`',
      `it plays the deployed web build after merge and no pass is recorded in \`docs/reports/critique/passes.jsonl\` yet, so it has no denominator. ${context}`))
  }

  // The merge gate: merged before a check on the final head finished, or on a "not a pass".
  const early = rows.filter((r) => r.ran.some((c) => c.finishedAfterMerge) || r.antagonist?.mergedOnNotPass)
  out.push(row('The merge gate', early.map((r) => `#${r.number}`), rows.length,
    'A miss is a merge before every check on the final head finished, or over an antagonist "not a pass" (S1).'))

  // The builder's own [x]: ticked lines the evidence shows unproven.
  if (replay) {
    const unproven = replay.ticks.filter((t) => t.unproven).map((t) => `#${t.pr} ${t.id}`)
    const seededTicks = replay.seedTicks.map((t) => `#${t.pr} ${t.id} (S3)`)
    const misses = [...new Set([...unproven, ...seededTicks, '#523 verify:visual (S5)'])]
    const naming = replay.ticks.filter((t) => t.named.length === 0).length
    out.push(row("The builder's own `[x]`", misses, replay.ticks.length,
      `Misses: ticks the parent replay found unproven (${unproven.length}), the seeded S3 ticks and S5's missing shot. ${naming} of ${replay.ticks.length} ticks name no test, so the replay can neither prove nor clear them.`))
  } else {
    out.push(notMeasured("The builder's own `[x]`", 'no parent replay (`parent-replay.json`) to read the ticks from.'))
  }
  return out
}

const cell = (s) => String(s).replace(/\|/g, '\\|')

/**
 * The miss-rate section of `docs/reports/eval/latest.md`, markers included.
 *
 * @param {{ stamp: { commit: string, date: string }, rows: object[], inputs: Record<string, string> }} table the computed table.
 * @returns {string} markdown.
 */
export function renderMissRateSection(table) {
  const out = [SECTION_START, '', '## Miss rate per judge (EV1c, A7)', '']
  out.push(`Stamp: commit \`${table.stamp.commit}\` (${table.stamp.date}). Regenerate with \`node scripts/eval/miss-rates.mjs\`; inputs: ${Object.entries(table.inputs).map(([k, v]) => `${k} at \`${v}\``).join(', ')}.`, '')
  out.push('| Judge | Missed | Of | Rate | Rows it comes from | How it is counted |', '|---|---|---|---|---|---|')
  for (const r of table.rows) {
    if (r.misses == null) {
      out.push(`| ${r.judge} | not measured | - | - | - | ${cell(r.note)} |`)
      continue
    }
    out.push(`| ${r.judge} | ${r.misses.length} | ${r.of} | ${r.rate == null ? 'n/a' : `${r.rate}%`} | ${cell(r.misses.join(', ') || 'none')} | ${cell(r.note)} |`)
  }
  out.push('', 'Android has no gate at all (S6), so it has no rate (brief Decisions).', '', SECTION_END)
  return out.join('\n')
}
