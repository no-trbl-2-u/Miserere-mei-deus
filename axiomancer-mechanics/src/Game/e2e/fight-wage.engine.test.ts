/**
 * Every win pays shillings, and foe loot stops (MR1a, A2): a victory pays XP
 * and 3 x the lead foe's level, on every difficulty, and no foe loot.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloatEye, GreenJelly } from '../../Enemy/enemy.library';
import { MERCY_TUNING } from '../../Combat/combat.mercy-check';
import type { Enemy } from '../../Enemy/types';
import { createGameStore } from '../store';
import { gameReducer } from '../game.reducer';
import { nullAdapter } from '../persistence/null.adapter';
import { setSeed } from '../../Utils/rng';

afterEach(() => vi.restoreAllMocks());

function foe(difficulty: Enemy['difficulty'], level: number): Enemy {
    return { ...FloatEye, difficulty, level, xpReward: 40 };
}

function win(enemy: Enemy, options?: { withholdSpoils?: boolean }) {
    const store = createGameStore(nullAdapter);
    store.getState().startCombat(enemy);
    const before = store.getState().player;
    const report = store.getState().endCombat('victory', undefined, options);
    return { report, before, after: store.getState().player };
}

describe('a won fight pays the wage', () => {
    const cases: Array<[Enemy['difficulty'], number, number]> = [
        ['simple', 1, 3],
        ['normal', 5, 15],
        ['elite', 7, 21],
        ['boss', 8, 24],
        ['unique', 10, 30],
    ];

    it.each(cases)('a %s foe of level %i pays XP and %i shillings, and no loot', (difficulty, level, shillings) => {
        setSeed(11);
        const { report, before, after } = win(foe(difficulty, level));
        expect(report.outcome).toBe('victory');
        expect(report.xpGained).toBe(40);
        expect(report.shillings).toBe(shillings);
        expect(report.loot).toEqual([]);
        expect(after.experience).toBe(before.experience + 40);
        expect(after.currency).toBe(before.currency + shillings);
        expect(after.inventory).toEqual(before.inventory);
    });

    it('a foe still carrying a dead loot table pays none of it', () => {
        const stale = { ...foe('normal', 5), loot: [{ item: { id: 'healing-potion' }, weight: 100 }] } as unknown as Enemy;
        const { report, before, after } = win(stale);
        expect(report.loot).toEqual([]);
        expect(after.inventory).toEqual(before.inventory);
    });

    it('pays on the lead foe alone', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat({ enemies: [foe('normal', 2), { ...GreenJelly, level: 9 }] });
        expect(store.getState().endCombat('victory').shillings).toBe(6);
    });

    it('the tuning table sets the number', () => {
        expect(MERCY_TUNING.shillingsPerLevel).toBe(3);
    });

    it('an elite whose relic took the XP still pays the wage', () => {
        const { report, before, after } = win(foe('elite', 5), { withholdSpoils: true });
        expect(report.xpGained).toBe(0);
        expect(report.shillings).toBe(15);
        expect(after.experience).toBe(before.experience);
        expect(after.currency).toBe(before.currency + 15);
    });

    it('a defeat and a flee pay nothing', () => {
        for (const outcome of ['defeat', 'flee'] as const) {
            const store = createGameStore(nullAdapter);
            store.getState().startCombat(foe('normal', 5));
            const before = store.getState().player;
            const report = store.getState().endCombat(outcome);
            expect(report.shillings).toBe(0);
            expect(store.getState().player.currency).toBe(before.currency);
        }
    });

    it('END_COMBAT dispatched with no grants pays the same', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(foe('normal', 5));
        const state = store.getState();
        const next = gameReducer(state, { type: 'END_COMBAT', payload: { outcome: 'victory' } });
        expect(next.player.experience).toBe(state.player.experience + 40);
        expect(next.player.currency).toBe(state.player.currency + 15);
        expect(next.player.inventory).toEqual(state.player.inventory);
    });
});
