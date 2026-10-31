# Phase TF1 — Two tooling fixes: ticked plot Items leave the reminder; truth runs keep one blank line in AUDIT

## Sources

- `/plot asap` request from T, in session, 2026-10-31, during a `/heads-down` run. T picked "/plot asap, join this
  run" to land the two bugs found that day.
- **Bug 1, the reminder.** `scripts/deadlines-lib.mjs` `itemNeed` returns `needs a plot` for every Item whose Rows
  cell is `needs plot`, before it checks `item.done`. A `needs plot` Item that `/plot` has ticked `[x]`
  (`skills/plot.md` Step 4) therefore still appears in the session-start DEADLINE REMINDER. On 2026-10-31 that was the
  four event-kind Items plotted as ET1a-ET1d, which were ticked on Oct 30.
- **Bug 2, AUDIT.md.** `scripts/measured-compare.mjs` `fileDrifts` puts new drift rows under `## Pending` as
  `[heading, '', blocks, '', rest]`, where `rest` already begins with the blank line under the heading. So every
  measured-truth run that files a new drift leaves two blank lines in a row. `scripts/check-plan-queues.mjs` then fails
  the root `npm test` until someone removes the line by hand: `8530e74e7` on 2026-10-30, and again in plot PR #1152
  after `ef02913e1`.
- D84 (the PR flow), D93 (`/plot`), phase DL1c and DL2b (the reminder's contract: every Item is a T act, and a
  `needs plot` Item a plot answers is ticked by hand).

## Outcome

The reminder never lists an Item T has ticked, and a measured-truth run that files new drifts leaves `plan/AUDIT.md`
passing `check-plan-queues`.

Size: S

## Acceptance

- **A1** `itemNeed` returns `null` for a `needs plot` Item whose Status is `[x]`, and still returns
  `{ kind: 'needs a plot', … }` for an open one. `scripts/deadlines.test.mjs` gains "itemNeed: a ticked needs-plot
  Item is silent", which uses a fixture Item that is `[x]` with `needs plot`.
- **A2** `fileDrifts` leaves exactly one blank line between `## Pending` and the first new row, and one between the
  last new row and the row that was first before. `scripts/measured-compare.test.mjs` gains "fileDrifts: new rows
  keep single blank lines". It runs the existing `# Audit\n\n## Pending\n\n### [ ] [bug] old…` fixture with one and
  with two drifts and asserts that no `\n\n\n` appears. The existing "a new row goes under ## Pending" test still
  passes.

Measure: `node --test scripts/deadlines.test.mjs scripts/measured-compare.test.mjs` passes, and
`node scripts/deadlines.mjs --remind` on `main` no longer lists the four ticked event-kind Items.

## Scope

- `scripts/deadlines-lib.mjs` (`itemNeed`: the `done` check comes before the `needs plot` branch) and
  `scripts/deadlines.test.mjs` (plus its fixture, if the fixture lives in that file).
- `scripts/measured-compare.mjs` (`fileDrifts`: drop the leading blank lines of `rest`, or do not add a second
  `''`) and `scripts/measured-compare.test.mjs`.
- Does not touch any HW1 file (`skills/heads-down.md`, `scripts/loop-pr.test.mjs`, `scripts/claims*`, `skills/march.md`,
  `skills/ship-a-phase.md`, `package.json`).

## Consumers to update

- None. The reminder and the `--write` Status derivation read `itemNeed` and `derivedStatus`, and `derivedStatus` is
  unchanged. `measured-truth.mjs` calls `fileDrifts` unchanged.

## Save / schema contracts

None.

## Decisions made upfront — DO NOT ASK

- **A ticked Item is done, whatever its Rows cell says.** That is how `T` Items already behave (`if (item.done)
  return null`). `needs plot` Items follow the same rule.
- **Do not clean old double blank lines in `plan/AUDIT.md`.** `main` passes `check-plan-queues` today. The fix stops
  new ones.
- **One phase, one PR.** The two fixes are small, in separate files, and both are tooling.

## Tests matrix

| Suite | Subject |
|---|---|
| `scripts/deadlines.test.mjs` | ticked `needs plot` Item is silent; open one still needs a plot |
| `scripts/measured-compare.test.mjs` | new drift rows keep single blank lines (one and two drifts) |

## Verify gate

Root `npm test`.

## Commit body template

```
TF1: ticked plot Items leave the reminder; truth runs keep one blank line

Closes A1, A2 (plan/phases/phase_TF1_reminder_and_audit_fixes.md).
```

## DoD

A1 and A2 ticked.

## Follow-ups (out of scope)

- `check-deadlines.mjs` could warn when a `needs plot` Item is `[x]` but its name still says "needs plot". Not needed:
  the reminder is what T reads.
