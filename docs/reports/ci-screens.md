# CI screens: what the screenshot run and the mutation report hang on

Every time CI's screenshot run fails to load a screen, re-stamps a screen that did not change, or the
mutation report cannot run, one row lands here. T reads it to write the rules that keep a screen out of
this table. Rows are added by `node scripts/ci-screens.mjs record --pr <n>`, which the re-stamp job runs
after the `visual-smoke` comment; never add one by hand (the seed rows below are the one exception).
A row is keyed on PR, run and route, so a PR recorded twice adds nothing. Newest first. `-` means the
value was not known when the row was written. For a mutation row the run column is the PR head the
report ran on, because that comment names no run.

Symptoms: `load-failed`, `re-stamped without a change`, `flapping` (a route re-stamped twice with nothing
but re-stamp commits between, or whose captures differ across `SMOKE_RUNS`), `cancelled by re-stamp`,
`mutation over budget`, `mutation dry run failed`. A flapping route is logged and named in the PR
comment ("flapping: <route>, see docs/reports/ci-screens.md"); CI still re-stamps it.

| date | PR | run | route or file | symptom | cause | fix PR |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12 | #1653 | - | app/quest/index.tsx | mutation dry run failed | first test run failed ("One or more tests failed in the initial test run") on both later heads while the same tests pass in verify-mobile | - |
| 2026-11-12 | #1653 | - | quest-two-lines | re-stamped without a change | the quest card took its height from its own flex parent, so it depended on when fonts and the portrait loaded; re-stamped twice before the fix | #1653 |
| 2026-11-12 | #1652 | - | app/cutscene/index.tsx | mutation over budget | over the 15 minute budget twice, 10 or 12 of 60 mutants tested (the new cutscene-pages presenter) | - |
| 2026-11-12 | #1652 | 43283153598 | cache-goods | load-failed | the fixture apprentice-cw-cache goes through /exploration, where a paged before-scene can play first (since #1647 and #1652) | - |
| 2026-11-12 | #1652 | 43283153598 | cache-card | load-failed | same as cache-goods | - |
| 2026-11-12 | #1652 | 43283153598 | cache | load-failed | same as cache-goods | - |
| 2026-11-12 | #1651 | - | verify-mobile | cancelled by re-stamp | a visual: re-stamp commit landed mid-run; verify-gate read red and #1651 could not merge until it merged main | - |
| 2026-11-12 | #1651 | 43293074326 | cache-card | load-failed | same as the #1652 cache rows | - |
| 2026-11-12 | #1651 | - | quest-two-lines | flapping | re-stamped 5 times with no quest change in the PR, ratio 15.654% every time; same cause as the #1653 row | #1653 |
| 2026-11-12 | #1647 | - | verify-mobile | cancelled by re-stamp | a visual: re-stamp commit landed mid-run; verify-gate read red | - |
