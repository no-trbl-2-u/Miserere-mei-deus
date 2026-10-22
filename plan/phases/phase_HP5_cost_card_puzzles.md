# Phase HP5 — Five cost cards and twenty puzzles built on them

## Sources

- `/plot asap` request, T, 2026-10-21 (attended), in T's words: "let's plot the removal of the 20 'easy and
  medium' dev puzzles. Then, let's add 20 more that use a handful of new cards. I want these cards to cause the
  removal of points for utility. This would mean sometimes the player doesn't just add ALL the cards right away.
  There's a punishment for doing so. Let's not add too many new cards, maybe 5? ... It also helps to make them
  exact sum for added fear."
- T's rulings in the same session (AskUserQuestion):
  - "exact sum" means **no slack**: every winning line lands exactly on the goal, as on `cand-hard-06`. Going over
    still clears; there is no rule change.
  - The 20 easy and medium candidates are **deleted**. Their logged attempts stay in D1 as history.
  - The twenty new puzzles are **10 medium + 10 hard**.
  - These are **hazard cards**, and the rules for them are already on record. D37 holds the player (combat) deck
    and keywords. So the loop authors the five from T's recorded rulings, with no separate card session.
- T's cost-card rulings, 2026-10-18 (`braindump/2026-10-18-hazard-cost-utility-cards.md`):
  - Costs are signed and never clamped.
  - There is no bin and no discard in puzzles.
  - A cost may sit on either line or both.
  - The utilities in scope are DRAW, +die, reroll to the layout's set faces, and CONVERT.
  - The three directions are A Toll, B Debt and C Overdrive.
- T's cost-card validation rules, 2026-10-19 (HP1c2, #639; `hazard.card-validate.ts`).
- The engine is built by HP1:
  - `HazardCardDef` (`hazard.types.ts`) carries signed `f/e/fp/ep`, `effect`, `poweredEffect`, `gainDie*` and
    `reroll*`.
  - The session, solver and worse-copy check (`hazard-puzzle.dominance.ts`) read them.
  - Eight runtime-only prototypes sit in `puzzle/e2e/hazard-puzzle.cost-cards.mock.ts` (fx-toll, fx-greed,
    fx-overdrive, …); none is deck content.
- T's first logged solve times, 2026-10-21 (BE1, D1 `miserere`):
  - The hard band played no harder than easy: cleared median 11.2 s on hard against 10.6 s on easy.
  - `cand-hard-05` was the fastest solve, at 6.1 s.
  - T stalled on `cand-hard-06` until shown the line, and ruled it a keeper: "SURE FOOTING is a great red
    herring". Its pattern is a card that looks like a die sink but whose unpowered draw is required.
- D57 (no measured baseline), D84–D87 and D95 (code lands by PR and auto-merges on a green review), D93 (`/plot`
  lands by a `plot` PR).
- `plan/deadlines.md` W1, "Hazard puzzles locked".

## Outcome

`/devpuzzle` holds thirty candidates: HP4c's ten hard and twenty new ones built on five hazard cost cards. In every
new puzzle, staging the whole hand loses, and every winning line lands exactly on the goal. T's HP4e playthrough
times those thirty.

## Acceptance

- **A1** Five new hazard cards are in `HAZARD_DECK`. Each card:
  - carries a negative value on at least one line and a utility (DRAW, +die, reroll or CONVERT);
  - passes `validateHazardCardDef`;
  - has a name and flavour line in the deck's voice.

  At least one card is a Toll (the cost is on the free line only, so a die cancels it), at least one is a Debt
  (the cost is on both lines), and at least one is an Overdrive (the cost comes only when powered, carried by a
  `poweredEffect`). They reuse existing hazard keywords and add none.
- **A2** The live three-round hazard never draws the five. Its draw bag is unchanged, pinned by a test. Every
  puzzle-authoring tool can use them: they are in `HAZARD_PUZZLE_CARD_POOL`, the solver reads them, and the
  worse-copy check runs on them.
- **A3** No new card is a worse copy of a pool card. `hazard-puzzle.dominance.ts` passes with the five in the pool.
- **A4** The board shows costs:
  - `HazardCard` draws a negative value on either line with a minus sign, in a colour distinct from a gain;
  - the meters show a total below zero as a debt instead of clamping it to zero;
  - the projected-progress line counts a staged cost.

  Jest tests cover a Toll, a Debt and an Overdrive card in hand, staged and powered.
