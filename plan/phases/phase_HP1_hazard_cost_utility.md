# Phase HP1 — Hazard puzzle cost-utility engine: no bin, an honest count, signed costs and three utilities

## Sources

- The `/plot asap` request from T, 2026-10-18 (attended), after a `/anthropic-skills:rpg-mechanics-brainstorm`
  session: "make the hazard puzzles more interesting where some cards subtract from the outcome in exchange for
  some utility benefit like drawing cards or gaining a die or triggering a reroll". Every ruling is recorded in
  `braindump/2026-10-18-hazard-cost-utility-cards.md` (added by this PR); that file is the design record and
  binds this brief.
- T's rulings that session: negative values are signed and never clamped; reroll is to layout-set faces; a cost
  may sit on either line or both; utilities in scope are DRAW, +1 die, reroll and CONVERT; **players cannot bin
  or discard cards in puzzles** (puzzles only; the live hazard is untouched); demos that fall out of band are
  re-authored; `/plot` the engine phase only.
- `plan/phases/phase_B3_hazard_puzzle.md`: A2 (no RNG), A6 (solver), A8 (bands), A9 (unlocks), A13 (demos);
  this brief extends B3 and does not reopen it.
- D37 and D88 (cards, keywords and art are owner-only: this brief adds no card and no keyword), D57 and B3's
  "Bands are enforced on authored puzzles" ruling, D84 and D93.
- Evidence: a scratch run of the real solver on the three demos (numbers in the braindump file). Without the bin,
  cliff-easy risk drops to 16 winning outcomes (band easy, 30+) and undercroft safe to 4 (band medium, 5-29).
  Adding an inert card to a layout tripled its count (hard risk 2 → 6), because holding or binning a card that
  changes nothing counted as a new solution.

## Outcome

A hazard puzzle has no bin; the solver counts only lines that differ in what they play, and reports how each card
is used; every demo sits in its band under those rules; and the engine supports cards with negative values on
either line paired with DRAW, CONVERT, +1 die or a reroll to layout-set faces, ready for T's card session.

## Acceptance

- **A1** Puzzle sessions have no discard: `HazardPuzzleMove` has no `discard` move,
  `discardHazardPuzzleCard` is removed, the solver never generates a discard, and `salvage` never fires in a
  puzzle. The live `discardHazardCard` and the live hazard are unchanged. A session test checks that a hand card
  can only be staged or held.
- **A2** A winning outcome is the multiset of staged cards that change the result (a non-zero value, a die, or a
  fired utility), each with its powered flag, plus the dice and reserve left. A card held in hand is not part of
  the outcome. A solver test shows that adding an inert card (one that adds nothing in any line) to a layout
  leaves the count unchanged.
- **A3** `hazardPuzzleCardReport(layout, route, unlocks)` returns, for each card id in the hand, the reserve and
  the unlocks: the number of winning outcomes that stage it, the total, whether every win stages it (`required`),
  and whether no win stages it (`unused`). `npm run puzzle:report -w axiomancer-mechanics` prints the report for
  every library layout, both routes, as a markdown table. A unit test checks the report on a hand-built layout
  whose numbers are worked out by hand in the test file.
- **A4** Every layout in `HAZARD_PUZZLE_LIBRARY` passes the B3 library test (solvable, in its declared band,
  the solver's line replays to a clear) under A1 and A2, on both routes and every unlock subset. A demo that
  falls out of band is re-authored backward with the solver: existing cards only, the same hazard copy, and B3
  A13 still holds (one demo per band on risk, at least one demo whose every solution needs a reserve DRAW card,
  each declaring a stat unlock).
- **A5** The `/devpuzzle` board shows no bin and offers no drop-to-bin; the live `/hazard` board keeps its bin.
  `HazardBoard` gains at most one optional prop for this; a mobile test checks both boards.
- **A6** Card values are signed. A card's `f`, `e`, `fp` and `ep` may be negative on either line or both; a
  meter's projected value may go below 0 and is never clamped; `judge` still clamps only `p` to [0, 1], and the
  B3 outcome function handles p = 0 from a negative total. Tests use fixture cards with a cost on the free line,
  the powered line and both.
- **A7** A new utility effect `gainDie` adds dice when the card is applied: `gainDieBase` dice unpowered and
  `gainDiePowered` when a die powers the card, of colour `gainDieKind`, as temporary dice like the mana salvage die.
  There are no defaults (T, 2026-10-19): a `gainDie` card must declare all three, and the card validator rejects
  one that doesn't. A gold card's `majorEffect` uses the powered amount. Tests cover each case.
- **A8** A new utility effect `reroll` turns available dice into the layout's next `rerollFaces` (a new optional
  `HazardPuzzleLayout` field, consumed in order like the reserve). How many dice it touches is per card, with no
  default (T, 2026-10-19): `rerollBase` dice unpowered and `rerollPowered` when powered (or under `majorEffect`),
  taken in die order; the card validator rejects a `reroll` card missing either. When the faces run out, the remaining dice keep
  their face. `validateHazardPuzzleLayout` rejects a layout that holds a `reroll` card and declares no
  `rerollFaces`. RE-CAST stays rejected (B3 A4). No RNG is read (B3 A2); the determinism test replays a reroll
  line twice.
