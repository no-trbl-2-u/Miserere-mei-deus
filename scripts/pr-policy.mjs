// The review pipeline's shared policy: which PRs are plans, which labels hold,
// which files are the pipeline itself, whose verdicts count. `pr-merge.mjs`
// and `pr-review.mjs` both read it; neither imports the other for it. They
// used to: `pr-review.mjs fix-wanted` dynamically imported `pr-merge.mjs`,
// which statically imports `pr-review.mjs`, and under the CLI's top-level
// `await main()` that cycle never settled (Node exit 13 on PR #679's
// `fix-wanted` job, which made GitHub call every PR UNSTABLE).

/** Labels that mark a PR as a plan, never merged by the job. */
export const PLAN_LABELS = Object.freeze(['plot', 'review:plan-only'])

/** A title that names a plan PR. */
export const PLAN_TITLE = /^(plot|plan)\s*[:(]/i

/** Labels that hold a PR for T or the loop. */
export const HOLD_LABELS = Object.freeze(['review:needs-T', 'loop:pr-stuck', 'eval:seed', 'no-auto-merge'])

/**
 * Files that are the review pipeline itself. A PR that changes them is
 * reviewed by main's copy but, once merged, becomes the new rule, so it
 * never merges itself: T merges it (T, 2026-10-20).
 */
export const PIPELINE_PATHS = Object.freeze([
  '.github/workflows/pr-review.yml', '.github/workflows/_claude-skill.yml', '.github/workflows/pr-autofix.yml', '.github/workflows/pr-resolve.yml',
  'scripts/pr-merge.mjs', 'scripts/pr-review.mjs', 'scripts/pr-partition.mjs', 'scripts/pr-risk.mjs', 'scripts/pr-gate.mjs', 'scripts/pr-acceptance.mjs', 'scripts/pr-resolve.mjs',
  'scripts/pr-policy.mjs',
  'skills/review.md', 'skills/review-fix.md', 'skills/fix-ci.md',
])

/**
 * Accounts whose verdict comments the job trusts: the repository owner
 * (the reviewer posts with GH_PAT, T's token) and the Actions identities
 * it falls back to. The repo is public, so any other account can post the
 * exact markers; those are never read. Override with TRUSTED_VERDICT_AUTHORS
 * (comma-separated) when the token changes hands.
 */
export const TRUSTED_AUTHORS = Object.freeze(['no-trbl-2-u', 'claude[bot]', 'github-actions[bot]'])

/** The marker the job's own comment carries, so the pass reason and the ledger can count its merges. */
export const AUTO_MARKER = '<!-- pr-merge:auto -->'

/**
 * GitHub merge states the job merges from. `CLEAN` is every check green;
 * `UNSTABLE` is a non-required check red or cancelled (a path-filtered
 * `verify-*` that was superseded, or this workflow's own later job). The
 * ruleset requires only `verify-gate`, which `mergeWanted` checks on the
 * head itself, and `gh pr merge --auto` leaves GitHub the last word.
 */
export const MERGEABLE_STATES = Object.freeze(['CLEAN', 'UNSTABLE'])
