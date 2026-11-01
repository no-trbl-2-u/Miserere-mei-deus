#!/usr/bin/env node
// scripts/pr-review.mjs
//
// Whether the reviewer runs on a PR (phase RV1b,
// `plan/README.md` A5; every same-repo PR
// since D95). The `review` job in `pr-review.yml` starts a Claude run only
// when this says go, so the draft rule, the seeded-draft rule, the plan
// rule and the once-per-head rule live in one tested function instead of a
// workflow `if`. A plot PR (label `plot`, or a `plot:` title) is never
// reviewed on `pull_request`: T reads plots, the merge job never merges
// them (T, 2026-10-21). Since D101 (T, 2026-10-23) that is the only plan
// PR: a `review:plan-only` PR or a `plan:` title is reviewed and merged like
// any other. A dispatch still reviews a plot on demand.
//
// Why a script and not the event payload: `gh pr create --label ...` fires
// `opened` and one `labeled` event per label, each cancelling the gate run
// before it, so the run that survives may carry any label's event. Reading
// the PR's live state makes every surviving run decide the same way. The
// head marker in the verdict comment stops a second review of a head that
// already has one (the reviewer's own label raise fires `labeled` again).
//
// The marker also carries a digest of the PR's diff against its base
// (phase RV2, `plan/README.md`), so a
// merge of `main`, a rebase or a content-free force-push is a new SHA with
// the same digest and is not reviewed twice. A conflict resolution changes
// the diff, so it still reviews. The digest comes from `gh pr diff` piped
// into `git patch-id --stable`, which needs no repository: the
// `review-wanted` job stays a sparse depth-1 checkout. No digest falls back
// to the SHA rule; it never skips a review.
//
//   node scripts/pr-review.mjs wanted --pr <n> [--dispatch]   # writes go, pr, head, digest to $GITHUB_OUTPUT
//   node scripts/pr-review.mjs parent-tests --pr <n>           # the Tests lens's parent replay (RV1c)
//   node scripts/pr-review.mjs parent-tests --pr <n> --gate [--head <sha>] [--list]   # the verify-gate step (LG1d)
//   node scripts/pr-review.mjs fix-wanted --pr <n>             # writes go, branch, head to $GITHUB_OUTPUT (the fixer, D95)
//
// `parent-tests` runs each test file the PR adds or changes at the PR's
// head (the control) and then at its merge base with `main`, the PR's
// version of the file laid over (the EV1b method, `scripts/eval/
// parent-replay.mjs`). A file that passes on the base could not fail on
// the change. It runs in a detached worktree under the system temp dir,
// so the reviewer needs no `git worktree` or `git checkout` grant of its
// own, and prints one line per file.
//
// With `--gate` it is a step of the `verify-gate` check (phase LG1d,
// `plan/README.md` A4): it replays only the test
// files the PR adds and fails when one passes on the base, unless the file
// carries a `guard-test: <reason>` comment (a guard pins behaviour that
// already holds, so it passes on the base by design). A file that fails at
// its own head is inconclusive and listed, not judged: the owning
// `verify-*` already fails on it. `--list` only counts the added test
// files, so the workflow installs dependencies only when there is one.
//
// `reviewWanted`, `formatParentTests`, `guardReason`, `decideParentGate`
// and `describeParentGate` are pure; only `main` reads GitHub.

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { newTitles, runnerFor, verdictFor } from './eval/parent-replay-lib.mjs'
import { checkout, closeWorktree, git, openWorktree, runTests } from './eval/worktree.mjs'
import { HOLD_LABELS, PIPELINE_PATHS, PLAN_LABELS, PLAN_TITLE, TRUSTED_AUTHORS } from './pr-policy.mjs'

/**
 * Labels the reviewer ran on through phase RV2. Since D95 (2026-10-20) every
 * same-repo PR is reviewed, so these are the labels the merge job and the
 * ledger still name, not a filter: `reviewWanted` reads them only to
 * phrase its reason.
 */
export const REVIEW_LABELS = Object.freeze(['loop:pr', 'plot'])

/**
 * Not-pass verdicts per PR on `pull_request` before the reviewer stops and
 * leaves the PR to T (T, 2026-10-20). The first pass merges or holds; a HIGH
 * fixed and pushed earns the second; a second not-pass labels the PR
 * `review:exhausted` and only a dispatch reviews it again. Only D95
 * verdicts (with the readers marker) count, so a PR's older history never
 * exhausts it.
 */
export const MAX_PASSES = 2