- **A5** The twenty easy and medium candidates (`cand-easy-01..10`, `cand-medium-01..10`) are deleted from
  `HAZARD_PUZZLE_CANDIDATES`. Each test and fixture that names them is updated, `/devpuzzle` lists the ten hard
  candidates and the demos, and the candidate audit passes.
- **A6** Twenty new candidates, `cand-cost-medium-01..10` and `cand-cost-hard-01..10`, are in the library and on
  `/devpuzzle` under their intended bands. Each one:
  - passes layout validation and the candidate audit;
  - holds at least one of the five new cards;
  - according to the solver, within budget, has at least one winning outcome and a `bestSurplus` of 0 (no slack);
  - can't be won by staging every card in the opening hand. Every winning outcome leaves at least one card in hand
    unstaged, or stages it only after a draw changed the hand.
- **A7** Across the twenty, each new card:
  - appears in at least four layouts;
  - is staged in a winning outcome in at least one of those layouts;
  - is a trap in at least one other: in hand, but staged in no winning outcome.

  At least three layouts follow the `cand-hard-06` pattern, where a card that looks like a decoy is required for
  its free or utility line.
- **A8** `npm run puzzle:report` and `npm run puzzle:audit` print the twenty with their decision-pressure columns.
  Each new candidate's doc comment states its solver line, in the HP4c style ("Risk [3, 17]: 3 ways, best surplus
  0; …").

**Measure:** on a preview APK, T solves at least one puzzle per new card on `/devpuzzle`, and
`npm run puzzle:times` lists those attempts under their `cand-cost-*` ids with solve times.

## Scope (shared)

- `axiomancer-mechanics/src/World/Hazard/`:
  - `hazard.content.ts` (the five cards);
  - the live draw bag's exclusion of them;
  - `puzzle/hazard-puzzle.tuning.ts` (`HAZARD_PUZZLE_CARD_POOL`);
  - `puzzle/hazard-puzzle.candidates.ts`;
  - their engine tests.
- `axiomancer-mobile`: `components/hazard/HazardCard.tsx`, the meters in `HazardBoard.tsx`, and the hazard
  presenters' projected progress, with their tests.
- Not touched:
  - the player (combat) deck and keywords (D37);
  - the live three-round hazard's rules and draw odds;
  - the solver's search;
  - the outcome rules (overshoot still clears);
  - art (D88): the cards use the existing hazard card frame.

## Consumers to update

- `@mechanics` barrel, if the candidate or card exports change shape.
- `axiomancer-mobile/docs/dev-tools.md`: the `/devpuzzle` groups.
- `docs/game-model.md`: the hazard card list gains the five.
- `plan/phases/phase_HP4_graded_puzzle_set.md` Follow-ups: one line saying that HP4e's thirty are now ten hard and
  twenty cost-card candidates (HP5).

## Save / schema contracts

- No save change. Puzzle candidates are dev-only and never saved.
- The five card ids are new `HAZARD_DECK` ids. The live hazard never draws them, so no saved run can hold one;
  `game.migrate.ts` needs no entry.
- Attempts already in D1 for deleted ids stay. `puzzle:times` lists an id it no longer knows under its own name.

## Decisions made upfront — DO NOT ASK

- **The five are hazard cards and the loop authors them** (T, 2026-10-21): their numbers, names and flavour. They
  are built from the 2026-10-18 directions and the HP1 prototypes, against the solver and the worse-copy check.
- **The mix:** two Tolls, one Debt and two Overdrives. A Toll is the cleanest way to say "pay now, a die cancels
  it", and an Overdrive stresses the risk route's two meters. Neither the rulings nor T fixed the mix.
  [T to confirm]
- **Colours:** at least one red, one blue and one purple among the five. No gold cost card: whether a cost card is
  ever gold is still an open question from 2026-10-18, so gold stays out.
- **No new keyword.** The cards use existing hazard keywords (`force`, `escape`, `surge`, `draw`). A utility with
  no keyword (+die, reroll) is said in the card's line text. A keyword is a later call for T.
