#!/usr/bin/env node
// scripts/pr-merge.mjs
//
// Whether the `merge` job in `pr-review.yml` merges a PR (D95, which amends
// D86): every same-repo PR except a plan PR merges once the adversarial
// review is complete and green. The reviewer itself never merges; this
// plain-runner decision runs after the `review` job, in the same workflow
// run, and the merge is `gh pr merge --auto --merge`, so GitHub's own
// ruleset (a required `verify-gate`) is the last word, never a comment
// match. The 2026-10-14 session script merged #529 over a "not a pass"
// because it matched "Antagonist pass" inside that phrase; this reads only
// the reviewer's HTML markers, on a comment that names the exact head it
// merges and was posted after this run's `review` job started.
//
//   node scripts/pr-merge.mjs decide --pr <n> --head <sha> --since <ISO> [--digest <40-hex>]   # writes go, reason to $GITHUB_OUTPUT
//   node scripts/pr-merge.mjs audit --pr <n> --head <sha> --run <id>        # prints the audit comment the job posts
//   node scripts/pr-merge.mjs since --run <id>                               # writes since=<ISO> (this run's review start) to $GITHUB_OUTPUT
//
// Holds, each a tested line of `mergeWanted`:
//   - the kill switch: repository variable PR_AUTO_MERGE=off, or the label `no-auto-merge`
//   - a plot PR: label `plot`, or a title that starts `plot:` (D101; `review:plan-only` and `plan:` merge like any PR)
//   - a pipeline PR: one that changes a file in `PIPELINE_PATHS` (the reviewer, the partition, the merge job)
//   - a PR that waits on T or the loop: `review:needs-T`, `loop:pr-stuck`, `eval:seed`, a draft, a fork
//   - a verdict comment from any account but the reviewer's (`TRUSTED_AUTHORS`): the repo is public
//   - the head moved since the review (the PR's live head is not the one this run was given), or
//     the verdict is `not-pass`, or there is none for this run
//   - `verify-gate` is not green on the head (the head's check runs; the job's own gate, since T is
//     on the ruleset's bypass list and the job merges on T's token)
//   - GitHub says the PR is not mergeable (`mergeStateStatus` other than CLEAN or UNSTABLE; UNSTABLE is a
//     non-required check red or cancelled, and only `verify-gate` is required, checked above)
//
// No hold counts earlier merges: the daily cap went in phase RV4 (T, 2026-10-21). The job's
// merges in the last 24 hours (the `<!-- pr-merge:auto -->` marker, `countAutoMerges`) are still
// named in the pass reason, so a runaway loop shows in the audit trail; the open-PR cap bounds
// what is in flight.
//
// `mergeWanted` is pure; only `main` reads GitHub. The merge job checks out
// `main`'s copy of this file, so a PR cannot rewrite the decision that merges it.

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { REVIEW_VERDICT } from './eval/ledger-lib.mjs'
import { AUTO_MARKER, HOLD_LABELS, MERGEABLE_STATES, PIPELINE_PATHS, PLAN_LABELS, PLAN_TITLE, TRUSTED_AUTHORS } from './pr-policy.mjs'
import { markedHeads } from './pr-review.mjs'

// The policy constants live in `pr-policy.mjs` so `pr-review.mjs` can read
// them without importing this file (which imports it: the cycle deadlocked
// the CLI's top-level await, exit 13). Re-exported here for every reader.
export { AUTO_MARKER, HOLD_LABELS, MERGEABLE_STATES, PIPELINE_PATHS, PLAN_LABELS, PLAN_TITLE, TRUSTED_AUTHORS }

/**
 * The verdict the job trusts for this head and this run: the latest comment
 * that carries the reviewer's verdict marker, the head marker for `head`,
 * and was posted at or after `since`.
 *
 * A verdict also counts for a later head whose diff digest it names: a
 * merge of main (`pr-resolve`) moves the head and leaves the diff alone,
 * and `review-wanted` then reuses the verdict instead of reviewing again.
 * That match ignores `since` (the verdict predates this run by design) and
 * rests on the trusted author plus the digest this run computed itself.
 *
 * @param {{ body: string, createdAt: string, author?: string }[]} comments the PR's comments, any order.
 * @param {string} head the full head SHA the job was given.
 * @param {string} since ISO time this run's review started.
 * @param {readonly string[]} [trusted] the accounts whose verdicts count.
 * @param {string | null} [digest] the head's diff digest, when known.
 * @returns {'pass' | 'not-pass' | null} the verdict, or null when no comment qualifies.
 */
export function verdictFor(comments, head, since, trusted = TRUSTED_AUTHORS, digest = null) {
  const t0 = Date.parse(since)
  const forHead = (c) => Number.isFinite(Date.parse(c.createdAt)) && Date.parse(c.createdAt) >= t0 && markedHeads(c.body ?? '').some((m) => m.sha === head)
  const forDiff = (c) => Boolean(digest) && markedHeads(c.body ?? '').some((m) => m.digest === digest)
  const qualifying = comments
    .filter((c) => trusted.includes(c.author ?? ''))
    .filter((c) => Number.isFinite(Date.parse(c.createdAt)))
    .filter((c) => forHead(c) || forDiff(c))
    .filter((c) => REVIEW_VERDICT.test(c.body ?? ''))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const last = qualifying.at(-1)
  return last ? last.body.match(REVIEW_VERDICT)[1] : null
}