/** The marker the fixer's commit body carries; one attempt per PR. */
export const FIX_ATTEMPT_MARKER = '<!-- pr-review-fix:attempt -->'

/** The label the workflow applies when the cap is reached. */
export const EXHAUSTED_LABEL = 'review:exhausted'

/** Seeded drafts (phase RV1c) are reviewed only by dispatch, never on `pull_request`. */
export const DISPATCH_ONLY_LABELS = Object.freeze(['eval:seed'])

/** A dispatched review takes everything `pull_request` does plus the seeded drafts. */
export const DISPATCH_LABELS = Object.freeze([...REVIEW_LABELS, ...DISPATCH_ONLY_LABELS])

/**
 * The marker a verdict comment carries for the head it reviewed.
 *
 * @param {string} sha the full head SHA.
 * @param {string | null} [digest] the head's diff digest; omitted, the old SHA-only shape.
 * @returns {string} the HTML comment, one line.
 * @example headMarker('abc', 'f00') // '<!-- pr-review:head abc diff f00 -->'
 */
export function headMarker(sha, digest = null) {
  return digest ? `<!-- pr-review:head ${sha} diff ${digest} -->` : `<!-- pr-review:head ${sha} -->`
}

const MARKER = /<!-- pr-review:head ([0-9a-f]+)(?: diff ([0-9a-f]+))? -->/g
const VERDICT = /<!--\s*pr-review:verdict (pass|not-pass)\s*-->/
/** A D95 verdict (the partitioned reviewer) carries the readers marker; older verdicts never count toward the cap. */
const STRIKE = /<!--\s*pr-review:verdict not-pass\s*-->[\s\S]*<!-- pr-review:readers /

/**
 * Every head marker in a comment body, old shape and new.
 *
 * @param {string} body a comment body.
 * @returns {Array<{ sha: string, digest: string | null }>} one entry per marker.
 * @example markedHeads('<!-- pr-review:head abc -->') // [{ sha: 'abc', digest: null }]
 */
export function markedHeads(body) {
  return [...body.matchAll(MARKER)].map((m) => ({ sha: m[1], digest: m[2] ?? null }))
}

/**
 * The stable identity of a unified diff: `git patch-id --stable` on stdin.
 * Hunk line numbers and file order do not change it; any edited line does.
 *
 * @param {string} patch a unified diff, as `gh pr diff` prints it.
 * @returns {string | null} the 40-hex digest, or null for an empty diff or a failed run.
 * @example diffDigest('') // null
 */
