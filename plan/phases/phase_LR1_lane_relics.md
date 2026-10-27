# Phase LR1 — Lane relics and how a player gets them

## Sources

- `/plot` from T, 2026-10-25, decided in session and run unattended: "lane relics and how a player gets them, so
  RW1's reward rule can work in play". It answers two Follow-ups of `plan/phases/phase_RW1_reward_rule.md`: "the lane
  relics themselves, and their sources (quests, elites; D71)" and "the relic's detail view showing the lane it opens
  (D71)".
- T authored the six lane relics in session on 2026-10-25 (this was LR1b, now done): the table under "T's lane
  relics" below is T's, verbatim. In the same session T answered the old calls 4 (which relic is elite-only) and the
  signature questions, retired Crimson Covenant, and asked for signature tracking (LR1g).
- Part plan: `plan/revamp/relics.md` "B1 — The relic pass (owner)" (Relics open lanes, Lane relics stack, Relic
  sources); `plan/revamp/cards.md` "Deck model" (D68, D71, D100).
- Decisions: D47 (signet relics; a relic grants one signature), D68 (relics open lanes), D71 (the detail view shows
  the lane; relics come from quests and elites), D72 (the quest, dialogue and equipment plumbing stays, each
  witnessed by a fixture), D73 (a relic names a family), D88/D99 (relic content is T's; T wrote it), D100 (lane
  relics stack), D104 as amended by D107 (only a worn lane relic puts its lane in the reward pool; worn relics count lane slots), D57 (a measurement is
  not a gate).
