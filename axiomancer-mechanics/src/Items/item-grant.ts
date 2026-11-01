/**
 * The shared item-grant path — one door every "the player now has this item"
 * transition walks through.
 *
 * ## Why this module exists
 *
 * `equipItem` (see `../Character/equipment.reducer.ts` L164-L205) deliberately
 * does NOT hand the caller the displaced piece:
 *
 *   - **weapon / armor** — replace in place; the worn piece is dropped on the
 *     floor unless the caller rescued it first;
 *   - **relic** — fills the first empty position of three (relics keep
 *     their place, EQ3a), or the one named by `position`; when all three are
 *     FULL it is a **guarded no-op that returns the same character
 *     reference** unless an explicit `position` is passed.
 *
 * Both failure modes are silent. A naive `equipItem(character, relic)` either
 * destroys a worn relic or does nothing at all, and because the no-op returns
 * the *same* reference a shallow equality check reads it as success. The
 * documented convention is that the caller chains
 * `unequipItem` → `addItem` → `equipItem`. Chaining that correctly at every
 * grant site is exactly the kind of rule that drifts, so it lives here once.
 *
 * ## The contract
 *
 *   - **Nothing is ever destroyed.** A displaced piece is guaranteed to be in
 *     `character.inventory` when `grantItem` returns, and is reported as
 *     `displaced` so a caller can name it to the player.
 *   - **Worn items live in inventory too.** `createCharacter`'s relic seeding
 *     puts the worn relics in BOTH `inventory` (worn-first per slot, the
 *     `wornPerSlot` presenter convention) and the `equipment` loadout, so the
 *     displaced piece is usually already in inventory. We re-add it only when
 *     no entry with its id is present, which keeps a hand-built character
 *     (explicit `equipment`, empty `inventory`) honest without duplicating a
 *     row for the common case.
 *   - **Pure.** `Character → Character`, no throws, no global state. The
 *     granted item is deep-cloned on the way in, matching
 *     `resolveLootCache`, so two grants of the same
 *     library row never alias each other.
 *
 * ## D5 — which grants deserve ceremony
 *
 * `qualifiesForItemRewardScreen` is the single predicate every call site asks:
 * an item routes to the full reward screen when it is `Equipment` **and**
 * carries either a `grantsSignature` or a non-empty `statModifiers`. Plain
 * materials, quest items, and effect-only consumables keep the lightweight
 * inline grant. The rule follows the item's content, never the grant's source.
 */

import { deepClone } from '../Utils';
import { equipItem, unequipItem, relicPositions, isRelicPosition } from '../Character/equipment.reducer';
import { addItem, addItemStacking } from './item.reducer';
import { isEquipment, SLOT_CAPACITY } from './types';
import type { Character } from '../Character/types';
import type { Equipment, Item } from './types';

// ─── Options / result ─────────────────────────────────────────────────────────

export interface GrantItemOptions {
    /**
     * Equip the granted item after it enters inventory. Ignored (silently) for
     * non-equipment — a consumable is never "equipped". Default `false`.
     */
    equip?: boolean;
    /**
     * Which of the three relic positions to wear into (EQ3a: relics keep their
     * place). An empty position takes the relic; a worn one is displaced.
     * Ignored for weapon/armor (capacity 1 — the sole worn piece is the
     * displaced one). Out-of-range values read as no position. With none and
     * a free position the relic fills the first empty one; with none and all
     * three full the default is the LAST position (RELIC III), which mirrors
     * `findEquippedInSlot`'s replace-preview.
     */
    position?: number;
    /** The older name for `position`. */
    replaceIndex?: number;
    /**
     * Stack-aware inventory append: a consumable/material whose id is already
     * in inventory bumps the existing quantity instead of adding a row.
     * Default `true`. Equipment never stacks, so this is inert for relics.
     */
    stack?: boolean;
}

/** What actually happened to the granted item. */
export type GrantOutcome =
    /** Added to inventory only (no equip requested, or not equipment). */
    | 'inventory'
    /** Added to inventory and worn into a position that was free. */
    | 'equipped'
    /** Added to inventory and worn in place of `displaced`. */
    | 'swapped';

export interface ItemGrantResult {
    /** The character after the grant. Never the same reference as the input. */
    character: Character;
    /**
     * The deep clone that entered inventory (and, when equipped, the loadout).
     * NOT the caller's object. When a stackable item merged into an existing
     * row this is still the clone that was folded in, so `granted.id` is always
     * the right thing to name to the player; the merged row itself lives in
     * `character.inventory`.
     */
    granted: Item;
    /**
     * The worn piece this grant pushed out of the loadout, guaranteed to be in
     * `character.inventory`. `null` when nothing was displaced.
     */
    displaced: Equipment | null;
    /** True iff `character.equipment` now wears `granted`. */
    equipped: boolean;
    outcome: GrantOutcome;
}

// ─── D5 — the reward-screen trigger predicate ─────────────────────────────────

/**
 * D5: does this item deserve the full item-reward screen?
 *
 * `true` iff the item is `Equipment` AND carries a signature skill, an effect
 * (a weapon or armor) or at least one stat modifier — i.e. there is something
 * to *show*. Everything else (plain
 * materials, quest items, consumables, and the degenerate stat-less signet)
 * keeps today's lightweight inline grant.
 *
 * The discriminator is the `category` field via the existing `isEquipment`
 * guard, not an absent `slot`.
 */
export function qualifiesForItemRewardScreen(item: Item): boolean {
    if (!isEquipment(item)) return false;
    if (item.grantsSignature !== undefined) return true;
    if (item.effect !== undefined) return true;
    return (item.statModifiers?.length ?? 0) > 0;
}

