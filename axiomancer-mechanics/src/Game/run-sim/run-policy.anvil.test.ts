import { describe, expect, it } from 'vitest';

import { DIE_GEAR_COLORS } from '../../Character/dieGear.reducer';
import { CARD_LANES } from '../../Cards/card.lanes';
import { ANVIL_VERB_PRICING } from '../../World/Blacksmith';
import { anvilBudget, greedyAnvil, highestStat, randomAnvil } from './run-policy.anvil';
import { ARCHETYPE_POLICIES, DEFENDER_POLICY, ELEMENTALIST_POLICY } from './run-policy.archetypes';
import { PERSONA_POLICIES } from './run-policy.personas';
import type { RunAnvilContext } from './run-policy.types';
import { WANDERER_POLICY } from './run-policy.wanderer';

const stream = (seed: number) => {
    let x = seed;
    return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
};

const own = (laneId: string) => CARD_LANES.find(l => l.id === laneId)!.cardIds[0]!;
const grey = CARD_LANES.find(l => l.id === 'grey')!.cardIds[0]!;

const ctx = (over: Partial<RunAnvilContext> = {}): RunAnvilContext => ({
    health: 100, maxHealth: 100, currency: 30, bedPrice: 6,
    prices: { hone: ANVIL_VERB_PRICING.hone, temper: ANVIL_VERB_PRICING.temper, upgrade: ANVIL_VERB_PRICING.upgrade },
    upgradableCardIds: [grey, own('defender')], deck: [grey, own('defender')],
    baseStats: { heart: 1, body: 3, mind: 2 }, rng: stream(7), ...over,
});

describe('the greedy anvil helper', () => {
    it('keeps the bed back only under half VITAE', () => {
        expect(anvilBudget(ctx({ health: 49 }))).toBe(24);
        expect(anvilBudget(ctx({ health: 50 }))).toBe(30);
        expect(anvilBudget(ctx({ health: 10, bedPrice: null }))).toBe(30);
        expect(anvilBudget(ctx({ health: 10, currency: 4 }))).toBe(0);
    });

    it('upgrades its lane\'s card first when the budget reaches the price, else any card', () => {
        const d = greedyAnvil(ctx(), { inLane: id => id === own('defender'), firstColor: 'body' });
        expect(d.upgradeCardId).toBe(own('defender'));
        expect(greedyAnvil(ctx(), { firstColor: 'body' }).upgradeCardId).toBe(grey);
        const poor = greedyAnvil(ctx({ currency: ANVIL_VERB_PRICING.upgrade - 1 }), { firstColor: 'body' });
        expect(poor.upgradeCardId).toBeNull();
        expect(greedyAnvil(ctx({ upgradableCardIds: [] }), { firstColor: 'body' }).upgradeCardId).toBeNull();
    });

    it('works its favoured colour first and names each colour once', () => {
        const d = greedyAnvil(ctx(), { firstColor: 'mind' });
        expect(d.colors[0]).toBe('mind');
        expect([...d.colors].sort()).toEqual([...DIE_GEAR_COLORS].sort());
    });

    it('is shared: the lane bots favour their lane, the personas their highest stat', () => {
        const c = ctx();
        expect(DEFENDER_POLICY.visitAnvil(c).upgradeCardId).toBe(own('defender'));
        for (const p of ARCHETYPE_POLICIES) expect(p.visitAnvil(c).colors).toHaveLength(DIE_GEAR_COLORS.length);
        expect(ELEMENTALIST_POLICY.visitAnvil(c).budget).toBe(30);
        for (const p of PERSONA_POLICIES) expect(p.visitAnvil(c).colors[0]).toBe(highestStat(c.baseStats));
        expect(highestStat({ heart: 2, body: 2, mind: 2 })).toBe('heart');
    });
});

describe('the Wanderer\'s anvil', () => {
    it('is legal over many contexts, replays for a seed and differs across seeds', () => {
        const seen = new Set<string>();
        for (let seed = 1; seed <= 30; seed++) {
            const d = WANDERER_POLICY.visitAnvil(ctx({ rng: stream(seed) }));
            expect(WANDERER_POLICY.visitAnvil(ctx({ rng: stream(seed) }))).toEqual(d);
            expect(Number.isInteger(d.budget)).toBe(true);
            expect(d.budget).toBeGreaterThanOrEqual(0);
            expect(d.budget).toBeLessThanOrEqual(30);
            if (d.upgradeCardId !== null) expect(ctx().upgradableCardIds).toContain(d.upgradeCardId);
            expect([...d.colors].sort()).toEqual([...DIE_GEAR_COLORS].sort());
            seen.add(JSON.stringify(d));
        }
        expect(seen.size).toBeGreaterThan(5);
    });

    it('answers over an empty purse and an empty deck', () => {
        const d = randomAnvil(ctx({ currency: 0, upgradableCardIds: [], deck: [] }));
        expect(d.budget).toBe(0);
        expect(d.upgradeCardId).toBeNull();
    });
});
