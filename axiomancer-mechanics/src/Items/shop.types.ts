/**
 * Shop types.
 *
 * A `ShopWare` is an item id with a flat price. The buy / sell reducers in
 * `shop.reducer.ts` accept a price directly rather than re-resolving it,
 * which keeps the reducer dumb and lets a caller set its own policy. No
 * village sells items any more (the village sells cards, `World/Village`),
 * so the reducers have no live map carrier.
 */

export interface ShopWare {
    /** Item catalogue id (e.g. an entry from `consumableLibrary`). */
    readonly itemId: string;
    /** Flat price in `Character.currency` units. Must be ≥ 0. */
    readonly price: number;
}
