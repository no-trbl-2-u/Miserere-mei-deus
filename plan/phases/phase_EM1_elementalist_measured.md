# Phase EM1 — The Elementalist in measured truth, with a self-burn metric

## Sources

- T, 2026-10-25 (conversation, after merging #890): "Plot them all but put all the different plots on to different
  PRs. One plot run, one PR." This brief is that run for the candidate "The Elementalist in measured truth, with a
  self-burn metric" (`plan/PHASE_CANDIDATES.md`, T's `/messy` of 2026-10-24).
- Part plan: `plan/revamp/cards.md` "The Elementalist after the swarm (T, 2026-10-24, `/messy`)", the **Measured**
  bullet, proposal (b) and **T's calls (2026-10-24)**.
- T's call (2026-10-24): "the 20 are the lane's ceiling; measure it against Blood Price's ceiling (its 20-card test
  deck). Add two sampled columns: random 20-of-30 draws from the Elementalist pool (the lane's spread), and random
  20-card decks from the mixed 60-card pool of both trial sets (the median a player who takes what the rewards offer
  would hold)."
- The evidence: the lane measured once by hand at `1fb78ac87` (300 runs, seed 1): 100% in every Act 1 ledger cell,
  lowest-VITAE p10 never below 0.89, mean VITAE taken per fight 5.8 against grey's 41.0. Live play
  (`docs/reports/playtest-elementalist-act1-2026-10-24.md`): no agent lost VITAE to a foe after round 3, and the
  VITAE the deck does lose is its own INFERNO.
- Decisions: D57 (a measurement, not a gated baseline), D88 and D99 (content per surface; nothing here is content),
  R12a (`plan/phases/phase_R12a_measured_truth_baseline.md`, the report this extends), UP1g (the `+half` deck, the
  pattern for an extra deck id), D103 (the Spell law, already in the numbers this measures).
- Code read while shaping this:
  - `axiomancer-mechanics/src/Combat/combat.measured-truth.ts`: `MEASURED_DECK_LANES = ['grey', 'blood-price']`
    (`:28`), `measuredTruthCells` builds one deck per lane id from `getCardLane(id).testDeck`, plus the `+half`
    decks; every deck is played by `simulateHazardPatternCombatDetailed` with the greedy witness.
  - `combat.measured-truth.test.ts`: `deckCount` is derived from the two lists; the UP1 block pins
    `Object.keys(report.decks)` to `['grey', 'blood-price', 'blood-price+half']`.
  - `CLI/measured-truth.cli.ts`: the table and `--json`.
  - `scripts/measured-truth.mjs` and `scripts/measured-compare.mjs`: `historyLine` copies a fixed set of cell
    fields, `renderLatest` prints one column per deck × spread, `compare` skips a cell with no previous match.
  - `Cards/card.lanes.ts`: `getCardLane`, `laneRewardPool(laneIds)` (the merged, de-duplicated `cardIds`).
    `blood-price.cards.ts` and `elementalist.cards.ts` each carry 30 lane cards and a 20-card, one-copy test deck;
    Blood Price's set also carries `GREY_CURSE`, which is not a lane card.
  - The self-burn primitive exists: `programTurnStart` (`Combat/combat.card-program.ts`, about `:1192-1201`) takes
    your INFERNO at the start of your turn and emits `{ kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO',
    amount: lost, target: 'self' }` (`combat.encounter.types.ts:393`). It lands in `state.log`, which
    `runOneEncounter` (`combat.encounter.sim.ts`) already folds at summary time.
  - `playerHpTaken` in `runOneEncounter` counts only the VITAE lost across `resolveThreatPhase` when a threat fired.
    The turn start (and so the INFERNO burn) runs in `upgradeablePlayPhase` (`startTurn` at about `:380`), so
    `playerHpTakenMean` today excludes self-burn. The new column adds what it leaves out; it does not change it.
  - `.github/workflows/measured-truth.yml`: 40-minute timeout. The measure step took 28 s for 3 decks on
    2026-10-25 (run 40173896467). Its commit step cannot push `main` under the `verify-gate` ruleset
    (`plan/NEEDS_T.md` `ruleset-bypass-for-t`), so the report reaches `main` only through a PR today.

## Outcome

`docs/reports/measured/latest.md` measures the Elementalist's 20-card test deck beside grey and Blood Price in
every Act 1 ledger fight. It also measures two sampled deck families, the lane's spread and a mixed-pool median,
and gives every deck a figure for the VITAE it loses to its own weather.

Size: M

## Acceptance

- **A1** `elementalist` is in `MEASURED_DECK_LANES`. `measuredTruthCells` reports one `elementalist` cell per
  ledger fight × spread, its deck read from the lane registry. `combat.measured-truth.test.ts` asserts it: the cell
  count, the registry check for every measured lane, and the deck-key order.
- **A2** Two sampled deck families are measured:
  - `elementalist~20of30`: 20 distinct cards drawn from the Elementalist lane's 30.
  - `mixed~20of60`: 20 distinct cards drawn from `laneRewardPool(['blood-price', 'elementalist'])` (60 cards).

  Each family is `sampleDraws` seeded draws (default 16; option `sampleDraws`, CLI `--draws=`). Each draw is played
  as a deck under the run's `runs` and `seed`. A family cell carries the **median over its draws** of every metric,
  in the ordinary cell fields, so `compare` and the table read it like any deck. It also carries the range over its
  draws: `winRateMin`, `winRateMax`, `lowestVitaeFractionP10Min` and `lowestVitaeFractionP10Max`.
- **A3** The draws are deterministic and isolated. The same `seed` and `sampleDraws` give the same draws and the
  same cells; a different seed gives different draws. Drawing never reads or writes the global RNG (`getRng`). Each
  family's draws are listed in the report's `decks` entry, so any draw can be replayed as a plain deck. Tests pin
  all three.
- **A4** Every cell carries `selfBurnMean`: the mean VITAE per fight the player lost to their own INFERNO. It is the
  sum of `dot-tick` amounts with `target: 'self'` and `effectId: 'inferno'` in the run's transcript, carried from
  `runOneEncounter` through the sim stats to the cell. `playerHpTakenMean` keeps its meaning (VITAE lost to the
  foe's threat). A test proves the sum on a fight that burns the player, and grey and Blood Price cells read exactly
  0.
- **A5** The report shows it all:
  - `historyLine` carries `selfBurnMean` and the A2 range fields.
  - `latest.md`'s fight table gains the `elementalist` columns.
  - A **Sampled decks** table gives each family per fight × spread as `median win% / median p10 (lowest-highest
    win%)`.
  - A **Self-burn** section gives, per deck, mean VITAE per fight taken from foes against lost to its own weather:
    over all cells and at the four doors.
  - The **Decks** section names each family's pool size, draw size, draw count and mean dead-card rate. It does
    not list the 32 draws; those live in `history.jsonl`.

  `measured-compare.test.mjs` covers a family cell, the range text and the self-burn section. `compare` files no
  drift for a deck id the previous line lacks.
- **A6** The docs say it: the workflow's header comment, `docs/truth-sources.md` "Measured truth", the measured-truth
  line in `CLAUDE.md`, and the **Measured** bullet of the part plan section (a pointer to the regenerated report
  and its commit).
- **A7** `latest.md` and one `history.jsonl` line are regenerated in the PR at the defaults (300 runs, seed 1, 16
  draws), and the PR body cites them by commit. The PR body records the run's wall time, and the run fits the
  workflow's 40-minute timeout. If it does not, the PR lowers the default `sampleDraws` to fit, never `runs`, and
  says so.

Measure: `npm run measured:truth -- --dry-run` prints a table with `elementalist` columns, a Sampled decks table
for `elementalist~20of30` and `mixed~20of60`, and a self-burn figure for every deck. `npm run verify -w
axiomancer-mechanics` and the root `npm test` pass.

## Scope

- `axiomancer-mechanics`:
  - `Combat/combat.measured-truth.ts`: the lane list, the two families (`MEASURED_SAMPLED_FAMILIES`, a small
    table of `{ id, laneIds, drawSize }`), the seeded draw, the median and range aggregation, `selfBurnMean` on the
    cell, and the family `decks` entry.
  - `Combat/combat.encounter.sim.ts`: `runOneEncounter` folds the self-burn total from `state.log`, and the
    aggregate stats carry `selfBurnMean`.
  - `CLI/measured-truth.cli.ts`: the `--draws=` flag, plus the family and self-burn columns in the printed table.
  - The two test files.
- Root `scripts/`: `measured-compare.mjs` (`historyLine`, `renderLatest`, and the digest section if it prints deck
  columns), `measured-truth.mjs` (passes `--draws` through), `measured-compare.test.mjs`.
- `.github/workflows/measured-truth.yml`: the header comment, plus a `draws` input beside `runs` passed as
  `--draws=`. Nothing else in the workflow changes.
- Docs: `docs/truth-sources.md`, `CLAUDE.md` (the one measured-truth line), `plan/revamp/cards.md` (the Measured
  bullet), and `docs/reports/measured/{latest.md,history.jsonl}` regenerated.
- No card, deck, enemy or rule changes. No new lane, no change to either test deck. No tuning (D57, D88).

## Consumers to update

- `axiomancer-mechanics/src/index.ts` already re-exports the measured-truth module. Export the new constant and
  types there.
- Mobile does not read the measured-truth module or the sim stats. The new stats field is additive, so
  `npm run typecheck -w axiomancer-mobile` is the check.
- `/digest` reads `measured-compare.mjs`'s DevLog section: it must still render with the wider deck set.
- `docs/reports/measured/thresholds.json` is unchanged. Family cells drift on the same thresholds as any deck.

## Save / schema contracts

- None in the game save. The history line gains cell fields (`selfBurnMean`, and the four range fields on family
  cells) and family `decks` entries `{ family: true, laneIds, poolSize, drawSize, draws: string[][],
  deadCardRate }`. Old lines lack them, and every reader treats a missing field as absent, never as 0. Old lines are
  never rewritten.

## Decisions made upfront — DO NOT ASK

- **The 20-card test deck is the lane's ceiling, measured against Blood Price's ceiling** (T, 2026-10-24). The
  Elementalist's own test deck is the ceiling column; Blood Price's 20-card test deck (and its `+half`) is the deck
  it is read against. Answers the candidate's open question on whether the 20 are the ceiling.
- **Two sampled families, as T named them** (T, 2026-10-24): random 20-of-30 Elementalist draws for the spread, and
  random 20 from the mixed 60-card pool of both trial sets for the median.
- **A measurement, not a tune** (T, 2026-10-24; D57, D88). Nothing gates on these numbers, and no card, deck or
  enemy changes because of them. R12 (attended) still decides what the matrix measures as policy; this phase only
  adds columns to it.
- **16 draws per family, each at the run's 300 runs per cell** `[T to confirm]`. At the 2026-10-25 CI rate (about
  9 s per deck), 33 more decks add roughly 5 to 8 minutes, well inside the 40-minute timeout. 16 draws give a
  readable median and range. One knob (`--draws`) shrinks the families without thinning each draw's own runs.
- **Both families report median and range** `[T to confirm]`. T said "spread" for the Elementalist family and
  "median" for the mixed family. Each needs both readings to mean anything, and the median in the ordinary fields
  lets drift and the table treat a family like a deck. The candidate's "mean" is replaced by the median, T's word.
- **Draws are 20 distinct cards, one copy each, never the Grey Curse or grey office cards** `[T to confirm]`. Both
  test decks hold one copy of each card, so the draws match the ceiling's shape. The mixed pool is the two lanes'
  `cardIds` (60) through `laneRewardPool`. Live rewards allow duplicates (T, 2026-10-24); a duplicate-allowing
  family is a Follow-up.
- **Self-burn counts the player's own INFERNO only** `[T to confirm]`. That is "the player's own weather": INFERNO
  is the only element that burns the player. Blood Price's SACRIFICE is a paid cost, not weather; a broader
  self-inflicted column is a Follow-up.
- **`playerHpTakenMean` is not redefined.** It stays foe-threat VITAE, and the self-burn column sits beside it, so
  the history stays comparable and the "5.8 against 41.0" reading keeps its meaning.
- **Deck ids** `elementalist~20of30` and `mixed~20of60`: the `~` marks a sampled family, as `+half` marks an upgraded
  deck (UP1g). Order in the report: grey, blood-price, elementalist, then the `+half` decks, then the families.
- **The draw RNG is a local seeded generator** (a mulberry32, or `SimpleRng`-style, seeded from `scrambleSeed(seed)`
  mixed with the family id and the draw index). It never calls `setSeed` or `setRng`, because the combat sim seeds
  the global RNG per run (bearings: "Deterministic seeded-RNG invariants").
- **No `elementalist+half`.** T asked for the ceiling and two sampled families, not an upgraded column. It is a
  Follow-up.
- **The report is regenerated in this phase's PR.** The workflow cannot push `main` today (`plan/NEEDS_T.md`
  `ruleset-bypass-for-t`). Fixing that push is not this phase's; the NEEDS_T row owns it.

