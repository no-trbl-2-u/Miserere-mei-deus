// scripts/eval/seeded-lib.mjs
//
// Pure parts of the seeded replay (phase EV1c, brief A6): the four real bugs
// of 2026-10-14, which of a fix's paths are the planted defect, which tests
// each mechanical gate runs on it, the per-gate verdict and the report
// section. No I/O here; `scripts/eval/seeded-replay.mjs` plants the defects
// in a detached worktree that is never pushed.

import { isBookkeeping } from './ledger-lib.mjs'
import { isTestFile } from './parent-replay-lib.mjs'

export const SECTION_START = '<!-- eval:seeded:start -->'
export const SECTION_END = '<!-- eval:seeded:end -->'

/** The real bugs, each by the commit that fixed it. Reverting a fix's source plants its bug. */
export const SEEDS = Object.freeze([
  { id: 'D1', pr: 534, fix: '4080f4a0', bug: '`riderPairs` ignored damage riders, so A Plain Blow drew no FREE pill' },
  { id: 'D2', pr: 523, fix: 'cfadbf7a', bug: "a loose die drop refused at the SACRIFICE floor showed no VITAE ring callout (#523's own follow-up)" },
  { id: 'D3', pr: 529, fix: '9d44ca5e', bug: "the leftmost hand card's FREE pill was clipped at the screen edge (#529's final head)" },
  { id: 'D4', pr: 543, fix: '80ea6f44', bug: 'the `pr-resolve` union merge split moved queue rows' },
])

/** The mechanical gates a planted defect meets, in the order the report lists them. */
export const GATES = Object.freeze([
  { key: 'ci', label: 'CI path filters', note: 'a `verify-*` workflow triggers on the planted paths' },
  { key: 'before', label: 'verify, tests as they stood', note: "the related tests at the fix's parent, where the bug lived" },
  { key: 'after', label: 'verify, with the fix\'s tests', note: "the related tests at the fix, with its source reverted" },
])

/**
 * The paths a fix changed that carry the defect: source, not tests and not
 * loop bookkeeping.
 *
 * @param {string[]} files every path the fix commit changed.
 * @returns {string[]} the paths to revert.
 * @example plantedPaths(['a/x.ts', 'a/__tests__/x.test.ts', 'telemetry/t.md']) // ['a/x.ts']
 */
export function plantedPaths(files) {
  return files.filter((f) => !isTestFile(f) && !isBookkeeping(f))
}

const stem = (path) => path.split('/').pop().replace(/\.[^.]+$/, '')
const dirOf = (path) => path.split('/').slice(0, -1).join('/')

/**
 * The tests a verify run relates to the planted paths: a test file in the
 * same directory or its `__tests__/` whose name starts with a planted file's
 * stem, plus any extra test files named (the fix's own).
 *
 * @param {string[]} planted the planted source paths.
 * @param {string[]} tracked every tracked file at the commit the tests run on.
 * @param {string[]} [extra] test files to add when tracked there.
 * @returns {string[]} sorted repo-relative test paths.
 * @example relatedTests(['m/c/Board.tsx'], ['m/c/__tests__/Board.fan.test.tsx', 'm/c/__tests__/Other.test.tsx']) // ['m/c/__tests__/Board.fan.test.tsx']
 */
export function relatedTests(planted, tracked, extra = []) {
  const trackedSet = new Set(tracked)
  const out = new Set(extra.filter((f) => trackedSet.has(f) && isTestFile(f)))
  for (const src of planted) {
    const d = dirOf(src)
    const s = stem(src)
    for (const f of tracked) {
      if (!isTestFile(f)) continue
      const fd = dirOf(f)
      if ((fd === d || fd === `${d}/__tests__`) && f.split('/').pop().startsWith(`${s}.`)) out.add(f)
    }
  }
  return [...out].sort()
}

/**
 * A test gate's verdict from its per-file results. A file that also fails
 * at the unplanted fix (the control) is noise, not a catch, and is dropped.
 *
 * @param {Record<string, { ok: boolean, message?: string }>} results keyed by test path.
 * @param {string[]} [noisy] files that fail at the control.
 * @returns {{ verdict: 'caught'|'missed'|'no tests', failing: string[], noisy: string[] }} caught when any related file fails that passes at the control.
 * @example testVerdict({ a: { ok: false }, b: { ok: false } }, ['b']).failing // ['a']
 */
