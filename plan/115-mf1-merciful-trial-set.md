# 115 — The Merciful trial set (my mending is a weapon)

> On a preview build, T picks the Merciful in the dev menu's TEST LANE DECK and plays its 20-card deck: RADIANCE heals T and hits the foe for what it healed; MERCY heals the foe, and its total and clock show on the foe and count down until it bursts; the sun and the dove mark the cards' FREE corners. With the Merciful box checked in the reward pool, all 29 cards are offered. The Suppliant's Ring reads "Lane: Merciful (while worn)". The Merciful is a registered lane, so the first character (CH1e) can be authored with it.

Carried from the v1 brief `phase_MF1_merciful_trial_set.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_MF1_merciful_trial_set.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- T, 2026-10-29 to 2026-10-30 (attended, `/lane-creator`): Session 0, the slot pitches, the ballot
  (`merciful-2026-10-29`), the verdicts, the rulings after the vote, the sims and the revisions. Then, after the sims:
  "Enemies have an incoming revision coming in. For now, let's make your recommended changes and get this land into
  the build so we can get started on our first character."
- The family: `plan/card-ledger/rehearsal-merciful.md` (this PR adds `## Revisions`). Its sections, in order of
  authority, are the card text of record: `## Revisions` (rules, the shipped numbers, names, colours, test deck,
  relic), then "Rulings after the vote", then "As kept, with T's notes applied", then Session 0. This brief does not
  repeat the card text.
- The sims (lane-creator step 6): branch `sandbox/merciful-sims` (head `227755148`), report
  `plan/card-ledger/merciful-sims.md` on that branch. A measurement, not a gate (D57); never merged. Port its logic,
  not its files: `Combat/combat.merciful.ts` (the state, the clock), the sandbox verbs in `combat.card-program.ts` and
  `card-program.types.ts` (`radiance`, `mercy`, `burstMercy`, `tickMercy`, `healsPlus`, `healsTimes`,
  `nextHealRadiance`, `allHealsRadianceDouble`, `maxVitae`, `healToFull`, …), the hooks in `combat.engine.ts`, and
  the witness in `combat.encounter.sim.ts`.
