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
import type { BaseStats } from './types';
import { relicStatLines } from '../Items/relic.library';

/**
 * Summed worn `maxHp` bonus: the flat `{ stat: 'maxHp' }` lines of
 * every worn item (a library relic's read from its library entry). Folded
 * onto `Character.maxHealth` by `withLoadout`, and by stat allocation /
 * level-up so a rebuilt `maxHealth` keeps the relic bonus.
 *
 * @param loadout - The worn equipment.
 * @returns The total max-VITAE bonus from worn equipment (0 when none).
 */
export function wornMaxHpBonus(loadout: EquipmentLoadout): number {
    let total = 0;
    for (const piece of getEquippedItems(loadout)) {
        for (const mod of relicStatLines(piece)) {
            if (mod.stat === 'maxHp') total += mod.value;
        }
    }
    return total;
}

/**
 * Summed worn Heart / Body / Mind lines (a library relic's read from its
 * library entry). Added to the fighter's stats at combat start, never to the
 * saved `baseStats`.
 *
 * @param loadout - The worn equipment.
 * @returns The bonus per stat (each 0 when none).
 */
export function wornStatBonus(loadout: EquipmentLoadout): BaseStats {
    const total: BaseStats = { heart: 0, body: 0, mind: 0 };
    for (const piece of getEquippedItems(loadout)) {
        for (const mod of relicStatLines(piece)) {
            if (mod.stat !== 'maxHp') total[mod.stat] += mod.value;
        }
    }
    return total;
}

/**
 * The fighter's stats: base stats plus every worn Heart / Body / Mind line.
 *
 * @param character - The wearer.
 * @returns A fresh stats object.
 */
export function statsWithWorn(character: Pick<Character, 'baseStats' | 'equipment'>): BaseStats {
    const bonus = character.equipment ? wornStatBonus(character.equipment) : { heart: 0, body: 0, mind: 0 };
    return {
        heart: character.baseStats.heart + bonus.heart,
        body: character.baseStats.body + bonus.body,
        mind: character.baseStats.mind + bonus.mind,
    };
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
 * The three relic positions of a loadout as a fixed-length list: a packed
 * save (fewer than three entries) is padded with `null`, and a stray
 * `undefined` reads as empty. Position `i` is RELIC I, II, III for 0..2.
 * Never mutates the loadout.
 */
export function relicPositions(loadout: Pick<EquipmentLoadout, 'relics'>): (Equipment | null)[] {
    const out: (Equipment | null)[] = [];
    for (let i = 0; i < SLOT_CAPACITY.relic; i++) out.push(loadout.relics?.[i] ?? null);
    return out;
}

/** True when `i` names a relic position (an integer in 0..2). */
export function isRelicPosition(i: unknown): i is number {
    return typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < SLOT_CAPACITY.relic;
}

/**
 * Equips `item` into its slot kind:
 *
 * - **weapon / armor** — replace in place (today's semantics). We don't return
 *   the displaced piece here; callers that need it back in `inventory` chain
 *   `unequipItem` + `addItem` first, per the existing convention.
 * - **relic** — with a `position` (0-2) the relic is worn *at that position*,
 *   replacing what is there. With none it fills the first empty position; with
 *   all three full it is a **guarded no-op** (returns the same character
 *   reference — the caller surfaces "relic slots full"), never a throw or
 *   silent replace. `replaceIndex` is the older name for `position`. An
 *   out-of-range position is ignored (it reads as no position).
 *
 * Pure — returns a new `Character` (or the same reference on the full no-op).
 */
export function equipItem(
    character: Character,
    item: Equipment,
    opts?: { position?: number; replaceIndex?: number },
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
    const acc = relicPositions(loadout);
    const requested = opts?.position ?? opts?.replaceIndex;
    const idx = isRelicPosition(requested) ? requested : acc.indexOf(null);
    if (idx < 0) return character;
    acc[idx] = item;
    return withLoadout(character, { ...loadout, relics: acc });
}

/**
 * Moves the relic at position `from` to position `to`. An empty `to` takes it;
 * a full `to` swaps the two. Same worn set, same `maxHealth`. No-op (the same
 * character reference) when `from === to`, when either index is not a relic
 * position, or when `from` is empty. Pure.
 */
export function moveRelic(character: Character, from: number, to: number): Character {
    if (!isRelicPosition(from) || !isRelicPosition(to) || from === to) return character;
    const acc = relicPositions(character.equipment);
    const moving = acc[from];
    if (!moving) return character;
    acc[from] = acc[to];
    acc[to] = moving;
    return withLoadout(character, { ...character.equipment, relics: acc });
}

/**
 * Unequips the piece in `slot`. For `'relic'`, `index` (0-2, required) names
 * the position to empty; it becomes `null` and no other relic moves (relics
 * keep their place). For weapon/armor, `index` is ignored. No-op (returns the
 * same character reference) when the target is empty or the relic index is not
 * a position. Pure.
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
    if (!isRelicPosition(index)) return character;
    const acc = relicPositions(loadout);
    if (!acc[index]) return character;
    acc[index] = null;
    return withLoadout(character, { ...loadout, relics: acc });
}

/**
 * List of every worn piece in canonical order (weapon, armor, relics by
 * position). Never contains `null`: holes are skipped. Used by
 * `getEquipmentModifiers`, the save migration and dev tooling — anything that
 * walks equipment without caring about slot identity.
 */
export function getEquippedItems(loadout: EquipmentLoadout): Equipment[] {
    const out: Equipment[] = [];
    if (loadout.weapon) out.push(loadout.weapon);
    if (loadout.armor)  out.push(loadout.armor);
    for (const a of loadout.relics ?? []) if (a) out.push(a);
    return out;
}

// Re-export so `equipment.reducer` is a single import surface for callers that
// also want a single `StatModifier`-shaped contract.
export type { StatModifier };
