# Phase HP2 — Hazard puzzle card audit and difficulty calibration

## Sources

- The `/plot` request from T, 2026-10-18 (attended): "audit the current cards for the hazard puzzles. Get rid of
  cards that don't make sense and figure out a way to measure difficulty so we can create our initial set of
  puzzles", deepened through `/anthropic-skills:prompt` into the four parts below.
- T's rulings at plot time (AskUserQuestion): B3f stays separate and runs first; solve times from T and the
  `playtester` agent are pooled; the bar is Spearman ρ ≥ 0.7; `/devpuzzle` gets a dev-only move log.
- `plan/phases/phase_B3_hazard_puzzle.md` (A2 no RNG, A6 solver, A8 count bands, A13 demos, A17 timed solves)
  and `plan/phases/phase_HP1_hazard_cost_utility.md` (A1 no bin, A2 the outcome count, A3 the per-card report).
  Design records: `braindump/2026-10-15-hazard-fixed-puzzle.md`, `braindump/2026-10-18-hazard-cost-utility-cards.md`.
- D37 and D88 (the card cut is T's: this plot builds the evidence and enforces the list T merges; no card or
  keyword is created or edited), D57 and B3's "Bands are enforced on authored puzzles" ruling (bands are a
  property of authored puzzle content), D84 and D93.
- Evidence read at plot time (`hazard.content.ts`): SCRAMBLE and CLIFFRUNNER are both blue, 0/3 free, 0/6
  powered, and differ only in `salvage`, which HP1a makes inert in puzzles. BALANCE POLE and PILGRIM'S BLESSING
  carry RE-CAST, which B3 A4 already rejects. CRACK is a consequence card. `rarity` and `weight` only steer the
  live deck's random draw; a puzzle has none.

## Outcome

Hazard puzzles draw from a short card pool T approved, with no two cards that behave the same; the solver reports
five difficulty features per layout; a measured calibration picks the feature that tracks real first-time solve
times; and the puzzle bands use that measure, so the initial Act 1 puzzle set can be authored against it.

## Acceptance

- **A1** `npm run puzzle:audit -w axiomancer-mechanics` writes `docs/reports/hazard-puzzle-card-audit.md`. For
  every card in `HAZARD_DECK` plus CRACK, it lists:
  - its puzzle-relevant shape: colour, the four values, effect, amounts, `majorEffect`, `dead`;
  - the fields puzzles ignore (`salvage`, `rarity`, `weight`) and that it ignores them;
  - whether puzzles ban it (RE-CAST, dead);
  - its identical-behaviour group (cards whose puzzle-relevant shape is equal);
  - its HP1a report columns across the library (`required` everywhere, `unused` everywhere, or mixed);
  - a recommendation, keep or cut, with the reason.

  A unit test checks the grouping on fixture cards.