export function testVerdict(results, noisy = []) {
  const entries = Object.entries(results).filter(([p]) => !noisy.includes(p))
  const dropped = Object.keys(results).filter((p) => noisy.includes(p))
  if (entries.length === 0) return { verdict: 'no tests', failing: [], noisy: dropped }
  const failing = entries.filter(([, r]) => !r.ok).map(([p]) => p)
  return { verdict: failing.length > 0 ? 'caught' : 'missed', failing, noisy: dropped }
}

/**
 * The CI gate's verdict: CI can only catch a defect when a `verify-*`
 * workflow triggers on its paths and the tests it runs fail.
 *
 * @param {string[]} triggered the workflows the planted paths trigger.
 * @param {{ verdict: string }} before the "tests as they stood" verdict.
 * @returns {{ verdict: 'caught'|'missed', why: string }} the verdict and its reason.
 */
export function ciVerdict(triggered, before) {
  if (triggered.length === 0) return { verdict: 'missed', why: 'no `verify-*` workflow triggers on these paths' }
  if (before.verdict === 'caught') return { verdict: 'caught', why: `${triggered.join(', ')} runs the failing tests` }
  return { verdict: 'missed', why: `${triggered.join(', ')} triggers, and its related tests pass` }
}

const cell = (s) => String(s).replace(/\|/g, '\\|')

/**
 * The seeded-replay section of `docs/reports/eval/latest.md`, markers included.
 *
 * @param {{ stamp: { commit: string, date: string }, seeds: object[] }} replay the run.
 * @returns {string} markdown.
 */
export function renderSeededSection(replay) {
  const out = [SECTION_START, '', '## Planted defects (EV1c, A6)', '']
  out.push(`Stamp: commit \`${replay.stamp.commit}\` (${replay.stamp.date}). Regenerate with \`node scripts/eval/seeded-replay.mjs\`; the data is \`docs/reports/eval/seeded.json\`.`, '')
  out.push("Each real bug of 2026-10-14 is planted again by reverting its fix's source (not its tests) in a detached worktree that is never pushed. Each mechanical gate then meets it:", '')
  for (const g of GATES) out.push(`- **${g.label}**: ${g.note}.`)
  out.push('', 'A related test that also fails at the unplanted fix (the control run) is noise and is dropped from both test gates; the JSON names it.', '', 'The related tests are the test files beside a planted file whose names start with its name, plus the files the fix itself changed. The antagonist, `/critique` and the merge gate are agent or session judges and are scored from the ledger, not replayed (brief Decisions).', '')
  out.push(`| Seed | Bug | Fix | Planted paths | ${GATES.map((g) => g.label).join(' | ')} |`, `|---|---|---|---|${GATES.map(() => '---').join('|')}|`)
  for (const s of replay.seeds) {
    const gates = GATES.map((g) => {
      const v = s.gates[g.key]
      return `${v.verdict}${v.why ? ` (${v.why})` : v.failing?.length ? ` (${v.failing.map((f) => f.split('/').pop()).join(', ')})` : ''}`
    })
    out.push(`| ${s.id} (#${s.pr}) | ${cell(s.bug)} | ${s.fix} | ${cell(s.planted.join(', '))} | ${gates.map(cell).join(' | ')} |`)
  }
  const tally = GATES.map((g) => `${g.label}: ${replay.seeds.filter((s) => s.gates[g.key].verdict === 'caught').length} of ${replay.seeds.length} caught`)
  out.push('', tally.join('; ') + '.', '', SECTION_END)
  return out.join('\n')
}

// --- `--judge review` (phase RV1c, brief A7) ---------------------------------
//
// The shadow reviewer meets each planted defect as a draft PR, and its fix
// as a clean control PR. These are the pure parts: branch names, where the
// planted lines are, whether a verdict names one, and the Part 4 "before
// Stage 1" thresholds of `docs/reports/pr-review-research.md`.

export const REVIEW_SECTION_START = '<!-- eval:seeded-review:start -->'
export const REVIEW_SECTION_END = '<!-- eval:seeded-review:end -->'

