import { describe, expect, it } from 'vitest';

import {
    createNewGameState,
    settleQuestNodes,
    syncMoveLists,
    type GameState,
} from '../../index';
import { distanceToUnfinished, isNodeUnfinished, runRoadOptions } from './run-roads';

/** A new game as the-chosen, optionally standing on `nodeId` with `spent` nodes walked. */
function stateAt(nodeId?: string, spent: readonly string[] = [], settled = false): GameState {
    const fresh = createNewGameState({ characterId: 'the-chosen' });
    let map = fresh.world.currentMap;
    if (settled) map = settleQuestNodes(map);
    map = { ...map, completedNodes: [...map.completedNodes, ...spent] };
    if (nodeId !== undefined) map = syncMoveLists({ ...map, currentNode: nodeId, pendingArrival: null });
    return { ...fresh, world: { ...fresh.world, currentMap: map } };
}

describe('runRoadOptions', () => {
    it('offers the windmill road to the first fight, unfinished, distance 0', () => {
        const options = runRoadOptions(stateAt());
        expect(options.map((o) => o.nodeId)).toEqual(['bw-w2']);
        expect(options[0]).toMatchObject({ via: 'road', nodeKind: 'encounter', unfinished: true, distanceToUnfinished: 0 });
    });

    it('never offers a road through a shut quest gate (the keep gate)', () => {
        const options = runRoadOptions(stateAt('bw-k1', ['bw-w2', 'bw-w4', 'bw-w5']));
        expect(options.map((o) => o.nodeId)).not.toContain('bw-k2');
    });

    it('measures the walk past spent nodes to the nearest unfinished one', () => {
        const state = stateAt('bw-w2', ['bw-w2', 'bw-w3']);
        const viaField = runRoadOptions(state).find((o) => o.nodeId === 'bw-w3');
        // bw-w3 is spent; bw-h1 lies one road past it.
        expect(viaField).toMatchObject({ unfinished: false, distanceToUnfinished: 1 });
    });

    it('offers the sea cave passage from the cave mouth as a trip', () => {
        const options = runRoadOptions(stateAt('bw-h6', ['bw-w2', 'bw-w3', 'bw-h1', 'bw-h2', 'bw-h3', 'bw-h4', 'bw-h5', 'bw-h6']));
        expect(options.find((o) => o.via === 'travel')).toMatchObject({ nodeId: 'bw-c0', unfinished: true });
    });

    it('offers the node underfoot again when it is unspent and its arrival answered', () => {
        const options = runRoadOptions(stateAt('bw-w2'));
        expect(options[0]).toMatchObject({ nodeId: 'bw-w2', via: 'retry', distanceToUnfinished: 0 });
    });
});

describe('isNodeUnfinished', () => {
    it('reads a quest node with no business as finished, and the start node always', () => {
        const state = stateAt();
        expect(isNodeUnfinished(state, 'bw-l5')).toBe(false);
        expect(isNodeUnfinished(state, 'bw-w1')).toBe(false);
        expect(isNodeUnfinished(state, 'bw-w3')).toBe(true);
    });

    it('returns null distance when nothing unfinished is reachable', () => {
        const state = stateAt('bw-w2', [], true);
        const all = state.world.currentMap;
        const everything = { ...all, completedNodes: ['bw-w2', 'bw-w3', 'bw-w4', 'bw-m1', 'bw-w5', 'bw-k1', 'bw-h1', 'bw-m2', 'bw-p1'] };
        const walled: GameState = { ...state, world: { ...state.world, currentMap: { ...everything, blockedRoutes: [
            { from: 'bw-w3', to: 'bw-h1', reason: 'test' },
            { from: 'bw-w4', to: 'bw-w5', reason: 'test' },
            { from: 'bw-m1', to: 'bw-m2', reason: 'test' },
            { from: 'bw-m1', to: 'bw-p1', reason: 'test' },
        ] } } };
        expect(distanceToUnfinished(walled, 'bw-w3', 'bw-w2')).toBeNull();
    });
});
