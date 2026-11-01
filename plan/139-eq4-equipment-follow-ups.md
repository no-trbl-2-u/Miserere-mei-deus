# 139 — Equipment follow-ups: the Blacksmith's dead +3 upgrade retired, and the gear card without its repeat

> The Blacksmith no longer sells a "+3 Conviction on a die special" upgrade that pays nothing, its copy says a BOON fires your weapon's special, and a weapon's or armor's detail card shows its EFFECT once instead of twice. The deadline plan's Chapters 2-4 quest Item stops saying every quest pays a relic.

Plotted by T's pilot run on 2026-11-01 (`/plot anytime`), after spec 136 (equipment) merged in full. Every call below was
answered by T in the session, so nothing here waits on T.

## Why

### Sources

- Spec 136 chunk 136.5 (EQ3e) moved what a die special pays onto the worn weapon (`state.equipmentDice.special`). Its
  pending close recorded the footgun `rail-special-conviction-inert`: `UpgradeableDieGear.specialConviction` (the die
  gear rail, and the Blacksmith's `HEART_RICH_PAYLOAD_VARIANT`, "Sanguine Fitting (+3◆ payload)") no longer sets any
  payout. The Blacksmith still sells the +3 fitting, so a player can pay shillings for a change that pays nothing.
- Spec 136 chunk 136.7 (EQ3g) gave the gear detail card an EFFECT block. The card still prints the library
  `description` as a flavor line under it, which says the same thing again for a weapon or armor.
- Spec 136 chunk 136.8 (EQ3h) amended D114: Breakwater quest rewards alternate, a relic, then a weapon or armor. The
  deadline plan's Nov 25 Item for Chapters 2-4's quest lines still says "every quest pays a relic".
- Code read while shaping this (already built / new):
  - Built: `World/Blacksmith/blacksmith.content.ts` (`HEART_RICH_PAYLOAD_VARIANT`, `BLACKSMITH_WITNESS_VARIANTS`),
    read by `World/MapEvents/content.ts` (the village's `anvil.variants`), `DebugRewardTriggers.tsx`, and
    `chapter1-content.ts`; the swap verb itself (`blacksmith.engine.ts`, `swapVariant`) is generic and stays.
  - Built: `UpgradeableDieGear.specialConviction` (`Combat/combat.encounter.types.ts`), `DEFAULT_DIE_GEAR`
    (`Combat/combat.upgradeable-dice.ts`), the Blacksmith presenter's `specialConviction` row field
    (`state/presenters/blacksmith.engine.ts`), and the combat gear rail's `payload` / `specialConviction`
    (`state/presenters/combat-encounter.engine.ts`, `gearSlotVM`, which prints "+N ◆" from the inert field).
  - Built: the Blacksmith copy `INTRO_BODY` and `FACE_KEY` say a BOON "pays CONVICTION besides", which is no longer
    true; `specialFaceText` (`state/presenters/equipment-effect-line.ts`) is the wording for what the worn weapon's
    special pays.
  - Built: `selectEquipmentDetailViewModel` sets `flavor: item.description` (`state/presenters/equipment-detail.engine.ts`);
    `EquipmentDetailModal.tsx` prints the EFFECT block, then the flavor under everything.
  - Saves: only the current `GAME_STATE_VERSION` loads and a bump deletes every save, so no version bump. A save that
    already carries the +3 fitting on `Character.dieGear` holds an object with an extra `specialConviction` key; the
    engine never validates keys on load, so the key simply goes unread.

### Confirmed by T (2026-11-01)

1. **Retire the +3 upgrade.** Confirmed by T (2026-11-01): "Retire it". Since the worn weapon decides what a special
   pays, the upgrade and the rail's `specialConviction` change no payout; the Blacksmith stops offering the upgrade,
   its copy stops saying a BOON pays its own Conviction, and the inert field goes.
2. **Hide flavor when an effect shows.** Confirmed by T (2026-11-01): "Hide flavor when effect shows". A weapon's or
   armor's card shows its EFFECT block and no flavor line; a relic's card is unchanged.
3. **Reword the Nov 25 deadline Item.** Confirmed by T (2026-11-01): "Reword it". Chapters 2-4's quests alternate a
   relic, then a weapon or armor (D114 as amended by 136.8).

## Design

### The Blacksmith retires the +3 fitting (139.1)

- `BLACKSMITH_WITNESS_VARIANTS` becomes `[]` and `HEART_RICH_PAYLOAD_VARIANT` is deleted, with its export in
  `World/Blacksmith/index.ts` and `src/index.ts`. The village anvil (`MapEvents/content.ts`) and the debug trigger
  keep passing the (now empty) list; `anvil.variants` stays on the event payload type. The Blacksmith screen shows no
  swap section when there are no variants (the builder checks this and hides the section if it renders an empty one).
  The swap verb and its pricing (`ANVIL_VERB_PRICING.swap`) stay as engine machinery; their tests build a local
  fixture variant instead of the deleted constant.
- `UpgradeableDieGear.specialConviction` is removed from the type, from `DEFAULT_DIE_GEAR`, from the Blacksmith presenter's row (`BlacksmithDieVM.specialConviction`) and from the
  combat gear rail (`CombatDieGearSlotVM.specialConviction` and `payload`); `SPECIAL_CONVICTION_DEFAULT` stays, since
  the grey sword's special reads it (`Items/equipment.library.ts`). The rail's "upgraded from stock" test compares
  faces only, and its a11y line stops saying "Boon face grants +N ◆".
- Saves: the field is never read after this chunk, so an old save carrying it loads and plays the same. A test loads
  a save fixture whose `dieGear.heart` still has `specialConviction: 3` and asserts it loads and a special pays the
  worn weapon's amount.
- Copy: `INTRO_BODY` and `FACE_KEY` in `state/presenters/blacksmith.engine.ts` say a BOON "pays for a card and fires
  your weapon's special" (no Conviction promise of its own). Wording follows `specialFaceText`'s "weapon special"
  phrasing, and the line stays Dawncaster-terse.

### The gear card shows its effect once (139.2)

`selectEquipmentDetailViewModel` sets `flavor` to `''` when `effect` is not null, else to `item.description`. The modal
already prints no flavor line for `''`. A relic has no effect block, so its flavor line stays. The header comment of
`equipment-detail.engine.ts` says so.

### The deadline plan

`plan/deadlines.md`'s Nov 25 Item reads "every quest pays a relic, any lane relic not already paid by Chapter 1
(D114)". It becomes: quests alternate a relic, then a weapon or armor (D114 as amended by 136.8); a relic quest pays
a lane relic not already paid by Chapter 1. This plot edits it, and puts EQ4a and EQ4b in the `Waits on` of the Nov 16
MVP demo Item (the demo plays the Blacksmith and the gear card).

## Acceptance

- **A1** The Blacksmith offers no die-gear swap: `BLACKSMITH_WITNESS_VARIANTS` is `[]`, `HEART_RICH_PAYLOAD_VARIANT`
  no longer exists, and a village anvil visit shows no swap list. An engine test pins the empty list and the swap verb
  still works for a local fixture variant.
- **A2** `UpgradeableDieGear` has no `specialConviction`, and neither do the Blacksmith and combat-rail view models. A
  save whose `dieGear.heart` carries `specialConviction: 3` still loads, and a special pays the worn weapon's
  `special`, not 3. An engine test loads such a save and plays one special.
- **A3** The Blacksmith's intro and face key never say a BOON pays Conviction of its own: they say a BOON fires the
  worn weapon's special. A presenter test pins both strings.
- **A4** A weapon's or armor's detail card carries no flavor line (`vm.flavor === ''`, no `equip-detail-flavor`
  element), and a relic's card still shows its flavor. A presenter test and a component test pin both.

## Open questions

- None. T answered all three calls in the session (2026-11-01).

## Chunks

Measure: 4 open · 0 closed · next A5

- [ ] **139.1** Retire the Blacksmith's +3 upgrade and the inert die-gear payout · M · closes A1, A2, A3 · needs — · alias: EQ4a
- [ ] **139.2** The gear card shows its effect once · S · closes A4 · needs — · alias: EQ4b

### 139.1 (EQ4a) — Retire the Blacksmith's +3 upgrade and the inert die-gear payout · M · closes A1, A2, A3 · requires —

Measure: the A1-A3 engine and presenter tests pass; a dev-menu Blacksmith visit shows no swap offer and the new intro
and face key.

- Scope: `World/Blacksmith/blacksmith.content.ts`, `World/Blacksmith/index.ts`, `src/index.ts`,
  `Combat/combat.encounter.types.ts`, `Combat/combat.upgradeable-dice.ts`, `Combat/combat.upgradeable-economy.sim.ts`
  if it names the field, `state/presenters/blacksmith.engine.ts` (row field and the two copy strings),
  `state/presenters/combat-encounter.engine.ts` (`gearSlotVM`), `axiomancer-mobile/docs/dev-tools.md` (the
  `DebugBlacksmithButton` row names the constant), the tests that name the constant or the field (the die-gear,
  blacksmith, village-counter and momentum-stance tests).
- Consumers: the village anvil, the debug Blacksmith trigger, the combat gear rail, the Blacksmith screen.
- Save / schema: none; no version bump. An old save keeps its extra key unread.
- Tests matrix: `Blacksmith/e2e/blacksmith.engine.test.ts` (A1, with a local variant fixture),
  `Character/e2e/die-gear-reducer.engine.test.ts` and `Combat/e2e/die-gear-rail.engine.test.ts` (A2 and the save
  fixture), `state/presenters/__tests__/blacksmith.engine.test.ts` (A3).
- Verify gate: both workspaces.

### 139.2 (EQ4b) — The gear card shows its effect once · S · closes A4 · requires —

Measure: the A4 tests pass; the web export shows the grey sword's card with an EFFECT block and no italic line under
it.

- Scope: `state/presenters/equipment-detail.engine.ts` (`flavor`, header comment),
  `components/inventory/EquipmentDetailModal.tsx` only if its test needs a guard.
- Consumers: every surface that opens the gear card (satchel, dock, village equipment rows).
- Save / schema: none.
- Tests matrix: `state/presenters/__tests__/equipment-detail.engine.test.ts` (weapon, armor and relic), the modal's
  component test.
- Verify gate: the mobile workspace.
