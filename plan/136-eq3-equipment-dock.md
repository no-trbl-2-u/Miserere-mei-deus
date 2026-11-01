# 136 — Equipment: the dock fixed with drag and drop, and Chapter 1's weapons and armor

> On the satchel screen every one of the five slots can be filled, swapped and emptied, by tap or by drag, a relic stays in the slot the player put it in, and the bust has room beside a narrower slot column. Chapter 1 gains ten weapons and armor, each with one fight effect and one dice effect and no stats: every character starts wearing a grey pair, and each lane has a weapon and an armor that cover where it struggles.

Plotted by T on 2026-10-31 as the v1 brief `phase_EQ3_equipment_dock.md` (plot PR #1268) and carried to the v2 spec format after the nexus v2 cut-over (phase NX1d), at T's word on 2026-11-01 ("Close #1276, keep #1268"). The brief's own words follow under these headings. Each chunk keeps its v1 row id as its `alias:`, so deadlines and PRs that name EQ3a-EQ3c still resolve.

## Why

### Sources

- `/plot` from T, 2026-10-31 (attended), with a screenshot of the satchel's WORN UPON THE BODY dock (bare WEAPON and
  ARMOR, Suppliant's Ring in RELIC I, Elementalist's Brooch in RELIC II, RELIC III bare). T, verbatim: "Equipment
  slots are broken, we can only equip/unequip the bottom row. Fix that, but furthermore, allow for drag and drop.
  We can also make the equipment slots less wide so the portrait has some room to breathe."
