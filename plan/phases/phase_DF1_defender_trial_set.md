# Phase DF1 — The Defender trial set (the turtle with spikes)

## Sources

- T, 2026-10-26 (attended): voted the Defender ballot (`defender-2026-10-26`), pasted the verdict when Submit could
  not reach the Worker, then asked for the verdicts, the sims and the revisions in the same session and a `/plot` of
  the trial set ("Verdicts + revisions now + sims").
- The family: `plan/card-ledger/rehearsal-defender.md` on PR "plan: Defender — verdicts and revisions" (branch
  `plan/defender-verdicts`): Session 0, the slot pitches, the ballot, `## Verdicts` (T's text verbatim and the thirty
  cards with T's notes applied) and `## Revisions` (T's rules, colours, names, relics, test deck). That ledger is the
  card text of record; this brief does not repeat it.
- The sims (lane-creator step 6): branch `sandbox/defender-sims`, results `plan/card-ledger/defender-sims.md` on that
  branch. A measurement, not a gate (D57); never merged. Port its logic, not its files.
- Rules, final for this build (Session 0 and the revisions, T's words in the ledger):
  - **GUARD** is plain shared GUARD. **GUARD holds** (new glossary term, T): you have taken no damage this turn.
  - **THORNS n**: each foe strike deals n back to the foe, per strike; THORNS drops by 1 each round; it is a DEAL
    (VULNERABLE boosts it, FROZEN doubles it, Crimson Pact's +n rides on it); it scales with Heart (D110).
  - **REFLECT n%**: each foe strike sends n% of the strike's damage before GUARD back to the foe, as a DEAL. It never
    reduces the hit (T: "10 dmg vs. 100% reflect means both entities take 10 dmg"). It lasts 2 turns; a new REFLECT
    adds its % and refreshes the duration to 2 turns. No cap.
  - **Discard N cards at random** is a PAID-only cost, printed in plain words. A PAID line whose discard cannot be paid
    (fewer other cards in hand) cannot be played, and is refused loudly (T's Session 0 words: a short vibration and
    the card shakes; End turn gets the same treatment and the turn does not end). The FREE line always plays.
  - **RETRIEVE n** is a new keyword for every lane, as DRAW is (T): "Return a random card from your discard to your
    hand."
  - **"If this card is discarded"** (M-09, T): fires on a random discard and on the scrap (the trash can,
    `discardCombatCard`, +1 Conviction).
  - A Global's PAID line equals its FREE line; paying makes it permanent.
- The precedents: Phase EL1 (`plan/phases/phase_EL1_elementalist_trial_set.md`, the Elementalist trial set) for the
  shape; Phase BT (D75, D80, D81) and `plan/revamp/cards.md` "The trial set" for the removable-set rules; Phase LR1
  (`plan/phases/phase_LR1_lane_relics.md`) for the lane relics, their sources and per-signature costs.
- Code read while shaping this:
  - `Cards/cards.library.ts` `TRIAL_SETS`; `Cards/card.lanes.ts` (`CardLane`, `testDeck`; the dev menu reads
    `CARD_LANES`, so `DebugLaneDeck.tsx` and `DebugRewardPool.tsx` need no edit).
  - `Combat/combat.engine.ts`: `discardCombatCard` (the scrap, `:592`), `discardEntry` (`:621`), the unpayable
    SACRIFICE refusal (`:2017`); `Combat/combat.card-program.ts` (the verbs, `exiled`, the SACRIFICE shortfall `:947`).
  - `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx`: `useJuiceShake` (the reject shake, `:606`) and
    `Haptics` (`:35`); `state/combat/keywords.ts` `KEYWORD_GLOSS`.
  - `Items/types.ts` (`AccessoryKind`), `Items/relic.library.ts`.

## Outcome

On a preview build, T picks the Defender in the dev menu's TEST LANE DECK and plays its 20-card deck: THORNS and
REFLECT show on the player with their numbers and turns, each foe strike visibly sends damage back, a PAID line that
would discard more cards than T holds shakes and will not play, and the Elementalist and Blood Price play exactly as
before. With the Defender box checked in the reward pool, all 30 cards are offered. The Defender's three relics exist
in the relic library with their signatures. The Defender is the third registered lane, so the first character
(CH1e) can be authored.

## Acceptance

- **A1** The engine carries THORNS and REFLECT exactly as in Sources: per strike, THORNS's drop by 1 each round,
  REFLECT's 2-turn duration with adding and refreshing, REFLECT off the pre-GUARD strike without reducing the hit,
  both as DEALs (VULNERABLE and FROZEN apply). Each trigger, drop and expiry emits a combat event. A hermetic engine
  test pins each rule, including T's worked REFLECT example (25% with 1 turn left, +50% = 75% for 2 turns; a turn
  later, +25% = 100% for 2 turns) and "10 damage against 100% REFLECT: both take 10".
- **A2** The PAID discard: "Discard N cards at random" as a cost the program pays before the line's effects, a seeded
  random pick, and a line that cannot pay refused at the engine (no state change, a refusal event naming the
  shortfall), as an unpayable SACRIFICE is. An engine test per path, including P-07 PAID with no other card.
- **A3** The card-program context gains the rest of what the 30 cards need, each with a test: RETRIEVE n; return a
  random exiled card to the draw pile; the "if this card is discarded" trigger on a random discard and on the scrap;
  GUARD kept through the end of the foe's next turn (M-04 PAID); "while GUARD holds" doubling THORNS (P-08); REFLECT
  armed for the foe's next attack (P-09 PAID); the reads (your THORNS, your GUARD, REFLECT, damage your DEALs did this
  turn, hand size); double your THORNS; lose VITAE as a self-loss (E-09). The sim witness values them, as the
  sandbox's did.
