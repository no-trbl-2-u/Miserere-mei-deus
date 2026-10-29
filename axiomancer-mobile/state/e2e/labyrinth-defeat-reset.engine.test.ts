/**
 * Regression — losing a battle inside THE APORIA must not white-screen.
 *
 * Repro of the "battle loss → THE BINDING TORE" crash: a combat defeat
 * (or hazard death) inside the labyrinth routes through
 * `resetRun({ keepCharacter: true })`, which regenerates the OVERWORLD
 * and re-seats the player at the starting node (`bw-w1`). The mobile
 * `labyrinthUi` session, however, is transient and was left active —
 * so the still-mounted labyrinth presenter looked `bw-w1` up in the act
 * and threw `LabyrinthContentError: Room 'bw-w1' is not authored in
 * act1`, tripping the global error boundary.
 *
 * Two guarantees pinned here:
 *   1. `resetRun` clears the labyrinth session (root cause).
 *   2. The presenter is defensive: an active session whose world node
 *      is NOT a room in the act falls back to `act-select` instead of
 *      throwing (defense-in-depth for any other world/session desync).
 */

import { describe, expect, it } from '@jest/globals';

import { createAppActions } from '@/state/actions';
import { selectLabyrinthViewModel } from '@/state/presenters/labyrinth.engine';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

function makeStoreAndActions() {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    return { store, actions: createAppActions(store) };
}

describe('labyrinth — defeat / run reset', () => {
    it('resetRun clears the in-flight labyrinth session', () => {
        const { store, actions } = makeStoreAndActions();

        actions.enterLabyrinth('act1');
        expect(store.getState().labyrinthUi?.session).not.toBeNull();
        expect(selectLabyrinthViewModel(store.getState()).kind).toBe('room');

        // A battle loss inside the labyrinth resets the run.
        actions.resetRun({ keepCharacter: true });

        // The session is dropped, and the presenter does not throw.
        expect(store.getState().labyrinthUi?.session ?? null).toBeNull();
        expect(() => selectLabyrinthViewModel(store.getState())).not.toThrow();
        expect(selectLabyrinthViewModel(store.getState()).kind).toBe('act-select');
    });

    it('the presenter falls back to act-select when a live session points at a non-act node', () => {
        const { store, actions } = makeStoreAndActions();

        actions.enterLabyrinth('act1');
        const world = store.getState().world;

        // Simulate the world being swapped to the overworld under a still
        // active session (e.g. a save/load race), WITHOUT clearing it.
        store.setState({
            world: {
                ...world,
                currentMap: { ...world.currentMap, currentNode: 'bw-w1' },
            },
        } as never);

        expect(store.getState().labyrinthUi?.session).not.toBeNull();
        expect(() => selectLabyrinthViewModel(store.getState())).not.toThrow();
        expect(selectLabyrinthViewModel(store.getState()).kind).toBe('act-select');
    });
});
