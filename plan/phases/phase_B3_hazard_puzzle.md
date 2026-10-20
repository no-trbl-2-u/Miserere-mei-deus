# Phase B3 — The hazard as a fixed puzzle: engine, solver, outcome, stat unlocks and three demos

## Sources

- The `/plot` request from T, 2026-10-15 (attended): "Each hazard is a set puzzle. Easy = many solutions, hard = one
  solution and just barely meets the goal. We need a timer. Rewards should NOT give hazard card rewards."
  Every ruling from that session is recorded in `braindump/2026-10-15-hazard-fixed-puzzle.md` (added by this PR);
  that file is the design record and binds this brief.
- `plan/revamp/hazards.md` § B3 ("Hazard mechanics redesign (owner)"). This brief is B3's brief. It replaces the
  blocked owner-led row `Phase B3` with the rows below, because T designed it in this session.
- D52 (hazards reset; T redesigns the mechanics in B3), D88 and D37 (content per surface; no card or keyword is
  created), D57 and the "No governing objective function" standing decision (see Decisions: the band check is on
  authored puzzle content, ruled by T), D84 and D93 (code lands by `loop:pr`, this plot by a `plot` PR).
- Evidence: a scratchpad solver drove the real `hazard.engine.ts` transitions over fixed layouts. On one round the
  goal alone sets the band, for example one safe layout gave goal 14 → 222 distinct winning outcomes,
  26 → 13, 30 → 2, 32 → 0. The table is in the braindump file.

- B3e2 (T, attended session 2026-10-18): T played the B3e demo board and found it "nothing like" the live hazard
  UI ("ewwww! gross! ... It has the same underlying mechanic as the regular hazard, but nothing like the UI/UX").
  Root cause: A14 listed what the board shows but never required the live hazard components, and the B3e builder
  chose tap buttons "with far less code" (commit `37e3712`). T chose "/plot reuse of live UI" via AskUserQuestion.

## Outcome

A hazard can be played as a fixed, one-round puzzle: an authored layout of cards, dice, predetermined DRAW
cards and stat unlocks, under a clock. A solver proves each layout is solvable and in its declared band, and
three demo puzzles are playable from the dev menu on the live hazard board (the same cards, dice, drag and route
select as `/hazard`). Act 1's live hazards are unchanged until T approves the demos.

## Acceptance

- **A1** A layout type `HazardPuzzleLayout` exists in `axiomancer-mechanics/src/World/Hazard/puzzle/`, with:
  - id and title;
  - its act, which must be 1 (see Decisions: every puzzle is Act 1 only);
  - the hand (card ids, in order);
  - the reserve (predetermined DRAW cards, in order);
  - the dice faces;
  - one goal per route (safe: combined number; risk: `[force, escape]`);
  - its declared band per route (`easy | medium | hard`);
  - its stat unlocks (A9).
- **A2** A puzzle session runs on the existing card and die rules (stage, power, apply, discard and salvage,
  `dieCanPower`, convert), for exactly one round, and never reads an RNG. The same layout and the same moves
  always give the same state; a test replays one move list twice and compares the states.
- **A3** A DRAW card in a puzzle draws the next cards of the layout's reserve, in order, at today's amounts
  (`drawBase` / `drawPowered`). Its test plays a layout whose only solution draws a reserve card.
- **A4** A layout holding a RE-CAST card (`effect: 'recast'`) is rejected by `validateHazardPuzzleLayout` with
  a reason, and so is a layout whose act is not 1. RE-CAST cards stay in `HAZARD_DECK` for the live minigame (see Decisions).
