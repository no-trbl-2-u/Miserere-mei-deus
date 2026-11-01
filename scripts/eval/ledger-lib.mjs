// scripts/eval/ledger-lib.mjs
//
// Pure parts of the escape ledger (phase EV1a): `verify-*` path-filter
// parsing and matching, 7-day follow-up detection, PR comment
// classification, the six seeded escapes and the markdown section. No I/O
// here; `scripts/eval/escape-ledger.mjs` is the only module that reads
// GitHub or git, or writes the report.
//
// A ledger row is `{ number, title, mergedAt, head, mergeCommit, files,
// ran, skipped, expectedNotRun, uncovered, followUps, comments, antagonist }`.
// This is a measurement, not a gate: nothing here fails on a number.

/** Paths that only record the loop's own bookkeeping (the plan-only set in `skills/march.md` §3). */
export const BOOKKEEPING_PREFIXES = Object.freeze(['plan/', 'telemetry/', 'docs/reports/', 'devlog/entries/'])

/** How long after a merge a fix or revert counts as its follow-up. */
export const FOLLOW_UP_DAYS = 7

/** A landing subject that reads as a fix or a revert. */
const FIX_SUBJECT = /^(fix|revert|hotfix)\b|\brevert\b|\brepair\b/i

/** Comment authors that are apps, not people. */
const APP_AUTHORS = new Set(['cloudflare-workers-and-pages', 'github-actions', 'vercel', 'netlify'])

/**
 * Whether a path is loop bookkeeping rather than code or content.
 *
 * @param {string} path a repo-relative path.
 * @returns {boolean} true under `plan/`, `telemetry/`, `docs/reports/` or `devlog/entries/`.
 * @example isBookkeeping('plan/CRITIQUE.md') // true
 */
export function isBookkeeping(path) {
  return BOOKKEEPING_PREFIXES.some((p) => path.startsWith(p))
}

/**
 * The workflow `name:` and its `on.pull_request.paths` list, read from the
 * YAML text by indentation. A workflow with no `pull_request` trigger has
 * `paths: null`; one triggered on every path has `paths: []`.
 *
 * @param {string} text the workflow file's contents.
 * @returns {{ name: string|null, paths: string[]|null }} the parsed filter.
 * @example parseWorkflowFilter("name: x\non:\n  pull_request:\n    paths:\n      - 'a/**'\n").paths // ['a/**']
 */
