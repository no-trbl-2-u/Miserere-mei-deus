/**
 * Hermetic tests — dev world-travel helpers.
 *
 * Pins:
 *   - `listMaps` covers all three continents in registry order.
 *   - `travelToMap` swaps continent + map and lands on the start node.
 *   - `listNodes` labels the current node and start node.
 *   - `jumpToNode` moves the cursor to any node (back-travel allowed)
 *     and rejects unknown ids.
 *   - `resetCurrentMap` returns to the start node.
 *   - `completeCurrentMap` stamps completion + unlocks the next map.
 */

import { getMapDefinition, createStartingWorld } from '@mechanics';

import { createAppStore } from '@/state/store';
import {
    completeCurrentMap,
    jumpToNode,
    listMaps,
    listNodes,
    resetCurrentMap,
    travelToMap,
} from '@/state/dev/world-travel';

describe('world-travel dev helpers', () => {
    it('listMaps enumerates every continent', () => {
        const maps = listMaps();
        expect(maps.map((m) => m.map)).toEqual(expect.arrayContaining(['breakwater', 'lantern-deep', 'aporia-proof']));
        expect(new Set(maps.map((m) => m.continent)).size).toBe(3);
    });

    it('travelToMap lands on the destination start node with the continent switched', () => {
        const store = createAppStore({ overrides: { world: createStartingWorld('breakwater') } });
        expect(travelToMap(store, 'northern-continent', 'beacon-crags')).toBe(true);
        const world = store.getState().world;
        expect(world.currentContinent.name).toBe('northern-continent');
        expect(world.currentMap.name).toBe('beacon-crags');
        expect(world.currentMap.currentNode).toBe(getMapDefinition('northern-continent', 'beacon-crags').startingNode.id);
    });

    it('listNodes flags the start + current node and every node of the map', () => {
        const store = createAppStore({ overrides: { world: createStartingWorld('breakwater') } });
        const map = store.getState().world.currentMap;
        const nodes = listNodes(store.getState());
        expect(nodes.length).toBe(getMapDefinition(map.continent, map.name).nodes.length);
        expect(nodes.find((n) => n.isCurrent)?.id).toBe(map.currentNode);
        expect(nodes.some((n) => n.isStart)).toBe(true);
    });

    it('jumpToNode moves the cursor anywhere and rejects unknown ids', () => {
        const store = createAppStore({ overrides: { world: createStartingWorld('breakwater') } });
        const target = listNodes(store.getState()).find((n) => !n.isCurrent)!;
        expect(jumpToNode(store, target.id)).toBe(true);
        const map = store.getState().world.currentMap;
        expect(map.currentNode).toBe(target.id);
        expect(map.availableNodes).not.toContain(target.id); // the node underfoot is no move
        expect(map.lockedNodes).not.toContain(target.id);
        expect(jumpToNode(store, 'no-such-node')).toBe(false);
    });

    it('resetCurrentMap returns to the start node', () => {
        const store = createAppStore({ overrides: { world: createStartingWorld('breakwater') } });
        const start = store.getState().world.currentMap.currentNode;
        const target = listNodes(store.getState()).find((n) => !n.isCurrent)!;
        jumpToNode(store, target.id);
        expect(resetCurrentMap(store)).toBe(true);
        expect(store.getState().world.currentMap.currentNode).toBe(start);
    });

    it('completeCurrentMap stamps completion and unlocks the next locked map', () => {
        const store = createAppStore({ overrides: { world: createStartingWorld('breakwater') } });
        const before = store.getState().world.currentContinent;
        const nextLocked = before.lockedMaps[0];
        expect(completeCurrentMap(store)).toBe(nextLocked);
        const after = store.getState().world.currentContinent;
        expect(after.completedMaps).toContain(before.name === 'coastal-continent' ? 'breakwater' : store.getState().world.currentMap.name);
        expect(after.availableMaps).toContain(nextLocked);
        expect(after.lockedMaps).not.toContain(nextLocked);
    });
});
