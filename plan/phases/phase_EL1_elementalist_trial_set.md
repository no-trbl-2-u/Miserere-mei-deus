# Phase EL1 — The Elementalist trial set (the weather in play)

## Sources

- T, 2026-10-24 (attended), after the sims: "put together a deck of 20 cards that played the best in your sims, use
  that in the dev menu for the elementalist. But all 30 in the reward pool. Once that's done, cut a preview apk
  build so I can test in the morning." T chose to have this plot merged on T's behalf this one time so the loop
  could build it overnight ("Merge the plot for me", AskUserQuestion); each code PR still merges only on a green
  adversarial review.
- The family: `plan/card-ledger/rehearsal-elementalist.md`, which holds Session 0, three ballot sittings (30 cards
  kept, M-10 T's own), Stacking and "The weather" (PR #856).
- Rules, final for this build:
  - **INFERNO n** burns the foe for n and you for half, rounded down, at each side's turn start, as plain loss. Yours
    can kill you.
  - **BLIZZARD n** (renamed from CHILL) cuts the foe's attacks by n. **FROZEN**: while BLIZZARD is at least the foe's
    attack, the next DEAL the foe takes is doubled; FROZEN then ends, and BLIZZARD stays.
  - **STORM n**: the foe loses n at its turn start, then the STORM grows by 1.
  - All three last the whole combat. BLIZZARD and INFERNO drop by 1 every round after the round they were applied in.
    Applications add. An element at 0 is gone.
  - **DRAW n** is a new shared keyword.
  - A Global's PAID line equals its FREE line; paying makes it permanent.
- The sims (lane-creator step 6): branch `sandbox/elementalist-sims`, results
  `plan/card-ledger/elementalist-sims.md`. The sandbox prototype is `src/Combat/combat.elements.ts`,
  `src/Cards/sandbox/elementalist.cards.ts` and `elementalist.adjustments.ts`, plus its verbs in
  `card-program.types.ts` and `combat.card-program.ts`.
  - Its rule readings are adopted here (Decisions).
  - Port its logic, not its files. The branch rewrote several engine files' line endings.
- The Blood Price precedent: Phase BT (D75, D80, D81). Its trial-set rules are in `plan/revamp/cards.md`, "The trial
  set": its own library file, one `TRIAL_SETS` line, no other code naming a trial card id, saves dropping removed ids,
  and a removal test.
- Code read while shaping this:
  - `Cards/cards.library.ts` `TRIAL_SETS`.
  - `Cards/card.lanes.ts` (`CardLane`, `TrialSet`; the dev menu reads `CARD_LANES`).
  - `Combat/combat.deck.ts` `drawCombatCards`, and the `hand-drawn` event (`combat.engine.ts`).
  - `axiomancer-mobile/state/combat/keywords.ts` `KEYWORD_GLOSS`, `EFFECT_KEYWORD`.
  - `components/DebugLaneDeck.tsx`, `DebugRewardPool.tsx`: both are registry-driven, so no dev-menu edit is needed.

## Outcome

On a preview build, T picks the Elementalist in the dev menu's TEST LANE DECK and plays its 20-card deck. T can check
the Elementalist box in the reward pool to be offered all 30 cards. INFERNO, BLIZZARD, FROZEN and STORM show on the
board with their numbers, every new keyword has a popup, and the weather drifts as ruled.

## Acceptance

- **A1** The engine carries the weather: INFERNO (both sides and one-sided), BLIZZARD with FROZEN, STORM with its
  growth, the drift, the stacking, and the turn-start ticks, exactly as in Sources. Each tick and change emits a
  combat event, so the log can show it. A hermetic engine test pins each rule, including a self-kill by INFERNO.
- **A2** The card-program context gains the verbs and reads the 30 cards need:
  - apply, one-sided apply, trigger, double, swap, remove and move for the elements;
  - DRAW, through `drawCombatCards`, emitting `hand-drawn`;
  - the reads: foe's and your INFERNO, BLIZZARD and STORM, the number of different elements, FROZEN, and hand size.

  The sim witness values them, as the sandbox's did.
- **A3** `axiomancer-mechanics/docs/keyword-atlas.md` has rows for INFERNO, BLIZZARD, FROZEN, STORM and DRAW.
- **A4** Mobile: `KEYWORD_GLOSS` has INFERNO, BLIZZARD, FROZEN, STORM and DRAW, each with a popup. The board shows
  each element's number on the foe, and your INFERNO on you, and updates as it drifts. FROZEN is visible while it is
  up. Card faces print the new keywords.
- **A5** `Cards/library/elementalist.cards.ts` holds the 30 kept cards at the sims' adjusted numbers
  (`elementalist.adjustments.ts`), plus T's notes, as a removable trial set joined by one `TRIAL_SETS` line. Each card
  takes:
  - its colour from the sims' job table (9 red, 11 blue, 10 purple);
  - a placeholder name, "Elementalist <slot>" (names are T's, D99);
  - one upgrade, as commons.
- **A6** The lane `elementalist` ("Elementalist") lists all 30 as `cardIds`, so the reward-pool checkbox offers all
  30. Its `testDeck` is the 20 below (T, 2026-10-24: the best-played in the sims, taken within each colour).
- **A7** Every existing card-rules guard passes for the 30: scrap floor, complexity budget, face honesty, keyword
  carrier, upgrade law. The trial-set removal test passes with the set unregistered, and no code outside the set names
  an Elementalist card id. Grey and Blood Price play exactly as before.
- **A8** (attended) On a preview APK, T sets the Elementalist test deck from `/dev`, plays a fight, and checks the
  reward pool box.

Measure: T plays the Elementalist test deck on the morning preview build and sees each element's number on the board
change as ruled.

## The test deck (A6)

7 red: P-10, P-02, P-07, P-05, E-02, P-04, P-09. 7 blue: M-10, E-07, M-09, P-03, P-06, M-05, M-06. 6 purple: M-08,
E-09, M-04, P-08, E-04, E-05. One copy each.

## Scope

- `axiomancer-mechanics`:
  - the weather module beside the combat state;
  - the program verbs and reads, the turn-start hooks, the FROZEN check on the foe's hit, and the events;
  - the trial-set file and its `TRIAL_SETS` line;
  - the atlas rows and the tests.
- `axiomancer-mobile`: `state/combat/keywords.ts`, the element badges on the foe and player panels, the log lines and
  the card-face tokens; tests.
- No change to grey, Blood Price, any enemy or any constant outside the weather module.

## Consumers to update

- `@mechanics` barrel: the weather types and the trial set.
- `docs/game-model.md`: the Elementalist trial set, as for Blood Price.
- `plan/card-ledger/rehearsal-elementalist.md`: the set is live, with a pointer to the file.

## Save / schema contracts

- Weather state lives in the combat state only and never in a save between fights. Saves drop removed Elementalist
  ids on load through the existing `dropUnknownCardIds`.

## Decisions made upfront — DO NOT ASK

- **The sims' adjusted numbers ship.** T authorised tuning ("make any minor adjustments"). The 22 changes (halved
  DEAL and INFERNO, trimmed STORM, M-07 VULNERABLE +10% per STORM) are listed in the sims doc and flagged to T as more
  than minor. They are data in one file, so T's revisions session can restore the as-voted numbers.
- **The sims' rule readings are adopted:**
  - FROZEN checks each hit about to land.
  - Drift happens at the round's end, for a stack that was up when the round began.
  - "Your INFERNO" is half the both-sides INFERNO. "Remove your INFERNO" makes that stack foe-only.
  - P-05's trigger does not grow the STORM.
  - E-06 makes the STORM grow by 2 while it is in play.
  - Lines that read the weather read it unscaled.
- **INFERNO, BLIZZARD and STORM are unscaled** until T rules their stat.
- **Placeholder names**, "Elementalist <slot>".
- **Card art**: the existing no-art fallback.
- **The family relic and its signature skill are not here.** They come with T's revisions (lane-creator step 7) and
  the lane-unlock plot.

## Tests matrix

- Mechanics (hermetic):
  - each weather rule (A1) and each verb and read (A2);
  - a 20-card test-deck fight resolving;
  - the card-rules guards (A7) and the removal test;
  - grey and Blood Price unchanged: the measured-truth cells for both are identical before and after.
- Mobile: the gloss covers every keyword a live card prints (the existing guard), the element badges render from a
  fixture state, and the dev lane picker lists the Elementalist.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, the root `npm test`.

## Commit body template

```
<phase id> — <title>

Closes <A-ids> of plan/phases/phase_EL1_elementalist_trial_set.md.
<what changed, by package>
Verify: <commands and results>
```

## DoD

A1-A7 closed by EL1a-EL1c. A8 is T's morning check on the preview build.

## Follow-ups (out of scope)

- Lane-creator step 7, T's revisions:
  - names; the INFERNO, BLIZZARD and STORM scaling;
  - P-05 PAID (never played in the sims), and M-01 and M-02 PAID (heals rarely needed);
  - the pace (the deck runs well under T's 3, 5 and 7 turn targets even adjusted);
  - the real test deck, and the family relic and signature skill.
- The lane unlock: relics naming a lane, the D71/D100 reward slot.

## Phases

### EL1a — The weather engine · L · closes A1, A2, A3 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics`; the A1 and A2 tests pass, and grey and Blood Price cells are
unchanged.
- Scope: the weather module, verbs, reads, hooks, events and witness values; the atlas rows. Port from
  `sandbox/elementalist-sims`.
- Verify gate: mechanics verify, root `npm test`.

### EL1b — The weather on the board · M · closes A4 · requires EL1a
Measure: `npm run verify -w axiomancer-mobile`; a fixture fight shows each element's badge and number.
- Scope: `state/combat/keywords.ts` glosses and popups, element badges, log lines and card-face tokens.
- Verify gate: mobile verify.

### EL1c — The Elementalist cards and lane · M · closes A5, A6, A7 · requires EL1a, EL1b
Measure: mechanics and mobile verify; the dev lane picker test lists the Elementalist with its 20-card deck.
- Scope: `elementalist.cards.ts`, the `TRIAL_SETS` line, the lane, the tests, and the consumer docs.
- Verify gate: mechanics verify, mobile verify, root `npm test`.

### EL1d — T's morning check (attended) · S · closes A8 · requires EL1c
Measure: T plays the test deck on the preview build.
- Scope: the session cuts a preview APK after EL1c merges; T plays it.
