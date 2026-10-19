# Phase LG1 — Loop gates: the eval report's ranked fixes, built

## Sources

- The `/plot` request from T, 2026-10-18 (attended): "Plot everything we just pushed through messy, same PR". It
  promotes all eight `[owner]` candidates T's `/messy` filed that day from the "For `/messy`" block of
  `docs/reports/eval/latest.md` (EV1d, stamp `a712832a`). Part plan: `plan/loop-gates.md` (themes 2-7).
- T's rulings in that `/messy`: the mechanical checks fail `verify-gate`, which stays in evaluate mode until T
  activates the ruleset (`plan/NEEDS_T.md` `verify-gate-ruleset`); the RV1 Claude review stays advisory (D86);
  the Android smoke test is filed. `EXPO_TOKEN` exists as the repo secret and in the session environment (checked
  2026-10-18), so the Android blocker is a place to run the APK, not the token.
- `plan/phases/phase_EV1_loop_eval_ledger.md` (the measured misses), `plan/phases/phase_RV1_pr_review_pipeline.md`
  (`verify-gate`, `pr-gate.mjs`, the three-lens review, `pr-review.mjs parent-tests`).
- D84-D87 (code lands by PR; T merges; the review is advisory), D93, D94 (T's settings moves stay in NEEDS_T, so
  the merge-gate ruleset is not a phase here).
- Out of scope by T's `/messy`: the merge-gate ruleset (T's move) and the antagonist (replaced by RV1).

## Outcome

Every gate fix the eval report ranked is built: `verify-gate` fails on an unowned path, a ticked acceptance line
that names no proof, a split plan-queue row, and a new test that could not fail; a judge re-runs ticked lines;
`/critique` passes leave a record the miss-rate table counts; a report-only mutation job runs on a PR's changed
lines; and an attended Android smoke test can run the preview APK on an emulator.

## Acceptance

- **A1** `scripts/check-plan-queues.mjs` lints `plan/AUDIT.md`, `plan/CRITIQUE.md`, `plan/PHASE_CANDIDATES.md`
  and the Status block of `plan/steps/01_build_plan.md`: each row's header has the file's shape (checkbox and
  tags), its body sits directly under its header, no row repeats, no run of blank lines exceeds the file's norm.
  It runs in the root `npm test`, so `verify-gate` fails on a violation. Fixture tests include the c95114a2 split.
  The current files pass.
- **A2** `verify-gate` fails when a changed path is outside every `verify-*` workflow's `paths:` filter and outside
  `BOOKKEEPING_PREFIXES`, and its summary names each such path and the workflow whose filter would own it by
  directory. `pr-gate.mjs` reads the filters from the workflow files, not a copied list. Tests on fixture diffs:
  an owned path, a bookkeeping path, an unowned path.
- **A3** `verify-gate` parses the PR body's `## Acceptance` section. Every `- [x] A<n>` line must name its proof:
  a backticked test file or `verify:visual` shot path that exists on the PR head, or a backticked command (`npm`,
  `node` or `npx`). A line may instead end with `(no test: <reason>)`, which the summary lists for T. A ticked line
  with neither fails the gate. `skills/march.md` "Landing a change" shows the format. Tests on fixture PR bodies.
- **A4** `verify-gate` runs `pr-review.mjs parent-tests` on every PR that adds a test file and fails when an added
  test passes on the parent, unless the file carries a `guard-test:` comment with a reason. The summary names each
  such file. Tests on a fixture repo history.
- **A5** Each `/critique` pass appends one JSON line to `docs/reports/critique/passes.jsonl`: pass number, base
  and head sha, screens and viewports played, and the finding ids and severities it filed. `skills/critique.md`
  Step 4 writes it. `miss-rates-lib.mjs` counts an escape inside a recorded pass range as a critique miss and a
  matched finding as a catch, so `/critique` is no longer "not measured" once one pass is recorded. Tests on
  fixture records.
- **A6** A `judge` job in `pr-review.yml` runs each A3-named test or command on the PR head and reports a pass or
  fail per acceptance line in the job summary. A named command that fails turns `verify-gate` red. Lines marked
  `(no test: …)` are listed, not run. Tests on the per-line runner with fixture lines.
