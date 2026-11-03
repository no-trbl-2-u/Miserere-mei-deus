/**
 * What a won fight pays, and the one tuning table for it.
 *
 * - `shillingsPerLevel`: every won fight pays this times the lead foe's level,
 *   on every difficulty (a level-5 foe is 15).
 * - `spareShillingsMultiplier`: a spared foe pays this times that wage, rounded
 *   up (a level-5 foe's 15 becomes 23).
 * - `extraShillingsMultiplier`: the table's extra shillings result is this
 *   times the normal wage, on top of Spare's own.
 * - `spareTable`: the weights of the one roll a Spare pays, out of 100.
 */
export const MERCY_TUNING = {
    shillingsPerLevel: 3,
    spareShillingsMultiplier: 1.5,
    extraShillingsMultiplier: 1,
    spareTable: {
        shillings: 30,
        consumable: 30,
        upgrade: 15,
        transform: 10,
        gear: 10,
        relic: 5,
    },
} as const;

/** The shillings a won fight pays for a lead foe of `level`. */
export function fightWage(level: number): number {
    return MERCY_TUNING.shillingsPerLevel * Math.max(0, level);
}

/** The shillings a spared foe of `level` pays: 1.5 x the wage, rounded up. */
export function spareWage(level: number): number {
    return Math.ceil(MERCY_TUNING.spareShillingsMultiplier * fightWage(level));
}