- Code read while shaping this:
  - Relics: `axiomancer-mechanics/src/Items/relic.library.ts` holds two, the Suppliant's Ring (`relic-disarming-plea`,
    The Open Hand) and the Bleeding Signet (`relic-bleeding-signet`, `statModifiers: [{ stat: 'maxHp', value: 20 }]`,
    `sig-crimson-covenant`), both `slot: 'accessory'`, `accessoryKind: 'ring'`. Relic identity is
    `grantsSignature !== undefined` plus the `relic-` prefix. RW1a adds `Equipment.laneId?`, a resolver (library
    entry by id first, then the item's own field) and `unlockedLaneIds`, and gives no relic a lane. SG1 (#923) stops
    handing out the Suppliant's Ring; it stays defined.
  - Accessory kinds: `AccessoryKind = 'head' | 'hands' | 'feet' | 'amulet' | 'ring' | 'charm'`
    (`Items/types.ts:47`); there is no brooch or belt kind, and none is added (see Decisions, "Slot type").
  - Signatures: `Combat/combat.signature.ts` holds two, each one `kind` branch in `signatureCastBlock` and
    `applySignatureSkill`. Every entry's `cost` is the one constant `SIGNATURE_COST = 4` (`combat.signature.ts:25`),
    exported through `Combat/index.ts:56` and `src/index.ts:82`; `signatureCastBlock` already reads `skill.cost`, so
    the bar and the refusal follow a per-signature cost once the entries carry their own. `SignatureSkillId` is a
    closed union (`Combat/combat.encounter.types.ts:168`). The sim policies list every kind
    (`Combat/combat.sim-policies.ts:105`, `ALL_SIGNATURE_KINDS`) and the pacing sim has a cast rule per kind
    (`Combat/combat.pacing.sim.ts:64-71`).
  - Crimson Covenant's readers (all retired or rewritten in LR1d): `combat.signature.ts` (the entry,
    `COVENANT_TETHER_TURNS = 3`, the `covenant` kind's block and branch, the header comment),
    `combat.encounter.types.ts:170` (the id), `combat.card-program.ts:1226` (`programTetherAndTwice`, called only by
    the signature; the ledger's `tetherUntil` and `nextTwice` stay, cards read them), `combat.sim-policies.ts:104-105`,
    `combat.pacing.sim.ts:64-71`, `Items/relic.library.ts:39-53` (the Signet's entry and comment); tests
    `Combat/combat.signature.test.ts:25`, `Cards/e2e/blood-price.engine.test.ts:474`,
    `Items/e2e/relic-library.engine.test.ts:28,86`, mobile
    `components/combat/encounter/__tests__/CombatBoard.refused-rune.test.tsx` (lines 32-141, which also read
    `SIGNATURE_COST`), `state/e2e/loadout-truth.engine.test.ts:71`, `state/e2e/dev-presets.engine.test.ts:191-225`;
    docs `axiomancer-mechanics/docs/keyword-atlas.md`, `docs/game-model.md:79,127,202`. SG1's UI test (if it has
    shipped by then) sees Crimson Covenant on the board and is re-pointed to the Signet's new signature.
  - Elements: `Combat/combat.elements.ts` keeps INFERNO as three stacks (`infShared` both sides, `infFoe`, `infSelf`),
    BLIZZARD and STORM (the foe loses n at the start of its turn, then STORM grows by 1). "Remove your INFERNO" turns
    the both-sides stack into a foe-only stack (`combat.elements.ts:27-29`; `removeYourInferno` in
    `combat.card-program.ts:751`). The Elementalist lane is `elementalist` (`Cards/library/elementalist.cards.ts:254`,
    EL1c, a removable trial set).
  - LEECH: a foe debuff with potency and turns; each application adds `LEECH_TURNS_PER_APPLICATION = 3` foe turns
    (`combat.card-program.ts:69`); at the start of the foe's turn it loses the potency (unscaled), you HEAL what it
    lost, and a turn ticks off (`programFoeTurnStart`). HEAL n is mind-scaled, capped at max VITAE.
  - Lanes: `blood-price` named "Blood Price" (`Cards/library/blood-price.cards.ts:231`), `elementalist` named
    "Elementalist"; `CardLane.name` is the display name.
  - The detail view: `selectEquipmentDetailViewModel` (`axiomancer-mobile/state/presenters/equipment-detail.engine.ts:227`)
    feeds `components/inventory/EquipmentDetailModal.tsx` and the item-reward screen's presenter
    (`state/presenters/item-reward.engine.ts`), so one VM field reaches both.
  - Quests: **no quest exists in the game.** `World/quest.library.ts` says "No quest is authored"; all four Act 1
    maps carry `quests: []`; the only quest is the test fixture `FIXTURE_QUEST` (`Game/fixtures/fixture-content.ts`).
    The plumbing that stays (D72): the quest log (`World/quest.engine.ts`: `kill`, `reach`, `collect` objectives),
    dialogue effects `startQuest`/`progressQuest`/`completeQuest` (`World/dialogue.runtime.ts:53-86`), the
    `interaction` and `narration` event kinds that play a dialogue tree (`World/MapEvents/types.ts:56,130`), and the
    Memoir tab's quest cards.
  - Quest rewards: only `endCombat`'s kill objectives pay, and only `currency` and `experience`
    (`Game/game.reducer.ts:309-323`). An item reward is never granted; reach, collect, dialogue and hazard-kill
    completions pay nothing. So today **no quest can hand out a relic**.
  - Elites: one elite foe, the Green Jelly (`Enemy/enemy.library.ts:92`), met on the Breakwater's elite column; the
    elite reward is cards or an upgrade (`Combat/combat.rewards.ts:187`, `rollEliteReward`). No relic drops anywhere.
  - Granting a relic with a screen: the item-reward queue (`state.itemReward.queue`, route `/item-reward`, eyebrow
    overridable by the call site); `Items/item-grant.ts` does the grant.
  - Play log (for LR1g): `FightPost` (`axiomancer-mechanics/src/Combat/combat.play-log-contract.ts:97`) carries
    enemy, level, outcome, turns, VITAE, the deck and `events`, but not the worn relics or signatures.
    `PLAY_LOG_UI_EVENT_KINDS = ['ui-staged', 'ui-unstaged', 'ui-detail-opened']` (`:43`), and `PlayLogUiEvent` has
    only a `cardId` (`:77`; the validator's pick at `:251`). The backend stores fights in `backend/src/fights.ts`
    (migrations `backend/migrations/0001`-`0004`, so the next is `0005`); `backend/src/reports.ts` has
    `REPORT_NAMES = ['card-usage', 'card-gaps']` (`:45`), run as `npm run api -- card-usage`
    (`scripts/api.mjs`); tests in `backend/test/play-log.test.ts` and `backend/test/reports.test.ts`. The mobile
    recorder emits UI events through `fightRecorder.screen(...)` (`CombatEncounterPanel.tsx:670`).

## T's lane relics (authored in session 2026-10-25)

T's words, verbatim. Costs are T's starting pitch, to revisit after playthroughs.

| Relic | Lane | Signature (cost in Conviction) | Stats | Source |
|---|---|---|---|---|
| Elementalist's Signet | elementalist | Clear your INFERNO; trigger the foe's STORM (6) | +5 Heart, +20 max VITAE | elite only |
| Elementalist's Brooch | elementalist | Convert the foe's INFERNO into STORM (4) (only the foe-only INFERNO; you keep burning, T 2026-10-26) | +5 Mind | quest |
| Elementalist's Belt | elementalist | Convert all BLIZZARD into STORM (3) | +5 Body | quest |
| Crimson Circlet | blood-price | Your next SACRIFICE heals you instead; it still counts as a SACRIFICE (TETHER, sacrifice-triggered Globals, anything that reads SACRIFICE) (5) | +5 Body, +20 max VITAE | elite only |
| Ruby Signet | blood-price | Your next SACRIFICE adds LEECH equal to the VITAE paid, unscaled, to the foe (3) | +5 Heart | quest |
| Bleeding Signet (existing, reworked) | blood-price | HEAL 5; trigger the foe's LEECH (4) | +5 Mind (the +20 max VITAE is removed) | quest |

The signature names, ids and descriptions are not in T's table: the builder writes plain ones (a signature named
after its relic is fine) and marks them `[content]` for T to rewrite. The same table is recorded in
`plan/revamp/relics.md` § "The lane relics (LR1b)".

## Outcome

The Bleeding Signet (reworked) and five new lane relics (two Blood Price, three Elementalist), each with its own
signature at its own Conviction cost, name their lane and say so in their detail view ("Lane: <lane
name> (while worn)"); Act 1 quests hand out the four quest relics and the elite drops the two elite-only relics, so a
player who earns and wears a lane relic sees that lane's cards in their next reward (D107). Every fight post records the worn relics and
their signatures, and a `signature-usage` report shows how each signature is worn, cast and refused.

## Acceptance

- **A1** The Bleeding Signet's library entry carries `laneId: 'blood-price'`. A test: a player wearing the Signet
  has `blood-price` in `unlockedLaneIds` and earns one Blood Price lane slot (D100); with the Signet only in the
  satchel, unworn, `blood-price` is absent (D107);
  a saved Signet copy without the field resolves to the lane through the library (RW1a's resolver).
- **A2** The equipment detail VM gains `lane: string | null`: `Lane: <CardLane.name> (while worn)` for an item whose
  resolved lane is a registered lane, `null` otherwise. The Signet's reads exactly "Lane: Blood Price (while worn)"; the Suppliant's
  Ring's is `null`; a relic naming an unregistered lane (a removed trial set) is `null`. A presenter test covers the
  three.
- **A3** The line renders wherever the detail VM does: the inventory's `EquipmentDetailModal` and the `/item-reward`
  screen, under the signature, and in the modal's accessibility label. Screen tests for both.
- **A4** Done (LR1b, authored in session 2026-10-25): T's six lane relics are recorded in this brief's "T's lane
  relics" and in `plan/revamp/relics.md` § "The lane relics (LR1b)": lane, signature and cost, stats, source. Each
  lane has exactly one elite-only relic (the Elementalist's Signet; the Crimson Circlet).
- **A5** Each of the four quests (one per quest relic) is given by an Act 1 map event that exists today (an
  `interaction` or `narration` node, playing a dialogue whose choice starts the quest) and finished by an objective
  the engine counts (`kill`, `reach`, `collect`); its lines are written plainly by the builder and marked
  `[content]` for T. The four are listed in `plan/revamp/relics.md` § "The lane relics (LR1b)" with giver node,
  event, objective and relic. `[T to confirm #3]`
- **A6** One engine function pays a completed quest's reward, and every completion path calls it: `endCombat`'s kill
  objectives, the hazard host's `advanceKillObjectives`, `reach` and `collect` objectives in `resolveMapEvent`, and
  the dialogue `progressQuest` and `completeQuest` effects. `currency` and `experience` pay as today; an `Item` or
  `{ kind: 'item' }` reward is granted to the inventory. An engine test per path with the fixture quest and a fixture
  relic reward.
- **A7** A relic granted by a quest or an elite reaches the player through the item-reward queue (TO THE SATCHEL /
  WEAR IT NOW), its eyebrow naming the source (a quest's name, or the elite's). A mobile store test for each source.
- **A8** Library relics carry `relicSource?: 'quest' | 'elite'`. After a won elite fight, `rollEliteRelicDrop(player,
  rng)` drops one relic with probability `ELITE_RELIC_DROP_CHANCE` from the elite pool, never a relic the player
  carries; same seed, same drop; an empty pool drops nothing. A seeded table test over fixture relics: the rate over
  10,000 seeds is within 1 point of the constant, and no carried relic is ever dropped. `[T to confirm #1]`
  `[T to confirm #2]`
- **A9** The elite's relic does not replace the elite reward: the cards-or-upgrade offer is unchanged
  (`elite-reward.engine.test.ts` passes) and the relic is queued after it.
- **A10** Blood Price's three relics are in `relicLibrary` as T wrote them: the Crimson Circlet (`relicSource:
  'elite'`, +5 Body, +20 max VITAE) and the Ruby Signet (`'quest'`, +5 Heart) new, the Bleeding Signet reworked
  (`'quest'`, +5 Mind, its `maxHp` line removed), all `laneId: 'blood-price'`, each granting its own new signature:
  - Crimson Circlet (cost 5): your next SACRIFICE heals you by the VITAE it would have cost instead of costing it, and
    still counts as a SACRIFICE (TETHER deals, sacrifice-triggered Globals fire, `nextTwice` doubles it, anything
    that reads SACRIFICE sees it). Refused while one is already pending.
  - Ruby Signet (cost 3): your next SACRIFICE also adds LEECH to the foe equal to the VITAE paid, unscaled (potency
    plus `LEECH_TURNS_PER_APPLICATION` turns, as a LEECH line adds). Refused while one is already pending.
  - Bleeding Signet (cost 4): HEAL 5 (the existing HEAL, mind-scaled), then trigger the foe's LEECH: the foe loses
    its LEECH potency now and you HEAL what it lost, without a turn ticking off. With no LEECH on the foe the trigger
    does nothing; the cast is not refused (the HEAL still lands).
  A test per signature's effect, including the Circlet's SACRIFICE still firing TETHER and a sacrifice-triggered
  Global, and the trigger leaving LEECH's turns unchanged.
- **A11** Each signature carries its own Conviction cost (T's: 6, 4, 3, 5, 3, 4; The Open Hand keeps 4), read from
  `SignatureSkill.cost` by the cast gate, the spend and the signature bar (`◆<cost>`, "consumes ◆ <cost>
  conviction"); `SIGNATURE_COST` is removed or kept only as The Open Hand's value, and no reader assumes one price.
  A test: a 3-cost signature casts at 3 Conviction and is refused at 2, a 6-cost one is refused at 5.
- **A12** Crimson Covenant is retired: `sig-crimson-covenant`, the `covenant` kind, `COVENANT_TETHER_TURNS` and
  `programTetherAndTwice` are gone (the ledger's `tetherUntil` and `nextTwice` stay for cards), every reader listed
  in Sources is rewritten to the Signet's new signature or deleted, the sim policies and the pacing sim cast the new
  kinds, and the keyword atlas and `docs/game-model.md` no longer name it. A saved Signet worn before LR1d grants
  the new signature (the library entry is read by id). `git grep -i "crimson covenant\|COVENANT_TETHER"` outside
  `plan/` returns nothing.
- **A13** Browser evidence on the web build: a 375-wide screenshot of the Signet's detail view showing "Lane:
  Blood Price (while worn)", attached to the LR1a PR.
- **A14** Browser evidence on the web build: a 375-wide screenshot of the `/item-reward` screen handing over a quest
  relic with its "Lane:" line, attached to the LR1f PR.
- **A15** The Elementalist's three relics are in `relicLibrary` as T wrote them, all `laneId: 'elementalist'`: the
  Elementalist's Signet (`'elite'`, +5 Heart, +20 max VITAE), Brooch (`'quest'`, +5 Mind) and Belt (`'quest'`,
  +5 Body), each granting its own new signature:
  - Signet (cost 6): clear your INFERNO with the existing remove-your-INFERNO semantics (the both-sides stack becomes
    foe-only; INFERNO on you alone is cleared), then trigger the foe's STORM: the foe loses the STORM's current
    amount now, and the STORM does not grow.
  - Brooch (cost 4): the foe-only INFERNO (`infFoe`) becomes STORM of the same amount, added to any STORM up;
    `infFoe` goes to 0. The both-sides stack (`infShared`) and INFERNO on you alone (`infSelf`) stay, so you are
    still burning. Confirmed by T (2026-10-26): only the foe's own INFERNO converts; the player still burns. A test:
    with both a shared and a foe-only stack up, casting the Brooch turns only the foe-only stack into STORM, and the
    player's next-turn INFERNO loss (`floor(infShared / 2) + infSelf`) is unchanged.
  - Belt (cost 3): all BLIZZARD becomes STORM of the same amount, added to any STORM up; BLIZZARD goes to 0.
  Each is refused when it would do nothing (no INFERNO and no STORM for the Signet; no foe-only INFERNO (`infFoe` 0) for the Brooch, even with a shared stack up;
  no BLIZZARD for the Belt), with a reason the bar prints. A test per signature's effect and per refusal.
- **A16** Every lane relic (the six) resolves to a registered lane and its detail VM reads `Lane: <lane name> (while worn)`;
  the library header comment names each relic's source. A library test.
- **A17** The quests of A5 are on their Act 1 maps' `quests` and their giver nodes play the dialogue that starts them.
  An engine e2e per quest: from a fresh game, reach the giver, start the quest, meet the objective, and the relic is
  queued; carried unworn, its lane is not in `unlockedLaneIds` (D107); worn, its lane is, and the next combat
  reward holds a card of that lane.
- **A18** No quest pays an elite-only relic, and no relic is both a quest's reward and outside `relicSource:
  'quest'`: a library test over every authored quest.
- **A19** `FightPost` gains `relics: string[]` (the worn relic ids at the fight's start) and `signatures: string[]`
  (the signature ids on the bar); the validator accepts and bounds them (an old client's post without them is
  accepted and stored as empty); a D1 migration `backend/migrations/0005_fight_signatures.sql` (or the next free
  number) adds the columns; `backend/src/fights.ts` stores and returns them; the mobile recorder fills them.
  `backend/test/play-log.test.ts` cases: a post with them round-trips, a post without them stores empty arrays.
- **A20** A `signature-usage` report beside `card-usage` and `card-gaps` (`REPORT_NAMES`, `npm run api --
  signature-usage`): per signature, fights it was worn in, fights it was cast in (a `signature-cast` event), total
  casts, mean casts per fight worn, and refused taps (A21's events). A `backend/test/reports.test.ts` case over
  seeded fights checks each column.
- **A21** A tap on a refused signature is logged as a UI event `ui-signature-refused` in `PLAY_LOG_UI_EVENT_KINDS`,
  carrying the signature id and the refusal reason (`signatureCastBlock`'s text); the contract's UI event type and
  validator accept it (a variant with `signatureId` and `reason`, not a reused `cardId`). A mobile test: pressing a
  refused signature on the board records one such event; pressing an affordable one records none.

Measure: the A17 engine e2e passes for every quest (a quest relic, once earned and worn, puts its lane's card in the
next reward), on the web build the Signet's detail view reads "Lane: Blood Price (while worn)", and `npm run api --
signature-usage` prints a row per worn signature.

## Phases

### LR1a — The Signet names Blood Price, and every lane relic says its lane · S · closes A1, A2, A3, A13 · requires RW1a
Measure: the A1 worn-lane test and the A2/A3 presenter and screen tests pass; A13's screenshot shows
"Lane: Blood Price (while worn)".
- Scope: `axiomancer-mechanics/src/Items/relic.library.ts` (the Signet's `laneId`); mobile
  `state/presenters/equipment-detail.engine.ts` (`lane`, read through RW1a's lane resolver and the lane
  registry, never re-derived), `components/inventory/EquipmentDetailModal.tsx`, the item-reward screen
  (`app/item-reward/index.tsx`) and its presenter if the VM shape needs passing through.
- Consumers: the inventory tab's detail modal, `/item-reward`, `DebugCardLanes` (unchanged).
- Save / schema: none. The lane is read from the library by id (RW1a A1), so saved Signets need no rewrite.
- Tests: a case in RW1a's `Combat/e2e/reward-lanes.engine.test.ts` or `Items/e2e/relic-library.engine.test.ts` (A1);
  a new `state/presenters/__tests__/equipment-detail.engine.test.ts` (A2); `components/inventory/__tests__/EquipmentDetailModal.test.tsx`
  and `state/e2e/item-reward.screen.test.tsx` (A3).
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; the root `npm test`.

### LR1b — T writes the lane relics · done (authored in session 2026-10-25) · closes A4
T wrote the six relics in session; the table is in "T's lane relics" above and in `plan/revamp/relics.md`. The
quests are no longer part of T's sitting: they are drafted on existing map events in LR1f (A5).

### LR1c — The sources, in the engine: quests pay their rewards, elites drop relics · M · closes A6, A7, A8, A9 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile`; the A6 per-path tests,
the A7 store tests and the A8 seeded table test pass with fixture relics and the fixture quest.
- Scope: `axiomancer-mechanics/src/World/quest.engine.ts` (the reward-paying function, `payQuestReward` or similar,
  pure over `GameState`), its callers in `Game/game.reducer.ts` (replacing the inline currency/experience branch),
  `World/MapEvents/resolve-map-event.ts` (`reach`, `collect`), `World/dialogue.runtime.ts` (progress, complete);
  `Items/types.ts` (`relicSource?`); `Combat/combat.rewards.ts` (`rollEliteRelicDrop`, `ELITE_RELIC_DROP_CHANCE` in
  `Game/game-mechanics.constants.ts` or beside the elite reward); exports. Mobile: the combat aftermath
  (`state/combat/store-actions.ts`) queues the elite's relic after the card reward; the hazard host's
  `advanceKillObjectives` call and every quest-completion site queue a relic reward on `state.itemReward`.
- Consumers: the combat aftermath, `/hazard`'s end-of-fight, `/event` (reach, collect), `/dialogue`, `/item-reward`,
  the Memoir tab (unchanged: a completed quest is already shown).
- Save / schema: `relicSource` is optional and read from the library by id like `laneId`; no migration. The fixture
  quest gains a fixture relic reward in tests only.
- Tests: a new `World/e2e/quest-rewards.engine.test.ts` (A6, each path; `World/e2e/world.engine.test.ts` holds today's quest cases), `Combat/e2e/elite-relic-drop.engine.test.ts` (A8),
  `Combat/e2e/elite-reward.engine.test.ts` (A9, unchanged); mobile `state/e2e/item-reward.engine.test.ts`,
  `state/combat/__tests__/` and `state/e2e/event.engine.test.ts` (A7).
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile` (cross-package:
  `src/World/**`, `src/Combat/**`); `npm run e2e:combat`; the root `npm test`.

### LR1d — Blood Price's three relics, per-signature costs, Crimson Covenant retired · M · closes A10, A11, A12 · requires LR1a, LR1c
Measure: the A10 signature tests and the A11 cost test pass, A12's grep is empty, and the Bleeding Signet, worn,
shows its new signature at ◆4 on the bar.
- Scope: `Items/relic.library.ts` (the Signet reworked, the Crimson Circlet and Ruby Signet added, `laneId`,
  `relicSource`, stat lines; `slot: 'accessory'`, `accessoryKind: 'ring'` for the two rings and `'head'` for the
  Circlet, see Decisions "Slot type"); `Combat/combat.signature.ts` (three new entries and kinds with their own
  `cost`, their blocks and branches; Crimson Covenant out; `SIGNATURE_COST` per A11);
  `Combat/combat.encounter.types.ts` (`SignatureSkillId`, `SignatureSkillKind`); `Combat/combat.card-program.ts`
  (the ledger flags for "next SACRIFICE heals" and "next SACRIFICE adds LEECH", read where SACRIFICE resolves;
  the LEECH trigger as a helper beside `programFoeTurnStart`; `programTetherAndTwice` deleted);
  `combat.sim-policies.ts`, `combat.pacing.sim.ts` (a cast rule per new kind); the signature glosses and keyword
  atlas rows; `docs/game-model.md`. The signature effects are signature `kind` branches over the ledger; no card
  keyword is added.
- Consumers: the signature bar and its info lines (mobile `CombatBoard`, `signatureInfoLines`), the dev relic chips,
  the equip-delta panel, every Crimson Covenant reader in Sources.
- Save / schema: library entries are read by id, so a saved Signet takes its new stats and signature; a saved
  `maxHp` modifier on a Signet copy is replaced from the library on load if the equip reducer reads the copy (the
  builder checks which and says so in the PR). No migration.
- Tests: `Combat/combat.signature.test.ts` (A10's three effects, A11's cost cases), `Cards/e2e/blood-price.engine.test.ts`
  (the Circlet's SACRIFICE with TETHER and a sacrifice-triggered Global), `Items/e2e/relic-library.engine.test.ts`,
  mobile `CombatBoard.refused-rune.test.tsx`, `loadout-truth.engine.test.ts`, `dev-presets.engine.test.ts` rewritten
  off Crimson Covenant.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; `npm run e2e:combat`;
  the root `npm test`.

### LR1e — The Elementalist's three relics · M · closes A15, A16 · requires LR1d
Measure: the A15 signature and refusal tests and the A16 library test pass, and each Elementalist relic, granted from
the dev relic chips and worn, puts its signature on the bar at its own cost and reads "Lane: Elementalist (while worn)".
- Scope: `Items/relic.library.ts` (three entries; `accessoryKind: 'ring'` for the Signet, `'amulet'` for the Brooch,
  `'charm'` for the Belt, see Decisions "Slot type"); `Combat/combat.signature.ts` and `combat.encounter.types.ts`
  (three kinds); `Combat/combat.elements.ts` or the card program's element helpers (convert the foe-only INFERNO `infFoe` to STORM,
  convert BLIZZARD to STORM, trigger STORM without growth, reusing `removeYourInferno`); the sim policies and pacing
  sim; glosses and atlas rows.
- Consumers: the signature bar, the weather row (the elements change mid-turn), the dev relic chips.
- Save / schema: additive library entries; no migration.
- Tests: `Combat/combat.signature.test.ts` (one effect and one refusal case per signature, plus the Brooch's
  shared-plus-foe-only case of A15: only `infFoe` becomes STORM, the player's next-turn INFERNO loss unchanged), a
  `Combat/e2e/` element case if the weather row's numbers need pinning, `Items/e2e/relic-library.engine.test.ts`
  (A16 over all six), the A2 presenter test extended.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; `npm run e2e:combat`;
  the root `npm test`.

### LR1f — The quests in Act 1 and the elite's pool · M · closes A5, A14, A17, A18 · requires LR1c, LR1d, LR1e
Measure: the A17 e2e passes for every quest, A18 passes, and A14's `/item-reward` screenshot shows a quest relic
with its "Lane:" line.
- Scope: the four Act 1 map definitions (`World/Continents/*/*.ts`, `quests`), one existing `interaction` or
  `narration` event per region in `World/MapEvents/content.ts` whose dialogue gains the choice that starts the quest,
  and the dialogue trees; `World/quest.library.ts` (the quests); the four listed in `plan/revamp/relics.md` (A5); the
  elite pool reads `relicSource` (A8). Quest lines are plain and marked `[content]` (D88).
- Consumers: `/event`, `/dialogue`, the Memoir tab, `/item-reward`, the map's node labels (`AW1b`'s blurb test, if a
  giver node's blurb changes), `e2e:act1-walk` and `e2e:map-walk` (re-pinned only where a node they cross changes).
- Save / schema: quests live in the save's quest log already; a save made before LR1f simply has no quest started.
  No migration.
- Tests: `World/e2e/lane-relic-quests.engine.test.ts` (A17, one journey per quest), a new `World/quest.library.test.ts`
  (A18), `narrative-reachability.test.ts` if it walks giver nodes.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`;
  `npm run e2e:map-walk`; `npm run e2e:act1-walk`; the A14 screenshot; the root `npm test`.

### LR1g — Signature tracking · M · closes A19, A20, A21 · requires nothing
Measure: `npm run verify -w backend` passes with the A19 and A20 cases, the A21
mobile test passes, and `npm run api -- signature-usage` against the dev Worker prints one row per signature worn in
a recorded fight.
- What exists: the `signature-cast` combat event (`COMBAT_EVENT_KINDS`, `combat.play-log-contract.ts:31`; signature
  id, name, cost) is already logged in every fight post, so casts need no new event. What is missing is which
  signatures were worn (so a signature worn and never cast is invisible) and the refused taps.
- Scope: `axiomancer-mechanics/src/Combat/combat.play-log-contract.ts` (`FightPost.relics`, `.signatures`, the
  validator and limits; `PLAY_LOG_UI_EVENT_KINDS` gains `ui-signature-refused`, `PlayLogUiEvent` gains its variant);
  `backend/migrations/0005_*.sql`; `backend/src/fights.ts`; `backend/src/reports.ts` (`signature-usage` in
  `REPORT_NAMES`, its row type and query); `scripts/api.mjs` (it mirrors `REPORT_NAMES`); mobile `lib/fightRecorder`
  (fill `relics` and `signatures` at the fight's start) and the board's signature press
  (`CombatEncounterPanel.tsx`, record the refused tap with `signatureCastBlock`'s reason).
- Consumers: `GET /v1/fights` readers, the existing `card-usage` and `card-gaps` reports (unchanged), any tool that
  validates fight posts (`fightRecorder.test.ts`).
- Save / schema: a D1 migration adding two columns with an empty default; old rows read as empty. The game save is
  untouched.
- Tests: `backend/test/play-log.test.ts` (A19), `backend/test/reports.test.ts` (A20), mobile
  `lib/__tests__/fightRecorder.test.ts` and `CombatEncounterPanel.screen-events.test.tsx` (A19's fill, A21).
- Verify gate: `npm run verify -w backend`; `npm run verify -w axiomancer-mechanics`; `npm run verify -w
  axiomancer-mobile`; the root `npm test`. The migration is applied to the live D1 after merge by the usual deploy.

## Scope

- `axiomancer-mechanics` (relics, signatures and their costs, quest rewards, the elite drop, Act 1 quests, the
  play-log contract), `axiomancer-mobile` (the detail line, the reward queue, the signature bar, the fight
  recorder), `backend` (the fight columns, the `signature-usage` report). No card or lane is authored.

## Consumers to update

- The inventory detail modal, `/item-reward`, the signature bar, the combat aftermath, `/hazard`'s end of fight,
  `/event`, `/dialogue`, the Memoir tab, the dev relic chips, the sim policies and pacing sim, the keyword atlas and
  `docs/game-model.md`, the fight recorder, the play-log backend and its reports.

## Save / schema contracts

- `Equipment.relicSource?: 'quest' | 'elite'`, optional, additive, read from the library by id (as RW1a reads
  `laneId`). Quests use the existing `QuestLog` in the save. No game-save migration in any phase.
- The play log: `FightPost.relics` and `.signatures` (optional on the wire, stored empty when absent) and D1
  migration `0005` (LR1g); the `ui-signature-refused` UI event.

## Decisions made upfront — DO NOT ASK

- **The Bleeding Signet names Blood Price (T, 2026-10-25),** and its detail view says exactly "Lane: Blood Price (while worn)".
- **Every lane relic's detail view shows "Lane: <lane name> (while worn)" (T, 2026-10-25; copy changed by T,
  2026-10-26, D107, because only a worn relic puts its lane in the reward pool).** The name is `CardLane.name`. A
  relic that opens no lane (the Suppliant's Ring) shows no line; a relic whose lane is not registered shows none.
- **The relics are T's table (T, 2026-10-25),** verbatim in "T's lane relics". Confirmed by T (2026-10-25): the
  Elementalist's Signet and the Crimson Circlet are the elite-only relics; the Bleeding Signet comes from a quest
  (the old call 4).
- **Names (T, 2026-10-25):** Blood Price relics never share a name with an Elementalist relic.
- **Signature costs differ per relic (T, 2026-10-25).** The costs in the table are T's starting pitch, to revisit
  after playthroughs; LR1d makes the cost per signature.
- **Crimson Covenant is retired (T, 2026-10-25).** The Bleeding Signet gets the new signature; every reader of
  `sig-crimson-covenant` and `COVENANT_TETHER_TURNS` is in LR1d's scope. The Open Hand (the Suppliant's Ring) stays
  defined but is no longer handed out (SG1, #923).
- **"Trigger" means one extra tick now (default, T did not object, 2026-10-25):** a triggered STORM deals its current
  amount without growing; a triggered LEECH deals and heals its potency without losing a turn.
- **The Brooch converts only the foe-only INFERNO (T, 2026-10-26).** Confirmed by T (2026-10-26): "it should only
  be theirs. The player should still be burning." `infFoe` becomes STORM; `infShared` stays, so the Brooch is purely
  offensive and distinct from the Signet (which clears your INFERNO). This replaces the builder's reading accepted at
  #922's merge (both the shared and foe-only stacks).
- **"Clear your INFERNO" (the Elementalist's Signet) uses the existing remove-your-INFERNO semantics (T,
  2026-10-25):** the both-sides stack becomes foe-only (`combat.elements.ts`).
- **Slot type (T, 2026-10-25).** T is separately plotting an equipment-slot change (only Weapon, Armor and three
  relic slots; a relic can be named anything; every relic takes a relic slot). So no brooch or belt accessory kind is
  added. If LR1 ships before that plot, the new relics use the existing accessory slot and the least wrong
  `accessoryKind` (rings `'ring'`, the Circlet `'head'`, the Brooch `'amulet'`, the Belt `'charm'`), and the
  equipment plot cleans it up.
- **The signatures are signature `kind` branches over the combat ledger, not new card keywords.** T's effects need
  behaviour the card program has no verb for (convert, trigger, the SACRIFICE redirects); a signature branch keeps
  each phase one tick without adding a keyword cards could use.
- **Quests are the primary source; elites drop relics at a lower chance; a lane's third relic comes only from an
  elite (T, 2026-10-25).** Two `'elite'` relics and four `'quest'` relics.
- **The Signet and the "Lane:" line are their own phase, LR1a, requiring RW1a (T, 2026-10-25).**
- **No quest exists, so LR1 builds both halves of the quest source.** The engine half is LR1c over the fixture
  quest; the quests themselves are LR1f, one quest per quest relic, one in each Act 1 region (four), each given by
  an event that exists today and finished by an objective the engine counts; no new quest UI.
  `[T to confirm #3]`
- **The elite's drop chance: 8% per won elite fight,** one relic at most, rolled after the elite reward and never
  replacing it. `[T to confirm #1]`
- **The elite pool: only the elite-only relics the player does not carry.** Quest relics come only from their
  quests. `[T to confirm #2]`
- **Signature tracking is its own phase (T, 2026-10-25), LR1g, requiring nothing:** the fight post records the worn
  relics and signatures, a `signature-usage` report reads them, and a refused tap is a UI event. It measures; it
  gates nothing (D57).
- **A relic from a quest or an elite arrives through the item-reward screen,** with the source in its eyebrow (plain
  words, `[content]` for T).
- **The cache, shops and the blacksmith give no relics.** T named two sources; adding others is a new plot.
- **Slotted after SG1 and BC1, not asap (T, 2026-10-25):** after the last open row.

## Tests matrix

- Added: an `Items/e2e/relic-library.engine.test.ts` case (A1, A16), the equipment-detail presenter and screen cases
  (A2, A3), `World/e2e/quest-rewards.engine.test.ts` (A6), mobile reward-queue store tests (A7),
  `Combat/e2e/elite-relic-drop.engine.test.ts` (A8), signature cases (A10, A11, A15),
  `World/e2e/lane-relic-quests.engine.test.ts` (A17), `World/quest.library.test.ts` (A18), backend play-log and
  report cases (A19, A20), the refused-tap recorder case (A21).
- Rewritten: every Crimson Covenant test (A12).
- Unchanged and must pass: `Combat/e2e/elite-reward.engine.test.ts` (A9), `card-usage` and `card-gaps` report tests.

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; `npm run e2e:combat` (LR1c, LR1d,
LR1e); `npm run e2e:map-walk` and `npm run e2e:act1-walk` (LR1f); `npm run verify -w backend` (LR1g); the root `npm test`.

## Commit body template

```
Phase LR1<a|c|d|e|f|g> — <title>

Closes <ids> of plan/phases/phase_LR1_lane_relics.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1-A21 ticked across LR1a-LR1g (A4 by LR1b, done in session); the Measure met.

## Follow-ups (out of scope)

- The equipment-slot change (T's separate plot): Weapon, Armor and three relic slots; it re-slots LR1's relics.
- Revisiting the signature costs after playthroughs, with LR1g's `signature-usage` report as the evidence.
- Relics from the cache, shops or the blacksmith; relics in the hazard deck's "Bonus Relic"/"Shrine Cache" lie
  (`plan/revamp/relics.md`).
- More elites: Act 1 has one elite foe; the elite pool's reach grows with B2's roster.
- The rest of B1: re-authoring the starting ring and stat-only relics.
- A marker on a reward face saying which card is the lane card (RW1's Decisions: none asked for).
