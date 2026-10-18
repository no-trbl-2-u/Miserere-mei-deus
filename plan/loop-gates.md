# Loop gates — part plan

> Created by `/messy` 2026-10-18 from the "For `/messy`" block of `docs/reports/eval/latest.md` (EV1d, stamp
> `a712832a`), which ranks nine gate fixes by the measured misses each would have prevented. T ran `/messy` on it
> in an attended session. Every candidate below is an `[owner]` row in `plan/PHASE_CANDIDATES.md`; T promotes one
> with `/plot`. Evidence for every number: `docs/reports/eval/latest.md` (EV1a-EV1d) and the JSON beside it.

## T's rulings (2026-10-18)

- **The mechanical checks fail `verify-gate`.** Path coverage, the acceptance map, the plan-queue lint and
  fail-on-parent are deterministic, so each turns `verify-gate` red when it fails. `verify-gate` stays in
  evaluate mode until T activates the ruleset (`plan/NEEDS_T.md` `verify-gate-ruleset`), so nothing blocks a
  merge before T chooses. The RV1 Claude review stays advisory (D86).
- **The Android smoke test is filed**, marked as needing an emulator runner or T's device. `EXPO_TOKEN` is not a
  blocker: it exists as the repo secret `preview-build.yml` reads and in the session environment (checked
  2026-10-18).

## Themes

### 1. The merge gate (EV1d rank 1, S, prevents 3: #509, #529, #541)

- **What exists:** RV1a's `verify-gate` job (`.github/workflows/pr-review.yml`, `scripts/pr-gate.mjs`). It is the
  one check that reports on every PR into `main`, green only when every triggered `verify-*` is green.
  `.github/workflows/README.md` prints T's command to create the ruleset that requires it.
- **What is missing:** the ruleset itself, which only T can create (GitHub settings). Evaluate mode only records;
  `active` is what stops a merge before a check finishes.
- **Where it lives:** `plan/NEEDS_T.md` `verify-gate-ruleset` (open) and `pr-review-stage-2`. **No candidate**:
  it is T's move, never a loop phase (D94).

### 2. CI path coverage (rank 2, S, prevents 2: #526, planted D4)

- **What exists:** each `verify-*` workflow triggers on a hand-written `paths:` list. `pr-gate.mjs` `decideGate`
  calls `classifyPaths` (`scripts/eval/ledger-lib.mjs`) and runs the root `npm test` when a path is uncovered, so
  the #526 and D4 shapes are now covered when the root tests catch them.
- **What is missing:** nothing names the uncovered path or fails on it, so a new directory can stay unowned for
  good; push-to-`main` and plan-only pushes are not covered.
- **Nearest row:** PHASE_CANDIDATES "root npm test runs in no workflow" (half closed by RV1a).
- **Candidate:** `verify-gate` fails when a changed path has no owning `verify-*` filter and isn't on the
  bookkeeping list, naming the path and the filter to extend.

### 3. The builder's own `[x]` (rank 3 M and rank 5 L, both prevent 3: #521 A4, #523 A6, #523 verify:visual)

- **What exists:** the builder writes `- [x] A<n>` lines in the PR body (`skills/march.md` "Landing a change").
  `pr-gate.mjs` never reads them. The RV1 review (`skills/review.md`) already flags a ticked line that names no
  test, and HIGH-flags one whose only test could not fail, but it blocks nothing, never re-runs a line and never
  checks for a `verify:visual` shot. 49 of 65 measured ticks name no test.
- **Candidate A (acceptance map, S-M):** `verify-gate` parses `## Acceptance` and fails a ticked line that names
  no test file, command or shot artifact that exists in the diff or the tree.
- **Candidate B (builder/judge separation, L):** a judge that is not the builder re-runs each ticked line's named
  command or test. Overlaps the RV1 Tests lens; promote only if candidate A's misses show it is needed.