- **A7** A report-only `mutation` job runs Stryker on the lines a PR changes in `axiomancer-mechanics` (and in
  `axiomancer-mobile` when the budget allows), under a 15-minute budget, and posts the score and the survivors
  with their file and line. It never fails a check. `scripts/eval/mutation-lib.mjs` gains the diff scoping, with
  tests.
- **A8** (attended) `.github/workflows/android-smoke.yml`, run by hand: build the preview APK with `EXPO_TOKEN`
  (or take a given EAS build id), boot an Android emulator on a KVM runner, install the APK, and run a Maestro
  flow that reaches the title and finishes one combat round. A pass, a failure screenshot and the flow log are
  uploaded. T approves and watches the first run, since each run spends EAS build minutes; the run's result is in
  `docs/reports/android-smoke.md`.

Measure: the root `npm test` and `npm run verify -w axiomancer-mechanics` pass; on fixture PRs `verify-gate`
fails each of the A1-A4 shapes and passes a clean one; the miss-rate table lists `/critique` with a denominator
once a pass is recorded; one `android-smoke` run is recorded in `docs/reports/android-smoke.md`.

## Scope (shared)

- Root `scripts/`: `check-plan-queues.mjs`, `pr-gate.mjs`, `pr-review.mjs`, `scripts/eval/miss-rates-lib.mjs`,
  `scripts/eval/mutation-lib.mjs`, their tests (in the root `npm test`).
- `.github/workflows/`: `pr-review.yml` (verify-gate steps, the judge and mutation jobs), `android-smoke.yml`
  (new), `README.md`.
