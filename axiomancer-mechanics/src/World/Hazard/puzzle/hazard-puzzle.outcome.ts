/**
 * Hazard puzzle — the outcome of one resolve.
 *
 * One pure function turns a resolve into what the player gains and loses.
 * It takes a context object, so later inputs (level bands, scars already
 * banked, a dynamic failure curve) are new optional fields, not new
 * parameters. Applying the outcome to a game state is
 * `claimHazardPuzzleOutcome` (`Game/hazard-puzzle.claim.ts`).
 *
 *  - Always: XP (per player level) and one modest consumable roll.
 *  - Full completion (p = 1): the route's shillings purse and an XP bonus.
 *  - Short of the goal (p < 1): VITAE lost in proportion to the shortfall;
 *    under half the goal, the max-VITAE scar as well.
 */

import { rollCacheReward } from '../../../Items/cache-reward';
import type { Item } from '../../../Items/types';
import type { MapName } from '../../map.library';
import type { HazardRouteKey } from '../hazard.types';
import { HAZARD_PUZZLE_FAILURE, HAZARD_PUZZLE_REWARDS } from './hazard-puzzle.tuning';
import type { HazardPuzzleResult } from './hazard-puzzle.types';

export interface HazardPuzzleOutcomeContext {
    /** The route the puzzle was played on. */
    route: HazardRouteKey;
    /** The resolve, from `confirmHazardPuzzle`. Only `p` is read. */
    result: Pick<HazardPuzzleResult, 'p'>;
    /** The player's level (XP scales with it). */
    playerLevel: number;
    /**
     * The region the puzzle was played in. No reward reads it since the
     * gathering kind (and its region material) was cut.
     */
    region?: MapName;
    /** Drives the consumable roll. Same seed, same loot. */
    seed: number;
}

export interface HazardPuzzleOutcome {
    route: HazardRouteKey;
    /** The resolve's p, clamped to [0, 1]. */
    p: number;
    /** p reached 1: the purse and the XP bonus are paid. */
    completed: boolean;
    xp: number;
    /** The consumable roll. */
    items: Item[];
    shillings: number;
    /** VITAE lost: round(max × (1 − p)) short of the goal, else 0. */
    vitaeLoss: number;
    /** Max VITAE the scar takes: the scar under half the goal, else 0. */
    scar: number;
}

function clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
}

export function hazardPuzzleOutcome(ctx: HazardPuzzleOutcomeContext): HazardPuzzleOutcome {
    const p = clamp01(ctx.result.p);
    const completed = p >= 1;
    const level = Math.max(1, Math.floor(ctx.playerLevel));

    const baseXp = HAZARD_PUZZLE_REWARDS.xpPerLevel * level;
    const xp = Math.round(completed ? baseXp * (1 + HAZARD_PUZZLE_REWARDS.completionXpBonus) : baseXp);

    const items: Item[] = rollCacheReward({
        playerLevel: level,
        seed: ctx.seed,
        tier: HAZARD_PUZZLE_REWARDS.consumableTier,
    });

    const shillings = completed ? HAZARD_PUZZLE_REWARDS.purse[ctx.route] : 0;
    // Trim float noise before rounding: p is value / goal, so 1 − p is often a
    // hair under an exact half (12 × (1 − 23/24) = 0.49999999999999956), which
    // would round down where round(max × (1 − p)) means up.
    const shortfall = Number((HAZARD_PUZZLE_FAILURE.maxVitaeLoss[ctx.route] * (1 - p)).toFixed(9));
    const vitaeLoss = completed ? 0 : Math.round(shortfall);
    const scar = p < HAZARD_PUZZLE_FAILURE.scarBelow ? HAZARD_PUZZLE_FAILURE.scar : 0;

    return { route: ctx.route, p, completed, xp, items, shillings, vitaeLoss, scar };
}
