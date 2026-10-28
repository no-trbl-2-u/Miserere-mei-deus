/**
 * Hermetic E2E - resolving a `quest` node in the app (phase QL1a).
 *
 * A quest event has no card: it must never fill the paced event slice (the
 * `/event` modal would render an empty view model), and its node stays
 * unspent; it opens the quest screen (`/quest`, phase QL1c) through the quest slice.
 */

import { describe, expect, it } from '@jest/globals';

import { createFixtureStore } from '@/test-utils/fixtureStore';

describe('resolving a quest node', () => {
    it('sets no pending event, opens the quest screen and leaves the node unspent', () => {
        const { store, actions } = createFixtureStore(
            { id: 'quest-node', seed: 'quest-node', world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-1' } },
        );

        const resolved = actions.resolveCurrentMapEvent(undefined, {
            kind: 'quest', questline: 'fixture-line', node: 1,
        });

        expect(resolved).toBe(true);
        expect(store.getState().event.pending).toBeNull();
        expect(store.getState().quest.open).toMatchObject({ questline: 'fixture-line', node: 1 });
        expect(store.getState().world.currentMap.consumedNodes).not.toContain('bw-1');
        expect(store.getState().world.currentMap.currentNode).toBe('bw-1');
    });
});
