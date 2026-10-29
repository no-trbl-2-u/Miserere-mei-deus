import { describe, it, expect } from 'vitest';
import {
    completeMap, unlockMap, completeNode, unlockNode, completeUniqueEvent,
    changeContinent, completeCurrentNode, moveToNode,
    isNodeSpent, legalMovesFrom, syncMoveLists, IllegalMoveError,
} from './world.reducer';
import { createStartingWorld } from './index';
import { getMapDefinition } from './map.registry';
import type { MapState, WorldState } from './types';

const world = () => createStartingWorld('breakwater');

/** Test fixture: block the route between two nodes (either direction). The
 *  engine's own blocker (`blockMapRoute`) was deleted in TRIM THE FAT T2a;
 *  movement still honours `MapState.blockedRoutes`, which this writes. */
const withBlockedRoute = (map: MapState, from: string, to: string, reason: string): MapState => ({
    ...map,
    blockedRoutes: [...map.blockedRoutes, { from, to, reason }],
});

/** A Breakwater world with the runtime map fields overridden. */
const bwWorld = (patch: Partial<MapState>): WorldState => {
    const w = createStartingWorld('breakwater');
    return { ...w, currentMap: { ...w.currentMap, ...patch } };
};

/** Walk + resolve: the real loop's shape — arrive, then answer the arrival. */
const advance = (from: WorldState, nodeId: string): WorldState =>
    completeCurrentNode(moveToNode(from, nodeId));

describe('createStartingWorld', () => {
    it('does not list a map in both available and locked', () => {
        const { currentContinent } = world();
        for (const name of currentContinent.availableMaps) {
            expect(currentContinent.lockedMaps).not.toContain(name);
        }
    });

    it('catalogues the two campaign continents, coastal current (2026-08-28 travel)', () => {
        const w = world();
        expect(w.world.map(c => c.name)).toEqual(['coastal-continent', 'northern-continent']);
        expect(w.currentContinent.name).toBe('coastal-continent');
        // The labyrinth-continent (W-01) is deliberately uncatalogued —
        // dev-menu + CLI only.
        expect(w.world.map(c => c.name)).not.toContain('labyrinth-continent');
        const northern = w.world.find(c => c.name === 'northern-continent')!;
        expect(northern.lockedMaps).toContain('beacon-crags');
        expect(northern.availableMaps).toEqual([]);
    });
});

describe('completeMap', () => {
    it('adds to completedMaps', () => {
        const w = completeMap(world(), 'breakwater');
        expect(w.currentContinent.completedMaps).toContain('breakwater');
    });
    it('idempotent', () => {
        const w1 = completeMap(world(), 'breakwater');
        const w2 = completeMap(w1, 'breakwater');
        expect(w2.currentContinent.completedMaps.filter(m => m === 'breakwater')).toHaveLength(1);
    });
});

describe('unlockMap', () => {
    it('moves from locked to available', () => {
        const w = unlockMap(world(), 'charcoal-wood');
        expect(w.currentContinent.lockedMaps).not.toContain('charcoal-wood');
        expect(w.currentContinent.availableMaps).toContain('charcoal-wood');
    });
    it('idempotent if already available', () => {
        const w1 = unlockMap(world(), 'charcoal-wood');
        const w2 = unlockMap(w1, 'charcoal-wood');
        expect(w2).toBe(w1);
    });
});

describe('completeNode', () => {
    it('adds to completedNodes', () => {
        const w = completeNode(world(), 'bw-2');
        expect(w.currentMap.completedNodes).toContain('bw-2');
    });
});

describe('unlockNode', () => {
    it('moves from locked to available', () => {
        const w = unlockNode(world(), 'bw-7');
        expect(w.currentMap.lockedNodes).not.toContain('bw-7');
        expect(w.currentMap.availableNodes).toContain('bw-7');
    });
});

describe('changeContinent', () => {
    // Pre-travel (2026-08-28) the catalogue was `[]`, so this function could
    // ONLY no-op and the test pinned that. The catalogue is real now.
    it('switches to a catalogued continent', () => {
        const w = changeContinent(world(), 'northern-continent');
        expect(w.currentContinent.name).toBe('northern-continent');
        expect(w.currentContinent.lockedMaps).toContain('beacon-crags');
    });

    it('writes the outgoing continent back into the catalogue before switching', () => {
        const w1 = completeMap(world(), 'breakwater');
        const w2 = changeContinent(w1, 'northern-continent');
        const coastal = w2.world.find(c => c.name === 'coastal-continent')!;
        expect(coastal.completedMaps).toContain('breakwater');
    });

    it('still no-ops for an uncatalogued continent (the labyrinth stays dev-only)', () => {
        const w = world();
        expect(changeContinent(w, 'labyrinth-continent')).toBe(w);
    });
});

