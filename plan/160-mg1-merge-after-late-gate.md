# 160 — A passed review still merges when the verify gate finishes after it

> A `loop:pr` PR whose adversarial review passes before its `verify-gate` turns green is never merged by the loop: the merge decision runs once, right after the review, sees the gate still pending, holds, and nothing runs it again. This spec makes the gate's completion re-run the decision.

## Why

### Sources

- **T, 2026-11-08**, at the end gate of `/pilot 158.1 159`, answering "Loop gap found: when a PR's review passes before its CI finishes, the merge job skips it and nothing re-triggers it (I merged #1463/#1464 by hand). Plot a fix?" with "Yes, /plot it (Recommended)".
- **The evidence (2026-11-08).** PR #1464: review verdict `pass` on head `a02bcc3` at 07:06 UTC while `verify-gate` was still running (it finished green at 07:17). The `merge` job of the 07:17 workflow run was `skipped`. The PR sat CLEAN and unmerged until the orchestrator merged it by hand at 07:26. PR #1463 the same: pass at 07:12, gate green later, merge skipped, merged by hand at 07:27. PRs whose gate was already green when the review finished (#1455, #1456, #1458, #1459, #1466) merged on their own.

### What exists today (read 2026-11-08, at a007de3)

- `.github/workflows/pr-review.yml` runs on `pull_request` (opened, synchronize, reopened, ready_for_review) and `workflow_dispatch`. Its jobs: `judge`, `mutation`, `verify-gate`, `review-wanted`, `review`, `merge`, `fix-wanted`, `fix`.
- The `merge` job runs only when this run's review succeeded or its verdict is reused (`if: always() && ((review-wanted.go && review.success) || review-wanted.reuse)`), and calls `node scripts/pr-merge.mjs decide`.
- `scripts/pr-merge.mjs` `decide` holds with `verify-gate is not green on head <sha>` when the head's latest `verify-gate` run is not `success` (`verifyGateGreen`, ~L119-157). That hold is final for that run. No workflow listens for the gate finishing.
- `verify-gate` itself is a job in the same workflow run that polls the per-area `verify-*` workflows (`triggered … waiting on … red …`), so it can finish long after the review.

## Design

- **Re-run the decision when the gate finishes.** When `verify-gate` concludes `success` on a PR head, and that head already carries this repo's `pr-review:verdict pass` comment for its current head/diff, the merge decision runs again for that PR and head. Everything `decide` already checks stays as it is: labels and holds, plot PRs, the kill switch (`PR_AUTO_MERGE`), CLEAN, the merged-tree check. Only the trigger is new.
- **Smallest mechanism, builder's choice with a reason:** either (a) a final step in the `verify-gate` job that, on success, dispatches the merge decision (for example a `workflow_dispatch` of a small merge-only workflow, or `gh workflow run`), or (b) a separate workflow on `workflow_run` / `check_run` completion of `verify-gate`. It must use the same `scripts/pr-merge.mjs decide` from `main` (never the PR's scripts), the same `GH_PAT` token, and a `pr-merge-<pr>` concurrency group, so two triggers never merge twice.
- **No new merges the loop would not already make.** A head with no pass verdict, a `not-pass` verdict, a hold label, a plot PR, or the kill switch off never merges on this path.

### Decisions made upfront (do not ask)

- The fix is a trigger, not a change to what `decide` accepts.
- No polling, no cron: the gate's completion is the event.

### Out of scope

- The mutation job's near-zero scores on tested code (also seen on 2026-11-08), and the other loop problems already listed under the Nov 9 cloud-container deadline item.

## Open questions

none

## Chunks

Measure: 0 open · 2 closed · next A3


### 160.1 (MG1a) — The merge decision re-runs when the verify gate finishes · M · closes A1, A2 · requires —

- Read `.github/workflows/pr-review.yml` (the `verify-gate` and `merge` jobs) and `scripts/pr-merge.mjs` (`decide`, `since`, `verifyGateGreen`) first. Pick mechanism (a) or (b) from Design and say why in the PR.
- The `since` step (a verdict older than the run is not its verdict) must not reject the earlier pass on the new path: the new path finds the verdict by head and diff digest, as the `reuse` path already does.
- Tests in `scripts/pr-merge.test.mjs` (or a new `*.test.mjs` added to the root `npm test`): the four A1 fixture cases and the A2 double-trigger case. Workflow YAML changes are checked by the existing workflow lint, if any.
- Measure: root `npm test` green; the PR body links the first loop PR that merged on the new path (or, if none landed before review, a dry-run log of the decision on a past PR such as #1464 at head `a02bcc3`).

<!-- Not chunked yet: hand absorb in progress -->
