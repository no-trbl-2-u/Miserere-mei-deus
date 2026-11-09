/**
 * How the bots use the village anvil.
 *
 * One shared greedy helper, {@link greedyAnvil}, answers `visitAnvil` for every
 * lane bot and persona; the Wanderer's {@link randomAnvil} spends without a plan
 * ("wanderer chooses randomly what to spend money on"), so it
 * stays the floor. Both read every price and card from the context, which the
 * driver fills from the blacksmith code and the deck, never a card id or a
 * retyped price. Randomness comes from `ctx.rng` (the engine's seeded stream),
 * never `Math.random`.
 */

import { DIE_GEAR_COLORS, type DieGearColor } from '../../Character/dieGear.reducer';
import type { RunAnvilContext, RunAnvilDecision, RunStat } from './run-policy.types';

/** Under this share of max VITAE the bot keeps the bed's price back from the anvil. */
export const ANVIL_BED_RESERVE_BELOW = 0.5;

/** What a greedy bot knows about itself: its own lane's cards, and the die colour it favours. */
export interface GreedyAnvilTaste {
    /** True for a card of the bot's own lane; absent for a bot with no lane. */
    readonly inLane?: (cardId: string) => boolean;
    /** The die colour honed and tempered before the others. */
    readonly firstColor: DieGearColor;
}

/** The colours in the order to work them: the favourite first, then the rest as the engine lists them. */
export function colorsFavouring(first: DieGearColor): DieGearColor[] {
    return [first, ...DIE_GEAR_COLORS.filter(c => c !== first)];
}

/** The die colour a stat is paid in (the dice are heart, body and mind). */
export function statColor(stat: RunStat): DieGearColor {
    return stat;
}

/** The highest of the three stats, ties going heart, body, mind (the personas' `raiseStat` order). */
export function highestStat(stats: Readonly<Record<RunStat, number>>): RunStat {
    if (stats.heart >= stats.body && stats.heart >= stats.mind) return 'heart';
    return stats.body >= stats.mind ? 'body' : 'mind';
}

/** The shillings the anvil may have: the purse, less the bed's price while under half VITAE. */
export function anvilBudget(ctx: Pick<RunAnvilContext, 'currency' | 'bedPrice' | 'health' | 'maxHealth'>): number {
    const keepBed = ctx.bedPrice !== null && ctx.health < ctx.maxHealth * ANVIL_BED_RESERVE_BELOW;
    return Math.max(0, ctx.currency - (keepBed ? ctx.bedPrice ?? 0 : 0));
}

/**
 * The greedy answer: keep back the bed's price when under half VITAE, upgrade
 * one card first (the bot's own lane's when it has one) when the budget
 * reaches the upgrade's price, then hone and temper the favoured colour before
 * the others.
 */
export function greedyAnvil(ctx: RunAnvilContext, taste: GreedyAnvilTaste): RunAnvilDecision {
    const budget = anvilBudget(ctx);
    const own = taste.inLane ? ctx.upgradableCardIds.find(taste.inLane) : undefined;
    const card = own ?? ctx.upgradableCardIds[0];
    const upgradeCardId = card !== undefined && budget >= ctx.prices.upgrade ? card : null;
    return { budget, upgradeCardId, colors: colorsFavouring(taste.firstColor) };
}

/** An integer in [0, n) from the seeded stream. */
function below(rng: () => number, n: number): number {
    return Math.min(n - 1, Math.floor(rng() * n));
}

/**
 * The Wanderer's answer: a random share of the purse as the budget, then a
 * random card or none, and the colours in a random order. A fixed number of
 * draws per call, so the same seed replays the same spending.
 */
export function randomAnvil(ctx: RunAnvilContext): RunAnvilDecision {
    const budget = below(ctx.rng, ctx.currency + 1);
    const pick = below(ctx.rng, ctx.upgradableCardIds.length + 1);
    const colors = [...DIE_GEAR_COLORS];
    for (let i = colors.length - 1; i > 0; i--) {
        const j = below(ctx.rng, i + 1);
        [colors[i], colors[j]] = [colors[j]!, colors[i]!];
    }
    return { budget, upgradeCardId: ctx.upgradableCardIds[pick] ?? null, colors };
}
