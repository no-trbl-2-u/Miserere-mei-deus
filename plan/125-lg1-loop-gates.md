# 125 — Loop gates: the eval report's ranked fixes, built

> Every gate fix the eval report ranked is built: `verify-gate` fails on an unowned path, a ticked acceptance line that names no proof, a split plan-queue row, and a new test that could not fail; a judge re-runs ticked lines; `/critique` passes leave a record the miss-rate table counts; a report-only mutation job runs on a PR's changed lines; and an attended Android smoke test can run the preview APK on an emulator.

Carried from the v1 brief `phase_LG1_loop_gates.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_LG1_loop_gates.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

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

### Outcome

Every gate fix the eval report ranked is built: `verify-gate` fails on an unowned path, a ticked acceptance line
that names no proof, a split plan-queue row, and a new test that could not fail; a judge re-runs ticked lines;
`/critique` passes leave a record the miss-rate table counts; a report-only mutation job runs on a PR's changed
lines; and an attended Android smoke test can run the preview APK on an emulator.

## Design

### Scope (shared)

- Root `scripts/`: `check-plan-queues.mjs`, `pr-gate.mjs`, `pr-review.mjs`, `scripts/eval/miss-rates-lib.mjs`,
  `scripts/eval/mutation-lib.mjs`, their tests (in the root `npm test`).
- `.github/workflows/`: `pr-review.yml` (verify-gate steps, the judge and mutation jobs), `android-smoke.yml`
  (new), `README.md`.
- `skills/march.md` (the acceptance format), `skills/critique.md` (the pass record).
- `axiomancer-mobile`: a Maestro flow and any test ids the flow needs (LG1h only).
- Not touched: repository settings and the ruleset (T's, NEEDS_T); the RV1 review's advisory verdicts (D86);
  game rules and content.

### Consumers to update

- `.github/workflows/README.md`: each new gate step and job.
- `docs/truth-sources.md`: the critique record as a measured source.
- `skills/ship-a-phase.md`: where the PR body's acceptance lines are written, if it repeats the format.

### Decisions made upfront — DO NOT ASK

- **Gates fail `verify-gate`** (T). Each check is deterministic and runs inside the existing `verify-gate` job or
  as a step it waits on, so one required check still covers everything once T activates the ruleset.
- **The ruleset is not a phase** (D94): `plan/NEEDS_T.md` `verify-gate-ruleset` stays T's.
- **Acceptance proof format:** a backticked existing path or a backticked `npm`, `node` or `npx` command; or
  `(no test: <reason>)`. The opt-out keeps doc-only and attended lines honest without a fake test; the summary
  shows each one so T sees them (T confirmed 2026-10-19).
- **Guard tests:** a `guard-test:` comment with a reason opts a file out of fail-on-parent; some tests pass on the
  parent by design (they pin behaviour that already holds) (T confirmed 2026-10-19).
- **Critique record path:** `docs/reports/critique/passes.jsonl`, append-only, one line per pass (T confirmed 2026-10-19).
- **The judge runs only what A3 names**, on the PR head, inside the job's time limit; it never edits the PR.
- **Mutation is report-only** and never fails a check: its scores have no baseline per diff yet.
- **Android is attended** because each run spends EAS build minutes and needs T to approve the first run. It uses
  a KVM-capable GitHub runner and a pinned emulator action; if no runner in the repo's plan supports KVM, the
  phase records that in `docs/reports/android-smoke.md` and stops at a workflow that runs on T's device via `adb`
  instead (T confirmed 2026-10-19).
- **Slot:** anytime. These fix the loop's merge gates, not a live game defect, and block no open row.

### Tests matrix (shared intent; each phase lists its own)

- Root `node --test`: the queue lint on fixtures and the real files; the path-coverage decision; the acceptance
  parser; fail-on-parent on a fixture history; the critique-record matcher; the judge's per-line runner; mutation
  diff scoping.
- No Jest or Vitest changes except LG1h's Maestro flow and any test ids.

### Verify gate

The root `npm test`. Phases that touch `.github/workflows/` also check the workflow parses (`actionlint` if
present, else a YAML parse test). LG1h also runs `npm run verify -w axiomancer-mobile`.

### Commit body template

```
<id>: <one line>

Closes A<n> of plan/phases/phase_LG1_loop_gates.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

### Follow-ups (out of scope)

- **The ruleset:** T creates it (`plan/NEEDS_T.md` `verify-gate-ruleset`), then switches it to `active`.
- **Re-run the eval** after LG1a-LG1d land, and on or after 2026-10-23 for the change-failure baseline, to see the
  miss counts move.
- **Mutation as a gate:** only once per-diff baselines exist.

### Chunk notes (the brief's phase blocks)

#### LG1h (chunk 125.8)

Measure: one `android-smoke` run, approved by T, recorded in `docs/reports/android-smoke.md` with its result.
- Scope: `.github/workflows/android-smoke.yml`, a Maestro flow and test ids in `axiomancer-mobile`, the report.
- Tests: the flow itself; `npm run verify -w axiomancer-mobile` for any test ids.
- Verify gate: mobile verify, the workflow parse check, and the recorded run.

## Contracts

None. `docs/reports/critique/passes.jsonl` is a new append-only report file, not save data.

## Acceptance

- **A8** (attended) `.github/workflows/android-smoke.yml`, run by hand: build the preview APK with `EXPO_TOKEN`
  (or take a given EAS build id), boot an Android emulator on a KVM runner, install the APK, and run a Maestro
  flow that reaches the title and finishes one combat round. A pass, a failure screenshot and the flow log are
  uploaded. T approves and watches the first run, since each run spends EAS build minutes; the run's result is in
  `docs/reports/android-smoke.md`.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 1 open · 7 closed · next A9

- [ ] **125.8** Android smoke test (attended) · L · closes A8 · needs — · alias: LG1h
