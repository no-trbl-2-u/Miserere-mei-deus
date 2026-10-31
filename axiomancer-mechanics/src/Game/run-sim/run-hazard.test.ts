import { describe, expect, it } from 'vitest';

import {
    createHazardSession,
    discardHazardCard,
    finishHazardRolling,
    powerHazardCard,
    resolveHazardRound,
    continueHazardAfterResolve,
    selectHazardRoute,
    stageHazardCard,
} from '../../World/Hazard/hazard.engine';
import { hazardStarterBag } from '../../World/Hazard/hazard.deck-flags';
import type { HazardPolicyId } from '../../World/Hazard/hazard.sim';
import type { HazardSessionState } from '../../World/Hazard/hazard.types';
import { hazardRouteFor, nextHazardStep } from './run-hazard';

const POLICIES: readonly HazardPolicyId[] = ['greedy', 'conservative', 'opportunist'];

/** Play a whole crossing one tap at a time, as the run driver does. */
function cross(seed: number, policy: HazardPolicyId): { s: HazardSessionState; taps: number } {
    const bag = hazardStarterBag();
    let s = createHazardSession(seed, bag, 'fever-rot');
    s = finishHazardRolling(selectHazardRoute(s, hazardRouteFor(policy), bag));
    let taps = 0;
    while (s.phase === 'playing') {
        const step = nextHazardStep(s, policy);
        let next: HazardSessionState;
        if (step.kind === 'stage') next = stageHazardCard(s, step.uid, bag);
        else if (step.kind === 'power') next = powerHazardCard(s, step.uid, step.dieId, bag);
        else if (step.kind === 'discard') next = discardHazardCard(s, step.uid);
        else next = continueHazardAfterResolve(resolveHazardRound(s, bag), bag);
        expect(next).not.toBe(s);
        s = next;
        taps++;
        expect(taps).toBeLessThan(400);
    }
    return { s, taps };
}

/** A playing session in round 1 with a hand, play area, dice and momentum set by hand. */
function fixture(over: {
    route?: 'safe' | 'risk';
    hand?: string[];
    play?: { cardId: string; dieId?: string }[];
    dice?: { kind: 'red' | 'blue' | 'purple' | 'gold' | 'hex'; state?: 'available' | 'spent' }[];
    force?: number;
    escape?: number;
}): HazardSessionState {
    const bag = hazardStarterBag();
    const route = over.route ?? 'safe';
    const base = finishHazardRolling(selectHazardRoute(createHazardSession(1, bag, 'fever-rot'), route, bag));
    return {
        ...base,
        route,
        round: 1,
        hand: (over.hand ?? []).map((cardId, i) => ({ uid: `h${i}`, cardId, dieId: null })),
        play: (over.play ?? []).map((p, i) => ({ uid: `p${i}`, cardId: p.cardId, dieId: p.dieId ?? null })),
        dice: (over.dice ?? []).map((d, i) => ({ id: `d${i}`, kind: d.kind, state: d.state ?? 'available' })),
        progressBase: { force: over.force ?? 0, escape: over.escape ?? 0 },
    };
}