/**
 * Split a batch of granted items (a loot-cache haul, a hazard reward, an
 * encounter's drops) into the ones that route to the reward screen and the ones
 * that keep the inline grant. Order is preserved within each list so a caller
 * can present them in authored order.
 */
export function partitionGrantsForReward(
    items: readonly Item[],
): { reward: Item[]; inline: Item[] } {
    const reward: Item[] = [];
    const inline: Item[] = [];
    for (const item of items) {
        (qualifiesForItemRewardScreen(item) ? reward : inline).push(item);
    }
    return { reward, inline };
}

// ─── Displacement preview ─────────────────────────────────────────────────────

/**
 * Which worn piece equipping `item` would push out of the loadout, and at which
 * relic index. Pure preview — nothing is mutated. A screen calls this to
 * name the trade *before* the player commits, so nobody ever swaps blind.
 *
 *   - weapon / armor → the worn piece in that slot (capacity 1), index `null`.
 *   - relic with a `position` (0-2) → the piece worn there (`null` when that
 *     position is empty), index = the position.
 *   - relic with no position and an empty position → `{ item: null, index: null }`.
 *   - relic with no position and all three full → the piece at the last
 *     position (RELIC III).
 */
export function displacedBy(
    character: Character,
    item: Equipment,
    opts?: { position?: number; replaceIndex?: number },
): { item: Equipment | null; index: number | null } {
    const loadout = character.equipment;
    if (item.slot === 'weapon') return { item: loadout.weapon, index: null };
    if (item.slot === 'armor') return { item: loadout.armor, index: null };

    const acc = relicPositions(loadout);
    const requested = opts?.position ?? opts?.replaceIndex;
    if (isRelicPosition(requested)) return { item: acc[requested], index: requested };
    if (acc.includes(null)) return { item: null, index: null };
    const last = SLOT_CAPACITY.relic - 1;
    return { item: acc[last], index: last };
}

// ─── The grant path ───────────────────────────────────────────────────────────

/** True iff some inventory row already carries this id. */
function hasItemId(inventory: readonly Item[], id: string): boolean {
    return inventory.some(i => i.id === id);
}

function wearsId(character: Character, id: string): boolean {
    const { weapon, armor, relics } = character.equipment;
    if (weapon?.id === id) return true;
    if (armor?.id === id) return true;
    return relics.some(a => a?.id === id);
}

/**
 * Grant `item` to `character`, optionally wearing it.
 *
 * Always: the item is deep-cloned and enters `inventory`.
 * With `{ equip: true }` on equipment: the displaced piece (if any) is
 * unequipped, guaranteed back in inventory, and only then is the grant worn —
 * the `unequipItem → addItem → equipItem` chain the equipment reducer's
 * contract requires. Because the slot is freed first, the relic row is
 * never full at equip-time, so the guarded no-op cannot fire.
 */
export function grantItem(
    character: Character,
    item: Item,
    options: GrantItemOptions = {},
): ItemGrantResult {
    const { equip = false, position, replaceIndex, stack = true } = options;

    const granted = deepClone(item) as Item;
    const inventory = stack
        ? addItemStacking(character.inventory, granted)
        : addItem(character.inventory, granted);

    const withItem: Character = { ...character, inventory };

    if (!equip || !isEquipment(granted)) {
        return {
            character: withItem,
            granted,
            displaced: null,
            equipped: false,
            outcome: 'inventory',
        };
    }

    const { item: displaced, index } = displacedBy(withItem, granted, { position: position ?? replaceIndex });

    // No worn sibling in the way — the slot has room, so a plain equip cannot
    // no-op and cannot drop anything.
    if (displaced === null) {
        const worn = equipItem(withItem, granted, {
            position: granted.slot === 'relic' ? (index ?? undefined) : undefined,
        });
        return {
            character: worn,
            granted,
            displaced: null,
            equipped: wearsId(worn, granted.id),
            outcome: 'equipped',
        };
    }

    // The swap chain. Free the slot FIRST so `equipItem` sees a gap.
    const unequipped = unequipItem(
        withItem,
        granted.slot,
        granted.slot === 'relic' ? (index ?? undefined) : undefined,
    );

    // Return the displaced piece to the satchel. Worn relics normally live in
    // inventory already (see the module docblock); only re-add when they do not.
    const rescued: Character = hasItemId(unequipped.inventory, displaced.id)
        ? unequipped
        : { ...unequipped, inventory: addItem(unequipped.inventory, displaced) };

    const worn = equipItem(rescued, granted, {
        position: granted.slot === 'relic' ? (index ?? undefined) : undefined,
    });

    return {
        character: worn,
        granted,
        displaced,
        equipped: wearsId(worn, granted.id),
        outcome: 'swapped',
    };
}

/** True iff `slot` has a free worn position on `character`. */
function hasFreePosition(character: Character, slot: Equipment['slot']): boolean {
    const { weapon, armor, relics } = character.equipment;
    if (slot === 'weapon') return weapon === null;
    if (slot === 'armor') return armor === null;
    return relicPositions({ relics }).includes(null);
}

/**
 * Grant `item` and wear it while its slot has a free position: the rule
 * every dev relic grant follows. A grant never displaces a worn piece, so
 * past the last free position (or when the same id is already worn) the item
 * is carried. Non-equipment is a plain stacking grant.
 */
export function grantWearingIfFree(character: Character, item: Item): ItemGrantResult {
    const equip = isEquipment(item)
        && !wearsId(character, item.id)
        && hasFreePosition(character, item.slot);
    return grantItem(character, item, { equip });
}