export function diffDigest(patch) {
  if (!patch || !patch.trim()) return null
  try {
    const out = execFileSync('git', ['patch-id', '--stable'], { input: patch, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    return /^([0-9a-f]{40})\b/.exec(out)?.[1] ?? null
  } catch {
    return null
  }
}

/**
 * Whether to review this PR now.
 *
 * @param {{ state: string, isDraft: boolean, isCrossRepository: boolean, labels: string[], title?: string, head: string, digest?: string | null, comments: string[], dispatch?: boolean }} pr the PR's live facts; `comments` are bodies, `digest` is the head's `diffDigest` (null when unavailable).
 * @returns {{ go: boolean, reason: string, exhausted?: boolean, reuse?: boolean }} the decision and why; `exhausted` when the pass cap stopped it; `reuse` when an earlier verdict on the same diff stands for this head (the merge job reads it).
 * @example reviewWanted({ state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr'], head: 'a', comments: [] }).go // true
 */
export function reviewWanted({ state, isDraft, isCrossRepository, labels, title = '', head, digest = null, comments, dispatch = false }) {
  if (isCrossRepository) return { go: false, reason: 'fork head: the reviewer never runs on one' }
  if (state !== 'OPEN') return { go: false, reason: `PR is ${state.toLowerCase()}` }
  if (dispatch) return { go: true, reason: 'dispatched' }
  const plan = labels.find((l) => PLAN_LABELS.includes(l)) ?? (PLAN_TITLE.test(title ?? '') ? 'title' : null)
  if (plan) return { go: false, reason: `plan PR (${plan}): T reads plans, the reviewer does not` }
  const seed = labels.find((l) => DISPATCH_ONLY_LABELS.includes(l))
  if (seed) return { go: false, reason: `${seed}: reviewed by dispatch only` }
  if (isDraft) return { go: false, reason: 'draft' }
  const marked = comments.flatMap(markedHeads)
  if (marked.some((m) => m.sha === head)) return { go: false, reason: `head ${head.slice(0, 8)} already has a verdict` }
  if (digest) {
    const same = marked.find((m) => m.digest === digest)
    if (same) return { go: false, reuse: true, reason: `diff ${digest.slice(0, 8)} already has a verdict (head ${same.sha.slice(0, 8)}); head ${head.slice(0, 8)} changes nothing in it, so that verdict stands` }
  }
  const strikes = comments.filter((c) => STRIKE.test(c)).length
  if (strikes >= MAX_PASSES) return { go: false, exhausted: true, reason: `${strikes} not-pass verdicts already: the cap is ${MAX_PASSES} passes, T reviews from here (${EXHAUSTED_LABEL})` }
  if (!digest) return { go: true, reason: `review head ${head.slice(0, 8)} (diff digest unavailable: SHA rule only)` }
  return { go: true, reason: `review head ${head.slice(0, 8)} (diff ${digest.slice(0, 8)})` }
}

/**
 * Whether the fixer runs on this PR now: the latest trusted verdict for
 * the head is `not-pass`, the PR is one the merge job would merge on a
 * pass (open, not a draft, not a fork, not a plan, not the pipeline, no
 * hold label), and no fix attempt is on the PR yet.
 *
 * @param {{ state: string, isDraft: boolean, isCrossRepository: boolean, labels: string[], title: string, files: string[], head: string, comments: { body: string, author?: string }[], commitMessages?: string[], trusted?: readonly string[], planLabels?: readonly string[], holdLabels?: readonly string[], pipelinePaths?: readonly string[], planTitle?: RegExp }} pr the PR's live facts.
 * @returns {{ go: boolean, reason: string }} the decision and why.
 */
export function fixWanted({ state, isDraft, isCrossRepository, labels, title, files = [], head, comments, commitMessages = [], trusted = [], planLabels = [], holdLabels = [], pipelinePaths = [], planTitle = /^(plot|plan)\s*[:(]/i }) {
  if (isCrossRepository) return { go: false, reason: 'fork head' }
  if (state !== 'OPEN') return { go: false, reason: `PR is ${state.toLowerCase()}` }
  if (isDraft) return { go: false, reason: 'draft' }
  const plan = labels.find((l) => planLabels.includes(l)) ?? (planTitle.test(title ?? '') ? 'title' : null)
  if (plan) return { go: false, reason: 'plan PR: T reads plans' }
  const hold = labels.find((l) => holdLabels.includes(l))
  if (hold) return { go: false, reason: `label ${hold}` }
  const pipeline = files.find((f) => pipelinePaths.includes(f))
  if (pipeline) return { go: false, reason: `pipeline PR (${pipeline}): T fixes the pipeline` }
  if ([...comments.map((c) => c.body ?? ''), ...commitMessages].some((t) => t.includes(FIX_ATTEMPT_MARKER))) return { go: false, reason: 'a fix attempt is already on the PR' }
  const last = comments
    .filter((c) => trusted.includes(c.author ?? '') && VERDICT.test(c.body ?? '') && markedHeads(c.body ?? '').some((m) => m.sha === head))
    .at(-1)
  if (!last) return { go: false, reason: `no trusted verdict for head ${head.slice(0, 8)}` }
  const verdict = last.body.match(VERDICT)[1]
  if (verdict !== 'not-pass') return { go: false, reason: `verdict ${verdict}: nothing to fix` }
  return { go: true, reason: `verdict not-pass on head ${head.slice(0, 8)}, no attempt yet` }
}

/**
 * The `parent-tests` report, one line per replayed test file.
 *
 * @param {Array<{ path: string, verdict: string, reason: string, couldNotFailCases: string[], newCases: number }>} files from `verdictFor`.
 * @returns {string} the report.
 * @example formatParentTests([]) // 'parent-tests: the PR adds or changes no test file'
 */
export function formatParentTests(files) {
  if (files.length === 0) return 'parent-tests: the PR adds or changes no test file'
  const lines = files.map((f) => {
    const cases = f.couldNotFailCases.length ? `; new cases passing on the base: ${f.couldNotFailCases.join('; ')}` : ''
    return `${f.verdict.padEnd(15)} ${f.path} (${f.reason}${cases})`
  })
  const weak = files.filter((f) => f.verdict === 'could-not-fail').length
  return [...lines, `parent-tests: ${weak} of ${files.length} file(s) could not fail on the change`].join('\n')
}

/** A `guard-test:` comment line; the reason is everything after the colon. */
const GUARD = /^\s*(?:\/\/|\/\*+|\*|#)\s*guard-test:\s*(.*?)\s*(?:\*\/)?\s*$/m

/**
 * The reason a test file gives for passing on the base by design.
 *
 * @param {string|null} source the file's text.
 * @returns {string|null} the reason, '' for a bare `guard-test:` with none, null when the file carries no such comment.
 * @example guardReason('// guard-test: pins the old rule\n') // 'pins the old rule'
 */
export function guardReason(source) {
  const m = GUARD.exec(source ?? '')
  return m ? m[1] : null
}

/**
 * The fail-on-parent step's state over the PR's added test files.
 *
 * @param {Array<{ path: string, verdict: string, reason: string, guard: string|null }>} files each added file's `verdictFor` result and its `guardReason`.
 * @returns {{ state: 'green'|'red'|'none', lines: Array<{ path: string, verdict: string, reason: string, guard: string|null, status: 'fails-on-parent'|'guarded'|'could-not-fail'|'inconclusive' }> }} red when an added file passes on the base with no reasoned guard.
 * @example decideParentGate([]).state // 'none'
 */
export function decideParentGate(files) {
  const lines = files.map((f) => {
    const status = f.verdict !== 'could-not-fail' ? f.verdict
      : f.guard ? 'guarded' : 'could-not-fail'
    return { ...f, status }
  })
  if (!lines.length) return { state: 'none', lines }
  return { state: lines.some((l) => l.status === 'could-not-fail') ? 'red' : 'green', lines }
}

/**
 * The summary the gate step prints and writes to the step summary.
 *
 * @param {ReturnType<typeof decideParentGate>} d the decision.
 * @returns {string} markdown.
 */
export function describeParentGate(d) {
  if (d.state === 'none') return 'fail-on-parent: the PR adds no test file (nothing to check)'
  const out = [`fail-on-parent: ${d.state}`]
  for (const l of d.lines) {
    if (l.status === 'fails-on-parent') out.push(`- \`${l.path}\`: fails on the base (${l.reason})`)
    else if (l.status === 'guarded') out.push(`- \`${l.path}\`: passes on the base, a guard by design: ${l.guard}`)
    else if (l.status === 'inconclusive') out.push(`- \`${l.path}\`: not judged (${l.reason})`)
    else {
      const bare = l.guard === '' ? ' Its `guard-test:` comment gives no reason.' : ''
      out.push(`- \`${l.path}\`: passes on the base, so it could not fail on this change.${bare} Make it pin what the PR adds, or add a \`// guard-test: <reason>\` comment if it guards behaviour that already holds.`)
    }
  }
  return out.join('\n')
}

/**
 * Replays test files at `head` (the control) and at `base` with the head's
 * version laid over, in a detached worktree of `repo`.
 *
 * @param {{ repo?: string, base: string, head: string, tests: string[], timeoutMs?: number }} opts the repository, the two commits and the repo-relative test files.
 * @returns {Array<{ path: string, verdict: string, reason: string, couldNotFailCases: string[], newCases: number, guard: string|null }>} one entry per file.
 */
export function replayTests({ repo, base, head, tests, timeoutMs }) {
  // ls-tree first: `git show` of a path the commit lacks prints to stderr.
  const show = (sha, path) => (git(['ls-tree', '--name-only', sha, '--', path], repo) ? git(['show', `${sha}:${path}`], repo) : null)
  if (!tests.length) return []
  const files = []
  const dir = openWorktree('pr-review-parent-', repo)
  try {
    checkout(dir, head)
    const control = runTests(dir, tests, timeoutMs)
    checkout(dir, base)
    git(['checkout', head, '--', ...tests], dir)
    const onBase = runTests(dir, tests, timeoutMs)
    for (const path of tests) {
      const atHead = show(head, path) ?? ''
      files.push({ path, ...verdictFor(control[path] ?? null, onBase[path] ?? null, newTitles(atHead, show(base, path))), guard: guardReason(atHead) })
    }
  } finally {
    closeWorktree(dir, repo)
  }
  return files
}

/**
 * The runnable test files a diff adds (`A`) or adds and changes (`AM`).
 *
 * @param {string} repo the repository.
 * @param {string} base the merge base.
 * @param {string} head the head.
 * @param {string} [filter] git's `--diff-filter`.
 * @returns {string[]} repo-relative paths.
 */
export function changedTests(repo, base, head, filter = 'AM') {
  return git(['diff', '--name-only', `--diff-filter=${filter}`, base, head], repo).split('\n').filter((f) => f && runnerFor(f))
}

// --- I/O ----------------------------------------------------------------------

// The review job runs main's copy of this file from `.review-tooling/scripts/`.
const ROOT = (() => {
  const here = dirname(fileURLToPath(import.meta.url))
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here, encoding: 'utf8' }).trim()
  } catch {
    return resolve(here, '..')
  }
})()

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : fallback
}

