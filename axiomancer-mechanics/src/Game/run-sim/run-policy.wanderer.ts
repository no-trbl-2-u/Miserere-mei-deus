/**
 * The `wanderer` (phase SM1e): the baseline run policy. It takes the first
 * legal choice at every seam and fights as the `greedy` witness.
 *
 * "First" is the order the context lists: the roster's first character, the
 * first offer, the first enabled rest option, the first stat. On the map the
 * first legal road is the first of the nearest roads to something unfinished
 * (`distanceToUnfinished`), so the wanderer walks the chapter rather than
 * pacing back and forth; with nothing unfinished in reach it has no road and
 * the driver throws. It takes a trip only to somewhere it has not stood, or
 * out of the map; it never flees, rests at a village only when hurt, buys and
 * removes nothing, and wears every item it can.
 */

import { COMBAT_SIM_POLICIES } from '../../Combat/combat.sim-policies';
import type { RunPolicy, RunRoadOption } from './run-policy.types';

/** The first option among the nearest to something unfinished, or null when none leads anywhere. */
export function nearestRoad(options: readonly RunRoadOption[]): RunRoadOption | null {
    let best: RunRoadOption | null = null;
    for (const o of options) {
        if (o.distanceToUnfinished === null) continue;
        if (best === null || o.distanceToUnfinished < (best.distanceToUnfinished ?? Infinity)) best = o;
    }
    return best;
}

export const WANDERER_POLICY: RunPolicy = Object.freeze<RunPolicy>({
    id: 'wanderer',
    description: 'The baseline: the first legal choice at every seam, greedy in fights.',
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
    visitVillage: (ctx) => ({
        rest: ctx.rest !== null && ctx.rest.enabled && ctx.health < ctx.maxHealth,
        buy: [],
        remove: [],
    }),
    hazardPolicy: () => 'greedy',
    pickHazardCard: (ctx) => ctx.offers[0] ?? null,
    fightPolicy: () => COMBAT_SIM_POLICIES.greedy,
    flee: () => false,
    raiseStat: () => 'heart',
    takeItem: (ctx) => (ctx.wearable ? 'equip' : 'keep'),
});
