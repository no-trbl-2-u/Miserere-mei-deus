/**
 * The sim's mercy check (chunk MR1d): a won fight's check is rolled and
 * answered as the panel would, by the policy's field, and a Spare pays through
 * `endCombat` the way the app does.
 */

import {
    CHARACTER_ROSTER,
    COMBAT_SIM_POLICIES,
    SPARE_ALL_WITNESS,
    createCharacter,
    getRunPolicy,
    initializeCombatEncounter,
    PLAYER_WITNESS,
    type CombatEncounterState,
} from '@mechanics';

import { FloatEye } from '@mechanics/Enemy/enemy.library';

import { playRun } from './run-driver';
import { answerMercyCheck } from './run-fight';

function won(mercyCheck?: CombatEncounterState['mercyCheck']): CombatEncounterState {
    const player = createCharacter({ name: 'Pilgrim', level: 3, baseStats: { heart: 8, body: 8, mind: 8 } });
    const fight = initializeCombatEncounter(player, { ...FloatEye, difficulty: 'normal' }, ['the-gleaners-due'], 7);
    return {
        ...fight, enemy: { ...fight.enemy, health: 0 }, phase: 'complete', finalOutcome: 'victory',
        ...(mercyCheck ? { mercyCheck } : {}),
    };
}

describe('answerMercyCheck', () => {
    it('spares an offered check for spare-all, and finishes it for the player witness', () => {
        expect(answerMercyCheck(won('offered'), SPARE_ALL_WITNESS).mercyCheck).toBe('spared');
        expect(answerMercyCheck(won('offered'), PLAYER_WITNESS).mercyCheck).toBe('finished');
    });

    it('leaves a fight with no check alone, whatever the policy', () => {
        expect(answerMercyCheck(won('none'), SPARE_ALL_WITNESS).mercyCheck).toBe('none');
    });

    it('rolls the check on a fresh win and settles it', () => {
        const answered = answerMercyCheck(won(), SPARE_ALL_WITNESS);
        expect(['none', 'spared']).toContain(answered.mercyCheck);
    });

    it('never touches a defeat', () => {
        const lost = { ...won(), finalOutcome: 'defeat' as const };
        expect(answerMercyCheck(lost, COMBAT_SIM_POLICIES.greedy).mercyCheck).toBeUndefined();
    });
});

describe('a run with the check answered', () => {
    it('counts each fired check as spared or finished',() => {
        const roster = CHARACTER_ROSTER;
        const spare = playRun({ policy: policyOf('spare-all'), seed: 3, roster });
        expect(spare.mercy.checks).toBe(spare.mercy.spared);
        expect(spare.mercy.finished).toBe(0);
        expect(spare.fights.spared).toBe(spare.mercy.spared);
        const rolled = Object.values(spare.mercy.table).reduce((a, b) => a + (b ?? 0), 0);
        expect(rolled).toBe(spare.mercy.spared);
        const finish = playRun({ policy: policyOf('finish-all'), seed: 3, roster });
        expect(finish.mercy.spared).toBe(0);
        expect(finish.mercy.checks).toBe(finish.mercy.finished);
        expect(finish.fights.spared).toBe(0);
        // The ledger behind the spare-all / finish-all comparison: both pay shillings, and a Spare forgoes its fight's XP.
        expect(spare.mercy.shillings).toBeGreaterThan(0);
        expect(finish.mercy.shillings).toBeGreaterThan(0);
        // One seed's two runs diverge (a Spare changes what you meet next), so the XP is read over several.
        const xpOver = (id: 'spare-all' | 'finish-all') => [1, 2, 3, 4, 5, 6]
            .reduce((sum, seed) => sum + playRun({ policy: policyOf(id), seed, roster }).mercy.xp, 0);
        expect(xpOver('finish-all')).toBeGreaterThan(xpOver('spare-all'));
    });
});

function policyOf(id: string) {
    const policy = getRunPolicy(id);
    if (!policy) throw new Error(`no run policy '${id}'`);
    return policy;
}