export function parseWorkflowFilter(text) {
  const lines = text.split(/\r?\n/)
  const nameLine = lines.find((l) => /^name:\s*/.test(l))
  const name = nameLine ? nameLine.replace(/^name:\s*/, '').replace(/^['"]|['"]$/g, '').trim() : null
  const onIdx = lines.findIndex((l) => /^(on|'on'|"on"):\s*$/.test(l))
  if (onIdx < 0) return { name, paths: null }
  let prIndent = -1
  let pathsIndent = -1
  let paths = null
  let done = false
  for (let i = onIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*(#.*)?$/.test(line)) continue
    const indent = line.match(/^ */)[0].length
    if (indent === 0) break
    if (prIndent < 0) {
      if (/^\s*pull_request:\s*$/.test(line)) { prIndent = indent; paths = [] }
      continue
    }
    if (indent <= prIndent) break
    if (done) continue
    if (pathsIndent < 0) {
      if (/^\s*paths:\s*$/.test(line)) pathsIndent = indent
      continue
    }
    const item = line.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*(#.*)?$/)
    if (item) paths.push(item[1])
    else done = true
  }
  return { name, paths }
}

/**
 * The `verify-*` workflows among a set of workflow files, parsed and sorted
 * by name; one with no `pull_request` trigger is dropped. The escape ledger
 * feeds it each PR's merge-commit tree, so a PR is classified against the
 * filters it merged under, not today's.
 *
 * @param {{ file: string, text: string }[]} entries workflow file names (no directory) and their contents.
 * @returns {{ file: string, text: string, name: string|null, paths: string[] }[]} the parsed `verify-*` filters.
 * @example verifyWorkflowsFrom([{ file: 'deploy.yml', text: '' }]) // []
 */
export function verifyWorkflowsFrom(entries) {
  return entries
    .filter(({ file }) => /^verify-.*\.ya?ml$/.test(file))
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
    .map(({ file, text }) => ({ file, text, ...parseWorkflowFilter(text) }))
    .filter((wf) => wf.paths !== null)
}

/**
 * A GitHub Actions path glob as a RegExp: `**` crosses directories, `*`
 * and `?` do not.
 *
 * @param {string} glob a `paths:` entry without a leading `!`.
 * @returns {RegExp} an anchored matcher.
 * @example globToRegExp('axiomancer-mobile/**').test('axiomancer-mobile/a/b.ts') // true
 */
export function globToRegExp(glob) {
  let out = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      i++
      if (glob[i + 1] === '/') { i++; out += '(?:.*/)?' } else out += '.*'
    } else if (c === '*') out += '[^/]*'
    else if (c === '?') out += '[^/]'
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${out}$`)
}

/**
 * Whether a path triggers a filter. Later entries win, so a `!` entry
 * excludes what came before it, as GitHub reads `paths:`.
 *
 * @param {string} path a changed file.
 * @param {string[]} filters the workflow's `paths:` list (empty means every path).
 * @returns {boolean} true when the workflow would run for this path.
 * @example pathMatches('scripts/x.mjs', ['axiomancer-mobile/**']) // false
 */
export function pathMatches(path, filters) {
  if (filters.length === 0) return true
  let hit = false
  for (const f of filters) {
    if (f.startsWith('!')) { if (globToRegExp(f.slice(1)).test(path)) hit = false } else if (globToRegExp(f).test(path)) hit = true
  }
  return hit
}

/**
 * Which `verify-*` workflows a diff triggers and which it skips, and the
 * non-bookkeeping files no workflow covers.
 *
 * @param {string[]} files the PR's changed paths.
 * @param {{ file: string, name: string, paths: string[] }[]} workflows the parsed `verify-*` filters.
 * @returns {{ triggered: string[], skipped: string[], uncovered: string[] }} workflow file names and paths.
 * @example classifyPaths(['scripts/pr-resolve.mjs'], [{ file: 'verify-mobile.yml', name: 'verify-mobile', paths: ['axiomancer-mobile/**'] }]).uncovered // ['scripts/pr-resolve.mjs']
 */
export function classifyPaths(files, workflows) {
  const triggered = []
  const skipped = []
  for (const wf of workflows) (files.some((f) => pathMatches(f, wf.paths)) ? triggered : skipped).push(wf.file)
  const uncovered = files.filter((f) => !isBookkeeping(f) && !workflows.some((wf) => pathMatches(f, wf.paths)))
  return { triggered, skipped, uncovered }
}

/**
 * The checks that ran on a PR's final head, each flagged when it finished
 * after the merge (the merge did not wait for it).
 *
 * @param {{ name: string, path?: string, conclusion: string|null, startedAt: string, finishedAt: string|null }[]} runs workflow runs and external check runs on the head.
 * @param {string} mergedAt the merge time.
 * @returns {{ name: string, path: string|null, conclusion: string, startedAt: string, finishedAt: string|null, finishedAfterMerge: boolean }[]} sorted by name.
 * @example checksOnHead([{ name: 'verify-mobile', conclusion: 'success', startedAt: 'a', finishedAt: '2026-10-14T03:29:28Z' }], '2026-10-14T03:25:57Z')[0].finishedAfterMerge // true
 */
export function checksOnHead(runs, mergedAt) {
  const merged = Date.parse(mergedAt)
  return runs
    .map((r) => ({
      name: r.name,
      path: r.path ?? null,
      conclusion: r.conclusion ?? 'pending',
      startedAt: r.startedAt,
      finishedAt: r.finishedAt ?? null,
      finishedAfterMerge: r.finishedAt == null || Date.parse(r.finishedAt) > merged,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.startedAt.localeCompare(b.startedAt))
}

/**
 * The fix or revert landings on `main` that touched one of the PR's
 * non-bookkeeping files within `FOLLOW_UP_DAYS` after its merge.
 *
 * @param {{ mergeCommit: string, mergedAt: string, files: string[] }} pr the merged PR.
 * @param {{ sha: string, date: string, subject: string, files: string[] }[]} landings first-parent commits on `main`, any order.
 * @param {number} [days] the window length.
 * @returns {{ sha: string, date: string, subject: string, files: string[] }[]} oldest first; `files` is the overlap.
 * @example detectFollowUps({ mergeCommit: 'm', mergedAt: '2026-10-14T00:00:00Z', files: ['a.ts'] }, [{ sha: 'f', date: '2026-10-15T00:00:00Z', subject: 'fix: a', files: ['a.ts'] }]).length // 1
 */
export function detectFollowUps(pr, landings, days = FOLLOW_UP_DAYS) {
  const start = Date.parse(pr.mergedAt)
  const end = start + days * 86400000
  const own = new Set(pr.files.filter((f) => !isBookkeeping(f)))
  return landings
    .filter((l) => l.sha !== pr.mergeCommit && FIX_SUBJECT.test(l.subject))
    .filter((l) => { const t = Date.parse(l.date); return t > start && t <= end })
    .map((l) => ({ ...l, files: l.files.filter((f) => own.has(f)) }))
    .filter((l) => l.files.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** The shadow reviewer's verdict marker (phase RV1b, `skills/review.md`). */
export const REVIEW_VERDICT = /<!--\s*pr-review:verdict (pass|not-pass)\s*-->/

/**
 * The MED and HIGH rows of a verdict comment's findings table.
 *
 * @param {string} body the verdict comment.
 * @returns {number} the count.
 * @example countMedPlus('| HIGH | `a.ts:1` | x |\n| LOW | `b.ts:2` | y |') // 1
 */
export function countMedPlus(body) {
  return (body.match(/^\|\s*(HIGH|MED)\s*\|/gm) ?? []).length
}

/**
 * Who a PR comment speaks for. Every loop agent and T post as one account,
 * so the marker decides, not the author; an unmarked comment is never
 * counted as T's verdict.
 *
 * @param {{ author: string, body: string }} comment a PR comment or review.
 * @returns {{ judge: 'pr-review'|'antagonist'|'merge-script'|'workflow'|'owner-or-unknown', verdict: 'pass'|'not-pass'|'review'|null }} the classification.
 * @example classifyComment({ author: 'x', body: '## Antagonist review (in progress, not a pass)' }).verdict // 'not-pass'
 */
export function classifyComment(comment) {
  const body = comment.body ?? ''
  const review = body.match(REVIEW_VERDICT)
  if (review) return { judge: 'pr-review', verdict: review[1] }
  const head = body.split('\n').find((l) => l.trim() !== '') ?? ''
  if (/^Merged by Claude\b/i.test(head.trim())) return { judge: 'merge-script', verdict: null }
  if (/^#*\s*Antagonist (pass|review)\b/i.test(head.trim())) {
    let verdict = 'review'
    if (/not a pass|blocking/i.test(head)) verdict = 'not-pass'
    else if (/^##\s*Antagonist pass\s*$/i.test(head.trim())) verdict = 'pass'
    return { judge: 'antagonist', verdict }
  }
  const author = comment.author ?? ''
  if (author === 'claude[bot]' || author.endsWith('[bot]') || APP_AUTHORS.has(author)) return { judge: 'workflow', verdict: null }
  return { judge: 'owner-or-unknown', verdict: null }
}

/**
 * The antagonist's standing verdict at merge: its last comment before the
 * merge, and whether the merge went ahead on a "not a pass".
 *
 * @param {{ author: string, body: string, createdAt: string }[]} comments the PR's comments and reviews.
 * @param {string} mergedAt the merge time.
 * @returns {{ verdict: 'pass'|'not-pass'|'review'|'none', at: string|null, mergedOnNotPass: boolean, mergeScriptComment: boolean }} the summary.
 * @example antagonistAtMerge([], '2026-10-14T00:00:00Z').verdict // 'none'
 */
export function antagonistAtMerge(comments, mergedAt) {
  const merged = Date.parse(mergedAt)
  const classified = [...comments]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((c) => ({ ...c, ...classifyComment(c) }))
  const before = classified.filter((c) => c.judge === 'antagonist' && Date.parse(c.createdAt) <= merged)
  const last = before.at(-1)
  return {
    verdict: last ? last.verdict : 'none',
    at: last ? last.createdAt : null,
    mergedOnNotPass: last?.verdict === 'not-pass',
    mergeScriptComment: classified.some((c) => c.judge === 'merge-script'),
  }
}

/**
 * The shadow reviewer's standing verdict at merge: its last verdict
 * comment before the merge, with that comment's MED+ finding count.
 *
 * @param {{ author: string, body: string, createdAt: string }[]} comments the PR's comments and reviews.
 * @param {string} mergedAt the merge time.
 * @returns {{ verdict: 'pass'|'not-pass'|'none', at: string|null, medPlus: number, mergedOnNotPass: boolean }} the summary.
 * @example reviewAtMerge([], '2026-10-17T00:00:00Z').verdict // 'none'
 */
export function reviewAtMerge(comments, mergedAt) {
  const merged = Date.parse(mergedAt)
  const last = [...comments]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .filter((c) => classifyComment(c).judge === 'pr-review' && Date.parse(c.createdAt) <= merged)
    .at(-1)
  const verdict = last ? classifyComment(last).verdict : 'none'
  return { verdict, at: last ? last.createdAt : null, medPlus: last ? countMedPlus(last.body) : 0, mergedOnNotPass: verdict === 'not-pass' }
}

/**
 * The six escapes T seeded on 2026-10-14 (brief A2): each with its evidence
 * and the gate that should have caught it. `confirm` reads the ledger and
 * the git facts; a seed it cannot check mechanically stays "seeded".
 */
export const SEEDS = Object.freeze([
  {
    id: 'S1',
    title: '#529 merged before CI finished on its final head',
    evidence: ['PR #529', 'head 9d44ca5e', 'merge 93f05dfe'],
    gate: 'merge gate (branch protection with required checks, not comment matching)',
    detail: 'A session-local merge script matched "Antagonist pass" inside a "not a pass" comment.',
    confirm: (rows) => {
      const r = rows.find((x) => x.number === 529)
      if (!r) return { status: 'unconfirmed', note: 'PR #529 is not in the window' }
      const late = r.ran.filter((c) => c.finishedAfterMerge).map((c) => c.name)
      const ok = late.length > 0 && r.antagonist.mergedOnNotPass
      return {
        status: ok ? 'confirmed' : 'unconfirmed',
        note: `finished after merge: ${late.join(', ') || 'none'}; antagonist at merge: ${r.antagonist.verdict}`,
      }
    },
  },
  {
    id: 'S2',
    title: '`pr-resolve` merges cut `plan/CRITIQUE.md` rows apart on `main`',
    evidence: ['merge c95114a2', 'merge 49829988', 'repair 23f06828', 'repair 662aa10b'],
    gate: 'a structural lint for the plan queue files',
    detail: 'Repaired by hand on `main`; #543 then fixed the union merge.',
    confirm: (_rows, facts) => {
      const touch = ['c95114a2', '49829988', '23f06828', '662aa10b']
        .map((s) => facts.commits[s])
      const ok = touch.every((c) => c && c.files.includes('plan/CRITIQUE.md'))
      return { status: ok ? 'confirmed' : 'unconfirmed', note: ok ? 'all four commits touch plan/CRITIQUE.md' : 'a named commit is missing or does not touch plan/CRITIQUE.md' }
    },
  },
  {
    id: 'S3',
    title: 'Three tests that could not fail, their acceptance ticked `[x]`',
    evidence: ['PR #521 A4', 'PR #523 A6', 'PR #520 leaked `console.error` spy (near-miss)'],
    gate: 'a fail-on-parent check for new tests; an acceptance-ID-to-test map',
    detail: 'EV1b runs each test on the parent commit to prove or clear this.',
    confirm: (_rows, facts) => {
      const ticked = [[521, 'A4'], [523, 'A6']].filter(([n, id]) => new RegExp(`- \\[x\\] ${id}\\b`).test(facts.prBodies[n] ?? ''))
      return { status: 'seeded', note: `${ticked.length} of 2 named ticks found in the PR bodies; "could not fail" is for EV1b to prove` }
    },
  },
  {
    id: 'S4',
    title: '#526 merged with only Cloudflare Pages run',
    evidence: ['PR #526', 'head efc7f371'],
    gate: 'CI path filters (a path-coverage audit so no diff merges unverified)',
    detail: 'No `verify-*` filter covers `.github/workflows/` or root `scripts/`.',
    confirm: (rows) => {
      const r = rows.find((x) => x.number === 526)
      if (!r) return { status: 'unconfirmed', note: 'PR #526 is not in the window' }
      const ok = r.triggered.length === 0 && r.uncovered.length > 0
      return { status: ok ? 'confirmed' : 'unconfirmed', note: `ran: ${r.ran.map((c) => c.name).join(', ') || 'nothing'}; uncovered: ${r.uncovered.length} file(s)` }
    },
  },
  {
    id: 'S5',
    title: "SF1's brief asked for a `verify:visual` shot of the callout; none was taken",
    evidence: ['PR #523', 'plan/README.md'],
    gate: "the builder's own `[x]` (an acceptance-ID-to-test map)",
    detail: 'The PR body says `verify:visual` was not run locally.',
    confirm: (_rows, facts) => {
      const said = /verify:visual`? was not run/i.test(facts.prBodies[523] ?? '')
      return { status: said ? 'confirmed' : 'seeded', note: said ? 'PR #523 body states verify:visual was not run' : 'PR #523 body does not say' }
    },
  },
  {
    id: 'S6',
    title: 'No gate runs on Android',
    evidence: ['.github/workflows/verify-*.yml'],
    gate: 'none exists (an Android smoke test on the preview APK)',
    detail: 'A structural gap: no miss rate, since nothing is there to miss.',
    confirm: (_rows, facts) => ({
      status: facts.verifyMentionsAndroid ? 'unconfirmed' : 'confirmed',
      note: facts.verifyMentionsAndroid ? 'a verify-* workflow mentions Android' : 'no verify-* workflow mentions Android',
    }),
  },
])

