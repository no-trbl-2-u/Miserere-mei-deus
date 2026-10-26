# Phase EQ2 — Three kinds of slot: Weapon, Armor, and three Relic slots

## Sources

- `/plot` from T, 2026-10-25 (in session; plot run unattended, T not present to answer). T, verbatim: "There are
  only 3 types of slots: Weapon (top), Armor (2nd from top), 3x relics. Relics can be named anything, but
  ultimately they all take up the same 3 relic slots." Recorded as **D105**
  (`plan/2026-09-25-refactor-strategy.decisions.md`).
- Decisions it rests on: D47 (relics grant signature skills), D71 and D100 (equipped relics decide the reward
  lanes; D100's table counts up to five), D104 (worn relics count the lane slots), D72 (the equipment plumbing
  stays), D88 (relics are content; T is asking now). EQ1 (`plan/phases/phase_EQ1_relic_loadout.md`, shipped
  #862/#866): `player.equipment` is the one record of what is worn.
- The part plan: `plan/revamp/relics.md` (B1). Its D100 line says "all 5 relic slots give 3"; D105 says there are
  three relic slots. Call 3 below settles what that row means now.
- Code read while shaping this (what is already built, already planned, new):
  - **Already built — the five worn positions.** `EquipmentLoadout` is `{ weapon, armor, accessories }`
    (`axiomancer-mechanics/src/Character/types.ts:12`); `SLOT_CAPACITY` is `{ weapon: 1, armor: 1, accessory: 3 }`
    (`Items/types.ts:55`). `equipItem` / `unequipItem` (`Character/equipment.reducer.ts`) fill the first free
    accessory position, swap on `replaceIndex` when full, and compact on unequip: positions have no identity.
  - **Already built — the order on screen.** The satchel's WORN UPON THE BODY dock
    (`axiomancer-mobile/state/presenters/inventory.engine.ts:519-530`, `components/inventory/EquipmentDock.tsx`)
    and the SELF screen's gear rows (`state/presenters/character.engine.ts:225-235`) both list weapon, armor, then
    the three accessory positions. The order T asks for is already the order; the words are not.
  - **Already built, wrong words.** Every surface calls the third slot **Trinket**: the dock's TRINKET I/II/III
    (`inventory.engine.ts:280-287`), the satchel row sub and detail slot label "Trinket"
    (`inventory.engine.ts:263-268`, `equipment-detail.engine.ts:142-147`, `character.engine.ts:173-175`),
    `ItemCard.tsx:55-66` (icon chosen by sub `'Trinket' | 'Accessory'`, a11y label "Accessory equipment icon"),
    `CombatVictoryPanel.tsx:229` (glyph for `'accessory' | 'trinket'`).
  - **New — the kind has no rule but still exists.** `AccessoryKind` (`head | hands | feet | amulet | ring |
    charm`, `Items/types.ts:47`) and `Equipment.accessoryKind` are flavour only: no reducer, combat path or mobile
    surface reads them (mobile mentions them only in three tests). They are still a closed union a new relic must
    register in (CRITIQUE Pending "[LOW] general — AccessoryKind union must open when accessory flavors grow").
    Readers: `CLI/game.cli.ts:603`, `Game/legacy-slots.ts:26-67` (the v11 re-slot), `Game/fixtures/fixture-content.ts:108`,
    `Items/relic.library.ts:34,50` (both relics are `accessory` / `ring`).
  - **Weapons and armor as items: none exist.** The v13 → v14 hop purged non-relic equipment and v34 → v35 dropped
    every relic but the Suppliant's Ring; `relicLibrary` holds two accessory relics. The weapon and armor rows are
    always bare today. Weapon and armor relics were an open question (EQ1 Follow-ups, RW1 Follow-ups: "whether five
    relics can be worn", left to B1). D105 answers the count: three relics.
  - **Relic identity** is `grantsSignature !== undefined` plus the `relic-` id prefix (`Items/relic.library.ts:6`).
    RW1a (open) adds `Equipment.laneId?`; LR1 (PR #922, open) adds six lane relics named rings, brooches, a belt and
    a circlet.
  - **Save.** Current save version 38 (`Game/game.migrate.ts:981`). Saved equipment carries `slot: 'accessory'` and
    `accessoryKind`; the loadout carries `accessories`. Equipment can sit in the save in the inventory, the loadout
    and inline quest rewards (`World/types.ts:21`, `{ kind: 'item'; item: Item }`). The mobile item-reward queue
    (`state/item-reward/store-actions.ts`) holds equipment while a hand-over is pending.
  - Footprint of the rename: about 35 files read `.accessories`, about 40 the `'accessory'` slot literal, 12
    `accessoryIndex`, 15 `accessoryKind`, across both workspaces (most of them tests).

## Outcome

A character wears one weapon, one armor and three relics; any relic, whatever it is called, fits any of the three
relic slots, and every screen lists them Weapon, Armor, Relic I, Relic II, Relic III with no other slot name.

## Acceptance

- **A1** The engine's slot model is three kinds: `EquipmentSlot` is `'weapon' | 'armor' | 'relic'`, `SLOT_CAPACITY`
  is `{ weapon: 1, armor: 1, relic: 3 }`, and `EquipmentLoadout` is `{ weapon, armor, relics }`. `AccessoryKind`
  and `Equipment.accessoryKind` no longer exist. A mechanics test fails if `accessoryKind`, `AccessoryKind`,
  `accessories` or the `'accessory'` slot literal appears under `axiomancer-mechanics/src` or `axiomancer-mobile`
  (outside `__tests__`, `*.test.*` and `node_modules`) anywhere but `Game/game.migrate.ts` and
  `Game/legacy-slots.ts`.
- **A2** Any relic fits any relic slot: an engine test equips three fixture relics with different names and no
  kind (a ring, a brooch, a circlet) in all six orders and each lands in the first free relic position; a fourth
  equip without `replaceIndex` is the guarded no-op, with `replaceIndex` 0-2 it swaps that position; unequip
  compacts. Equip and unequip semantics are otherwise unchanged (the stat fold, signatures read from the worn
  relics).
- **A3** Each piece has exactly one slot kind, and only relics grant signatures and lanes
  `[T to confirm #1]` `[T to confirm #2]`: a content test fails if any library equipment with `grantsSignature`
  (or `laneId`, once RW1a adds it) has a slot other than `'relic'`; an engine test equips a fixture weapon and a
  fixture armor and sees the relic positions untouched, and `getSignaturesForLoadout` reads only `relics`.
- **A4** Old saves load: a `v38 → v39` hop renames `player.equipment.accessories` to `relics`, rewrites every
  equipment object anywhere in the save (`category: 'equipment'`, found by a deep walk, so the inventory, the
  loadout and inline quest rewards are all covered) from `slot: 'accessory'` to `'relic'`, and deletes
  `accessoryKind`. An engine test loads a v38 fixture (a worn ring with `accessoryKind: 'ring'`, a carried relic,
  a quest reward relic) and sees the same pieces worn and carried, the same `maxHealth`, the same signatures for
  the next fight, and no `accessoryKind` or `accessory` left in the JSON. `LEGACY_SLOT_MAP` maps the v11 slots
  `head`, `hands`, `feet` and `accessory` to `relic`, and a v11 save still chains to the current version.
- **A5** The mobile app runs on the new contract with nothing on screen changed by EQ2a: the store, presenters,
  actions, dev tools and their tests read `relics` and `relicIndex`; the item-reward queue reads a pending piece
  saved with `slot: 'accessory'` as a relic through the engine's exported re-slot helper (the same one the hop
  uses), proved by a store test; `npm run verify -w axiomancer-mobile` is green.
- **A6** The engine's docs say the same: `docs/game-model.md`, `axiomancer-mechanics/docs/equipment.md` and
  `axiomancer-mechanics/docs/LEXICON.md` describe one weapon, one armor and three relic slots, and name no
  accessory kind.
- **A7** Every screen names the slots Weapon, Armor, Relic: the dock's rows read WEAPON, ARMOR, RELIC I, RELIC II,
  RELIC III top to bottom; the SELF screen's gear rows read Weapon, Armor, Relic, Relic, Relic in that order; a
  relic's satchel row sub and its detail slot label read "Relic"; the item card's icon is chosen by the slot kind,
  not the label, and its a11y label reads "Relic equipment icon"; the victory panel's glyph keys on `'relic'`. A
  mobile test fails if "Trinket" or "Accessory" appears in any player-visible string under
  `axiomancer-mobile/state/presenters`, `components` or `app` outside tests.
- **A8** One order, one source: a single exported `LOADOUT_ROWS` (weapon, armor, relic 0, relic 1, relic 2, with
  their labels) in `state/presenters/loadout.ts` is what the dock and the SELF screen map over; a presenter test
  builds both view models from one player and asserts the same five keys and labels in the same order, with an
  empty weapon and armor still shown as bare rows above the relics.

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile` green; the v38
fixture save loads with its relics worn in `relics`; the satchel dock on the web build reads WEAPON, ARMOR, RELIC
I, RELIC II, RELIC III.

## Phases

### EQ2a — The relic slot in the engine, and old saves carried over · L · closes A1, A2, A3, A4, A5, A6 · requires nothing

Measure: `npm run verify -w axiomancer-mechanics` (the new loadout, content, legacy-identifier and v38-save tests
pass) and `npm run verify -w axiomancer-mobile` green with no player-visible string changed.

- Scope: `axiomancer-mechanics/src/Items/types.ts` (slot union, `SLOT_CAPACITY`, `Equipment` loses
  `accessoryKind`, `AccessoryKind` deleted), `Character/types.ts` (`relics`, `emptyLoadout`),
  `Character/equipment.reducer.ts`, `Items/equipped.ts`, `Items/relic.library.ts` (both relics `slot: 'relic'`,
  no kind), `Character/first-node-grant.ts` (whatever of it SG1 leaves), `Game/legacy-slots.ts`,
  `Game/game.migrate.ts` (the hop and the header list), `Game/fixtures/fixture-content.ts`, `CLI/game.cli.ts`
  (prints Relic 1-3), the barrel exports; in `axiomancer-mobile` the mechanical rename only (`state/actions.ts`,
  `state/presenters/*`, `state/item-reward/store-actions.ts`, `state/labyrinth/store-actions.ts`,
  `state/dev/inspector.ts`, `app/item-reward/index.tsx`, the dock and slot components' keys and testIDs from
  `accessory-<i>` to `relic-<i>`) with every label string left as it is; the dev seed's "one relic per slot kind"
  loop seeds the relic slot only. Docs for A6.
- Consumers: everything that typechecks against `EquipmentLoadout`, `EquipmentSlot` or `SLOT_CAPACITY`; the
  catalog and devlog exporters if the typecheck names them; RW1a's `laneId` resolver if it has landed (it reads
  `relics`).
- Save / schema: the `v38 → v39` hop of A4 (or the next free version if another phase has taken 39 by then) and
  the exported re-slot helper; tolerant read of the mobile item-reward queue (A5).
- Tests matrix: `Character/e2e/equipment-loadout.engine.test.ts`, `equip-delta.engine.test.ts`,
  `Items/e2e/equipment.engine.test.ts`, `worn-per-slot.engine.test.ts`, `item-grant.engine.test.ts` rewritten
  to `relic`; new `Items/e2e/relic-slot.engine.test.ts` (A2, A3); `Game/e2e/legacy-slots-migration.engine.test.ts`
  rewritten (head/hands/feet/accessory → relic); new `Game/e2e/v39-relic-slot-migration.engine.test.ts` (A4); a
  new legacy-identifier guard test (A1); mobile tests renamed (`loadout-truth`, `inventory*`, `item-reward*`,
  `EquipmentDock*`, `EquipmentSlot`, the three that fixture `accessoryKind`) plus the item-reward queue store
  test (A5).
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`.

### EQ2b — Every screen says Weapon, Armor, Relic · M · closes A7, A8 · requires EQ2a

Measure: the presenter order test and the player-visible-string test pass; the web build's satchel dock reads
WEAPON, ARMOR, RELIC I, RELIC II, RELIC III.

- Scope: `axiomancer-mobile/state/presenters/loadout.ts` (`LOADOUT_ROWS`), `inventory.engine.ts` (dock rows map
  `LOADOUT_ROWS`; `SLOT_LABELS` and `DOCK_SLOT_TITLE` read Relic / RELIC), `character.engine.ts` (gear rows map
  `LOADOUT_ROWS`), `equipment-detail.engine.ts`, `tooltip.engine.ts` if it names a slot,
  `components/inventory/ItemCard.tsx` (icon by slot kind, a11y label),
  `components/event/aftermath/CombatVictoryPanel.tsx` (glyph key), any toast or refusal copy that names the
  accessory row ("relic slots full"). No engine change.
- Consumers: the satchel, the SELF screen, the item detail modal, the item-reward screen, the victory panel.
- Save / schema: none.
- Tests matrix: new `state/presenters/__tests__/loadout-rows.test.ts` (A8); new
  `state/presenters/__tests__/slot-words.test.ts` (A7, the string guard); `EquipmentDock*.test.tsx`,
  `ItemCard.test.tsx`, `EquipmentDetailModal.test.tsx`, `inventory-gear-*.S3-sheet-C22.test.ts`,
  `CombatVictoryPanel.test.tsx` updated to the new words.
- Verify gate: `npm run verify -w axiomancer-mobile`.

## Scope

Both workspaces in EQ2a (engine contract, migration, mechanical mobile rename); the mobile presenters and two
components in EQ2b. No card, signature, relic content or reward rule changes.

## Consumers to update

Listed per phase. Cross-plot overlaps, neither of which requires the other:

- **LR1 (PR #922).** LR1b's authoring sheet asks an "accessory kind" for each of the six lane relics and LR1c adds
  them to `relicLibrary`. Once EQ2a is on `main`, that column is flavour carried by the relic's name only and the
  entries take `slot: 'relic'`; if LR1c lands first, EQ2a re-slots its entries and strips their kinds like the
  existing two. LR1 does not depend on EQ2, and EQ2 does not depend on LR1.
- **SG1 (open).** SG1 deletes `STARTING_RELICS` and the first-node ring grant and makes every relic grant worn.
  EQ2a renames whatever of `first-node-grant.ts` and the grant paths is on `main` when it is built.
- **RW1a (open).** If RW1a lands first, its lane count reads `relics` after EQ2a; A3's content test covers
  `laneId` from then on.

## Save / schema contracts

- `EquipmentSlot`: `'accessory'` becomes `'relic'`. `EquipmentLoadout.accessories` becomes `relics`.
  `Equipment.accessoryKind` and `AccessoryKind` are removed.
- Migration: the `v38 → v39` hop in `Game/game.migrate.ts` (A4), with a deep walk over every
  `category: 'equipment'` object in the save; `LEGACY_SLOT_MAP` retargeted so the v11 chain lands on `relic`.
- The mobile item-reward queue reads old pieces through the same exported helper (A5).

## Decisions made upfront — DO NOT ASK

- **The slot is renamed, not only relabelled (D105).** T named the slot "relic"; keeping `'accessory'` in the
  engine under a "Relic" label would leave two names for one thing, the drift CRITIQUE flagged for the kind union.
  The contract and its migration are one phase, first (`skills/plot.md` Step 3: a contract later pieces build on is
  its own phase), and EQ2a changes no word on screen so it can be checked against today's UI tests.
- **The accessory kind is deleted, not kept as flavour (D105: "Relics can be named anything").** A relic's flavour
  is its name and description; no rule ever read the kind, and a closed union is what stopped "anything". The CLI
  stops printing it. EQ2a's PR moves the CRITIQUE Pending item "AccessoryKind union must open when accessory
  flavors grow" to resolved.
- **Positions keep no identity.** "Relic I, II, III" number the worn relics in loadout order; unequip compacts as
  today (EQ1 behaviour kept). Ordering by slot number is display only.
- **A piece has exactly one slot kind; a weapon or armor never fills a relic slot, and a relic never fills the
  weapon or armor slot** `[T to confirm #1]`. Why: T lists three types of slot, and only relics "take up the same
  3 relic slots". The type system already enforces it (`equipItem` routes by `item.slot`); A3 pins it.
- **Only relics grant signatures and lanes; weapon and armor carry neither** `[T to confirm #2]`. Why: D105 makes
  "relic" a slot, and D47 / D71 tie signatures and lanes to relics. No weapon or armor exists today, so nothing
  loses a signature; A3's content test keeps it so until T says otherwise.
- **D100's "all five of a lane" row is left alone here** `[T to confirm #3]`. With three relic slots and call 2's
  default, the most a player can wear of one lane is three, which already gives two lane cards; the five-relic row
  becomes unreachable, as RW1 already noted. Whether three of a lane should now give all three lane cards is a
  reward rule (RW1a's slot function, D100), not a slot change, so EQ2 does not touch it; the answer, if T gives
  one, amends D100 and RW1a's row.
- **Weapon and armor rows stay on screen when empty.** T put them at the top; the bare row is the dock's existing
  empty state.
- **Labels: WEAPON, ARMOR, RELIC I, RELIC II, RELIC III** in the dock's capitals and numerals (the TRINKET I/II/III
  style it replaces); "Weapon", "Armor", "Relic" in sentence case where a single slot name is shown.
- **No weapon or armor content.** Making the top two slots hold anything is content (D88) for B1 or a later plot.
- **Slot: anytime (no word from T).** EQ2 fixes no live defect and blocks no open row: LR1, SG1 and RW1a each work
  with either slot name. It goes after the last open row.

## Tests matrix

Listed per phase. Deleted: nothing; the `accessory`-named suites are renamed and rewritten, not dropped.

## Verify gate

`npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile` for EQ2a; the mobile gate for
EQ2b. Foreground, never `--no-verify`.

## Commit body template

```
EQ2a: the relic slot in the engine, and old saves carried over

EquipmentSlot is weapon | armor | relic, SLOT_CAPACITY.relic is 3,
the loadout holds relics, and AccessoryKind is gone (D105). The
v38 -> v39 hop re-slots every saved piece and renames the loadout
field. Mobile renamed mechanically; no word on screen changes.

Closes A1-A6 of plan/phases/phase_EQ2_equipment_slots.md.
```

(EQ2b: "every screen says Weapon, Armor, Relic", closes A7, A8.)

## DoD

A1-A8 ticked across EQ2a and EQ2b; the Measure met.

## Follow-ups (out of scope)

- `plan/revamp/relics.md` (B1) still says "all 5 relic slots give 3" (D100 bullet): amended by B1, or by the
  answer to call 3, not here (PR #922 edits the same file).
- Weapon and armor content: none exists; their rows are bare until B1 or a later plot authors some.
- Whether a weapon or armor could ever grant a signature or open a lane (call 2's alternative) would reopen D100's
  five-relic row; a new `/plot` if T wants it.
- Retiring `wornPerSlot` in the engine (EQ1 Follow-ups): EQ2a renames it with the rest; retiring it stays open.
