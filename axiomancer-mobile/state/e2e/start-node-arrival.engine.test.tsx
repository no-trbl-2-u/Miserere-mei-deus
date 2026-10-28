/**
 * Start-node arrival.
 *
 * Map events fire on ARRIVAL at a node, and the player never arrives at the
 * node `createMapState` places them on — so whatever a map authored for its
 * starting node would be unreachable content.
 *
 * Two halves make it reachable and this file pins both: a map's start node is
 * authored as an arrival CUTSCENE (a kind that is safe to fire the moment
 * the map opens, unlike a fight nobody has had a chance to prepare for) —
 * the Breakwater's bw-1 today — and `ExplorationScreen` resolves the start
 * node once on entry.
 *
 * Hermetic = self-contained + deterministic + isolated. See `docs/testing.md`.
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
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import { selectHasAnyActiveSession } from '@/state/presenters/navigation.engine';
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
    // The arrival is deliberately deferred a tick so a caller that navigates
    // here and opens its own session in the same handler wins the race — see
    // the effect's comment in `app/(tabs)/exploration/index.tsx`. Advance by
    // a tick so only that deferred arrival fires.
    act(() => { jest.advanceTimersByTime(1); });
    return tree;
}

describe('start-node arrival: the map resolves the node it puts you on', () => {
    it('reports the start node as pending on a fresh store', () => {
        const store = makeStore();
        const vm = selectExplorationViewModel(store.getState());

        expect(vm.currentNodeId).toBe('bw-1');
        expect(vm.startNodePending).toBe(true);
    });

    it('resolves bw-1 into a live cutscene event when the map screen mounts', () => {
        const store = makeStore();
        mountExploration(store);

        const pending = store.getState().event?.pending;
        expect(pending).not.toBeNull();
        expect(pending?.event.kind).toBe('cutscene');
    });

    it('consumes the start node so the arrival is a one-shot', () => {
        const store = makeStore();
        mountExploration(store);

        expect(store.getState().world.currentMap.consumedNodes).toContain('bw-1');
        expect(selectExplorationViewModel(store.getState()).startNodePending).toBe(false);
    });

    it('stands down when another session already owns the app', () => {
        // Every minigame owns its own slice, so a caller can navigate to this
        // screen and open a CACHE (or hazard, or rest…) session without ever
        // touching `state.event`. An arrival that checked only the event slice
        // would see an "idle" app and steal the caller's route — the dev
        // treasure trigger would land on /cutscene instead of /cache.
        const store = makeStore();
        const actions = createAppActions(store);
        actions.beginLootCacheChoice({ tier: 'modest', currency: 25 });
        expect(selectHasAnyActiveSession(store.getState())).toBe(true);

        mountExploration(store);

        // The cache session is untouched and no cutscene was armed.
        expect(store.getState().event?.pending ?? null).toBeNull();
        expect(store.getState().world.currentMap.consumedNodes).not.toContain('bw-1');
        expect(selectHasAnyActiveSession(store.getState())).toBe(true);
    });

    it('stands down when the session opens a tick AFTER this screen mounts', () => {
        // The other half of the same bug: callers push this route and open
        // their session in the same handler, so the screen can mount one
        // commit before the session exists. Deciding on the render-time
        // reading would fire into a caller that is about to be busy.
        const store = makeStore();
        const actions = createAppActions(store);

        render(
            <CombatModeProvider>
                <GameStoreProvider store={store}>
                    <ExplorationScreen />
                </GameStoreProvider>
            </CombatModeProvider>,
        );
        // Mounted, decision still pending — now the caller opens its session.
        act(() => { actions.beginLootCacheChoice({ tier: 'modest', currency: 25 }); });
        act(() => { jest.advanceTimersByTime(1); });

        expect(store.getState().event?.pending ?? null).toBeNull();
        expect(store.getState().world.currentMap.consumedNodes).not.toContain('bw-1');
    });

    it('does not fire again on a re-mount of the same map', () => {
        const store = makeStore();
        mountExploration(store).unmount();

        // Clear the event slice as the cutscene screen's dismissal would, then
        // come back to the map. Nothing should re-arm.
        store.setState({ event: EMPTY_EVENT_SLICE });
        mountExploration(store);

        expect(store.getState().event?.pending ?? null).toBeNull();
    });
});

/**
 * The arrival is owed across a reload.
 *
 * A move is a checkpoint, and the checkpoint is taken BEFORE the arrival
 * event resolves: `moveToAction` saves, and only then does `onConfirmMove`
 * call `resolveCurrentMapEvent`. Without a re-fire, a player who reloaded
 * during the prelude would come back standing ON the node with no fight
 * pending — the encounter silently skipped. The arrival re-fire (the screen's
 * `vm.arrivalPending` effect) is what makes the early checkpoint honest.
 */