/** The gate's per-runner budget: two runs of each runner must fit the job beside the wait. */
const GATE_TIMEOUT_MS = 8 * 60 * 1000

function parentTests(pr) {
  const ref = `refs/remotes/origin/pr-review-${pr}`
  git(['fetch', '--quiet', '--no-tags', 'origin', '+main:refs/remotes/origin/main', `+pull/${pr}/head:${ref}`])
  const gate = process.argv.includes('--gate')
  const head = git(['rev-parse', arg('--head') ?? ref])
  const base = git(['merge-base', 'refs/remotes/origin/main', head])
  const tests = changedTests(ROOT, base, head, gate ? 'A' : 'AM')
  if (!gate) return console.log(formatParentTests(replayTests({ repo: ROOT, base, head, tests })))
  if (process.argv.includes('--list')) {
    console.log(`fail-on-parent: the PR adds ${tests.length} test file(s)${tests.length ? `: ${tests.join(', ')}` : ''}`)
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `count=${tests.length}\n`)
    return
  }
  const d = decideParentGate(replayTests({ repo: ROOT, base, head, tests, timeoutMs: GATE_TIMEOUT_MS }))
  const text = describeParentGate(d)
  console.log(text)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n\n`)
  if (d.state === 'red') process.exitCode = 1
}

function prDigest(pr, repo) {
  try {
    return diffDigest(execFileSync('gh', ['pr', 'diff', pr, '--repo', repo], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }))
  } catch (e) {
    console.error(`pr-review #${pr}: gh pr diff failed, no digest (${String(e.message).split('\n')[0]})`)
    return null
  }
}

