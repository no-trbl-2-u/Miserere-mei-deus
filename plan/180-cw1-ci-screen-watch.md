# 180 — CI screen watch: a log of the screens CI hangs on, and the first cleanup

> Every time CI's screenshot run fails to load a screen, re-stamps one that did not change, or the mutation report cannot run, it is written into one log T can read. The four gaps the Chapter 1 pilot left are closed.

## Why

### Sources

- **T, 2026-11-12**, after the spec 177 pilot (PRs #1651, #1652, #1653): "Plot one cleanup and let's start keeping track of all the screens the CI hang on so I can start writing instructions to avoid it".
- **What the pilot saw** (each from a `visual-smoke` or `eval:mutation-pr` comment):
  - `quest-two-lines` was re-stamped again and again with no quest change in the PR: 5 times on #1651 (the ratio was 15.654% every time) and twice on #1653 before its fix. Cause: the quest card took its height from its own flex parent, so its height depended on when fonts and the portrait loaded. #1653 now sizes the card from the screen. Each re-stamp restarted the PR's checks, so #1651 could not merge until it merged `main` after #1653.
  - `cache`, `cache-goods` and `cache-card` were `load-failed` on #1652 (run 43283153598), and `cache-card` again on #1651 (run 43293074326). A `load-failed` route is never re-stamped and its baseline goes stale without anyone being told.
  - `verify-mobile` shows `cancelled` whenever a `visual: re-stamp` commit lands mid-run, and verify-gate then reads red (seen on #1647 and #1651). That is not a real failure, but it looks like one.
  - The mutation report: on #1652 (`app/cutscene/index.tsx`, the new `cutscene-pages` presenter) it ran over its 15 minute budget twice and tested 10 or 12 of 60 mutants. On #1653 (`app/quest/index.tsx`) its first test run failed ("One or more tests failed in the initial test run") on both later heads, while the same tests pass in `verify-mobile`. Before that, 16 mutants of the quest screen survived; three are logic: `app/quest/index.tsx` the scroll cue's threshold (`buttonsBelowFold` now), the reward-item count (`vm.paid.itemNames.length > 0`) and the first reward item (`vm.paid.itemIds?.[0] ?? null`).

### What exists today

- `axiomancer-mobile/scripts/smoke-screens.mjs` shoots each route; `expectTestIds` turns a route with a missing piece into `load-failed`; `SMOKE_RUNS=<n>` shoots each route n times and exits 4 when the captures differ. `scripts/visual-report.mjs` writes the `visual-smoke` comment. Nothing keeps a history across PRs.
- `scripts/eval/mutation-pr.mjs` writes the `eval:mutation-pr` comment; since #1651 it hands the PR's changed mobile files to `scripts/eval/stryker/mobile.config.mjs` (`EVAL_STRYKER_MUTATE`).

## Design

**The log.** A new file `docs/reports/ci-screens.md`: a short header that says what it is for (T writes the avoidance rules from it), then one table, newest first: date, PR, run, route or file, symptom (`load-failed`, `re-stamped without a change`, `flapping`, `cancelled by re-stamp`, `mutation over budget`, `mutation dry run failed`), the cause when known, and the fix PR when there is one. It is seeded with every incident listed under Sources. A row is added by a script, never by hand: `scripts/ci-screens.mjs record --pr <n>` reads the PR's `visual-smoke` and `eval:mutation-pr` comments (through `gh api`, or the GitHub REST API with `GH_TOKEN` in CI) and appends one row per incident not already logged (keyed on PR, run and route). The workflow that posts the `visual-smoke` comment runs it after posting and commits the file with the re-stamp commit, or alone when there is no re-stamp. A route re-stamped twice on the same PR with no change to its screen's source is logged as `flapping`, and the comment says so in one line ("flapping: <route>, see docs/reports/ci-screens.md").

**The cleanup.** The four pilot gaps, each fixed at its cause:
1. Why the `cache*` routes fail to load (the fixture `apprentice-cw-cache` goes through `/exploration`; since #1647 and #1652 a node's before-scene, now paged, can play first). Make the routes reach `/cache`, and prove it with `SMOKE_RUNS=3` on the three routes.
2. Why the quest screen's tests fail under the mutation tool and not under jest. Make them run there, so the report scores `app/quest/index.tsx`.
3. Pin the three surviving quest logic lines with tests that fail on their mutants.
4. Make the cutscene presenter's mutation run fit its budget (a narrower related-test set for `state/presenters/cutscene-pages.ts`, or a per-file budget), so the report finishes on a PR that touches it.

## Acceptance

- **A1** `docs/reports/ci-screens.md` exists, is seeded with every incident under Sources, and `node scripts/ci-screens.mjs record --pr <n>` appends one row per new incident from a PR's comments and never duplicates one. CI runs it after the `visual-smoke` comment, and a route re-stamped twice on one PR without a source change is logged `flapping` and named in the comment.
- **A2** `cache`, `cache-goods` and `cache-card` load in CI and are identical across `SMOKE_RUNS=3`; the mutation report runs to completion on `app/quest/index.tsx` and on `state/presenters/cutscene-pages.ts`; the three quest logic lines named under Sources have killing tests.

## Open questions

- [T to confirm #1] The log lives in `docs/reports/ci-screens.md` (beside the other reports), not in `plan/`. Or: `plan/ci-screens.md`.
- [T to confirm #2] A `flapping` route is logged and named in the comment, but CI still re-stamps it, so the PR is not blocked. Or: a flapping route is not re-stamped and the check goes red until the screen is fixed.

## Chunks

Measure: 2 open · 0 closed · next A3

- [ ] **180.1** CI screen log and its recorder · M · closes A1 · needs — · alias: CW1a
  - The file, the seed rows (every incident under Sources, with its run and PR), `scripts/ci-screens.mjs` with a test that feeds it saved comment bodies (a `load-failed`, a re-stamp, a flapping pair, a mutation over budget, a dry-run failure) and checks the rows and the no-duplicate rule, wired into the root `npm test`. The workflow step after the `visual-smoke` comment. No game code changes.
  - Measure: the script's test passes; running it twice on the same PR adds nothing the second time; the seeded file lists the #1651 `quest-two-lines` flapping and the #1652 `cache*` load failures.
- [ ] **180.2** The pilot's CI gaps close · M · closes A2 · needs — · alias: CW1b
  - The four fixes under Design, "The cleanup", each with its cause written in the PR body and as a row's cause in `docs/reports/ci-screens.md` if 180.1 has landed (otherwise in the PR body only, for 180.1's seed).
  - Measure: `SMOKE_RUNS=3` on `cache`, `cache-goods`, `cache-card` exits 0; the mutation report on the PR shows a score for `app/quest/index.tsx` and finishes for `state/presenters/cutscene-pages.ts`; the three quest lines' mutants are killed.
