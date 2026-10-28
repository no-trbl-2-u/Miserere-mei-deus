/**
 * The death rule through the app's action surface (phase DY1a).
 *
 * Mobile's own move records `arrivedFrom` (it delegates to the engine's
 * `arriveAtNode`), and `playerDied` revives a first death on that node and
 * ends the run on the next, with the same cleanup `resetRun` gives.
 * The combat route calls it for a lost fight on the map (phase DY1b).
 */

import { describe, expect, it } from '@jest/globals';

import { createAppActions } from '@/state/actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

function makeStoreAndActions() {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    return { store, actions: createAppActions(store) };
}

describe('playerDied saves', () => {
    it('a revive is written to the slot with dying, the player back on the node walked from', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter });
        const actions = createAppActions(store);
        actions.moveTo('bw-2');
        const before = adapter.saveCount;

        actions.playerDied('fight');

        expect(adapter.saveCount).toBeGreaterThan(before);
        const saved = adapter.load();
        expect(saved?.dying).toBe(true);
        expect(saved?.player.health).toBe(1);
        expect(saved?.world.currentMap.currentNode).toBe('bw-1');
    });
});

describe('playerDied', () => {
    it('the app move records the node walked from', () => {
        const { store, actions } = makeStoreAndActions();
        actions.moveTo('bw-2');
        const map = store.getState().world.currentMap;
        expect(map.currentNode).toBe('bw-2');
        expect(map.arrivedFrom).toBe('bw-1');
    });

    it('a first death revives on that node, dying, the fight node open', () => {
        const { store, actions } = makeStoreAndActions();
        actions.moveTo('bw-2');
        expect(actions.playerDied('fight')).toBe('revived');

        const s = store.getState();
        expect(s.dying).toBe(true);
        expect(s.player.health).toBe(1);
        expect(s.world.currentMap.currentNode).toBe('bw-1');
        expect(s.world.currentMap.completedNodes).not.toContain('bw-2');
        expect(s.world.currentMap.availableNodes).toContain('bw-2');
    });

    it('a death while dying ends the run and drops dying', () => {
        const { store, actions } = makeStoreAndActions();
        const runId = store.getState().runId;
        actions.moveTo('bw-2');
        actions.playerDied('fight');
        actions.moveTo('bw-2');
        expect(actions.playerDied('fight')).toBe('run-over');

        const s = store.getState();
        expect(s.dying).toBeUndefined();
        expect(s.runId).not.toBe(runId);
        expect(s.player.health).toBe(s.player.maxHealth);
        expect(s.world.currentMap.currentNode).toBe('bw-1');
    });
});
