# 118 — The Elementalist trial set (the weather in play)

> On a preview build, T picks the Elementalist in the dev menu's TEST LANE DECK and plays its 20-card deck. T can check the Elementalist box in the reward pool to be offered all 30 cards. INFERNO, BLIZZARD, FROZEN and STORM show on the board with their numbers, every new keyword has a popup, and the weather drifts as ruled.

Carried from the v1 brief `phase_EL1_elementalist_trial_set.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_EL1_elementalist_trial_set.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

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

### Outcome

On a preview build, T picks the Elementalist in the dev menu's TEST LANE DECK and plays its 20-card deck. T can check
the Elementalist box in the reward pool to be offered all 30 cards. INFERNO, BLIZZARD, FROZEN and STORM show on the
board with their numbers, every new keyword has a popup, and the weather drifts as ruled.

## Design

### The test deck (A6)

7 red: P-10, P-02, P-07, P-05, E-02, P-04, P-09. 7 blue: M-10, E-07, M-09, P-03, P-06, M-05, M-06. 6 purple: M-08,
E-09, M-04, P-08, E-04, E-05. One copy each.

### Scope

- `axiomancer-mechanics`:
  - the weather module beside the combat state;
  - the program verbs and reads, the turn-start hooks, the FROZEN check on the foe's hit, and the events;
  - the trial-set file and its `TRIAL_SETS` line;
  - the atlas rows and the tests.
- `axiomancer-mobile`: `state/combat/keywords.ts`, the element badges on the foe and player panels, the log lines and
  the card-face tokens; tests.
- No change to grey, Blood Price, any enemy or any constant outside the weather module.

### Consumers to update

- `@mechanics` barrel: the weather types and the trial set.
- `docs/game-model.md`: the Elementalist trial set, as for Blood Price.
- `plan/card-ledger/rehearsal-elementalist.md`: the set is live, with a pointer to the file.

### Decisions made upfront — DO NOT ASK

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

### Tests matrix

- Mechanics (hermetic):
  - each weather rule (A1) and each verb and read (A2);
  - a 20-card test-deck fight resolving;
  - the card-rules guards (A7) and the removal test;
  - grey and Blood Price unchanged: the measured-truth cells for both are identical before and after.
- Mobile: the gloss covers every keyword a live card prints (the existing guard), the element badges render from a
  fixture state, and the dev lane picker lists the Elementalist.

### Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, the root `npm test`.

### Commit body template

```
<phase id> — <title>

Closes <A-ids> of plan/phases/phase_EL1_elementalist_trial_set.md.
<what changed, by package>
Verify: <commands and results>
```

### Follow-ups (out of scope)

- Lane-creator step 7, T's revisions:
  - names; the INFERNO, BLIZZARD and STORM scaling;
  - P-05 PAID (never played in the sims), and M-01 and M-02 PAID (heals rarely needed);
  - the pace (the deck runs well under T's 3, 5 and 7 turn targets even adjusted);
  - the real test deck, and the family relic and signature skill.
- The lane unlock: relics naming a lane, the D71/D100 reward slot.

### Chunk notes (the brief's phase blocks)

#### EL1d (chunk 118.4)

Measure: T plays the test deck on the preview build.
- Scope: the session cuts a preview APK after EL1c merges; T plays it.

## Contracts

- Weather state lives in the combat state only and never in a save between fights. Saves drop removed Elementalist
  ids on load through the existing `dropUnknownCardIds`.

## Acceptance

- **A8** (attended) On a preview APK, T sets the Elementalist test deck from `/dev`, plays a fight, and checks the
  reward pool box.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 1 open · 7 closed · next A9

- [ ] **118.4** T's morning check (attended) · S · closes A8 · needs — · alias: EL1d
