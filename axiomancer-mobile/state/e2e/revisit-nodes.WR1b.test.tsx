/**
 * Revisit completed nodes on the map (phase WR1b, A9 and A10 of the WR1 brief).
 *
 * Every legal move is tappable. A walked node a road away wears the road-back
 * look (a dashed ring, no pulse) apart from a new node; a quiet one moves the
 * player at once with no event screen and owes nothing, while one whose event
 * acts on every entry (a door, a village, a quest node with business) opens
 * the confirm panel like a new node and acts only on the confirm. The camera
 * frames the node underfoot plus every legal move. A10: from a dead end on
 * the manor road (the loot cache bw-m3) back across walked nodes, then on to a
 * new branch, on the real screen.
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

import {
    createStartingWorld, legalMovesFrom, settleQuestNodes, syncMoveLists, type GameState, type WorldState,
} from '@mechanics';
import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectExplorationViewModel } from '@/state/presenters/exploration.engine';
import { selectHasActiveBlacksmith } from '@/state/presenters/blacksmith.engine';
import { focusKeyOf } from '@/components/exploration/MapCanvas';
import ExplorationScreen from '@/app/(tabs)/exploration';

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

/** The manor road walked to its dead end: windmill, first fight, manor fight, meadow hazard, standing on the loot cache. */
const WALKED = ['bw-w2', 'bw-m1', 'bw-m2', 'bw-m3'];

function inThePocket(): WorldState {
    const w = createStartingWorld('breakwater');
    return {
        ...w,
        currentMap: syncMoveLists({
            ...w.currentMap,
            currentNode: 'bw-m3',
            pendingArrival: null,
            arrivedFrom: null,
            completedNodes: WALKED,
            consumedNodes: ['bw-w1', ...WALKED],
        }),
    };
}

/** The bridge turned in, the far bank walked once (completed by mobile's move, never consumed), standing on the bridge. */
function atTheBridgeWithTheFarBankWalked(): WorldState {
    const w = createStartingWorld('breakwater');
    const settled = settleQuestNodes(w.currentMap);
    return {
        ...w,
        currentMap: syncMoveLists({
            ...settled,
            currentNode: 'bw-b1',
            pendingArrival: null,
            completedNodes: [...settled.completedNodes, 'bw-b1', 'bw-b2'],
            consumedNodes: [...settled.consumedNodes, 'bw-b1'],
        }),
    };
}