- `skills/march.md` (the acceptance format), `skills/critique.md` (the pass record).
- `axiomancer-mobile`: a Maestro flow and any test ids the flow needs (LG1h only).
- Not touched: repository settings and the ruleset (T's, NEEDS_T); the RV1 review's advisory verdicts (D86);
  game rules and content.

## Consumers to update

- `.github/workflows/README.md`: each new gate step and job.
- `docs/truth-sources.md`: the critique record as a measured source.
- `skills/ship-a-phase.md`: where the PR body's acceptance lines are written, if it repeats the format.

## Save / schema contracts

None. `docs/reports/critique/passes.jsonl` is a new append-only report file, not save data.

## Decisions made upfront — DO NOT ASK

- **Gates fail `verify-gate`** (T). Each check is deterministic and runs inside the existing `verify-gate` job or
  as a step it waits on, so one required check still covers everything once T activates the ruleset.
- **The ruleset is not a phase** (D94): `plan/NEEDS_T.md` `verify-gate-ruleset` stays T's.
- **Acceptance proof format:** a backticked existing path or a backticked `npm`, `node` or `npx` command; or
  `(no test: <reason>)`. The opt-out keeps doc-only and attended lines honest without a fake test; the summary
  shows each one so T sees them.
- **Guard tests:** a `guard-test:` comment with a reason opts a file out of fail-on-parent; some tests pass on the
  parent by design (they pin behaviour that already holds).
- **Critique record path:** `docs/reports/critique/passes.jsonl`, append-only, one line per pass.
- **The judge runs only what A3 names**, on the PR head, inside the job's time limit; it never edits the PR.
- **Mutation is report-only** and never fails a check: its scores have no baseline per diff yet.
- **Android is attended** because each run spends EAS build minutes and needs T to approve the first run. It uses
  a KVM-capable GitHub runner and a pinned emulator action; if no runner in the repo's plan supports KVM, the
  phase records that in `docs/reports/android-smoke.md` and stops at a workflow that runs on T's device via `adb`
  instead.
- **Slot:** anytime. These fix the loop's merge gates, not a live game defect, and block no open row.

## Tests matrix (shared intent; each phase lists its own)

- Root `node --test`: the queue lint on fixtures and the real files; the path-coverage decision; the acceptance
  parser; fail-on-parent on a fixture history; the critique-record matcher; the judge's per-line runner; mutation
  diff scoping.
- No Jest or Vitest changes except LG1h's Maestro flow and any test ids.

## Verify gate

The root `npm test`. Phases that touch `.github/workflows/` also check the workflow parses (`actionlint` if
present, else a YAML parse test). LG1h also runs `npm run verify -w axiomancer-mobile`.

## Commit body template

```
<id>: <one line>

Closes A<n> of plan/phases/phase_LG1_loop_gates.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

## DoD

A1–A8 ticked, each by the phase that closes it.

## Follow-ups (out of scope)

- **The ruleset:** T creates it (`plan/NEEDS_T.md` `verify-gate-ruleset`), then switches it to `active`.
- **Re-run the eval** after LG1a-LG1d land, and on or after 2026-10-23 for the change-failure baseline, to see the
  miss counts move.
- **Mutation as a gate:** only once per-diff baselines exist.

## Phases

### LG1a — Plan-queue lint · S · closes A1 · requires nothing
Measure: the root `npm test` passes on the real queue files and fails the c95114a2 fixture.
- Scope: `scripts/check-plan-queues.mjs` and its test, the root `npm test` list.
- Tests: fixtures for each rule; the real files pass.
- Verify gate: the root `npm test`.

### LG1b — Path coverage in verify-gate · S · closes A2 · requires nothing
Measure: the root `npm test`; `verify-gate` fails a fixture diff with an unowned path and names it.
- Scope: `scripts/pr-gate.mjs` (read the `paths:` filters, the decision, the summary), its test, `README.md`.
- Tests: owned, bookkeeping and unowned paths.
- Verify gate: the root `npm test` and the workflow parse check.

### LG1c — Acceptance proof in verify-gate · M · closes A3 · requires nothing
Measure: the root `npm test`; fixture PR bodies pass and fail as A3 says.
- Scope: an acceptance parser beside `pr-gate.mjs`, the gate step, `skills/march.md` "Landing a change".
- Tests: a proven line, an opt-out line, an unproven line, a path that does not exist.
- Verify gate: the root `npm test` and the workflow parse check.

### LG1d — Fail-on-parent in verify-gate · M · closes A4 · requires nothing
Measure: the root `npm test`; a fixture history with a test that passes on the parent fails the gate.
- Scope: `scripts/pr-review.mjs parent-tests` called from the gate, the `guard-test:` opt-out, `README.md`.
- Tests: a test that fails on the parent, one that passes, one opted out.
- Verify gate: the root `npm test` and the workflow parse check.

### LG1e — The critique pass record · S · closes A5 · requires nothing
Measure: the root `npm test`; the miss-rate table counts `/critique` from fixture records.
- Scope: `skills/critique.md` Step 4, `docs/reports/critique/passes.jsonl`, `scripts/eval/miss-rates-lib.mjs`,
  `docs/truth-sources.md`.
- Tests: the record matcher on fixtures.
- Verify gate: the root `npm test`.

### LG1f — The judge job · L · closes A6 · requires LG1c
Measure: the root `npm test`; on a fixture PR the judge reports each named line and a failing command turns
`verify-gate` red.
- Scope: a judge runner script and its test, the `judge` job in `pr-review.yml`, `README.md`.
- Tests: the per-line runner (pass, fail, opt-out, time limit).
- Verify gate: the root `npm test` and the workflow parse check.

### LG1g — Report-only mutation on changed lines · L · closes A7 · requires nothing
Measure: the root `npm test`; the diff-scoping tests pass and one run on a real PR posts a score within budget.
- Scope: `scripts/eval/mutation-lib.mjs` diff scoping, the `mutation` job, `README.md`.
- Tests: diff scoping on fixture diffs.
- Verify gate: the root `npm test` and the workflow parse check.

### LG1h — Android smoke test (attended) · L · closes A8 · requires nothing
Measure: one `android-smoke` run, approved by T, recorded in `docs/reports/android-smoke.md` with its result.
- Scope: `.github/workflows/android-smoke.yml`, a Maestro flow and test ids in `axiomancer-mobile`, the report.
- Tests: the flow itself; `npm run verify -w axiomancer-mobile` for any test ids.
- Verify gate: mobile verify, the workflow parse check, and the recorded run.
