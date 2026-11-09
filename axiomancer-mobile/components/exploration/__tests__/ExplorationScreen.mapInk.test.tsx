/**
 * CX1b, A6, A8 and A9 on the real exploration screen: confirming a walk to a
 * fight node in animate mode mounts the map ink at the node's token and holds
 * `resolveCurrentMapEvent` (so the fight is not staged) until the ink
 * reports covered; in instant mode the event resolves on confirm, with no
 * ink; a walk to a node that is not a fight is unchanged.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

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

// Every resolve the screen asks for is counted here (the provider builds its
// actions through `createAppActions`).
const mockResolve = jest.fn();
jest.mock('@/state/actions', () => {
    const actual = jest.requireActual('@/state/actions') as typeof import('@/state/actions');
    return {
        ...actual,
        createAppActions: (store: Parameters<typeof actual.createAppActions>[0]) => {
            const actions = actual.createAppActions(store);
            const real = actions.resolveCurrentMapEvent;
            return {
                ...actions,
                resolveCurrentMapEvent: (...args: Parameters<typeof real>) => {
                    mockResolve(...args);
                    return real(...args);
                },
            };
        },
    };
});

import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { settledBreakwater } from '@/test-utils/settledBreakwater';
import { selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import { selectHasActiveEvent } from '@/state/presenters/event.engine';
import { MapInkHost } from '@/components/exploration/MapInkHost';
import { LEGACY_SHEET_SIZE } from '@/state/exploration-maps/sheet';
import { MAP_INK_SPREAD_MS } from '@/components/exploration/MapInk';
import { __resetMapInkForTests, isMapInkHandoff } from '@/state/map-ink';
import ExplorationScreen from '@/app/(tabs)/exploration';

type Instant = { __AXM_JUICE_INSTANT__?: unknown };

beforeEach(() => {
    jest.useFakeTimers();
    __resetMapInkForTests();
});

afterEach(() => {
    delete (globalThis as Instant).__AXM_JUICE_INSTANT__;
    __resetMapInkForTests();
    jest.useRealTimers();
    jest.clearAllMocks();
});

/** A settled Breakwater, standing on the windmill with the first fight (bw-w2) a road away. */
function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter(), overrides: { world: settledBreakwater() } });
}

function mount(store: AppStore) {
    const resolveSpy = mockResolve;
    const tree = render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
                <MapInkHost />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    act(() => { jest.advanceTimersByTime(1); });
    return { tree, resolveSpy };
}

function confirmWalk(tree: ReturnType<typeof render>, nodeId: string) {
    act(() => { fireEvent.press(tree.getByTestId(`node-${nodeId}`)); });
    act(() => { fireEvent.press(tree.getByTestId('node-confirm-go')); });
}

/** The fight is staged: its prelude event is up (the gate engages it from there). */
const staged = (store: AppStore) => selectHasActiveEvent(store.getState()) || store.getState().currentEncounter !== undefined;

describe('a walk to a fight node bleeds ink before the fight is staged', () => {
    it('animate mode: the ink mounts at the token and the resolve waits for it to cover', () => {
        const store = makeStore();
        const fight = selectExplorationViewModel(store.getState()).nodes.find((n) => n.id === 'bw-w2');
        expect(fight?.triggersCombat).toBe(true);
        const { tree, resolveSpy } = mount(store);

        confirmWalk(tree, 'bw-w2');
        act(() => { jest.advanceTimersByTime(1); });

        // The move is committed and checkpointed with its arrival owed ...
        expect(store.getState().world.currentMap.currentNode).toBe('bw-w2');
        expect(store.getState().world.currentMap.pendingArrival).toBe('bw-w2');
        // ... the ink is on screen, centred on a token point ...
        const blot = tree.getByTestId('map-ink-blot');
        const s = StyleSheet.flatten(blot.props.style) as { left: number; top: number; width: number };
        // Under the test renderer the pane is never laid out: the camera stays at
        // scale 1, no translation, the pane at the window origin, so the token's
        // window point is its canvas point.
        const sheetScale = selectExplorationViewModel(store.getState()).sheet?.scale ?? LEGACY_SHEET_SIZE.scale;
        expect(s.left + s.width / 2).toBeCloseTo(fight!.x * sheetScale);
        expect(s.top + s.width / 2).toBeCloseTo(fight!.y * sheetScale);
        // ... and nothing is resolved yet, so no fight is staged.
        expect(resolveSpy).not.toHaveBeenCalled();
        expect(staged(store)).toBe(false);

        act(() => { jest.advanceTimersByTime(MAP_INK_SPREAD_MS / 2); });
        expect(resolveSpy).not.toHaveBeenCalled();
        expect(staged(store)).toBe(false);

        act(() => { jest.advanceTimersByTime(MAP_INK_SPREAD_MS); });
        expect(resolveSpy).toHaveBeenCalledTimes(1);
        expect(staged(store)).toBe(true);
        // Covered: the fight route opens with no animation of its own.
        expect(isMapInkHandoff()).toBe(true);
    });

    it('instant mode: no ink, the event resolves on confirm', () => {
        (globalThis as Instant).__AXM_JUICE_INSTANT__ = true;
        const store = makeStore();
        const { tree, resolveSpy } = mount(store);

        confirmWalk(tree, 'bw-w2');

        expect(resolveSpy).toHaveBeenCalledTimes(1);
        expect(staged(store)).toBe(true);
        act(() => { jest.advanceTimersByTime(1); });
        expect(tree.queryByTestId('map-ink')).toBeNull();
        expect(isMapInkHandoff()).toBe(false);
    });

    it('a walk to a node that is not a fight resolves on confirm, with no ink', () => {
        // The first node of the map with a road to a node that is not a fight.
        let store = makeStore();
        let quiet: ReturnType<typeof selectExplorationViewModel>['nodes'][number] | undefined;
        for (const n of selectExplorationViewModel(store.getState()).nodes) {
            const there = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: settledBreakwater(n.id) } });
            quiet = selectExplorationViewModel(there.getState()).nodes.find((m) => m.kind === 'available' && !m.triggersCombat);
            if (quiet) { store = there; break; }
        }
        expect(quiet).toBeDefined();
        const { tree, resolveSpy } = mount(store);

        confirmWalk(tree, quiet!.id);

        expect(resolveSpy).toHaveBeenCalledTimes(1);
        act(() => { jest.advanceTimersByTime(1); });
        expect(tree.queryByTestId('map-ink')).toBeNull();
    });
});