- Rules, final for this build (T's words in the ledger):
  - **RADIANCE N**: HEAL N, then DEAL what that heal actually restored (0 at full VITAE). The hit is a DEAL
    (VULNERABLE boosts it, FROZEN doubles it, Crimson Pact's +n rides on it).
  - **MERCY N** on the foe: heal the foe N (stopping at its max VITAE) and add N to its MERCY total, whatever the heal
    restored. The first MERCY starts a 3-turn clock; a new MERCY adds to the total and never resets the clock. When
    the clock runs out, at the start of the foe's turn, the MERCY **bursts**: a DEAL of twice the total. Then the total
    clears to 0 and the next MERCY starts a fresh clock. Card text says "bursts", never "triggers" (T).
  - **YIELDING**: while a foe is YIELDING, you can befriend it whatever its VITAE (its `hpGate` reads open). M-02b
    makes a foe with MERCY YIELDING.
  - **Heart scales** MERCY and RADIANCE numbers as it scales LEECH (D110).
  - SACRIFICE and LEECH are Blood Price's, unchanged. A Spell's PAID line EXILEs (D103). Globals: FREE in play 3
    turns, PAID for the rest of combat, all on start of your turn.
- Icons (T, 2026-10-29): RADIANCE's FREE corner mark is **the sun**; MERCY's is **the dove**.
- The precedents: Phase DF1 (`plan/phases/phase_DF1_defender_trial_set.md`) for the shape; Phase EL1 for a lane with
  a foe-side status; Phase BT (D75, D80, D81) and `plan/revamp/cards.md` "The trial set" for the removable-set rules;
  Phase LR1 for lane relics.
- Code read while shaping this:
  - `Cards/cards.library.ts` `TRIAL_SETS`; `Cards/card.lanes.ts` (`CardLane`, `testDeck`; the dev menu reads
    `CARD_LANES`).
  - `Cards/card-program.types.ts` (the verbs and reads), `Combat/combat.card-program.ts`, `Combat/combat.engine.ts`
    (HEAL, LEECH, SACRIFICE, EXILE, the turn-start Globals).
  - `Enemy/befriend.ts` (`befriendHpGateOpen`, read by The Open Hand); `Combat/combat.signature.ts`.
  - `Items/relic.library.ts` (the Suppliant's Ring, `relic-disarming-plea`: no lane, no source); `Items/types.ts`
    (`laneId`, `relicSource`: `'quest' | 'elite'`).
  - `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx` (`FreeCornerPill`, `glyphShapeFor`),
    `components/combat/glyphShapes.ts`, `state/combat/keywords.ts` `KEYWORD_GLOSS`.

### Outcome

On a preview build, T picks the Merciful in the dev menu's TEST LANE DECK and plays its 20-card deck: RADIANCE heals
T and hits the foe for what it healed; MERCY heals the foe, and its total and clock show on the foe and count down
until it bursts; the sun and the dove mark the cards' FREE corners. With the Merciful box checked in the reward pool,
all 29 cards are offered. The Suppliant's Ring reads "Lane: Merciful (while worn)". The Merciful is a registered lane,
so the first character (CH1e) can be authored with it.

Size: multi-phase (MF1a L, MF1b M, MF1c M, MF1d M, MF1e S attended).

## Design

### Scope

- `axiomancer-mechanics`: the mercy module beside the combat state (MERCY's total and clock, the burst, YIELDING);
  RADIANCE; the program verbs and reads; the turn-start hook for the clock; the events and witness values; the
  trial-set file and its `TRIAL_SETS` line; the lane; the ring's lane tag; the atlas rows and the tests.
- `axiomancer-mobile`: `state/combat/keywords.ts`, the foe's MERCY and YIELDING badges, the log lines, the sun and
  dove glyph shapes, the card-face tokens; tests.
- No change to grey, Blood Price, the Elementalist, the Defender, any enemy, or any constant outside the mercy module.

### Consumers to update

- `@mechanics` barrel: the mercy types, the trial set.
- `docs/game-model.md`: the Merciful trial set, as for the Defender.
- `plan/card-ledger/rehearsal-merciful.md`: the set is live, with a pointer to the file.
- `plan/phases/phase_CH1_character_select.md`: CH1e can now pick the Merciful.

### Decisions made upfront — DO NOT ASK

- **Names** Accepted at merge (default): the ledger's drafted names ship (`## Revisions`, "Names"). T edits any on this PR.
- **The ring's source** Accepted at merge (default): the Suppliant's Ring gets `relicSource: 'elite'` and joins the elite drop
  pool, so a Merciful run can find it; until then it stays reachable from `/dev`.
- **Numbers**: T, 2026-10-30, "make your recommended changes": the sims' changes 1 to 5 and 8, as the ledger's "The
  numbers" table lists; every other number is as voted with T's notes and rulings. They live in the one trial-set
  file, so T can restore any.
- **The sims' rule readings are adopted** where the ledger is silent (listed in `merciful-sims.md`, "Modelling
  assumptions"), except MERCY on a full foe, which T ruled N.
- **The burst is a DEAL against foe GUARD** if a foe ever has GUARD; today foes carry none, so the code path is
  covered by a fixture test only.
- **"Bursts now" bursts on your turn**, at once, as does a tick that takes the clock to 0; the total then clears.
- **"All you healed this turn"** counts every VITAE you regained this turn, the turn-start Globals included, not
  MERCY's heal on the foe or LEECH's drain on it.
- **"Return the last MERCY card"** means the most recent card in your discard whose played line gave MERCY.
- **Card art**: the existing no-art fallback.

### Tests matrix

- Mechanics (hermetic): RADIANCE (A1); MERCY's clock, burst and clear (A2); YIELDING (A3); each verb and read (A4); a
  20-card test-deck fight resolving; the card-rules guards and the removal test (A10); the ring's lane tag (A11);
  grey, Blood Price, the Elementalist and the Defender unchanged in their measured-truth cells.
- Mobile: the gloss covers every keyword a live card prints (the existing guard); the foe badges render from a fixture
  state; the sun and dove shapes resolve; the dev lane picker lists the Merciful.

### Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, the root `npm test`.

### Commit body template

```
<phase id> — <title>

Closes <A-ids> of plan/phases/phase_MF1_merciful_trial_set.md.
<what changed, by package>
Verify: <commands and results>
```

### Follow-ups (out of scope)

- **HURRY N** (T: every status on both sides ticks down N): ruled, printed by no kept card; built with the first card
  that prints it.
- E-09's overheal-draw card ("Whenever you heal past your max, draw a card"): a new card, and "when you heal" is not a
  Global trigger yet.
- The Merciful's two other relics (T picks from the session's pitches).
- The enemy revision (T, 2026-10-30), then the pace and structure the sims raised: RADIANCE whiffing at full VITAE,
  M-04b's debuff clear (no Act 1 foe debuffs you), MERCY left unburst at a fight's end.
- Whether a Merciful card can be a character's starting lane card (T: decide at CH1).

### Chunk notes (the brief's phase blocks)

#### MF1e (chunk 115.5)

Measure: T plays the Merciful test deck on the preview build.
- Scope: the session cuts a preview APK after MF1d merges; T plays it.

## Contracts

- MERCY, its clock and YIELDING live in the combat state only, never in a save between fights. "+n max VITAE this
  combat" ends with the combat. Saves drop removed Merciful ids on load through the existing `dropUnknownCardIds`. The
  ring uses LR1's `laneId` and `relicSource` fields; no new save field.

## Acceptance

- **A12** (attended) On a preview APK, T sets the Merciful test deck from `/dev`, plays a fight, and checks the reward
  pool box.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 1 open · 11 closed · next A13

- [ ] **115.5** T's check (attended) · S · closes A12 · needs — · alias: MF1e
