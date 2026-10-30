# Phase MF1 — The Merciful trial set (my mending is a weapon)

## Sources

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

## Outcome

On a preview build, T picks the Merciful in the dev menu's TEST LANE DECK and plays its 20-card deck: RADIANCE heals
T and hits the foe for what it healed; MERCY heals the foe, and its total and clock show on the foe and count down
until it bursts; the sun and the dove mark the cards' FREE corners. With the Merciful box checked in the reward pool,
all 29 cards are offered. The Suppliant's Ring reads "Lane: Merciful (while worn)". The Merciful is a registered lane,
so the first character (CH1e) can be authored with it.

Size: multi-phase (MF1a L, MF1b M, MF1c M, MF1d M, MF1e S attended).

## Acceptance

- **A1** The engine carries RADIANCE exactly as in Sources: the heal, then a DEAL of what it restored, 0 at full
  VITAE, VULNERABLE and FROZEN applying. Each RADIANCE emits a combat event with the heal and the hit. A hermetic test
  pins RADIANCE 5 at full VITAE (0), 3 below max (3), and 10 below max against VULNERABLE.
- **A2** The engine carries MERCY exactly as in Sources: the heal stopping at the foe's max, N added whatever the heal
  restored, the 3-turn clock from the first MERCY, no reset on a new MERCY, the burst at the start of the foe's turn as
  a DEAL of twice the total, the clear, and a fresh clock after. Each add, tick and burst emits a combat event. A
  hermetic test pins T's worked example (MERCY 10, then MERCY 10 with 1 turn left: the foe takes 40), MERCY 5 on a
  foe at full (adds 5), and a MERCY played after a burst starting a new clock. MERCY lives in the combat state only.
- **A3** YIELDING: a foe that is YIELDING reads its befriend gate as open (`befriendHpGateOpen` or its caller), so
  The Open Hand can spare it whatever its VITAE; a foe without a `friendshipReward` stays unbefriendable. A test per
  path.
- **A4** The card-program context gains the rest of what the 29 cards need, each with a test: burst the foe's MERCY
  now; tick the clock by n (a tick to 0 bursts at once); the reads (the foe has MERCY, the foe's MERCY total, all you
  healed this turn, VITAE you are missing, you below half VITAE, the foe at max VITAE); heals this turn +n and
  times n; your next HEAL is RADIANCE; your HEALs this turn are RADIANCE and deal double; +n max VITAE this combat;
  HEAL to full; return the last n MERCY cards you played this combat; the foe's next attack deals n less; clear one or
  every debuff on you; the foe is YIELDING while it has MERCY. The sim witness values them, as the sandbox's did.
- **A5** `axiomancer-mechanics/docs/keyword-atlas.md` has rows for RADIANCE, MERCY and YIELDING. "Bursts" is plain
  vocabulary, not a keyword (T, 2026-10-30): no BURST atlas row, glossary entry or exemption; the MERCY row says what
  happens when its clock runs out.
- **A6** Mobile: `KEYWORD_GLOSS` has RADIANCE, MERCY and YIELDING, each with a popup. The foe panel shows its MERCY
  total and turns left and updates both as they change; YIELDING shows while it holds; the log shows each RADIANCE
  hit and each burst.
- **A7** Mobile: the FREE corner pill draws a sun for a RADIANCE line and a dove for a MERCY line, from game-icons in
  the icon manifest as the item icons are (`glyphShapes.ts`), and the card faces print the new keywords. The
  card-face honesty guard passes.
- **A8** `Cards/library/merciful.cards.ts` holds the 29 cards with the ledger's text and shipped numbers, T's names
  (drafted; see call 1) and the ledger's colours (10 red, 10 blue, 9 purple), one upgrade each as commons, as a
  removable trial set joined by one `TRIAL_SETS` line.
- **A9** The lane `merciful` ("Merciful") lists all 29 as `cardIds`; its `testDeck` is the ledger's 20.
- **A10** Every existing card-rules guard passes for the 29: scrap floor, complexity budget, face honesty, keyword
  carrier, upgrade law. The trial-set removal test passes with the set unregistered, and no code outside the set names
  a Merciful card id. Grey, Blood Price, the Elementalist and the Defender play exactly as before (their
  measured-truth cells are identical before and after).
- **A11** The Suppliant's Ring carries `laneId: 'merciful'` and reads "Lane: Merciful (while worn)"; its source is
  call 2's answer.
- **A12** (attended) On a preview APK, T sets the Merciful test deck from `/dev`, plays a fight, and checks the reward
  pool box.

Measure: T plays the Merciful test deck on a preview build and sees RADIANCE hit for what it healed and MERCY count
down on the foe and burst for twice its total.

## Scope

