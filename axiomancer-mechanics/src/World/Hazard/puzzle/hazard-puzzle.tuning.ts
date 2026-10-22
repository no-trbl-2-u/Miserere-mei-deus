/**
 * Hazard puzzle — tuning. Every number the puzzle mode reads lives here.
 *
 * Bands are counted in distinct winning outcomes (see the solver). They
 * apply to authored puzzle content only: a layout declares its band per
 * route and the library test holds it there.
 */

import type { CacheLootTier } from '../../../Items/cache-reward';
import { HAZARD_TUNING } from '../hazard.tuning';
import type { HazardRouteKey } from '../hazard.types';
import type { HazardPuzzleBand } from './hazard-puzzle.types';

export const HAZARD_PUZZLE_TUNING = {
    bands: {
        /** Easy: many ways through. */
        easy: { minOutcomes: 30 },
        /** Medium: a handful of ways through. */
        medium: { minOutcomes: 5, maxOutcomes: 29 },
        /** Hard: one to four ways through, and the best line barely clears. */
        hard: { minOutcomes: 1, maxOutcomes: 4, maxBestSurplus: 1 },
    },
    solver: {
        /**
         * Most distinct board states the solver explores in one round. A
         * layout past it fails the library test as "too open to count":
         * shrink the layout rather than raise this.
         */
        budget: 20_000,
    },
} as const;

export const HAZARD_PUZZLE_BANDS = HAZARD_PUZZLE_TUNING.bands;

/**
 * The cards a puzzle may use: the card audit's recommendation
 * (`npm run puzzle:audit`), as T approves it. No two of them play the same
 * and none is banned. Cut from puzzles, not from `HAZARD_DECK`: the live
 * hazard still draws CLIFFRUNNER (plays as SCRAMBLE), BALANCE POLE and
 * PILGRIM'S BLESSING (RE-CAST), and CRACK (dead). The cost cards run the
 * other way: in the pool, but never drawn by the live hazard. Test fixture cards join
 * it for the length of their test.
 */
export const HAZARD_PUZZLE_CARD_POOL: string[] = [
    'haul', 'grip', 'scram', 'leap', 'footing', 'windread', 'oath',
    // The five cost cards: puzzle-only, never in the live hazard's draw.
    'tithe', 'stones', 'pawn', 'breakneck', 'headlong',
];
export const HAZARD_PUZZLE_SOLVER_BUDGET = HAZARD_PUZZLE_TUNING.solver.budget;

/**
 * What every resolve pays, and the bonus a full completion adds.
 *
 *  - `xpPerLevel`: XP per player level on any resolve.
 *  - `completionXpBonus`: the extra share of that XP on a full completion.
 *  - `consumableTier`: the tier of the one consumable roll.
 *  - `purse`: shillings a full completion pays, per route (the live
 *    hazards' purses).
 */
export const HAZARD_PUZZLE_REWARDS: Readonly<{
    xpPerLevel: number;
    completionXpBonus: number;
    consumableTier: CacheLootTier;
    purse: Readonly<Record<HazardRouteKey, number>>;
}> = Object.freeze({
    xpPerLevel: 10,
    completionXpBonus: 0.5,
    consumableTier: 'modest',
    purse: Object.freeze({
        safe: HAZARD_TUNING.rewards.shillings,
        risk: HAZARD_TUNING.rewards.riskShillings,
    }),
});

/**
 * What a short resolve costs.
 *
 *  - `maxVitaeLoss`: VITAE lost at p = 0, per route; a resolve short of the
 *    goal loses round(max × (1 − p)).
 *  - `scarBelow`: the scar applies only when p is under this.
 *  - `scar`: max VITAE the scar takes (the live hazards' scar).
 */
export const HAZARD_PUZZLE_FAILURE: Readonly<{
    maxVitaeLoss: Readonly<Record<HazardRouteKey, number>>;
    scarBelow: number;
    scar: number;
}> = Object.freeze({
    maxVitaeLoss: Object.freeze({ safe: 6, risk: 12 }),
    scarBelow: 0.5,
    scar: HAZARD_TUNING.rewards.maxhpScar,
});

/**
 * Seconds on the clock, by the band of the route being played. Placeholders
 * until timed first-time solves set them (median x 1.5, rounded to 5 s).
 */
export const HAZARD_PUZZLE_CLOCK_SECONDS: Readonly<Record<HazardPuzzleBand, number>> = Object.freeze({
    easy: 90,
    medium: 75,
    hard: 60,
});
