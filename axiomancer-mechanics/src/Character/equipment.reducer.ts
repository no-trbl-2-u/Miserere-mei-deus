/**
 * Equipment reducers — pure transitions over a `Character` for `equipItem`
 * and `unequipItem`, plus `wornMaxHpBonus`, the one stat fold equipment
 * still performs.
 *
 * Design notes:
 *
 * - The only equipment stat line is `maxHp` (the two armor relics' +5 max
 *   VITAE), folded onto `Character.maxHealth` at equip-time. There are no
 *   derived stats to recompute.
 * - Equipment is DECOUPLED FROM EFFECTS. Equipping/unequipping
 *   applies no effect to `Character.effects`; `statModifiers` (now `maxHp`
 *   only) and `grantsSignature` are the SOLE channels from equipment to the
 *   character.
 */

import { Character, EquipmentLoadout } from './types';
import { Equipment, EquipmentSlot, SLOT_CAPACITY } from '../Items/types';
import { StatModifier } from '../Effects/types';

/**
 * Summed worn `maxHp` bonus: the flat `{ stat: 'maxHp' }` lines of
 * every worn item. Folded onto `Character.maxHealth` by `withLoadout`, and by
 * stat allocation / level-up so a rebuilt `maxHealth` keeps the relic bonus.
 *
 * @param loadout - The worn equipment.
 * @returns The total max-VITAE bonus from worn equipment (0 when none).
 */
export function wornMaxHpBonus(loadout: EquipmentLoadout): number {
    let total = 0;
    for (const piece of getEquippedItems(loadout)) {
        for (const mod of piece.statModifiers ?? []) {
            if (mod.stat === 'maxHp') total += mod.value;
        }
    }
    return total;
}

/**
 * Rebuilds a `Character` around a new loadout: folds the worn `maxHp` delta
 * onto `maxHealth` (growing/clamping current `health` by the same delta,
 * mirroring the stat-allocation HP convention). Shared tail for
 * equip/unequip.
 */
function withLoadout(
    character: Character,
    nextLoadout: EquipmentLoadout,
): Character {
    // `character.maxHealth` already includes the previous loadout's bonus, so
    // the delta is exact and idempotent. Equipping a +maxHp armor relic grows
    // current health by the same delta; unequipping lowers maxHealth and
    // clamps health down.
    const hpDelta = wornMaxHpBonus(nextLoadout) - wornMaxHpBonus(character.equipment);
    const nextMaxHealth = character.maxHealth + hpDelta;
    const nextHealth = Math.max(0, Math.min(character.health + hpDelta, nextMaxHealth));

    return {
        ...character,
        equipment: nextLoadout,
        maxHealth: nextMaxHealth,
        health:    nextHealth,
    };
}

/**
 * Equips `item` into its slot kind:
 *
 * - **weapon / armor** — replace in place (today's semantics). We don't return
 *   the displaced piece here; callers that need it back in `inventory` chain
 *   `unequipItem` + `addItem` first, per the existing convention.
 * - **relic** — fills the first free relic position. When all 3 are
 *   full, a passed `replaceIndex` (0-2) swaps that position; without it the
 *   equip is a **guarded no-op** (returns the same character reference — the
 *   caller surfaces "relic slots full"), never a throw or silent replace.
 *
 * Pure — returns a new `Character` (or the same reference on the full no-op).
 */
export function equipItem(
    character: Character,
    item: Equipment,
    opts?: { replaceIndex?: number },
): Character {
    const loadout = character.equipment;
    const slot = item.slot;

    if (slot === 'weapon') {
        return withLoadout(character, { ...loadout, weapon: item });
    }
    if (slot === 'armor') {
        return withLoadout(character, { ...loadout, armor: item });
    }

    // relic
    const acc = loadout.relics;
    if (acc.length < SLOT_CAPACITY.relic) {
        return withLoadout(character, { ...loadout, relics: [...acc, item] });
    }
    // Full row: honour an explicit replaceIndex, otherwise guarded no-op.
    const idx = opts?.replaceIndex;
    if (idx === undefined || !Number.isInteger(idx) || idx < 0 || idx >= acc.length) {
        return character;
    }
    const nextAcc = acc.slice();
    nextAcc[idx] = item;
    return withLoadout(character, { ...loadout, relics: nextAcc });
}

/**
 * Unequips the piece in `slot`. For `'relic'`, `index` selects which of the
 * ≤3 positions to free (required); the remaining relics compact toward the
 * front (positions have no identity). For weapon/armor, `index` is ignored.
 * No-op (returns the same character reference) when the target is empty or the
 * relic index is out of range. Pure.
 */
export function unequipItem(
    character: Character,
    slot: EquipmentSlot,
    index?: number,
): Character {
    const loadout = character.equipment;

    if (slot === 'weapon') {
        if (!loadout.weapon) return character;
        return withLoadout(character, { ...loadout, weapon: null });
    }
    if (slot === 'armor') {
        if (!loadout.armor) return character;
        return withLoadout(character, { ...loadout, armor: null });
    }

    // relic
    const acc = loadout.relics;
    if (index === undefined || !Number.isInteger(index) || index < 0 || index >= acc.length) {
        return character;
    }
    const nextAcc = acc.slice();
    nextAcc.splice(index, 1);
    return withLoadout(character, { ...loadout, relics: nextAcc });
}

/**
 * List of every worn piece in canonical order (weapon, armor, relics by
 * position). Used by `getEquipmentModifiers`, the save migration and dev
 * tooling — anything that walks equipment without caring about slot identity.
 */
export function getEquippedItems(loadout: EquipmentLoadout): Equipment[] {
    const out: Equipment[] = [];
    if (loadout.weapon) out.push(loadout.weapon);
    if (loadout.armor)  out.push(loadout.armor);
    for (const a of loadout.relics) out.push(a);
    return out;
}

// Re-export so `equipment.reducer` is a single import surface for callers that
// also want a single `StatModifier`-shaped contract.
export type { StatModifier };