- **A4** `axiomancer-mechanics/docs/keyword-atlas.md` has rows for THORNS, REFLECT and RETRIEVE, and the glossary
  carries "GUARD holds".
- **A5** Mobile: `KEYWORD_GLOSS` has THORNS, REFLECT and RETRIEVE, each with a popup, and "holds" in the glossary.
  The player panel shows THORNS (its number) and REFLECT (its % and turns left) and updates them as they change; the
  log shows each THORNS and REFLECT hit back. Card faces print the new keywords.
- **A6** Mobile: an unpayable PAID discard line is refused loudly: on apply the card gets the reject shake and a short
  vibration and nothing is played; End turn with that play staged gets the same and the turn does not end. A store or
  component test for each.
- **A7** `Cards/library/defender.cards.ts` holds the 30 cards with the ledger's text, the numbers T chose to ship
  (the ledger's "The numbers" table: the sims' fixes), T's names and T's colours (10 red, 10 blue, 10 purple), one upgrade each as commons, as a
  removable trial set joined by one `TRIAL_SETS` line.
- **A8** The lane `defender` ("Defender") lists all 30 as `cardIds`; its `testDeck` is the ledger's 20 (every Global
  and every Spell; T, 2026-10-26).
- **A9** Every existing card-rules guard passes for the 30: scrap floor, complexity budget, face honesty, keyword
  carrier, upgrade law. The trial-set removal test passes with the set unregistered, and no code outside the set names
  a Defender card id. Grey, Blood Price and the Elementalist play exactly as before (their measured-truth cells are
  identical before and after).
- **A10** The three Defender relics (the ledger's table: Thornback Signet, elite only; Mirror Brooch and Carapace
  Belt, quest) are in `relicLibrary` with `laneId: 'defender'`, their stats, `relicSource` and their signatures at
  their own Conviction costs, each signature refused when it would do nothing; each reads "Lane: Defender (while
  worn)". Signature names and descriptions are plain and marked `[content]` for T.
- **A11** (attended) On a preview APK, T sets the Defender test deck from `/dev`, plays a fight, and checks the reward
  pool box.

Measure: T plays the Defender test deck on a preview build and sees THORNS and REFLECT send damage back on each foe
strike, with their numbers on the board changing as ruled.

## Scope

- `axiomancer-mechanics`: the spikes module beside the combat state (THORNS, REFLECT); the discard cost and its
  refusal; the program verbs, reads and triggers; the strike hook for THORNS and REFLECT; the events; the trial-set
  file and its `TRIAL_SETS` line; the lane; the relics; the atlas rows and the tests.
- `axiomancer-mobile`: `state/combat/keywords.ts`, the THORNS and REFLECT badges on the player panel, the log lines,
  the card-face tokens, the unpayable-PAID refusal (shake, vibration, End turn held); tests.
- No change to grey, Blood Price, the Elementalist, any enemy, or any constant outside the spikes module.

## Consumers to update

- `@mechanics` barrel: the spikes types, the trial set, the relics.
- `docs/game-model.md`: the Defender trial set, as for the Elementalist.
- `plan/card-ledger/rehearsal-defender.md`: the set is live, with a pointer to the file.
- `plan/phases/phase_CH1_character_select.md`: CH1e's premise (three registered lanes) is met once DF1c lands.

## Save / schema contracts

- THORNS and REFLECT live in the combat state only, never in a save between fights. Saves drop removed Defender ids
  on load through the existing `dropUnknownCardIds`. The relics use LR1's `laneId` and `relicSource` fields; no new
  save field.

## Decisions made upfront — DO NOT ASK

