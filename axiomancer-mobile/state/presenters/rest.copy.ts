/**
 * Rest-choice screen copy. Neutral register on purpose; the copy can be
 * rethemed without touching `app/rest/index.tsx` or the presenter.
 */

import { isInnShelter } from '@mechanics';
import type { RestChoiceOfferId, RestShelter } from '@mechanics';

export const REST_CHOICE_EYEBROW = 'A MOMENT TO STOP';
export const REST_CHOICE_TITLE = 'THREE DOORS, ONE STEP THROUGH';
export const REST_CHOICE_INTRO =
    'The node is spent the moment you stop here. Pick one — there is no walking back out.';

export const REST_CHOICE_OFFER_LABEL: Record<RestChoiceOfferId, string> = Object.freeze({
    rest: 'REST',
    upgrade: 'UPGRADE A CARD',
    cut: 'THE CUT',
});

export const REST_CHOICE_OFFER_DESC: Record<RestChoiceOfferId, string> = Object.freeze({
    rest: 'Sleep where you stand. Free.',
    upgrade: 'No sleep tonight. Work one card sharper instead.',
    cut: 'Thin the deck by one card.',
});

/**
 * The REST sentence at an inn. The node's own line describes a let room, so
 * the camp sentence ("where you stand") would contradict it; the night still
 * costs nothing, as the price column says.
 */
export const REST_INN_OFFER_DESC = 'A bed for the night, on the house.';

/**
 * The REST offer's description, with the heal it actually pays.
 *
 * @param healed - the VITAE the engine says a REST would restore right now
 *   (`previewRestChoiceHeal(session)` — the same arithmetic the commit
 *   seals, cap included).
 * @returns the static sentence with the restored amount appended, or the
 *   static sentence alone when there is nothing to promise (0, negative,
 *   or not a number).
 * @param shelter - the session's authored shelter; an inn words the night as
 *   a bed, a camp (the default) as sleeping where you stand.
 *
 * Computes nothing: it words the engine's number, so the missing-VITAE cap
 * is always respected.
 */
export function restOfferDesc(healed: number, shelter: RestShelter = 'camp'): string {
    const base = isInnShelter(shelter) ? REST_INN_OFFER_DESC : REST_CHOICE_OFFER_DESC.rest;
    if (!Number.isFinite(healed) || healed <= 0) return base;
    return `${base} Restores ${Math.round(healed)} VITAE.`;
}

export const REST_CHOICE_PURSE_LABEL = 'PURSE';
export const REST_CHOICE_FREE_LABEL = 'FREE';

export const REST_CUT_SHEET_TITLE = 'WHAT LEAVES THE DECK';
export const REST_CUT_SHEET_INTRO =
    'One card, gone for the run. The price climbs every time you do this.';
export const REST_CUT_NEXT_PRICE_PREFIX = 'the one after this costs';
export const REST_CUT_CONFIRM_LABEL = 'CUT IT';

export const REST_OUTCOME_EYEBROW = 'SETTLED';
export const REST_OUTCOME_CLAIM_LABEL = 'MOVE ON';

export function restOutcomeHealChip(healed: number): string {
    return `+${healed} VITAE`;
}

export function restOutcomeSpendChip(spent: number): string {
    return `−${spent} SHILLINGS`;
}

export function restOutcomeRemovedChip(cardName: string): string {
    return `CUT: ${cardName}`;
}

export function restOutcomeUpgradedChip(fromName: string, toName: string): string {
    return `UPGRADED: ${fromName} → ${toName}`;
}
