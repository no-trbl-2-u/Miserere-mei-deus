/**
 * Loot-cache-choice screen copy. Neutral register on purpose, same doctrine as `rest.copy.ts`.
 *
 * The choice screen says what you DO, never what you get: no
 * eyebrow, no "node is spent" line, no reward words. Each choice's own line
 * is the cache node's data, not copy — it lives on the MapEvent payload and
 * arrives through the session (`CacheChoiceOfferVM.action`).
 */

import type { LootCacheChoiceOfferId } from '@mechanics';

export const CACHE_CHOICE_TITLE = 'TWO WAYS TO LEAVE IT';

export const CACHE_CHOICE_OFFER_LABEL: Record<LootCacheChoiceOfferId, string> = Object.freeze({
    card: 'TAKE A CARD',
    item: 'TAKE THE GOODS',
});

export const CACHE_OUTCOME_EYEBROW = 'SETTLED';
export const CACHE_OUTCOME_CLAIM_LABEL = 'MOVE ON';
/** The brass button at the right end of each choice row. */
export const CACHE_CHOICE_TAKE_LABEL = 'TAKE';

/** The purse in the top bar: "15 shillings". */
export function cachePurseLine(shillings: number): string {
    return `${shillings} shillings`;
}

export function cacheOutcomeItemChip(itemName: string): string {
    return `+ ${itemName.toUpperCase()}`;
}

export function cacheOutcomeCurrencyChip(currency: number): string {
    return `+${currency} SHILLINGS`;
}

/** A potion's line in the inventory's terms: "Heal 20 VITAE · 30 below half VITAE". */
export function cacheGoodHealLine(heal: number, belowHalf?: number): string {
    const base = `Heal ${heal} VITAE`;
    return belowHalf && belowHalf > 0 ? `${base} · ${belowHalf} below half VITAE` : base;
}