describe('nextHazardStep on fixture rounds', () => {
    it('fires a draw utility first, under every policy', () => {
        for (const policy of POLICIES) {
            expect(nextHazardStep(fixture({ hand: ['haul', 'footing'] }), policy)).toEqual({ kind: 'stage', uid: 'h1' });
        }
    });

    it('reads the route: on the safe meter equal cards tie to the first, on the risk meters the open gap wins', () => {
        expect(nextHazardStep(fixture({ hand: ['haul', 'scram'] }), 'greedy')).toEqual({ kind: 'stage', uid: 'h0' });
        // Risk round 1 needs 10 force and 8 escape; force is met, so SCRAMBLE moves more.
        expect(nextHazardStep(fixture({ route: 'risk', hand: ['haul', 'scram'], force: 10 }), 'greedy'))
            .toEqual({ kind: 'stage', uid: 'h1' });
    });

    it('converts a hex die only when a plain card of its colour is held (greedy), always (opportunist), never (conservative)', () => {
        // No plain purple card is held, so only the opportunist converts; the others stage IRON GRIP (5) for value.
        const hex = { hand: ['windread', 'grip'], dice: [{ kind: 'hex' as const }] };
        expect(nextHazardStep(fixture(hex), 'greedy')).toEqual({ kind: 'stage', uid: 'h1' });
        expect(nextHazardStep(fixture(hex), 'opportunist')).toEqual({ kind: 'stage', uid: 'h0' });
        expect(nextHazardStep(fixture(hex), 'conservative')).toEqual({ kind: 'stage', uid: 'h1' });
    });

    it('scraps a dead card, and the greedy scraps a stale recast', () => {
        const dead = fixture({ hand: ['crack'], play: [{ cardId: 'haul' }], force: 100 });
        for (const policy of POLICIES) expect(nextHazardStep(dead, policy)).toEqual({ kind: 'discard', uid: 'h0' });
        // BALANCE POLE stages for its value first; once the meter is full it is a stale recast.
        expect(nextHazardStep(fixture({ hand: ['pole'], play: [{ cardId: 'haul' }], force: 100 }), 'greedy'))
            .toEqual({ kind: 'stage', uid: 'h0' });
    });

    it('powers a staged card while short, with an exact die or (not conservative) the gold one', () => {
        const short = { play: [{ cardId: 'haul' }], dice: [{ kind: 'red' as const }] };
        expect(nextHazardStep(fixture(short), 'greedy')).toEqual({ kind: 'power', uid: 'p0', dieId: 'd0' });
        expect(nextHazardStep(fixture(short), 'conservative')).toEqual({ kind: 'power', uid: 'p0', dieId: 'd0' });
        const gold = { play: [{ cardId: 'haul' }], dice: [{ kind: 'gold' as const }] };
        expect(nextHazardStep(fixture(gold), 'greedy')).toEqual({ kind: 'power', uid: 'p0', dieId: 'd0' });
        expect(nextHazardStep(fixture(gold), 'conservative')).toEqual({ kind: 'resolve' });
        // A spent die powers nothing.
        expect(nextHazardStep(fixture({ play: [{ cardId: 'haul' }], dice: [{ kind: 'red', state: 'spent' }] }), 'greedy'))
            .toEqual({ kind: 'resolve' });
    });

    it('stops spending once the round is met (greedy) or once one card is powered (conservative); the opportunist spends anyway', () => {
        const met = { play: [{ cardId: 'haul' }], dice: [{ kind: 'red' as const }], force: 100 };
        expect(nextHazardStep(fixture(met), 'greedy')).toEqual({ kind: 'resolve' });
        expect(nextHazardStep(fixture(met), 'opportunist')).toEqual({ kind: 'power', uid: 'p0', dieId: 'd0' });
        const onePowered = { play: [{ cardId: 'haul', dieId: 'x' }, { cardId: 'grip' }], dice: [{ kind: 'red' as const }] };
        expect(nextHazardStep(fixture(onePowered), 'conservative')).toEqual({ kind: 'resolve' });
        expect(nextHazardStep(fixture(onePowered), 'greedy')).toEqual({ kind: 'power', uid: 'p1', dieId: 'd0' });
    });

    it('the conservative stages only high-value cards, at most three, and else stages the first card to be judged', () => {
        // On risk with force met, IRON GRIP is worth 2 there: below the conservative's floor of 3.
        const low = fixture({ route: 'risk', hand: ['grip'], force: 10 });
        expect(nextHazardStep(low, 'greedy')).toEqual({ kind: 'stage', uid: 'h0' });
        expect(nextHazardStep(low, 'conservative')).toEqual({ kind: 'stage', uid: 'h0' });
        const full = fixture({ hand: ['grip'], play: [{ cardId: 'haul' }, { cardId: 'haul' }, { cardId: 'haul' }], force: 100 });
        expect(nextHazardStep(full, 'greedy')).toEqual({ kind: 'stage', uid: 'h0' });
        expect(nextHazardStep(full, 'conservative')).toEqual({ kind: 'resolve' });
        expect(nextHazardStep(fixture({}), 'greedy')).toEqual({ kind: 'resolve' });
    });
});

describe('nextHazardStep', () => {
    it('routes the opportunist by risk and the others by safe', () => {
        expect(hazardRouteFor('greedy')).toBe('safe');
        expect(hazardRouteFor('conservative')).toBe('safe');
        expect(hazardRouteFor('opportunist')).toBe('risk');
    });

    it.each(POLICIES)('%s crosses a whole hazard with legal taps only', (policy) => {
        for (const seed of [1, 2, 3, 4, 5]) {
            const { s } = cross(seed, policy);
            expect(['outcome', 'rewards', 'done']).toContain(s.phase);
            expect(s.outcome).not.toBeNull();
        }
    });

    it('is deterministic: the same seed and policy tap the same way', () => {
        expect(cross(9, 'greedy').taps).toBe(cross(9, 'greedy').taps);
    });
});
