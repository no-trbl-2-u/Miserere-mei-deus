/**
 * Hermetic E2E Tests — a puzzle hazard node (phase HP6c, A6-A8).
 *
 * The Breakwater's six hazard nodes each open their candidate's one-round
 * puzzle on its graded route; every other hazard node still draws the
 * three-round board. The walk into the wreck (`bw-h4`) goes the way the map
 * screen goes (move, then resolve the arrival), plays the puzzle with the
 * `noisy-greedy` bot, claims it, closes the board, and finds the wreck's held
 * road (on to the moored ship and the sea cave) open.
 */

import { afterEach, describe, expect, it } from '@jest/globals';
import {
    BREAKWATER_HAZARD_NODES,
    BREAKWATER_HAZARD_PUZZLES,
    createStartingWorld,
    getHazardPuzzleCandidate,
    legalMovesFrom,
    syncMoveLists,
    type GameState,
    type WorldState,
} from '@mechanics';

import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { settledBreakwater } from '@/test-utils/settledBreakwater';

afterEach(() => {
    delete (globalThis as { __AXM_HAZARD_ID__?: string }).__AXM_HAZARD_ID__;
});

function storeOn(world: WorldState) {
    const store = createAppStore({ adapter: createMemoryAdapter(), overrides: { world } });
    const p = store.getState().player;
    store.setState({ player: { ...p, health: 40, maxHealth: 40 } } as never);
    return { store, actions: createAppActions(store) };
}

function standingOn(map: Parameters<typeof createStartingWorld>[0], nodeId: string): WorldState {
    const world = createStartingWorld(map);
    return { ...world, currentMap: syncMoveLists({ ...world.currentMap, currentNode: nodeId }) };
}

describe('a puzzle hazard node: the walk into the wreck', () => {
    it('opens the wreck\'s puzzle on arrival, and the claim leaves the sea-cave road open', () => {
        const { store, actions } = storeOn(settledBreakwater('bw-h3'));
        expect(actions.moveTo('bw-h4').moved).toBe(true);
        actions.resolveCurrentMapEvent('hazard');

        const play = store.getState().hazard.puzzle;
        expect(store.getState().hazard.session).toBeNull();
        expect(play).toBeTruthy();
        expect(play!.nodeId).toBe('bw-h4');
        expect(play!.candidateId).toBe(BREAKWATER_HAZARD_PUZZLES['bw-h4']);
        // One puzzle, on the candidate's graded route: no route choice.
        const candidate = getHazardPuzzleCandidate(play!.candidateId);
        expect(play!.session.route).toBe(candidate.route);
        expect(play!.session.phase).toBe('playing');

        const xpBefore = store.getState().player.experience;
        const claim = actions.playHazardPuzzleNodeBot(7);
        expect(claim).not.toBeNull();
        expect(store.getState().hazard.puzzle?.claim).toBe(claim);
        expect(store.getState().hazard.puzzle?.session.phase).toBe('resolved');
        // The claim applied the outcome: XP always, VITAE never below 1.
        expect(store.getState().player.experience).toBeGreaterThan(xpBefore);
        expect(store.getState().player.health).toBeGreaterThanOrEqual(1);

        actions.leaveHazardPuzzleNode();
        expect(store.getState().hazard.puzzle).toBeNull();
        const map = (store.getState() as unknown as GameState).world.currentMap;
        expect(map.currentNode).toBe('bw-h4');
        expect(legalMovesFrom(map)).toContain('bw-h5');
    });

    it('a confirm with no move resolves short, still claims, and the board closes', () => {
        const { store, actions } = storeOn(settledBreakwater('bw-h4'));
        expect(actions.beginHazard()).toBe(true);
        const claim = actions.confirmHazardPuzzleNode({ seed: 3 });
        expect(claim).not.toBeNull();
        expect(store.getState().hazard.puzzle?.claim?.outcome.route).toBe(store.getState().hazard.puzzle?.session.route);
        // A second confirm is a no-op.
        expect(actions.confirmHazardPuzzleNode()).toBeNull();
        actions.leaveHazardPuzzleNode();
        expect(store.getState().hazard.puzzle).toBeNull();
    });
});

describe('which board a hazard node opens', () => {
    it.each(BREAKWATER_HAZARD_NODES.map((n) => [n]))('%s opens its own puzzle', (nodeId) => {
        const { store, actions } = storeOn(settledBreakwater(nodeId));
        expect(actions.beginHazard()).toBe(true);
        expect(store.getState().hazard.session).toBeNull();
        expect(store.getState().hazard.puzzle?.candidateId).toBe(BREAKWATER_HAZARD_PUZZLES[nodeId]);
        // One hazard at a time.
        expect(actions.beginHazard()).toBe(false);
    });

    it('a Charcoal Wood hazard (cw-3) still opens the three-round board', () => {
        const { store, actions } = storeOn(standingOn('charcoal-wood', 'cw-3'));
        expect(actions.beginHazard()).toBe(true);
        expect(store.getState().hazard.puzzle ?? null).toBeNull();
        expect(store.getState().hazard.session?.phase).toBe('route-select');
    });

    it('a pinned hazard id draws the three-round board even on a puzzle node', () => {
        const { store, actions } = storeOn(settledBreakwater('bw-h4'));
        expect(actions.beginHazard({ seed: 7, hazardId: 'cracked-cliff' })).toBe(true);
        expect(store.getState().hazard.puzzle ?? null).toBeNull();
        expect(store.getState().hazard.session?.hazardId).toBe('cracked-cliff');
    });

    it('an old three-round session open at a puzzle node finishes on the old board', () => {
        const { store, actions } = storeOn(settledBreakwater('bw-h4'));
        actions.beginHazard({ seed: 7, hazardId: 'cracked-cliff' });
        // Re-entering while it is open does not swap it for the puzzle.
        expect(actions.beginHazard()).toBe(false);
        expect(store.getState().hazard.session?.hazardId).toBe('cracked-cliff');
        expect(store.getState().hazard.puzzle ?? null).toBeNull();
    });
});