- `axiomancer-mechanics`: the mercy module beside the combat state (MERCY's total and clock, the burst, YIELDING);
  RADIANCE; the program verbs and reads; the turn-start hook for the clock; the events and witness values; the
  trial-set file and its `TRIAL_SETS` line; the lane; the ring's lane tag; the atlas rows and the tests.
- `axiomancer-mobile`: `state/combat/keywords.ts`, the foe's MERCY and YIELDING badges, the log lines, the sun and
  dove glyph shapes, the card-face tokens; tests.
- No change to grey, Blood Price, the Elementalist, the Defender, any enemy, or any constant outside the mercy module.

## Consumers to update

- `@mechanics` barrel: the mercy types, the trial set.
- `docs/game-model.md`: the Merciful trial set, as for the Defender.
- `plan/card-ledger/rehearsal-merciful.md`: the set is live, with a pointer to the file.
- `plan/phases/phase_CH1_character_select.md`: CH1e can now pick the Merciful.

## Save / schema contracts

- MERCY, its clock and YIELDING live in the combat state only, never in a save between fights. "+n max VITAE this
  combat" ends with the combat. Saves drop removed Merciful ids on load through the existing `dropUnknownCardIds`. The
  ring uses LR1's `laneId` and `relicSource` fields; no new save field.

## Decisions made upfront — DO NOT ASK

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

## Tests matrix

- Mechanics (hermetic): RADIANCE (A1); MERCY's clock, burst and clear (A2); YIELDING (A3); each verb and read (A4); a
  20-card test-deck fight resolving; the card-rules guards and the removal test (A10); the ring's lane tag (A11);
  grey, Blood Price, the Elementalist and the Defender unchanged in their measured-truth cells.
- Mobile: the gloss covers every keyword a live card prints (the existing guard); the foe badges render from a fixture
  state; the sun and dove shapes resolve; the dev lane picker lists the Merciful.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, the root `npm test`.

## Commit body template

```
<phase id> — <title>

Closes <A-ids> of plan/phases/phase_MF1_merciful_trial_set.md.
<what changed, by package>
Verify: <commands and results>
```

## DoD

A1-A11 closed by MF1a-MF1d. A12 is T's check on the preview build.

## Follow-ups (out of scope)

- **HURRY N** (T: every status on both sides ticks down N): ruled, printed by no kept card; built with the first card
  that prints it.
- E-09's overheal-draw card ("Whenever you heal past your max, draw a card"): a new card, and "when you heal" is not a
  Global trigger yet.
- The Merciful's two other relics (T picks from the session's pitches).
- The enemy revision (T, 2026-10-30), then the pace and structure the sims raised: RADIANCE whiffing at full VITAE,
  M-04b's debuff clear (no Act 1 foe debuffs you), MERCY left unburst at a fight's end.
- Whether a Merciful card can be a character's starting lane card (T: decide at CH1).

## Phases

### MF1a — MERCY and RADIANCE · L · closes A1, A2, A3 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics`; the A1, A2 and A3 tests pass, and the grey, Blood Price,
Elementalist and Defender cells are unchanged.
- Scope: the mercy module (total, clock, burst, clear), RADIANCE, YIELDING on the befriend gate, the turn-start hook,
  the events and witness values. Port from `sandbox/merciful-sims`, with MERCY on a full foe adding N.
- Verify gate: mechanics verify, root `npm test`.

### MF1b — The Merciful's verbs and keywords · M · closes A4, A5 · requires MF1a
Measure: mechanics verify; every A4 verb and read has a passing test.
- Scope: burst now, the clock tick, the reads, the heal modifiers, next HEAL as RADIANCE, the double RADIANCE turn,
  max VITAE, HEAL to full, the MERCY-card return, the attack cut, the debuff clear, YIELDING while MERCY; the atlas rows
  and the glossary word.
- Verify gate: mechanics verify, root `npm test`.

### MF1c — Mercy on the board · M · closes A6, A7 · requires MF1a
Measure: `npm run verify -w axiomancer-mobile`; a fixture fight shows the foe's MERCY total and turns left, and the sun
and dove pills render.
- Scope: `state/combat/keywords.ts` glosses and popups, the foe badges, log lines, card-face tokens, the sun and dove
  glyph shapes. Runs beside MF1b (T, 2026-10-30): it reads only MF1a's MERCY state and events, and touches only
  `axiomancer-mobile`; MF1b touches only `axiomancer-mechanics`.
- Verify gate: mobile verify.

### MF1d — The Merciful cards and lane · M · closes A8, A9, A10, A11 · requires MF1b, MF1c
Measure: mechanics and mobile verify; the dev lane picker test lists the Merciful with its 20-card deck, and the ring
reads "Lane: Merciful (while worn)".
- Scope: `merciful.cards.ts`, the `TRIAL_SETS` line, the lane, the ring's `laneId` and source, the tests, the consumer
  docs.
- Verify gate: mechanics verify, mobile verify, root `npm test`.

### MF1e — T's check (attended) · S · closes A12 · requires MF1d
Measure: T plays the Merciful test deck on the preview build.
- Scope: the session cuts a preview APK after MF1d merges; T plays it.
