import type { CombatEncounterState } from './combat.encounter.types';
import { getRng } from '../Utils/rng';

/**
 * What a won fight pays, the mercy check that can change it, and the one tuning
 * table for both.
 *
 * - `mercyCheckChance`: the chance a normal foe, falling, asks spare or finish.
 * - `shillingsPerLevel`: every won fight pays this times the lead foe's level,
 *   on every difficulty (a level-5 foe is 15).
 * - `spareShillingsMultiplier`: a spared foe pays this times that wage, rounded
 *   up (a level-5 foe's 15 becomes 23).
 * - `extraShillingsMultiplier`: the table's extra shillings result is this
 *   times the normal wage, on top of Spare's own.
 * - `spareTable`: the weights of the one roll a Spare pays, out of 100.
 */
export const MERCY_TUNING = {
    mercyCheckChance: 0.15,
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

/** The chance a normal foe, falling to 0 VITAE, asks spare or finish. */
export const MERCY_CHECK_CHANCE = MERCY_TUNING.mercyCheckChance;

/** The shillings a won fight pays for a lead foe of `level`. */
export function fightWage(level: number): number {
    return MERCY_TUNING.shillingsPerLevel * Math.max(0, level);
}

/** The shillings a spared foe of `level` pays: 1.5 x the wage, rounded up. */
export function spareWage(level: number): number {
    return Math.ceil(MERCY_TUNING.spareShillingsMultiplier * fightWage(level));
}

/**
 * Rolls the mercy check on a fight just won: a foe of `difficulty: 'normal'`
 * asks spare or finish at `MERCY_CHECK_CHANCE`, from the combat rng. Any other
 * foe draws nothing and is finished. A state already rolled comes back as it is.
 *
 * The fight stays `finalOutcome: 'victory'` throughout: VITAE is the one way to
 * win, and the check only decides what the win pays.
 */
export function rollMercyCheck(
    state: CombatEncounterState,
    rng: () => number = () => getRng().random(),
): CombatEncounterState {
    if (state.finalOutcome !== 'victory' || state.mercyCheck) return state;
    const offered = state.enemy.difficulty === 'normal' && rng() < MERCY_CHECK_CHANCE;
    return { ...state, mercyCheck: offered ? 'offered' : 'none' };
}

/** Answers an offered check. Anything else comes back as it is. */
export function chooseMercyCheck(
    state: CombatEncounterState,
    choice: 'spare' | 'finish',
): CombatEncounterState {
    if (state.mercyCheck !== 'offered') return state;
    return { ...state, mercyCheck: choice === 'spare' ? 'spared' : 'finished' };
}

/**
 * Whether a fight's ending can be paid: any end but a win, or a win whose check
 * has been rolled and answered.
 */
export function mercyCheckSettled(state: CombatEncounterState): boolean {
    if (state.finalOutcome !== 'victory') return state.finalOutcome !== null;
    return state.mercyCheck !== undefined && state.mercyCheck !== 'offered';
}
