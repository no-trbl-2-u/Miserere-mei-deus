/**
 * Loot-cache-choice screen copy. Neutral register on purpose, same doctrine as `rest.copy.ts`.
 *
 * The choice screen says what you DO, never what you get (spec 154, A7): no
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

export function cacheOutcomeCardChip(cardName: string): string {
    return `+ ${cardName.toUpperCase()}`;
}

export function cacheOutcomeItemChip(itemName: string): string {
    return `+ ${itemName.toUpperCase()}`;
}

export function cacheOutcomeCurrencyChip(currency: number): string {
    return `+${currency} SHILLINGS`;
}
