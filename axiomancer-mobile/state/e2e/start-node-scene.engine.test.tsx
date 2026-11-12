/**
 * A start node that holds only a slot scene.
 *
 * The Charcoal Wood, Beacon Crags and Lantern Deep open on a scene in their
 * start node's slot and have no pool. The map screen still resolves that node
 * on entry: the scene opens `/cutscene` (node unspent), and its end resolves the
 * node again to `none`, with the roads open. Generic over any start node that
 * carries a scene and no pool.
 *
 * Hermetic = self-contained + deterministic + isolated. See `docs/testing.md`.
 */

import { createStartingWorld, getNodeEventPool, isBeforeScene } from '@mechanics';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/lib/platform/router', () => {
    const ReactLib = require('react');
    const { View } = require('react-native');
    const mockTabsScreenComponent = jest.fn((props: { name: string }) =>
        ReactLib.createElement(View, { testID: `mock-tab-screen-${props.name}` }),
    );
    const mockTabsComponent = Object.assign(
        jest.fn((props: { children?: unknown }) =>
            ReactLib.createElement(View, { testID: 'mock-tabs' }, props.children as React.ReactNode),
        ),
        { Screen: mockTabsScreenComponent },
    );
    return {
        useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
        Tabs: mockTabsComponent,
    };
});

import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import { selectPacedEventRoute } from '@/state/presenters/event.engine';
import { createAppActions } from '@/state/actions';
import ExplorationScreen from '@/app/(tabs)/exploration';
import { CombatGate } from '@/components/CombatGate';

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

function mountExploration(store: AppStore) {
    const tree = render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
                <CombatGate />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    // The arrival is deferred a tick (see the effect in the exploration screen).
    act(() => { jest.advanceTimersByTime(1); });
    return tree;
}

const STARTS: Array<[string, string, string, string]> = [
    ['charcoal-wood', 'coastal-continent', 'cw-1', 'cw-2'],
    ['beacon-crags', 'northern-continent', 'bc-1', 'bc-2'],
    ['lantern-deep', 'northern-continent', 'ld-1', 'ld-2'],
];

describe.each(STARTS)('%s: a slot-only start node', (map, continent, startId, nextId) => {
    function makeStore(): AppStore {
        return createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld(map as Parameters<typeof createStartingWorld>[0]) } });
    }

    it('has no pool, draws as the start and is owed its arrival', () => {
        const store = makeStore();
        const vm = selectExplorationViewModel(store.getState());
        expect(getNodeEventPool(continent, map, startId)).toBeUndefined();
        expect(vm.currentNodeId).toBe(startId);
        expect(vm.nodes.find((n) => n.id === startId)?.type).toBe('start');
        expect(vm.startNodePending).toBe(true);
    });

    it('opens /cutscene on arrival without spending the node', () => {
        const store = makeStore();
        mountExploration(store);

        const pending = store.getState().event?.pending;
        expect(pending && isBeforeScene(pending.event)).toBe(true);
        expect(selectPacedEventRoute(store.getState())).toBe('/cutscene');
        expect(store.getState().world.currentMap.consumedNodes).not.toContain(startId);
    });

    it('after continueToNode the node resolves to none, is spent and its roads are open', () => {
        const store = makeStore();
        mountExploration(store);

        createAppActions(store).continueToNode();

        expect(store.getState().event?.pending?.event.kind ?? 'none').toBe('none');
        const m = store.getState().world.currentMap;
        expect(m.consumedNodes).toContain(startId);
        expect(m.availableNodes).toContain(nextId);
        expect(selectExplorationViewModel(store.getState()).startNodePending).toBe(false);
    });
});
