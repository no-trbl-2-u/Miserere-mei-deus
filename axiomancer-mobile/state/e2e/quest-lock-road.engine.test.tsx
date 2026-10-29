/**
 * The chain's quest gates on the map (phase QL1d's A17, on the Chapter 1
 * map of phase BW1a).
 *
 * On a new game the keep gate (bw-k1 -> bw-k2) and the river bridge
 * (bw-b1 -> bw-b2) are blocked until their quest steps are turned in. The map
 * draws such a road closed, and a tap on the node behind it says the road's
 * reason instead of the bare "sealed". A quest node draws as any node.
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

import { createStartingWorld, getMapDefinition, settleQuestNodes, syncMoveLists, type WorldState } from '@mechanics';
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
    .initialBlockedRoutes!.find((r) => r.to === 'bw-k2')!.reason;

/** A new Breakwater walked from the windmill up the keep causeway, standing on the keep gate (bw-k1). */
function atTheKeepGate(settle = false): WorldState {
    const w = createStartingWorld('breakwater');
    const map = {
        ...w.currentMap,
        currentNode: 'bw-k1',
        pendingArrival: null,
        completedNodes: ['bw-w2', 'bw-w5'],
        consumedNodes: ['bw-w1', 'bw-w2', 'bw-w4', 'bw-w5'],
    };
    return { ...w, currentMap: settle ? settleQuestNodes(map) : map };
}

/** A new Breakwater walked from the windmill into the town, standing on bw-t2, a road from the bridge (bw-b1). */
function besideTheBridge(): WorldState {
    const w = createStartingWorld('breakwater');
    const walked = ['bw-w2', 'bw-w3', 'bw-h1', 'bw-t1', 'bw-t2'];
    const map = {
        ...w.currentMap,
        currentNode: 'bw-t2',
        pendingArrival: null,
        completedNodes: walked,
        consumedNodes: ['bw-w1', ...walked],
    };
    return { ...w, currentMap: syncMoveLists(map) };
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
    it('the keep gate is blocked and drawn closed; the sea keep behind it carries the reason', () => {
        const vm = selectExplorationViewModel(storeOn(atTheKeepGate()).getState());
        const keep = vm.nodes.find((n) => n.id === 'bw-k2')!;
        expect(keep.kind).toBe('locked');
        expect(keep.blockedReason).toBe(LOCK_REASON);

        const road = vm.edges.find((e) => [e.fromId, e.toId].sort().join('|') === 'bw-k1|bw-k2')!;
        expect(road.blocked).toBe(true);
        expect(edgeStroke(road, PALETTE).dash).toBe('1 6');
        // A road that is merely out of reach is not blocked.
        const farRoad = vm.edges.find((e) => [e.fromId, e.toId].sort().join('|') === 'bw-h1|bw-h2')!;
        expect(farRoad.blocked).toBe(false);
        expect(vm.nodes.find((n) => n.id === 'bw-h2')!.blockedReason).toBeNull();
    });

    it('once the gate opens the road is no longer blocked and the sea keep carries no reason', () => {
        const vm = selectExplorationViewModel(storeOn(atTheKeepGate(true)).getState());
        const road = vm.edges.find((e) => [e.fromId, e.toId].sort().join('|') === 'bw-k1|bw-k2')!;
        expect(road.blocked).toBe(false);
        expect(vm.nodes.find((n) => n.id === 'bw-k2')!.blockedReason ?? null).toBeNull();
    });

    it('a tap on the gated node says the road\'s reason', () => {
        const tree = mountExploration(storeOn(atTheKeepGate()));
        act(() => {
            fireEvent.press(tree.getByTestId('node-bw-k2'));
        });
        // MQ1c: the reason is on the node confirm panel, not a toast, and
        // there is nothing to travel to.
        expect(tree.getByTestId('node-confirm-shut-reason').props.children).toBe(LOCK_REASON);
        expect(tree.queryByTestId('node-confirm-go')).toBeNull();
        expect(tree.queryByTestId('exploration-node-toast')).toBeNull();
    });

    it('a quest node draws as any node (the QUEST mark, no step state)', () => {
        const vm = selectExplorationViewModel(storeOn(besideTheBridge()).getState());
        const marker = vm.nodes.find((n) => n.id === 'bw-b1')!;
        expect(marker).toMatchObject({ kind: 'available', type: 'quest', triggersCombat: false });
    });
});
