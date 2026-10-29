/**
 * The questline's locks on the map (phase QL1d, A17 of the QL1 brief).
 *
 * On a new game the roads into the Breakwater's quest nodes 2-4 are blocked
 * until the step before fills. The map draws such a road closed, and a tap
 * on the node behind it says the road's reason instead of the bare
 * "sealed". A node that holds its roads (a quest marker, the watchtower)
 * draws as any node.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
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

import { createStartingWorld, getMapDefinition, settleQuestNodes, type WorldState } from '@mechanics';
import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import { edgeStroke } from '@/components/exploration/MapCanvas';
import ExplorationScreen from '@/app/(tabs)/exploration';

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

const LOCK_REASON = getMapDefinition('coastal-continent', 'breakwater')
    .initialBlockedRoutes!.find((r) => r.to === 'bw-20')!.reason;

/** A new Breakwater with the windmill, the foothill pass and the customs house walked, standing on the customs house. */
function atTheCustomsHouse(settle = false): WorldState {
    const w = createStartingWorld('breakwater');
    const map = {
        ...w.currentMap,
        currentNode: 'bw-9',
        pendingArrival: null,
        completedNodes: ['bw-4', 'bw-9'],
        consumedNodes: ['bw-1', 'bw-4', 'bw-9'],
    };
    return { ...w, currentMap: settle ? settleQuestNodes(map) : map };
}

function storeOn(world: WorldState): AppStore {
    return createAppStore({ adapter: createMemoryAdapter(), overrides: { world } });
}

function mountExploration(store: AppStore) {
    const tree = render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    act(() => { jest.advanceTimersByTime(1); });
    return tree;
}

const PALETTE = { parchment: '#p', ash: '#a', bone: '#b' } as never;

describe('A17: a blocked road draws closed, with its reason', () => {
    it('the road into the second quest marker is blocked and drawn closed; the node behind it carries the reason', () => {
        const vm = selectExplorationViewModel(storeOn(atTheCustomsHouse()).getState());
        const marker = vm.nodes.find((n) => n.id === 'bw-20')!;
        expect(marker.kind).toBe('locked');
        expect(marker.blockedReason).toBe(LOCK_REASON);

        const road = vm.edges.find((e) => [e.fromId, e.toId].sort().join('|') === 'bw-20|bw-9')!;
        expect(road.blocked).toBe(true);
        expect(edgeStroke(road, PALETTE).dash).toBe('1 6');
        // A road that is merely out of reach is not blocked.
        const pocketRoad = vm.edges.find((e) => [e.fromId, e.toId].sort().join('|') === 'bw-19|bw-3')!;
        expect(pocketRoad.blocked).toBe(false);
        expect(vm.nodes.find((n) => n.id === 'bw-3')!.blockedReason).toBeNull();
    });

    it('once the lock opens the road is no longer blocked and the marker carries no reason', () => {
        const vm = selectExplorationViewModel(storeOn(atTheCustomsHouse(true)).getState());
        const road = vm.edges.find((e) => [e.fromId, e.toId].sort().join('|') === 'bw-20|bw-9')!;
        expect(road.blocked).toBe(false);
        expect(vm.nodes.find((n) => n.id === 'bw-20')!.blockedReason ?? null).toBeNull();
    });

    it('a tap on the locked marker says the road\'s reason', () => {
        const tree = mountExploration(storeOn(atTheCustomsHouse()));
        act(() => {
            fireEvent.press(tree.getByTestId('node-bw-20'));
        });
        // MQ1c: the reason is on the node confirm panel, not a toast, and
        // there is nothing to travel to.
        expect(tree.getByTestId('node-confirm-shut-reason').props.children).toBe(LOCK_REASON);
        expect(tree.queryByTestId('node-confirm-go')).toBeNull();
        expect(tree.queryByTestId('exploration-node-toast')).toBeNull();
    });

    it('a quest marker that holds its roads draws as any node (the QUEST mark, no step state)', () => {
        const vm = selectExplorationViewModel(storeOn(createStartingWorld('breakwater')).getState());
        const marker = vm.nodes.find((n) => n.id === 'bw-19')!;
        expect(marker).toMatchObject({ kind: 'available', type: 'quest', triggersCombat: false });
    });
});
