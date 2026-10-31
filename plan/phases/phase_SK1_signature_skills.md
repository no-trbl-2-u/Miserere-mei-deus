# Phase SK1 — The Chosen's signature says why it will not fire, and the play log takes fights again

> `/plot asap` from T, 2026-10-31, run unattended (T not available for
> questions). Three phases: SK1c, SK1a and SK1b. SK1c was added on T's
> answer to call 1 on PR #1236 (2026-10-31): every foe can be befriended.

## Sources

- T's report from playing the preview APK built from `main` 8f876ec
  (2026-10-31), as The Chosen, level 1: "3) I still can't play the Signature
  Skills o.0?"
- The earlier report it repeats: Phase SG1 (#921, reworked #928, 2026-10-25),
  T: "Signature skills do not work! There's no icon in combat to trigger them.
  And even the starting relic's signature skill doesn't allow the player to
  trigger the sigSkill."
- Phase EQ1b (#866, the refused rune says why on tap), Phase LR1g (#965, the
  `ui-signature-refused` play-log event), Phase CH1f (#1180, the Chosen in
  the roster), the CH1 brief's "T's characters" table (T picked the
  Suppliant's Ring for the Chosen, 2026-10-30).
- D47 (relics keep signatures), D88 and D99 (content only inside a briefed
  phase), D108 (each run opens as a character), D93 (plot PRs).
- T's answer to call 1 on plot PR #1236 (2026-10-31): "Yes, let's make all
  the enemies befriendable so we can do some testing. The reward right now is
  no xp, but shillings or a consumable (both output for their level)".

## What was fixed before, and why it did not hold

| When | Phase | What T saw | What was fixed |
|---|---|---|---|
| 2026-10-24 | EQ1b (#866) | a refused rune looked like a wait for Conviction | a rune refused for a reason other than Conviction gets a dashed blood ring and a cross; a tap opens the popup with the reason first |
| 2026-10-25 | SG1 (#928) | no rune at all; the starting ring's signature never fired | the dev relic chips wear what they grant (the Bleeding Signet showed no rune because the chip left it in the satchel); **no run starts with the Suppliant's Ring any more**; the test pins the Bleeding Signet's Open Vein, which always fires |
| 2026-10-25 | LR1g (#965) | (tracking) | each refused tap is logged as `ui-signature-refused` with the engine's reason |
| 2026-10-31 | CH1f (#1180) | (new) | the Chosen opens every run **wearing the Suppliant's Ring** (T's pick) |

SG1 never fixed the ring. It removed it: T's answer 1 took the ring off every
fresh run, and #921's call "Float-Eye befriendable" was cut as moot "once
nobody starts with the ring" (`phase_SG1_signature_trigger.md:24-26, 298-301`).
CH1f put the ring back as the Chosen's only relic, so the premise of that cut
is gone, and the Chosen is back in exactly the case T reported on 2026-10-25.
No test drives a roster character's own kit to a cast: SG1's test uses the
Bleeding Signet from the dev chip, and the refused-rune tests
(`CombatBoard.refused-rune.test.tsx`) use a hand-built state.

## The cause (mapped in the code)

1. **The Chosen's only signature is The Open Hand.** `CHARACTER_ROSTER`
   gives the Chosen `relic-disarming-plea` (`Character/roster.ts:73`);
   `createNewRunPlayer` wears it (`Game/game.reducer.ts:186-192`); the ring
   grants `sig-disarming-plea` and nothing else (`Items/relic.library.ts:49-59`);
   combat reads the worn signatures (`Combat/combat.engine.ts:276`). The rune
   is drawn. The ring is worn. That part works.
2. **The Open Hand is refused on every foe T has met.** The gate is
   `signatureCastBlock` (`Combat/combat.signature.ts:111-119`): Conviction
   first (`:112`, "Need 4 ◆ Conviction"), then `isEnemyBefriendable` (`:116`,
   "<foe> will not be befriended"), then the VITAE gate (`:118`). A foe is
   befriendable only with a `friendshipReward` (`Enemy/befriend.ts:13-15`),
   and exactly one foe in the library has one: the Green Jelly
   (`Enemy/enemy.library.ts:566`). The Breakwater's first fights are Float-Eye
   at bw-w2 and the Gallows Crow at bw-w3 (`World/MapEvents/content.ts:298-299`);
   the first Green Jelly is at bw-t2, level 5 (`:311`). T's play log shows the
   Chosen's deck at bw-w2 and bw-w3 on build 8f876ec (evidence below), so both
   of T's fights refused the signature with "Float-Eye will not be befriended"
   and "Gallows Crow will not be befriended". The refusal was legitimate under
   the rule of the day (SK1c changes the rule on T's answer to call 1).
3. **Conviction starts at 0 and the Open Hand costs ◆4**
   (`combat.engine.ts:272`; `combat.signature.ts:49`). Conviction comes only
   from scrapping a card (+1, two per turn, `combat.engine.ts:121, 668-680`),
   a BOON face on use (`:609-622`) and table overflow (`:395-397`). Nothing on
   the board says so.
4. **The board never says why without a tap.** A refused rune draws a dashed
   ring and a cross (`components/combat/encounter/CombatBoard.tsx:314-341`);
   the reason lives only in the accessibility label (`:330`) and in the popup a
   tap opens (`CombatEncounterPanel.tsx:620-625, 1150-1166`, lines from
   `signatureInfoLines`, `state/presenters/combat-encounter.engine.ts:2426-2433`).
   To a player the cross reads as "broken button", and the reason is one tap
   away behind it. That is what "I still can't play" reports.
5. **No gesture or dice gate is involved.** The rune is a plain `Pressable`
   (`CombatBoard.tsx:317-336`), not inside a gesture detector; the tray sits one
   z-rung above it on purpose (`:1544-1578`). A castable rune casts on press
   (`CombatEncounterPanel.tsx:626`). Signatures take no die.

### Evidence from T's device (the play log, read 2026-10-31)

- `npm run api -- signature-usage` returned 401 with the token in
  `~/.config/miserere/puzzle-api.env` (the local token no longer matches the
  Worker's secret). The D1 database was read directly instead.
- `deck_events` holds two rows from T's session `mvwtsu4a-bo8ryutc`, build
  commit `8f876ec1b`, app build "1.0.0 preview": a reward at `bw-w2`
  (20:01 UTC, deck = grey 3/3/2 + `df-e-04a` + `bp-p-02a`, the Chosen's ten
  cards) and one at `bw-w3` (20:09 UTC).
- **`fights` holds zero rows, ever.** So no `ui-signature-refused` event
  from T's device exists to quote. The cause is a second defect: the deployed
  Worker's validator predates eight engine event kinds. The deployed bundle's
  `COMBAT_EVENT_KINDS` lacks `enemy-phase-entered`, `enemy-word`,
  `enemy-rider`, `radiance-struck`, `mercy-added`, `mercy-ticked` and
  `mercy-burst` (read from the live Worker's code), which today's fights emit
  (EN1a, EN1d, EN1f, MF1a), and `checkEvent` refuses any unknown kind
  (`Combat/combat.play-log-contract.ts:259-260`), so every fight post from
  this build gets a 400. The Worker last deployed on 2026-10-28 (85a4fab15)
  because `backend-deploy.yml` deploys only on a push touching `backend/**`
  (`.github/workflows/backend-deploy.yml:14-19`), while the validator the
  Worker bundles lives in `axiomancer-mechanics/src/Combat/combat.play-log-contract.ts`
  (imported by `backend/src`). Each contract change since has shipped to the
  app and not to the Worker.

## Outcome

Every foe can be befriended, and a befriend pays shillings or a consumable
scaled to the foe's level and no XP, so the Chosen's Open Hand works from his
first fight; the rune says, on the board and without a tap, why it will not
fire when it will not (too little Conviction, or the foe not yet low enough);
a test drives the Chosen's own starting kit into a real fight and both refuses
and casts the signature through the engine and the UI; and the play log stores
the fights a preview build posts, so the next refused tap is on record.

## Acceptance

- **A1** Engine journey (`Character/e2e/chosen-signature.engine.test.ts`,
  new): `createNewGameState({ characterId: 'the-chosen' })` gives a player
  wearing `relic-disarming-plea`; a combat initialised against bw-w2's foe
  (Float-Eye, level 2, through the node's real encounter binding) has
  `signatures` `['sig-disarming-plea']`; with Conviction at 4 and Float-Eye
  at full VITAE, `playSignatureSkill` refuses with "Float-Eye is not yet low
  enough to spare", spends nothing and logs no `signature-cast`. With
  Float-Eye's VITAE at its gate (SK1c's default gate, A9), the same call
  casts: the phase is `mercy-choice`, Conviction drops by 4 and the log holds
  `signature-cast`; sparing it ends the fight as `friendship` and pays SK1c's
  reward (A10). Confirmed by T (2026-10-31): every foe can be befriended
  (this line used to expect "Float-Eye will not be befriended").
- **A2** Roster guard (same file or `character-roster.engine.test.ts`): for
  every `CHARACTER_ROSTER` character, its starting relic's signature is
  castable (`signatureCastBlock` returns null with Conviction at the cost and
  the foe at its gate or YIELDING) against at least one Chapter 1 foe
  (`BW_ENCOUNTER_FOES` and `BW_ELITE_DRAWS`); a failure names the character,
  the signature and the gate's reason. This is a bug detector: a character
  whose starting signature no Chapter 1 foe accepts.
- **A3** A refused rune shows its reason on the board without a tap: a
  one-line caption beside the rune (`combat-signature-reason-<id>`), in the
  engine's words (the VM's `reason`, from `signatureCastBlock`), drawn while the
  rune is refused and gone when it is castable. A rune that is only short of
  Conviction draws no caption; its ◆n badge already says it. No copy is
  written in the component. [T to confirm #2]
- **A4** A rune short of Conviction tells how to earn it: the popup's cost
  line (`signatureInfoLines`, `meta`) adds the ways Conviction is gained
  (scrap a card, a BOON face), worded in the presenter and marked
  `[content]` for T. [T to confirm #3]
- **A5** UI journey (`state/e2e/chosen-signature.screen.test.tsx`, new): a
  fresh store started through the real character-select CONFIRM as the
  Chosen, arrived at the real bw-w2 fight, the panel mounted as the route does:
  the rune `combat-signature-sig-disarming-plea` is drawn with
  `combat-signature-refused-sig-disarming-plea` with Conviction 4 and
  Float-Eye at full VITAE; the caption reads "Float-Eye is not yet low enough
  to spare"; a press opens `combat-signature-info` leading with the same
  reason; the fight recorder (a stub config) holds one `ui-signature-refused`
  with that reason. Then, Float-Eye's VITAE at its gate: no caption, a press
  casts, the mercy choice opens and the chip reads ◆ 0.
- **A6** `backend-deploy.yml` deploys on a push to `main` touching
  `backend/**` **or any `axiomancer-mechanics` file the Worker bundles**
  (today `src/Combat/combat.play-log-contract.ts` and
  `src/World/Hazard/puzzle/hazard-puzzle.attempt-contract.ts`);
  `scripts/backend-deploy.test.mjs` pins the list and fails when
  `backend/src` imports a mechanics file the list does not name.
- **A7** A backend test posts a fight whose events hold one of every
  `COMBAT_EVENT_KINDS` entry and every `PLAY_LOG_UI_EVENT_KINDS` entry and gets
  a 201, so the Worker as built from `main` takes every kind the engine emits.
  The phase's merge to `main` runs `backend-deploy` (it touches the workflow),
  and the run is green.
- **A8** Every foe can be befriended. `isEnemyBefriendable` returns true for
  every foe the engine builds (`createEnemy`: the library, Chapter 1's foes,
  elites and bosses); "<foe> will not be befriended" is no longer
  reachable from `signatureCastBlock`; a test walks `BW_ENCOUNTER_FOES`,
  `BW_ELITE_DRAWS` and the enemy library and finds none refused for that
  reason. The bot's Conviction value (`combat.card-program.ts:533, 1280`)
  reads `isEnemyBefriendable`, not `friendshipReward !== undefined`.
  Confirmed by T (2026-10-31): "let's make all the enemies befriendable so we
  can do some testing".
- **A9** A foe with no `befriendabilityConfig.hpGate` uses a default gate in
  one tuning constant (`BEFRIEND_TUNING.defaultHpGate`, 0.3, the Green
  Jelly's line); a foe that declares its own gate keeps it, and a YIELDING foe
  can still be spared at any VITAE. [T to confirm #5]
- **A10** A befriend pays **no XP** and **either shillings or one
  consumable, scaled to the foe's level**, from one tuning table
  (`BEFRIEND_TUNING`, `[content]` for T): shillings = `shillingsPerLevel`
  (3) x the foe's level; the consumable is the Minor Healing Potion below
  level 5, the Healing Potion at 5-9 and the Greater Healing Potion at 10
  and above. Which of the two is paid is drawn from the combat rng (even
  odds), so a seed reproduces it. [T to confirm #4] `CombatEndReport`
  gains `shillings` (0 when none), the END_COMBAT reducer adds it to
  `player.currency`; a befriend no longer rolls the loot table and no longer
  pays the half-XP base; the Green Jelly's `xpBonus` and potion are retired
  into the same rule (its narrative, flag and codex entry stay). Victory,
  defeat and flee are unchanged. Confirmed by T (2026-10-31): "The reward
  right now is no xp, but shillings or a consumable (both output for their
  level)".
- **A11** The friendship screen (`CombatFriendshipPanel`) shows the reward:
  "+N shillings" or the consumable's name, and no XP line; a foe without a
  `narrative` gets a plain one-line default from the presenter, marked
  `[content]`. A test drives a befriend of Float-Eye at level 2 and reads
  "+6 shillings" or "Minor Healing Potion" off the panel.

Measure: `npm run verify -w axiomancer-mechanics`, `npm run verify -w
axiomancer-mobile` and the root `npm test` pass with A1, A2, A5, A8 and A10
in them; on T's Nov 9 preview check the Chosen befriends Float-Eye at bw-w2
with the Open Hand and is paid shillings or a potion and no XP, the rune
says why beside it without a tap while it is refused, and the D1 `fights`
table gains that fight's row.

## Decisions made upfront — DO NOT ASK

- **Every foe can be befriended.** Confirmed by T (2026-10-31): make all
  the enemies befriendable, for testing; a befriend pays no XP, and
  shillings or a consumable, both scaled to the foe's level (SK1c, A8-A11).
  The Open Hand stays the Chosen's signature and the Suppliant's Ring his
  relic. The rule lives in `isEnemyBefriendable` and one tuning table, not in
  a `friendshipReward` on each foe, so it can be narrowed later in one place.
- **The numbers are a first cut for testing.** `shillingsPerLevel` 3 puts a
  level-2 befriend at 6 shillings (one village rest, `VILLAGE_TUNING.restPrice`)
  and below a hazard's 12; the potion tiers follow the three potions in
  `consumable.library.ts`. Both sit in `BEFRIEND_TUNING`, marked `[content]`
  for T to retune.
- **The words are the engine's.** The caption and the popup read
  `signatureCastBlock`'s reason through the VM, so the board, the popup, the
  accessibility label and the play log never disagree (the rule already at
  `combat.signature.ts:105-110`).
- **The test drives the real kit, not a fixture relic.** A1 and A5 start from
  `createNewGameState({ characterId: 'the-chosen' })` and the real character
  select, so a change to the roster, the ring or the gate shows up in them.
- **The deploy fix is a trigger fix, not a schedule.** Deploying on the
  bundled mechanics files keeps the Worker in step with the contract without
  a cron; the D1 migrations step is unchanged. SM1's backend phases (D1
  migrations 0006 and 0007, plotted the same day) touch `backend/**` and so
  would redeploy as a side effect if they ship first; SK1b stays, so the next
  contract-only change does not strand the Worker again.
- **The stale local token is not a phase.** `~/.config/miserere/puzzle-api.env`
  is T's machine file, outside the repo; refreshing it is noted for T, not
  built.

## Consumers to update

- SK1c: `Enemy/befriend.ts` (`isEnemyBefriendable`, the default gate),
  `Combat/combat.signature.ts` (`signatureCastBlock` reads the default gate),
  `Combat/combat.card-program.ts:533, 1280` (bot value), `Game/store.ts`
  `endCombat` (the friendship branch) and `CombatEndReport`,
  `Game/game.reducer.ts` END_COMBAT (`player.currency`), the Green Jelly's
  `friendshipReward` (`Enemy/enemy.library.ts:566`), `World/roster-health.ts:193`,
  `axiomancer-mobile/components/event/aftermath/CombatFriendshipPanel.tsx`
  and `app/devaftermath`; the Measured-truth report will move on its next
  run (bots may now befriend), which is a measurement, not a gate (D57).
- `axiomancer-mobile/state/presenters/combat-encounter.engine.ts`
  (`CombatSignatureVM` gains nothing new if `reason` and `refused` suffice;
  `signatureInfoLines` for A4).
- `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx`
  (`SignatureColumn` caption, A3; the column's height helper
  `signatureColumnHeight` if the caption changes the rune's footprint).
- Visual baselines that draw a refused rune; the PR body carries a before and
  after shot of the board.

## Save / schema contracts

No save field, no migration: `player.currency` already exists.
`CombatEndReport` (in memory, not saved) gains `shillings`. The play-log
contract is unchanged; SK1b only redeploys it.

## Tests matrix

| Suite | Kind | Subject |
|---|---|---|
| `axiomancer-mechanics/src/Enemy/befriend.engine.test.ts` (new) | unit | A8, A9 (every foe befriendable; default and declared gates) |
| `axiomancer-mechanics/src/Game/e2e/befriend-reward.engine.test.ts` (new) | journey | A10 (no XP, shillings or the level's potion, seeded; currency rises) |
| `axiomancer-mobile/components/event/aftermath/__tests__/CombatFriendshipPanel.test.tsx` | unit | A11 |
| `axiomancer-mechanics/src/Character/e2e/chosen-signature.engine.test.ts` (new) | journey | A1, A2 |
| `axiomancer-mobile/state/e2e/chosen-signature.screen.test.tsx` (new) | journey | A5 |
| `axiomancer-mobile/components/combat/encounter/__tests__/CombatBoard.refused-rune.test.tsx` | unit | A3 caption shown when refused, absent when castable or short; A4 cost line |
| `scripts/backend-deploy.test.mjs` | unit | A6 |
| `backend/` fights route test | unit | A7 |

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w
axiomancer-mobile`, root `npm test` (with `scripts/backend-deploy.test.mjs`);
SK1b also `npm test -w backend`.

## Commit body template

```
<phase id>: <title>

Closes A<n>, ... Cause: <one line>. Tests: <suites>.
```

## DoD

A1 to A11 ticked, each by exactly one phase below.

## Follow-ups (out of scope)

- Per-foe friendship rewards and narratives (beyond the shared rule) are
  content for a later phase in T's words, once the testing settles.
- The Suppliant's lane (healing, stalling, utility) that T planned for the
  ring (SG1 answer 1) is MF1's Merciful lane; its card relics are not this
  plot's.
- T refreshes `~/.config/miserere/puzzle-api.env` from the repo secret so
  `npm run api` works locally again.

## Phases

### SK1c — Every foe can be befriended, for shillings or a potion and no XP · M · closes A8, A9, A10, A11 · requires nothing
Measure: `befriend.engine.test.ts`, `befriend-reward.engine.test.ts` and the friendship panel test pass; a seeded befriend of Float-Eye at level 2 pays 6 shillings or a Minor Healing Potion and 0 XP.
- Scope: `axiomancer-mechanics` (`Enemy/befriend.ts` and `BEFRIEND_TUNING`,
  `Combat/combat.signature.ts`, `Combat/combat.card-program.ts`, `Game/store.ts`,
  `Game/game.reducer.ts`, the Green Jelly's entry); `axiomancer-mobile`
  (`CombatFriendshipPanel.tsx`, its presenter, `app/devaftermath`). Victory,
  defeat and flee unchanged; no card, relic or cost changes.
- Consumers: `World/roster-health.ts`; docs that say only the Green Jelly
  can be befriended (grep "befriend" in `docs/` and the CLI help).
- Save/schema: none (`CombatEndReport.shillings` is in memory).
- Tests: rows A8, A9, A10, A11 of the matrix.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w
  axiomancer-mobile`, root `npm test`.

### SK1a — The refused rune says why on the board, and the Chosen's kit is pinned · M · closes A1, A2, A3, A4, A5 · requires SK1c
Measure: `chosen-signature.engine.test.ts` and `chosen-signature.screen.test.tsx` pass; the board shot shows the caption beside the Chosen's refused rune at bw-w2 at full VITAE.
- Scope: `axiomancer-mechanics` (tests only: A1, A2); `axiomancer-mobile`
  (`CombatBoard.tsx` `SignatureColumn` caption, `combat-encounter.engine.ts`
  `signatureInfoLines`, the two tests, the refused-rune test). No engine rule
  changes.
- Consumers: visual baselines of the combat board; `signatureColumnHeight`
  and its test if the caption sits under the rune.
- Save/schema: none.
- Tests: rows A1, A2, A3, A4, A5 of the matrix.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w
  axiomancer-mobile`, root `npm test`.

### SK1b — The play log takes today's fights: the Worker deploys with its contract · S · closes A6, A7 · requires nothing
Measure: `scripts/backend-deploy.test.mjs` and the backend fights test pass; the merge's `backend-deploy` run on `main` is green.
- Scope: `.github/workflows/backend-deploy.yml` (push paths),
  `scripts/backend-deploy.test.mjs`, a `backend/` fights test.
- Consumers: `.github/workflows/README.md` (the deploy trigger line), the
  BE1 or BE2 doc that says when the Worker deploys.
- Save/schema: none (no migration).
- Tests: rows A6, A7 of the matrix.
- Verify gate: root `npm test`, `npm test -w backend`.
