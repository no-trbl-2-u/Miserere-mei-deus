/**
 * The loot cache's pictures, from one table keyed by moment, so T swaps an
 * image in one place.
 *
 *   choice  the closed chest, while the two blind rows are on the table
 *   goods   the gold hoard, once the goods are taken
 *   card    the card picture: a TEMP public-domain cave stand-in until T's
 *           row-14 art lands (`null` would show the region plate alone)
 *
 * The card picture may be overridden per cache node (`CACHE_CARD_PICTURE_BY_NODE`,
 * keyed by the MapEvent node id), so a riverbank or gatehouse cache can wear
 * its own later. Until then one picture serves every cache.
 */

import { TREASURE_CACHE_CARD_CAVERN, TREASURE_CHEST_CLOSED, TREASURE_GOLD_HOARD } from './index';

export type CacheMoment = 'choice' | 'goods' | 'card';

/** A picture the band draws, or `null` for the region plate alone. */
export type CachePicture = number | null;

export const CACHE_PICTURES: Readonly<Record<CacheMoment, CachePicture>> = Object.freeze({
    choice: TREASURE_CHEST_CLOSED,
    goods: TREASURE_GOLD_HOARD,
    // Row 14 (the runes cut into the cave wall lit by one lantern) is T's art.
    // TEMP stand-in (T, 2026-11-11): a public-domain cave interior, one picture for every cache.
    card: TREASURE_CACHE_CARD_CAVERN,
});

/** Per-cache card pictures by MapEvent node id (`cw-6` ...). Empty until T supplies any. */
export const CACHE_CARD_PICTURE_BY_NODE: Readonly<Record<string, number>> = Object.freeze({});

/** The picture for a moment; the card moment prefers its cache node's own picture. */
export function cachePicture(moment: CacheMoment, nodeId?: string | null): CachePicture {
    if (moment === 'card' && nodeId != null
        && Object.prototype.hasOwnProperty.call(CACHE_CARD_PICTURE_BY_NODE, nodeId)) {
        return CACHE_CARD_PICTURE_BY_NODE[nodeId];
    }
    return CACHE_PICTURES[moment];
}
