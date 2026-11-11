/**
 * The victory screen's view model (phase FE1a, spec 176 A2): the paid line, the
 * level panel's settled line and the XP bar's fills and "LEVEL n" beats, for no
 * level, one level, two at once, a level reached exactly and XP withheld, on
 * the engine's own curve.
 */

import { describe, expect, it } from '@jest/globals';
import { experienceForLevel } from '@mechanics';

import {
    FIGHT_END_TIMING,
    fightPaidFrom,
    levelFraction,
    selectFightEndVM,
    xpBarSteps,
} from '@/state/presenters/fight-end.engine';

/** The record of a settle from (level, xp) before to (level, xp) after. */
function paid(before: [number, number], after: [number, number], shillings = 6) {
    return fightPaidFrom(
        { level: before[0], experience: before[1] },
        { level: after[0], experience: after[1] },
        shillings,
    );
}

describe('the curve the bar reads', () => {
    it('is the engine curve: level 2 at 70, 3 at 147, 5 at 325', () => {
        expect(experienceForLevel(1)).toBe(0);
        expect(experienceForLevel(2)).toBe(70);
        expect(experienceForLevel(3)).toBe(147);
        expect(experienceForLevel(5)).toBe(325);
    });

    it('a fraction is the place through one level', () => {
        expect(levelFraction(0, 1)).toBe(0);
        expect(levelFraction(35, 1)).toBe(0.5);
        expect(levelFraction(70, 2)).toBe(0);
        expect(levelFraction(70 + 77, 2)).toBe(1);
    });
});

describe('the settle record', () => {
    it('XP gained is experience after minus before, and the XP owed reads the curve', () => {
        const p = paid([1, 10], [1, 40]);
        expect(p).toEqual({
            shillings: 6, xpGained: 30, experienceBefore: 10, experienceAfter: 40,
            levelBefore: 1, levelAfter: 1, xpToNext: 30,
        });
    });

    it('with no player it pays only the shillings', () => {
        expect(fightPaidFrom(undefined, undefined, 4)).toMatchObject({ shillings: 4, xpGained: 0 });
    });
});

describe('no level', () => {
    const vm = selectFightEndVM(paid([1, 10], [1, 40]));

    it('one fill from the place before to the place after, no beat', () => {
        expect(vm.bar).toEqual([{
            level: 1, from: 10 / 70, to: 40 / 70, endsFull: false, levelBeat: null, fillMs: FIGHT_END_TIMING.fillMs,
        }]);
        expect(vm.settledFraction).toBe(40 / 70);
    });

    it('the paid line and the XP owed', () => {
        expect(vm.paidLine).toBe('Shillings +6 · XP +30');
        expect(vm.leveled).toBe(false);
        expect(vm.levelLine).toBe('30 XP to level 2');
    });
});

describe('one level', () => {
    const vm = selectFightEndVM(paid([1, 50], [2, 90]));

    it('fills to full, beats LEVEL 2, then a fresh bar fills with the rest', () => {
        expect(vm.bar).toEqual([
            { level: 1, from: 50 / 70, to: 1, endsFull: true, levelBeat: 'LEVEL 2', fillMs: FIGHT_END_TIMING.fillMs },
            { level: 2, from: 0, to: 20 / 77, endsFull: false, levelBeat: null, fillMs: FIGHT_END_TIMING.fillMs },
        ]);
    });

    it('settles on the level reached', () => {
        expect(vm.leveled).toBe(true);
        expect(vm.level).toBe(2);
        expect(vm.levelLine).toBe('LEVEL 2');
        expect(vm.paidLine).toBe('Shillings +6 · XP +40');
    });
});

describe('two levels at once', () => {
    const after = experienceForLevel(3) + 10;
    const vm = selectFightEndVM(paid([1, 60], [3, after]));

    it('repeats the step: full, LEVEL 2, full, LEVEL 3, a fresh bar with the rest', () => {
        expect(vm.bar.map((s) => [s.level, s.from, s.to, s.levelBeat])).toEqual([
            [1, 60 / 70, 1, 'LEVEL 2'],
            [2, 0, 1, 'LEVEL 3'],
            [3, 0, levelFraction(after, 3), null],
        ]);
        expect(vm.levelLine).toBe('LEVEL 3');
        expect(vm.xpGained).toBe(after - 60);
    });
});

describe('a level reached exactly', () => {
    const vm = selectFightEndVM(paid([1, 40], [2, 70]));

    it('the fresh bar stays empty', () => {
        expect(vm.bar).toHaveLength(2);
        expect(vm.bar[0]).toMatchObject({ to: 1, endsFull: true, levelBeat: 'LEVEL 2' });
        expect(vm.bar[1]).toEqual({ level: 2, from: 0, to: 0, endsFull: false, levelBeat: null, fillMs: 0 });
        expect(vm.settledFraction).toBe(0);
        expect(vm.levelLine).toBe('LEVEL 2');
    });
});

describe('XP withheld (an elite relic)', () => {
    const vm = selectFightEndVM(paid([2, 100], [2, 100], 9));

    it('the bar stands still and the panel says the XP owed', () => {
        expect(vm.bar).toEqual([{
            level: 2, from: 30 / 77, to: 30 / 77, endsFull: false, levelBeat: null, fillMs: 0,
        }]);
        expect(vm.levelLine).toBe(`${experienceForLevel(3) - 100} XP to level 3`);
    });

    it('the paid line leaves the XP half off', () => {
        expect(vm.paidLine).toBe('Shillings +9');
    });
});

describe('the timing block', () => {
    it('one fill about 0.8 s and the LEVEL hold about 1 s', () => {
        expect(FIGHT_END_TIMING.fillMs).toBe(800);
        expect(FIGHT_END_TIMING.levelHoldMs).toBe(1000);
        expect(xpBarSteps(paid([1, 0], [1, 0]))[0]!.fillMs).toBe(0);
    });
});