describe('an arrival the player never answered survives a reload', () => {
    it('engages the encounter when the map screen remounts on the saved node', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter, overrides: { world: createStartingWorld('breakwater') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-2'); // engine kind `encounter`

        // The player reloads before answering the prelude: rebuild the app
        // from the bytes the move checkpointed.
        const reloaded = createAppStore({ adapter });
        expect(reloaded.getState().world.currentMap.currentNode).toBe('bw-2');
        expect(reloaded.getState().world.currentMap.consumedNodes).not.toContain('bw-2');

        const tree = mountExploration(reloaded);

        // The fight the player was owed is engaged (`<CombatGate>` stages it
        // and routes it to /combat-encounter). Its node stays owed until that
        // fight settles, so it is not consumed yet. Do NOT assert
        // `event.pending` here: the gate engages at once and
        // `beginHazardEncounter` clears the event slice on the way in, so
        // `pending` is null by the time this line runs — before AND after the
        // fix. The sibling start-node case can assert `pending` only because
        // bw-1 is a CUTSCENE, which has no engage.
        expect(reloaded.getState().world.currentMap.consumedNodes).not.toContain('bw-2');
        expect(reloaded.getState().currentEncounter).toBeDefined();
        // The map never hosts the fight: it stays on screen under the route.
        expect(tree.queryByTestId('map-canvas-wrapper')).not.toBeNull();
    });
});

/**
 * A save taken DURING the fight reloads onto the fight.
 *
 * The case above is a reload before the prelude. This one is a reload after
 * FIGHT: the app is closed mid-fight and `SaveOnExit` writes the store as it
 * stands. The fight itself is never saved (`currentEncounter` is transient),
 * but the node stays owed until the fight settles, so the reload stands the
 * player back on it, with nowhere else to go, and the map offers the fight
 * again from the start.
 */
describe('a save taken mid-fight survives a reload', () => {
    it('re-offers the fight, with the onward nodes still shut', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter, overrides: { world: createStartingWorld('breakwater') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-2'); // engine kind `encounter`
        mountExploration(store).unmount();
        // The gate engaged: the fight is under way.
        expect(store.getState().currentEncounter).toBeDefined();

        // The app is closed mid-fight; `SaveOnExit` takes the final save.
        store.getState().save();
        const reloaded = createAppStore({ adapter });
        const map = reloaded.getState().world.currentMap;
        expect(reloaded.getState().currentEncounter).toBeUndefined();
        expect(map.currentNode).toBe('bw-2');
        expect(map.pendingArrival).toBe('bw-2');
        // bw-2's way on (the pier fan) is not open: the fight is still owed.
        for (const onward of ['bw-7', 'bw-8', 'bw-9']) {
            expect(map.availableNodes).not.toContain(onward);
        }

        mountExploration(reloaded);

        expect(reloaded.getState().currentEncounter).toBeDefined();
    });

    it('a fight walked away from leaves its node unspent, and tapping it tries it again', () => {
        const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: createStartingWorld('breakwater') } });
        const actions = createAppActions(store);
        actions.moveTo('bw-2');
        mountExploration(store).unmount();

        actions.fleeEncounter();

        const map = store.getState().world.currentMap;
        expect(map.pendingArrival ?? null).toBeNull();
        // A flee answers the arrival and spends nothing: the node is not
        // consumed or completed, so the exploration screen does not re-fire the
        // fight, and the map reads it as unspent.
        expect(map.consumedNodes ?? []).not.toContain('bw-2');
        expect(map.completedNodes).not.toContain('bw-2');
        expect(map.currentNode).toBe('bw-2');
        // Standing on it, the player may try it again: the arrival is owed afresh.
        expect(actions.moveTo('bw-2').moved).toBe(true);
        expect(store.getState().world.currentMap.pendingArrival).toBe('bw-2');
    });
});
