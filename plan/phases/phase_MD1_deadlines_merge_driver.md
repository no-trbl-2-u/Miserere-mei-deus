# Phase MD1 — Two open plot PRs stop conflicting when one merges

> Agent-facing brief, plotted by T (`/plot anytime`, 2026-10-28, run unattended on T's word relayed from an
> attended session). T's report: "whenever we have two plot/plan PRs open, once I merge one, the other always ends
> up with a conflict."

## Sources

- The `/plot` request (T, 2026-10-28).
- Phase ML1a (`scripts/lessons-merge.mjs`) and ML1b (`scripts/build-plan-merge.mjs`): the two merge drivers
  already in the repo. MD1 is their third. Registration is `.gitattributes` plus the SessionStart hook in
  `.claude/settings.json`, plus `MERGE_DRIVERS` in `scripts/pr-resolve.mjs` for the workflow runner (lesson
  `lessons-merge-dup-slug`).
- Phase R11 / D87 (`pr-resolve` keeps `loop:pr` and `plot` PRs mergeable), D93 and D101 (plots land by PR, T
  merges them).
- Phase DL1a-DL1c: `plan/deadlines.md`, its lint, the derived Status cells and `/plot`'s reconcile step, which is
  why every plot edits that file.
- `plan/PHASE_CANDIDATES.md`, "Server-side merges skip the lessons merge driver" (filed 2026-10-24) and the owner
  row "Shard the AUDIT and CRITIQUE queues per writer"; see Decisions for how each is treated.

## What exists

Checked on `main` at the plot's base (29cc3a398), so the plot does not plan what is built:

- **Built: the build plan merges cleanly.** Every `/plot asap` inserts rows above the first open row and an entry
  at the top of the Queue change log. `plan/steps/01_build_plan.md` has `merge=buildplan`
  (`scripts/build-plan-merge.mjs`, ML1b), which keeps both sides' insertions.
- **Built: the runner registers the drivers.** `scripts/pr-resolve.mjs` already has `MERGE_DRIVERS` and calls
  `registerMergeDrivers()` first thing in `mergeMain`, and `scripts/loop-pr.test.mjs` already fails when a
  `merge=<key>` named in `.gitattributes` is missing from `MERGE_DRIVERS` or from the SessionStart hook. So the
  runner half of "use the registered drivers" needs no new mechanism; a new driver only has to be added to the
  list, and that test pins it.
- **Not built: `plan/deadlines.md` has no driver.** Every plot edits it in the same three places: an Items row
  (inserted by date, so adjacent rows clash when two plots land near one date, and the daily Status refresh
  rewrites the `[ ]`/`[x]` cell of rows next to them), a `## Unscheduled` line (appended at the end of the list,
  the one spot every plot targets), and a line at the top of `## Change log`. `pr-resolve`'s union rule does not
  cover this file (`isUnionPath` lists telemetry shards, AUDIT, CRITIQUE, PHASE_CANDIDATES and lessons), and a
  plain union would double an Item row whose Status cell the daily refresh changed. So today a plot-on-plot
  conflict in `plan/deadlines.md` is aborted by the scan and handed to a Haiku run.
- **Not built, and inherent: GitHub says CONFLICTING for a few minutes.** GitHub's mergeability check and the merge
  button never run custom drivers, so after T merges plot A, plot B shows CONFLICTING until `pr-resolve` (a
  push-to-main workflow) merges `main` into B with the drivers registered. MD1 makes that run settle on its own;
  it cannot remove the wait.
- **Not built: Status cells after a merge.** A merge that lands another PR's shipped rows leaves a PR's Item Status
  cells stale until `node scripts/deadlines.mjs --write` runs; `check-deadlines` then fails the PR.

## Outcome

Two `plot` PRs that both add asap build-plan rows, Items, Unscheduled lines and Change log lines merge through
`pr-resolve` with no conflict markers, no Haiku run, and a `plan/deadlines.md` that `check-deadlines` accepts.

Size: see the per-phase sizes under Phases.

Measure: a two-branch fixture (two plots from one base, each adding asap rows plus an Item, an Unscheduled line and
a Change log line) merged by `pr-resolve`'s own `mergeMain` yields `merged: true` or "settled", an empty `rest`
list (no Haiku run), both sides' content present once each, and `node scripts/check-deadlines.mjs` green on the
result.

## Acceptance

