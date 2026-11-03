/**
 * What a won fight pays, and the one tuning table for it.
 *
 * - `shillingsPerLevel`: every won fight pays this times the lead foe's level,
 *   on every difficulty (a level-5 foe is 15).
 */
export const MERCY_TUNING = {
    shillingsPerLevel: 3,
} as const;

/** The shillings a won fight pays for a lead foe of `level`. */
export function fightWage(level: number): number {
    return MERCY_TUNING.shillingsPerLevel * Math.max(0, level);
}
