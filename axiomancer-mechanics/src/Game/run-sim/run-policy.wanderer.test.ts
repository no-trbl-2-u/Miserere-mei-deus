import { describe, expect, it } from 'vitest';

import { CHARACTER_ROSTER } from '../../Character/roster';
import { COMBAT_SIM_POLICIES } from '../../Combat/combat.sim-policies';
import { getRunPolicy, RUN_POLICY_IDS } from './run-policy.registry';
import type { RunRoadOption } from './run-policy.types';
import { nearestRoad, WANDERER_POLICY as W } from './run-policy.wanderer';

const road = (nodeId: string, distanceToUnfinished: number | null): RunRoadOption => ({
    nodeId, via: 'road', nodeKind: 'encounter', unfinished: distanceToUnfinished === 0, distanceToUnfinished,
});

describe('the wanderer', () => {
    it('is registered by id', () => {
        expect(RUN_POLICY_IDS).toContain('wanderer');
        expect(getRunPolicy('wanderer')).toBe(W);
        expect(getRunPolicy('nobody')).toBeUndefined();
    });

    it('opens as the roster\'s first character', () => {
        expect(W.chooseCharacter(CHARACTER_ROSTER)).toBe(CHARACTER_ROSTER[0]!.id);
        expect(() => W.chooseCharacter([])).toThrow(/no character/);
    });

    it('takes the first of the nearest roads, and none when nothing is unfinished', () => {
        const ctx = { mapName: 'breakwater', currentNodeId: 'x', health: 10, maxHealth: 10, dying: false };
        expect(W.chooseRoad({ ...ctx, options: [road('a', 2), road('b', 1), road('c', 1)] })).toBe('b');
        expect(W.chooseRoad({ ...ctx, options: [road('a', null)] })).toBeNull();
        expect(nearestRoad([])).toBeNull();
    });

    it('travels only somewhere new, or out of the map', () => {
        const trip = { fromNodeId: 'a', toNodeId: 'b', toMap: null, leavesMap: false, destinationVisited: false };
        expect(W.takeTravel(trip)).toBe(true);
        expect(W.takeTravel({ ...trip, destinationVisited: true })).toBe(false);
        expect(W.takeTravel({ ...trip, toNodeId: null, toMap: 'charcoal-wood', leavesMap: true, destinationVisited: true })).toBe(true);
    });

    it('picks the first offer, and skips an empty draft', () => {
        const base = { source: 'fight' as const, upgradeFromCardId: null, deck: [] };
        expect(W.pickReward({ ...base, offers: ['x', 'y'] })).toEqual({ kind: 'card', cardId: 'x' });
        expect(W.pickReward({ ...base, offers: [] })).toEqual({ kind: 'skip' });
    });

    it('takes the first enabled rest option', () => {
        const base = { health: 5, maxHealth: 10, currency: 0, upgradableCardIds: ['u'], deck: [] };
        expect(W.chooseRest({ ...base, offers: [{ id: 'rest', cost: 0, enabled: true }, { id: 'upgrade', cost: 0, enabled: true }] }))
            .toEqual({ offer: 'rest' });
        expect(W.chooseRest({ ...base, offers: [{ id: 'rest', cost: 9, enabled: false }, { id: 'upgrade', cost: 0, enabled: true }] }))
            .toEqual({ offer: 'upgrade', cardId: 'u' });
    });

    it('rests at a village only when hurt, and buys nothing', () => {
        const base = { currency: 9, rest: { price: 1, enabled: true }, shop: [], removal: null, hasAnvil: false, deck: [] };
        expect(W.visitVillage({ ...base, health: 5, maxHealth: 10 })).toEqual({ rest: true, buy: [], remove: [] });
        expect(W.visitVillage({ ...base, health: 10, maxHealth: 10 }).rest).toBe(false);
    });

    it('fights greedy, never flees, raises heart, wears what it can', () => {
        const fight = { enemyName: 'x', isBoss: false, isElite: false, fleeAllowed: true, fledHere: 0, health: 1, maxHealth: 9, deck: [] };
        expect(W.fightPolicy(fight)).toBe(COMBAT_SIM_POLICIES.greedy);
        expect(W.flee(fight)).toBe(false);
        expect(W.hazardPolicy({ hazardId: 'h', health: 1, maxHealth: 9 })).toBe('greedy');
        expect(W.pickHazardCard({ offers: ['h1', 'h2'], canSkip: true })).toBe('h1');
        expect(W.raiseStat({ level: 2, baseStats: { heart: 1, body: 1, mind: 1 }, availableStatPoints: 1 })).toBe('heart');
        expect(W.takeItem({ itemId: 'r', category: 'relic', wearable: true })).toBe('equip');
        expect(W.takeItem({ itemId: 'p', category: 'consumable', wearable: false })).toBe('keep');
        expect(W.chooseCacheOffer({ cardCandidate: 'c', itemIds: [], currency: 0, deck: [] })).toBe('card');
    });
});
