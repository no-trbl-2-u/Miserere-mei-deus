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
//   node scripts/pr-merge.mjs decide --pr <n> --head <sha> --since <ISO>   # writes go, reason to $GITHUB_OUTPUT
//   node scripts/pr-merge.mjs audit --pr <n> --head <sha> --run <id>        # prints the audit comment the job posts
//   node scripts/pr-merge.mjs since --run <id>                               # writes since=<ISO> (this run's review start) to $GITHUB_OUTPUT
//
// Holds, each a tested line of `mergeWanted`:
//   - the kill switch: repository variable PR_AUTO_MERGE=off, or the label `no-auto-merge`
//   - a plan PR: label `plot` or `review:plan-only`, or a title that starts `plot:` or `plan:`
//   - a PR that waits on T or the loop: `review:needs-T`, `loop:pr-stuck`, `eval:seed`, a draft, a fork
//   - the head moved since the review (the PR's live head is not the one this run was given), or
//     the verdict is `not-pass`, or there is none for this run
//   - GitHub says the PR is not mergeable (`mergeStateStatus` other than CLEAN)
//   - the daily cap (`DAILY_CAP` merges by this job in 24 hours, counted by the `<!-- pr-merge:auto -->` marker)
//
// `mergeWanted` is pure; only `main` reads GitHub. The merge job checks out
// `main`'s copy of this file, so a PR cannot rewrite the decision that merges it.

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { REVIEW_VERDICT } from './eval/ledger-lib.mjs'
import { markedHeads } from './pr-review.mjs'

/** Labels that mark a PR as a plan, never merged by the job. */
export const PLAN_LABELS = Object.freeze(['plot', 'review:plan-only'])

/** A title that names a plan PR. */
export const PLAN_TITLE = /^(plot|plan)\s*[:(]/i

/** Labels that hold a PR for T or the loop. */
export const HOLD_LABELS = Object.freeze(['review:needs-T', 'loop:pr-stuck', 'eval:seed', 'no-auto-merge'])

/** Merges by this job in any 24-hour window; the rest wait for T. */
export const DAILY_CAP = 12

/** The marker the job's own comment carries, so the cap and the ledger can count its merges. */
export const AUTO_MARKER = '<!-- pr-merge:auto -->'

/**
 * The verdict the job trusts for this head and this run: the latest comment
 * that carries the reviewer's verdict marker, the head marker for `head`,
 * and was posted at or after `since`.
 *
 * @param {{ body: string, createdAt: string }[]} comments the PR's comments, any order.
 * @param {string} head the full head SHA the job was given.
 * @param {string} since ISO time this run's review started.
 * @returns {'pass' | 'not-pass' | null} the verdict, or null when no comment qualifies.
 */
export function verdictFor(comments, head, since) {
  const t0 = Date.parse(since)
  const qualifying = comments
    .filter((c) => Number.isFinite(Date.parse(c.createdAt)) && Date.parse(c.createdAt) >= t0)
    .filter((c) => markedHeads(c.body ?? '').some((m) => m.sha === head))
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
 * Whether to merge this PR now.
 *
 * @param {{ state: string, isDraft: boolean, isCrossRepository: boolean, labels: string[], title: string, head: string, liveHead?: string, mergeStateStatus: string, comments: { body: string, createdAt: string }[], since: string, killSwitch?: boolean, mergedToday?: number }} pr the PR's live facts; `head` is the one this run reviewed, `liveHead` the PR's current one.
 * @returns {{ go: boolean, reason: string }} the decision and why.
 */
export function mergeWanted({ state, isDraft, isCrossRepository, labels, title, head, liveHead = head, mergeStateStatus, comments, since, killSwitch = false, mergedToday = 0 }) {
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
  const verdict = verdictFor(comments, head, since)
  if (!verdict) return { go: false, reason: `no verdict for head ${head.slice(0, 8)} posted since ${since}` }
  if (verdict !== 'pass') return { go: false, reason: `verdict ${verdict} on head ${head.slice(0, 8)}` }
  if (mergeStateStatus !== 'CLEAN') return { go: false, reason: `mergeStateStatus ${mergeStateStatus}: GitHub does not call it mergeable` }
  if (mergedToday >= DAILY_CAP) return { go: false, reason: `daily cap: ${mergedToday} auto-merges in 24h` }
  return { go: true, reason: `verdict pass on head ${head.slice(0, 8)}, ${mergeStateStatus}, ${mergedToday} of ${DAILY_CAP} today` }
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
  const view = JSON.parse(gh(['pr', 'view', pr, '--repo', repo, '--json', 'state,isDraft,isCrossRepository,labels,title,headRefOid,mergeStateStatus,comments']))
  const merged = JSON.parse(gh(['pr', 'list', '--repo', repo, '--state', 'merged', '--limit', '50', '--json', 'mergedAt,comments']))
  const facts = {
    state: view.state,
    isDraft: view.isDraft,
    isCrossRepository: view.isCrossRepository,
    labels: view.labels.map((l) => l.name),
    title: view.title,
    head,
    liveHead: view.headRefOid,
    mergeStateStatus: view.mergeStateStatus,
    comments: view.comments.map((c) => ({ body: c.body ?? '', createdAt: c.createdAt })),
    since,
    killSwitch: (process.env.PR_AUTO_MERGE ?? '').toLowerCase() === 'off',
    mergedToday: countAutoMerges(merged, new Date().toISOString()),
  }
  const d = mergeWanted(facts)
  console.log(`pr-merge #${pr}: ${d.go ? 'merge' : 'hold'} (${d.reason})`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `go=${d.go}\nreason=${d.reason.replace(/\n/g, ' ')}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
