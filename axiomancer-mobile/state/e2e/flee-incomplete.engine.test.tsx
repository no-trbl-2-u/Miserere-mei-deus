/**
 * A fled fight leaves its node incomplete in the app (phase QL1c, A24).
 *
 * WITHDRAW (`fleeEncounter`) and the prelude's FLEE (`pickEventChoice`)
 * answer the arrival through the engine (`answerUnsettledArrival`) and no
 * longer settle the node: the node is neither consumed nor completed, the
 * exploration screen does not re-fire the fight, the next arrival there is a
 * fresh prelude, and tapping the node the player stands on tries it again.
 * A won fight still settles it (the control).
 */

import { createStartingWorld } from '@mechanics';
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
import { createAppActions } from '@/state/actions';
import ExplorationScreen from '@/app/(tabs)/exploration';
import { CombatGate } from '@/components/CombatGate';

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
}

function mountExploration(store: AppStore) {
    const tree = render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
                <CombatGate />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    act(() => { jest.advanceTimersByTime(1); });
    return tree;
}

const map = (store: AppStore) => store.getState().world.currentMap;

/** Walk onto bw-2 (a fight node) with its arrival resolved and the fight engaged. */
function engage() {
    const store = makeStore();
    const actions = createAppActions(store);
    actions.moveTo('bw-2');
    mountExploration(store).unmount();
    expect(store.getState().currentEncounter).toBeDefined();
    return { store, actions };
}

function expectUnspentAndAnswered(store: AppStore) {
    expect(map(store).pendingArrival ?? null).toBeNull();
    expect(map(store).consumedNodes ?? []).not.toContain('bw-2');
    expect(map(store).completedNodes).not.toContain('bw-2');
    expect(map(store).currentNode).toBe('bw-2');
}

describe('WITHDRAW leaves the node incomplete', () => {
    it('answers the arrival, spends nothing, and the map does not re-fire the fight', () => {
        const { store, actions } = engage();
        actions.fleeEncounter();
        actions.endCombat('flee');
        expectUnspentAndAnswered(store);
        expect(store.getState().currentEncounter).toBeUndefined();

        // Back on the map: nothing is owed, so no fight is staged again.
        mountExploration(store);
        expect(store.getState().currentEncounter).toBeUndefined();
        expectUnspentAndAnswered(store);
    });

    it('the node reads as unspent and retryable on the map', () => {
        const { store, actions } = engage();
        actions.fleeEncounter();
        actions.endCombat('flee');
        const vm = selectExplorationViewModel(store.getState());
        expect(vm.currentNodeId).toBe('bw-2');
        expect(vm.arrivalPending).toBe(false);
        expect(vm.retryable).toBe(true);
        expect(vm.nodes.find(n => n.id === 'bw-2')?.kind).toBe('current');
    });

    it('tapping the node the player stands on tries it again: a fresh arrival, a fresh fight', () => {
        const { store, actions } = engage();
        actions.fleeEncounter();
        actions.endCombat('flee');

        expect(actions.moveTo('bw-2').moved).toBe(true);
        expect(map(store).pendingArrival).toBe('bw-2');
        expect(selectExplorationViewModel(store.getState()).retryable).toBe(false);
        mountExploration(store);
        expect(store.getState().currentEncounter).toBeDefined();
    });

    it('a second flee from the retry leaves it incomplete again', () => {
        const { store, actions } = engage();
        actions.fleeEncounter();
        actions.endCombat('flee');
        actions.moveTo('bw-2');
        mountExploration(store).unmount();
        actions.fleeEncounter();
        actions.endCombat('flee');
        expectUnspentAndAnswered(store);
    });
});

describe("the prelude's FLEE leaves the node incomplete", () => {
    it('answers the arrival and spends nothing', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        actions.moveTo('bw-2');
        actions.resolveCurrentMapEvent('encounter');
        expect(store.getState().event.pending?.event.kind).toBe('encounter');

        actions.pickEventChoice('flee');

        expect(store.getState().event.pending).toBeNull();
        expectUnspentAndAnswered(store);
    });
});

describe('a won fight still settles the node (the control)', () => {
    it('victory spends it, and the map no longer offers a retry', () => {
        const { store, actions } = engage();
        actions.endCombat('victory');
        expect(map(store).consumedNodes).toContain('bw-2');
        expect(selectExplorationViewModel(store.getState()).retryable).toBe(false);
    });
});