describe('completeUniqueEvent', () => {
    it('returns unchanged when event id is unknown', () => {
        const w = world();
        const next = completeUniqueEvent(w, 'unknown-id');
        expect(next.currentMap.uniqueEvents).toEqual(w.currentMap.uniqueEvents);
    });
});

// ── Walking the roads (phase WR1a) ──────────────────────────────────────────
//
// The traversal doctrine, stated as behaviour: on a gauntlet map the legal
// moves are the open roads out of the node the player stands on, read both
// ways, new and spent nodes alike; nothing jumps across the map. Staged on
// the Breakwater (the new-game map): bw-1 (the windmill) opens on marker 1
// (bw-19), the foothill pass (bw-4) and the smugglers' cove (bw-5); the open
// fan behind them (bw-7, bw-9, bw-11, bw-13, bw-15, bw-16) holds no marker;
// bw-17 is the door fight and bw-18 the terminal door behind it.

/** Every node id on the Breakwater, in definition order. */
const allBreakwaterNodes = (): string[] => {
    const map = world().currentMap;
    return getMapDefinition(map.continent, map.name).nodes.map(n => n.id);
};

describe('A1 — the legal moves are the open roads out of the node underfoot', () => {
    it('opens with the start node\'s neighbours and nothing else', () => {
        const map = world().currentMap;
        expect(legalMovesFrom(map)).toEqual(['bw-19', 'bw-4', 'bw-5']);
    });

    it('reads roads both ways: a road authored into a node leads back out of it', () => {
        // bw-4 lists bw-5 (the lane rib), bw-5 does not list bw-4.
        const def = getMapDefinition('coastal-continent', 'breakwater');
        expect(def.nodes.find(n => n.id === 'bw-5')!.connectedNodes).not.toContain('bw-4');
        const w = advance(world(), 'bw-5');
        expect(legalMovesFrom(w.currentMap)).toEqual(['bw-1', 'bw-4', 'bw-7']);
    });

    it('offers spent neighbours too: the player walks back the way they came', () => {
        let w = world();
        w = advance(w, 'bw-4');
        w = advance(w, 'bw-7');
        expect(isNodeSpent(w.currentMap, 'bw-4')).toBe(true);
        expect(legalMovesFrom(w.currentMap)).toContain('bw-4');
        const back = moveToNode(w, 'bw-4');
        expect(back.currentMap.currentNode).toBe('bw-4');
        // And on from there, back to the windmill.
        expect(moveToNode(back, 'bw-1').currentMap.currentNode).toBe('bw-1');
    });

    it('never jumps: a lane left three moves ago is a walk back, not a move', () => {
        let w = world();
        w = advance(w, 'bw-5');
        w = advance(w, 'bw-7');
        w = advance(w, 'bw-11');
        w = advance(w, 'bw-13');
        expect(legalMovesFrom(w.currentMap)).toEqual(['bw-9', 'bw-11', 'bw-15', 'bw-16']);
        expect(legalMovesFrom(w.currentMap)).not.toContain('bw-4');
        expect(() => moveToNode(w, 'bw-4')).toThrow(IllegalMoveError);
        expect(() => moveToNode(w, 'bw-4')).toThrow(/not joined by a road/);
    });

    it('has no move to a node across the map, even the last one left', () => {
        // Everything but the watchtower and the bridge is spent, and the
        // player stands far from them: the watchtower is not a move from here.
        const spent = allBreakwaterNodes().filter(id => id !== 'bw-17' && id !== 'bw-18');
        const far = bwWorld({ currentNode: 'bw-5', completedNodes: spent, blockedRoutes: [] });
        expect(legalMovesFrom(far.currentMap)).not.toContain('bw-17');
        const near = bwWorld({ currentNode: 'bw-22', completedNodes: spent, blockedRoutes: [] });
        expect(legalMovesFrom(near.currentMap)).toEqual(['bw-15', 'bw-16', 'bw-17']);
    });

    it('is empty off the map\'s nodes', () => {
        expect(legalMovesFrom(bwWorld({ currentNode: 'nowhere' }).currentMap)).toEqual([]);
    });
});

