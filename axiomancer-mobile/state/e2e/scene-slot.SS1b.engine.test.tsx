/**
 * The phone plays a node's scene, then the node's own screen.
 *
 * A fixture scene sits on `bw-w2` (the road from the windmill) over a fixture
 * pool: a fight, a hazard, or nothing. The map's confirm resolves the node
 * (`resolveCurrentMapEvent`); the scene opens `/cutscene`, its last tap and SKIP
 * continue to the node's own screen, and the node is not spent by its scene.
 *
 *   A5  scene -> fight reveal (`<CombatGate>` stages it and pushes
 *       `/combat-encounter`) -> combat; scene -> `/hazard`; scene -> map.
 *
 * Hermetic = self-contained + deterministic + isolated. See `docs/testing.md`.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));
jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { isBeforeScene, registerNodeScene, selectIsInCombat } from '@mechanics';
import { registerMapEventPool, setNodeEventPoolOverride } from '@mechanics/World/MapEvents/resolve-map-event';
import type { MapEventPayload } from '@mechanics';

import CutsceneScreen from '@/app/cutscene';
import { CombatGate } from '@/components/CombatGate';
import { CombatModeProvider } from '@/state/combat-mode';
import { createAppActions, type AppActions } from '@/state/actions';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { selectPacedEventRoute } from '@/state/presenters/event.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { settledBreakwater } from '@/test-utils/settledBreakwater';

const C = 'coastal-continent';
const M = 'breakwater';
const NODE = 'bw-w2';
const LINES = ['The chapel bell rings with no rope.', 'Something below the floor answers it.'] as const;

let poolSeq = 0;

/** Give `bw-w2` the fixture scene and a pool of one payload (none: an empty pool). */
function fixtureNode(payload: MapEventPayload | null): void {
    registerNodeScene(C, M, NODE, { before: { kind: 'cutscene', lines: [...LINES], scene: 'clifftop-chapel' } });
    poolSeq += 1;
    const id = `ss1b.pool.${poolSeq}`;
    registerMapEventPool({
        id,
        entries: payload ? [{ kind: payload.kind, weight: 1, payload }] : [],
    });
    setNodeEventPoolOverride(C, M, NODE, id);
}

function makeStore(): { store: AppStore; actions: AppActions } {
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world: settledBreakwater() } });
    return { store, actions: createAppActions(store) };
}

/** The confirm panel's work: move to the node, then resolve it with its node type. */
function walkOnto(actions: AppActions, nodeType: string): boolean {
    expect(actions.moveTo(NODE).moved).toBe(true);
    return actions.resolveCurrentMapEvent(nodeType);
}

function mount(store: AppStore) {
    return render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <CutsceneScreen />
                <CombatGate />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
}

/** Tap through every beat; the last tap ends the scene. */
function tapThrough(tree: ReturnType<typeof mount>, beats: number) {
    for (let i = 0; i < beats; i += 1) {
        act(() => { fireEvent.press(tree.getByTestId('cutscene-advance')); });
        act(() => { jest.advanceTimersByTime(1000); });
    }
}

const consumed = (store: AppStore) => store.getState().world.currentMap.consumedNodes;

beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

describe('A5: a fight node plays its scene, then the fight reveal, then combat', () => {
    it('routes the scene to /cutscene and does not spend the node', () => {
        fixtureNode({ kind: 'encounter', enemySlug: 'float-eye' });
        const { store, actions } = makeStore();

        expect(walkOnto(actions, 'encounter')).toBe(true);

        const pending = store.getState().event.pending;
        expect(pending && isBeforeScene(pending.event)).toBe(true);
        expect(selectPacedEventRoute(store.getState())).toBe('/cutscene');
        expect(consumed(store)).not.toContain(NODE);
        expect(store.getState().event.sourceNodeType).toBe('encounter');
        expect(selectIsInCombat(store.getState())).toBe(false);
    });

    it('the last tap continues to the fight reveal, which the gate stages and pushes', () => {
        fixtureNode({ kind: 'encounter', enemySlug: 'float-eye' });
        const { store, actions } = makeStore();
        walkOnto(actions, 'encounter');
        const tree = mount(store);

        tapThrough(tree, LINES.length);
        act(() => { jest.advanceTimersByTime(10); });

        // The fight is staged (combat), the scene is gone, and the node waits on the fight.
        expect(selectIsInCombat(store.getState())).toBe(true);
        expect(store.getState().event.pending).toBeNull();
        expect(mockPush).toHaveBeenCalledWith('/combat-encounter');
        expect(consumed(store)).not.toContain(NODE);
    });

    it('SKIP continues to the fight the same way', () => {
        fixtureNode({ kind: 'encounter', enemySlug: 'float-eye' });
        const { store, actions } = makeStore();
        walkOnto(actions, 'encounter');
        const tree = mount(store);

        act(() => { fireEvent.press(tree.getByTestId('cutscene-skip')); });
        act(() => { jest.advanceTimersByTime(10); });

        expect(selectIsInCombat(store.getState())).toBe(true);
        expect(mockPush).toHaveBeenCalledWith('/combat-encounter');
    });

    it('continueToNode resolves the same node again: the fight, with the scene on the seen list', () => {
        fixtureNode({ kind: 'encounter', enemySlug: 'float-eye' });
        const { store, actions } = makeStore();
        walkOnto(actions, 'encounter');
        expect(actions.continueToNode()).toBe(true);
        expect(store.getState().event.pending?.event.kind).toBe('encounter');
        expect(store.getState().world.currentMap.seenScenes).toContain(NODE);
    });
});

describe('A5: a hazard node routes to /hazard after its scene', () => {
    it('opens the hazard session on continue, not before', () => {
        fixtureNode({ kind: 'hazard', damage: 1 });
        const { store, actions } = makeStore();
        walkOnto(actions, 'hazard');
        const tree = mount(store);

        expect(store.getState().hazard.session).toBeNull();
        expect(selectPacedEventRoute(store.getState())).toBe('/cutscene');

        tapThrough(tree, LINES.length);

        expect(store.getState().hazard.session).not.toBeNull();
        expect(store.getState().event.pending).toBeNull();
    });
});

describe('A5: an empty node returns to the map after its scene', () => {
    it('the end of the scene leaves no event and the node is settled by the engine', () => {
        fixtureNode(null);
        const { store, actions } = makeStore();
        walkOnto(actions, 'story');
        const tree = mount(store);
        const scened = store.getState().event.pending;
        expect(scened !== null && isBeforeScene(scened.event)).toBe(true);

        tapThrough(tree, LINES.length);

        expect(store.getState().event.pending?.event.kind ?? 'none').toBe('none');
        expect(selectPacedEventRoute(store.getState())).toBeNull();
        expect(consumed(store)).toContain(NODE);
        expect(selectIsInCombat(store.getState())).toBe(false);
        expect(store.getState().hazard.session).toBeNull();
    });
});

describe('a cutscene that is not a before-scene still just ends', () => {
    it('dismissEvent clears the slice and resolves nothing further', () => {
        const { store, actions } = makeStore();
        store.setState({
            event: {
                ...store.getState().event,
                pending: { state: undefined as never, event: { kind: 'cutscene', lines: [...LINES] } },
            },
        });
        const tree = mount(store);

        tapThrough(tree, LINES.length);

        expect(store.getState().event.pending).toBeNull();
        expect(actions).toBeDefined();
    });
});
