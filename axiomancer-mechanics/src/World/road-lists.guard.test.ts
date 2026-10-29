// guard-test: pins WR1a's move lists at map creation and after settling quest nodes (mutation survivors left by #1063), so it passes on the parent by design
/**
 * The road rule's two lists where WR1a's tests left them unpinned:
 * `createMapState` on a gauntlet against a labyrinth of the same graph, and
 * `settleQuestNodes`' re-sync.
 */

import { describe, it, expect } from 'vitest';

import { createMapState } from './map.registry';
import { roadMoveLists } from './roads';
import { legalMovesFrom } from './world.reducer';
import { createStartingWorld } from './index';
import { settleQuestNodes } from '../Game/fixtures/quest-nodes';
import type { MapDefinition } from './types';

/** Start `s` reaches `a` (blocked) on its own list and `b` only by `b`'s road back to it. */
function graph(traversal: 'gauntlet' | 'labyrinth'): MapDefinition {
    const s = { id: 's', location: [0, 0] as [number, number], connectedNodes: ['a'] };
    return {
        name: 'breakwater',
        continent: 'coastal-continent',
        description: '',
        traversal,
        startingNode: s,
        nodes: [
            s,
            { id: 'a', location: [1, 0], connectedNodes: [] },
            { id: 'b', location: [1, 1], connectedNodes: ['s'] },
            { id: 'c', location: [2, 0], connectedNodes: [] },
        ],
        initialBlockedRoutes: [{ from: 's', to: 'a', reason: 'shut' }],
    };
}

describe('createMapState keeps the road rule on a gauntlet and adjacency on a labyrinth', () => {
    it('a gauntlet reads roads both ways and skips a blocked one', () => {
        const m = createMapState(graph('gauntlet'));
        expect(m.availableNodes).toEqual(['b']);
        expect(m.lockedNodes).toEqual(['a', 'c']);
        expect({ availableNodes: m.availableNodes, lockedNodes: m.lockedNodes }).toEqual(
            roadMoveLists(graph('gauntlet'), { currentNode: 's', completedNodes: [], consumedNodes: [], blockedRoutes: m.blockedRoutes }),
        );
    });

    it('a labyrinth offers the start room\'s own doors', () => {
        const m = createMapState(graph('labyrinth'));
        expect(m.availableNodes).toEqual(['a']);
        expect(m.lockedNodes).toEqual(['b', 'c']);
    });
});

describe('settleQuestNodes re-syncs the move lists', () => {
    it('after settling, available is the legal moves and no spent marker is locked', () => {
        const settled = settleQuestNodes(createStartingWorld('breakwater').currentMap);
        expect(settled.availableNodes).toEqual(legalMovesFrom(settled));
        for (const marker of ['bw-19', 'bw-20', 'bw-21', 'bw-22']) {
            expect(settled.lockedNodes).not.toContain(marker);
        }
    });
});
