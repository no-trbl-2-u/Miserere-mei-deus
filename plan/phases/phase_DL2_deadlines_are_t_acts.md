# Phase DL2 — Every deadline item is something T does

## Sources

- T, in conversation, 2026-10-28. Asked to fill the six days before the MVP
  that had no piece, T said: *"yes, but make sure each item is something I need
  to do, not just running an agent against a phase row. (For instance, what do I
  need to plot, pitch, or decide on)"*, then: *"Realistically every item in
  deadline should be this way"*. Asked whether to plot that change and fill the
  six days in the same PR, T answered *"Yes"*.
- `plan/deadlines.md` (the whole plan, T, 2026-10-19): its `## Items` table, its
  `## Unscheduled` section, its MVP schedule and its change log. On 2026-10-28
  the table held 61 Items: 22 `T`, 4 `needs plot` and 35 that name loop rows, 17
  of those still open.
- `scripts/deadlines-lib.mjs` (`ITEM_ROW`, `parseItems`, `parseRowsCell`,
  `derivedStatus`, `rewriteItemStatus`, `itemNeed`, `dueNeeds`, `reminderText`,
  `liveMarkdown`), `scripts/deadlines.mjs`, `scripts/check-deadlines.mjs`, their
  tests, `scripts/deadlines-merge.mjs` (MD1a, cell-wise), `scripts/pr-resolve.mjs`
  (`rederiveStatus`), `.github/workflows/deadlines.yml`, `LIVE_DEADLINES.md`.
- `skills/plot.md` §2 Step 4 and `skills/messy.md` (the reconcile step, DL1c),
  `skills/ship-a-phase.md` (runs `--write` on a tick).
- Phase DL1 (`plan/phases/phase_DL1_deadline_plan_integrity.md`): coverage, the
  derived Status, the reconcile step. This phase changes what an Item *is*; it
  keeps every DL1 guarantee.

## Outcome

Every Item in `plan/deadlines.md` names an act only T can do: plot, pitch,
decide, pick, author, play, review, merge or tag. Loop work no longer has dates
of its own; each open loop row is listed under the T act it unblocks, in a new
`Waits on` column, so the date T sees is the day T acts and the loop rows it
needs are visible beside it. The reminder lists T's acts and says, for each,
whether the loop has finished what it waits on.

## Size

See `## Phases`: two phases, `size:multi-phase`.

## Acceptance

- **A1** The Items table gains a sixth column, `Waits on`: a comma-separated
  list of build-plan phase ids, or `-`. `parseItems` returns it as `waitsOn:
  string[]` (empty for `-`). A five-column row still parses, with `waitsOn: []`,
  so `main` stays green between DL2a and DL2b.
- **A2** **Coverage** (A2 of DL1) counts an id named in `Waits on` exactly like
  one named in `Rows`: every open row is named once, in one Item's `Rows` or
  `Waits on`, or under `## Unscheduled`. An id named twice anywhere in the table,
  or in the table and under `## Unscheduled`, fails, naming both places. An id in
  `Waits on` with no build-plan row fails, as in `Rows`.
- **A3** **An Item's `Rows` names only T's acts.** The lint fails on an Item
  whose `Rows` names a build-plan row that does not wait on T (not
  `(attended)` and not `owner-led`), naming the Item and the row and saying:
  move it to the `Waits on` cell of the T act it unblocks, or under
  `## Unscheduled`. `T` and `needs plot` stay valid `Rows` values. Shipped and
  skipped rows are exempt, so history never fails the lint. Enforced from DL2b.
- **A4** A phase Item's Status is still derived from its `Rows` only (DL1 A6);
  `Waits on` never ticks an Item. A `needs plot` Item becomes hand-tickable: the
  plot that answers it ticks it `[x]` and puts the new rows under the `Waits on`
  of the T act that follows, or under `## Unscheduled`.
- **A5** The reminder (`--remind` and `LIVE_DEADLINES.md`) lists every open Item
  due within the horizon or overdue, earliest first, each with what it needs:
  `needs a plot`, `needs you`, or `needs you; the loop still owes <ids>` when a
  `Waits on` row is open. An Item whose `Rows` are attended rows with unmet
  `Requires` reads `the loop still owes <ids>` too, never silence. The output's
  header line and the session-start hook are unchanged otherwise.
- **A6** `plan/deadlines.md` is converted per `## The conversion` below: every
  open Item that names loop rows is either renamed to the T act it serves or
  folded into the `Waits on` of an existing T act; the shipped loop-only Items
  are dropped; every `T`, attended and `needs plot` Item keeps its date. The
  Items prose and the MVP schedule prose describe the new rule in T's words.