/**
 * Each seed with its confirmation against this run's evidence.
 *
 * @param {object[]} rows the ledger rows.
 * @param {{ commits: Record<string, { files: string[] }|null>, prBodies: Record<number, string>, verifyMentionsAndroid: boolean }} facts git and GitHub facts the seeds read.
 * @returns {{ id: string, title: string, evidence: string[], gate: string, detail: string, status: string, note: string }[]} one per seed.
 */
export function evaluateSeeds(rows, facts) {
  return SEEDS.map(({ confirm, ...seed }) => ({ ...seed, ...confirm(rows, facts) }))
}

/** Markers that bound the ledger's section in `latest.md`, so later phases own their own. */
export const SECTION_START = '<!-- eval:ledger:start -->'
export const SECTION_END = '<!-- eval:ledger:end -->'

/**
 * Totals over the ledger rows.
 *
 * @param {object[]} rows the ledger rows.
 * @returns {{ prs: number, mergedBeforeChecks: number, noVerifyRan: number, withUncovered: number, expectedNotRun: number, withFollowUps: number, antagonistReviewed: number, mergedOnNotPass: number, shadowReviewed: number, mergedOnReviewNotPass: number }} counts.
 */
export function summarize(rows) {
  return {
    prs: rows.length,
    mergedBeforeChecks: rows.filter((r) => r.ran.some((c) => c.finishedAfterMerge)).length,
    noVerifyRan: rows.filter((r) => !r.ran.some((c) => /(^|\/)verify-/.test(c.path ?? c.name))).length,
    withUncovered: rows.filter((r) => r.uncovered.length > 0).length,
    expectedNotRun: rows.filter((r) => r.expectedNotRun.length > 0).length,
    withFollowUps: rows.filter((r) => r.followUps.length > 0).length,
    antagonistReviewed: rows.filter((r) => r.antagonist.verdict !== 'none').length,
    mergedOnNotPass: rows.filter((r) => r.antagonist.mergedOnNotPass).length,
    shadowReviewed: rows.filter((r) => (r.review?.verdict ?? 'none') !== 'none').length,
    mergedOnReviewNotPass: rows.filter((r) => r.review?.mergedOnNotPass).length,
  }
}

