# Phase EQ1 — What you wear is what you fight with

## Sources

- `/plot` from T, 2026-10-24 (attended), with two phone screenshots: the satchel's Gear & Girding showing the
  Suppliant's Ring and the Bleeding Signet both WORN, and a Float-Eye fight whose signature column holds only The
  Open Hand, greyed, at 5 Conviction. T's three fixes: "There's no way to unequip/equip relics"; "In combat, I
  can't trigger the sigSkill in combat"; "I don't see all the sigSkills available (The blood relic sigskill is
  missing)". T chose one phase over three items.
- The relic model: a relic is an `Equipment` granting one signature while worn (`Items/relic.library.ts`); up to
  three accessories (`SLOT_CAPACITY.accessory`); combat's signatures are `getSignaturesForLoadout(player.equipment)`
  taken once at `initializeCombatEncounter` (`Combat/combat.engine.ts:248`).
- D71 and D100 (relics equipped decide the reward lanes): they read the worn loadout too, so a loadout that
  disagrees with the dock is wrong there as well.
- Code read while shaping this:
  - Two models of "worn". The satchel's WORN badge, the dock, the item modal and both equip actions read the
    inventory-order convention `wornPerSlot(inventory)` (`Items/equipped.ts:26`: the first `SLOT_CAPACITY[slot]`
    equipment items per slot are worn). Combat, the stat fold and the reward lanes read `player.equipment`. The
    two are kept in step by hand (`equipItemAction`'s "shown worn but missing from the engine loadout" branch,
    `wearWornWindow` for the dev menu), and nothing proves they agree.
  - Why no unequip: `inventory.modal.engine.ts:209-257` sets mode `view` ("WORN", no action) for a worn item
    whose slot has no more peers than capacity, and `unequipItemAction` (`state/actions.ts:973`) returns without
    doing anything when `slotPeerCount <= SLOT_CAPACITY[slot]`. With two relics and three accessory positions both
    relics read WORN forever. The comment says it plainly: "the inventory convention can't express 'wearing fewer
    than are carried'".
  - The Gear & Girding tap opens `EquipmentDetailModal`, whose only prop is `onClose`: no equip or unequip.
  - Why the rune can't fire: the column's one rune is The Open Hand, and `signatureCastBlock` refuses it because
    Float-Eye has no `friendshipReward` (`Enemy/befriend.ts`: "Float-Eye and the Death Beholder no"). The cast
    path itself (`CombatEncounterPanel.tsx:546` → `playSignatureSkill`) works; the rune that would have fired,
    Crimson Covenant, was not on the bar. The refusal reason reaches only the a11y label and the tap-info popup.

## Outcome

`player.equipment` is the one record of what is worn: the satchel, dock and modals show it, any relic can be
equipped or taken off from where it is shown, and the fight's signature column carries exactly the worn relics'
signatures, each telling the player on its face why it cannot fire.

## Acceptance

- **A1** Every mobile surface that says an item is worn (the satchel row's WORN badge, the dock, the item modal's
  mode and labels, the equip-delta panel, the item-reward EQUIP path) reads `player.equipment`, not
  `wornPerSlot(inventory)`. A mobile test fails if `wornPerSlot` or `isEquippedFirstOfSlot` is imported under
  `axiomancer-mobile/state` or `axiomancer-mobile/app` outside tests.
- **A2** A worn relic's item modal and its Gear & Girding detail modal both offer UNEQUIP; an unworn relic's offer
  EQUIP while an accessory position is free, and "EQUIP · REPLACE <name>" (taking off the last-worn accessory) when
  all three are taken. UNEQUIP leaves the position empty: wearing fewer relics than are carried is legal, and
  wearing none is legal (combat begins with zero signatures, `getSignaturesForLoadout`).
