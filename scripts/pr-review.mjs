#!/usr/bin/env node
// scripts/pr-review.mjs
//
// Whether the reviewer runs on a PR (phase RV1b,
// `plan/phases/phase_RV1_pr_review_pipeline.md` A5; every same-repo PR
// since D95). The `review` job in `pr-review.yml` starts a Claude run only
// when this says go, so the draft rule, the seeded-draft rule and the
// once-per-head rule live in one tested function instead of a workflow `if`.
//
// Why a script and not the event payload: `gh pr create --label ...` fires
// `opened` and one `labeled` event per label, each cancelling the gate run
// before it, so the run that survives may carry any label's event. Reading
// the PR's live state makes every surviving run decide the same way. The
// head marker in the verdict comment stops a second review of a head that
// already has one (the reviewer's own label raise fires `labeled` again).
//
// The marker also carries a digest of the PR's diff against its base
// (phase RV2, `plan/phases/phase_RV2_review_skips_unchanged_diff.md`), so a
// merge of `main`, a rebase or a content-free force-push is a new SHA with
// the same digest and is not reviewed twice. A conflict resolution changes
// the diff, so it still reviews. The digest comes from `gh pr diff` piped
// into `git patch-id --stable`, which needs no repository: the
// `review-wanted` job stays a sparse depth-1 checkout. No digest falls back
// to the SHA rule; it never skips a review.
//
//   node scripts/pr-review.mjs wanted --pr <n> [--dispatch]   # writes go, pr, head, digest to $GITHUB_OUTPUT
//   node scripts/pr-review.mjs parent-tests --pr <n>           # the Tests lens's parent replay (RV1c)
//
// `parent-tests` runs each test file the PR adds or changes at the PR's
// head (the control) and then at its merge base with `main`, the PR's
// version of the file laid over (the EV1b method, `scripts/eval/
// parent-replay.mjs`). A file that passes on the base could not fail on
// the change. It runs in a detached worktree under the system temp dir,
// so the reviewer needs no `git worktree` or `git checkout` grant of its
// own, and prints one line per file.
//
// `reviewWanted` and `formatParentTests` are pure; only `main` reads GitHub.

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { newTitles, runnerFor, verdictFor } from './eval/parent-replay-lib.mjs'
import { checkout, closeWorktree, git, openWorktree, runTests } from './eval/worktree.mjs'

/**
 * Labels the reviewer ran on through phase RV2. Since D95 (2026-10-20) every
 * same-repo PR is reviewed, so these are the labels the merge job and the
 * ledger still name, not a filter: `reviewWanted` reads them only to
 * phrase its reason.
 */
export const REVIEW_LABELS = Object.freeze(['loop:pr', 'plot'])

/**
 * Verdicts per PR on `pull_request` before the reviewer stops and leaves the
 * PR to T (T, 2026-10-20). The first pass merges or holds; a HIGH fixed and
 * pushed earns the second; after that the PR is labelled
 * `review:exhausted` and only a dispatch reviews it again.
 */
export const MAX_PASSES = 2

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
 * @param {{ state: string, isDraft: boolean, isCrossRepository: boolean, labels: string[], head: string, digest?: string | null, comments: string[], dispatch?: boolean }} pr the PR's live facts; `comments` are bodies, `digest` is the head's `diffDigest` (null when unavailable).
 * @returns {{ go: boolean, reason: string, exhausted?: boolean }} the decision and why; `exhausted` when the pass cap stopped it.
 * @example reviewWanted({ state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr'], head: 'a', comments: [] }).go // true
 */
export function reviewWanted({ state, isDraft, isCrossRepository, labels, head, digest = null, comments, dispatch = false }) {
  if (isCrossRepository) return { go: false, reason: 'fork head: the reviewer never runs on one' }
  if (state !== 'OPEN') return { go: false, reason: `PR is ${state.toLowerCase()}` }
  if (dispatch) return { go: true, reason: 'dispatched' }
  const seed = labels.find((l) => DISPATCH_ONLY_LABELS.includes(l))
  if (seed) return { go: false, reason: `${seed}: reviewed by dispatch only` }
  if (isDraft) return { go: false, reason: 'draft' }
  const marked = comments.flatMap(markedHeads)
  if (marked.some((m) => m.sha === head)) return { go: false, reason: `head ${head.slice(0, 8)} already has a verdict` }
  const passes = comments.filter((c) => VERDICT.test(c)).length
  if (passes >= MAX_PASSES) return { go: false, exhausted: true, reason: `${passes} verdicts already: the cap is ${MAX_PASSES} passes, T reviews from here (${EXHAUSTED_LABEL})` }
  if (!digest) return { go: true, reason: `review head ${head.slice(0, 8)} (diff digest unavailable: SHA rule only)` }
  const same = marked.find((m) => m.digest === digest)
  if (same) return { go: false, reason: `diff ${digest.slice(0, 8)} already has a verdict (head ${same.sha.slice(0, 8)}); head ${head.slice(0, 8)} changes nothing in it` }
  return { go: true, reason: `review head ${head.slice(0, 8)} (diff ${digest.slice(0, 8)})` }
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

function parentTests(pr) {
  const ref = `refs/remotes/origin/pr-review-${pr}`
  git(['fetch', '--quiet', '--no-tags', 'origin', '+main:refs/remotes/origin/main', `+pull/${pr}/head:${ref}`])
  const head = git(['rev-parse', ref])
  const base = git(['merge-base', 'refs/remotes/origin/main', head])
  const show = (sha, path) => {
    try {
      return git(['show', `${sha}:${path}`])
    } catch {
      return null
    }
  }
  const tests = git(['diff', '--name-only', '--diff-filter=AM', base, head]).split('\n').filter((f) => f && runnerFor(f))
  const files = []
  if (tests.length) {
    const dir = openWorktree('pr-review-parent-')
    try {
      checkout(dir, head)
      const control = runTests(dir, tests)
      checkout(dir, base)
      git(['checkout', head, '--', ...tests], dir)
      const onBase = runTests(dir, tests)
      for (const path of tests) {
        files.push({ path, ...verdictFor(control[path] ?? null, onBase[path] ?? null, newTitles(show(head, path) ?? '', show(base, path))) })
      }
    } finally {
      closeWorktree(dir)
    }
  }
  console.log(formatParentTests(files))
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
  if (!['wanted', 'parent-tests'].includes(mode) || !/^\d+$/.test(pr ?? '')) {
    console.error('usage: pr-review.mjs wanted --pr <n> [--dispatch] | parent-tests --pr <n>')
    process.exit(2)
  }
  if (mode === 'parent-tests') return parentTests(pr)
  const view = JSON.parse(execFileSync('gh', ['pr', 'view', pr, '--repo', repo,
    '--json', 'state,isDraft,isCrossRepository,labels,headRefOid,comments'], { cwd: ROOT, encoding: 'utf8' }))
  const facts = {
    state: view.state,
    isDraft: view.isDraft,
    isCrossRepository: view.isCrossRepository,
    labels: view.labels.map((l) => l.name),
    head: view.headRefOid,
    digest: prDigest(pr, repo),
    comments: view.comments.map((c) => c.body ?? ''),
    dispatch: process.argv.includes('--dispatch'),
  }
  const d = reviewWanted(facts)
  console.log(`pr-review #${pr}: ${d.go ? 'go' : 'skip'} (${d.reason})`)
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `go=${d.go}\npr=${pr}\nhead=${facts.head}\ndigest=${facts.digest ?? ''}\nexhausted=${Boolean(d.exhausted)}\n`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
