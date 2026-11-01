# Phase WA1 — Chapter 1's weapons and armor: one fight effect each

## Sources

- `/pitch` then `/plot asap`, T attended, 2026-11-01. The pitch file is the source:
  `braindump/2026-11-01-weapons-and-armor.md` (surface question, measured table, prior art, rulings, the slate,
  the Handoff block). T's opening: "We need weapons and armor but I have no idea what their effect(s) should be ...
  Just normal stat bumps just seem a little light." T's rulings are listed under Decisions.
- `plan/deadlines.md`: the Items "Pitch Chapter 1's weapons and armor" (Oct 31) and "Plot Chapter 1's weapons and
  armor from the pitch" (Nov 2); the MVP milestone names Chapter 1's weapons and armor.
- Decisions it rests on: D105 (one weapon, one armor, three relics), EQ2 calls 1-2 (weapons and armor grant no
  signature and open no lane), D112 (the village holds the card shop; loot caches are a node kind), D88 (content in a
  phase T approves; T asked for these ten), D57 (the measured report is a measurement, not a gate). Related open plot:
  EQ3 (PR #1268, the dock fix and drag and drop), which this does not require.
- Code read while shaping this (what exists / what is new):
  - **No effect field and no passive system.** `Equipment` (`axiomancer-mechanics/src/Items/types.ts:81`) carries
    only `statModifiers`, `grantsSignature`, `laneId`, `relicSource`. The only event-triggered system in combat is
    card Globals (`GlobalTrigger` `'turn' | 'sac' | 'curse'`, `Cards/card-program.types.ts:261`; dispatcher
    `fireTriggers`, `Combat/combat.card-program.ts:1445`), and it looks each effect up by card id
    (`cardProgram(g.cardId)`), so equipment needs its own source, not a fake card.
  - **Two DEAL and GUARD paths.** Program cards resolve DEAL in `LineCtx.deal` (`combat.card-program.ts:335`, the
    next-DEAL bonus, FROZEN, VULNERABLE, WARD, then `hitFoe` at 425) and GUARD in `LineCtx.guard` (476). The grey
    cards run the older path in `Combat/combat.engine.ts` (FREE riders at 833/839, paid `deal` 1091-1107, paid
    `guard` 1174-1186). Every effect that reads a DEAL or a GUARD hooks both.
  - **A card's DEAL is not marked today.** Globals call the same `deal()` with `Frame.cardId` set to the Global's id
    (1445-1456); TETHER computes its own hit (636-650); THORNS and REFLECT land through `applyEnemyDamage`
    (`combat.engine.ts:1447-1460`). A `Frame.source` (`'line' | 'global'`) is new.
  - **The other trigger points:** SACRIFICE `sacrificeEvent` (`combat.card-program.ts:575`, paid at 616-623, and
    `programPaySacrifice` 1866 for the toll); INFERNO laid `LineCtx.inferno` (789, applied 816-819); pay by discarding
    `discardRandom` apply mode (1067, `discardEntries` 1087); HEAL `LineCtx.heal` / `healExact` (493/506, event 526),
    the delayed heal (1781-1788), the signature heal (1882); Conviction `LineCtx.conviction` (531, cap
    `CONVICTION_CAP` 12); draw `LineCtx.draw` (854); turn start `startTurn` (`combat.engine.ts:347`) and
    `programTurnStart` (`combat.card-program.ts:1769`, resets `dealtThisTurn` and the other per-turn fields at
    1773-1779).
  - **Fight setup.** `initializeCombatEncounter` (`combat.engine.ts:229`) folds worn stats (241), sets signatures from
    relics only (276) and creates the program ledger only when the deck holds a program card (317). Worn effects are
    read here; the ledger (or a sibling) must exist when the gear has an effect, whatever the deck.
  - **New run.** `createNewRunPlayer` (`Game/game.reducer.ts:174`) wears only the roster's starting relic (190); the
    inventory starts empty.
  - **Item sources.** Elite drop `rollEliteRelicDrop` / `eliteRelicPool` (`Combat/combat.rewards.ts:385/361`), queued
    on mobile by `settleEliteRelicAction` (`axiomancer-mobile/state/combat/store-actions.ts:80`). Quest rewards: the
    `Reward` union already has `{ kind: 'item', item }` (`World/types.ts:13-27`), paid by `payQuestReward`
    (`World/quest.engine.ts:396`) and handed over on the `/item-reward` screen. Loot cache: the item bundle is
    consumables only (`rollCacheReward`, `Items/cache-reward.ts:79`). Village: sells cards only
    (`villageCardShopFor` / `buyVillageCard`, `World/Village/village.engine.ts:161/198`); no item is sold.
  - **Sims and the measured report.** `measuredTruthCells` (`Combat/combat.measured-truth.ts:243`) builds the player at
    278 with `createCharacter` and wears nothing; the fight sim reads gear through `initializeCombatEncounter` if the
    player wears any.
  - **Display.** Satchel row `InventoryItemRow` (`axiomancer-mobile/state/presenters/inventory.engine.ts:435-451`),
    dock "grants" sub-label (`components/inventory/EquipmentSlot.tsx:87-89`), detail card
    `selectEquipmentDetailViewModel` (`state/presenters/equipment-detail.engine.ts:247`, view
    `EquipmentDetailModal.tsx:103-133`). Combat has no "fired" event: Globals have only `global-entered` and
    `global-left` (`Combat/combat.encounter.types.ts:521-522`).

## Outcome

Chapter 1 has ten weapons and armor, each with one fight effect and no stats: every character starts wearing a grey
weapon and armor, and each of the four lanes has a weapon and an armor whose effect covers where that lane struggles;
they drop from elites, quests, loot caches and the village shop.

## Acceptance

- **A1** The engine gives equipment one fight effect: `Equipment.effect?` holds a trigger or a condition and a payoff.
  Triggers: a card's DEAL, the first card DEAL each turn, the first GUARD each turn, a SACRIFICE, laying INFERNO,
  paying by discarding, a HEAL. Conditions (each a +n to a card's DEAL while it holds): the foe has any weather, your
  GUARD holds, the foe is above half VITAE. Payoffs: HEAL n, GUARD n, Conviction n, +n to the DEAL, draw n. A worn
  weapon's and armor's effects apply in every fight, on both the program path and the grey cards' path, and only
  while worn; a card's DEAL is a card line's (RADIANCE and the MERCY burst included), never a Global's, TETHER's,
  THORNS' or REFLECT's. Each firing emits an `equipment-fired` event naming the piece. An engine test per trigger and
  per condition, plus one proving a Global's and TETHER's DEAL fire nothing.
- **A2** The ten pieces exist: `Items/equipment.library.ts` holds the slate's ten (below), slot weapon or armor, with
  the effect and placeholder names `[T to confirm #1]`, no `statModifiers`, no `laneId`, no `grantsSignature`. A
  content test pins each piece's effect and fails if any weapon or armor in the library carries a stat line, a lane or
  a signature.
- **A3** Every new run starts wearing the grey weapon and armor, for every roster character; a save made before this
  phase loads with its slots as they were (nothing granted).
- **A4** The lane pieces drop from elites, quests and loot caches: the elite drop can hand a lane piece the player does
  not carry, each Breakwater quest that pays a relic of a lane can pay that lane's weapon or armor instead or as well
  `[T to confirm #2]`, and a loot cache's item bundle can hold a lane piece; every chance comes from one `[content]`
  table `EQUIPMENT_DROP_TUNING` `[T to confirm #3]`. A test per source with a seeded roll.
- **A5** The village sells weapons and armor: the village's shop counter stocks lane pieces the player does not carry
  (count and prices from `EQUIPMENT_DROP_TUNING`) and `buyVillageEquipment` pays shillings and grants the piece
  unworn; a test buys one and refuses one the purse cannot pay `[T to confirm #4]`.
- **A6** Every surface says what a piece does: the satchel row, the dock row (in place of "grants ..." for a weapon or
  armor) and the detail card show the effect line in Dawncaster-terse words from one presenter; in a fight each
  `equipment-fired` event shows on the board (the piece's glyph pulses by the signature column and the log reads it);
  a presenter test per effect kind and a board test for the fired pulse.
- **A7** The sims can wear gear: `measuredTruthCells` takes a worn loadout, and the report gains a "grey even, grey
  pair worn" column; the regenerated `docs/reports/measured/latest.md` carries it with its commit stamp.

Measure: the per-trigger engine tests pass; `docs/reports/measured/latest.md`, regenerated with the grey pair worn,
shows the grey deck's lowest-VITAE p10 at the Toll-Keeper (bw-w5) and the first door (bw-k2) above today's 0.08 and
0.02 (546e84a); a new run on the web export shows the grey pair worn in the dock.

## The slate (T kept it, 2026-11-01; numbers tuned later)

| Lane (where it struggles) | Weapon | Armor |
|---|---|---|
| Grey (the early spike; worn from the start) | Your first DEAL each turn deals +2 | Your first GUARD each turn gives +2 |
| Blood Price (drains itself) | HEAL 3 on each card's DEAL | Each SACRIFICE gives you GUARD 2 |
| Elementalist (slow set-up, INFERNO burns you) | Your DEALs deal +2 while the foe has any weather on it | Flame Guard: +1 Conviction each time you lay INFERNO |
| Defender (low damage, discards its own hand) | Your DEALs deal +2 while your GUARD holds | Each time you pay by discarding, draw 1 |
| Merciful (heals the foe, long fights) | Your DEALs deal +2 while the foe is above half VITAE | Each HEAL gives you GUARD 2 |

"Your DEALs" means a card's DEAL (A1). "Flame Guard" is T's name; the other nine take placeholders until T names
them.

## Phases

### WA1a — Equipment effects in the engine · L · closes A1 · requires nothing

Measure: one engine test per trigger and condition passes on both the program path and the grey cards' path, and a
Global's and TETHER's DEAL fire nothing; `npm run verify -w axiomancer-mechanics` and `-w axiomancer-mobile` green.

- Scope: `Items/types.ts` (`EquipmentEffect`, `Equipment.effect?`), a new `Combat/combat.equipment-effects.ts`
  (reads worn effects at `initializeCombatEncounter`, holds per-turn flags, one `fireEquipment(trigger, ctx)` the
  hook points call, the DEAL-condition bonus added unscaled before VULNERABLE as Crimson Pact's is), `Frame.source`
  in `combat.card-program.ts` with the hook calls at DEAL, GUARD, SACRIFICE, INFERNO, discard-pay and HEAL, the same
  calls on the grey path in `combat.engine.ts`, the per-turn reset at turn start, the `equipment-fired` event in
  `combat.encounter.types.ts`; the ledger (or the new state) exists whenever the gear has an effect. Test fixtures
  only; no library piece yet.
- Consumers: the fight sim (reads gear through setup), the play-log contract if it lists event kinds.
- Save / schema: `Equipment.effect?` is optional; no `GAME_STATE_VERSION` change (only the current version loads, so a
  bump would delete saves).
- Tests matrix: new `Combat/e2e/equipment-effects.engine.test.ts` (each trigger, each condition, both paths, per-turn
  "first" resets, Conviction cap, not-worn fires nothing, Global/TETHER/THORNS fire nothing).
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`.

### WA1b — The ten pieces, and the grey pair worn from the start · M · closes A2, A3 · requires WA1a

Measure: the content test and the new-run test pass; a new run on the web export shows the grey pair in the dock.

- Scope: new `Items/equipment.library.ts` (the slate, placeholder names, ids `weapon-*` / `armor-*`, an `EQUIPMENT_LANE`
  map for drops only, not `laneId`), its barrel export, `Game/game.reducer.ts` `createNewRunPlayer` wears the grey pair
  for every character (clones, carried in the inventory too as worn pieces are), docs (`docs/game-model.md`,
  `axiomancer-mechanics/docs/equipment.md`).
- Consumers: the satchel and SELF screens (they show worn pieces already), the dev menu's item chips if they list
  equipment.
- Save / schema: none (old saves untouched, A3).
- Tests matrix: new `Items/e2e/equipment-library.engine.test.ts` (A2), `Game/e2e/new-run-kit.engine.test.ts` (A3).
- Verify gate: both workspaces.

### WA1c — Every surface says what a piece does · M · closes A6 · requires WA1b

Measure: the presenter tests per effect kind and the fired-pulse board test pass; 360x640 shots of the satchel row,
the dock and the detail card with the grey pair worn, and a fight frame with the pulse, in the PR.

- Scope: one `equipmentEffectLine(effect)` presenter in `axiomancer-mobile/state/presenters/`, read by
  `inventory.engine.ts`, `EquipmentSlot.tsx`'s sub-label (a weapon or armor shows its effect, a relic still shows
  "grants ..."), `equipment-detail.engine.ts` / `EquipmentDetailModal.tsx` (an effect block where the signature block
  sits for relics); the fight presenter turns `equipment-fired` into a pulse on the worn piece's glyph by the signature
  column and a log line.
- Consumers: satchel, dock, detail card, combat board, combat log.
- Save / schema: none.
- Tests matrix: new `state/presenters/__tests__/equipment-effect-line.test.ts`, `EquipmentDetailModal.test.tsx`,
  `EquipmentSlot.test.tsx`, a combat-board test for the pulse.
- Verify gate: `npm run verify -w axiomancer-mobile`.

### WA1d — Lane pieces drop from elites, quests and caches · M · closes A4 · requires WA1b

Measure: the seeded per-source tests pass; a dev-menu walk on the web export takes a lane piece from an elite drop.

- Scope: `EQUIPMENT_DROP_TUNING` `[content]` table, the elite drop draws a lane piece at its chance from pieces the
  player does not carry (`combat.rewards.ts`, mobile `settleEliteRelicAction` queues it on `/item-reward` as relics
  are), Breakwater quest rewards per call 2 (`World/MapEvents/content.ts` or wherever the chain's rewards live),
  `rollCacheReward` can add a lane piece to the item bundle.
- Consumers: `/item-reward`, the loot cache screen, the quest turn-in.
- Save / schema: none.
- Tests matrix: `combat.rewards` elite-drop test, a quest-reward test, `cache-reward` test (seeded).
- Verify gate: both workspaces.

### WA1e — The village sells weapons and armor · M · closes A5 · requires WA1b

Measure: the buy and refuse tests pass; the village screen on the web export lists two pieces with prices.

- Scope: `World/Village/village.engine.ts` (`villageEquipmentShopFor`, `buyVillageEquipment`), the shop counter on
  `axiomancer-mobile/app/village/index.tsx` and `state/village/store-actions.ts` lists the pieces under the cards in
  the counter's existing style; the full village treatment stays its own pitch (Nov 17).
- Consumers: the village screen.
- Save / schema: none (stock is rolled per visit, as the card shop's is, or from the same seed source).
- Tests matrix: `village.engine` test (stock, buy, refuse), a village store-action test.
- Verify gate: both workspaces.

### WA1f — The sims wear gear; the report shows the grey pair · M · closes A7 · requires WA1b

Measure: the regenerated `docs/reports/measured/latest.md` carries the "grey even, grey pair worn" column with its
commit stamp, and the Outcome Measure reads off it.

- Scope: `Combat/combat.measured-truth.ts` (a worn-loadout option on the cell builder, the new column),
  `CLI/measured-truth.cli.ts` if it lists columns, the regenerated report; `CLAUDE.md`'s measured-truth paragraph names
  the new column.
- Consumers: `scripts/measured-truth.mjs`, the measured-truth workflow (drift check).
- Save / schema: none.
- Tests matrix: the measured-truth cell test gains the worn column.
- Verify gate: `npm run verify -w axiomancer-mechanics`; the measured-truth script run.

## Scope

The engine (effects, library, new-run kit, drops, shop, sims) and the mobile presenters and screens that show and
hand out pieces. No card, keyword, relic or signature changes; no set bonuses (SB1); no Chapters 2-4 pieces.

## Consumers to update

Listed per phase. Overlaps: EQ3 (PR #1268) changes the dock and the relic loadout, not weapon or armor; whichever
lands second rebases. BW1e writes the quest chain's lines; WA1d changes only rewards.

## Save / schema contracts

- `Equipment.effect?: EquipmentEffect` (optional). No `GAME_STATE_VERSION` change.
- New event kind `equipment-fired`.
- New `[content]` table `EQUIPMENT_DROP_TUNING`.

## Decisions made upfront — DO NOT ASK

- **Ten pieces: a weapon and an armor per lane, plus a grey pair** (T, 2026-11-01, pitch t3).
- **One effect each, no stat line; a lane piece covers where its lane struggles; still no lane and no signature**
  (T, t2-t3; EQ2 calls 1-2). Relics already give stats; a stat-bump weapon would be a worse relic.
- **The slate is kept as drafted; numbers are tuned later** (T, t4). Don't let them get carried away; the grey pair
  is the early bump (T, t2).
- **The Blood Price weapon heals on a card's DEAL only** (T, t4), and every "your DEALs" effect reads a card's DEAL,
  so no effect multiplies through Globals, TETHER or THORNS.
- **Every character starts wearing the grey pair** (T, t3); old saves get nothing (no version bump, A3).
- **Drops from all four sources; rates are a tuning table to experiment with** (T, t3).
- **Names are placeholders** `[T to confirm #1]`: "Grey Blade", "Grey Coat", and "<Lane> Blade" / "<Lane> Mail"
  for the lane pieces, with T's "Flame Guard" for the Elementalist armor; T's names replace them as a `[content]`
  swap.
- **Quests pay a lane piece in addition to their relic** `[T to confirm #2]`: each Breakwater quest that pays a relic
  of a lane also pays one of that lane's two pieces (weapon for the first such quest, armor for the next); pieces no
  quest pays come from elites, caches and the shop. Alternative: instead of the relic; or no quest pays equipment.
- **Starting rates** `[T to confirm #3]`: elite drop 25% a lane piece (on top of its relic roll), a loot cache's item
  bundle 33%, the shop stocks two pieces per visit at 40 shillings each. Rates are for experimenting (T, t3).
- **The shop sells them now, in the counter's current style** `[T to confirm #4]`, not held for the village's full
  treatment (Nov 17), so all four sources work for the MVP demo. Alternative: WA1e waits for the village pitch.
- **Equipment gets its own effect source, not fake Global cards.** Globals look effects up by card id; a fake card
  would leak into deck, reward and play-log code.
- **The engine first, alone** (`skills/plot.md` Step 3: a contract later pieces build on is its own phase); the
  visible pieces come right after.
- **Slot: asap (T's word).** The grey pair is the early bump T wants on the Nov 9 mid-MVP check, and the MVP demo
  (Nov 16) names Chapter 1's weapons and armor.

## Tests matrix

Listed per phase. Deleted: nothing.

## Verify gate

Both workspace gates for WA1a, WA1b, WA1d, WA1e; the mobile gate for WA1c; the mechanics gate and the
measured-truth run for WA1f. Foreground, never `--no-verify`.

## Commit body template

```
WA1a: equipment effects in the engine

A worn weapon or armor carries one effect: a trigger or a condition
and a payoff, fired on both the program and the grey cards' paths,
only for a card's DEAL. Each firing emits equipment-fired.

Closes A1 of plan/phases/phase_WA1_weapons_and_armor.md.
```

(WA1b: "the ten pieces, and the grey pair worn from the start", closes A2, A3. WA1c: "every surface says what a piece
does", A6. WA1d: "lane pieces drop from elites, quests and caches", A4. WA1e: "the village sells weapons and armor",
A5. WA1f: "the sims wear gear", A7.)

## DoD

A1-A7 ticked across WA1a-WA1f; the Measure met.

## Follow-ups (out of scope)

- T names the nine unnamed pieces (call 1); a `[content]` swap when T does.
- Tuning the slate's numbers after the sims and T's play (T, t4).
- Weapons and armor for Chapters 2-4.
- The village's full treatment (its own pitch, Nov 17) restyles the equipment counter.
- Set bonuses that count weapons and armor (SB1).