- **A9** DRAW and CONVERT work on cards that carry a cost. Two solver tests on fixture layouts from the
  braindump evidence:
  - a layout solvable only with a cost-DRAW card (F3: hand HAUL / SCRAMBLE / cost-DRAW, reserve IRON GRIP /
    FAITH LEAP), whose count is 0 without that card;
  - a layout where a both-lines cost card is `unused` in the A3 report on the hard goal and staged in at least
    one win on an easier goal (F4).
- **A10** No card and no keyword is added: `HAZARD_DECK`, `HAZARD_KEYWORDS` and the glossary are unchanged.
  Fixture cards live in a test-only module and are removed from the deck after each test. The live hazard
  suites (`hazard.engine.test.ts`, `hazard.balance.sim.test.ts`) pass untouched.
- **A11** A paid cost needs a second benefit (T, 2026-10-19: "Free = lose progress + extra die now that makes
  sense. But paid would need another utility based benefit"). A card whose powered line carries a cost (a
  negative `fp` or `ep`) must declare `poweredEffect`, a second utility that fires only when a die powers the
  card, on top of its `effect`. The card validator rejects such a card without one. `applyHazardCard` fires
  `poweredEffect` after `effect` on a powered card. Tests cover a free cost card, a powered cost card with and
  without `poweredEffect`.
- **A12** An automatic worse-copy test (T, 2026-10-19). A library test fails, naming the cards, when:
  - a card in `HAZARD_PUZZLE_LIBRARY` is `unused` (A3) in every layout and route that holds it; or
  - a card X is dominated by a card Y: in every library layout and route holding X, swapping X for Y keeps at
    least as many winning outcomes, and in at least one it gives strictly more.

  Fixture tests show a cost card that is an existing card plus a cost being flagged, and two cards with equal
  results not being flagged. If a current demo fails, the demo is re-authored (existing cards only).

Measure: `npm run verify -w axiomancer-mechanics && npm run verify -w axiomancer-mobile` pass; the library test
reports every demo in band with no bin; `npm run puzzle:report -w axiomancer-mechanics` prints the per-card
table; the A9 tests show a required cost card and an unused one.

## Scope (shared)

- `axiomancer-mechanics/src/World/Hazard/puzzle/`: session (no discard), types (`rerollFaces`, the move union),
  solver (the outcome key, the report), validate (`reroll` needs faces), library (re-authored demos), tuning if a
  default lives there; their tests.
- `axiomancer-mechanics/src/World/Hazard/hazard.types.ts` and `hazard.engine.ts`: the `gainDie` and `reroll`
  effects and their fields on `HazardCardDef`, handled in `applyHazardCard`. Additive: no live card carries them.
- `axiomancer-mechanics/package.json`: the `puzzle:report` script; a small script file beside it.
- `axiomancer-mobile`: the puzzle board's bin (HP1b only).
- Not touched: `HAZARD_DECK`, `HAZARD_KEYWORDS`, card or keyword copy (D37); the live three-round hazard's rules,
  its bin and salvage; the map; saves.

## Consumers to update

- `docs/game-model.md` and `docs/dev-tools.md`: the puzzle has no bin; `puzzle:report`.
- The mechanics barrel: the report function and the new types.
- The mobile puzzle presenter, if it maps the discard move (HP1b).

## Save / schema contracts

None. Puzzle sessions are not saved; no save field changes; no migration.

## Decisions made upfront — DO NOT ASK

- **No bin in puzzles; the live hazard keeps it** (T). The live three-round hazard goes away at the Act 1
  rollout (B3 Follow-ups), so it is not edited now.
- **Signed, never clamped** (T). A cost can't be dodged by playing into an empty meter.
- **Reroll is to layout-set faces** (T), the reserve's model for dice. The count is per card (A8), no default.
- **`gainDie` has no defaults** (T, 2026-10-19); each card declares count and colour (A7). A gold card's
  `majorEffect` uses the powered amount, as gold DRAW does.
- **The illusion of randomness** (T, 2026-10-19): "I still want to provide the ILLUSION that there's randomness
  (ie. dice, card draw, reroll). But everything is scripted." Draws, rerolls and gained dice resolve from the
  layout; the board animates them like live play (Phase HP3).
- **Outcome = what is played** (A2). Held cards are not part of an outcome now that nothing can be binned; this
  replaces B3's "holding versus playing a card that adds nothing counts once" with a definition that also covers
  cost cards.
