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
