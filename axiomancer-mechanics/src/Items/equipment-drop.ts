/**
 * Where the eight lane weapons and armors come from, and how often.
 *
 * Every chance and count lives in {@link EQUIPMENT_DROP_TUNING}, the one table
 * to experiment with. A lane piece comes from an elite's drop, a quest step,
 * a loot cache, the village shop, and a befriended elite; the grey pair never
 * drops (every run starts wearing it). A source draws only from pieces the
 * player does not carry, so no source hands over a duplicate.
 */

import type { Character } from '../Character/types';
import { deepClone } from '../Utils';
import { equipmentLibrary, EQUIPMENT_LANE } from './equipment.library';
import type { Equipment } from './types';

/**
 * [content] The drop rates and the shop's stock. Rates are fractions of 1.
 * T's starting numbers (2026-11-01); they are for experimenting.
 */
export const EQUIPMENT_DROP_TUNING = Object.freeze({
    /** A won elite fight also drops a lane piece, on top of its relic roll. */
    elite: 0.25,
    /** A loot cache's item bundle also holds a lane piece. */
    cache: 0.33,
    /** Befriending an elite always hands one. */
    befriendedElite: 1,
    /** Pieces the village shop stocks per visit. */
    shopCount: 2,
    /** Shillings a shop piece costs. */
    shopPrice: 40,
});

/** Whoever carries pieces: a character, or a partial one in a test. */
export type EquipmentCarrier = Partial<Pick<Character, 'inventory' | 'equipment'>>;

/** The ids of every piece the carrier has: the satchel and everything worn. */
export function carriedPieceIds(carrier: EquipmentCarrier): Set<string> {
    const ids = new Set<string>((carrier.inventory ?? []).map(item => item.id));
    const worn = carrier.equipment;
    if (worn?.weapon) ids.add(worn.weapon.id);
    if (worn?.armor) ids.add(worn.armor.id);
    for (const relic of worn?.relics ?? []) if (relic) ids.add(relic.id);
    return ids;
}

/**
 * The lane pieces a drop can hand over: the ones in `EQUIPMENT_LANE` the
 * carrier does not have, weapons then armor in library order. The grey pair
 * is not a lane piece and is never in the pool.
 */
export function equipmentDropPool(
    carrier: EquipmentCarrier,
    pieces: readonly Equipment[] = equipmentLibrary,
): Equipment[] {
    const carried = carriedPieceIds(carrier);
    return pieces.filter(piece => EQUIPMENT_LANE[piece.id] !== undefined && !carried.has(piece.id));
}

/**
 * Rolls one lane piece at `chance` from the pieces the carrier lacks. Pure
 * and seeded: the first draw is the chance, the second picks uniformly from
 * the pool; an empty pool drops nothing and draws nothing. The piece comes
 * back deep-cloned.
 *
 * @example rollEquipmentDrop(player, Math.random, EQUIPMENT_DROP_TUNING.elite) // null, or a lane piece
 */
export function rollEquipmentDrop(
    carrier: EquipmentCarrier,
    rng: () => number,
    chance: number,
    pieces: readonly Equipment[] = equipmentLibrary,
): Equipment | null {
    const pool = equipmentDropPool(carrier, pieces);
    if (pool.length === 0) return null;
    if (rng() >= chance) return null;
    const pick = pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)]!;
    return deepClone(pick);
}