## Tests matrix

- `axiomancer-mechanics/src/Combat/combat.measured-truth.test.ts`:
  - A1: cell count, every measured lane resolved through the registry, and deck-key order with `elementalist` and
    the families.
  - A2: each family has `sampleDraws` draws of 20 distinct ids, all in its pool. The family cell's fields are the
    median of its draws' cells, and its min and max bracket them. Run on a one-fight ledger slice with
    `sampleDraws: 3` to stay fast.
  - A3: same seed gives identical draws and cells; another seed gives different draws; `getRng().getState()` is
    unchanged across the draw step.
  - A4: `selfBurnMean` is 0 on every grey and Blood Price cell. A fight with an INFERNO-on-you card in the deck
    gives a positive sum equal to the `dot-tick` self INFERNO amounts in its transcript.
- `combat.encounter.sim` tests: `runOneEncounter` returns the self-burn total, and the aggregate mean matches it.
- `scripts/measured-compare.test.mjs`: `historyLine` keeps the new fields, `renderLatest` prints the Sampled decks
  table, the range text and the Self-burn section, and `compare` skips a deck the previous line lacks.
- Root: `npm test`.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run typecheck -w axiomancer-mobile`, the root `npm test`, and
`npm run measured:truth` at the defaults for A7.

## Commit body template

```
Phase EM1 — The Elementalist in measured truth, with a self-burn metric

Closes A1-A7 of plan/phases/phase_EM1_elementalist_measured.md.
<what changed>
Measured at <commit>: <run wall time>; elementalist ceiling <one line>, elementalist~20of30 median <one line>,
mixed~20of60 median <one line>, self-burn <one line>.
Verify: <commands and results>
```

## DoD

A1-A7 closed. `latest.md` on `main` carries the Elementalist columns, both families and the self-burn section,
stamped with the phase's commit.

## Follow-ups (out of scope)

- `elementalist+half`, the lane half-upgraded as UP1g did for Blood Price.
- A Blood Price 20-of-30 family, so each lane has both a ceiling and a spread.
- A duplicate-allowing mixed family, closer to what live rewards hand a player (duplicates allowed, T 2026-10-24).
  It would read after the reward rule lands (candidate "The decided reward rule, implemented").
- A self-inflicted VITAE column that also counts SACRIFICE and other paid VITAE costs.
- The workflow's push to `main` under the ruleset (`plan/NEEDS_T.md` `ruleset-bypass-for-t`).
