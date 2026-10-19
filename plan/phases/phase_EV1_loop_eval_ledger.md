# Phase EV1 — How well the loop judges its own work: the escape ledger and the miss-rate table

## Sources

- The `/plot` request from T, 2026-10-15: "Harden how the Axiomancer loop judges its own work. Measure before designing." T asked for the ledger and the miss-rate table first, then the fixes filed with `/messy`, one theme per gate, and nothing built yet.
- The 2026-10-13/14 parallel-march session (three march lanes, a watcher, an antagonist, a merge script), whose escapes seed the ledger. Details are in A2 below.
- D84-D87 (code lands by `loop:pr` PR, the PR cap, T merges, `pr-autofix`), D93 (plots land by PR), D88/D37 (content holds), D91/D92 (the card face and board whose PRs are in the window).
- `skills/march.md` §3 (Landing a change, Retro), `skills/ship-a-phase.md`, `.github/workflows/verify-*.yml` (the path filters), `.claude/hooks/guard.mjs`, `scripts/loop-pr.test.mjs`, `scripts/check-lessons.mjs`.
- Candidate overlap: `plan/PHASE_CANDIDATES.md` "[score 6.0] The root `npm test` runs in no workflow" is one of the path-filter gaps this phase measures. EV1 measures it; it does not fix it, and that candidate stays open.

## Outcome

A rerunnable report, `docs/reports/eval/latest.md`, names every escape since 2026-10-12, which gate should have caught each one, each gate's measured miss rate, a ranked list of fixes, and the evidence that would prove a fix worked. No gate is changed.

## Acceptance

- **A1** The ledger lists every `loop:pr` PR merged from 2026-10-12 to the run date. For each it records:
  - the checks that ran on its final head;
  - the checks its changed paths skipped, computed from the `verify-*` path filters;
  - fix or revert commits on `main` touching the same files within 7 days of the merge;
  - the antagonist's verdict comment, if any.