async function main() {
  const [mode] = process.argv.slice(2)
  const pr = arg('--pr')
  const repo = process.env.GH_REPO || 'no-trbl-2-u/Miserere-mei-deus'
  if (!['wanted', 'parent-tests', 'fix-wanted'].includes(mode) || !/^\d+$/.test(pr ?? '')) {
    console.error('usage: pr-review.mjs wanted --pr <n> [--dispatch] | parent-tests --pr <n> [--gate [--head <sha>] [--list]] | fix-wanted --pr <n>')
    process.exit(2)
  }
  if (mode === 'parent-tests') return parentTests(pr)
  if (mode === 'fix-wanted') {
    const v = JSON.parse(execFileSync('gh', ['pr', 'view', pr, '--repo', repo,
      '--json', 'state,isDraft,isCrossRepository,labels,title,files,headRefOid,headRefName,comments,commits'], { cwd: ROOT, encoding: 'utf8' }))
    const d = fixWanted({
      state: v.state, isDraft: v.isDraft, isCrossRepository: v.isCrossRepository, labels: v.labels.map((l) => l.name), title: v.title,
      files: (v.files ?? []).map((f) => f.path), head: v.headRefOid,
      comments: v.comments.map((c) => ({ body: c.body ?? '', author: c.author?.login ?? '' })),
      commitMessages: (v.commits ?? []).map((c) => c.messageBody ?? ''),
      trusted: TRUSTED_AUTHORS, planLabels: PLAN_LABELS, holdLabels: HOLD_LABELS, pipelinePaths: PIPELINE_PATHS, planTitle: PLAN_TITLE,
    })
    console.log(`pr-review-fix #${pr}: ${d.go ? 'fix' : 'skip'} (${d.reason})`)
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `go=${d.go}\nbranch=${v.headRefName}\nhead=${v.headRefOid}\n`)
    return
  }
  const view = JSON.parse(execFileSync('gh', ['pr', 'view', pr, '--repo', repo,
    '--json', 'state,isDraft,isCrossRepository,labels,title,headRefOid,comments'], { cwd: ROOT, encoding: 'utf8' }))
  const facts = {
    state: view.state,
    isDraft: view.isDraft,
    isCrossRepository: view.isCrossRepository,
    labels: view.labels.map((l) => l.name),
    title: view.title,
    head: view.headRefOid,
    digest: prDigest(pr, repo),
    comments: view.comments.map((c) => c.body ?? ''),
    dispatch: process.argv.includes('--dispatch'),
  }
  const d = reviewWanted(facts)
  console.log(`pr-review #${pr}: ${d.go ? 'go' : 'skip'} (${d.reason})`)
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `go=${d.go}\npr=${pr}\nhead=${facts.head}\ndigest=${facts.digest ?? ''}\nexhausted=${Boolean(d.exhausted)}\nreuse=${Boolean(d.reuse)}\n`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
