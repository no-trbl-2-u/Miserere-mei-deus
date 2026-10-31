/**
 * A befriend pays no XP and either shillings or one potion, both scaled to the
 * foe's level, drawn from the seeded rng (BUG1j A10).
 */

import { describe, expect, it } from 'vitest';
import { FloatEye } from '../../Enemy/enemy.library';
import { BEFRIEND_TUNING, befriendPotionFor } from '../../Enemy/befriend';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { setSeed } from '../../Utils/rng';

function befriend(level: number, seed: number) {
    setSeed(seed);
    const store = createGameStore(nullAdapter);
    store.getState().startCombat({ ...FloatEye, level });
    const before = store.getState().player;
    const report = store.getState().endCombat('friendship');
    const after = store.getState().player;
    return { report, before, after };
}

describe('a befriend pays shillings or a potion, never XP', () => {
    it('a level-2 foe pays 6 shillings or a Minor Healing Potion over seeds, and 0 XP', () => {
        const paid = new Set<string>();
        for (let seed = 1; seed <= 40; seed++) {
            const { report, before, after } = befriend(2, seed);
            expect(report.outcome).toBe('friendship');
            expect(report.xpGained).toBe(0);
            expect(after.experience).toBe(before.experience);
            if (report.shillings > 0) {
                paid.add('shillings');
                expect(report.shillings).toBe(2 * BEFRIEND_TUNING.shillingsPerLevel);
                expect(report.shillings).toBe(6);
                expect(report.loot).toEqual([]);
                expect(after.currency).toBe(before.currency + 6);
            } else {
                paid.add('potion');
                expect(report.loot.map(i => i.id)).toEqual(['minor-healing-potion']);
                expect(after.currency).toBe(before.currency);
                expect(after.inventory.some(i => i.id === 'minor-healing-potion')).toBe(true);
            }
        }
        expect([...paid].sort()).toEqual(['potion', 'shillings']);
    });

    it('a seed reproduces the payout', () => {
        const a = befriend(2, 7).report;
        const b = befriend(2, 7).report;
        expect({ s: a.shillings, l: a.loot.map(i => i.id) }).toEqual({ s: b.shillings, l: b.loot.map(i => i.id) });
    });

    it('the potion follows the level tiers', () => {
        expect(befriendPotionFor(1).id).toBe('minor-healing-potion');
        expect(befriendPotionFor(4).id).toBe('minor-healing-potion');
        expect(befriendPotionFor(5).id).toBe('healing-potion');
        expect(befriendPotionFor(9).id).toBe('healing-potion');
        expect(befriendPotionFor(10).id).toBe('greater-healing-potion');
    });

    it('victory and flee are unchanged and pay no shillings', () => {
        setSeed(3);
        const store = createGameStore(nullAdapter);
        store.getState().startCombat({ ...FloatEye, level: 2 });
        const win = store.getState().endCombat('victory');
        expect(win.shillings).toBe(0);
        expect(win.xpGained).toBeGreaterThan(0);
        store.getState().startCombat({ ...FloatEye, level: 2 });
        expect(store.getState().endCombat('flee').shillings).toBe(0);
    });
});
