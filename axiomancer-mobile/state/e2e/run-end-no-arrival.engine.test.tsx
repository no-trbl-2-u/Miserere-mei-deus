/**
 * A run end plays no scene (phase GO1a).
 *
 * The run-over state is the pre-run shell: a fresh world standing on the
 * Windmill, whose arrival is still owed. The map screen stays mounted under the
 * fight, so when the second death swaps that state in, its owed-arrival effect
 * used to resolve the Windmill's opening scene and the event gate pushed
 * `/cutscene` over the Game Over screen. A finished run owes no arrival and no
 * gate route; the opening scene plays after CONFIRM on character select.
 *
 * Hermetic = self-contained + deterministic + isolated. See `docs/testing.md`.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
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
        useRouter: () => ({ replace: jest.fn(), push: mockPush, back: jest.fn(), canGoBack: () => false }),
        Tabs: mockTabsComponent,
    };
});

import ExplorationScreen from '@/app/(tabs)/exploration';
import { EventGate } from '@/components/EventGate';
import { createAppActions } from '@/state/actions';
import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { startNewGameAction } from '@/state/menu/store-actions';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { selectPacedEventRoute } from '@/state/presenters/event.engine';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

/** A new run on the Windmill with the map and the event gate mounted, the opening scene played. */
function mountedRun(): { store: AppStore; actions: ReturnType<typeof createAppActions> } {
    const slots = createMemorySlotStore();
    const store = createAppStore({ adapter: slots });
    startNewGameAction(store, slots, 1, undefined, 'the-chosen');
    render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
                <EventGate />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    act(() => { jest.advanceTimersByTime(1); });
    expect(store.getState().event.pending?.event.kind).toBe('cutscene');
    // The opening scene is answered.
    act(() => { store.setState({ event: EMPTY_EVENT_SLICE } as never); });
    mockPush.mockClear();
    return { store, actions: createAppActions(store) };
}

describe('a run end plays no scene', () => {
    it('the second death, with the map mounted, starts no arrival cutscene and pushes no route', () => {
        const { store, actions } = mountedRun();
        expect(die(actions)).toBe('revived');
        act(() => { jest.advanceTimersByTime(50); });
        // The first death on the start node owes its arrival again; the player answers it.
        act(() => { store.setState({ event: EMPTY_EVENT_SLICE } as never); });
        mockPush.mockClear();

        expect(die(actions)).toBe('run-over');
        act(() => { jest.advanceTimersByTime(50); });

        expect(store.getState().runOver).toBe(true);
        expect(store.getState().event.pending ?? null).toBeNull();
        expect(mockPush).not.toHaveBeenCalledWith('/cutscene');
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('the event gate names no route for a run-over state, even with a scene pending', () => {
        const { store, actions } = mountedRun();
        die(actions);
        die(actions);
        expect(store.getState().runOver).toBe(true);
        // Whatever put a paced event there, the route is withheld.
        act(() => { actions.resolveCurrentMapEvent(); });
        expect(selectPacedEventRoute(store.getState())).toBeNull();
    });
});

function die(actions: ReturnType<typeof createAppActions>): 'revived' | 'run-over' {
    let out: 'revived' | 'run-over' = 'revived';
    act(() => { out = actions.playerDied('fight'); });
    return out;
}