- T's answers in the session (`AskUserQuestion`): relics **stay put** when one is taken off (an empty slot stays
  empty, the others do not slide up); drag and drop works on **all five slots** ("All 5 actually, once we have
  weapons and armor, they should be included").
- Decisions it rests on: D105 (one weapon, one armor, three relic slots), D47 / D71 / D100 / D104 (worn relics grant
  signatures and decide the lane slots), D91 (one card face everywhere), D88 (no content here). EQ1
  (`plan/phases/phase_EQ1_relic_loadout.md`: `player.equipment` is the one record of what is worn) and EQ2
  (`plan/phases/phase_EQ2_equipment_slots.md`: its decision "Positions keep no identity" is the one T reverses here).
- Code read while shaping this (already built / new):
  - **The bottom-row defect, found.** A dock tap only filters the satchel (`app/(tabs)/inventory/index.tsx`
    `onSelectSlot`); the wear happens from the satchel's ItemModal through `equipItemAction`
    (`axiomancer-mobile/state/actions.ts:1024`), which asks `displacedBy` (`axiomancer-mechanics/src/Items/item-grant.ts:158`)
    for the piece to replace and passes no `replaceIndex`. With three relics worn `displacedBy` defaults to
    `acc.length - 1`, so **every relic equip replaces RELIC III**, whichever row the player picked. And the dock's
    selection is keyed by slot kind (`selectedSlot === slot.key`, `components/inventory/EquipmentDock.tsx`), and all
    three relic rows share `key: 'relic'`, so picking RELIC I highlights all three and carries no position to the
    equip. The screen never tells the engine which relic row was meant.
  - **Positions have no identity today.** `equipItem` appends to the first free position, `unequipItem` splices and
    compacts (`axiomancer-mechanics/src/Character/equipment.reducer.ts:114-185`); `EquipmentLoadout.relics` is a
    packed `Equipment[]`. About 18 non-test files read `.relics` across both workspaces (`equip-delta.ts`,
    `combat.reward-lanes.ts`, `relic-lanes.ts`, `item-grant.ts`, `game.reducer.ts`, `legacy-slots.ts`,
    `roster-health.ts`, `combat.play-log-contract.ts`, the CLIs, the fixture builder; mobile `actions.ts`,
    `fightRecorder.ts`, `dev/inspector.ts`, `inventory.modal.engine.ts`, `presenters/loadout.ts`).
  - **Saves.** There is no hop chain: only the current `GAME_STATE_VERSION` loads (`Game/game.migrate.ts` header,
    BW1b). A version bump would make every save unreadable, so EQ3a changes no version: a packed array of up to three
    pieces is already a valid positional loadout (no holes), and the new shape only adds `null` holes.
  - **Drag precedent.** The hazard board drags cards and dice with `react-native-gesture-handler` `Gesture.Pan` and a
    screen-owned `DragController` with `begin / move / end(x, y)` and drop-zone rects
    (`components/hazard/HazardBoard.tsx:55-70, 214`); its tests drive `end(x, y)` directly. Both libraries are
    installed (`react-native-gesture-handler ~2.28`, `react-native-reanimated ~4.1`).
  - **The dock layout.** The slot column is `flex: 1` and the bust a fixed square of 112 pt under 900 pt wide, 300 pt
    above (`equipmentDockPortraitBox`); at phone width the slots take about two thirds of the dock and the bust sits
    in a dark gutter (T's screenshot).
  - **No weapon or armor exists** (EQ2 Follow-ups); the top two rows are bare in every run. The drag and tap paths
    are built for them anyway and tested with fixture pieces.


### Sources: weapons and armor

- `/pitch` then `/plot asap`, T attended, 2026-11-01. The pitch file is the source:
  `braindump/2026-11-01-weapons-and-armor.md` (surface question, measured table, prior art, rulings, the slate,
  the Handoff block). T's opening: "We need weapons and armor but I have no idea what their effect(s) should be ...
  Just normal stat bumps just seem a little light." T's rulings are listed under Decisions.
- `plan/deadlines.md`: the Items "Pitch Chapter 1's weapons and armor" (Oct 31) and "Plot Chapter 1's weapons and
  armor from the pitch" (Nov 2); the MVP milestone names Chapter 1's weapons and armor.
- Decisions it rests on: D105 (one weapon, one armor, three relics), EQ2 calls 1-2 (weapons and armor grant no
  signature and open no lane), D112 (the village holds the card shop; loot caches are a node kind), D88 (content in a
  phase T approves; T asked for these ten), D57 (the measured report is a measurement, not a gate).
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
- **The dice half** (T, 2026-11-01, mid-pitch: "I wanted armor and weapons to effect the dice as well (ie. 1 extra hit
  on the blue die or Turn one hit into a special on your red die). I also wanted the weapons to control what happened
  when you used a special die"; "the starting grey sword is the 2 conviction special"; then "Yeah, plot this and
  integrate it into 1268"). Pitch file: `braindump/2026-11-01-weapons-and-armor.md` (committed with this plot).
  - **Die gear exists.** `DEFAULT_DIE_GEAR` (`axiomancer-mechanics/src/Combat/combat.upgradeable-dice.ts:81`): per colour
    `specialFaces`, `manaFaces`, `specialConviction`; body red, mind blue, heart purple, gold wild; coloured dice
    1 special / 2 mana / 3 miss, gold 1 / 1 / 4. A special powers its card and pays `specialConviction` (+2) when used;
    the payload is a number only. `activeDieGear` reads `state.dieGear` or the honed default.
  - **HONE** turns a miss into a mana face (`honedDieGear`; `Character/dieGear.reducer.ts:136` `honeDieGear`); a
    coloured die runs out of miss faces after three.
  - D110: colour is only payment, so each armor names its die; the pitch picked each by the colour its lane's cards ask
    for most.

### Outcome

On the satchel screen every one of the five slots can be filled, swapped and emptied, by tap or by drag, and a relic
stays in the slot the player put it in; the bust has room beside a narrower slot column. Chapter 1 has ten weapons
and armor, each with one fight effect and one dice effect and no stats: every character starts wearing a grey weapon
and armor, and each of the four lanes has a weapon and an armor that cover where that lane struggles; they drop from
elites, quests, loot caches and the village shop.

Measure: on the web export, with two relics worn, taking off RELIC I leaves RELIC II where it is, a satchel relic
dragged onto RELIC I is worn there, and the slot column is at most 55% of the dock at 360 pt; the per-trigger and
per-die engine tests pass; `docs/reports/measured/latest.md`, regenerated with the grey pair worn, shows the grey
deck's lowest-VITAE p10 at the Toll-Keeper (bw-w5) and the first door (bw-k2) above 0.08 and 0.02 (546e84a); both
workspace verify gates green.

## Design

### Decisions made upfront — DO NOT ASK

- **Relics keep their place (T, 2026-10-31, in session: "Stay put").** This reverses EQ2's "Positions keep no
  identity"; EQ3a's PR amends that line of the EQ2 brief and the D105 note in the decisions log to say so.
- **Drag and drop covers all five slots (T, 2026-10-31: "All 5 actually").** Weapon and armor rows take drags today
  even though no weapon or armor exists; fixture pieces test them.
- **The bottom-row defect is the replace default, not a touch bug.** The research above traced it to `displacedBy`'s
  `acc.length - 1` default and the kind-keyed selection; EQ3b's first step reproduces it on the web export (three
  relics worn, RELIC I picked, a relic worn from the satchel replaces RELIC III) before changing anything. If the
  reproduction shows a second cause (a row that ignores taps), EQ3b fixes that too and says so in its PR.
- **A tap on a dock row still filters the satchel**, now to the row's kind; with a row picked, wearing from the
  satchel wears into that row. Tap paths stay beside every drag (accessibility, and the tests).
- **No version bump.** Only the current save version loads, so a bump would delete T's saves; the shape change is
  backward-compatible instead.
- **Column width: about 55% of the dock at phone width.** T asked for "less wide"; 55% leaves the bust roughly half
  the dock while the longest shipped line ("grants Kindle the Gale") still fits at the row's font. The builder may
  move it a few points to keep A6's no-truncation rule, and says so in the PR.
- **A wrong-kind drop is refused loudly** (owner UI doctrine: illegal actions prevented loudly), never silently
  snapped back.
- **Slot: asap.** It fixes a live defect T hit in play, and the Mid-MVP check (Nov 9) plays the Chosen with two
  relics on the preview build.


### The slate (T kept it, 2026-11-01; numbers tuned later)

| Lane (where it struggles) | Weapon | Armor |
|---|---|---|
| Grey (the early spike; worn from the start) | Your first DEAL each turn deals +2 | Your first GUARD each turn gives +2 |
| Blood Price (drains itself) | HEAL 3 on each card's DEAL | Each SACRIFICE gives you GUARD 2 |
| Elementalist (slow set-up, INFERNO burns you) | Your DEALs deal +2 while the foe has any weather on it | Flame Guard: +1 Conviction each time you lay INFERNO |
| Defender (low damage, discards its own hand) | Your DEALs deal +2 while your GUARD holds | Each time you pay by discarding, draw 1 |
| Merciful (heals the foe, long fights) | Your DEALs deal +2 while the foe is above half VITAE | Each HEAL gives you GUARD 2 |

"Your DEALs" means a card's DEAL (A10). "Flame Guard" is T's name; the other nine take placeholders until T names
them.

### The dice slate (T kept it, 2026-11-01; numbers tuned later)

| Lane | Weapon: your special... | Armor: die change |
|---|---|---|
| Grey | pays +2 Conviction (today's special, now the grey sword's) | +1 hit on the gold die (a miss becomes mana) |
| Blood Price | heals 4 | one hit becomes a special on the red (body) die |
| Elementalist | lays INFERNO 2 on the foe only | +1 hit on the blue (mind) die |
| Defender | gives GUARD 6 | +1 hit on the purple (heart) die |
| Merciful | lays VULNERABLE on the foe for a turn | one hit becomes a special on the blue die |

Each piece carries one trigger effect (the slate above) and one dice effect (this table): "both, everywhere" (T).
Watch: an armor's +1 hit stacks with the Anvil's HONE until the die has no miss face left; the Blood Price pair is a
combo (more specials, each one heals) and the first place to check for "carried away".

### The names (T's call 1, 2026-11-01)

| Lane | Weapon | Armor |
|---|---|---|
| Grey | Opening Blade (first attack each turn) | Bracing Coat (first block each turn) |
| Blood Price | Siphoning Blade (heals on each attack card; T's name) | Bloodward Mail (GUARD on each SACRIFICE) |
| Elementalist | Stormcaller Staff (hits harder while the foe has weather) | Flame Guard (Conviction per INFERNO; T's name) |
| Defender | Bulwark Mace (hits harder while your GUARD holds) | Scavenger's Coat (draws when you pay by discarding) |
| Merciful | Humbling Rod (hits harder while the foe is above half VITAE) | Mending Vestments (GUARD on each HEAL) |

Ids: `weapon-opening-blade`, `armor-bracing-coat`, `weapon-siphoning-blade`, `armor-bloodward-mail`,
`weapon-stormcaller-staff`, `armor-flame-guard`, `weapon-bulwark-mace`, `armor-scavengers-coat`,
`weapon-humbling-rod`, `armor-mending-vestments`.

### The icons (T, 2026-11-01)

T's own item sheets replace the game-icons glyphs for every item (T: "Everything on the sheet"). T picked sheet A, the
cool-silver finish ("A is fine"), and the hammer and scepter from sheet D for the two pieces A lacks ("why can't you use
the mace I provided in the other sheet?"). The sheets are 1254 px squares, a 6x6 grid of 209 px cells, committed on this
branch as `axiomancer-mobile/assets/images/items/sheet-a-cool-silver.png` and `sheet-d-ivory-lavender.png` (T's art, open
source per D115). Cells are row,col from the top left.

| Item id | Sheet, cell | Picture |
|---|---|---|
| `weapon-opening-blade` | A 2,5 | longsword |
| `armor-bracing-coat` | A 4,4 | steel breastplate |
| `weapon-siphoning-blade` | A 2,4 | scimitar |
| `armor-bloodward-mail` | A 4,5 | gold breastplate |
| `weapon-stormcaller-staff` | A 3,1 | staff |
| `armor-flame-guard` | A 4,1 | kite shield |
| `weapon-bulwark-mace` | D 3,0 | gold hammer |
| `armor-scavengers-coat` | A 4,0 | round shield |
| `weapon-humbling-rod` | D 3,1 | gold scepter |
| `armor-mending-vestments` | A 5,3 | purple cloak |
| `relic-disarming-plea` | A 0,0 | pearl ring |
| `relic-crimson-circlet` | A 0,1 | circlet |
| `relic-ruby-signet` | A 0,2 | ruby ring |
| `relic-bleeding-signet` | A 0,3 | bleeding chalice |
| `relic-elementalist-signet` | A 0,4 | eye |
| `relic-elementalist-brooch` | A 0,5 | amber pendant |
| `relic-elementalist-belt` | A 1,0 | flame belt |
| `relic-thornback-signet` | A 1,1 | thorn ring |
| `relic-mirror-brooch` | A 1,2 | mirror |
| `relic-carapace-belt` | A 1,3 | shell belt |
| `minor-healing-potion` | A 1,4 | vial |
| `healing-potion` | A 1,5 | heart flask |
| `greater-healing-potion` | A 2,0 | perfume bottle |

The other cells (candle, scroll, rune, bow, dagger, axe, lute, helms, gauntlets, greaves, crown, sealed scroll, purse)
are not wired; they wait for items that use them.

**Slicing, proved in the session (2026-11-01).** A fixed 209 px crop shows slivers of the neighbouring icons (the vial beside
the heart flask, the belt's ribbon). Cut by blob instead: label every 8-connected run of pixels with alpha 24 or more,
give each blob to the cell holding its centroid, crop a cell to the union box of its own blobs, copy only those blobs onto
a transparent square with 6 px padding, centred, and resize to 256 px. All 36 cells of sheet A came out clean this way.

### Decisions made upfront: weapons and armor — DO NOT ASK

- **Ten pieces: a weapon and an armor per lane, plus a grey pair** (T, 2026-11-01, pitch t3).
- **One effect each, no stat line; a lane piece covers where its lane struggles; still no lane and no signature**
  (T, t2-t3; EQ2 calls 1-2). Relics already give stats; a stat-bump weapon would be a worse relic.
- **The slate is kept as drafted; numbers are tuned later** (T, t4). Don't let them get carried away; the grey pair
  is the early bump (T, t2).
- **The Blood Price weapon heals on a card's DEAL only** (T, t4), and every "your DEALs" effect reads a card's DEAL,
  so no effect multiplies through Globals, TETHER or THORNS.
- **Every character starts wearing the grey pair** (T, t3); old saves get nothing (no version bump, A12).
- **Drops from all four sources; rates are a tuning table to experiment with** (T, t3).
- **Names** Confirmed by T (2026-11-01): "generate names for them, but keep them relatively simple/recognizable ...
  Name them something thematic, but still clear where the synergy is (ie. Flame Guard, Siphoning Blade, etc.)". The
  names are in "The names" below; T's "Flame Guard" and "Siphoning Blade" kept.
- **Quest rewards alternate** Confirmed by T (2026-11-01): "one quest is a relic, another is a weapon, etc." The
  Breakwater quests that pay a reward pay, in chain order, a relic, then a weapon or armor, then a relic, and so on;
  an equipment step pays a piece of the lane of the relic that step paid before, weapon first, then armor. This
  amends D114's "every quest pays a relic"; 136.8's PR records the amendment in the decisions log. Pieces no quest pays
  come from elites, caches and the shop.
- **Starting rates** Confirmed by T (2026-11-01): elite drop 25% a lane piece (on top of its relic roll), a loot cache's
  item bundle 33%, the shop stocks two pieces per visit at 40 shillings each; and **befriending an elite always hands a
  lane piece** the player does not carry (100%; T: "but also, 100% if you befriend an elite"). Rates are for
  experimenting (T, t3).
- **The shop sells them now, in the counter's current style** Confirmed by T (2026-11-01): yes. Not held for the
  village's full treatment (Nov 17).
- **Equipment gets its own effect source, not fake Global cards.** Globals look effects up by card id; a fake card
  would leak into deck, reward and play-log code.
- **Effects reach the dice, both everywhere** (T, pitch t5): each piece keeps its trigger effect and adds a dice
  effect; weapons set the special, armor changes one face on one die.
- **A weapon's special replaces the +2 Conviction** (T, t6); **the grey sword's special is the +2 Conviction** (T,
  t8), so a new run plays as today.
- **With no weapon worn a special only powers its card** Confirmed by T (2026-11-01): "That is correct, yes".
- **The dice slate is kept as drafted; numbers tuned later** (T, t7).
- **The gear joins this spec** (T, 2026-11-01: "plot this and integrate it into 1268"): the dock chunks stay first, the
  gear follows as 136.4-136.10; both chains share the dock row 136.7 rewrites.

### Scope

The engine's relic loadout and its readers (EQ3a); the satchel screen, its dock, modal and presenters (EQ3b, EQ3c).
No relic, weapon or armor content; no signature, lane or reward rule changes; the SELF screen's gear list is only
made hole-safe.

### Consumers to update

Listed per phase. Overlaps: RW1/LR1 lane readers read `relics` (made null-safe in EQ3a); SB1 (set bonuses, attended)
will count worn relics and must skip holes. CD1b and MC1 touch other screens.

### Verify gate

Both workspace gates for EQ3a; the mobile gate for EQ3b and EQ3c. Foreground, never `--no-verify`.

### Follow-ups (not in this spec)

- Drag and drop on the SELF screen's gear list: not asked; a new `/plot` if T wants it.
- Weapon and armor content: still none (EQ2 Follow-ups); the rows stay bare until T's Chapter 1 weapons and armor
  plot.

- T names the nine unnamed pieces (call 1); a `[content]` swap when T does.
- Tuning the slate's numbers after the sims and T's play (T, t4).
- Weapons and armor for Chapters 2-4.
- The village's full treatment (its own pitch, Nov 17) restyles the equipment counter.
- Set bonuses that count weapons and armor (SB1).
- Icons for items the table above does not list, and the other sheets' finishes (B, C, E, F): a `[content]` row when
  an item needs one.

### Chunk notes (the brief's phase blocks)

### 136.1 (EQ3a) — Relics keep their place, in the engine · M · closes A1, A2, A3 · requires nothing

Measure: the positional-loadout, move and old-save engine tests pass; `npm run verify -w axiomancer-mechanics` and
`npm run verify -w axiomancer-mobile` green with nothing on screen changed.

- Scope: `axiomancer-mechanics/src/Character/types.ts` (`relics: (Equipment | null)[]`, `emptyLoadout` three
  `null`s), `Character/equipment.reducer.ts` (`equipItem` `position`, `unequipItem` leaves a hole, new `moveRelic`,
  `getEquippedItems` skips holes), `Items/item-grant.ts` (`displacedBy` takes `position`; full means three non-null),
  every other `.relics` reader listed in Sources made null-safe, barrel exports. In `axiomancer-mobile` only the
  type fallout: `state/actions.ts` (`unequipItemAction` finds the position, no compaction), `presenters/loadout.ts`
  (`wornAtRow` unchanged in meaning), `fightRecorder.ts`, `dev/inspector.ts`, `inventory.modal.engine.ts`.
  `axiomancer-mechanics/docs/equipment.md` and `docs/game-model.md` say relics keep their position.
- Consumers: signatures for the next fight, lane slots (`combat.reward-lanes.ts`, `relic-lanes.ts`), the stat fold,
  the item grant path, the play log, the CLIs, the dock and SELF presenters.
- Save / schema: `EquipmentLoadout.relics` gains `null` entries; no `GAME_STATE_VERSION` change (a packed array is
  valid). The load path pads a short array to three only if a reader needs it; the test of A3 pins that a packed
  save loads.
- Tests matrix: `Character/e2e/equipment-loadout.engine.test.ts` rewritten for positions (A1); new
  `Character/e2e/relic-move.engine.test.ts` (A2); new `Game/e2e/relic-holes-save.engine.test.ts` (A3);
  `relic-slot.engine.test.ts` (EQ2's "unequip compacts" case becomes "unequip leaves a hole"),
  `item-grant.engine.test.ts`, `equip-delta.engine.test.ts` updated; mobile `loadout-truth` and inventory tests
  updated for holes.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`.

### 136.2 (EQ3b) — Every row taps, the picked row changes, the bust breathes · M · closes A4, A5, A6 · requires EQ3a

Measure: the five-row selection and store tests pass; the 360x640 before/after shots show RELIC I alone picked and
the narrower column; `npm run verify -w axiomancer-mobile` green.

- Scope: `axiomancer-mobile/app/(tabs)/inventory/index.tsx` (selection is a row id, not a slot kind; the satchel
  filter still filters by the row's kind), `components/inventory/EquipmentDock.tsx` (`selected` by row,
  `equipmentDockPortraitBox` and the column width rule of A6), `EquipmentSlot.tsx`, `SlotBanner.tsx`,
  `state/presenters/inventory.engine.ts` (`selectedSlot` becomes the row; banner label per row),
  `inventory.modal.engine.ts` (REPLACE names the picked row's piece), `state/actions.ts` (`equipItem(itemId,
  position?)` passes the position to the engine). No engine change.
- Consumers: the satchel screen, the ItemModal, the equipment detail card, the item-reward screen's equip (keeps the
  default first-empty position).
- Save / schema: none.
- Tests matrix: `EquipmentDock.test.tsx`, `EquipmentSlot.test.tsx` (A4), `EquipmentDock.portrait-box.test.tsx`
  rewritten (A6), `ItemModal.test.tsx`, a new store test `state/__tests__/equip-picked-row.test.ts` (A5), the
  inventory presenter tests.
- Verify gate: `npm run verify -w axiomancer-mobile`; before/after shots at 360x640 in the PR.

### 136.3 (EQ3c) — Drag and drop on all five slots · L · closes A7, A8, A9 · requires EQ3b

Measure: the drag-controller component tests and the web-export walk of A9 pass; `npm run verify -w
axiomancer-mobile` green.

- Scope: a dock drag controller modelled on the hazard board's (`begin / move / end(x, y)`, measured rects for the
  five rows and the satchel list, a ghost of the dragged item's glyph and name), `Gesture.Pan` on satchel equipment
  rows (`components/inventory/ItemGrid.tsx` / `ItemCard.tsx`) and on filled dock rows, the lit-row and refused-drop
  states in `EquipmentSlot.tsx`, the refusal line from a presenter (no copy in components), drops routed to the
  same store actions as EQ3b plus `moveRelic`. Long-press keeps opening the detail card: a drag starts only after
  movement past a small threshold.
- Consumers: the satchel screen only.
- Save / schema: none.
- Tests matrix: new `components/inventory/__tests__/EquipmentDock.drag.test.tsx` (A7, A8: each row, each refusal,
  drop outside), `ItemGrid.test.tsx` (drag start does not break tap and long-press), a web-export browser walk
  script under the mobile e2e folder (A9).
- Verify gate: `npm run verify -w axiomancer-mobile`; the A9 walk on the web export.

### 136.4 (EQ3d) — Equipment effects in the engine · L · closes A10 · requires nothing

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

### 136.5 (EQ3e) — Dice effects in the engine · M · closes A17, A18 · requires 136.4

Measure: one engine test per armor face change and per weapon special payload passes, the fully honed case gains
nothing, and the grey sword's special pays +2 Conviction; both workspace gates green.

- Scope: `Items/types.ts` (`EquipmentEffect` gains `die?: { color, change: 'miss-to-mana' | 'mana-to-special' }` for
  armor and `special?: SpecialPayload` for weapons), `Combat/combat.upgradeable-dice.ts` (`activeDieGear` applies the
  worn armor's change on top of the character's gear; the special's payout reads the worn weapon's payload, else only
  powers the card per call 5), the payout site where `specialConviction` is paid, `combat.equipment-effects.ts` (read
  both at fight setup). Test fixtures only.
- Consumers: the dice tray presenter (it shows faces and the special's gloss; WA's display chunk 136.7 words it), the
  fight sim.
- Save / schema: optional fields; no version change.
- Tests matrix: new `Combat/e2e/equipment-dice.engine.test.ts`.
- Verify gate: both workspaces.

### 136.6 (EQ3f) — The ten pieces, and the grey pair worn from the start · M · closes A11, A12 · requires 136.4, 136.5

Measure: the content test and the new-run test pass; a new run on the web export shows the grey pair in the dock.

- Scope: new `Items/equipment.library.ts` (the slate, placeholder names, ids `weapon-*` / `armor-*`, an `EQUIPMENT_LANE`
  map for drops only, not `laneId`), its barrel export, `Game/game.reducer.ts` `createNewRunPlayer` wears the grey pair
  for every character (clones, carried in the inventory too as worn pieces are), docs (`docs/game-model.md`,
  `axiomancer-mechanics/docs/equipment.md`).
- Consumers: the satchel and SELF screens (they show worn pieces already), the dev menu's item chips if they list
  equipment.
- Save / schema: none (old saves untouched, A12).
- Tests matrix: new `Items/e2e/equipment-library.engine.test.ts` (A11), `Game/e2e/new-run-kit.engine.test.ts` (A12).
- Verify gate: both workspaces.

### 136.7 (EQ3g) — Every surface says what a piece does · M · closes A15 · requires 136.2, 136.6

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

### 136.8 (EQ3h) — Lane pieces drop from elites, quests and caches · M · closes A13 · requires 136.6

Measure: the seeded per-source tests pass; a dev-menu walk on the web export takes a lane piece from an elite drop.

- Scope: `EQUIPMENT_DROP_TUNING` `[content]` table, the elite drop draws a lane piece at its chance from pieces the
  player does not carry (`combat.rewards.ts`, mobile `settleEliteRelicAction` queues it on `/item-reward` as relics
  are), Breakwater quest rewards per call 2 (`World/MapEvents/content.ts` or wherever the chain's rewards live),
  `rollCacheReward` can add a lane piece to the item bundle.
- Consumers: `/item-reward`, the loot cache screen, the quest turn-in.
- Save / schema: none.
- Tests matrix: `combat.rewards` elite-drop test, a quest-reward test, `cache-reward` test (seeded).
- Verify gate: both workspaces.

### 136.9 (EQ3i) — The village sells weapons and armor · M · closes A14 · requires 136.6

Measure: the buy and refuse tests pass; the village screen on the web export lists two pieces with prices.

- Scope: `World/Village/village.engine.ts` (`villageEquipmentShopFor`, `buyVillageEquipment`), the shop counter on
  `axiomancer-mobile/app/village/index.tsx` and `state/village/store-actions.ts` lists the pieces under the cards in
  the counter's existing style; the full village treatment stays its own pitch (Nov 17).
- Consumers: the village screen.
- Save / schema: none (stock is rolled per visit, as the card shop's is, or from the same seed source).
- Tests matrix: `village.engine` test (stock, buy, refuse), a village store-action test.
- Verify gate: both workspaces.

### 136.10 (EQ3j) — The sims wear gear; the report shows the grey pair · M · closes A16 · requires 136.6

Measure: the regenerated `docs/reports/measured/latest.md` carries the "grey even, grey pair worn" column with its
commit stamp, and the Outcome Measure reads off it.

- Scope: `Combat/combat.measured-truth.ts` (a worn-loadout option on the cell builder, the new column),
  `CLI/measured-truth.cli.ts` if it lists columns, the regenerated report; `CLAUDE.md`'s measured-truth paragraph names
  the new column.
- Consumers: `scripts/measured-truth.mjs`, the measured-truth workflow (drift check).
- Save / schema: none.
- Tests matrix: the measured-truth cell test gains the worn column.
- Verify gate: `npm run verify -w axiomancer-mechanics`; the measured-truth script run.

### 136.11 (EQ3k) — Every item draws its picture from T's sheets · M · closes A19, A20 · requires nothing

Measure: the slice script writes the 23 icons; the sprite-map test and the glyph tests pass; 360x640 shots of the satchel,
the dock and an item reward with sprites in the PR.

- Scope: a new `scripts/slice-item-sheet.mjs` (sharp, the blob method of "The icons"; args: sheet, cells, out dir) and
  its test; the 23 icons written to `axiomancer-mobile/assets/images/items/<item-id>.png` with an
  `items/provenance.json` (T's sheets, derived by the script, open source per D115); a new
  `components/icons/item-sprites.ts` mapping item id to its `require`d PNG; `ItemGlyph` (`ItemCard.tsx`) draws the sprite
  when the id has one and falls back to today's glyph chain otherwise; `ITEM_GLYPH_BY_ID` and `ITEM_GLYPH_ACCENTS` lose
  the rows a sprite replaces (the colours are in the art). Every `ItemGlyph` consumer keeps its call (satchel, dock,
  detail card, item reward, aftermath, character select, quest giver).
- Consumers: every screen that shows an item; the web export and the APK bundle the PNGs.
- Save / schema: none.
- Tests matrix: `scripts/slice-item-sheet.test.mjs` (a synthetic sheet with a sliver across a grid line: the sliver
  goes to its own cell); new `components/icons/__tests__/item-sprites.test.ts` (A20); `ItemGlyph.by-id.test.tsx`,
  `item-glyph-accents.test.tsx`, `character-select.relic-icon.test.tsx` updated.
- Verify gate: `npm run verify -w axiomancer-mobile`; the root `npm test` for the script.

## Contracts

- `EquipmentLoadout.relics`: `Equipment[]` (packed, up to 3) becomes `(Equipment | null)[]` (three positions). No
  version bump; old packed saves load as-is (A3).
- New engine export `moveRelic`; `equipItem` gains `position`; `displacedBy` gains `position`.

- `Equipment.effect?: EquipmentEffect` (optional): a trigger or a condition and a payoff (136.4), a die change for
  armor and a special payload for weapons (136.5). No `GAME_STATE_VERSION` change.
- New event kind `equipment-fired`; new `[content]` table `EQUIPMENT_DROP_TUNING`.
- New mobile table `ITEM_SPRITES` (item id to PNG); `ItemGlyph` keeps its props.

## Acceptance

- **A1** Relics keep their place: `EquipmentLoadout.relics` is a positional list of three entries, each a piece or
  `null`. `equipItem(character, relic, { position })` wears the relic at that position (replacing what is there);
  with no `position` it fills the first empty position, and with none empty it is the guarded no-op as today.
  `unequipItem(character, 'relic', i)` sets position `i` to `null` and moves no other relic. An engine test wears
  three relics, takes off RELIC I, and sees RELIC II and III unchanged at positions 1 and 2, then wears a fourth at
  position 0.
- **A2** Moving a relic between positions: `moveRelic(character, from, to)` moves the piece at `from` to `to`, and
  swaps when `to` is full; same `maxHealth`, same worn set, same signatures. An engine test covers move-to-empty,
  swap and `from === to` (same reference back).
- **A3** Every reader tolerates holes and old saves load unchanged: every reader of `relics` in both workspaces skips
  `null` (signatures, lane slots, the stat fold, the play log, the CLIs, the dev inspector); a packed save written
  before 136.1 loads at the same `GAME_STATE_VERSION` with its relics at positions 0..n-1 and the same signatures and
  lanes for the next fight, and a save with a hole round-trips. Engine tests for both; `getEquippedItems` never
  returns `null`.
- **A4** One dock row is picked at a time: the dock's selection is a row (`weapon`, `armor` or a relic position),
  so tapping RELIC I highlights RELIC I only and the banner names it ("RELIC I"); re-tapping clears it. A component
  test taps each of the five rows and sees exactly that row selected.
- **A5** The picked row is the one that changes: with a relic row picked, wearing a relic from the satchel wears it
  in that position (the ItemModal's REPLACE line names the piece in that row, or none when it is empty), for RELIC I,
  II and III alike; with no row picked a relic fills the first empty position, and with all three full the modal
  names RELIC III as today's default. A worn piece in any of the five rows can be taken off from the modal and from
  the detail card, and only its row empties. A store test runs each of the five rows (weapon and armor with fixture
  pieces) through wear, replace and take-off.
- **A6** The bust breathes: at phone width (360 pt) the slot column is no wider than about 55% of the dock's inner
  width and the bust takes the rest, still square and centred, and no row's name or "grants" line truncates for
  either shipped relic; above 900 pt the layout is unchanged. The portrait-box test is rewritten to the new rule.
  Before/after shots of the dock at 360x640 in the PR.
- **A7** Drag to wear: a satchel row of equipment can be dragged onto a dock row; a piece dropped on a row of its
  own kind is worn there (replacing what is there, through the same actions as A5), a piece dropped on a row of
  another kind (a relic on WEAPON) is refused loudly (the row flashes and a one-line reason shows; nothing changes),
  and a drop outside every row does nothing. While dragging, every row that would take the piece is lit.
- **A8** Drag to take off, and between relics: a worn piece can be dragged off the dock onto the satchel list, which
  takes it off and empties only its row; a worn relic dragged onto another relic row moves there (swapping if full,
  A2's `moveRelic`); a weapon or armor dragged onto any other row is refused as in A7.
- **A9** Taps still work, and drags are proved: every drag in A7-A8 has the tap path of A4-A5 beside it; a
  component test drives the dock's drag controller (`begin / end(x, y)` on measured row rects, the hazard board's
  seam) for each of the five rows and each refusal; a web-export browser walk drags the Elementalist's Brooch from
  RELIC II to RELIC I and back, and a satchel relic onto RELIC III, with the store reading each result.


Weapons and armor (A10-A18):

- **A10** The engine gives equipment one fight effect: `Equipment.effect?` holds a trigger or a condition and a payoff.
  Triggers: a card's DEAL, the first card DEAL each turn, the first GUARD each turn, a SACRIFICE, laying INFERNO,
  paying by discarding, a HEAL. Conditions (each a +n to a card's DEAL while it holds): the foe has any weather, your
  GUARD holds, the foe is above half VITAE. Payoffs: HEAL n, GUARD n, Conviction n, +n to the DEAL, draw n. A worn
  weapon's and armor's effects apply in every fight, on both the program path and the grey cards' path, and only
  while worn; a card's DEAL is a card line's (RADIANCE and the MERCY burst included), never a Global's, TETHER's,
  THORNS' or REFLECT's. Each firing emits an `equipment-fired` event naming the piece. An engine test per trigger and
  per condition, plus one proving a Global's and TETHER's DEAL fire nothing.
- **A11** The ten pieces exist: `Items/equipment.library.ts` holds the slate's ten (below), slot weapon or armor, with
  the effect and the names in "The names" (Confirmed by T, 2026-11-01), no `statModifiers`, no `laneId`, no `grantsSignature`. A
  content test pins each piece's effect and fails if any weapon or armor in the library carries a stat line, a lane or
  a signature.
- **A12** Every new run starts wearing the grey weapon and armor, for every roster character; a save made before this
  phase loads with its slots as they were (nothing granted).
- **A13** The lane pieces drop from elites, quests and loot caches: the elite drop can hand a lane piece the player does
  not carry, and **befriending an elite always hands one** (100%); the Breakwater quests' rewards alternate in chain
  order, relic then weapon or armor (Confirmed by T, 2026-11-01; an equipment step pays the lane of the relic before it,
  weapon first); a loot cache's item bundle can hold a lane piece; every chance comes from one `[content]` table
  `EQUIPMENT_DROP_TUNING` (25% elite, 33% cache, 100% befriended elite; Confirmed by T, 2026-11-01). A test per source with a
  seeded roll, one for a befriended elite, and one walking the chain's reward order.
- **A14** The village sells weapons and armor: the village's shop counter stocks lane pieces the player does not carry
  (count and prices from `EQUIPMENT_DROP_TUNING`) and `buyVillageEquipment` pays shillings and grants the piece
  unworn; a test buys one and refuses one the purse cannot pay (Confirmed by T, 2026-11-01).
- **A15** Every surface says what a piece does: the satchel row, the dock row (in place of "grants ..." for a weapon or
  armor) and the detail card show the effect line in Dawncaster-terse words from one presenter; in a fight each
  `equipment-fired` event shows on the board (the piece's glyph pulses by the signature column and the log reads it);
  a presenter test per effect kind and a board test for the fired pulse.
- **A16** The sims can wear gear: `measuredTruthCells` takes a worn loadout, and the report gains a "grey even, grey
  pair worn" column; the regenerated `docs/reports/measured/latest.md` carries it with its commit stamp.
- **A17** A worn armor changes one die's faces for the fight, on top of the character's die gear: a miss becomes a mana
  face, or a mana face becomes a special; a die with no face of that kind left gains nothing. The fight's
  `activeDieGear` reads the change; an engine test per armor rolls the changed table, and one stacks it on a fully
  honed die.
- **A18** A worn weapon sets what a special does when used: one payload (+n Conviction, DEAL n, HEAL n, GUARD n,
  INFERNO n on the foe, VULNERABLE for n turns), replacing `specialConviction`. The grey sword's special is +2
  Conviction, so a new run plays as today. With no weapon worn a special only powers its card (Confirmed by T, 2026-11-01). An
  engine test per payload, and one with no weapon worn.

Icons (A19-A20):

- **A19** The icons are cut from T's sheets: `scripts/slice-item-sheet.mjs` cuts a sheet by blob (each opaque blob goes
  to the cell holding its centroid), so no icon carries a sliver of a neighbour; it writes the 23 icons of "The icons"
  as 256 px transparent PNGs named by item id, with a provenance file. A script test proves a sliver crossing a grid line
  lands in its own cell.
- **A20** Every item draws its picture: `ITEM_SPRITES` holds the 23 ids of "The icons" (the ten pieces' ids included,
  ahead of 136.6); `ItemGlyph` draws the sprite for any of them on every surface and today's glyph for any other item. A
  test fails if a relic or consumable in the libraries, or (once 136.6 lands) a weapon or armor, has no sprite.

## Open questions

- The dock: none (T answered both in the session, 2026-10-31).
- The gear: none (T answered calls 1-5 on PR #1268, 2026-11-01).

## Chunks

Measure: 20 open · 0 closed · next A21

- [ ] **136.1** Relics keep their place, in the engine · M · closes A1, A2, A3 · needs — · alias: EQ3a
- [ ] **136.2** Every dock row taps, the picked row changes, the bust breathes · M · closes A4, A5, A6 · needs 136.1 · alias: EQ3b
- [ ] **136.3** Drag and drop on all five slots · L · closes A7, A8, A9 · needs 136.2 · alias: EQ3c
- [ ] **136.4** Equipment effects in the engine · L · closes A10 · needs — · alias: EQ3d
- [ ] **136.5** Dice effects in the engine · M · closes A17, A18 · needs 136.4 · alias: EQ3e
- [ ] **136.6** The ten pieces, and the grey pair worn from the start · M · closes A11, A12 · needs 136.4, 136.5 · alias: EQ3f
- [ ] **136.7** Every surface says what a piece does · M · closes A15 · needs 136.2, 136.6 · alias: EQ3g
- [ ] **136.8** Lane pieces drop from elites, quests and caches · M · closes A13 · needs 136.6 · alias: EQ3h
- [ ] **136.9** The village sells weapons and armor · M · closes A14 · needs 136.6 · alias: EQ3i
- [ ] **136.10** The sims wear gear; the report shows the grey pair · M · closes A16 · needs 136.6 · alias: EQ3j
- [ ] **136.11** Every item draws its picture from T's sheets · M · closes A19, A20 · needs — · alias: EQ3k
