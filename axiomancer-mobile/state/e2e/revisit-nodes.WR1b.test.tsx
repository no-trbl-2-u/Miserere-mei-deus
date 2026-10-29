/**
 * Revisit completed nodes on the map (phase WR1b, A9 and A10 of the WR1 brief).
 *
 * Every legal move is tappable. A walked node a road away wears the road-back
 * look (a dashed ring, no pulse) apart from a new node; a quiet one moves the
 * player at once with no event screen and owes nothing, while one whose event
 * acts on every entry (a door, a village, a quest node with business) opens
 * the confirm panel like a new node and acts only on the confirm. The camera
 * frames the node underfoot plus every legal move. A10: from the windmill
 * into the marker-1 pocket and back across walked nodes, then on to a new
 * branch, on the real screen.
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
    acceptQuestStep, BREAKWATER_QUESTLINE_ID, createNewGameState, createStartingWorld, legalMovesFrom,
    placeOnNode, settleQuestNodes, syncMoveLists, type GameState, type WorldState,
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

/**
 * The marker-1 pocket walked: the windmill and the sea-cave hazard spent, the
 * marker's step accepted (so it is spent and has nothing to do), standing on
 * the dead-end sea cave.
 */
function inThePocket(): Partial<GameState> {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const onMarker = { ...fresh, world: placeOnNode(fresh.world, 'bw-19') };
    const accepted = acceptQuestStep(onMarker, BREAKWATER_QUESTLINE_ID, 1);
    const m = accepted.world.currentMap;
    return {
        world: {
            ...accepted.world,
            currentMap: syncMoveLists({
                ...m,
                currentNode: 'bw-12',
                pendingArrival: null,
                arrivedFrom: null,
                completedNodes: ['bw-12'],
                consumedNodes: ['bw-1', 'bw-19', 'bw-12'],
            }),
        },
        quests: accepted.quests,
    };
}

/** The watchtower won, the bridge walked once (completed by mobile's move, never consumed), standing on the watchtower. */
function atTheTowerWithTheBridgeWalked(): WorldState {
    const w = createStartingWorld('breakwater');
    const settled = settleQuestNodes(w.currentMap);
    return {
        ...w,
        currentMap: syncMoveLists({
            ...settled,
            currentNode: 'bw-17',
            pendingArrival: null,
            completedNodes: [...settled.completedNodes, 'bw-17', 'bw-18'],
            consumedNodes: [...settled.consumedNodes, 'bw-17'],
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
        expect(byId['bw-19']).toMatchObject({ kind: 'completed', walkable: true, actsAgain: false });
        // The windmill is walked but two roads away: drawn walked, not tappable through.
        expect(byId['bw-1']).toMatchObject({ kind: 'completed', walkable: false, actsAgain: false });
        // A new node off the roads draws unreachable.
        expect(byId['bw-4'].kind).toBe('locked');
        // A quiet walk back is not a confirm-panel option.
        expect(vm.options).toEqual([]);
        // Every legal move is marked walkable, and nothing else is.
        const walkable = vm.nodes.filter((n) => n.walkable).map((n) => n.id);
        expect(walkable).toEqual(legalMovesFrom(store.getState().world.currentMap));
    });

    it('a walked door acts again: it is offered on the confirm panel, not walked through', () => {
        const vm = selectExplorationViewModel(storeOn(atTheTowerWithTheBridgeWalked()).getState());
        const bridge = vm.nodes.find((n) => n.id === 'bw-18')!;
        expect(bridge).toMatchObject({ kind: 'completed', walkable: true, actsAgain: true, type: 'door' });
        expect(vm.options.map((o) => o.nodeId)).toContain('bw-18');
    });

    it('the camera frames the node underfoot plus every legal move, walked ones included', () => {
        const vm = selectExplorationViewModel(storeOn(inThePocket()).getState());
        expect(focusKeyOf(vm.nodes)).toBe('bw-12|bw-19');
    });

    it('the walked node a road away draws the road-back ring and says so', () => {
        const tree = mountExploration(storeOn(inThePocket()));
        expect(tree.getByTestId('node-bw-19-road-back')).toBeTruthy();
        expect(tree.getByTestId('node-bw-19').props.accessibilityLabel).toMatch(/walked, a road back$/);
        expect(tree.queryByTestId('node-bw-1-road-back')).toBeNull();
        expect(tree.getByTestId('node-bw-1').props.accessibilityLabel).toMatch(/walked$/);
    });

    it('a walked door reads as a road back that acts again', () => {
        const tree = mountExploration(storeOn(atTheTowerWithTheBridgeWalked()));
        expect(tree.getByTestId('node-bw-18').props.accessibilityLabel).toMatch(/a road back, .+ again$/);
    });
});

