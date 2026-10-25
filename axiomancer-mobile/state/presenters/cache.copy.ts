/**
 * Loot-cache-choice screen copy. Neutral register on purpose, same doctrine as `rest.copy.ts`.
 */

import type { LootCacheChoiceOfferId } from '@mechanics';

export const CACHE_CHOICE_EYEBROW = 'A FIND, UNCLAIMED';
export const CACHE_CHOICE_TITLE = 'TWO WAYS TO LEAVE IT';
export const CACHE_CHOICE_INTRO =
    'The node is spent the moment you stop here. Pick one — there is no walking back out.';

export const CACHE_CHOICE_OFFER_LABEL: Record<LootCacheChoiceOfferId, string> = Object.freeze({
    card: 'TAKE A CARD',
    item: 'TAKE THE GOODS',
});

export const CACHE_CHOICE_OFFER_DESC: Record<LootCacheChoiceOfferId, string> = Object.freeze({
    card: 'One card, straight into the deck.',
    item: "Whatever's inside, plus what it's worth.",
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
