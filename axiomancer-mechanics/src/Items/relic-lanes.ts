/**
 * Relic lanes: which card lane a relic opens, and the pieces a player wears.
 *
 * A relic may name one card lane (`Equipment.laneId`, a `CardLane.id`). While
 * it is worn, that lane's cards join the card-reward pool and count toward the
 * reward's lane slots (`Combat/combat.rewards.ts`). A carried, unworn relic
 * opens nothing.
 *
 * The lane is read from the relic library by id first and only then from the
 * item itself, because the save holds a clone of each relic: a copy saved
 * before its library entry gained a lane still opens it.
 */

import type { Equipment } from './types';
import type { Character } from '../Character/types';
import { CARD_LANES, getCardLane, type CardLane } from '../Cards/card.lanes';
import { relicLibrary } from './relic.library';

/** Whoever may wear relics: a character, or a partial one in a test (no loadout wears nothing). */
export type Wearer = Partial<Pick<Character, 'equipment'>>;

/**
 * The registered lane a relic opens.
 *
 * @param item   - A worn or carried equipment piece.
 * @param lanes  - The lane registry; defaults to {@link CARD_LANES}.
 * @param relics - The relic library; defaults to {@link relicLibrary}.
 * @returns The lane id, or `undefined` when neither the library entry nor the
 *          item names a lane, or the named lane is not registered.
 * @example relicLaneId({ ...ring, laneId: 'blood-price' }) // 'blood-price'
 */
export function relicLaneId(
    item: Pick<Equipment, 'id' | 'laneId'>,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): string | undefined {
    const named = relics.find(relic => relic.id === item.id)?.laneId ?? item.laneId;
    if (named === undefined) return undefined;
    return getCardLane(named, lanes)?.id;
}

/**
 * The worn pieces that can open a lane: the relics, in relic-position order.
 * Only the relic slot grants lanes; a worn weapon or armor never does. The
 * one place the reward rule reads worn state.
 */
export function wornPieces(player: Wearer): Equipment[] {
    return (player.equipment?.relics ?? []).flatMap(r => (r ? [r] : []));
}

/**
 * How many worn relics open each lane, keyed by lane id, in wear order.
 *
 * @param player - The wearer.
 * @param lanes  - The lane registry; defaults to {@link CARD_LANES}.
 * @param relics - The relic library; defaults to {@link relicLibrary}.
 * @returns A map of lane id to worn-relic count; lanes with none are absent.
 */
export function wornLaneCounts(
    player: Wearer,
    lanes: readonly CardLane[] = CARD_LANES,
    relics: readonly Equipment[] = relicLibrary,
): Map<string, number> {
    const counts = new Map<string, number>();
    for (const piece of wornPieces(player)) {
        const laneId = relicLaneId(piece, lanes, relics);
        if (laneId !== undefined) counts.set(laneId, (counts.get(laneId) ?? 0) + 1);
    }
    return counts;
}
