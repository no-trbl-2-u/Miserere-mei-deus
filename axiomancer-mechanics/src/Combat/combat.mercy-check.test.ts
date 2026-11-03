/**
 * The mercy check: a normal foe, falling, may ask spare or finish.
 *
 * Pins: the chance lands near `MERCY_CHECK_CHANCE` over seeded fights; only a
 * `normal` foe can ask, and any other difficulty draws nothing from the rng; a
 * check rolls once and answers once; the win stays a win; and the Open Hand's
 * own choice, Exploit included, never asks again.
 */

import { describe, it, expect } from 'vitest';

import {
    MERCY_CHECK_CHANCE, chooseMercyCheck, mercyCheckSettled, rollMercyCheck,
} from './combat.mercy-check';
import { buildCombatSummary, initializeCombatEncounter, selectMercyChoice } from './combat.engine';
import type { CombatEncounterState } from './combat.encounter.types';
import { createCharacter } from '../Character';
import { FloatEye } from '../Enemy/enemy.library';
import type { EnemyDifficulty } from '../Enemy/types';

function seededRng(seed: number): () => number {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };
}

/** A fight against a foe of `difficulty`, just won. */
function won(difficulty: EnemyDifficulty | undefined): CombatEncounterState {
    const player = createCharacter({ name: 'Pilgrim', level: 3, baseStats: { heart: 8, body: 8, mind: 8 } });
    const fight = initializeCombatEncounter(player, { ...FloatEye, difficulty }, ['the-gleaners-due'], 7);
    return { ...fight, enemy: { ...fight.enemy, health: 0 }, phase: 'complete', finalOutcome: 'victory' };
}

describe('rollMercyCheck', () => {
    it('asks about as often as the chance, over seeded fights', () => {
        const rng = seededRng(144);
        const runs = 4000;
        let asked = 0;
        for (let i = 0; i < runs; i++) {
            if (rollMercyCheck(won('normal'), rng).mercyCheck === 'offered') asked++;
        }
        expect(asked / runs).toBeGreaterThan(MERCY_CHECK_CHANCE - 0.02);
        expect(asked / runs).toBeLessThan(MERCY_CHECK_CHANCE + 0.02);
    });

    it('splits at the chance: just under asks, at the chance does not', () => {
        expect(rollMercyCheck(won('normal'), () => MERCY_CHECK_CHANCE - 0.001).mercyCheck).toBe('offered');
        expect(rollMercyCheck(won('normal'), () => MERCY_CHECK_CHANCE).mercyCheck).toBe('none');
    });

    it.each(['simple', 'elite', 'boss', 'unique', undefined] as const)(
        'a %s foe never asks and draws nothing',
        (difficulty) => {
            let draws = 0;
            const rng = () => { draws++; return 0; };
            expect(rollMercyCheck(won(difficulty), rng).mercyCheck).toBe('none');
            expect(draws).toBe(0);
        },
    );

    it('draws exactly once for a normal foe', () => {
        let draws = 0;
        rollMercyCheck(won('normal'), () => { draws++; return 0.5; });
        expect(draws).toBe(1);
    });

    it('rolls once: a rolled fight is not rolled again', () => {
        const offered = rollMercyCheck(won('normal'), () => 0);
        expect(rollMercyCheck(offered, () => 1)).toBe(offered);
        const none = rollMercyCheck(won('normal'), () => 1);
        expect(rollMercyCheck(none, () => 0)).toBe(none);
    });

    it.each(['defeat', 'mercy', null] as const)('rolls nothing on a %s ending', (finalOutcome) => {
        const fight = { ...won('normal'), finalOutcome };
        expect(rollMercyCheck(fight, () => 0)).toBe(fight);
    });
});

describe('chooseMercyCheck', () => {
    it('marks the win spared or finished, and the outcome stays a victory', () => {
        const offered = rollMercyCheck(won('normal'), () => 0);
        const spared = chooseMercyCheck(offered, 'spare');
        const finished = chooseMercyCheck(offered, 'finish');
        expect(spared.mercyCheck).toBe('spared');
        expect(finished.mercyCheck).toBe('finished');
        expect(spared.finalOutcome).toBe('victory');
        expect(finished.finalOutcome).toBe('victory');
    });

    it('answers only an offered check', () => {
        const none = rollMercyCheck(won('normal'), () => 1);
        expect(chooseMercyCheck(none, 'spare')).toBe(none);
        const spared = chooseMercyCheck(rollMercyCheck(won('normal'), () => 0), 'spare');
        expect(chooseMercyCheck(spared, 'finish')).toBe(spared);
    });

    it('heads the summary as spared only when spared', () => {
        const offered = rollMercyCheck(won('normal'), () => 0);
        expect(buildCombatSummary(chooseMercyCheck(offered, 'spare')).headline).toMatch(/spared/);
        expect(buildCombatSummary(chooseMercyCheck(offered, 'finish')).headline).toMatch(/falls/);
    });
});

describe('mercyCheckSettled', () => {
    it('holds a win until the check is rolled and answered', () => {
        const unrolled = won('normal');
        expect(mercyCheckSettled(unrolled)).toBe(false);
        const offered = rollMercyCheck(unrolled, () => 0);
        expect(mercyCheckSettled(offered)).toBe(false);
        expect(mercyCheckSettled(chooseMercyCheck(offered, 'spare'))).toBe(true);
        expect(mercyCheckSettled(chooseMercyCheck(offered, 'finish'))).toBe(true);
        expect(mercyCheckSettled(rollMercyCheck(unrolled, () => 1))).toBe(true);
    });

    it('holds nothing on any other end, and a fight still going is not settled', () => {
        expect(mercyCheckSettled({ ...won('normal'), finalOutcome: 'defeat' })).toBe(true);
        expect(mercyCheckSettled({ ...won('normal'), finalOutcome: 'mercy' })).toBe(true);
        expect(mercyCheckSettled({ ...won('normal'), finalOutcome: null })).toBe(false);
    });
});

describe('the Open Hand beside the check', () => {
    it('an Exploit that kills is a win the check does not roll', () => {
        const player = createCharacter({ name: 'Pilgrim', level: 3, baseStats: { heart: 8, body: 8, mind: 8 } });
        const fight = initializeCombatEncounter(player, { ...FloatEye, difficulty: 'normal' }, ['the-gleaners-due'], 7);
        const open: CombatEncounterState = {
            ...fight, enemy: { ...fight.enemy, health: 1 }, phase: 'mercy-choice', mercyChoiceActive: true,
        };
        const after = selectMercyChoice(open, 'exploit').state;
        expect(after.finalOutcome).toBe('victory');
        expect(rollMercyCheck(after, () => 0).mercyCheck).toBe('none');
        expect(mercyCheckSettled(after)).toBe(true);
    });

    it('a spare through the Open Hand stays a mercy ending, with no check', () => {
        const player = createCharacter({ name: 'Pilgrim', level: 3, baseStats: { heart: 8, body: 8, mind: 8 } });
        const fight = initializeCombatEncounter(player, { ...FloatEye, difficulty: 'normal' }, ['the-gleaners-due'], 7);
        const open: CombatEncounterState = { ...fight, phase: 'mercy-choice', mercyChoiceActive: true };
        const after = selectMercyChoice(open, 'spare').state;
        expect(after.finalOutcome).toBe('mercy');
        expect(after.mercyCheck).toBeUndefined();
        expect(mercyCheckSettled(after)).toBe(true);
    });
});