/**
 * When this run's review started: the earliest start of its `review /`
 * jobs, or the run's own start when none is listed. A verdict posted
 * before this is an earlier run's, never this one's.
 *
 * @param {{ name: string, started_at: string | null }[]} jobs the run's jobs, as the Actions API lists them.
 * @param {string} runStartedAt the run's `run_started_at`.
 * @returns {string} an ISO time.
 * @example reviewStartedAt([{ name: 'review / run', started_at: '2026-10-20T10:00:00Z' }], '2026-10-20T09:00:00Z') // '2026-10-20T10:00:00Z'
 */
export function reviewStartedAt(jobs, runStartedAt) {
  const starts = (jobs ?? [])
    .filter((j) => /^review \//.test(j.name ?? '') && j.started_at && Number.isFinite(Date.parse(j.started_at)))
    .map((j) => Date.parse(j.started_at))
  return starts.length ? new Date(Math.min(...starts)).toISOString() : runStartedAt
}

/**
 * Whether `verify-gate` is green on the head, from the commit's check runs:
 * the job's own gate, so the merge never rests on the ruleset alone (T is
 * on the ruleset's bypass list, and the job merges on T's token).
 *
 * @param {{ name: string, conclusion: string | null, headSha?: string }[]} checks the head's check runs.
 * @param {string} head the full head SHA.
 * @returns {boolean} true when the latest `verify-gate` run on this head concluded `success`.
 * @example verifyGateGreen([{ name: 'verify-gate', conclusion: 'success' }], 'abc') // true
 */
export function verifyGateGreen(checks, head) {
  const gates = (checks ?? []).filter((c) => c.name === 'verify-gate' && (c.headSha == null || c.headSha === head))
  return gates.length > 0 && gates.at(-1).conclusion === 'success'
}

/**
 * Whether to merge this PR now.
 *
 * @param {{ state: string, isDraft: boolean, isCrossRepository: boolean, labels: string[], title: string, head: string, liveHead?: string, mergeStateStatus: string, comments: { body: string, createdAt: string }[], since: string, killSwitch?: boolean, mergedToday?: number }} pr the PR's live facts; `head` is the one this run reviewed, `liveHead` the PR's current one.
 * @returns {{ go: boolean, reason: string }} the decision and why.
 */
export function mergeWanted({ state, isDraft, isCrossRepository, labels, title, head, liveHead = head, mergeStateStatus, checks = [], comments, since, digest = null, files = [], killSwitch = false, mergedToday = 0, trusted = TRUSTED_AUTHORS }) {
  if (killSwitch) return { go: false, reason: 'kill switch: PR_AUTO_MERGE is off' }
  if (liveHead !== head) return { go: false, reason: `head moved to ${liveHead.slice(0, 8)}; this run reviewed ${head.slice(0, 8)}` }
  if (labels.includes('no-auto-merge')) return { go: false, reason: 'label no-auto-merge' }
  if (isCrossRepository) return { go: false, reason: 'fork head: never merged by the job' }
  if (state !== 'OPEN') return { go: false, reason: `PR is ${state.toLowerCase()}` }
  if (isDraft) return { go: false, reason: 'draft' }
  const plan = labels.find((l) => PLAN_LABELS.includes(l)) ?? (PLAN_TITLE.test(title ?? '') ? 'title' : null)
  if (plan) return { go: false, reason: `plan PR (${plan === 'title' ? 'title' : `label ${plan}`}): T merges plans by hand` }
  const hold = labels.find((l) => HOLD_LABELS.includes(l))
  if (hold) return { go: false, reason: `label ${hold}` }
  const pipeline = files.find((f) => PIPELINE_PATHS.includes(f))
  if (pipeline) return { go: false, reason: `pipeline PR (changes ${pipeline}): T merges the review pipeline by hand` }
  const verdict = verdictFor(comments, head, since, trusted, digest)
  if (!verdict) return { go: false, reason: `no verdict for head ${head.slice(0, 8)} posted since ${since} by a trusted account` }
  if (verdict !== 'pass') return { go: false, reason: `verdict ${verdict} on head ${head.slice(0, 8)}` }
  if (!verifyGateGreen(checks, head)) return { go: false, reason: `verify-gate is not green on head ${head.slice(0, 8)}` }
  if (!MERGEABLE_STATES.includes(mergeStateStatus)) return { go: false, reason: `mergeStateStatus ${mergeStateStatus}: GitHub does not call it mergeable` }
  return { go: true, reason: `verdict pass on head ${head.slice(0, 8)}, ${mergeStateStatus}, ${mergedToday} auto-merged in 24h` }
}

/**
 * The comment the job posts before it merges: an audit line a reader and
 * the escape ledger can find.
 *
 * @param {{ pr: string | number, head: string, run: string | number }} facts the merge facts.
 * @returns {string} the comment body.
 */
export function auditComment({ pr, head, run }) {
  return [
    `Merge requested by the \`pr-review\` merge job (D95): review verdict \`pass\` on head \`${head}\`, run ${run}; GitHub's ruleset performs the merge.`,
    AUTO_MARKER,
  ].join('\n')
}

/**
 * How many PRs this job merged in the last 24 hours, from the merged PRs'
 * comments.
 *
 * @param {{ mergedAt: string, comments: { body: string }[] }[]} merged recently merged PRs.
 * @param {string} now ISO time.
 * @returns {number} the count.
 * @example countAutoMerges([{ mergedAt: '2026-10-20T01:00:00Z', comments: [{ body: AUTO_MARKER }] }], '2026-10-20T02:00:00Z') // 1
 */
export function countAutoMerges(merged, now) {
  const t0 = Date.parse(now) - 24 * 60 * 60 * 1000
  return merged.filter((p) => Date.parse(p.mergedAt) >= t0 && p.comments.some((c) => (c.body ?? '').includes(AUTO_MARKER))).length
}

// --- I/O ----------------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

function gh(args) {
  return execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

async function main() {
  const [mode] = process.argv.slice(2)
  const pr = arg('--pr')
  const head = arg('--head')
  const since = arg('--since')
  const repo = process.env.GH_REPO || 'no-trbl-2-u/Miserere-mei-deus'
  const ok = /^\d+$/.test(pr ?? '') && /^[0-9a-f]{40}$/.test(head ?? '')
  if (mode === 'audit' && ok && arg('--run')) return console.log(auditComment({ pr, head, run: arg('--run') }))
  if (mode === 'since' && /^\d+$/.test(arg('--run') ?? '')) {
    const run = arg('--run')
    const jobs = JSON.parse(gh(['api', `repos/${repo}/actions/runs/${run}/jobs`])).jobs ?? []
    const runStartedAt = JSON.parse(gh(['api', `repos/${repo}/actions/runs/${run}`])).run_started_at
    const at = reviewStartedAt(jobs, runStartedAt)
    console.log(`pr-merge: review started at ${at}`)
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `since=${at}\n`)
    return
  }
  if (mode !== 'decide' || !ok || !since) {
    console.error('usage: pr-merge.mjs decide --pr <n> --head <40-hex sha> --since <ISO> | audit --pr <n> --head <sha> --run <id> | since --run <id>')
    process.exit(2)
  }
  let view = JSON.parse(gh(['pr', 'view', pr, '--repo', repo, '--json', 'state,isDraft,isCrossRepository,labels,title,headRefOid,mergeStateStatus,comments,files']))
  // GitHub computes mergeability lazily; UNKNOWN right after a push is not an answer.
  for (let i = 0; i < 6 && view.mergeStateStatus === 'UNKNOWN'; i++) {
    await new Promise((r) => setTimeout(r, 20_000))
    view = JSON.parse(gh(['pr', 'view', pr, '--repo', repo, '--json', 'state,isDraft,isCrossRepository,labels,title,headRefOid,mergeStateStatus,comments,files']))
  }
  const merged = JSON.parse(gh(['pr', 'list', '--repo', repo, '--state', 'merged', '--limit', '50', '--json', 'mergedAt,comments']))
  const checkRuns = JSON.parse(gh(['api', `repos/${repo}/commits/${head}/check-runs?per_page=100`])).check_runs ?? []
  const checks = checkRuns
    .sort((a, b) => Date.parse(a.started_at ?? 0) - Date.parse(b.started_at ?? 0))
    .map((c) => ({ name: c.name, conclusion: c.conclusion, headSha: c.head_sha }))
  const facts = {
    state: view.state,
    isDraft: view.isDraft,
    isCrossRepository: view.isCrossRepository,
    labels: view.labels.map((l) => l.name),
    title: view.title,
    head,
    liveHead: view.headRefOid,
    mergeStateStatus: view.mergeStateStatus,
    checks,
    digest: /^[0-9a-f]{40}$/.test(arg('--digest') ?? '') ? arg('--digest') : null,
    files: (view.files ?? []).map((f) => f.path),
    comments: view.comments.map((c) => ({ body: c.body ?? '', createdAt: c.createdAt, author: c.author?.login ?? '' })),
    since,
    killSwitch: (process.env.PR_AUTO_MERGE ?? '').toLowerCase() === 'off',
    mergedToday: countAutoMerges(merged, new Date().toISOString()),
    trusted: (process.env.TRUSTED_VERDICT_AUTHORS ?? '').split(',').map((s) => s.trim()).filter(Boolean).length
      ? process.env.TRUSTED_VERDICT_AUTHORS.split(',').map((s) => s.trim()).filter(Boolean)
      : TRUSTED_AUTHORS,
  }
  const d = mergeWanted(facts)
  console.log(`pr-merge #${pr}: ${d.go ? 'merge' : 'hold'} (${d.reason})`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `go=${d.go}\nreason=${d.reason.replace(/\n/g, ' ')}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