- **"No card strictly worse than another in every layout"** is an automatic test now (T, 2026-10-19; A12), on the
  library as it stands and on fixture cost cards.
- **No keyword for `gainDie` or `reroll`.** Keywords are owner-only (D37); T adds them with the first real card.
  Until then the effects have no glossary entry and no card carries them.
- **Bands stay** easy 30+, medium 5-29, hard 1-4 with surplus ≤ 1 (B3 A8). The demos move to fit the bands, not
  the reverse.
- **Slot:** asap. B3f times the demos, and the demos change here, so B3f requires HP1a and HP1b.

## Tests matrix (shared intent; each phase lists its own)

- Mechanics: no-discard session; the A2 inert-card count; the A3 report on a hand-built layout; the library band
  test under the new rules; signed values on each line; `gainDie` and `reroll` amounts, colours and face order;
  `reroll` validation; the A9 required and unused cases; determinism with a reroll.
- Mobile: the puzzle board has no bin and the live board does.

## Verify gate

`npm run verify -w axiomancer-mechanics`; HP1b also `npm run verify -w axiomancer-mobile`. Mechanics' public
surface changes in HP1a and HP1c, so they also run the mobile type-check (bearings: "if a change touches
mechanics' public surface, also verify mobile").

## Commit body template

```
<id>: <one line>

Closes A<n>, A<m> of plan/phases/phase_HP1_hazard_cost_utility.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

## DoD

A1–A12 ticked, each by the phase that closes it.

## Follow-ups (out of scope)

- **T's card session** (attended, D37): design the first Toll, Debt and Overdrive cards against the A3 report,
  their keywords and copy, and a demo that uses them. A new `/plot` builds the demo once the cards exist.
- **Cost display on the board:** how `HazardCard` draws a negative number and how a meter shows a debt. Built
  with the first real cost card, so the look is judged on a real card.
- **A narrower recolour utility** (one die to a named colour): T left "other utilities within the current
  mechanics" open; file it with the card session if a card needs it.
- **B3f** times the demos after HP1b.

## Phases

### HP1a — No bin, an honest count, the card report, demos back in band · M · closes A1, A2, A3, A4 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics`; the library test passes with no discard move, and
`npm run puzzle:report -w axiomancer-mechanics` prints the table.
- Scope: puzzle session, types, solver, library, the report script.
- Consumers: the barrel; `docs/game-model.md`, `docs/dev-tools.md`; the mobile type-check (the discard move
  leaves the union; the mobile presenter's use of it is removed in HP1b, so HP1a keeps mobile compiling with the
  smallest change, such as a guard or a stubbed call).
- Save/schema: none.
- Tests: `puzzle/e2e/hazard-puzzle.session.engine.test.ts` (no discard), `hazard-puzzle.solver.engine.test.ts`
  (inert card, report), `hazard-puzzle.library.engine.test.ts` (bands).
- Verify gate: mechanics verify plus the mobile type-check.

### HP1b — The puzzle board loses its bin · S · closes A5 · requires HP1a, B3e2
Measure: `npm run verify -w axiomancer-mobile`; the board test shows no bin on `/devpuzzle` and a bin on
`/hazard`.
- Scope: `components/hazard/HazardBoard.tsx` (one optional prop), the puzzle screen and presenter.
- Consumers: `docs/dev-tools.md`; the `devpuzzle-board` visual baseline if the bin's absence changes it.
- Save/schema: none.
- Tests: the puzzle board test; the live `HazardBoard` tests unchanged.
- Verify gate: mobile verify plus `verify:visual`.

### HP1c — Signed costs, +1 die, reroll to set faces · M · closes A6, A7, A8, A9, A10, A11 · requires HP1a
Measure: `npm run verify -w axiomancer-mechanics`; the A9 tests show a required cost-DRAW card and an unused
both-lines cost card.
- Scope: `hazard.types.ts`, `hazard.engine.ts` (`applyHazardCard`), puzzle types and validate
  (`rerollFaces`), a test-only fixture-card module.
- Consumers: the barrel; `docs/game-model.md` (the effects exist, carried by no card yet).
- Save/schema: none.
- Tests: `puzzle/e2e/hazard-puzzle.costs.engine.test.ts` (signed values, `gainDie`, `reroll`, determinism, the
  A9 cases, the A11 paid-cost rule); the live hazard suites unchanged (A10).
- Verify gate: mechanics verify plus the mobile type-check.

### HP1d — The worse-copy test · S · closes A12 · requires HP1c
Measure: `npm run verify -w axiomancer-mechanics`; the library test fails a fixture card that is an existing card
plus a cost, and passes the current library (re-authored if needed).
- Scope: the library test, a dominance helper beside the solver report, demos only if one fails.
- Tests: fixture dominated card flagged; equal cards not flagged; the real library.
- Verify gate: mechanics verify.
