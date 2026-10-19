# Phase HP3 — Hazard puzzles: the illusion of randomness

## Sources

- T, attended decision round 2026-10-19: "I still want to provide the ILLUSION that there's randomness (ie. dice,
  card draw, reroll). But everything is scripted. Reroll, draw, extra dice, none of these are actually random."
  Then "/plot it now".
- This supersedes B3's "no dice-roll overlay" decision (`plan/phases/phase_B3_hazard_puzzle.md`, now marked
  superseded) and builds on B3e2 (the puzzle on the live hazard board) and HP1 (`gainDie`, `reroll`).
- B3 A2 (puzzles never read an RNG) holds: this is presentation only. D84, D93. `plan/deadlines.md` W1.

## Outcome

The puzzle board looks like a live hazard: the dice roll in at the start, drawn cards slide in from the reserve,
and rerolls and gained dice animate like live play, while every result is the layout's scripted one.

## Acceptance

- **A1** When a puzzle starts (route picked), the live `DiceRollOverlay` plays and lands on the layout's dice faces
  (after unlocks). The clock starts when the overlay finishes. A test checks the overlay shows the layout's faces
  and that the clock does not tick while it plays.
- **A2** A DRAW applied on the puzzle board shows the drawn reserve cards entering the hand with the live board's
  hand-entry animation, in reserve order. A test checks the order and that no RNG is read (the session test's
  determinism check still passes).
- **A3** A `reroll` (HP1c) plays the roll animation on the dice it changes and lands on the layout's next
  `rerollFaces`; a `gainDie` shows the new die arriving in the tray as a live salvage die does. Tests cover both.
- **A4** Nothing in mechanics changes: the session, solver and outcome tests pass untouched, and the board's
  results equal `playHazardPuzzleMoves` on the same moves.

Measure: `npm run verify -w axiomancer-mobile`; the A1-A3 tests pass; `npm run verify:visual` re-captures the
`devpuzzle-board` baseline after the roll.

## Scope (shared)

- `axiomancer-mobile`: the puzzle screen and presenter (`components/hazard/puzzle/`,
  `state/presenters/hazard-puzzle.engine.ts`), reusing `DiceRollOverlay` and the live board's animations; the
  clock hook.
- Not touched: mechanics, the live hazard's own flow.

## Consumers to update

- `docs/dev-tools.md`: the puzzle board rolls in like a live hazard.
- The `devpuzzle-board` visual baseline (taken after the roll, with `&paused=1` holding the clock).

## Save / schema contracts

None.

## Decisions made upfront — DO NOT ASK

- **Presentation only** (T): results come from the layout; nothing random is added.
- **The clock starts after the roll**, so the animation never costs the player time. B3f times solves on this
  board, so B3f requires HP3a.
- **Reuse the live animations** (`DiceRollOverlay`, the hand's entry animation, the salvage-die arrival); no new
  animation is designed.
- **Slot:** asap, ahead of B3f, which must time solves on the board as it will ship (`plan/deadlines.md` W1).

## Tests matrix

- Mobile: the roll lands on the layout's faces; the clock waits for the roll; draw order; reroll and gained-die
  animations; board results equal the session's.

## Verify gate

`npm run verify -w axiomancer-mobile`, plus `npm run verify:visual` for the baseline.

## Commit body template

```
<id>: <one line>

Closes A<n> of plan/phases/phase_HP3_puzzle_randomness_illusion.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

## DoD

A1–A4 ticked, each by the phase that closes it.

## Follow-ups (out of scope)

- The same illusion on the Act 1 puzzles comes free once they route through this board (W2).

## Phases

### HP3a — The roll and the draw · M · closes A1, A2, A4 · requires nothing
Measure: `npm run verify -w axiomancer-mobile`; the roll, clock and draw tests pass.
- Scope: the puzzle screen's start (the roll overlay, the clock start), the draw animation, the baseline.
- Tests: A1, A2, A4.
- Verify gate: mobile verify plus `verify:visual`.

### HP3b — Reroll and gained dice · S · closes A3 · requires HP3a, HP1c
Measure: `npm run verify -w axiomancer-mobile`; the reroll and gained-die tests pass.
- Scope: the presenter's reroll and `gainDie` events, their animations.
- Tests: A3.
- Verify gate: mobile verify.
