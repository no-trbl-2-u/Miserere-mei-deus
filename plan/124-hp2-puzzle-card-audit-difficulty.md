# 124 — Hazard puzzle card audit and difficulty calibration

> Hazard puzzles draw from a short card pool T approved, with no two cards that behave the same; the solver reports five difficulty features per layout; a measured calibration picks the feature that tracks real first-time solve times; and the puzzle bands use that measure, so the initial Act 1 puzzle set can be authored against it.

Carried from the v1 brief `phase_HP2_puzzle_card_audit_difficulty.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_HP2_puzzle_card_audit_difficulty.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- The `/plot` request from T, 2026-10-18 (attended): "audit the current cards for the hazard puzzles. Get rid of
  cards that don't make sense and figure out a way to measure difficulty so we can create our initial set of
  puzzles", deepened through `/anthropic-skills:prompt` into the four parts below.
- T's rulings at plot time (AskUserQuestion): B3f stays separate and runs first (B3f cut 2026-10-20; see
  Decisions); solve times from T and the
  `playtester` agent are pooled; the bar is Spearman ρ ≥ 0.7; `/devpuzzle` gets a dev-only move log.
- `plan/phases/phase_B3_hazard_puzzle.md` (A2 no RNG, A6 solver, A8 count bands, A13 demos, A17 timed solves)
  and `plan/phases/phase_HP1_hazard_cost_utility.md` (A1 no bin, A2 the outcome count, A3 the per-card report).
  B3's A17 moved to `plan/phases/phase_HP4_graded_puzzle_set.md` A11 (HP4g) on 2026-10-20.
  Design records: `braindump/2026-10-15-hazard-fixed-puzzle.md`, `braindump/2026-10-18-hazard-cost-utility-cards.md`.
- D37 and D88 (the card cut is T's: this plot builds the evidence and enforces the list T merges; no card or
  keyword is created or edited), D57 and B3's "Bands are enforced on authored puzzles" ruling (bands are a
  property of authored puzzle content), D84 and D93.
- Evidence read at plot time (`hazard.content.ts`): SCRAMBLE and CLIFFRUNNER are both blue, 0/3 free, 0/6
  powered, and differ only in `salvage`, which HP1a makes inert in puzzles. BALANCE POLE and PILGRIM'S BLESSING
  carry RE-CAST, which B3 A4 already rejects. CRACK is a consequence card. `rarity` and `weight` only steer the
  live deck's random draw; a puzzle has none.

### Outcome

Hazard puzzles draw from a short card pool T approved, with no two cards that behave the same; the solver reports
five difficulty features per layout; a measured calibration picks the feature that tracks real first-time solve
times; and the puzzle bands use that measure, so the initial Act 1 puzzle set can be authored against it.

## Design

### Scope (shared)

- `axiomancer-mechanics/src/World/Hazard/puzzle/`: tuning (the pool, the bands), validate (the pool check), solver
  (the features), a calibration module, the audit and calibrate scripts; their tests.
- `axiomancer-mobile`: the dev-only move log on the puzzle screen.
- `docs/reports/`: the card audit, the calibration logs, the difficulty report.
- Not touched: `HAZARD_DECK`, `HAZARD_KEYWORDS`, card or keyword copy (D37); the live three-round hazard; saves.

### Consumers to update

- `docs/game-model.md` and `docs/dev-tools.md`: the pool, the move log, the scripts.
- The mechanics barrel: the feature types, the pool, the calibration types.

### Decisions made upfront — DO NOT ASK

- **The cut is T's (D37).** HP2a's PR carries the recommendation; T's merge is the ruling. The pool is a list
  puzzles may use, not a deletion from `HAZARD_DECK`, because the live hazard uses the full deck until the Act 1
  rollout.
- **"Behaves the same"** means equal puzzle-relevant shape (colour, values, effect, amounts, `majorEffect`,
  `dead`), with `salvage`, `rarity` and `weight` ignored once HP1a removes the bin.
- ~~**B3f runs first and stays separate**~~ **(T's 2026-10-18 ruling; superseded 2026-10-20.)** Phase B3f was
  cut and HP2e's `Requires` dropped it. The clock dependency it carried moved to HP4g, and this brief's whole
  calibration premise is amended once HP4e's rulings exist — see
  `plan/phases/phase_HP4_graded_puzzle_set.md` Follow-ups, which also records that HP2e's ρ ≥ 0.7 bar has no
  variance to fit while every demo solves in under ten seconds.
- **Pooled solvers** (T): T's and the agent's times are pooled for the fit. The report also lists each solver's
  numbers separately, so a gap between them is visible.
- **The bar is ρ ≥ 0.7** (T), and the held-out entries must all land in their predicted band. A "simple
  combination" is the mean of two features' ranks; nothing fancier is fitted on 10 to 15 points (T confirmed 2026-10-19).
- **Thresholds come from T in the session:** T says where median solve time splits easy, medium and hard; the
  thresholds on the measure follow from the training entries.
- **Calibration puzzles are content the loop authors** under D88, with pool cards and existing hazard copy only,
  as B3 ruled for the demos. They are tools, not shipped puzzles.
- **The clock is hidden or 300 s during calibration**, so time pressure doesn't cut a solve short (T confirmed 2026-10-19).
- **Slot:** anytime. It blocks no open row and fixes no live defect; the initial Act 1 puzzle set is a later
  `/plot` that builds on it.

### Tests matrix (shared intent; each phase lists its own)

- Mechanics: the audit grouping; the pool validation and the no-identical-pair check; each A3 feature on
  hand-built layouts; the calibration set's constraints; the Spearman and rank-mean helper on fixed numbers; the
  band classification on the adopted measure.
- Mobile: the move log's JSON and its absence in production.

### Verify gate

`npm run verify -w axiomancer-mechanics`; HP2c also `npm run verify -w axiomancer-mobile`. Phases that change
mechanics' public surface also run the mobile type-check (bearings).

### Commit body template

```
<id>: <one line>

