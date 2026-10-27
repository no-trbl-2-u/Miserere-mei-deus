/**
 * Hermetic E2E Tests — Debug seed action.
 *
 * Drives `actions.debugSeed()` end-to-end through the engine store
 * and asserts on the resulting `GameState`: inventory gains items
 * across categories, knownCards gains fixture ids, current map
 * resets to its starting node with cleared discovered/consumed
 * sets.
 *
 * Hermetic = self-contained + deterministic + isolated.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { relicLibrary } from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { COMBAT_CARDS } from '@/state/selectors/combat-cards';

afterEach(() => {
    jest.restoreAllMocks();
});

function makeStore() {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const actions = createAppActions(store);
    return { store, actions };
}

describe('debugSeed: items + cards + map reset', () => {
    it('seeds the inventory with at least one item per represented category', () => {
        const { store, actions } = makeStore();

        const before = store.getState().player.inventory ?? [];
        // A fresh game holds no items beyond any signet relics.
        expect(before.filter((i: { id: string }) => !i.id.startsWith('relic-'))).toHaveLength(0);

        const result = actions.debugSeed();

        const after = store.getState().player.inventory ?? [];
        expect(after.length).toBeGreaterThanOrEqual(2);
        // One consumable + the first relic of each slot the library fills
        // (the Suppliant's Ring alone: a relic).
        const categories = new Set(after.map((i: { category: string }) => i.category));
        expect(categories.has('consumable')).toBe(true);
        expect(categories.has('equipment')).toBe(true);
        const equipmentSlots = new Set(
            after
                .filter((i: { category: string }) => i.category === 'equipment')
                .map((i) => (i as { slot?: string }).slot),
        );
        expect(equipmentSlots).toEqual(new Set(relicLibrary.map((r) => r.slot)));

        expect(result.itemsAdded).toBe(1 + equipmentSlots.size);
    });

    it('teaches at least 2 cards covering both fixture categories', () => {
        const { store, actions } = makeStore();

        const before = store.getState().player.knownCards ?? [];
        expect(before).toHaveLength(0);

        const result = actions.debugSeed();

        const after = store.getState().player.knownCards ?? [];
        expect(after.length).toBeGreaterThanOrEqual(2);

        const learnedCards = COMBAT_CARDS.filter((s) =>
            after.includes(s.id),
        );
        expect(learnedCards.length).toBeGreaterThanOrEqual(2);

        expect(result.cardsLearned).toBeGreaterThanOrEqual(2);
    });

    it('resets the current map back to its starting node with cleared discovered/consumed sets', () => {
        const { store, actions } = makeStore();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const before = (store.getState() as any).world;
        expect(before).toBeDefined();
        expect(before.currentMap).toBeDefined();
        const startingNodeId = before.currentMap.currentNode;

        // Move the player off the starting node so the reset is observable.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        store.setState({
            world: {
                ...before,
                currentMap: {
                    ...before.currentMap,
                    currentNode: 'nf-2',
                    discoveredNodes: ['nf-2', 'nf-3'],
                    consumedNodes: ['nf-1'],
                },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = actions.debugSeed();
        expect(result.mapReset).toBe(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const after = (store.getState() as any).world;
        expect(after.currentMap.currentNode).toBe(startingNodeId);
        // discoveredNodes and consumedNodes are back at the
        // engine's fresh-map state: discoveredNodes contains only
        // the starting node (the engine seeds the player's current
        // position as discovered); consumedNodes is empty.
        expect(after.currentMap.discoveredNodes ?? []).toEqual([startingNodeId]);
        expect(after.currentMap.consumedNodes ?? []).toHaveLength(0);
    });

    it('returns a totally-shaped DebugSeedResult', () => {
        const { actions } = makeStore();

        const result = actions.debugSeed();

        expect(typeof result.itemsAdded).toBe('number');
        expect(typeof result.cardsLearned).toBe('number');
        expect(typeof result.mapReset).toBe('boolean');
    });

    it('is idempotent on cards — re-seeding does not duplicate knownCards', () => {
        const { store, actions } = makeStore();

        actions.debugSeed();
        const afterFirst = store.getState().player.knownCards ?? [];

        actions.debugSeed();
        const afterSecond = store.getState().player.knownCards ?? [];

        expect(afterSecond.length).toBe(afterFirst.length);
        // Set equality — same ids both times.
        expect(new Set(afterSecond)).toEqual(new Set(afterFirst));
    });
});
