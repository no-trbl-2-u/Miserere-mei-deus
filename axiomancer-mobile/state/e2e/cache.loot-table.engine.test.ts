/**
 * Hermetic E2E — loot-cache-choice reward depth (the three-offer engine).
 *
 * Proves `beginLootCacheChoice({ tier })` rolls a real engine-truth reward
 * set (`rollCacheReward`) into `itemCandidates` at session creation, that
 * the roll is level-agnostic and tier-scaled, and that the candidates
 * survive the `item` offer's full choose → claim flow into the inventory.
 * Seeded; no timers, no network.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { GameState } from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { __AXM_CACHE_SEED__?: number }).__AXM_CACHE_SEED__;
});

function makeStoreAndActions(): { store: AppStore; actions: AppActions } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    return { store, actions: createAppActions(store) };
}

function setLevel(store: AppStore, level: number): void {
    const player = (store.getState() as unknown as GameState).player;
    store.setState({ player: { ...player, level } } as never);
}

describe('cache loot-table reward depth', () => {
    it('rolls a real engine-truth item candidate set on begin', () => {
        const { store, actions } = makeStoreAndActions();
        setLevel(store, 20);

        expect(actions.beginLootCacheChoice({ tier: 'rich', currency: 10, seed: 99 })).toBe(true);
        const s = store.getState().cache!.session!;
        expect(s.itemCandidates.length).toBeGreaterThan(0);
    });

    it('claims the rolled item candidates into the inventory via the item offer', () => {
        const { store, actions } = makeStoreAndActions();
        setLevel(store, 20);
        const before = store.getState() as unknown as GameState;
        const beforeInv = before.player.inventory.length;

        actions.beginLootCacheChoice({ tier: 'rich', currency: 5, seed: 99 });
        const candidateCount = store.getState().cache!.session!.itemCandidates.length;
        expect(candidateCount).toBeGreaterThan(0);

        actions.chooseLootCacheChoiceOffer('item');
        const result = actions.claimLootCacheChoiceOutcome();
        expect(result.applied).toBe(true);
        expect(result.outcome?.items.length).toBe(candidateCount);

        const after = store.getState() as unknown as GameState;
        expect(after.player.inventory.length).toBe(beforeInv + candidateCount);
        // The Reliquary yields consumables, and now and then one lane weapon or armor.
        const added = after.player.inventory.slice(beforeInv);
        expect(added.every((i) => i.category === 'consumable' || (i.category === 'equipment' && i.slot !== 'relic'))).toBe(true);
    });

    it('yields consumables at any level (Phase 21 — no level gate on the reward roll)', () => {
        const { store, actions } = makeStoreAndActions();
        setLevel(store, 0);

        actions.beginLootCacheChoice({ tier: 'modest', currency: 8, seed: 5 });
        const candidates = store.getState().cache!.session!.itemCandidates;
        // The consumable reward roll is level-agnostic — a modest cache still
        // yields 1–2 consumables even at level 0.
        expect(candidates.length).toBeGreaterThan(0);
    });

    it('defaults to the modest tier when none is requested', () => {
        const { store, actions } = makeStoreAndActions();
        setLevel(store, 10);
        actions.beginLootCacheChoice({ currency: 8, seed: 5 });
        // Modest tier rolls 1-2 consumables (CACHE_REWARD_TUNING) — never empty;
        // a lane piece, when the cache holds one, comes on top.
        const candidates = store.getState().cache!.session!.itemCandidates.filter((i) => i.category === 'consumable');
        expect(candidates.length).toBeGreaterThanOrEqual(1);
        expect(candidates.length).toBeLessThanOrEqual(2);
    });
});
