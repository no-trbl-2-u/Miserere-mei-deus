# Phase RS1 — The loop sweeps hand-written reports

## Sources

- T, attended decision round 2026-10-19, on the CRITIQUE process-gap row (four real bugs once sat in an unfiled
  report under `axiomancer-mobile/docs/reports/`): option (b), "Loop sweeps reports". The CRITIQUE row now records
  the ruling and points here.
- `skills/march.md` Step 1 (triage), `plan/CRITIQUE.md` row format. D84, D90, D93.

## Outcome

A report someone saves under a package's `docs/reports/` reaches the loop: the next `/march` tick files a CRITIQUE
row for it, and `/iterate` turns its findings into work.

## Acceptance

- **A1** `scripts/report-sweep.mjs` lists the Markdown files under `axiomancer-*/docs/reports/` that are neither in
  `plan/report-sweep-baseline.json` nor cited by path in `plan/CRITIQUE.md` or `plan/AUDIT.md`, and prints each with
  its last commit. It runs in under a second and has tests on a fixture tree (new, baselined, cited).
- **A2** `plan/report-sweep-baseline.json` lists the reports present on 2026-10-19 as already handled (their bugs
  shipped or were filed), so the first sweep files nothing old.
- **A3** `skills/march.md` Step 1 runs the sweep after triage. For each unfiled report it adds one CRITIQUE Pending
  row, "`[MED]` unfiled report `<path>`: read it and file its findings", with the path as evidence. `/iterate`
  treats that row like any other. A test in `scripts/loop-pr.test.mjs` (or beside it) checks the step names the
  script.
- **A4** The root `docs/reports/` (loop-generated reports: eval, measured, perf, the critique record) is out of
  the sweep, because the loop writes and reads those itself.

Measure: the root `npm test` passes; the sweep reports nothing on today's tree and reports a fixture report added
under `axiomancer-mobile/docs/reports/`.

Size: S

## Scope

- `scripts/report-sweep.mjs` and its test (in the root `npm test`), `plan/report-sweep-baseline.json`,
  `skills/march.md` Step 1.
- Not touched: the reports themselves; the root `docs/reports/`.

## Consumers to update

- `docs/truth-sources.md`: where hand-written reports go and how they reach the loop.

## Save / schema contracts

None.

## Decisions made upfront — DO NOT ASK

- **One CRITIQUE row per report**, not per finding: reading a report and splitting it into findings is `/iterate`'s
  job, so the sweep stays a cheap, deterministic check.
- **Package reports only**: `axiomancer-*/docs/reports/*.md`. The root `docs/reports/` is the loop's own output.
- **A baseline, not a backfill**: today's reports are marked handled (the 2026-09-18 playtest bugs shipped as
  Phases 99-100); the sweep watches for new ones.
- **Slot:** anytime. Process fix, no live defect, blocks no row.

## Tests matrix

- Root `node --test`: the sweep on a fixture tree; the march step names the script.

## Verify gate

The root `npm test`.

## Commit body template

```
RS1: <one line>

Closes A<n> of plan/phases/phase_RS1_report_sweep.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

## DoD

A1–A4 ticked.

## Follow-ups (out of scope)

- A hand-written report in other folders (for example `braindump/`) stays outside the sweep; `braindump/` is
  design records, not findings.
