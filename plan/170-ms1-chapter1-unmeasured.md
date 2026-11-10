# 170 — Chapter 1's unmeasured numbers

> T's tuning acts for Chapter 1 ask questions no report answers: what level the player is on reaching the boss, what a run earns and what the village costs against it, and how the boss fight goes in the tuning table. This spec makes the existing reports print those numbers. It measures; it tunes nothing.

## Why

### Sources

- **T, 2026-11-10:** after a gap audit of the Breakwater, chose "Measure the unknowns" to plot now.
- **T's queued acts (`plan/deadlines.md`):** "Re-tune Chapter 1's enemies ... Also check the player reaches the level 8 Saint at level 8-10" and "Decide the stat scaling".
- **The audit's "not measured" list (2026-11-10, read from the reports below):** player level on arrival at the boss, purse income per run, shop and upgrade costs against it, the boss in the turns-and-VITAE table, the Defender deck against the boss.

### What exists today (read 2026-11-10, at 999d9de0)

- **`docs/reports/sim/latest.md`** (`scripts/sim-run.mjs`, `scripts/sim-report.mjs`; stamp 11e75a4b, 5 runs per persona): level and VITAE per region after the region's last node, and at the run's end. It prints an average end level of 18.6 to 21.6. It does not print the level on arrival at any one node, and it prints nothing about shillings.
- **`docs/reports/chapter1-enemies.md`** (`axiomancer-mechanics/src/CLI/chapter1-enemies.cli.ts`; stamp mv1d-fdf6c359c): every foe in `BW_ENCOUNTER_FOES` and `BW_ELITE_DRAWS` against four lane decks at player levels 8 and 10. The boss is in neither list, so it has no row.
- **`docs/reports/measured/latest.md`** (`scripts/measured-truth.mjs`; stamp ff017da): the boss node at player level 8 for the grey, Blood Price and Elementalist decks. No Defender deck.
- All three are measurements, not gates (D57), and not a licence to tune (D88).

## Design

- **Arrival at the boss.** The sim report gains one table: for each persona, the player's level, VITAE and shillings on arriving at the Chapter 1 boss node, as the mean and the lowest and highest run. The boss node is read from the map data, never typed into the report code.
- **A run's money.** The same report gains, per persona: shillings earned over a run, shillings spent and on what kind (village rest, shop card, shop gear, Anvil action), and the purse on reaching each village. Beside it, the current price of each kind, read from the game's own price tables, so income and prices sit in one place.
- **The boss in the tuning table.** `chapter1-enemies.md` gains the boss as a row at its node's level, against the same four lanes at the same player levels. The Defender deck is the tuning table's own; `measured/latest.md` is left as it is.
- **Sample size is stated.** Each new table prints its run count. Where the sim's personas never reach a place (the first report reached 0 of 6 hazards), the table says "not reached" for that cell.

### Decisions made upfront (do not ask)

- No number in the game changes. No price, level, VITAE or drop rate is edited by this spec.
- No new report file: each number joins the report that already owns its subject.
- The reports stay measurements (D57): nothing here fails a test on a value.

### Out of scope

- Hazard solve times. The sim's personas do not play hazards, and a human solve time needs T at the board.
- Stat scaling itself (+20% and +10% per point). It needs T's play session; the arrival table gives it a level to reason from.
- Chapters 2 to 4.

## Acceptance

- **A1** `docs/reports/sim/latest.md` has a table giving, per persona, the level, VITAE and shillings on arrival at the Chapter 1 boss node (mean, lowest, highest) with its run count, and the node id comes from the map data.
- **A2** The same report gives, per persona, shillings earned and spent per run by kind, the purse on reaching each village, and the current price of each kind read from the game's price tables.
- **A3** `docs/reports/chapter1-enemies.md` has a row for the Chapter 1 boss at its node's level against all four tuning lanes at both player levels.
- **A4** Each generator's test covers the new table from a fixture run, including a persona that never reaches the boss ("not reached").

## Open questions

1. **[T to confirm #1]** The arrival table reports the sim's personas as they play today. Default: yes, unchanged personas. Or: add one persona that walks every node before the boss, to show the highest level a thorough player reaches.

## Chunks

Measure: 4 open · 0 closed · next A5

- [ ] **170.1** The sim report says what the player has on reaching the boss, and what a run earns and spends · M · closes A1, A2, A4 · needs — · alias: MS1a
  - `scripts/sim-run.mjs` and the run log it reads: keep the level, VITAE and purse at each node arrival, and each shilling gain and spend with its kind, if the log does not hold them already.
  - `scripts/sim-report.mjs`: the arrival table and the money tables, with the prices read from the mechanics package's price data.
  - `scripts/sim-report.test.mjs` and `scripts/sim-run.test.mjs`: fixture runs for both tables, and the "not reached" cell.
  - Regenerate `docs/reports/sim/latest.md` with the run count the nightly uses.
  - Measure: the regenerated report in the PR, with the boss arrival row quoted in the PR body.
- [ ] **170.2** The tuning table has the boss · S · closes A3, A4 · needs — · alias: MS1b
  - `axiomancer-mechanics/src/CLI/chapter1-enemies.cli.ts`: the boss joins the rows, found from the map data.
  - `chapter1-enemies.engine.test.ts`: the boss row is present for every lane and level.
  - Regenerate `docs/reports/chapter1-enemies.md`.
  - Measure: the regenerated report in the PR, with the boss rows quoted in the PR body.