- **A7** `skills/plot.md` §2 Step 4 and `skills/messy.md`'s reconcile step say
  that a new loop row goes under the `Waits on` of the T act it unblocks (or
  `## Unscheduled`), never into an Item of its own, and that a plot answering a
  `needs plot` Item ticks it. The DL1c fixture test is updated to assert the new
  wording. `CLAUDE.md`'s deadline paragraph says the Items are T's acts.
- **A8** `scripts/deadlines-merge.mjs` merges a six-column Items row cell by cell
  as it does a five-column one, and its duplicate-row refusal still fires; a
  fixture pins both. `pr-resolve`'s `rederiveStatus` needs no change and a test
  says so.

Measure: on the converted `plan/deadlines.md`, `node scripts/check-deadlines.mjs`
passes, every Items row's `Rows` cell is `T`, `needs plot` or a row that waits
on T, and `node scripts/deadlines.mjs --today=2026-11-02` lists only T's acts,
each open `Waits on` row named beside its act.

## Scope

`scripts/deadlines-lib.mjs`, `scripts/deadlines.mjs`, `scripts/check-deadlines.mjs`,
`scripts/deadlines-merge.mjs` and their tests; `plan/deadlines.md` (the table,
the Items prose, the MVP schedule prose, a change-log line); `skills/plot.md`,
`skills/messy.md`; `CLAUDE.md`'s deadline paragraph. No engine or app code, no
game data, no `.claude/**` edit, no workflow edit.

## Consumers to update

`skills/ship-a-phase.md` only if its `--write` paragraph names the Items' shape
(it names the command, so likely no change); `docs/dev-tools.md` if it describes
the table. The main chat's daily deadline digest reads `LIVE_DEADLINES.md` and
the MVP schedule; it needs no repo change, and DL2b's PR body says what it will
now read.

## Save / schema contracts

None. One new Items column; the build plan's row format is unchanged.

## The conversion

The open Items that name loop rows on 2026-10-28, and what each becomes. A row
already named under a T act's `Rows` keeps its place. Where a loop row has no T
act after it before v0.3, it goes under the demo of its window.

