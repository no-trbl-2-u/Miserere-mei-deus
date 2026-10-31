/**
 * Hermetic e2e: a befriend threads through `createGameStore`.
 *
 * Every foe can be befriended and a befriend pays no XP: shillings or one
 * potion (`befriend-reward.engine.test.ts`). The Green Jelly keeps its
 * narrative and flag; the codex unlock rides the same path.
 */

import { describe, it, expect } from 'vitest';
import { FloatEye, GreenJelly } from '../../Enemy/enemy.library';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';

describe('Phase 60 — befriendable-enemy content arc', () => {
    it('FloatEye friendship omits report.friendshipReward — enemy has no authored reward', () => {
        // Regression guard: existing consumers that
        // destructure { outcome, xpGained, loot } continue to work; the
        // friendshipReward field is undefined for enemies without authoring.
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(FloatEye);

        const report = store.getState().endCombat('friendship');

        expect(report.outcome).toBe('friendship');
        expect(report.friendshipReward).toBeUndefined();
        expect(report.xpGained).toBe(0);
    });

    it('victory outcome does NOT thread friendshipReward content even when authored', () => {
        // The friendshipReward field surfaces ONLY on
        // outcome === 'friendship'. Defeat / victory / flee paths skip it.
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        const report = store.getState().endCombat('victory');

        expect(report.outcome).toBe('victory');
        expect(report.friendshipReward).toBeUndefined();
    });
});

describe('Phase 62 — quest-branch wire-in on outcome === friendship', () => {
    it('friendship outcome appends FriendshipReward.flagSet to state.flags (de-duped)', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        store.getState().endCombat('friendship');
        // First friendship sets the flag.
        expect(store.getState().flags).toContain('befriended-green-jelly');

        // Drive a second friendship encounter (same flag would be a no-op).
        store.getState().startCombat(GreenJelly);
        store.getState().endCombat('friendship');
        // De-duped: still exactly one occurrence.
        const matches = store.getState().flags.filter(f => f === 'befriended-green-jelly');
        expect(matches.length).toBe(1);
    });

    it('victory outcome does NOT set the friendship flag (only fires for outcome === friendship)', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        store.getState().endCombat('victory');
        expect(store.getState().flags).not.toContain('befriended-green-jelly');
    });
});

describe('Phase 102 — Befriendable-enemy Tier-2 expansion', () => {
    it('GreenJelly friendship threads its narrative and pays no XP', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);

        const report = store.getState().endCombat('friendship');
        expect(report.outcome).toBe('friendship');
        expect(report.xpGained).toBe(0);
        expect(report.friendshipReward?.narrative).toMatch(/jelly settles, slow as cooling wax/);
        expect(store.getState().flags).toContain('befriended-green-jelly');
    });
});
