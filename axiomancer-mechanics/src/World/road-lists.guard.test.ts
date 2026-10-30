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
import { questNodeIdsOn, settleQuestNodes } from '../Game/fixtures/quest-nodes';
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

    it('a map that authors no blocked roads opens with none', () => {
        // guard-test: the `initialBlockedRoutes ?? []` default (mutation survivor map.registry.ts:73 left by #1063)
        const { initialBlockedRoutes: _, ...open } = graph('gauntlet');
        const m = createMapState(open);
        expect(m.blockedRoutes).toEqual([]);
        expect(m.availableNodes).toEqual(['a', 'b']);
    });
});

describe('settleQuestNodes re-syncs the move lists', () => {
    it('after settling, available is the legal moves and no spent marker is locked', () => {
        const settled = settleQuestNodes(createStartingWorld('breakwater').currentMap);
        expect(settled.availableNodes).toEqual(legalMovesFrom(settled));
        const questNodes = questNodeIdsOn('breakwater');
        expect(questNodes.length).toBeGreaterThan(0);
        for (const node of questNodes) {
            expect(settled.lockedNodes).not.toContain(node);
        }
    });
});

describe('settleQuestNodes leaves a map with no questline alone', () => {
    // guard-test: the map-name filter and the unchanged-map short cut (mutation survivors quest-nodes.ts:32 and :39 left by #1063)
    it('returns the map itself: no other map\'s quest node is consumed, and stale lists are not re-synced', () => {
        expect(questNodeIdsOn('charcoal-wood')).toEqual([]);
        const map = createStartingWorld('charcoal-wood').currentMap;
        const stale = { ...map, availableNodes: [], lockedNodes: [] };
        const settled = settleQuestNodes(stale);
        expect(settled).toBe(stale);
        expect(settled.consumedNodes).toEqual([]);
    });
});
