/**
 * Worn-state convention over an inventory list, by slot capacity.
 *
 * The engine ships no `equipped` flag on `Equipment`. Inventory-driven clients
 * encode "worn" via ordering: the FIRST `SLOT_CAPACITY[slot]` equipment items
 * per slot are treated as worn (a reorder that moves a target item to the front
 * of its slot equips it). For weapon/armor the cap is 1 (first-per-slot); for
 * relics it is 3. Every consumer that surfaces worn-state must agree on
 * this convention for the picture to stay coherent, so it lives here as the
 * single source of truth rather than re-implemented per call site.
 */

import { isEquipment, SLOT_CAPACITY } from './types';
import type { Equipment, EquipmentSlot, Item } from './types';

/**
 * Walk the inventory in order; for each slot, capture the first
 * `SLOT_CAPACITY[slot]` equipment items seen in that slot (the worn set).
 * Returns a Map keyed by engine slot kind; empty slots are absent, and each
 * list preserves inventory order and never exceeds the slot's capacity.
 *
 * Stable under permutation of non-equipment items between equipment items (only
 * equipment-slot order matters) and under stack-quantity changes (does not read
 * `.quantity`).
 */
export function wornPerSlot(
    inventory: readonly Item[],
): Map<EquipmentSlot, Equipment[]> {
    const out = new Map<EquipmentSlot, Equipment[]>();
    for (const item of inventory) {
        if (!isEquipment(item)) continue;
        const list = out.get(item.slot);
        if (list === undefined) {
            out.set(item.slot, [item]);
            continue;
        }
        if (list.length >= SLOT_CAPACITY[item.slot]) continue;
        list.push(item);
    }
    return out;
}

/**
 * True iff `target` is among the worn items in its slot per the capacity-aware
 * convention (first `SLOT_CAPACITY[slot]` items of that slot). Returns `false`
 * for equipment pushed past the worn window.
 */
export function isEquippedFirstOfSlot(
    inventory: readonly Item[],
    target: Equipment,
): boolean {
    const worn = wornPerSlot(inventory).get(target.slot);
    return worn !== undefined && worn.some(w => w.id === target.id);
}

/**
 * Find the worn equipment item that equipping `target` would displace, or
 * `null` when nothing is displaced. Semantics:
 *   - `target` already worn → `null` (no swap).
 *   - the slot has a free position (`worn.length < capacity`) → `null`
 *     (`target` fills a gap, displaces nothing).
 *   - the slot is at capacity → the LAST worn piece (the one a fresh equip
 *     would push out). For weapon/armor (capacity 1) this is the sole worn
 *     piece (a replace preview).
 */
export function findEquippedInSlot(
    inventory: readonly Item[],
    target: Equipment,
): Equipment | null {
    const worn = wornPerSlot(inventory).get(target.slot) ?? [];
    if (worn.some(w => w.id === target.id)) return null;
    if (worn.length < SLOT_CAPACITY[target.slot]) return null;
    return worn[worn.length - 1];
}