- **A1** A merge driver `scripts/deadlines-merge.mjs` for `plan/deadlines.md`, three-way (base, ours, theirs):
  insertions at the same spot are kept from both sides (ours first, each side's order kept); an insertion beside a
  line the other side edited keeps both; a table row both sides edited is merged cell by cell, each cell from the
  side that changed it. It reuses the clash-settling core of `build-plan-merge.mjs` rather than copying it (that
  file exports it; ML1b's tests stay green).
- **A2** It never doubles a row an edited side changed: a base row one side edited and the other left alone
  appears once, in its edited form. A cell both sides changed to different values is left as ordinary conflict
  markers for a human, not guessed.
- **A3** It refuses the whole merge (conflict markers, exit 1) when the result gives an `## Unscheduled` id a
  second line, or an Item row text appears more often than either side had it. These pass no lint on their own
  line, so the driver is the only thing that would catch them (the ML1b precedent).
- **A4** Items stay in date order: where the clash settles into a block of Item rows only, that block is
  stable-sorted by its due date, so an Item inserted at the same spot by two plots with different dates is not
  left out of order.
- **A5** Registration, proven from the repo's own setup path: `.gitattributes` names the driver for
  `plan/deadlines.md`; the SessionStart hook in `.claude/settings.json` registers `merge.deadlines.driver`; and
  `MERGE_DRIVERS` in `scripts/pr-resolve.mjs` lists it, with the same command string. The existing
  `scripts/loop-pr.test.mjs` registration test passes unchanged and now covers it; the driver's own test adds the
  `.gitattributes` and hook assertions the way `build-plan-merge.test.mjs` does.
- **A6** `pr-resolve` re-derives the Item Status cells after any merge it commits: it runs
  `node scripts/deadlines.mjs --write`, restores `LIVE_DEADLINES.md` (the daily workflow owns it), and amends the
  merge commit when `plan/deadlines.md` changed, so the PR is not left red on `check-deadlines` by rows that
  shipped on `main`. A merge that touched neither file adds no commit.
- **A7** `mergeMain` in `pr-resolve.mjs` takes the repository directory as a parameter (default the repo root), so
  the measure below can run it against a scratch clone. The CLI behaviour is unchanged.
- **A8** The measure, as a `node --test` case: a scratch bare "origin" with `main` plus two plot branches built
  from real-shaped fixtures (the live `plan/deadlines.md` and the live build plan as the base, then each branch
  adds asap rows, an Item, an Unscheduled line and a Change log line). The first branch is merged into `main`; the
  scan path then runs `mergeMain` on the second. The test asserts a clean or union-settled result with no entry
  for the Haiku list, that every added row of both branches is present exactly once in both files, and that
  `check-deadlines` accepts the result.

Measure: `node --test scripts/deadlines-merge.test.mjs scripts/build-plan-merge.test.mjs scripts/loop-pr.test.mjs`
green, and root `npm test` green.

## Scope

- `scripts/deadlines-merge.mjs` and `scripts/deadlines-merge.test.mjs` (new).
- `scripts/build-plan-merge.mjs`: export the clash-settling core (the `git merge-file --diff3` pass and
  `resolveHunk`) so the new driver imports it; behaviour and tests unchanged.
- `.gitattributes`: `plan/deadlines.md merge=deadlines`.
- `.claude/settings.json`: the SessionStart `merge.deadlines.name` and `merge.deadlines.driver` command, beside
  the other two.
- `scripts/pr-resolve.mjs`: the `MERGE_DRIVERS` entry, `mergeMain(branch, cwd)`, and the Status re-derive step
  after a committed merge.
- No workflow edit is needed: `pr-resolve.yml` already calls `scan`; the new step lives in the script.
- Not in MD1: `plan/PHASE_CANDIDATES.md`'s check of the merged tree before the merge job merges (see Decisions),
  `LIVE_DEADLINES.md` (daily workflow), the AUDIT and CRITIQUE queues.

## Consumers to update

- `AGENTS.md` standing rule 1 (it lists the two drivers and what each refuses): add the third.
- `.github/workflows/README.md` where it describes `pr-resolve`'s union files.
- `plan/PHASE_CANDIDATES.md` line "Server-side merges skip the lessons merge driver": re-scope note (this plot
  does that edit).
- `skills/plot.md` Step 4 needs no change: its reconcile steps still edit the same places; the driver only makes
  them merge.

## Save / schema contracts

None. No runtime code, no persisted game state.

## Decisions made upfront — DO NOT ASK

- **A driver, and the same shape as ML1b, not a union path.** `pr-resolve`'s union rule counts lines and would
  double an Item whose Status cell the daily refresh edited; a driver reads the table's cells. The rows are an
  ordered list whose order is the due date, so the driver keeps ordering rules (A4) rather than a keyed union.
- **Reuse, don't copy.** `build-plan-merge.mjs` already settles the three clash shapes `plan/deadlines.md` has
  (same-spot insertions, insertion beside an edit, equal-length clashes of edited lines). MD1 exports that core
  and adds only the table-cell step and the dup check, so a fix to one driver reaches both.
- **Status is re-derived after the merge, not inside the driver.** The driver runs mid-merge; at that moment
  `plan/steps/01_build_plan.md` (sorted after `plan/deadlines.md`) may not be merged yet, so it cannot know what
  `--write` would say. `pr-resolve` runs `--write` once the whole merge is in the tree. A session merge by hand
  gets `check-deadlines` red, which names the fix. [T to confirm #1]
- **The Haiku run stays for what is genuinely ambiguous.** Both sides changing one cell to different values, or
  one side deleting an Item the other edited, is a human or Haiku call; the driver leaves markers. That is the
  right boundary: MD1 removes the Haiku run for the plot-on-plot case, not for every case.
- **Line-60 candidate (merge job checks the merged tree) stays a candidate, narrowed.** That row is about a clean
  server-side merge that is semantically wrong (three `lessons.md` bumps kept as three rows: no conflict, a red
  `main`). MD1 is about a merge that conflicts. They touch different jobs (the `pr-review.yml` merge job against
  `pr-resolve`), different failures and different fixes, so the row is not briefed here; MD1 adds one line to it
  saying so and pointing at this brief. [T to confirm #2]
- **Line-55 row (shard the AUDIT and CRITIQUE queues) is untouched.** `pr-resolve` already unions those files and
  plots do not edit them; a conflict there is not the one T reported.
- **No new `plan/deadlines.md` union path.** Adding it to `isUnionPath` would be the quick fix and it would double
  rows; rejected for the reason above.
- **Slot: anytime (T's word).** It costs a few minutes of CONFLICTING and a Haiku run per collision, not a
  broken `main`, and it blocks no open row. Its own rows sit after the last open row, away from the asap spot, so
  this plot does not itself collide with the next one.
- **Dated: not.** The deadline plan is T's; this is loop work that needs no time from T and blocks no window's
  goal, so it goes under `## Unscheduled` with "date not set".

## Phases

### MD1a — The `plan/deadlines.md` merge driver and its registration · M · closes A1, A2, A3, A4, A5 · requires nothing
Measure: `node --test scripts/deadlines-merge.test.mjs scripts/build-plan-merge.test.mjs scripts/loop-pr.test.mjs`
green; the fixtures include two plots inserting an Item, an Unscheduled line and a Change log line at the same
spot (both survive once), a plot beside a Status refresh (both survive), a Rows cell edited against a Status cell
(merged cell by cell), a doubled Unscheduled id (refused) and a conflicting cell (markers).
- Scope: `scripts/deadlines-merge.mjs`, its test, the export in `scripts/build-plan-merge.mjs`, `.gitattributes`,
  `.claude/settings.json`, the `MERGE_DRIVERS` entry.
- Consumers: AGENTS.md rule 1; the workflows README.
- Save/schema: none.
- Tests: the new file, run on synthetic file pairs (as ML1a/ML1b) and one fixture built from the live file; a
  registration test; the existing ML1b tests unchanged.
- Verify gate: root `npm test`.

### MD1b — `pr-resolve` settles a plot-on-plot merge on its own, and proves it · M · closes A6, A7, A8 · requires MD1a
Measure: the A8 `node --test` case (two plot branches through `mergeMain`, no Haiku entry, both sides present once,
`check-deadlines` green) passes, and `node --test scripts/loop-pr.test.mjs` stays green.
- Scope: `scripts/pr-resolve.mjs` (`mergeMain(branch, cwd)`, the re-derive step), a test file for it (the scan
  logic is covered in `scripts/loop-pr.test.mjs` today; the fixture repo lives in a new
  `scripts/pr-resolve.test.mjs`), the candidate's re-scope line in `plan/PHASE_CANDIDATES.md`.
- Consumers: `.github/workflows/README.md`'s `pr-resolve` paragraph.
- Save/schema: none.
- Tests: the A8 fixture over a scratch bare origin; a case where the merge touches neither file (no extra
  commit); a case with a genuinely conflicting cell (the branch is listed for Haiku, as before).
- Verify gate: root `npm test`.

## Tests matrix

See each phase. Both phases are plan/scripts only; no mechanics or mobile suite is in scope.

## Verify gate

Root `npm install` then `npm test` (the scripts' `node --test` files run under it).

## Commit body template

```
deadlines: a merge driver, so two plots stop conflicting in plan/deadlines.md

Every plot edits the Items table, the Unscheduled list and the top of the
Change log, and the daily refresh rewrites Status cells beside them, so the
second of two open plot PRs conflicted when the first merged and went to a
Haiku run. The driver unions same-spot insertions, merges a row both sides
edited cell by cell and refuses a doubled Unscheduled id; pr-resolve already
registers drivers on the runner and now re-derives Status after the merge.
```

## DoD

A1-A8 ticked.

## Follow-ups (not in these phases)

- **The merge job's check of the merged tree** (PHASE_CANDIDATES, line-60 row): still a candidate, narrowed to the
  silent-clean-merge case.
- **The few minutes of CONFLICTING** after T merges one plot cannot go below the time `pr-resolve` takes without
  changing GitHub's own merge; if T finds the wait itself the problem, the candidate is to dispatch `pr-resolve`
  from the merge event rather than the push, and it needs T's say (workflow edit).
- **Other shared files plots touch** (`plan/reflexes.md`, `plan/bearings.md` echoes of AGENTS.md rules): not seen
  conflicting; add a driver only on a recorded sighting.
