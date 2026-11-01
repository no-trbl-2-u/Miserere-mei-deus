# Equipment — the worn-slot model

What a character wears and what wearing it does. The rules of play are in
[`docs/game-model.md`](../../docs/game-model.md); this page covers the
engine's equipment code.

## What Act 1 holds

The ten relics of [`src/Items/relic.library.ts`](../src/Items/relic.library.ts)
(the **Suppliant's Ring**, `relic-disarming-plea`, is the first: a relic whose
slot is `relic`, a ring by its name alone, no stat line, granting The Open Hand,
`sig-disarming-plea`), and the ten weapons and armor of
[`src/Items/equipment.library.ts`](../src/Items/equipment.library.ts) below.
Caches yield consumables (`src/Items/cache-reward.ts`).

## The weapons and armor

A weapon or armor has one fight effect and one dice effect and nothing else:
no `statModifiers`, no `laneId`, no `grantsSignature`. A lane piece covers where
its lane struggles; `EQUIPMENT_LANE` names that lane for the drop tables only
(a worn weapon or armor opens no card lane). `weaponLibrary`, `armorLibrary`
and `equipmentLibrary` (both) are exported from `@mechanics`; ids are
`weapon-*` and `armor-*`.

| Lane | Weapon | Armor |
|---|---|---|
| Grey | Opening Blade: your first DEAL each turn deals +2; special +2 Conviction | Bracing Coat: your first GUARD each turn gives +2; +1 hit on the gold die |
| Blood Price | Siphoning Blade: HEAL 3 on each card DEAL; special heals 4 | Bloodward Mail: each SACRIFICE gives GUARD 2; one hit on the red die becomes a special |
| Elementalist | Stormcaller Staff: DEALs +2 while the foe has weather; special lays INFERNO 2 on the foe | Flame Guard: +1 Conviction each time you lay INFERNO; +1 hit on the blue die |
| Defender | Bulwark Mace: DEALs +2 while your GUARD holds; special gives GUARD 6 | Scavenger's Coat: draw 1 each time you pay by discarding; +1 hit on the purple die |
| Merciful | Humbling Rod: DEALs +2 while the foe is above half VITAE; special lays VULNERABLE for a turn | Mending Vestments: each HEAL gives GUARD 2; one hit on the blue die becomes a special |

The fight effect is `Equipment.effect` (a trigger and a payoff, or a condition
and a DEAL bonus), run by `Combat/combat.equipment-effects.ts`; the dice half
is `effect.die` (armor) and `effect.special` (weapon). The numbers are tuned
later against the sims and play.

**The grey pair is worn from the start.** `createNewGameState` opens every roster
character wearing the Opening Blade and the Bracing Coat beside its starting
relic, and carries copies of both in the inventory as every worn piece is. With
no weapon worn a special only powers its card; the Opening Blade's special is the
+2 Conviction every special paid before a weapon set it. A save made before the
pair existed loads with its slots as they were: nothing is granted to it. The
pre-run shell (no character) wears nothing.

## The slots

A character wears up to five pieces across three slot kinds
(`SLOT_CAPACITY`, [`src/Items/types.ts`](../src/Items/types.ts)): one
`weapon`, one `armor` and three `relic` positions. A relic
can be named anything (a ring, a brooch, a circlet) and fits any of the three
relic positions; a piece has exactly one slot kind, so a weapon or armor never
fills a relic position. The worn set is `Character.equipment: EquipmentLoadout`
(`{ weapon, armor, relics }`, [`src/Character/types.ts`](../src/Character/types.ts));
`emptyLoadout()` is the empty one.

**Relics keep their place** (EQ3a; T, 2026-10-31, "Stay put"). `relics` is
positional: index 0, 1, 2 are RELIC I, II, III, and each holds a piece or
`null`. Taking a relic off leaves a hole and the others do not slide up. A
packed list shorter than three (a save written before EQ3a) is still valid: its
entries sit at positions 0..n-1 and the missing positions read as empty, so no
`GAME_STATE_VERSION` change was needed. Every reader of `relics` skips
`null` and tolerates a short list; `relicPositions(loadout)` is the padded
three-entry view and `getEquippedItems` never returns `null`.

