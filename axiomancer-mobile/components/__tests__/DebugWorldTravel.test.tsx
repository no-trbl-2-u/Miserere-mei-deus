/**
 * Hermetic component tests — DebugWorldTravel.
 *
 * Pins:
 *   - DEV gate (true / simulated-false)
 *   - A map chip travels there (continent + map + start node)
 *   - A node chip jumps to WILDS, moves the cursor, and resolves the
 *     node's authored event through the live action
 *   - RESET MAP returns to the start node (historic testID kept)
 *   - COMPLETE MAP unlocks the next map
 *   - An act button enters THE APORIA and pushes /labyrinth
 *   - NEW GAME ON starts a fresh run on the chosen map in the active slot
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { getMapDefinition } from '@mechanics';

import { DebugWorldTravel } from '@/components/DebugWorldTravel';
import { listNodes } from '@/state/dev/world-travel';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { SaveSlotsProvider } from '@/state/SaveSlotsProvider';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import type { SaveSlotStore } from '@/state/persistence/saveSlots';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const mockPush = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

afterEach(() => {
    mockPush.mockClear();
    jest.restoreAllMocks();
});

const makeStore = (): AppStore => createAppStore({ adapter: createMemoryAdapter() });
const withProvider = (store: AppStore, child: React.ReactNode, slots?: SaveSlotStore) => (
    <GameStoreProvider store={store}>
        <SaveSlotsProvider slots={slots}>{child}</SaveSlotsProvider>
    </GameStoreProvider>
);

describe('DebugWorldTravel: DEV gate', () => {
    it('renders map chips, node chips, and the act buttons', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugWorldTravel />));
        expect(tree.queryByTestId('debug-travel-map-lantern-deep')).not.toBeNull();
        expect(tree.queryByTestId(`debug-travel-node-${store.getState().world.currentMap.currentNode}`)).not.toBeNull();
        expect(tree.queryByTestId('debug-map-reset-button')).not.toBeNull();
        expect(tree.queryByTestId('debug-aporia-act3')).not.toBeNull();
    });

    it('renders null when __DEV__ is false (production build simulation)', () => {
        const g = global as unknown as { __DEV__: boolean };
        const original = g.__DEV__;
        g.__DEV__ = false;
        try {
            const tree = render(withProvider(makeStore(), <DebugWorldTravel />));
            expect(tree.queryByTestId('debug-map-reset-button')).toBeNull();
        } finally {
            g.__DEV__ = original;
        }
    });
});

describe('DebugWorldTravel: travel', () => {
    it('a map chip travels to that map on its continent', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugWorldTravel />));
        fireEvent.press(tree.getByTestId('debug-travel-map-beacon-crags'));
        const world = store.getState().world;
        expect(world.currentContinent.name).toBe('northern-continent');
        expect(world.currentMap.name).toBe('beacon-crags');
        expect(world.currentMap.currentNode).toBe(getMapDefinition('northern-continent', 'beacon-crags').startingNode.id);
    });

    it('a node chip on a quest node jumps there and opens the quest screen, and nothing else', () => {
        const store = makeStore();
        const target = listNodes(store.getState()).find((n) => n.kind === 'quest')!;
        expect(target.id).toBe('bw-19');
        const tree = render(withProvider(store, <DebugWorldTravel />));
        fireEvent.press(tree.getByTestId(`debug-travel-node-${target.id}`));
        const state = store.getState();
        expect(state.world.currentMap.currentNode).toBe('bw-19');
        expect(state.quest.open).toMatchObject({ node: 1 });
        expect(state.event.pending).toBeNull();
        expect(state.hazard.session).toBeNull();
        expect(state.rest.session).toBeNull();
        expect(state.cache.session).toBeNull();
        expect(state.blacksmith.session).toBeNull();
    });

    it('a node chip jumps to WILDS, moves the cursor, and fires the authored event', () => {
        const store = makeStore();
        const target = listNodes(store.getState()).find((n) => !n.isCurrent && n.kind && n.kind !== 'encounter' && n.kind !== 'travel' && n.kind !== 'quest')!;
        const tree = render(withProvider(store, <DebugWorldTravel />));
        fireEvent.press(tree.getByTestId(`debug-travel-node-${target.id}`));
        expect(mockPush).toHaveBeenCalledWith('/(tabs)/exploration');
        const state = store.getState();
        expect(state.world.currentMap.currentNode).toBe(target.id);
        const opened = state.event.pending !== null || state.hazard.session !== null || state.rest.session !== null || state.cache.session !== null || state.blacksmith.session !== null || (state.player.inventory?.length ?? 0) > 0;
        expect(opened).toBe(true);
    });

    it('RESET MAP returns to the start node', () => {
        const store = makeStore();
        const start = store.getState().world.currentMap.currentNode;
        const tree = render(withProvider(store, <DebugWorldTravel />));
        const target = listNodes(store.getState()).find((n) => !n.isCurrent)!;
        fireEvent.press(tree.getByTestId(`debug-travel-node-${target.id}`));
        fireEvent.press(tree.getByTestId('debug-map-reset-button'));
        expect(store.getState().world.currentMap.currentNode).toBe(start);
    });

    it('COMPLETE MAP unlocks the next map on the continent', () => {
        const store = makeStore();
        const next = store.getState().world.currentContinent.lockedMaps[0];
        const tree = render(withProvider(store, <DebugWorldTravel />));
        fireEvent.press(tree.getByTestId('debug-map-complete-button'));
        expect(store.getState().world.currentContinent.availableMaps).toContain(next);
    });

    it('an act button enters THE APORIA (the LabyrinthGate owns the route)', () => {
        const store = makeStore();
        const tree = render(withProvider(store, <DebugWorldTravel />));
        fireEvent.press(tree.getByTestId('debug-aporia-act1'));
        expect(store.getState().labyrinthUi.session?.actId).toBe('act1');
        // One router for every way in, so the dev menu never double-pushes.
        expect(mockPush).not.toHaveBeenCalledWith('/labyrinth');
    });

    it('NEW GAME ON starts a fresh run on the chosen map, in the active slot', () => {
        const store = makeStore();
        const slots = createMemorySlotStore();
        slots.selectSlot(2);
        const tree = render(withProvider(store, <DebugWorldTravel />, slots));
        const before = store.getState().runId;
        fireEvent.press(tree.getByTestId('debug-new-game-on-beacon-crags'));
        const world = store.getState().world;
        expect(world.currentMap.name).toBe('beacon-crags');
        expect(world.currentContinent.name).toBe('northern-continent');
        expect(world.currentMap.currentNode).toBe(getMapDefinition('northern-continent', 'beacon-crags').startingNode.id);
        expect(store.getState().runId).not.toBe(before);
        expect(slots.getActiveSlot()).toBe(2);
        expect(mockPush).toHaveBeenCalledWith('/(tabs)/exploration');
    });

    it('offers every campaign map, marking the default start', () => {
        const tree = render(withProvider(makeStore(), <DebugWorldTravel />));
        for (const m of ['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep']) {
            expect(tree.queryByTestId(`debug-new-game-on-${m}`)).not.toBeNull();
        }
        expect(tree.queryByTestId('debug-new-game-on-aporia-colonnade')).toBeNull();
    });
});