describe('moveTo: a walk back owes nothing; a first arrival still owes its event', () => {
    it('a quiet walk back moves the player with no arrival owed and the node untouched', () => {
        const store = storeOn(inThePocket());
        const result = createAppActions(store).moveTo('bw-19');
        expect(result.moved).toBe(true);
        const m = store.getState().world.currentMap;
        expect(m.currentNode).toBe('bw-19');
        expect(m.pendingArrival ?? null).toBeNull();
        expect(m.arrivedFrom).toBe('bw-12');
    });

    it('a first arrival owes its event even though mobile completes the node on the move', () => {
        const store = storeOn(createStartingWorld('breakwater'));
        createAppActions(store).moveTo('bw-5');
        const m = store.getState().world.currentMap;
        expect(m.pendingArrival).toBe('bw-5');
        expect(m.completedNodes).toContain('bw-5');
    });

    it('a node off the roads is still refused', () => {
        const store = storeOn(inThePocket());
        const before = store.getState().world;
        expect(createAppActions(store).moveTo('bw-1').moved).toBe(false);
        expect(store.getState().world).toBe(before);
    });
});

describe('A10: from the windmill into a dead-end pocket and back, then on to a new branch', () => {
    it('walks back across walked nodes to the windmill with no event screen, then confirms a new node', () => {
        const store = storeOn(inThePocket());
        const tree = mountExploration(store);
        const here = () => store.getState().world.currentMap.currentNode;

        tap(tree, 'node-bw-19');
        expect(here()).toBe('bw-19');
        expect(tree.queryByTestId('node-confirm-go')).toBeNull();
        expect(store.getState().event?.pending ?? null).toBeNull();

        tap(tree, 'node-bw-1');
        expect(here()).toBe('bw-1');
        expect(tree.queryByTestId('node-confirm-go')).toBeNull();
        expect(store.getState().event?.pending ?? null).toBeNull();
        expect(store.getState().world.currentMap.pendingArrival ?? null).toBeNull();

        // On to an unvisited branch: a new node keeps its confirm panel.
        tap(tree, 'node-bw-4');
        expect(here()).toBe('bw-1');
        expect(tree.getByTestId('node-confirm-go')).toBeTruthy();
        tap(tree, 'node-confirm-go');
        expect(here()).toBe('bw-4');
        expect(store.getState().world.currentMap.consumedNodes).toContain('bw-4');
    });

    it('a walked door is offered, not crossed, on the tap; the confirm walks onto it and asks "Move to X?"', () => {
        const store = storeOn(atTheTowerWithTheBridgeWalked());
        const tree = mountExploration(store);
        tap(tree, 'node-bw-18');
        expect(store.getState().world.currentMap.name).toBe('breakwater');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-17');
        expect(tree.getByTestId('node-confirm-go')).toBeTruthy();
        tap(tree, 'node-confirm-go');
        // The confirm walks onto the door; the door only OFFERS its trip
        // (phase NK1d). The travel screen's YES is what crosses.
        expect(store.getState().world.currentMap.name).toBe('breakwater');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-18');
        expect(store.getState().travel.open?.destination).toEqual({ map: 'charcoal-wood', continent: 'coastal-continent' });
    });

    it('a walked village (the Anvil one) opens its hub again on the confirm, not the Anvil', () => {
        const w = createStartingWorld('breakwater');
        const settled = settleQuestNodes(w.currentMap);
        const store = storeOn({
            ...w,
            currentMap: syncMoveLists({
                ...settled,
                currentNode: 'bw-13',
                pendingArrival: null,
                completedNodes: [...settled.completedNodes, 'bw-13', 'bw-16'],
                consumedNodes: [...settled.consumedNodes, 'bw-1', 'bw-13', 'bw-16'],
            }),
        });
        const vm = selectExplorationViewModel(store.getState());
        expect(vm.nodes.find((n) => n.id === 'bw-16')).toMatchObject({ kind: 'completed', walkable: true, actsAgain: true, type: 'village' });
        const tree = mountExploration(store);
        tap(tree, 'node-bw-16');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-13');
        tap(tree, 'node-confirm-go');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-16');
        expect(store.getState().event?.pending?.event.kind).toBe('village');
        expect(selectHasActiveBlacksmith(store.getState())).toBe(false);
    });
});