const short = (sha) => (sha ?? '').slice(0, 8)
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')

/**
 * The ledger section of `docs/reports/eval/latest.md`, markers included.
 *
 * @param {{ stamp: { commit: string, date: string }, window: { from: string, to: string }, rows: object[], seeds: object[] }} ledger the full ledger.
 * @returns {string} markdown.
 */
export function renderLedgerSection(ledger) {
  const { stamp, window, rows, seeds } = ledger
  const s = summarize(rows)
  const out = [SECTION_START, '', '## Escape ledger (EV1a)', '']
  out.push(`Window: \`loop:pr\` PRs merged ${window.from} to ${window.to}. Stamp: commit \`${stamp.commit}\` (${stamp.date}). Regenerate with \`node scripts/eval/escape-ledger.mjs\`; the data is \`docs/reports/eval/ledger.json\`.`, '')
  out.push('| Count | Value |', '|---|---|')
  out.push(`| PRs in the window | ${s.prs} |`)
  out.push(`| Merged before a check on the final head finished | ${s.mergedBeforeChecks} |`)
  out.push(`| No \`verify-*\` workflow ran on the final head | ${s.noVerifyRan} |`)
  out.push(`| Changed code no \`verify-*\` filter covers | ${s.withUncovered} |`)
  out.push(`| A triggered \`verify-*\` workflow absent on the final head | ${s.expectedNotRun} |`)
  out.push(`| A fix or revert touched the same code within ${FOLLOW_UP_DAYS} days | ${s.withFollowUps} |`)
  out.push(`| Antagonist verdict on record at merge | ${s.antagonistReviewed} |`)
  out.push(`| Merged on an antagonist "not a pass" | ${s.mergedOnNotPass} |`)
  out.push(`| Shadow review (\`pr-review\`) verdict on record at merge | ${s.shadowReviewed} |`)
  out.push(`| Merged on a shadow review "not-pass" | ${s.mergedOnReviewNotPass} |`, '')
  out.push('### Seeded escapes', '')
  out.push('| ID | Escape | Evidence | Gate that should have caught it | Status |', '|---|---|---|---|---|')
  for (const e of seeds) out.push(`| ${e.id} | ${cell(e.title)} | ${cell(e.evidence.join('; '))} | ${cell(e.gate)} | ${e.status}: ${cell(e.note)} |`)
  out.push('', '### Every PR in the window', '')
  out.push(`A follow-up is a fix or revert landing on \`main\` within ${FOLLOW_UP_DAYS} days that touched one of the PR's non-bookkeeping files. A shared file names a candidate, not a cause. "After merge" means the check finished after the PR merged, so the merge did not wait for it.`, '')
  out.push('| PR | Merged | Head | Ran on the final head | `verify-*` skipped | Uncovered code | Follow-ups (7d) | Antagonist | Review |', '|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) {
    const ran = r.ran.map((c) => `${c.name} ${c.conclusion}${c.finishedAfterMerge ? ' (after merge)' : ''}`).join('; ') || 'nothing'
    const missing = r.expectedNotRun.length ? `; expected, absent: ${r.expectedNotRun.join(', ')}` : ''
    const skipped = r.skipped.map((f) => f.replace(/\.yml$/, '')).join(', ') || 'none'
    const uncovered = r.uncovered.length ? `${r.uncovered.length}: ${r.uncovered.slice(0, 3).join(', ')}${r.uncovered.length > 3 ? ', ...' : ''}` : 'none'
    const fu = r.followUps.map((f) => `${short(f.sha)} ${f.subject}`).join('; ') || 'none'
    const ant = r.antagonist.verdict + (r.antagonist.mergedOnNotPass ? ' (merged anyway)' : '')
    const rv = r.review && r.review.verdict !== 'none'
      ? `${r.review.verdict}, ${r.review.medPlus} MED+${r.review.mergedOnNotPass ? ' (merged anyway)' : ''}`
      : 'none'
    out.push(`| #${r.number} ${cell(r.title)} | ${r.mergedAt.slice(0, 16)}Z | ${short(r.head)} | ${cell(ran + missing)} | ${skipped} | ${cell(uncovered)} | ${cell(fu)} | ${ant} | ${rv} |`)
  }
  out.push('', SECTION_END)
  return out.join('\n')
}

/**
 * The report with the ledger section replaced, or a new report around it.
 *
 * @param {string|null} existing the current `latest.md`, or null.
 * @param {string} section the rendered section, markers included.
 * @param {{ commit: string, date: string }} stamp the run's commit stamp.
 * @returns {string} the whole file.
 */
export function spliceReport(existing, section, stamp) {
  const header = [
    '# Loop eval: how well the loop judges its own work',
    '',
    `> Ledger stamp: commit \`${stamp.commit}\` (${stamp.date})`,
    '',
    'A measurement, not a gate (phase EV1, `plan/README.md`). Each section is written by its own script between its markers.',
    '',
  ].join('\n')
  if (!existing) return `${header}\n${section}\n`
  const withStamp = existing.replace(/^> Ledger stamp: .*$/m, `> Ledger stamp: commit \`${stamp.commit}\` (${stamp.date})`)
  const a = withStamp.indexOf(SECTION_START)
  const b = withStamp.indexOf(SECTION_END)
  if (a < 0 || b < a) return `${withStamp.trimEnd()}\n\n${section}\n`
  return withStamp.slice(0, a) + section + withStamp.slice(b + SECTION_END.length)
}
