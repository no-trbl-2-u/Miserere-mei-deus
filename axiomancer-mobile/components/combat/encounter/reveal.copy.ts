/** Words on the encounter reveal's tier frame (phase ET1a). */

// The reveal has no kicker line above the foe. The tier reads off the
// portrait's frame and, for the boss, the held title card.

/** The held title card's second line, under the place. */
export const BOSS_CARD_SUBTITLE = 'Chapter 1 boss';

/** The tap hint under the held title card. */
export const BOSS_CARD_HINT = 'tap to face it';

/** The elite's tier chip. */
export const ELITE_CHIP = 'ELITE';

/** The elite's held-road line. */
export function heldRoadLine(place: string): string {
    return `Holds the road to ${place}`;
}