| Item today (due) | Becomes |
|---|---|
| First character playable (Oct 30): CH1a-CH1d, CH1f, DF1a-DF1d | Dropped; CH1f goes under `Waits on` of "Mid-MVP check" (Nov 9), the shipped rows with the dropped Item. CH1e is its own Item since this plot (Oct 29) |
| Pick the item icons (Oct 27): IT1b | Kept: IT1b is owner-led (art is T's) |
| W1 demo part 2 (Nov 1): HP4e | Kept: attended |
| Plot Chapter 1's enemies (Nov 2): B2 | Kept: owner-led |
| The authoring patterns from the kept set (Nov 5): HP4f | Dropped; HP4f under `Waits on` of "Plot the hazard swap" (Nov 19) |
| The band clocks (Nov 6): HP4g | Dropped; HP4g under `Waits on` of "Plot the hazard swap" (Nov 19) |
| The Breakwater's questline on the map (Nov 8): QL1a-QL1d | Dropped; QL1c, QL1d under `Waits on` of "Write the Breakwater's quest line" (Nov 10, QL1e) |
| A first death comes back dying (Nov 8): DY1a-DY1d | Dropped; DY1b-DY1d under `Waits on` of "Mid-MVP check" (Nov 9) |
| Write the Breakwater's quest line (Nov 10): QL1e | Kept: attended |
| T's quest line in the game (Nov 13): QL1f | Dropped; QL1f under `Waits on` of "Play your quest line on the preview build" (Nov 13) |
| The calibration set (Nov 18): HP2d | Dropped; HP2d under `Waits on` of "Calibration solves" (Nov 28, HP2e) |
| Upgrades proven on the Act 1 boss (Nov 25): UP1h | Dropped; UP1h under `Waits on` of "W4 demo: an Act 1 clear" (Dec 14) |
| Bands on the calibrated measure (Nov 30): HP2f | Dropped; HP2f under `Waits on` of "W3 demo: a four-chapter walk" (Nov 30) |
| Relic pass session (Dec 5): B1 | Kept: owner-led |
| Combat playtest part 2 (Dec 12): R12 | Kept: attended |
| Android smoke test (Dec 23): LG1h | Kept: attended |
| Play the Defender test deck (Nov 12): DF1f | Kept: attended (added by this plot) |
| Pick the title plate and four arena backgrounds (Nov 7): TP1b | Kept: owner-led (added by this plot) |

The 18 shipped loop-only Items (Status `[x]`, `Rows` naming loop rows only) are
dropped: the build plan and `plan/ARCHIVE.md` keep their record, and the change
log line names them. Accepted at merge (default).

## Decisions made upfront — DO NOT ASK

- **A `Waits on` column, not a second table.** One row per T act keeps the
  reminder, the merge driver and the reconcile step on one table; a separate
  loop table would be a second list to keep in step, which is DL1's defect.
- **Loop rows lose their own dates.** A loop row's date was only ever a guess at
  when the loop would finish; T's act is what has a real date. The reminder shows
  the loop rows an act still waits on, so a late loop row is still visible, on
  the day it matters.
- **Coverage stays every open row, named once** (DL1 A2). A row in `Waits on`
  counts; `## Unscheduled` keeps its meaning. A loop row that feeds two acts is
  named under the first.
- **A3 exempts shipped rows** so a historical Item never reddens CI, and is
  enforced only from DL2b, when the table is converted, so DL2a lands on today's
  table without a failure.
- **Slot asap.** The daily reminder T reads every morning is the thing being
  changed, and the MVP is Nov 16; two ticks ahead of the questline rows cost
  less than two weeks of a reminder that lists loop rows. Accepted at merge (default).
- **No new D-number.** This sharpens DL1's Items rule; the change log records
  T's words.

## Tests matrix

- `scripts/deadlines.test.mjs`: A1 (six- and five-column rows parse; `-` is
  empty), A4 (`Waits on` never ticks), A5 (an act with an open `Waits on` row
  reads `the loop still owes`; one with all shipped reads `needs you`; an
  attended `Rows` row with unmet `Requires` is never silent).
- `scripts/check-deadlines.test.mjs`: A2 (an id in `Waits on` covers; twice
  fails; table and Unscheduled fails; unknown id fails), A3 (a loop row in
  `Rows` fails; an attended, owner-led, shipped or skipped one passes; `T` and
  `needs plot` pass), plus the real-files pass.
- `scripts/deadlines-merge.test.mjs`: A8's six-column fixtures.
- The DL1c skill fixture test: A7's new wording.

## Verify gate

The root `npm test` for both phases. No workspace verify: nothing under
`axiomancer-mechanics/` or `axiomancer-mobile/` changes.

## Commit body template

```
<type>: <what changed> — phase DL2<x>

<why, in one or two lines>

Acceptance: A<n> <how it was proved>
```

## DoD

A1-A8, all ticked, each naming the test, command or file that proves it.

## Follow-ups (out of scope)

- **Deriving a `T` Item's Status** stays out (DL1's follow-up): nothing records
  that T did a thing.
- **The window prose** (`### W<n>`) still lists loop rows by name for context;
  it is prose, not the table, and no lint reads it.

## Phases

### DL2a — The `Waits on` column and the reminder · M · closes A1, A2, A4, A5, A8 · requires nothing
Measure: a six-column fixture parses, covers through `Waits on`, and its
reminder names the open `Waits on` rows beside the act; the real five-column
`plan/deadlines.md` still passes `check-deadlines` unchanged.
- Scope: `scripts/deadlines-lib.mjs`, `scripts/deadlines.mjs`,
  `scripts/check-deadlines.mjs` (A2 only), `scripts/deadlines-merge.mjs`, their
  tests.
- Consumers: none; `LIVE_DEADLINES.md` regenerates on the next `--write`.
- Tests: per the matrix, A1, A2, A4, A5, A8.
- Verify gate: the root `npm test`.

### DL2b — The table converted and the rule enforced · M · closes A3, A6, A7 · requires DL2a
Measure: `check-deadlines` passes on the converted table and fails a fixture
with a loop row in `Rows`; `--today=2026-11-02` lists only T's acts.
- Scope: `plan/deadlines.md` per `## The conversion` (plus any open loop row
  plotted after 2026-10-28, placed by the same rule), the A3 rule in
  `scripts/check-deadlines.mjs` and its test, `skills/plot.md`,
  `skills/messy.md`, the DL1c fixture test, `CLAUDE.md`.
- Consumers: the PR body says what the daily digest now reads.
- Tests: A3 per the matrix, A7's fixture, the real-files pass.
- Verify gate: the root `npm test`.
- Note: re-read the build plan when this phase runs; rows shipped or plotted
  since 2026-10-28 change the table. Conversion is by hand from the table above,
  never generated.
