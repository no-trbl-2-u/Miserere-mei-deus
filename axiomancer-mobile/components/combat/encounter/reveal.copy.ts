/** Words on the encounter reveal's tier frame (phase ET1a). */

export const REVEAL_EYEBROW_FIGHT = '⚔ A FOE BARS THE WAY';
export const REVEAL_EYEBROW_ELITE = '⚔ A CHAMPION HOLDS THE WAY';
export const REVEAL_EYEBROW_BOSS = '⚔ THE WAY ENDS HERE';

/** The held title card's second line, under the place. */
export const BOSS_CARD_SUBTITLE = 'Chapter 1 boss';

/** The tap hint under the held title card. */
export const BOSS_CARD_HINT = 'tap to face it';

/** The elite's held-road line. */
export function heldRoadLine(place: string): string {
    return `Holds the road to ${place}`;
}