- **Exact sum is no slack**, not bust (T). `bestSurplus` 0 on the nominated route is the check.
- **"Staging everything loses" is checked on the opening hand**, before any draw. This is the punishment T asked
  for.
- **Bands are intended bands**, set by the author and printed beside the solver's measured band, as in HP4c. HP4e's
  times decide whether they hold. 10 medium and 10 hard (T).
- **Deletion, not hiding** (T). The ten hard candidates keep their ids.
- **Routes:** each candidate nominates one route, as HP4c's do. At least four of each band are risk, so the
  Overdrives' two-meter cost is tested.
- **The board's cost colour** reuses an existing AXM token (no hex literals), so no art call is needed.

## Tests matrix (shared intent; each phase lists its own)

- Mechanics:
  - card validation and the live draw-bag pin (A1, A2);
  - the worse-copy check over the pool (A3);
  - candidate validation, the audit and the solver properties per new candidate (A5, A6, A7).
- Mobile: `HazardCard` and meter tests for a cost (A4); the `/devpuzzle` group test (A5, A6).
- Root: `npm test`.

## Verify gate

Per phase, below. The root `npm test` runs in every phase.

## Commit body template

```
<what shipped, one paragraph>

Closes A<n>[, A<m>] of plan/phases/phase_HP5_cost_card_puzzles.md.
Measure: <the phase's Measure line and its result>.
```

## DoD

A1–A8 ticked, each by the phase that closes it.

## Follow-ups (out of scope)

- Keywords for +die and reroll (T, a later call).
- A gold cost card, if T rules gold can carry a cost.
- Putting the cost cards in the live Act 1 hazard draw. That is the W2 work, "Act 1 hazards are puzzles".
- A bust rule (overshoot fails), if no-slack puzzles still play soft once timed.

## Phases

### HP5a — Five cost cards · M · closes A1, A2, A3 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics` passes. The five validate, the live draw-bag pin holds, and the
worse-copy check finds no new card worse than a pool card.
- Scope:
  - the five cards in `hazard.content.ts`;
  - their exclusion from the live draw bag;
  - their ids in `HAZARD_PUZZLE_CARD_POOL`;
  - `docs/game-model.md`.
- Tests: card validation; the draw-bag pin; dominance over the pool.
- Verify gate: mechanics verify; root `npm test`.

### HP5b — Costs on the board · M · closes A4 · requires HP5a
Measure: `npm run verify -w axiomancer-mobile` passes with the cost tests. On a puzzle that holds a Toll, the board
shows its minus value, and the meter shows a debt once the Toll is staged.
- Scope:
  - `HazardCard` negative values;
  - meter debt;
  - projected progress with a staged cost.
- Tests: the A4 jest cases.
- Verify gate: mobile verify; root `npm test`.

### HP5c — The twenty easy and medium candidates go · S · closes A5 · requires nothing
Measure: `HAZARD_PUZZLE_CANDIDATES` holds the ten hard candidates. `/devpuzzle` shows HARD and DEMOS, and the
candidate audit passes.
- Scope:
  - delete `cand-easy-*` and `cand-medium-*`;
  - update the tests and fixtures that name them;
  - update the `/devpuzzle` group tests and `dev-tools.md`.
- Tests: the candidate set and audit tests; the `/devpuzzle` group test.
- Verify gate: mechanics verify; mobile verify; root `npm test`.

### HP5d — Twenty cost-card puzzles · L · closes A6, A7, A8 · requires HP5a, HP5b, HP5c
Measure: the solver properties in A6 and A7 hold for all twenty (an engine test asserts them). On the next preview
APK, T solves one puzzle per new card, and `npm run puzzle:times` lists them.
- Scope:
  - `cand-cost-medium-01..10` and `cand-cost-hard-01..10` in `hazard-puzzle.candidates.ts`, each with its solver
    line in a doc comment;
  - the `/devpuzzle` groups;
  - one Follow-ups line in the HP4 brief.
- Tests: an engine test that checks each A6 property on every new candidate and the A7 coverage across the set;
  the `/devpuzzle` group test.
- Verify gate: mechanics verify; mobile verify; root `npm test`.