/** A MED+ finding within this many lines of a planted hunk names it. */
export const LINE_SLACK = 3

/** The Part 4 run-time threshold, in minutes. */
export const P90_LIMIT_MIN = 20

/**
 * The throwaway branches a seed's two draft PRs live on.
 *
 * @param {string} id the seed id.
 * @returns {{ seed: string, control: string }} branch names.
 * @example reviewBranches('D1').seed // 'eval/seed-D1'
 */
export function reviewBranches(id) {
  return { seed: `eval/seed-${id}`, control: `eval/control-${id}` }
}

/**
 * The new-side line ranges of each file's hunks in a unified diff. A hunk
 * that only deletes covers the one line it sits at.
 *
 * @param {string} diff `git diff` output.
 * @returns {Record<string, Array<[number, number]>>} inclusive ranges keyed by path.
 * @example hunkRanges('+++ b/a.ts\n@@ -3,2 +3,4 @@\n')['a.ts'] // [[3, 6]]
 */
export function hunkRanges(diff) {
  const out = {}
  let file = null
  for (const line of diff.split(/\r?\n/)) {
    const f = line.match(/^\+\+\+ (?:b\/)?(.+)$/)
    if (f) {
      file = f[1] === '/dev/null' ? null : f[1]
      continue
    }
    const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
    if (h && file) {
      const start = Number(h[1])
      const count = h[2] === undefined ? 1 : Number(h[2])
      ;(out[file] ??= []).push([start, start + Math.max(count, 1) - 1])
    }
  }
  return out
}

/**
 * The findings rows of a verdict comment (`skills/review.md` Step 5).
 *
 * @param {string} body the verdict comment.
 * @returns {Array<{ severity: 'HIGH'|'MED'|'LOW', path: string|null, line: number|null, finding: string }>} one per row.
 * @example verdictRows('| MED | `a.ts:4` | x |')[0].line // 4
 */
