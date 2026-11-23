/**
 * The sim's mercy check (chunk MR1d, moved to the lethal blow by MR6a): the
 * engine asks at the blow, the sim answers as the panel would, by the policy's
 * field, and a Spare pays through `endCombat` the way the app does.
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
import { answerMercyCheck, damagePctOf } from './run-fight';

function fight(): CombatEncounterState {
    const player = createCharacter({ name: 'Pilgrim', level: 3, baseStats: { heart: 8, body: 8, mind: 8 } });
    return initializeCombatEncounter(player, { ...FloatEye, difficulty: 'normal' }, ['the-gleaners-due'], 7);
}

/** A fight the lethal blow paused on the check: the foe at 1 VITAE, nothing ended. */
function asked(): CombatEncounterState {
    const f = fight();
    return { ...f, enemy: { ...f.enemy, health: 1 }, phase: 'mercy-check', mercyCheck: 'offered', mercyBlowVitae: 0 };
}

/** A fight the blow ended with no check. */
function won(mercyCheck: CombatEncounterState['mercyCheck'] = 'none'): CombatEncounterState {
    const f = fight();
    return { ...f, enemy: { ...f.enemy, health: 0 }, phase: 'complete', finalOutcome: 'victory', mercyCheck };
}

describe('damagePctOf', () => {
    it('reads the share of VITAE gone, to one decimal, clamped to 0 through 100', () => {
        expect(damagePctOf({ health: 100, maxHealth: 100 })).toBe(0);
        expect(damagePctOf({ health: 25, maxHealth: 80 })).toBe(68.8);
        expect(damagePctOf({ health: 0, maxHealth: 80 })).toBe(100);
        expect(damagePctOf({ health: -12, maxHealth: 80 })).toBe(100);
        expect(damagePctOf({ health: 90, maxHealth: 80 })).toBe(0);
        expect(damagePctOf({ health: 0, maxHealth: 0 })).toBe(0);
    });
});

describe('answerMercyCheck', () => {
    it('spares an open check for spare-all, and finishes it for the player witness', () => {
        const spared = answerMercyCheck(asked(), SPARE_ALL_WITNESS);
        expect(spared.mercyCheck).toBe('spared');
        expect(spared.finalOutcome).toBe('victory');
        expect(spared.enemy.health).toBe(1);
        const finished = answerMercyCheck(asked(), PLAYER_WITNESS);
        expect(finished.mercyCheck).toBe('finished');
        expect(finished.finalOutcome).toBe('victory');
        expect(finished.enemy.health).toBe(0);
    });

    it('leaves a fight with no check alone, whatever the policy', () => {
        const killed = won('none');
        expect(answerMercyCheck(killed, SPARE_ALL_WITNESS)).toBe(killed);
    });

    it('leaves a fight still going alone', () => {
        const going = fight();
        expect(answerMercyCheck(going, SPARE_ALL_WITNESS)).toBe(going);
    });

    it('never touches a defeat', () => {
        const lost = { ...fight(), phase: 'complete' as const, finalOutcome: 'defeat' as const };
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
        // A seed where either run loses a fight is left out: a death cuts that run's XP for a reason that is not the Spare.
        const seeds = [1, 2, 3, 4, 5, 6].map((seed) => ({
            spare: playRun({ policy: policyOf('spare-all'), seed, roster }),
            finish: playRun({ policy: policyOf('finish-all'), seed, roster }),
        })).filter(({ spare: s, finish: f }) => s.fights.lost === 0 && f.fights.lost === 0);
        expect(seeds.length).toBeGreaterThan(0);
        const xpOver = (pick: 'spare' | 'finish') => seeds.reduce((sum, run) => sum + run[pick].mercy.xp, 0);
        expect(xpOver('finish')).toBeGreaterThan(xpOver('spare'));
    });
});

function policyOf(id: string) {
    const policy = getRunPolicy(id);
    if (!policy) throw new Error(`no run policy '${id}'`);
    return policy;
}
