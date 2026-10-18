#!/usr/bin/env node
// scripts/pr-review.mjs
//
// Whether the shadow reviewer runs on a PR (phase RV1b,
// `plan/phases/phase_RV1_pr_review_pipeline.md` A5). The `review` job in
// `pr-review.yml` starts a Claude run only when this says go, so the label
// filter, the draft rule and the once-per-head rule live in one tested
// function instead of a workflow `if`.
//
// Why a script and not the event payload: `gh pr create --label ...` fires
// `opened` and one `labeled` event per label, each cancelling the gate run
// before it, so the run that survives may carry any label's event. Reading
// the PR's live state makes every surviving run decide the same way. The
// head marker in the verdict comment stops a second review of a head that
// already has one (the reviewer's own label raise fires `labeled` again).
//
//   node scripts/pr-review.mjs wanted --pr <n> [--dispatch]   # writes go, pr, head to $GITHUB_OUTPUT
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

/** Labels that put a PR in front of the reviewer on `pull_request`. */
export const REVIEW_LABELS = Object.freeze(['loop:pr', 'plot'])

/** A dispatched review also takes the seeded drafts phase RV1c opens. */
export const DISPATCH_LABELS = Object.freeze([...REVIEW_LABELS, 'eval:seed'])

/**
 * The marker a verdict comment carries for the head it reviewed.
 *
 * @param {string} sha the full head SHA.
 * @returns {string} the HTML comment.
 * @example headMarker('abc') // '<!-- pr-review:head abc -->'
 */
export function headMarker(sha) {
  return `<!-- pr-review:head ${sha} -->`
}

/**
 * Whether to review this PR now.
 *
 * @param {{ state: string, isDraft: boolean, isCrossRepository: boolean, labels: string[], head: string, comments: string[], dispatch?: boolean }} pr the PR's live facts; `comments` are bodies.
 * @returns {{ go: boolean, reason: string }} the decision and why.
 * @example reviewWanted({ state: 'OPEN', isDraft: false, isCrossRepository: false, labels: ['loop:pr'], head: 'a', comments: [] }).go // true
 */
export function reviewWanted({ state, isDraft, isCrossRepository, labels, head, comments, dispatch = false }) {
  if (isCrossRepository) return { go: false, reason: 'fork head: the reviewer never runs on one' }
  if (state !== 'OPEN') return { go: false, reason: `PR is ${state.toLowerCase()}` }
  const allowed = dispatch ? DISPATCH_LABELS : REVIEW_LABELS
  if (!labels.some((l) => allowed.includes(l))) return { go: false, reason: `no ${allowed.join(' / ')} label` }
  if (dispatch) return { go: true, reason: 'dispatched' }
  if (isDraft) return { go: false, reason: 'draft' }
  if (comments.some((b) => b.includes(headMarker(head)))) return { go: false, reason: `head ${head.slice(0, 8)} already has a verdict` }
  return { go: true, reason: `review head ${head.slice(0, 8)}` }
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
    comments: view.comments.map((c) => c.body ?? ''),
    dispatch: process.argv.includes('--dispatch'),
  }
  const d = reviewWanted(facts)
  console.log(`pr-review #${pr}: ${d.go ? 'go' : 'skip'} (${d.reason})`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `go=${d.go}\npr=${pr}\nhead=${facts.head}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