- **A2** `HAZARD_PUZZLE_CARD_POOL` in the puzzle tuning module lists the cards puzzles may use: the A1
  recommendation as T merges it (T's merge of the HP2a PR is the D37 ruling; T may edit the list in review).
  `validateHazardPuzzleLayout` rejects a hand, reserve or unlock card outside the pool. A test checks that no two
  pool cards fall in one A1 group. `HAZARD_DECK` and the live hazard are unchanged.
- **A3** The solver reports five difficulty features per layout and route, in `npm run puzzle:report` and a typed
  result:
  - `winningLines`: the HP1a A2 count;
  - `openingShare`: the share of legal first moves from which a win is still reachable;
  - `nearMisses`: distinct losing end states one short of the goal (surplus −1; on risk, the weaker meter);
  - `shortestWin`: the fewest moves in a winning line;
  - `drawDependence`: the share of winning lines that apply a DRAW.

  Unit tests use hand-built layouts whose numbers are worked out by hand in the test file. The solver budget
  still applies.
- **A4** `/devpuzzle` keeps a dev-only move log for each attempt: layout id, route, solver name (typed once per
  session), clock start, and each move with milliseconds since the start, ending with the confirm or expiry and
  the result. A COPY LOG control copies it as JSON. Production builds render no log and record nothing. A mobile
  test drives three moves and checks the JSON.
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

Measure: `npm run verify -w axiomancer-mechanics && npm run verify -w axiomancer-mobile` pass; the card audit and
`docs/reports/hazard-puzzle-difficulty.md` exist; the pool test shows no identical pair; the library band test
runs on the adopted measure, or the report records why the count bands stayed.

## Scope (shared)

- `axiomancer-mechanics/src/World/Hazard/puzzle/`: tuning (the pool, the bands), validate (the pool check), solver
  (the features), a calibration module, the audit and calibrate scripts; their tests.
- `axiomancer-mobile`: the dev-only move log on the puzzle screen.
- `docs/reports/`: the card audit, the calibration logs, the difficulty report.
- Not touched: `HAZARD_DECK`, `HAZARD_KEYWORDS`, card or keyword copy (D37); the live three-round hazard; saves.

## Consumers to update

- `docs/game-model.md` and `docs/dev-tools.md`: the pool, the move log, the scripts.
- The mechanics barrel: the feature types, the pool, the calibration types.

## Save / schema contracts

None. Logs are files in `docs/reports/`, not save data.

## Decisions made upfront — DO NOT ASK

- **The cut is T's (D37).** HP2a's PR carries the recommendation; T's merge is the ruling. The pool is a list
  puzzles may use, not a deletion from `HAZARD_DECK`, because the live hazard uses the full deck until the Act 1
  rollout.
- **"Behaves the same"** means equal puzzle-relevant shape (colour, values, effect, amounts, `majorEffect`,
  `dead`), with `salvage`, `rarity` and `weight` ignored once HP1a removes the bin.
- **B3f runs first and stays separate** (T). HP2e requires B3f, so the demos' clocks are set before calibration.
- **Pooled solvers** (T): T's and the agent's times are pooled for the fit. The report also lists each solver's
  numbers separately, so a gap between them is visible.
- **The bar is ρ ≥ 0.7** (T), and the held-out entries must all land in their predicted band. A "simple
  combination" is the mean of two features' ranks; nothing fancier is fitted on 10 to 15 points.
- **Thresholds come from T in the session:** T says where median solve time splits easy, medium and hard; the
  thresholds on the measure follow from the training entries.
- **Calibration puzzles are content the loop authors** under D88, with pool cards and existing hazard copy only,
  as B3 ruled for the demos. They are tools, not shipped puzzles.
- **The clock is hidden or 300 s during calibration**, so time pressure doesn't cut a solve short.
- **Slot:** anytime. It blocks no open row and fixes no live defect; the initial Act 1 puzzle set is a later
  `/plot` that builds on it.

## Tests matrix (shared intent; each phase lists its own)

- Mechanics: the audit grouping; the pool validation and the no-identical-pair check; each A3 feature on
  hand-built layouts; the calibration set's constraints; the Spearman and rank-mean helper on fixed numbers; the
  band classification on the adopted measure.
- Mobile: the move log's JSON and its absence in production.

## Verify gate

`npm run verify -w axiomancer-mechanics`; HP2c also `npm run verify -w axiomancer-mobile`. Phases that change
mechanics' public surface also run the mobile type-check (bearings).

## Commit body template

```
<id>: <one line>

Closes A<n>, A<m> of plan/phases/phase_HP2_puzzle_card_audit_difficulty.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

## DoD

A1–A8 ticked, each by the phase that closes it.

## Follow-ups (out of scope)

- **The initial Act 1 puzzle set:** a new `/plot` once A7 lands, authored against the adopted measure (or the
  count bands, if none was adopted).
- **Cost cards from HP1c** join the pool only after T's card session designs them; the audit can be re-run then.
- **More solvers:** if the pooled data is noisy, a second human's solves are the next lever (T's option at plot
  time).

## Phases

### HP2a — Card audit and the puzzle card pool · M · closes A1, A2 · requires HP1a
Measure: `npm run verify -w axiomancer-mechanics`; `docs/reports/hazard-puzzle-card-audit.md` exists and the pool
test passes. The PR body lists the recommended pool for T's ruling.
- Scope: the audit script and its grouping helper, `HAZARD_PUZZLE_CARD_POOL`, the validator check, the report.
- Consumers: the barrel; `docs/game-model.md`.
- Tests: grouping on fixture cards; the validator rejects an off-pool card; no identical pair in the pool; the
  library still validates.
- Verify gate: mechanics verify plus the mobile type-check.

### HP2b — Five difficulty features in the solver · M · closes A3 · requires HP1a
Measure: `npm run verify -w axiomancer-mechanics`; `npm run puzzle:report` prints the five features for every
library layout.
- Scope: the solver, the report script.
- Consumers: the barrel; `docs/dev-tools.md`.
- Tests: each feature on hand-built layouts with hand-worked numbers.
- Verify gate: mechanics verify plus the mobile type-check.

### HP2c — The dev-only move log · S · closes A4 · requires HP1b
Measure: `npm run verify -w axiomancer-mobile`; the log test passes and a production render records nothing.
- Scope: the puzzle screen and presenter, a small log module, the COPY LOG control.
- Consumers: `docs/dev-tools.md`.
- Tests: three moves to JSON; production renders no log.
- Verify gate: mobile verify.

### HP2d — The calibration set · M · closes A5 · requires HP2a, HP2b
Measure: `npm run verify -w axiomancer-mechanics`; the calibration test passes and `npm run puzzle:report` shows
each feature taking at least four values across the set.
- Scope: the calibration module and its test; the report script lists the set.
- Consumers: `/devpuzzle` lists the calibration entries in dev builds (the existing demo list, a second section).
- Tests: pool cards only, Act 1, solvable on the declared route, feature spread, 3 to 5 held out.
- Verify gate: mechanics verify plus the mobile type-check.

### HP2e — Calibration solves and the difficulty report (attended) · M · closes A6, A7 · requires HP2c, HP2d, B3f
Measure: `docs/reports/hazard-puzzle-difficulty.md` exists with the ρ table, the verdict against 0.7, the
held-out check and T's verdict; the logs are committed.
- Scope: the solve session; `npm run puzzle:calibrate` and its Spearman helper; the logs; the report.
- Tests: the Spearman and rank-mean helper on fixed numbers.
- Verify gate: mechanics verify.

### HP2f — Bands on the calibrated measure · S · closes A8 · requires HP2e
Measure: `npm run verify -w axiomancer-mechanics`; the library band test runs on the adopted measure with every
demo in band, or the difficulty report records why the count bands stayed.
- Scope: `HAZARD_PUZZLE_BANDS`, the band test, demos re-authored if needed.
- Tests: band classification on the measure; the library band test.
- Verify gate: mechanics verify plus the mobile type-check.
