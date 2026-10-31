/**
 * Rest-choice screen copy. Neutral register on purpose; the copy can be
 * rethemed without touching `app/rest/index.tsx` or the presenter.
 */

import { isInnShelter } from '@mechanics';
import type { RestChoiceOfferId, RestShelter } from '@mechanics';

export const REST_CHOICE_EYEBROW = 'A MOMENT TO STOP';
export const REST_CHOICE_TITLE = 'TWO DOORS, ONE STEP THROUGH';
export const REST_CHOICE_INTRO =
    'The node is spent the moment you stop here. Pick one — there is no walking back out.';

export const REST_CHOICE_OFFER_LABEL: Record<RestChoiceOfferId, string> = Object.freeze({
    rest: 'REST',
    upgrade: 'UPGRADE A CARD',
});

export const REST_CHOICE_OFFER_DESC: Record<RestChoiceOfferId, string> = Object.freeze({
    rest: 'Sleep where you stand. Free.',
    upgrade: 'No sleep tonight. Work one card sharper instead.',
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

export const REST_OUTCOME_EYEBROW = 'SETTLED';
export const REST_OUTCOME_CLAIM_LABEL = 'MOVE ON';

export function restOutcomeHealChip(healed: number): string {
    return `+${healed} VITAE`;
}

/**
 * One line per elite the night brings back (phase ER1): the foe and the
 * place, the place worded as the map screen names the node.
 *
 * @example restEliteReturnLine('Green Jelly', 'The North Pier') // 'The Green Jelly is back at The North Pier.'
 */
export function restEliteReturnLine(foeName: string, place: string): string {
    // A name that already carries its article (The Toll-Keeper) keeps just the one.
    return `The ${foeName.replace(/^The /, '')} is back at ${place}.`;
}

/**
 * The dawn line after an upgrade (ET1c): the card's name as the player chose it
 * (before the upgrade), with no VITAE line beside it.
 *
 * @example restDawnUpgradedChip('Strike') // 'Strike upgraded'
 */
export function restDawnUpgradedChip(fromName: string): string {
    return `${fromName} upgraded`;
}

/** The word shown for each stage of the night (ET1c). */
export const REST_NIGHT_STAGE_WORD = Object.freeze({
    dusk: 'DUSK',
    night: 'NIGHT',
    dawn: 'DAWN',
} as const);

export const REST_NIGHT_SKIP_LABEL = 'Skip the night';
