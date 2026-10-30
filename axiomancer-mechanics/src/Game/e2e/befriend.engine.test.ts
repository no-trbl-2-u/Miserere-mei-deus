/**
 * Hermetic e2e — befriendable-enemy content arc.
 *
 * Drives a friendship outcome for the Green Jelly end-to-end
 * through `createGameStore`, asserts the per-enemy `friendshipReward`
 * threads through `store.endCombat()`:
 *
 *   - items append to `report.loot`
 *   - xpBonus adds to `report.xpGained` on top of the half-XP base
 *   - narrative surfaces on `report.friendshipReward.narrative`
 *
 * The half-XP base is preserved.
 *
 * Combat is now decoupled from the store: `endCombat(outcome)` takes the
 * resolved outcome directly (the Hazard-Pattern engine decides eligibility
 * outside the store), so the reward-threading assertions are driven by
 * calling `endCombat('friendship')` / `endCombat('victory')` directly.
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
        // The base still computes: half-XP only; no xpBonus applied.
        // Base half-XP for FloatEye (level 1, normal: 1 * 20 / 2 = 10).
        expect(report.xpGained).toBe(10);
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
    it('GreenJelly friendship threads its normal-tier reward', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);

        const report = store.getState().endCombat('friendship');
        expect(report.outcome).toBe('friendship');
        expect(report.loot.some(item => item.id === 'healing-potion')).toBe(true);
        expect(report.xpGained).toBe(Math.floor(5 * 20 * 0.5) + 35); // base half-XP (normal, level 5) + 35 bonus
        expect(report.friendshipReward?.narrative).toMatch(/jelly settles, slow as cooling wax/);
        expect(store.getState().flags).toContain('befriended-green-jelly');
    });
});