### 4. The plan queue files (rank 4, S, prevents 1: the `pr-resolve` row split, c95114a2 and 49829988)

- **What exists:** `scripts/pr-resolve.mjs` union-merges AUDIT, CRITIQUE, PHASE_CANDIDATES and lessons.md, then
  checks only for conflict markers. `scripts/check-lessons.mjs` is the only plan-file format lint (lessons,
  reflexes, NEEDS_T) and the model to copy.
- **Overlap:** the held `[owner]` row "Shard the AUDIT and CRITIQUE queues per writer"; the lint is still needed
  under either option.
- **Candidate:** `scripts/check-plan-queues.mjs` lints the real queue files (each row's header shape, its body
  directly under it, no repeated rows, no doubled blank runs), in the root `npm test`, so `verify-gate` fails a
  merge that splits a row.

### 5. `/critique` has no denominator (rank 6, S, prevents 0, "found")

- **What exists:** `plan/CRITIQUE.md` keeps `Last pass` / `Pass count` and prose "N commits after pass M";
  `critique-drive.mjs` writes an uncommitted manifest with no sha and no findings; `miss-rates-lib.mjs` labels
  `/critique` "not measured".
- **Candidate:** each pass appends one machine-readable record (pass number, base and head sha, screens and
  viewports, finding IDs and severities), and the miss-rate table matches escapes in that range to findings. It
  catches nothing itself; it makes the one unmeasured judge measurable.

### 6. verify's own strength (rank 7 M and rank 9 L, prevent 0 so far)

- **What exists:** `scripts/eval/parent-replay*.mjs` (4 of 58 test files could not fail) and
  `pr-review.mjs parent-tests`, called only by the RV1 Tests lens as a comment. Stryker configs under
  `scripts/eval/stryker/` (mechanics 76.3%, 161 survivors; the full mobile run goes over budget); no workflow runs
  them.
- **Candidate A (fail-on-parent, S-M):** `verify-gate` runs `parent-tests` and fails when a test file the PR adds
  could not fail, with an opt-out marker for guard tests that pass on the parent by design.
- **Candidate B (diff-scoped mutation, L):** Stryker on the PR's changed lines under a time budget, report-only
  first.

### 7. Android (rank 8, L, prevents 0; S6: no gate runs on Android)

- **What exists:** `.github/workflows/preview-build.yml` (manual EAS build, needs `EXPO_TOKEN`); no Maestro, Detox
  or emulator; PF2's device tables are blank.
- **Candidate (needs a device path):** a smoke run on the preview APK (install, launch, reach the title and one
  combat round). `EXPO_TOKEN` already exists; it needs EAS build minutes and either a KVM emulator runner with
  Maestro or T's device.

### 8. The antagonist (missed 4 of 5; no fix aimed at it)

- **What it was:** an ad-hoc reviewer in the 2026-10-13/14 parallel-march session, defined nowhere in the tree.
  It read diffs and screenshots but ran nothing, so it missed S3 (tests that could not fail), S4 (path coverage)
  and S5 (a missing shot), which all need execution or CI facts. Its one correct "not a pass" (#529) was merged
  over by a script that matched "pass" inside "not a pass".
- **Where it went:** replaced by RV1 (the three-lens review) and RV1a's `verify-gate`; themes 2, 3 and 6 aim at
  its miss classes. **No candidate.** The open item is `plan/AUDIT.md` (run `seeded-replay --judge review` on the
  three-lens reviewer).

## Proposed order

1. Theme 4 (queue lint, S) and theme 2 (path coverage, S): cheapest, deterministic.
2. Theme 3A (acceptance map, S-M) and theme 6A (fail-on-parent, S-M): each closes a measured S3/S5 class.
3. Theme 5 (critique record, S): measurement only.
4. Theme 3B, 6B, 7 (L): only if the earlier gates' misses say so.

## Open questions

- None open. T ruled on gate mode and on filing Android (above).
