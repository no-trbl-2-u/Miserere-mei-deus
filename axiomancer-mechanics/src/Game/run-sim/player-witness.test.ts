/**
 * The player witness (phase SM2b, A6): the greedy witness that never spares,
 * while the greedy witness `measured-truth` plays stays as it was.
 */

import { describe, expect, it } from 'vitest';

import { COMBAT_SIM_POLICIES } from '../../Combat/combat.sim-policies';
import { PLAYER_WITNESS } from './player-witness';
import { WANDERER_POLICY } from './run-policy.wanderer';

const greedy = COMBAT_SIM_POLICIES.greedy;

describe('PLAYER_WITNESS', () => {
    it('never funds the mercy signature and exploits every opening', () => {
        expect(PLAYER_WITNESS.signatureKinds).not.toContain('mercy');
        expect(PLAYER_WITNESS.mercyChoice).toBe('exploit');
    });

    it('is greedy otherwise: the same card ranking, threshold and every other signature', () => {
        expect(PLAYER_WITNESS.rankCard).toBe(greedy.rankCard);
        expect(PLAYER_WITNESS.convictionThreshold).toBe(greedy.convictionThreshold);
        expect([...PLAYER_WITNESS.signatureKinds]).toEqual(greedy.signatureKinds.filter((k) => k !== 'mercy'));
    });

    it('leaves the greedy witness as measured truth plays it', () => {
        expect(greedy.mercyChoice).toBe('spare');
        expect(greedy.signatureKinds).toContain('mercy');
        expect(PLAYER_WITNESS).not.toBe(greedy);
    });

    it('is what the wanderer fights with', () => {
        const fight = { enemyName: 'x', isBoss: false, isElite: false, fleeAllowed: true, fledHere: 0, health: 9, maxHealth: 9, deck: [] };
        expect(WANDERER_POLICY.fightPolicy(fight)).toBe(PLAYER_WITNESS);
    });
});