## The `Equipment` shape

```ts
interface Equipment extends BaseItem {
    category: 'equipment';
    slot: 'weapon' | 'armor' | 'relic';
    statModifiers?: StatModifier[];     // only { stat: 'maxHp', value }
    grantsSignature?: SignatureSkillId; // the signature it grants while worn
}
```

A relic is an `Equipment` in the `relic` slot with `grantsSignature` set.
Only the relic slot grants signatures (and reward lanes); weapon and armor
carry neither.

## What wearing does

Equipment has two channels and no others: it applies no effects and rolls
no procs.

- **Max VITAE.** `wornMaxHpBonus(loadout)` sums the worn `maxHp` lines;
  equipping or unequipping folds the change onto `Character.maxHealth`,
  growing or clamping current `health` by the same amount. Stat allocation
  and level-up add it back when they rebuild `maxHealth`. The ring has no
  `maxHp` line, so today this is always 0.
- **Signatures.** Combat start sets `CombatEncounterState.signatures` from
  `getSignaturesForLoadout(loadout)` (the worn relics in position order,
  de-duplicated; the weapon and armor are not read). An empty loadout means no signature.

## Equipping

[`src/Character/equipment.reducer.ts`](../src/Character/equipment.reducer.ts),
all pure:

| Function | What it does |
|---|---|
| `equipItem(character, item, { position }?)` | Weapon and armor replace in place. A relic with a `position` (0-2) is worn there, replacing what is there; with none it fills the first empty position, and with all three full it returns the same character unchanged. `replaceIndex` is the older name for `position`. |
| `moveRelic(character, from, to)` | Moves the relic at `from` to `to`, swapping when `to` is full; `from === to` (or an empty `from`) returns the same character. |
| `unequipItem(character, slot, index?)` | Empties the slot (for a relic, the position at `index`, which becomes `null`; no other relic moves). A no-op on an empty slot. |
| `getEquippedItems(loadout)` | Every worn piece, weapon then armor then relics. |
| `wornMaxHpBonus(loadout)` | The summed worn `maxHp` bonus. |

[`src/Items/item-grant.ts`](../src/Items/item-grant.ts)'s `grantItem` adds
an item to the inventory and, with `{ equip: true }`, first moves any
displaced piece back to the inventory and then wears the new one, so a grant
never destroys a worn piece or hits the full-row no-op.

## Worn state in the inventory

Worn pieces also sit in `inventory`. The convention
([`src/Items/equipped.ts`](../src/Items/equipped.ts)) is order: the first
`SLOT_CAPACITY[slot]` equipment items of each slot are the worn ones.

| Helper | Purpose |
|---|---|
| `wornPerSlot(inventory)` | The worn items per slot. The canonical worn read. |
| `isEquippedFirstOfSlot(inventory, item)` | Whether `item` is inside its slot's worn window. |
| `findEquippedInSlot(inventory, candidate)` | The piece a candidate would displace when its slot is full, else `null`. |

## A fresh run

`createNewGameState()` starts the player with nothing worn and nothing
carried, and no relic is handed over at the first node. Pinned by
`src/Game/e2e/fresh-start.engine.test.ts`.

## Saves

[`src/Game/game.migrate.ts`](../src/Game/game.migrate.ts) upgrades older
saves to this shape; `LEGACY_SLOT_MAP`
([`src/Game/legacy-slots.ts`](../src/Game/legacy-slots.ts)) maps the old
seven slots (`head`, `body`, `hands`, `feet` and the rest) onto the three
slot kinds. Saves up to v38 named the relic slot `accessory`, gave each piece
an `accessoryKind` and stored the relic row as `accessories`; the v38 → v39
hop's `reslotRelicSave` deep-walks the save (inventory, loadout, inline quest
rewards) onto `relic` / `relics` and drops the kind, and `reslotRelicPiece`
does the same for one piece.
