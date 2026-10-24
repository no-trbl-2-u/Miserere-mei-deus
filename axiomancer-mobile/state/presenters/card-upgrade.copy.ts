/**
 * The shared card-upgrade screen's copy (Phase UP1d). The rest site uses it
 * now; the blacksmith and the elite reward reuse it. Neutral register, so it
 * can be rethemed without touching the component or the presenter.
 */

export const CARD_UPGRADE_SHEET_TITLE = 'WHAT GETS SHARPER';
export const CARD_UPGRADE_SHEET_INTRO =
    'Pick one card. Every copy you carry stays as it is but the one you work.';
export const CARD_UPGRADE_NOW_LABEL = 'NOW';
export const CARD_UPGRADE_AFTER_LABEL = 'AFTER';
export const CARD_UPGRADE_LOCKED_LABEL = '???';
export const CARD_UPGRADE_LOCKED_NOTE = 'Another way this card could grow. Not yet.';
export const CARD_UPGRADE_CONFIRM_LABEL = 'UPGRADE IT';
export const CARD_UPGRADE_PICK_HINT = 'Tap a card to see what the upgrade does.';
export const CARD_UPGRADE_FREE_TAG = 'NO DIE';
export const CARD_UPGRADE_PAID_TAG = '+DIE';

/** 'UPGRADE 1 OF 3': which upgrade this is, out of the card's rarity limit. */
export function cardUpgradeStepLabel(step: number, limit: number): string {
    return `UPGRADE ${step} OF ${limit}`;
}
