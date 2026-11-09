/**
 * The `wanderer` (phase SM1e): the baseline run policy. It takes the first
 * legal choice at every seam and fights with the player witness
 * (`PLAYER_WITNESS`: greedy, never sparing, phase SM2b).
 *
 * "First" is the order the context lists: the roster's first character, the
 * first offer, the first enabled rest option, the first stat. On the map the
 * first legal road is the first of the nearest roads to something unfinished
 * (`distanceToUnfinished`), so the wanderer walks the chapter rather than
 * pacing back and forth; with nothing unfinished in reach it has no road and
 * the driver throws. It takes a trip only to somewhere it has not stood, or
 * out of the map; it never flees and wears every item it can. At a village it
 * spends without a plan: a random share of the purse at the anvil, then random
 * picks among what the rest can afford.
 */

import { PLAYER_WITNESS, SPARE_ALL_WITNESS } from './player-witness';
import { randomAnvil } from './run-policy.anvil';
import type { RunPolicy, RunRoadOption, RunVillageContext, RunVillageDecision } from './run-policy.types';

/** The first option among the nearest to something unfinished, or null when none leads anywhere. */
export function nearestRoad(options: readonly RunRoadOption[]): RunRoadOption | null {
    let best: RunRoadOption | null = null;
    for (const o of options) {
        if (o.distanceToUnfinished === null) continue;
        if (best === null || o.distanceToUnfinished < (best.distanceToUnfinished ?? Infinity)) best = o;
    }
    return best;
}

/** An integer in [0, n) from the seeded stream. */
function draw(rng: () => number, n: number): number {
    return Math.min(n - 1, Math.floor(rng() * n));
}

/**
 * The Wanderer's village: picks at random from what the purse can still pay
 * for (the bed, a shop card, one removal), or stops, until it stops or nothing
 * is affordable. Draws from `ctx.rng`, so a seed replays the same spending.
 */
export function randomVillage(ctx: RunVillageContext): RunVillageDecision {
    let purse = ctx.currency;
    let rest = false;
    const buy: string[] = [];
    const remove: string[] = [];
    for (let guard = 0; guard < 64; guard++) {
        interface Option { readonly price: number; readonly take: () => void }
        const options: Option[] = [];
        if (ctx.rest?.enabled && !rest) options.push({ price: ctx.rest.price, take: () => { rest = true; } });
        for (const offer of ctx.shop) {
            if (offer.enabled && !buy.includes(offer.cardId)) {
                options.push({ price: offer.price, take: () => { buy.push(offer.cardId); } });
            }
        }
        const removal = ctx.removal;
        if (removal?.enabled && remove.length === 0 && removal.cardIds.length > 0) {
            options.push({
                price: removal.price,
                take: () => { remove.push(removal.cardIds[draw(ctx.rng, removal.cardIds.length)]!); },
            });
        }
        const affordable = options.filter(o => o.price <= purse);
        if (affordable.length === 0) break;
        // One extra slot is "stop here".
        const chosen = affordable[draw(ctx.rng, affordable.length + 1)];
        if (!chosen) break;
        purse -= chosen.price;
        chosen.take();
    }
    return { rest, buy, remove };
}

export const WANDERER_POLICY: RunPolicy = Object.freeze<RunPolicy>({
    id: 'wanderer',
    description: 'The baseline: the first legal choice at every seam, random spending at a village, the player witness in fights.',
    chooseCharacter: (roster) => {
        const first = roster[0];
        if (!first) throw new Error('wanderer: the roster holds no character.');
        return first.id;
    },
    chooseRoad: (ctx) => nearestRoad(ctx.options)?.nodeId ?? null,
    takeTravel: (ctx) => ctx.leavesMap || !ctx.destinationVisited,
    pickReward: (ctx) => {
        const first = ctx.offers[0];
        return first === undefined ? { kind: 'skip' } : { kind: 'card', cardId: first };
    },
    chooseRest: (ctx) => {
        const offer = ctx.offers.find(o => o.enabled);
        if (offer?.id === 'upgrade') {
            const cardId = ctx.upgradableCardIds[0];
            if (cardId !== undefined) return { offer: 'upgrade', cardId };
        }
        return { offer: 'rest' };
    },
    chooseCacheOffer: () => 'card',
    visitAnvil: randomAnvil,
    visitVillage: randomVillage,
    hazardPolicy: () => 'greedy',
    pickHazardCard: (ctx) => ctx.offers[0] ?? null,
    fightPolicy: () => PLAYER_WITNESS,
    flee: () => false,
    raiseStat: () => 'heart',
    takeItem: (ctx) => (ctx.wearable ? 'equip' : 'keep'),
});

/** The wanderer, named for what it answers at the mercy check: Finish, every time. */
export const FINISH_ALL_POLICY: RunPolicy = Object.freeze<RunPolicy>({
    ...WANDERER_POLICY,
    id: 'finish-all',
    description: 'The wanderer, named for the mercy check comparison: Finish at every check that fires.',
});

/** The wanderer that spares at every mercy check that fires. */
export const SPARE_ALL_POLICY: RunPolicy = Object.freeze<RunPolicy>({
    ...WANDERER_POLICY,
    id: 'spare-all',
    description: 'The wanderer, but Spare at every mercy check that fires: the other arm of the comparison.',
    fightPolicy: () => SPARE_ALL_WITNESS,
});
