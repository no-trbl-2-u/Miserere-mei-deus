/**
 * The victory screen's words (phase FE1a). The paid line's two labels and the
 * level panel's two lines, as the settled shot (S-07c) prints them; the screen
 * reads them through `selectFightEndVM` and holds no string of its own.
 */

/** The paid line's shillings label: "Shillings +n". */
export const FIGHT_END_SHILLINGS_LABEL = 'Shillings';
/** The paid line's XP label: "XP +n". */
export const FIGHT_END_XP_LABEL = 'XP';
/** Between the paid line's two halves. */
export const FIGHT_END_PAID_SEPARATOR = ' · ';

/** The level panel's beat and settled line after a level-up: "LEVEL 2". */
export function fightEndLevelLine(level: number): string {
    return `LEVEL ${level}`;
}

/** The level panel's settled line with no level-up: "30 XP to level 2". */
export function fightEndXpToLevelLine(xpOwed: number, nextLevel: number): string {
    return `${xpOwed} XP to level ${nextLevel}`;
}