export function verdictRows(body) {
  const rows = []
  for (const m of (body ?? '').matchAll(/^\|\s*(HIGH|MED|LOW)\s*\|\s*([^|]*?)\s*\|\s*(.*?)\s*\|\s*$/gm)) {
    const where = m[2].replace(/`/g, '').trim()
    const at = where.match(/^(.+?):(\d+)(?:[-:]\d+)?$/)
    rows.push({ severity: m[1], path: at ? at[1] : where || null, line: at ? Number(at[2]) : null, finding: m[3] })
  }
  return rows
}

/**
 * Whether a verdict names a planted line: a MED or HIGH row on a planted
 * path whose line sits within `LINE_SLACK` of one of its hunks. A row with
 * no line does not count; the threshold is "names the planted line".
 *
 * @param {string} body the verdict comment.
 * @param {Record<string, Array<[number, number]>>} hunks from `hunkRanges` over the seed PR's diff.
 * @returns {{ flagged: boolean, medPlus: number, high: number, hits: string[] }} the score.
 * @example flagsPlanted('| HIGH | `a.ts:5` | x |', { 'a.ts': [[3, 3]] }).flagged // true
 */
export function flagsPlanted(body, hunks) {
  const rows = verdictRows(body).filter((r) => r.severity !== 'LOW')
  const hits = rows
    .filter((r) => r.line != null && (hunks[r.path] ?? []).some(([a, b]) => r.line >= a - LINE_SLACK && r.line <= b + LINE_SLACK))
    .map((r) => `${r.path}:${r.line}`)
  return { flagged: hits.length > 0, medPlus: rows.length, high: rows.filter((r) => r.severity === 'HIGH').length, hits }
}

/**
 * Nearest-rank percentile; a run that never posted counts as `Infinity`.
 *
 * @param {number[]} values minutes.
 * @param {number} p in (0, 1].
 * @returns {number|null} the value, or null for no values.
 * @example percentile([1, 2, 3, 30], 0.9) // 30
 */
export function percentile(values, p) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil(p * sorted.length) - 1]
}

/**
 * The three Part 4 "before Stage 1" rows, from each seed's `review` block.
 * Seeds the review judge never ran on make every row "not measured".
 *
 * @param {Array<{ id: string, review?: object }>} seeds replayed seeds.
 * @returns {Array<{ measure: string, pass: string, value: string, verdict: 'pass'|'fail'|'not measured' }>} the rows.
 */
export function reviewThresholds(seeds) {
  const ran = seeds.filter((s) => s.review)
  const rows = [
    { measure: 'Planted defects flagged MED+ (D1-D4)', pass: '>= 3 of 4' },
    { measure: 'Findings per clean control PR (the unplanted fix)', pass: '<= 1 MED+, 0 HIGH' },
    { measure: 'Run time, p90 of the four', pass: `<= ${P90_LIMIT_MIN} min` },
  ]
  if (ran.length === 0) return rows.map((r) => ({ ...r, value: 'not measured', verdict: 'not measured' }))
  const flagged = ran.filter((s) => s.review.seed?.flagged).length
  const controls = ran.map((s) => s.review.control)
  const cleanControls = controls.filter((c) => c?.posted && c.medPlus <= 1 && c.high === 0).length
  const minutes = ran.map((s) => (s.review.seed?.posted ? s.review.seed.seconds / 60 : Infinity))
  const p90 = percentile(minutes, 0.9)
  return [
    { ...rows[0], value: `${flagged} of ${ran.length}`, verdict: flagged >= 3 ? 'pass' : 'fail' },
    { ...rows[1], value: `${cleanControls} of ${ran.length} within`, verdict: cleanControls === ran.length ? 'pass' : 'fail' },
    { ...rows[2], value: Number.isFinite(p90) ? `${p90.toFixed(1)} min` : 'a run never posted', verdict: p90 <= P90_LIMIT_MIN ? 'pass' : 'fail' },
  ]
}

const runCell = (r) => {
  if (!r) return 'not run'
  if (!r.posted) return `#${r.pr}: no verdict (${r.why ?? 'timed out'})`
  return `#${r.pr}: ${r.verdict}, ${r.medPlus} MED+ (${r.high} HIGH), ${(r.seconds / 60).toFixed(1)} min`
}

/**
 * The seeded-review section of `docs/reports/eval/latest.md`, markers included.
 *
 * @param {{ stamp: { commit: string, date: string }|null, seeds: object[] }} replay the run; `stamp` null before the first.
 * @returns {string} markdown.
 */
export function renderReviewSection(replay) {
  const out = [REVIEW_SECTION_START, '', '## The shadow reviewer on planted defects (RV1c, A7)', '']
  out.push(replay.stamp
    ? `Stamp: commit \`${replay.stamp.commit}\` (${replay.stamp.date}). Regenerate with \`node scripts/eval/seeded-replay.mjs --judge review\`; the data is the \`review\` block of each seed in \`docs/reports/eval/seeded.json\`.`
    : 'Not measured yet: `node scripts/eval/seeded-replay.mjs --judge review` has not run against the three-lens reviewer on `main`.', '')
  out.push(`Each seed is pushed as a draft \`eval:seed\` PR whose diff reverts its fix's source (the planted defect), and its fix as a second draft (the clean control). \`pr-review.yml\` is dispatched on each; a seed counts as flagged when a MED or HIGH row of the verdict names a planted line (within ${LINE_SLACK} lines of a hunk). Both PRs are closed and their branches deleted when the run ends. Thresholds: \`docs/reports/pr-review-research.md\` Part 4.`, '')
  out.push('| Measure | Pass | Value | Verdict |', '|---|---|---|---|')
  for (const r of reviewThresholds(replay.seeds)) out.push(`| ${r.measure} | ${r.pass} | ${r.value} | ${r.verdict} |`)
  const ran = replay.seeds.filter((s) => s.review)
  if (ran.length) {
    out.push('', '| Seed | Planted PR | Named the planted line | Control PR |', '|---|---|---|---|')
    for (const s of ran) out.push(`| ${s.id} | ${cell(runCell(s.review.seed))} | ${s.review.seed?.hits?.length ? cell(s.review.seed.hits.join(', ')) : 'no'} | ${cell(runCell(s.review.control))} |`)
  }
  out.push('', REVIEW_SECTION_END)
  return out.join('\n')
}
