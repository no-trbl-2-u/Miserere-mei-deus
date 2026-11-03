/**
 * The mercy check as a policy field: every witness answers it, the two
 * comparison policies differ in nothing else, and the witnesses pay Finish but
 * for the Merciful lane bot, which spares.
 */

import { describe, it, expect } from 'vitest';

import { COMBAT_SIM_POLICIES } from '../../Combat/combat.sim-policies';
import { PLAYER_WITNESS, SPARE_ALL_WITNESS } from './player-witness';
import { getRunPolicy, RUN_POLICY_IDS } from './run-policy.registry';
import { laneFightPolicy } from './run-policy.fight';
import type { RunFightContext } from './run-policy.types';

const CTX: RunFightContext = {
    enemyName: 'Float Eye', isBoss: false, isElite: false, fleeAllowed: true, fledHere: 0,
    health: 20, maxHealth: 20, deck: [],
};

describe('the mercy check policy field', () => {
    it('every witness finishes but the Merciful lane bot, which spares', () => {
        for (const policy of Object.values(COMBAT_SIM_POLICIES)) expect(policy.mercyCheck).toBe('finish');
        for (const lane of ['blood-price', 'defender', 'elementalist', 'other']) {
            expect(laneFightPolicy(lane).mercyCheck).toBe('finish');
        }
        expect(laneFightPolicy('merciful').mercyCheck).toBe('spare');
        expect(PLAYER_WITNESS.mercyCheck).toBe('finish');
    });

    it('spare-all and finish-all are run policies, answering the check as named', () => {
        expect(RUN_POLICY_IDS).toEqual(expect.arrayContaining(['spare-all', 'finish-all']));
        expect(getRunPolicy('spare-all')?.fightPolicy(CTX).mercyCheck).toBe('spare');
        expect(getRunPolicy('finish-all')?.fightPolicy(CTX).mercyCheck).toBe('finish');
    });

    it('the Open Hand is treated alike in both arms: off', () => {
        const { mercyCheck: spareAnswer, name: _n, description: _d, ...spare } = SPARE_ALL_WITNESS;
        const { mercyCheck: finishAnswer, name: _n2, description: _d2, ...finish } = PLAYER_WITNESS;
        expect(spare).toEqual(finish);
        expect([spareAnswer, finishAnswer]).toEqual(['spare', 'finish']);
        expect(PLAYER_WITNESS.signatureKinds).not.toContain('mercy');
    });
});
