/**
 * The shared card-upgrade screen's copy (Phase UP1d; the string of beads,
 * UP1i). The rest site, the blacksmith and the elite reward all use it.
 * Neutral register, so it can be rethemed without touching the component or
 * the presenter. The screen prints only HOLD and the change line; the rest is
 * what a screen reader says.
 */

/** The one printed control: held, it upgrades the card on the centre bead. */
export const CARD_UPGRADE_HOLD_LABEL = 'HOLD';

/** 'UPGRADE 1 OF 3': which upgrade this is, out of the card's rarity limit. */
export function cardUpgradeStepLabel(step: number, limit: number): string {
    return `UPGRADE ${step} OF ${limit}`;
}

/** A bead's count mark when the deck carries the card more than once: '×3'. */
export function cardUpgradeCountMark(count: number): string | null {
    return count > 1 ? `×${count}` : null;
}

/** What a screen reader says for a bead: the card, its copies, which upgrade. */
export function cardUpgradeBeadA11yLabel(name: string, count: number, stepLabel: string, centre: boolean): string {
    const copies = count > 1 ? `, ${count} copies` : '';
    return centre ? `${name}${copies}, ${stepLabel}, on the centre bead` : `${name}${copies}`;
}

/** The hint on a side bead: tapping it turns the wheel, never upgrades. */
export const CARD_UPGRADE_SIDE_BEAD_HINT = 'Turns the wheel to bring this card to the centre.';

/** The centre bead's accessibility action, the screen reader's way to upgrade without the hold. */
export function cardUpgradeA11yActionLabel(name: string): string {
    return `Upgrade ${name}`;
}

/** HOLD, read aloud. */
export function cardUpgradeHoldA11yLabel(name: string): string {
    return `Hold to upgrade ${name}`;
}
export const CARD_UPGRADE_HOLD_A11Y_HINT = 'Keep holding until the ring closes. Letting go early upgrades nothing.';

/** The pair, read aloud: which card and which side of the upgrade. The
 *  face's own lines are read from the face, so this names the card only. */
export function cardUpgradePairA11yLabel(name: string, side: 'before' | 'after'): string {
    return side === 'before' ? `The card as it is: ${name}` : `The card as it will be: ${name}`;
}
