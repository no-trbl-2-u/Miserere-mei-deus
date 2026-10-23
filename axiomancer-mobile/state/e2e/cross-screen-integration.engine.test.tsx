/**
 * Cross-screen integration harness: a live fight from the map, end to end.
 *
 * Mounts the real `ExplorationScreen`, `TabLayout`, `<CombatGate>` and the
 * `/combat-encounter` route against one store and drives an encounter from
 * its prelude to WITHDRAW. The contract (phase CR1a): the gate engages the
 * fight and pushes the route once; the map keeps drawing the map and never
 * hosts the fight; the tab bar needs no lock because the route covers it;
 * WITHDRAW narrates the retreat, ends the staged fight and leaves, and the
 * gate does not route back into it.
 *
 * The route is mounted when the gate pushes it, standing in for the
 * navigator. Hermetic = self-contained + deterministic + isolated. See
 * `docs/testing.md`. Pattern **P6** per `docs/E2E_INVENTORY.md`.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// Jest's hoist-safety babel plugin only allows a `jest.mock` factory to
// reference identifiers named `mock*` (case-insensitive).
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('@/lib/platform/router', () => {
    const ReactLib = require('react');
    const { View } = require('react-native');
    const mockTabsScreenComponent = jest.fn(
        (props: { name: string; options?: { tabBarButton?: unknown } }) =>
            ReactLib.createElement(View, { testID: `mock-tab-screen-${props.name}` }),
    );
    const mockTabsComponent = Object.assign(
        jest.fn((props: { children?: unknown; screenOptions?: { tabBarStyle?: unknown } }) =>
            ReactLib.createElement(View, { testID: 'mock-tabs' }, props.children as React.ReactNode),
        ),
        { Screen: mockTabsScreenComponent },
    );
    return {
        useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack, canGoBack: () => true }),
        Tabs: mockTabsComponent,
    };
});

import { Tabs } from '@/lib/platform/router';
import { CombatGate } from '@/components/CombatGate';
import { CombatModeProvider, useCombatMode } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { arriveAtRealFight } from '@/test-utils/realFight';

import ExplorationScreen from '@/app/(tabs)/exploration';
import TabLayout from '@/app/(tabs)/_layout';
import CombatEncounterScreen from '@/app/combat-encounter/index';

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

/** Reads the combat flag out of the provider for assertions. */
let combat: { inCombat: boolean } = { inCombat: false };
function CombatProbe() {
    combat = useCombatMode();
    return null;
}

function mount(store: AppStore, withRoute: boolean) {
    return render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
                <TabLayout />
                <CombatGate />
                <CombatProbe />
                {withRoute && <CombatEncounterScreen />}
            </GameStoreProvider>
        </CombatModeProvider>,
    );
}

type TabsMockProps = { screenOptions?: { tabBarStyle?: { display?: string } } };

function latestTabsScreenOptions(): TabsMockProps['screenOptions'] {
    const calls = (Tabs as unknown as { mock: { calls: [TabsMockProps][] } }).mock.calls;
    return calls[calls.length - 1]?.[0]?.screenOptions;
}

/** Let the gate's deferred push run. */
function flush() {
    act(() => { jest.advanceTimersByTime(1); });
}

describe('integration: a map fight runs on its own route', () => {
    it('baseline: no active event — nothing is engaged or routed', () => {
        const store = makeStore();
        mount(store, false);
        flush();

        expect(mockPush).not.toHaveBeenCalled();
        expect(store.getState().currentEncounter).toBeUndefined();
        expect(combat.inCombat).toBe(false);
    });

    it('a combat-prelude is engaged and routed once; the map never hosts the fight', () => {
        const { store } = arriveAtRealFight();
        const tree = mount(store, false);
        flush();

        expect(store.getState().event.pending).toBeNull();
        expect(store.getState().currentEncounter).toBeDefined();
        expect(combat.inCombat).toBe(true);
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/combat-encounter');
        // The map stays the map; the fight is not drawn in this screen.
        expect(tree.queryByTestId('map-canvas-wrapper')).not.toBeNull();
        expect(tree.queryByTestId('combat-reveal')).toBeNull();
        // No tab lock: the full-screen route covers the tab bar.
        expect(latestTabsScreenOptions()?.tabBarStyle?.display).not.toBe('none');
    });

    it('the route shows the staged fight; WITHDRAW ends it and leaves without re-routing', () => {
        const { store } = arriveAtRealFight();
        // The navigator mounts the route after the gate's push.
        const { rerender, getByTestId, queryByTestId } = mount(store, false);
        flush();
        rerender(
            <CombatModeProvider>
                <GameStoreProvider store={store}>
                    <ExplorationScreen />
                    <TabLayout />
                    <CombatGate />
                    <CombatProbe />
                    <CombatEncounterScreen />
                </GameStoreProvider>
            </CombatModeProvider>,
        );
        expect(queryByTestId('combat-reveal')).not.toBeNull();

        fireEvent.press(getByTestId('combat-withdraw'));
        flush();

        expect(store.getState().currentEncounter ?? null).toBeNull();
        expect(combat.inCombat).toBe(false);
        expect(mockBack).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('WITHDRAW narrates the retreat at no grace cost (D39) even though the event slice is already cleared', () => {
        const { store } = arriveAtRealFight();
        const tree = mount(store, false);
        flush();
        tree.rerender(
            <CombatModeProvider>
                <GameStoreProvider store={store}>
                    <ExplorationScreen />
                    <CombatGate />
                    <CombatEncounterScreen />
                </GameStoreProvider>
            </CombatModeProvider>,
        );

        fireEvent.press(tree.getByTestId('combat-withdraw'));

        const toast = store.getState().notifications?.toast?.text ?? '';
        expect(toast).toContain('you fled the encounter');
        expect(toast).not.toMatch(/grace/i);
    });
});
