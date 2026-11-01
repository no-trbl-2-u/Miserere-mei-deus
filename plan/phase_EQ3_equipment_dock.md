# Phase EQ3 — The equipment dock: every slot works, relics keep their place, drag and drop

## Sources

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

## Outcome

On the satchel screen every one of the five slots can be filled, swapped and emptied, by tap or by drag, and a relic
stays in the slot the player put it in; the bust has room beside a narrower slot column.

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
  before EQ3a loads at the same `GAME_STATE_VERSION` with its relics at positions 0..n-1 and the same signatures and
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

Measure: on the web export, with two relics worn, taking off RELIC I leaves RELIC II where it is, a satchel relic
dragged onto RELIC I is worn there, and the slot column is at most 55% of the dock at 360 pt; both workspace verify
gates green.

## Phases

### EQ3a — Relics keep their place, in the engine · M · closes A1, A2, A3 · requires nothing

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

### EQ3b — Every row taps, the picked row changes, the bust breathes · M · closes A4, A5, A6 · requires EQ3a

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

### EQ3c — Drag and drop on all five slots · L · closes A7, A8, A9 · requires EQ3b

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

## Scope

The engine's relic loadout and its readers (EQ3a); the satchel screen, its dock, modal and presenters (EQ3b, EQ3c).
No relic, weapon or armor content; no signature, lane or reward rule changes; the SELF screen's gear list is only
made hole-safe.

## Consumers to update

Listed per phase. Overlaps: RW1/LR1 lane readers read `relics` (made null-safe in EQ3a); SB1 (set bonuses, attended)
will count worn relics and must skip holes. CD1b and MC1 touch other screens.

## Save / schema contracts

- `EquipmentLoadout.relics`: `Equipment[]` (packed, up to 3) becomes `(Equipment | null)[]` (three positions). No
  version bump; old packed saves load as-is (A3).
- New engine export `moveRelic`; `equipItem` gains `position`; `displacedBy` gains `position`.

## Decisions made upfront — DO NOT ASK

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

## Tests matrix

Listed per phase. Deleted: nothing; EQ2's "unequip compacts" assertion is rewritten, not dropped.

## Verify gate

Both workspace gates for EQ3a; the mobile gate for EQ3b and EQ3c. Foreground, never `--no-verify`.

## Commit body template

```
EQ3a: relics keep their place, in the engine

The relic loadout is three positions, each a piece or null.
equipItem takes a position, unequipItem leaves a hole, moveRelic
moves or swaps; every reader skips holes. Packed saves load
unchanged at the same version.

Closes A1-A3 of plan/phases/phase_EQ3_equipment_dock.md.
```

(EQ3b: "every row taps, the picked row changes, the bust breathes", closes A4-A6. EQ3c: "drag and drop on all five
slots", closes A7-A9.)

## DoD

A1-A9 ticked across EQ3a-EQ3c; the Measure met.

## Follow-ups (out of scope)

- Drag and drop on the SELF screen's gear list: not asked; a new `/plot` if T wants it.
- Weapon and armor content: still none (EQ2 Follow-ups); the rows stay bare until T's Chapter 1 weapons and armor
  plot.
