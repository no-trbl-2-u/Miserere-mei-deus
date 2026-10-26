/**
 * What the player wears, read from the one record of it: `player.equipment`.
 *
 * Combat's signatures, the stat fold and the reward lanes all read the engine
 * loadout, so every mobile surface that says an item is worn reads it too.
 * Inventory order means nothing: a relic can be carried and not worn, and a
 * body can wear fewer relics than it carries (or none).
 *
 * Pure helpers over a `Character`; the rules (capacity, which piece a full row
 * displaces) are the engine's `SLOT_CAPACITY` and `displacedBy`.
 */

import {
    displacedBy,
    isEquipment,
    type Character,
    type Equipment,
    type EquipmentSlot,
    type Item,
} from '@mechanics';

type EquipmentLoadout = Character['equipment'];

/** The worn pieces in `slot`, in loadout order (empty when none). */
export function wornInSlot(loadout: EquipmentLoadout, slot: EquipmentSlot): readonly Equipment[] {
    if (slot === 'weapon') return loadout.weapon ? [loadout.weapon] : [];
    if (slot === 'armor') return loadout.armor ? [loadout.armor] : [];
    return loadout.accessories;
}

/** True iff the loadout wears a piece with this id. */
export function isWornId(loadout: EquipmentLoadout, id: string): boolean {
    return (
        loadout.weapon?.id === id
        || loadout.armor?.id === id
        || loadout.accessories.some((a) => a.id === id)
    );
}

/**
 * An equipment piece the player owns, by id: the inventory row first, then the
 * loadout (a hand-built character may wear a piece its inventory lacks).
 */
export function findOwnedEquipment(player: Character, id: string): Equipment | null {
    const carried = player.inventory.find((i: Item) => i.id === id);
    if (carried !== undefined) return isEquipment(carried) ? carried : null;
    const { weapon, armor, accessories } = player.equipment;
    for (const piece of [weapon, armor, ...accessories]) {
        if (piece && piece.id === id) return piece;
    }
    return null;
}

/**
 * The worn piece equipping `item` would take off, or `null` when a position is
 * free (or `item` is already worn). A full accessory row gives up its last-worn
 * piece, the engine's `displacedBy` default.
 */
export function replacedByEquip(player: Character, item: Equipment): Equipment | null {
    if (isWornId(player.equipment, item.id)) return null;
    const { item: displaced } = displacedBy(player, item);
    return displaced !== null && displaced.id !== item.id ? displaced : null;
}

/** The one loadout action an owned equipment piece offers. */
export interface LoadoutAction {
    mode: 'equip' | 'unequip';
    /**
     * `UNEQUIP`, or the put-on verb (`WEAR` for a relic, `EQUIP` otherwise),
     * as `<VERB> · REPLACE <NAME>` when the slot is full.
     */
    label: string;
    /** The worn piece an equip takes off; `null` for a free position or an unequip. */
    replacing: Equipment | null;
}

/** Worn → UNEQUIP; unworn → WEAR (a relic) or EQUIP, naming the piece it replaces when the slot is full. */
export function loadoutActionFor(player: Character, item: Equipment): LoadoutAction {
    if (isWornId(player.equipment, item.id)) {
        return { mode: 'unequip', label: 'UNEQUIP', replacing: null };
    }
    const replacing = replacedByEquip(player, item);
    const verb = item.grantsSignature ? 'WEAR' : 'EQUIP';
    return {
        mode: 'equip',
        label: replacing === null ? verb : `${verb} · REPLACE ${replacing.name.toUpperCase()}`,
        replacing,
    };
}