- **REFLECT is unscaled** [T to confirm #1]: the % prints and applies as written; THORNS's n scales with Heart (D110).
- **The End-turn refusal** [T to confirm #2]: End turn is held only while an unpayable PAID discard play is staged
  (a die on the PAID line of a card that cannot pay); with no such play, End turn ends the turn as today.
- **Numbers.** Confirmed by T (2026-10-27): "Ship the sims' fixes": P-01, P-03, P-04, P-06, E-01, E-04, E-07, M-04,
  M-08 and M-09 change as the ledger's "The numbers" table lists; every other number is T's as voted and revised.
  The numbers live in the one trial-set file, so T can restore any.
- **The quest relics' source** [T to confirm #3]: the Mirror Brooch and Carapace Belt get `relicSource: 'quest'` but
  no new Act 1 quest; until a quest hands them out they are reachable from `/dev` only. The Thornback Signet joins
  the elite drop pool.
- **The sims' rule readings are adopted** where the ledger is silent (listed in `defender-sims.md`, "The setup").
- **THORNS drops at the round's end**, for a stack that was up when the round began, as BLIZZARD's drift does.
- **The random discard picks from the other cards in hand**, never the card being played, with the combat's seeded
  rng.
- **Card art**: the existing no-art fallback.

## Tests matrix

- Mechanics (hermetic): each spikes rule (A1); the discard cost and refusal (A2); each verb, read and trigger (A3);
  a 20-card test-deck fight resolving; the card-rules guards and the removal test (A9); the three relics (A10); grey,
  Blood Price and the Elementalist unchanged in their measured-truth cells.
- Mobile: the gloss covers every keyword a live card prints (the existing guard); the badges render from a fixture
  state; the refusal on apply and on End turn (A6); the dev lane picker lists the Defender.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, the root `npm test`.

## Commit body template

```
<phase id> — <title>

Closes <A-ids> of plan/phases/phase_DF1_defender_trial_set.md.
<what changed, by package>
Verify: <commands and results>
```

## DoD

A1-A10 closed by DF1a-DF1e. A11 is T's check on the preview build.

## Follow-ups (out of scope)

- Act 1 quests that hand out the Mirror Brooch and the Carapace Belt (unless T answers #3 otherwise).
- T's names for the three signature skills.
- The illegal-PAID refusal for an unpayable SACRIFICE on the board, if it is not already loud the same way (Session 0
  Open: "an engine and UI rule for every card"); A6 builds the discard case on the shared shake.
- The Defender's pair identities with Blood Price and the Elementalist (Session 0 Open).
- The pace: with the shipped numbers the Defender still runs under T's 3 / 5 / 7 turn targets (the sims); and the
  structure questions the sims raised (M-07 PAID, M-09 FREE, M-02 and M-05 PAID), for after T plays it.

## Phases

### DF1a — The spikes engine · L · closes A1, A2 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics`; the A1 and A2 tests pass, and the grey, Blood Price and Elementalist
cells are unchanged.
- Scope: the spikes module (THORNS, REFLECT), the strike hook, the events and witness values; the PAID discard cost and
  its engine refusal. Port from `sandbox/defender-sims`.
- Verify gate: mechanics verify, root `npm test`.

### DF1b — The Defender's verbs and keywords · M · closes A3, A4 · requires DF1a
Measure: mechanics verify; every A3 verb, read and trigger has a passing test.
- Scope: RETRIEVE, the exile return, the discard trigger (random and scrap), GUARD kept, "while GUARD holds", REFLECT
  armed, the reads, double THORNS, the self-loss; the atlas rows and the glossary term.
- Verify gate: mechanics verify, root `npm test`.

### DF1c — The spikes on the board · M · closes A5, A6 · requires DF1b
Measure: `npm run verify -w axiomancer-mobile`; a fixture fight shows the THORNS and REFLECT badges, and the refusal
tests pass.
- Scope: `state/combat/keywords.ts` glosses and popups, the badges, log lines, card-face tokens; the unpayable-PAID
  shake, vibration and held End turn.
- Verify gate: mobile verify.

### DF1d — The Defender cards and lane · M · closes A7, A8, A9 · requires DF1b, DF1c
Measure: mechanics and mobile verify; the dev lane picker test lists the Defender with its 20-card deck.
- Scope: `defender.cards.ts`, the `TRIAL_SETS` line, the lane, the tests, the consumer docs.
- Verify gate: mechanics verify, mobile verify, root `npm test`.

### DF1e — The Defender's relics · S · closes A10 · requires DF1d, LR1d
Measure: mechanics verify; the relic tests pass and each relic's detail reads "Lane: Defender (while worn)".
- Scope: the three relics in `relicLibrary`, their signatures and costs, the elite pool line.
- Verify gate: mechanics verify, mobile verify, root `npm test`.

### DF1f — T's check (attended) · S · closes A11 · requires DF1d
Measure: T plays the Defender test deck on the preview build.
- Scope: the session cuts a preview APK after DF1d merges; T plays it.
