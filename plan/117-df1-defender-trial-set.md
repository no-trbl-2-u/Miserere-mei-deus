# 117 — The Defender trial set (the turtle with spikes)

> On a preview build, T picks the Defender in the dev menu's TEST LANE DECK and plays its 20-card deck: THORNS and REFLECT show on the player with their numbers and turns, each foe strike visibly sends damage back, a PAID line that would discard more cards than T holds shakes and will not play, and the Elementalist and Blood Price play exactly as before. With the Defender box checked in the reward pool, all 30 cards are offered. The Defender's three relics exist in the relic library with their signatures. The Defender is the third registered lane, so the first character (CH1e) can be authored.

Carried from the v1 brief `phase_DF1_defender_trial_set.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_DF1_defender_trial_set.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- T, 2026-10-26 (attended): voted the Defender ballot (`defender-2026-10-26`), pasted the verdict when Submit could
  not reach the Worker, then asked for the verdicts, the sims and the revisions in the same session and a `/plot` of
  the trial set ("Verdicts + revisions now + sims").
- The family: `plan/card-ledger/rehearsal-defender.md` on PR #975, "plan: Defender — verdicts, sims and revisions" (branch
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

### Outcome

On a preview build, T picks the Defender in the dev menu's TEST LANE DECK and plays its 20-card deck: THORNS and
REFLECT show on the player with their numbers and turns, each foe strike visibly sends damage back, a PAID line that
would discard more cards than T holds shakes and will not play, and the Elementalist and Blood Price play exactly as
before. With the Defender box checked in the reward pool, all 30 cards are offered. The Defender's three relics exist
in the relic library with their signatures. The Defender is the third registered lane, so the first character
(CH1e) can be authored.

## Design

### Scope

- `axiomancer-mechanics`: the spikes module beside the combat state (THORNS, REFLECT); the discard cost and its
  refusal; the program verbs, reads and triggers; the strike hook for THORNS and REFLECT; the events; the trial-set
  file and its `TRIAL_SETS` line; the lane; the relics; the atlas rows and the tests.
- `axiomancer-mobile`: `state/combat/keywords.ts`, the THORNS and REFLECT badges on the player panel, the log lines,
  the card-face tokens, the unpayable-PAID refusal (shake, vibration, End turn held); tests.
- No change to grey, Blood Price, the Elementalist, any enemy, or any constant outside the spikes module.

### Consumers to update

- `@mechanics` barrel: the spikes types, the trial set, the relics.
- `docs/game-model.md`: the Defender trial set, as for the Elementalist.
- `plan/card-ledger/rehearsal-defender.md`: the set is live, with a pointer to the file.
- `plan/phases/phase_CH1_character_select.md`: CH1e's premise (three registered lanes) is met once DF1c lands.

### Decisions made upfront — DO NOT ASK

- **REFLECT is unscaled** (Accepted at merge, default): the % prints and applies as written; THORNS's n scales with Heart (D110).
- **The End-turn refusal** (Accepted at merge, default): End turn is held only while an unpayable PAID discard play is staged
  (a die on the PAID line of a card that cannot pay); with no such play, End turn ends the turn as today.
- **Numbers.** Confirmed by T (2026-10-27): "Ship the sims' fixes": P-01, P-03, P-04, P-06, E-01, E-04, E-07, M-04,
  M-08 and M-09 change as the ledger's "The numbers" table lists; every other number is T's as voted and revised.
  The numbers live in the one trial-set file, so T can restore any.
- **The quest relics' source** (Accepted at merge, default): the Mirror Brooch and Carapace Belt get `relicSource: 'quest'` but
  no new Act 1 quest; until a quest hands them out they are reachable from `/dev` only. The Thornback Signet joins
  the elite drop pool.
- **The sims' rule readings are adopted** where the ledger is silent (listed in `defender-sims.md`, "The setup").
- **THORNS drops at the round's end**, for a stack that was up when the round began, as BLIZZARD's drift does.
- **The random discard picks from the other cards in hand**, never the card being played, with the combat's seeded
  rng.
- **Card art**: the existing no-art fallback.

### Tests matrix

- Mechanics (hermetic): each spikes rule (A1); the discard cost and refusal (A2); each verb, read and trigger (A3);
  a 20-card test-deck fight resolving; the card-rules guards and the removal test (A9); the three relics (A10); grey,
  Blood Price and the Elementalist unchanged in their measured-truth cells.
- Mobile: the gloss covers every keyword a live card prints (the existing guard); the badges render from a fixture
  state; the refusal on apply and on End turn (A6); the dev lane picker lists the Defender.

### Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, the root `npm test`.

### Commit body template

```
<phase id> — <title>

Closes <A-ids> of plan/phases/phase_DF1_defender_trial_set.md.
<what changed, by package>
Verify: <commands and results>
```

### Follow-ups (out of scope)

- Act 1 quests that hand out the Mirror Brooch and the Carapace Belt (unless T answers #3 otherwise).
- T's names for the three signature skills.
- The illegal-PAID refusal for an unpayable SACRIFICE on the board, if it is not already loud the same way (Session 0
  Open: "an engine and UI rule for every card"); A6 builds the discard case on the shared shake.
- The Defender's pair identities with Blood Price and the Elementalist (Session 0 Open).
- The pace: with the shipped numbers the Defender still runs under T's 3 / 5 / 7 turn targets (the sims); and the
  structure questions the sims raised (M-07 PAID, M-09 FREE, M-02 and M-05 PAID), for after T plays it.

### Chunk notes (the brief's phase blocks)

#### DF1f (chunk 117.6)

Measure: T plays the Defender test deck on the preview build.
- Scope: the session cuts a preview APK after DF1d merges; T plays it.

## Contracts

- THORNS and REFLECT live in the combat state only, never in a save between fights. Saves drop removed Defender ids
  on load through the existing `dropUnknownCardIds`. The relics use LR1's `laneId` and `relicSource` fields; no new
  save field.

## Acceptance

- **A11** (attended) On a preview APK, T sets the Defender test deck from `/dev`, plays a fight, and checks the reward
  pool box.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 1 open · 10 closed · next A12

- [ ] **117.6** T's check (attended) · S · closes A11 · needs — · alias: DF1f