Closes A<n>, A<m> of plan/phases/phase_HP2_puzzle_card_audit_difficulty.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

### Follow-ups (out of scope)

- **The initial Act 1 puzzle set:** a new `/plot` once A7 lands, authored against the adopted measure (or the
  count bands, if none was adopted).
- **Cost cards from HP1c** join the pool only after T's card session designs them; the audit can be re-run then.
- **More solvers:** if the pooled data is noisy, a second human's solves are the next lever (T's option at plot
  time).

### Chunk notes (the brief's phase blocks)

#### HP2d (chunk 124.4)

Measure: `npm run verify -w axiomancer-mechanics`; the calibration test passes and `npm run puzzle:report` shows
each feature taking at least four values across the set.
- Scope: the calibration module and its test; the report script lists the set.
- Consumers: `/devpuzzle` lists the calibration entries in dev builds (the existing demo list, a second section).
- Tests: pool cards only, Act 1, solvable on the declared route, feature spread, 3 to 5 held out.
- Verify gate: mechanics verify plus the mobile type-check.

#### HP2e (chunk 124.5)

Measure: `docs/reports/hazard-puzzle-difficulty.md` exists with the ρ table, the verdict against 0.7, the
held-out check and T's verdict; the logs are committed.
- Scope: the solve session; `npm run puzzle:calibrate` and its Spearman helper; the logs; the report.
- Tests: the Spearman and rank-mean helper on fixed numbers.
- Verify gate: mechanics verify.

#### HP2f (chunk 124.6)

Measure: `npm run verify -w axiomancer-mechanics`; the library band test runs on the adopted measure with every
demo in band, or the difficulty report records why the count bands stayed.
- Scope: `HAZARD_PUZZLE_BANDS`, the band test, demos re-authored if needed.
- Tests: band classification on the measure; the library band test.
- Verify gate: mechanics verify plus the mobile type-check.

## Contracts

None. Logs are files in `docs/reports/`, not save data.

## Acceptance

- **A5** `HAZARD_PUZZLE_CALIBRATION` holds 13 to 20 calibration entries, each a layout, the one route it is
  solved on, and a `heldOut` flag (3 to 5 held out). Every layout uses only pool cards, is Act 1, and is solvable
  on its route. Across the set each A3 feature takes at least four distinct values. Calibration entries are not
  in `HAZARD_PUZZLE_LIBRARY` and carry no band. A test checks all of this.
- **A6** (attended) Every calibration entry is solved first-time by T and by the `playtester` agent on
  `/devpuzzle`, the clock hidden or set to 300 s. The A4 logs are committed under
  `docs/reports/hazard-puzzle-calibration/`. `npm run puzzle:calibrate -w axiomancer-mechanics` reads them and
  computes, on the non-held-out entries with T's and the agent's times pooled:
  - each solver's time and success per entry, and the pooled median time;
  - Spearman ρ between the median time and each A3 feature, and the mean of each pair of features' ranks.
- **A7** (attended) `docs/reports/hazard-puzzle-difficulty.md` records:
  - the ρ table and the chosen measure (the highest ρ);
  - the verdict against the bar, ρ ≥ 0.7;
  - band thresholds on the chosen measure, set so the training entries' median times split where T rules in the
    session;
  - the held-out check: each held-out entry's predicted band against its measured median time's band;
  - T's verdict, in T's words.
- **A8** If A7 adopts a measure (ρ ≥ 0.7 and every held-out band predicted), `HAZARD_PUZZLE_BANDS` is replaced
  by the measure and its thresholds, the B3 library band test uses it, and every demo sits in its declared band
  (re-authored with pool cards if not). If A7 adopts none, the count bands stay, and the report says so and why;
  A8 is closed by that record.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 4 open · 4 closed · next A9

- [ ] **124.4** The calibration set · M · closes A5 · needs — · alias: HP2d
- [ ] **124.5** Calibration solves and the difficulty report (attended) · M · closes A6, A7 · needs 124.4 · alias: HP2e
- [ ] **124.6** Bands on the calibrated measure · S · closes A8 · needs 124.5 · alias: HP2f