- **A5** `confirmHazardPuzzle` (the player's confirm, or the clock running out) resolves the round once and
  returns `{ force, escape, goal, p, cleared }`, where p is the value reached divided by the goal (the weaker
  meter on risk), clamped to [0, 1].
- **A6** `solveHazardPuzzle(layout, route, unlocks)` drives the A2 transitions and returns:
  - the number of distinct winning outcomes (different end states; the order of moves is not counted);
  - the best surplus over the goal;
  - one winning move list.

  Unit tests use small hand-built layouts whose counts are worked out by hand in the test file.
- **A7** A library test checks every layout in `HAZARD_PUZZLE_LIBRARY`, on both routes, with no unlocks:
  - it is solvable;
  - its count sits in its declared band (A8);
  - the solver's winning move list replays to a cleared resolve through the session functions.
- **A8** The bands are constants in `hazard-puzzle.tuning.ts`:
  - easy: 30 or more winning outcomes;
  - medium: 5 to 29;
  - hard: 1 to 4, with best surplus ≤ 1.
- **A9** Stat unlocks are optional thresholds a layout may declare. Each is `{ stat: 'heart' | 'body' | 'mind',
  min: number }` plus one of:
  - `extraDie`: +1 die of the stat's colour (Body → red, Mind → blue, Heart → purple; never gold);
  - `extraCard`: a named card joins the hand;
  - `blankReroll`: each blank (✕) die turns to a face the layout names.

  They are applied once, at session start, from the player's `baseStats` (`Character/index.ts`).
- **A10** The library test also proves that for every subset of a layout's unlocks, the puzzle stays solvable
  and its winning-outcome count is at least the no-unlock count, so an unlock never makes a puzzle harder.
- **A11** `hazardPuzzleOutcome(ctx)` is one pure function, taking a context object so new inputs can be added
  without changing its callers:
  - **Always pays** (`HAZARD_PUZZLE_REWARDS`): XP, one modest consumable roll (`rollCacheReward`, tier
    `modest`) and one material from the hazard's region gathering list.
  - **Full completion** (p = 1) adds a bonus: the route's shillings purse, 12 safe or 32 risk, today's
    `HAZARD_TUNING.rewards`.
  - **Failure** (p < 1) loses round(max × (1 − p)) VITAE, with max = 6 safe and 12 risk.
  - **Scar:** the −5 max VITAE scar (`HAZARD_MAXHP_SCAR`) applies only when p < 0.5.
  - **Tuning:** every number lives in `hazard-puzzle.tuning.ts`.
- **A12** The outcome is applied through the existing paths:
  - XP through the game reducer's XP grant, so level-ups fire;
  - items through `Items/item-grant.ts`;
  - the scar through `HAZARD_SCAR_FLAG_PREFIX`, so an inn rest mends it.

  An engine e2e test claims a failed and a cleared demo and checks the player state.
- **A13** Three demo layouts ship in `HAZARD_PUZZLE_LIBRARY`, one per band on the risk route (the safe route of
  each sits in the same band or easier). Each:
  - was authored backward: the intended line first, then the goal set to what that line reaches;
  - uses only existing hazard cards, minus RE-CAST;
  - declares at least one stat unlock.

  At least one demo's every solution needs a reserve DRAW card. Their themes reuse the existing hazards' copy
  (title, scenario, route names); no new story text is written.
- **A14** The dev menu's MINIGAMES & REWARDS section opens a "HAZARD PUZZLES" list of the three demos and a
  demo board. The board shows:
  - the hand, dice and reserve count;
  - both routes, picked before the clock starts;
  - a stat-unlock line naming what the player's stats unlocked;
  - the clock;
  - a confirm button;
  - an outcome panel listing the rewards and the penalty.

  Board logic lives in a presenter (`state/presenters/`), not in components.
- **A15** The clock is a per-band constant (`HAZARD_PUZZLE_CLOCK_SECONDS`, placeholder easy 90 / medium 75 /
  hard 60). Expiry calls `confirmHazardPuzzle` with the board as it stands. A mobile test fakes the timer and
  checks expiry.
- **A16** Act 1 is unchanged: the six live hazards still run today's three-round minigame, and no save field
  changes. The existing `hazard.engine.test.ts` and `hazard.balance.sim.test.ts` pass untouched.
- **A17** **(moved to HP4g, 2026-10-20 — see § B3f.)** As written it asked for
  `docs/reports/hazard-puzzle-timing.md`: timed first-time solves of the three demos by T and the `playtester`
  agent with the clock hidden, a median and success rate per demo, the resulting clocks (median × 1.5, rounded to
  5 s) written into the A15 constants, and T's verdict quoted. T solved the demos on 2026-10-19 and the verdict
  was "change X", which cut the report and produced HP4. The surviving half — setting the A15 constants from real
  solve times — is `plan/phases/phase_HP4_graded_puzzle_set.md` A11, closed by HP4g over the kept candidates. No
  row in this brief closes A17.
- **A18** (B3e2) The `/devpuzzle` board renders through the live hazard components: `HazardBoard`, `HazardCard`
  and `HazardDie` from `components/hazard/`, the same ones `app/hazard/index.tsx` mounts. A presenter function
  `selectHazardPuzzleViewModel` in `state/presenters/hazard-puzzle.engine.ts` maps a puzzle session and its layout
  to the live `HazardViewModel`. No puzzle-only card, die, meter, hand or play-area component exists.
- **A19** (B3e2) The route pick before the clock is the live `RouteSelect`, showing each route's goal from the
  layout and its band.
- **A20** (B3e2) Every engine move is reachable through the live board's interactions, and no other way:
  - drag a hand card into the play area → `stageHazardPuzzleCard`;
  - tap a staged card, or drag it out → `unstageHazardPuzzleCard`;
  - drag a die onto a staged card of its colour (or gold) → `powerHazardPuzzleCard`;
  - a utility card's apply (DRAW included, drawing from the reserve) → `applyHazardPuzzleCard`;
  - drag a hand card onto the bin → `discardHazardPuzzleCard` (salvage);
  - the board's resolve button, labelled CONFIRM → `confirmHazardPuzzle`; the clock's expiry does the same (A15);
  - tap a hand card → the live `CardDetailOverlay`.

  The screen-level drag controller and ghost move out of `app/hazard/index.tsx` into one shared hook or
  component that both screens use. A mobile test drives each move above through the board's callbacks.
- **A21** (B3e2) The puzzle adds only: the clock, the reserve count, the stat-unlock line and the outcome. Each is
  drawn with the live hazard palette: `HZ` and `TYPE_ACCENT` from `components/hazard/palette.ts`, `FONTS` and `HUE`
  from `@/theme/axm`. The outcome uses the
  live `OutcomeOverlay` look (a puzzle VM fed to it, or a panel with its styles). Board pieces that mean nothing
  in one round show one round: one ledger mark, no momentum note, no multi-round threshold ladder.
- **A22** (B3e2) The live `/hazard` screen is unchanged: `HazardBoard` gains only optional props (if any), the
  existing hazard component and presenter tests pass untouched, and the A24 live shot is the baseline both boards
  are compared against.
- **A23** (B3e2) The tap-button view is deleted: `components/hazard/puzzle/HazardPuzzleBoardView.tsx`, the
  PLAY / BIN / POWER / APPLY / RETURN button copy in `hazard-puzzle.copy.ts`, and the button-only VM types
  (`HazardPuzzleHandCardVM`, `HazardPuzzleStagedCardVM`, `HazardPuzzlePowerOptionVM`, `HazardPuzzleBoardVM`) and
  their tests. A render test checks `/devpuzzle` shows no PLAY, BIN, POWER, APPLY or RETURN button.
- **A24** (B3e2) Visual parity: `npm run verify:visual` gains a live `hazard-board` shot (the live hazard on its
  board, after route pick and roll, booted from a fixture with the seed pinned), and the `devpuzzle-board` and
  `devpuzzle-outcome` baselines are re-captured on the new board. The PR body shows `hazard-board` and
  `devpuzzle-board` side by side. T merging the PR is the parity verdict.

Measure: `npm run verify -w axiomancer-mechanics && npm run verify -w axiomancer-mobile` pass; the A7/A10 library
test reports each demo's band, count and unlock subsets; the dev menu opens all three demos and finishes each one
on web on the live hazard board (`npm run verify:visual`: the `hazard-board` and `devpuzzle-board` shots side by
side, and the outcome panel).

## Scope (shared)

- `axiomancer-mechanics/src/World/Hazard/puzzle/` (new): types, session, solver, outcome, tuning, the demo library,
  and their tests. It imports the card definitions and the die rules from the existing hazard modules; it
  doesn't fork them.
- `axiomancer-mechanics/src/index.ts`: additive exports only.
- `axiomancer-mobile`: a puzzle presenter and store actions, a demo board screen or overlay, the dev-menu entry.
  The live hazard route, `components/hazard/*` and `state/hazard/store-actions.ts` are not changed beyond what
  sharing a card or die component needs.
- Not touched: `HAZARD_DECK` and `HAZARD_LIBRARY` content, the live three-round engine, the map, the saved hazard
  deck, card or keyword definitions (D37).

## Consumers to update

- `docs/game-model.md`: one paragraph on the demo puzzle mode, saying it is dev-menu only.
- `axiomancer-mechanics/src/World/Hazard/index.ts` and the package barrel: the new exports.
- The dev menu's MINIGAMES & REWARDS hint text.

## Save / schema contracts

None. A puzzle session is not saved, the same as today's mid-hazard state on a dev entry. Its outcome writes only
fields that already exist: XP, inventory, the scar flag and VITAE. No migration.

## Decisions made upfront — DO NOT ASK

- **One round, no deck, no roll** (T). The puzzle never calls `seedRng`. Blank (✕) faces are authored, not
  rolled.
- **RE-CAST is excluded from puzzles, not deleted.** T ruled to cut RE-CAST cards, the saved hazard deck and its
  screens, and the `deadcard` consequence. The live Act 1 hazards still use all of them, so the cuts land with the
  Act 1 rollout (Follow-ups), once T approves the demos (T: "Not until we lock in on the process").
  (T confirmed 2026-10-19)
- **DRAW keeps its card text and amounts** and draws from the layout's reserve (T).
- **"Distinct winning outcome"** = a distinct end state of a cleared resolve:
  - the multiset of staged cards with their powered flag;
  - the hand left;
  - the reserve left;
  - the available dice;
  - the salvage progress.

  Holding versus playing a card that adds nothing counts once. This is what the evidence table counted.
  Superseded by `plan/phases/phase_HP1_hazard_cost_utility.md` A2 (2026-10-18): puzzles have no bin, and a
  winning outcome counts only the cards that change the result.
- **Bands are enforced on authored puzzles (T, solver test "Solvable + band").** This is a ruling on the
  "no count pin" doctrine (`axiomancer-mechanics/CLAUDE.md`): the band is a property of authored puzzle content,
  which T chose to enforce. It is not a balance target for combat or the run.
- **Solver budget:** a round whose plan space passes `HAZARD_PUZZLE_SOLVER_BUDGET` (start 20,000 plans) fails
  the library test with "too open to count". Shrink the layout; don't raise the budget silently.
- **Stat → colour:** Body → red, Mind → blue, Heart → purple (T). Unlocks are read once at session start.
- **Failure formula** as in A11 (T: "we can experiment with this and I'd actually like this to be dynamic based
  on other things"). It takes a context object so later inputs (region, level, scars already banked) are
  additive.
- **XP amount:** `HAZARD_PUZZLE_REWARDS.xp` = 10 × player level on any resolve, +50% on full completion.
  T asked for "a little experience" and confirmed this amount on 2026-10-15. T plans to lower the 1,000 XP
  level-up ceiling separately; that change is not part of B3.
- **Every hazard puzzle is scoped to Act 1** (T, 2026-10-15: "ALL hazard puzzles are scoped to ACT 1 until I say
  so and am able to do valid testing"):
  - each layout carries `act: 1` and its demo theme draws on an Act 1 region;
  - `validateHazardPuzzleLayout` rejects any other act;
  - nothing in B3 or any later phase builds a puzzle for another act or continent until T lifts this in an
    attended session.
- **Material source:** the region's gathering materials already in `World/MapEvents/content.ts`; no new material
  is authored. A region with none gives no material.
- **Demos are content the loop authors** under D88, because T approved this plot. They use existing cards only
  (D37 holds) and reuse existing hazard copy (no new canon, Story canon rule).
- **Clock placeholders** (A15) are not tuned; A17 sets them from measured solves.
- **Slot:** anytime. It blocks no open row and fixes no live defect.
- **B3e2: the puzzle feeds the live board a `HazardViewModel`** rather than forking `HazardBoard`. A field the
  puzzle lacks takes its one-round value (`totalRounds` 1, `momentumNote` null, `deckCount` = reserve count,
  `resolveLabel` CONFIRM). A puzzle need the VM cannot carry (the clock) is an optional `HazardBoard` slot prop
  or sits outside the board on the screen; never a second board.
- **B3e2: no dice-roll overlay.** Puzzle faces are authored, not rolled, so `DiceRollOverlay` is not shown and
  the dice sit on the board when the clock starts. Superseded 2026-10-19 by T's illusion rule: "I still want
  to provide the ILLUSION that there's randomness (ie. dice, card draw, reroll). But everything is scripted."
  The board plays the live roll, draw and reroll animations landing on the layout's scripted results
  (Phase HP3).
- **B3e2: `/devpuzzle` is full-screen like `/hazard`**, not a scroll view; the demo list keeps its rows, drawn
  in the hazard palette. The deep-link params (`?id`, `&route`, `&confirm=1`, `&paused=1`) stay for the shots.
- **B3e2: the live hazard shot.** If no fixture lands on the live board deterministically, the phase adds one
  (state fixtures are allowed under `docs/state-fixtures.md`); it never stubs the board.
- **B3e2 slot:** asap. B3f's timed solves on the button board would set clocks for a UI the game will not ship,
  so B3f requires B3e2.

## Tests matrix (shared intent; each phase lists its own)

- Mechanics: puzzle session determinism and the one-round resolve; DRAW from the reserve; RE-CAST rejection;
  solver counts on hand-built layouts; the library band test; unlock subsets; the outcome function's formula
  cases (p = 0, 0.49, 0.5, 0.99, 1 on both routes); an e2e claim test of state changes.
- Mobile: presenter tests for the board, the unlock line, the outcome panel and clock expiry with fake timers;
  the dev-menu entry render test.

## Verify gate

`npm run verify -w axiomancer-mechanics`; for B3e also `npm run verify -w axiomancer-mobile` and
`npm run verify:visual` for the board. Mechanics' public surface changes, so B3a–B3d also run the mobile
type-check (bearings: "if a change touches mechanics' public surface, also verify mobile").

## Commit body template

```
<id>: <one line>

Closes A<n>, A<m> of plan/phases/phase_B3_hazard_puzzle.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

## DoD

A1–A24 ticked, each by the phase that closes it — except **A17**, which moved to
`plan/phases/phase_HP4_graded_puzzle_set.md` A11 (HP4g) when B3f was cut on 2026-10-20.

## Follow-ups (out of scope)

- **Act 1 rollout and the cuts** (a new `/plot` once T approves the demos in B3f):
  - author Act 1's hazard puzzles;
  - route the live hazard nodes to the puzzle;
  - delete the three-round engine paths, RE-CAST cards, the saved hazard deck (`hazard.deck-flags.ts`,
    `app/hazard-deck`, `HazardRemoveGrid`, `DebugHazardDeckRandomize`) and the `deadcard` consequence, with a save
    migration dropping `hazard-card:` flags;
  - retire `PHASE_CANDIDATES` "Hazard deck-thinning remove-card consumer".
- **Stat-threshold values by act and region:** the `min` numbers for real puzzles are set at rollout.
- **A dynamic failure curve** using more inputs (T's wish); A11's context object is the seam.
- **Consumable pool:** only three healing potions exist, and materials appear to have no sink (the Anvil engine
  does not read them). Name this at rollout; it's not this phase's to fix.

## Phases

### B3a — Puzzle layout and one-round session · M · closes A1, A2, A3, A4, A5, A16 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics`; the session tests replay a move list twice to identical state
and resolve a reserve-DRAW layout.
- Scope: `World/Hazard/puzzle/hazard-puzzle.types.ts`, `hazard-puzzle.session.ts`, `hazard-puzzle.validate.ts`,
  a test-only layout fixture; additive barrel exports.
- Consumers: barrel only.
- Save/schema: none.
- Tests: `puzzle/e2e/hazard-puzzle.session.engine.test.ts` (determinism, one-round resolve, p on both routes,
  DRAW from the reserve, RE-CAST rejection); the existing hazard suites run unchanged (A16).
- Verify gate: mechanics verify plus the mobile type-check.

### B3b — The solver and the band check · M · closes A6, A7, A8 · requires B3a
Measure: `npm run verify -w axiomancer-mechanics`; the solver unit tests match the hand-worked counts, and the
library test runs (on a fixture library until B3e adds the demos).
- Scope: `puzzle/hazard-puzzle.solver.ts`, `hazard-puzzle.tuning.ts` (bands, budget), the library test harness.
- Tests: `puzzle/e2e/hazard-puzzle.solver.engine.test.ts` (hand-worked counts, best surplus, move-list replay);
  `puzzle/e2e/hazard-puzzle.library.engine.test.ts`.
- Verify gate: mechanics verify.

### B3c — Outcome: XP, loot, completion bonus and scaled failure · S · closes A11, A12 · requires B3a
Measure: `npm run verify -w axiomancer-mechanics`; the outcome formula cases pass and the e2e claim test shows XP,
items, VITAE and the scar flag changing as specified.
- Scope: `puzzle/hazard-puzzle.outcome.ts`, the rewards and failure constants in the tuning module, and a claim
  helper that goes through the reducer, `item-grant` and the scar flag.
- Tests: `puzzle/e2e/hazard-puzzle.outcome.engine.test.ts`.
- Verify gate: mechanics verify plus the mobile type-check.

### B3d — Stat unlocks · S · closes A9, A10 · requires B3b
Measure: `npm run verify -w axiomancer-mechanics`; the unlock tests show each unlock kind applied from player
stats, and the library test checks every unlock subset.
- Scope: unlock types and application in the session; the subset check in the library test.
- Tests: extend the session and library suites.
- Verify gate: mechanics verify.

### B3e — Three demos and the dev-menu board · L · closes A13, A14, A15 · requires B3b, B3c, B3d
Measure: `npm run verify -w axiomancer-mechanics && npm run verify -w axiomancer-mobile`; the library test
reports the three demos in their bands; a `verify:visual` shot shows a demo board and an outcome panel.
- Scope: `puzzle/hazard-puzzle.library.ts` (three demos, authored backward with the B3b solver), a mobile
  presenter and store actions, the board UI, the dev-menu entry, the clock.
- Consumers: `docs/game-model.md` paragraph; the dev-menu hint.
- Tests: the library test now runs on the demos; the mobile presenter, clock-expiry and dev-entry tests.
- Verify gate: both workspaces plus `verify:visual`.

### B3e2 — The puzzle on the live hazard board · L · closes A18, A19, A20, A21, A22, A23, A24 · requires B3e
Measure: `npm run verify -w axiomancer-mobile && npm run verify:visual`; the `hazard-board` and `devpuzzle-board`
shots show the same cards, dice, hand dock and play area, and no PLAY / BIN / POWER / APPLY / RETURN button remains
on `/devpuzzle`.
- Scope: `state/presenters/hazard-puzzle.engine.ts` (`selectHazardPuzzleViewModel`, the button VMs removed),
  `hazard-puzzle.copy.ts`, a shared drag controller and ghost lifted from `app/hazard/index.tsx`,
  `components/hazard/puzzle/HazardPuzzleDemo.tsx` and `HazardPuzzleOutcomePanel.tsx` rebuilt on the live
  components, `HazardPuzzleBoardView.tsx` deleted, `app/devpuzzle/index.tsx`, `scripts/smoke-screens.mjs` (the
  `hazard-board` route), a state fixture if A24 needs one, the three baselines.
- Not touched: mechanics (`World/Hazard/puzzle/` is complete), the live hazard store actions, `HAZARD_DECK`, card
  or keyword definitions (D37), art (D37).
- Consumers: `docs/dev-tools.md` (the board now uses the live drag controls); `docs/game-model.md` paragraph if it
  names the buttons.
- Save/schema: none.
- Tests: presenter tests for `selectHazardPuzzleViewModel` (one-round fields, reserve count, CONFIRM label);
  a `/devpuzzle` render test driving every A20 move through the board callbacks, and the no-button check (A23);
  the clock-expiry test kept; the live `HazardBoard` and `app/hazard` tests unchanged (A22).
- Verify gate: mobile verify plus `verify:visual`.

### B3f — CUT 2026-10-20 (was: timed demo solves and the process lock, attended · S · closed A17)
**T cut this row in an attended session, 2026-10-20.** T's rule, verbatim: *"if there's an equivalent for testing
the 30 puzzles, then cut it. Otherwise adapt it."*

- **What happened to the solves.** They were done, on 2026-10-19: T played all six routes of the three demos
  through `/devpuzzle` and solved every one in under ten seconds. T's verdict was "change X", not "lock the
  process", and it produced Phases HP4a–HP4f — thirty graded candidates, played by hand to mine authoring
  patterns. `docs/reports/hazard-puzzle-timing.md` is therefore **never written**; the finding lives in
  `plan/phases/phase_HP4_graded_puzzle_set.md` § Sources and in the build plan's Queue change log for 2026-10-19
  and 2026-10-20.
- **What replaced the report.** HP4e — T plays the thirty, each once, timed by HP2c's move log, with the keep-or-cut
  ruling quoted per candidate in `docs/reports/hazard-puzzle-candidates.md`. That is the equivalent T's rule asks
  for, over a set worth timing.
- **What was adapted instead of cut.** Setting `HAZARD_PUZZLE_CLOCK_SECONDS` had no equivalent anywhere in
  HP4a–HP4f, and B3f was A17's only closer. It became **HP4g** (A11 in HP4's brief), carrying A17's two spec gaps:
  times grouped by band rather than per layout, and a band resting on few samples saying so on the line that sets
  it. A17 is therefore closed by HP4g, not by any row in this brief.
- **What was dropped on purpose.** B3f's `playtester`-agent solves. HP4e is a T-only playthrough by design, and ten
  kept candidates per band give a median without them.
- **The open A17 question this brief raised** — the clock is frozen by `?paused=1`, not hidden — is unresolved and
  now belongs to HP4e's session, which is the next time anyone solves a puzzle against a clock. Making it literal
  is still a small `?clock=hidden` param on `/devpuzzle`.

Phase HP2e's `Requires` dropped B3f in the same commit; nothing else in the queue depended on it.

**T's rulings, 2026-10-19.** Settled in an attended session before any solve:

- **HP2c ships first.** B3f now requires HP2c: the solves are timed by the dev-only move log, not by a
  hand-held stopwatch. HP2c was slotted in W2; it moves to W1 ahead of B3f. HP2e requires both, so building
  it first serves that row too.
- **The sample.** T solves each route **once** — a first-time solve survives exactly one exposure, so T gets
  one per route and no more. The `playtester` agent runs **several independent solves per route**, each with
  fresh context, to thicken the sample. The report records T's and the agent's times separately and says how
  many solves each median rests on.
- **Order.** T solves before reading any playtester transcript, and the brief's layouts are never described
  to T in chat. A described layout is a spent first-time solve.

**Two spec gaps A17 leaves open** (found 2026-10-19, to settle as B3f ships):

- **Per demo vs per band.** A17 asks for a median "per demo", but `HAZARD_PUZZLE_CLOCK_SECONDS` is per
  *band*, and the demos do not map one-to-one: cliff is easy/easy, ashfall medium/medium, undercroft
  **medium/hard**. The report therefore records per-demo-per-route times and groups them by band to set the
  three constants.
- **`hard` rests on one route.** `demo-undercroft-hard` on `risk` is the only hard route in the demo set, so
  the hard clock rests on that route's solves alone. The report says so where it sets `hard`.

**Open: the clock is frozen, not hidden.** A17 wants the clock hidden during a solve. `?paused=1` only sets
`running = false` in `HazardPuzzleDemo`, so `remaining` stays at its full value and the strip still renders
the number. A frozen clock exerts no time pressure, so it may be good enough; making A17 literal is a small
`?clock=hidden` param on the `/devpuzzle` route, outside this phase's scope.