- **A3** `equipItemAction` and `unequipItemAction` change `player.equipment` through the engine's `equipItem` /
  `unequipItem` (stat lines fold and unfold, the Signet's +20 max VITAE with it) and never reorder the inventory to
  express worn state. Equip then unequip of the Signet returns `maxHealth` and the loadout to their starting values.
- **A4** A store-level test: with the Ring and the Signet both worn, starting a fight from the real
  `combat-encounter` route's `bootstrapPlayer` puts `sig-disarming-plea` and `sig-crimson-covenant` in
  `state.signatures`; take the Signet off and the next fight carries only the Ring's. Granted relics
  (`grantAllRelics`, the first-node grant, an item-reward EQUIP) arrive worn in `player.equipment`, and an
  item-reward CONFIRM (satchel only) arrives unworn and shows unworn.
- **A5** A save loaded with a relic the old dock showed WORN but `player.equipment` lacks shows it unworn, with
  EQUIP offered. No migration rewrites the loadout: the loadout already is what combat used.
- **A6** A rune that cannot fire shows its reason on the column, not only in its a11y label: an unaffordable rune
  reads "◆n" as now; a rune refused for any other reason (`signatureCastBlock`: "Float-Eye will not be befriended",
  "not yet low enough to spare", "already counts twice") is marked with a distinct refused state, and a tap opens
  the info popup with the reason first. A board test covers both states.

Measure: on a preview build, T wears the Ring and the Signet, starts a fight against Float-Eye and casts Crimson
Covenant from the column; takes the Signet off in the satchel and the next fight's column holds only The Open Hand,
which reads why it will not fire.

## Phases

### EQ1a — The loadout is the truth, and relics come off · L · closes A1, A2, A3, A4, A5 · requires nothing
Measure: `npm run verify -w axiomancer-mobile`; the A1 import test, the A2-A5 store tests pass.
- Scope: `axiomancer-mobile/state/presenters/inventory.engine.ts`, `inventory.modal.engine.ts`,
  `character.engine.ts`; `state/actions.ts` (`equipItemAction`, `unequipItemAction`, `wearWornWindow` goes);
  `state/item-reward/store-actions.ts`; `components/inventory/EquipmentDetailModal.tsx` (gains `onEquip` /
  `onUnequip` and the button) and `app/(tabs)/inventory/index.tsx` wiring.
- Consumers: the satchel, dock, item modal, detail modal, item-reward gate, dev menu GET ALL RELICS.
- Save / schema: none. `player.equipment` and `player.inventory` keep their shapes; inventory order stops meaning
  anything.
- Tests: rewrite `state/e2e/inventory.engine.test.ts`, `inventory.modal.engine.test.ts`,
  `item-reward.engine.test.ts`, `dev-presets.engine.test.ts` and
  `app/(tabs)/inventory/__tests__/satchel-first-node-relic.test.ts` where they assert the order convention; add the
  A1 import test and the A3-A5 cases.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run verify -w axiomancer-mechanics` (untouched, but the
  e2e combat entry is exercised).

### EQ1b — The refused rune says why · S · closes A6 · requires EQ1a
Measure: the A6 board test passes, and the Float-Eye fight's Open Hand rune reads refused, not merely dim.
- Scope: `components/combat/encounter/CombatBoard.tsx` (`SignatureColumn`); `state/presenters/combat-encounter.engine.ts`
  (`signaturesVM` splits `reason` into short-of-Conviction vs refused).
- Consumers: the combat board only.
- Save / schema: none.
- Tests: a `CombatBoard` signature-column test for the affordable, unaffordable and refused states.
- Verify gate: `npm run verify -w axiomancer-mobile`; `CombatBoard.sig-column.test.tsx` still passes (column height).

## Scope

- `axiomancer-mobile` only. `axiomancer-mechanics` keeps `wornPerSlot` (the CLI, `first-node-grant.ts` and
  `item-grant.ts` use it); no engine rule changes.

## Consumers to update

- The satchel and its modals, the item-reward gate, the dev menu's relic grant, the combat signature column.

## Save / schema contracts

- None (A5). No `game.migrate.ts` hop.

## Decisions made upfront — DO NOT ASK

- **`player.equipment` is the truth** because it is what combat, the stat fold and the D71/D100 reward lanes
  already read; the inventory-order convention was the mobile's display shortcut and is the one that cannot
  express the state T asked for.
- **Unequip to empty is allowed.** No decision forbids it; the "no unequip to bare" note lives only in a presenter
  comment. A character may carry relics it does not wear.
- **Signatures stay taken once, at the fight's start.** The combat route is full-screen with no satchel, so a
  loadout cannot change mid-fight; re-reading it per turn would buy nothing.
- **A loaded save is not rewritten** (A5). Showing the real loadout is the fix; silently wearing what the old dock
  claimed would change a stat line the player never chose.
- **The Open Hand still shows against a foe that can never be befriended**, marked refused (A6), rather than
  hidden: the column tells the player what they wear.

## Tests matrix

- Added: the A1 import guard; A3 equip/unequip round trip (Signet, `maxHealth`); A4 grant paths and the
  route-to-`state.signatures` check; A5 loaded-save case; A6 signature-column states.
- Rewritten: the satchel, modal, item-reward and dev-preset suites that assert inventory order as worn state.

## Verify gate

`npm run verify -w axiomancer-mobile`; `npm run verify -w axiomancer-mechanics`; the root `npm test`.

## Commit body template

```
Phase EQ1<a|b> — <title>

Closes <ids> of plan/phases/phase_EQ1_relic_loadout.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1-A6 ticked across EQ1a and EQ1b; the Measure met on a preview build.

## Follow-ups (out of scope)

- A source for the Bleeding Signet (shop, loot or reward): still only the dev menu's GET ALL RELICS.
- Retiring `wornPerSlot` in the engine too, once nothing outside the CLI and the grants reads it.
- The slot banner's "choose a slot to see what else fits" filter, if it should list unworn relics differently.