function storeOn(state: WorldState | Partial<GameState>): AppStore {
    const overrides = 'currentMap' in state ? { world: state as WorldState } : state as Partial<GameState>;
    return createAppStore({ adapter: createMemoryAdapter(), overrides });
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

function tap(tree: ReturnType<typeof mountExploration>, testID: string) {
    act(() => {
        fireEvent.press(tree.getByTestId(testID));
    });
    act(() => { jest.advanceTimersByTime(1); });
}

describe('A9: the map marks every legal move, walked ones in their own look', () => {
    it('a walked neighbour is completed, walkable and quiet; a walked non-neighbour is not walkable', () => {
        const store = storeOn(inThePocket());
        const vm = selectExplorationViewModel(store.getState());
        const byId = Object.fromEntries(vm.nodes.map((n) => [n.id, n]));
        expect(byId['bw-m2']).toMatchObject({ kind: 'completed', walkable: true, actsAgain: false });
        // The manor fight is walked but two roads away: drawn walked, not tappable through.
        expect(byId['bw-m1']).toMatchObject({ kind: 'completed', walkable: false, actsAgain: false });
        // A new node off the roads draws unreachable.
        expect(byId['bw-m4'].kind).toBe('locked');
        // A quiet walk back is not a confirm-panel option.
        expect(vm.options).toEqual([]);
        // Every legal move is marked walkable, and nothing else is.
        const walkable = vm.nodes.filter((n) => n.walkable).map((n) => n.id);
        expect(walkable).toEqual(legalMovesFrom(store.getState().world.currentMap));
    });

    it('a walked door acts again: it is offered on the confirm panel, not walked through', () => {
        const vm = selectExplorationViewModel(storeOn(atTheBridgeWithTheFarBankWalked()).getState());
        const farBank = vm.nodes.find((n) => n.id === 'bw-b2')!;
        expect(farBank).toMatchObject({ kind: 'completed', walkable: true, actsAgain: true, type: 'door' });
        expect(vm.options.map((o) => o.nodeId)).toContain('bw-b2');
    });

    it('the camera frames the node underfoot plus every legal move, walked ones included', () => {
        const vm = selectExplorationViewModel(storeOn(inThePocket()).getState());
        expect(focusKeyOf(vm.nodes)).toBe('bw-m3|bw-m2');
    });

    it('the walked node a road away draws the road-back ring and says so', () => {
        const tree = mountExploration(storeOn(inThePocket()));
        expect(tree.getByTestId('node-bw-m2-road-back')).toBeTruthy();
        expect(tree.getByTestId('node-bw-m2').props.accessibilityLabel).toMatch(/walked, a road back$/);
        expect(tree.queryByTestId('node-bw-m1-road-back')).toBeNull();
        expect(tree.getByTestId('node-bw-m1').props.accessibilityLabel).toMatch(/walked$/);
    });

    it('a walked door reads as a road back that acts again', () => {
        const tree = mountExploration(storeOn(atTheBridgeWithTheFarBankWalked()));
        expect(tree.getByTestId('node-bw-b2').props.accessibilityLabel).toMatch(/a road back, .+ again$/);
    });
});

describe('moveTo: a walk back owes nothing; a first arrival still owes its event', () => {
    it('a quiet walk back moves the player with no arrival owed and the node untouched', () => {
        const store = storeOn(inThePocket());
        const result = createAppActions(store).moveTo('bw-m2');
        expect(result.moved).toBe(true);
        const m = store.getState().world.currentMap;
        expect(m.currentNode).toBe('bw-m2');
        expect(m.pendingArrival ?? null).toBeNull();
        expect(m.arrivedFrom).toBe('bw-m3');
    });

    it('a first arrival owes its event even though mobile completes the node on the move', () => {
        // From the first fight (won) onto the camp beside it, never walked: a
        // rest, which the move completes (a fight's node is settled by its win).
        const w = createStartingWorld('breakwater');
        const store = storeOn({
            ...w,
            currentMap: syncMoveLists({
                ...w.currentMap,
                currentNode: 'bw-w2',
                pendingArrival: null,
                completedNodes: ['bw-w2'],
                consumedNodes: ['bw-w1', 'bw-w2'],
            }),
        });
        createAppActions(store).moveTo('bw-w4');
        const m = store.getState().world.currentMap;
        expect(m.pendingArrival).toBe('bw-w4');
        expect(m.completedNodes).toContain('bw-w4');
    });

    it('a node off the roads is still refused', () => {
        const store = storeOn(inThePocket());
        const before = store.getState().world;
        expect(createAppActions(store).moveTo('bw-m1').moved).toBe(false);
        expect(store.getState().world).toBe(before);
    });
});

describe('A10: from a dead end back across walked nodes, then on to a new branch', () => {
    it('walks back across walked nodes with no event screen, then confirms a new node', () => {
        const store = storeOn(inThePocket());
        const tree = mountExploration(store);
        const here = () => store.getState().world.currentMap.currentNode;

        tap(tree, 'node-bw-m2');
        expect(here()).toBe('bw-m2');
        expect(tree.queryByTestId('node-confirm-go')).toBeNull();
        expect(store.getState().event?.pending ?? null).toBeNull();

        tap(tree, 'node-bw-m1');
        expect(here()).toBe('bw-m1');
        expect(tree.queryByTestId('node-confirm-go')).toBeNull();
        expect(store.getState().event?.pending ?? null).toBeNull();
        expect(store.getState().world.currentMap.pendingArrival ?? null).toBeNull();

        // On to an unvisited branch: a new node keeps its confirm panel.
        tap(tree, 'node-bw-p1');
        expect(here()).toBe('bw-m1');
        expect(tree.getByTestId('node-confirm-go')).toBeTruthy();
        tap(tree, 'node-confirm-go');
        expect(here()).toBe('bw-p1');
        expect(store.getState().world.currentMap.consumedNodes).toContain('bw-p1');
    });

    it('a walked door is offered, not crossed, on the tap; the confirm walks onto it and asks "Move to X?"', () => {
        const store = storeOn(atTheBridgeWithTheFarBankWalked());
        const tree = mountExploration(store);
        tap(tree, 'node-bw-b2');
        expect(store.getState().world.currentMap.name).toBe('breakwater');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-b1');
        expect(tree.getByTestId('node-confirm-go')).toBeTruthy();
        tap(tree, 'node-confirm-go');
        // The confirm walks onto the door; the door only OFFERS its trip
        // (phase NK1d). The travel screen's YES is what crosses.
        expect(store.getState().world.currentMap.name).toBe('breakwater');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-b2');
        expect(store.getState().travel.open?.destination).toEqual({ map: 'charcoal-wood', continent: 'coastal-continent' });
    });

    it('a walked village (the Anvil one) opens its hub again on the confirm, not the Anvil', () => {
        const w = createStartingWorld('breakwater');
        const settled = settleQuestNodes(w.currentMap);
        const store = storeOn({
            ...w,
            currentMap: syncMoveLists({
                ...settled,
                currentNode: 'bw-t3',
                pendingArrival: null,
                completedNodes: [...settled.completedNodes, 'bw-t3', 'bw-t4'],
                consumedNodes: [...settled.consumedNodes, 'bw-t3', 'bw-t4'],
            }),
        });
        const vm = selectExplorationViewModel(store.getState());
        expect(vm.nodes.find((n) => n.id === 'bw-t4')).toMatchObject({ kind: 'completed', walkable: true, actsAgain: true, type: 'village' });
        const tree = mountExploration(store);
        tap(tree, 'node-bw-t4');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-t3');
        tap(tree, 'node-confirm-go');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-t4');
        expect(store.getState().event?.pending?.event.kind).toBe('village');
        expect(selectHasActiveBlacksmith(store.getState())).toBe(false);
    });
});