describe('A1 — blocked and held roads do not open', () => {
    it('drops a neighbour whose road is blocked, and the refusal names the blockage', () => {
        const w = world();
        const blocked = { ...w, currentMap: withBlockedRoute(w.currentMap, 'bw-1', 'bw-19', 'Test blockage') };
        expect(legalMovesFrom(blocked.currentMap)).toEqual(['bw-4', 'bw-5']);
        expect(() => moveToNode(blocked, 'bw-19')).toThrow(/blocked — Test blockage/);
    });

    it('goes round a blocked road by another one', () => {
        // With bw-9's road to bw-13 collapsed, bw-13 is still reached through
        // the lane bw-11 by walking there.
        let w = world();
        w = advance(w, 'bw-4');
        w = advance(w, 'bw-9');
        const blocked = { ...w, currentMap: withBlockedRoute(w.currentMap, 'bw-9', 'bw-13', 'The quay gave way') };
        expect(legalMovesFrom(blocked.currentMap)).not.toContain('bw-13');
        let round = moveToNode(blocked, 'bw-4');
        round = moveToNode(round, 'bw-7');
        round = moveToNode(round, 'bw-11');
        expect(moveToNode(round, 'bw-13').currentMap.currentNode).toBe('bw-13');
    });

    it('a held node keeps its onward roads shut, both ways, until it is spent', () => {
        // Standing on marker 1 before accepting: the road back is open, the
        // pocket (bw-3, bw-12) is not.
        const onMarker = bwWorld({ currentNode: 'bw-19' });
        expect(legalMovesFrom(onMarker.currentMap)).toEqual(['bw-1']);
        expect(() => moveToNode(onMarker, 'bw-3')).toThrow(/held/);
        // Inside the pocket (placed there), the marker is not a way out either.
        const inPocket = bwWorld({ currentNode: 'bw-3' });
        expect(legalMovesFrom(inPocket.currentMap)).toEqual([]);
        // Spent, the marker opens its pocket.
        const accepted = bwWorld({ currentNode: 'bw-19', consumedNodes: ['bw-19'] });
        expect(legalMovesFrom(accepted.currentMap)).toEqual(['bw-1', 'bw-3', 'bw-12']);
    });

    it('the watchtower holds the bridge until it is won', () => {
        const before = bwWorld({ currentNode: 'bw-17', consumedNodes: ['bw-22'], blockedRoutes: [] });
        expect(legalMovesFrom(before.currentMap)).toEqual(['bw-22']);
        const won = bwWorld({ currentNode: 'bw-17', consumedNodes: ['bw-22', 'bw-17'], blockedRoutes: [] });
        expect(legalMovesFrom(won.currentMap)).toEqual(['bw-22', 'bw-18']);
    });
});

describe('A2 — the unlock lists follow the road rule', () => {
    it('available is the legal moves; locked is every other unspent node', () => {
        let w = world();
        expect(w.currentMap.availableNodes).toEqual(legalMovesFrom(w.currentMap));
        w = advance(w, 'bw-4');
        expect(w.currentMap.availableNodes).toEqual(legalMovesFrom(w.currentMap));
        expect(w.currentMap.availableNodes).toContain('bw-7');
        expect(w.currentMap.lockedNodes).not.toContain('bw-7');
        expect(w.currentMap.lockedNodes).toContain('bw-17');
        expect(w.currentMap.lockedNodes).not.toContain('bw-4');
    });

    it('a lane walked away from reads as out of reach again', () => {
        let w = world();
        w = advance(w, 'bw-5');
        w = advance(w, 'bw-7');
        w = advance(w, 'bw-11');
        expect(w.currentMap.availableNodes).not.toContain('bw-19');
        expect(w.currentMap.lockedNodes).toContain('bw-19');
        expect(w.currentMap.availableNodes).toEqual(legalMovesFrom(w.currentMap));
    });

    it('syncMoveLists rewrites a frontier-era list and is the identity when it already agrees', () => {
        const stale = bwWorld({ currentNode: 'bw-4', availableNodes: ['bw-19', 'bw-5', 'bw-7', 'bw-9', 'bw-13'], lockedNodes: [] });
        const synced = syncMoveLists(stale.currentMap);
        expect(synced.availableNodes).toEqual(legalMovesFrom(stale.currentMap));
        expect(synced.lockedNodes).toContain('bw-17');
        expect(syncMoveLists(synced)).toBe(synced);
    });
});

describe('spent nodes', () => {
    it('never re-farms a spent node: completing it twice is a no-op', () => {
        let w = world();
        w = advance(w, 'bw-4');
        const once = w.currentMap.completedNodes.filter(id => id === 'bw-4');
        w = completeNode(w, 'bw-4');
        expect(w.currentMap.completedNodes.filter(id => id === 'bw-4')).toEqual(once);
    });

    it('spends a node on RESOLUTION, not on departure', () => {
        let w = world();
        w = moveToNode(w, 'bw-4');
        expect(isNodeSpent(w.currentMap, 'bw-1')).toBe(false);
        w = completeCurrentNode(w);
        expect(isNodeSpent(w.currentMap, 'bw-4')).toBe(true);
    });
});