- **A2** The ledger carries the six seeded escapes, each with its evidence (PR, commit or run) and the gate that should have caught it:
  1. #529 merged before CI ran on its final head (`9d44ca5e`), because a session-local merge script matched "Antagonist pass" inside a "not a pass" comment;
  2. `pr-resolve` merges (`c95114a2`, `49829988`) cut `plan/CRITIQUE.md` rows apart on `main`, later repaired by hand in `23f06828`/`662aa10b`;
  3. three tests that could not fail, with their acceptance ticked `[x]` (#521 A4, #523 A6, and #520's leaked `console.error` spy as the near-miss);
  4. #526 merged with only Cloudflare Pages run, because no `verify-*` filter covers `.github/workflows/` or root `scripts/`;
  5. SF1's brief asked for a `verify:visual` shot of the callout and none was taken;
  6. no gate runs on Android.
- **A3** `scripts/eval/escape-ledger.mjs` regenerates A1 and A2 from GitHub and git alone. Its pure parts (path-filter matching, follow-up detection, comment classification) are covered by `scripts/eval/escape-ledger.test.mjs` with recorded fixtures, which is in the root `npm test`.
- **A4** Every test file a ledger PR added or changed is run against the PR's parent commit (the first parent of its merge), and the result is recorded per file. A test that passes on the parent is flagged "could not fail". Each acceptance ID ticked `[x]` whose only named test is flagged is listed as an unproven tick.
- **A5** StrykerJS mutation scores, with survived-mutant listings, for:
  - `axiomancer-mechanics/src/Combat/` (the resolution modules);
  - `axiomancer-mobile/state/presenters/combat-encounter.engine.ts`;
  - `axiomancer-mobile/state/presenters/card-program.engine.ts` (the card-face lines).

  The run is bounded so it fits one tick.
- **A6** Tonight's real bugs are replayed as planted defects. Each fix is reverted on a scratch branch that is never pushed, and the result is recorded as caught or missed by each mechanical gate that would run on it:
  - #534 `riderPairs` ignoring damage riders;
  - #523's loose die drop missing the callout;
  - #529's clipped leftmost pill;
  - #543's union-merge row split.
- **A7** A miss-rate table has one row per judge, each with its count, its denominator and the ledger rows it comes from:
  - CI and its path filters;
  - `verify`;
  - the antagonist;
  - `/critique`;
  - the merge gate;
  - the builder's own `[x]`.

  A judge whose rate cannot be measured from this evidence says "not measured" and why.
- **A8** A ranked fix list with one row per candidate fix, each scored by the A7 misses it would have prevented and its estimated size (S/M/L). The candidates:
  - branch protection with required status checks, replacing comment matching;
  - a fail-on-parent check for new tests;
  - a path-coverage audit so no diff merges unverified;
  - a structural lint for the plan queue files;
  - an acceptance-ID-to-test map;
  - builder/judge separation;
  - an Android smoke test on the preview APK.

  Any fix the evidence suggests beyond these is added and marked "found".
- **A9** The success evidence is defined so that neither T nor an agent judges it:
  - a frozen past-PR set: PR numbers and heads with each one's expected verdict, at least the A2 escapes plus five known-good PRs;
  - a seeded-defect catch-rate target for the mechanical gates;
  - the change failure rate on `main` over the last 20 merges, with the method stated, as the baseline to compare against the next 20.
- **A10** The report ends with a "For `/messy`" section: one theme per gate, written as a raw dump T can paste into `/messy`. EV1 implements no gate fix.

Measure: `node scripts/eval/escape-ledger.mjs && node scripts/eval/miss-rates.mjs` regenerates `docs/reports/eval/latest.md` at the stamped commit with the same numbers; root `npm test` passes.

## Scope

- New: `scripts/eval/` (ledger, parent-replay, seeded-replay and miss-rate scripts, plus their tests and fixtures), `docs/reports/eval/` (the report and its JSON data).
- New dev dependency: `@stryker-mutator/core` with the jest runner, in the workspace(s) it mutates, behind an `npm run eval:mutation` script and never in `verify` (see Decisions).
- Not touched: any `verify-*` workflow, `guard.mjs`, branch protection, any skill's gate logic, game code, cards, keywords or art.

## Consumers to update

- Root `package.json`: `eval:*` scripts and the new tests added to the root `npm test`.
- `docs/truth-sources.md`: one line naming `docs/reports/eval/latest.md` as the measured state of the loop's gates, with its commit stamp.

## Save / schema contracts

None. No game data or save shape changes.

## Decisions made upfront — DO NOT ASK

- **Window.** PRs merged from 2026-10-12 up to the run date, labelled `loop:pr`. The `plot` PRs are excluded because they are plan-only.
- **Comment attribution.** Every loop agent and T post as the same GitHub account, so verdicts are classified by marker, not author:
  - "## Antagonist pass" or "Antagonist review" is the antagonist;
  - "Merged by Claude" is the merge script;
  - `claude[bot]` is a workflow;
  - anything else is "owner-or-unknown" and is never counted as T's verdict.
- **The merge gate.** The 2026-10-14 auto-merge script was session-local and is not in the repo. It is judged from its evidence (#529's merge time against its check runs), not rerun.
- **Agent judges are scored from evidence, not re-run.** The antagonist's and `/critique`'s miss rates come from the ledger (what each reviewed against what escaped). Re-running the antagonist on planted defects is a follow-up, because it is costly and not mechanical.
- **Planted defects never leave the machine.** Replays run on local scratch branches or detached worktrees, which are never pushed.
- **Android.** Recorded as a structural gap ("no gate exists"), with no miss rate. A device check is not built here.
- **Stryker scope.** Limited to the A5 modules so one tick can run it. Wider coverage is a follow-up. The dependency is a dev dependency only (T confirmed 2026-10-19).
- **The fixes go to `/messy`, not the build plan.** The loop never fires `/messy` (AGENTS.md rule 8). EV1 writes the dump section and T runs `/messy` on it.

## Tests matrix

- `scripts/eval/escape-ledger.test.mjs`: path-filter matching against the real `verify-*` filters, follow-up detection on a fixture history, and comment classification.
- `scripts/eval/miss-rates.test.mjs`: the table arithmetic from a fixture ledger, including the "not measured" rows.
- `scripts/eval/parent-replay.test.mjs`: the parent-commit selection for merge commits and the "could not fail" flag on a fixture result.

## Verify gate

Root `npm test` (`node --test` suites plus `check-lessons`), and `npm run verify -w axiomancer-mobile` and `npm run verify -w axiomancer-mechanics` if a workspace `package.json` changes for Stryker.

## Commit body template

```
eval: <slice> — <what the numbers now show>

<Which acceptance IDs this closes; the report path and its commit stamp.>
```

## DoD

A1-A10 ticked across EV1a-EV1d, and `docs/reports/eval/latest.md` on `main` with its commit stamp.

## Follow-ups (out of scope)

- Every gate fix in A8. They go through T's `/messy` and then `/plot`.
- Re-running the antagonist and `/critique` on planted defects to measure their recall directly.
- Wider mutation coverage beyond the A5 modules.
- An Android device gate (Maestro or Detox against the preview APK).

## Phases

### EV1a — The escape ledger · M · closes A1, A2, A3 · requires nothing
Measure: `node scripts/eval/escape-ledger.mjs` writes the ledger section of `docs/reports/eval/latest.md` with every window PR and the six seeded escapes; `node --test scripts/eval/escape-ledger.test.mjs` passes.
- Scope: `scripts/eval/escape-ledger.mjs` with its test and fixtures, and the ledger section and JSON in `docs/reports/eval/`.
- Tests: `escape-ledger.test.mjs`, added to the root `npm test`.
- Verify: root `npm test`.

### EV1b — Do the tests fail on the parent? · M · closes A4 · requires EV1a
Measure: `node scripts/eval/parent-replay.mjs` adds a per-test "fails on parent / could not fail" column and an unproven-ticks list to the ledger; its test passes.
- Scope: `scripts/eval/parent-replay.mjs` with its test. It runs each PR's added or changed test files in a detached worktree at the parent commit, reusing the main checkout's `node_modules` through Node junctions (never `mklink`).
- Tests: `parent-replay.test.mjs`.
- Verify: root `npm test`.

### EV1c — Planted defects and mutation scores · L · closes A5, A6, A7 · requires EV1a
Measure: `npm run eval:mutation` and `node scripts/eval/seeded-replay.mjs` write their sections; `node scripts/eval/miss-rates.mjs` writes the miss-rate table.
- Scope: Stryker config and the `eval:mutation` script (scoped per A5), `scripts/eval/seeded-replay.mjs`, `scripts/eval/miss-rates.mjs` with its test.
- Tests: `miss-rates.test.mjs`.
- Verify: root `npm test`, plus workspace `verify` for any workspace whose `package.json` changed.

### EV1d — Ranked fixes, success evidence and the `/messy` dump · S · closes A8, A9, A10 · requires EV1b, EV1c
Measure: `docs/reports/eval/latest.md` carries the ranked fix list, the frozen past-PR set with expected verdicts, the catch-rate target, the 20-merge change-failure baseline and the "For `/messy`" section.
- Scope: `docs/reports/eval/latest.md` and `docs/truth-sources.md`. No code beyond the report generator's final section.
- Tests: none new; the report regenerates from the scripts above.
- Verify: root `npm test`.
