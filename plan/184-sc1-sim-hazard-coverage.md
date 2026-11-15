# 184 — The sim report counts the hazards the Breakwater plays

> The nightly sim report's hazard coverage counts the seven puzzle hazards the Breakwater's nodes play, where today it counts six hazards no Breakwater node plays and reports none reached.

## Why

### Sources

- **T, 2026-11-14 (attended, after the Chapter 1 gap audit, `plan/chapter1-gaps.md`):** "plot whatever you think you can that doesn't need to be attended".
- **The report** (`docs/reports/sim/latest.md`, 2026-11-14, build 7f981f29): hazards, 6 in Chapter 1, 0 reached tonight, 0 on any night on record, while every persona clears the chapter and resolves the hazard nodes.

### What exists today

- **The universe.** `chapterHazards` (`axiomancer-mechanics/src/World/chapter1-content.ts`) returns every entry of `HAZARD_LIBRARY`, the three-round board's hazards, for the chapter's hazard nodes.
- **What the Breakwater plays.** Its seven hazard nodes each open one puzzle from `BREAKWATER_HAZARD_PUZZLES` (phase HP6, and the Clifftop chapel since phase SS1c). The puzzle's end is logged through `recordHazardEnded` (`axiomancer-mobile/state/hazard/puzzle-store-actions.ts`) with the id it carries.
- **The count.** `scripts/sim-report.mjs` (`universeOf`) compares the logged hazard ids with the universe's ids. The two sets do not meet, so the row reads 0 of 6.
- Which id the puzzle path logs was not read line by line; the chunk checks it and makes the two sides agree.

### The small version first

One function names the wrong set. The fix is that function and its test. One chunk.

## Design

- `chapterHazards` returns what the chapter's hazard nodes play: for the Breakwater, the seven puzzles of `BREAKWATER_HAZARD_PUZZLES`, each with its node. A chapter whose hazard nodes still run the three-round board keeps the library's hazards.
- The id on each entry is the id the run log's `hazard-ended` records for that puzzle. If the two differ today, the content side follows the log, so history lines already written stay readable.
- The report's row then reads the reached puzzles of seven. Nights on record before the fix keep their lines; the "any night" column counts from what the history holds.

### Decisions made upfront (do not ask)

- No change to what the app logs unless the logged id cannot name a puzzle at all; then the log gains the puzzle id and the Worker's coverage query reads it.
- No change to the hazards themselves.

### Out of scope

- The Clifftop chapel's placeholder puzzle pick (T's).
- Coverage of the keep key and the Suppliant's Ring, which the report lists as not reached.

## Acceptance

- **A1** The chapter content lists seven hazards for the Breakwater, one per hazard node, with the ids the run log records; a test pins the seven and fails if a hazard node has no entry. The sim report built from a fixture run that clears the chapter shows hazards reached above zero of seven.

## Open questions

None.

## Chunks

Measure: 1 open · 0 closed · next A2
- [ ] **184.1** Chapter content lists the seven puzzle hazards; the report counts them · S · closes A1 · needs — · alias: SC1a
  - Mechanics: `chapterHazards` in `World/chapter1-content.ts` and its test. Read `puzzle-store-actions.ts` for the logged `hazardId` first and match it.
  - Scripts: `scripts/sim-report.mjs` only if the universe's shape changes; its test gets a fixture with puzzle hazard events. Backend `reports.ts` only under the upfront decision above.
  - Check siblings: `docs/reports/chapter1-enemies.md`'s generator and anything else that reads `content.hazards`.
  - Measure: `npm run verify -w axiomancer-mechanics` and the root `npm test` pass.
