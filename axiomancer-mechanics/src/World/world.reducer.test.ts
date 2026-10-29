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
        const w = completeNode(world(), 'bw-w2');
        expect(w.currentMap.completedNodes).toContain('bw-w2');
    });
});

describe('unlockNode', () => {
    it('moves from locked to available', () => {
        const w = unlockNode(world(), 'bw-w3');
        expect(w.currentMap.lockedNodes).not.toContain('bw-w3');
        expect(w.currentMap.availableNodes).toContain('bw-w3');
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
// the Breakwater (the new-game map, rebuilt for Chapter 1): bw-w1 (the
// windmill) opens on bw-w2 alone, which fans to bw-w3, the camp bw-w4 and
// the manor road bw-m1; the wreck bw-h4 and the elite bw-w5 hold the road
// past them; bw-k2 is the chapter boss behind the keep gate. The Breakwater's
// roads are a tree, so the detour test runs on the Charcoal Wood, whose
// roads cross.

/** Every node id on the Breakwater, in definition order. */
const allBreakwaterNodes = (): string[] => {
    const map = world().currentMap;
    return getMapDefinition(map.continent, map.name).nodes.map(n => n.id);
};

describe('A1 — the legal moves are the open roads out of the node underfoot', () => {
    it('opens with the start node\'s neighbours and nothing else', () => {
        const map = world().currentMap;
        expect(legalMovesFrom(map)).toEqual(['bw-w2']);
    });

    it('reads roads both ways: a road authored into a node leads back out of it', () => {
        // bw-w2 lists bw-m1, bw-m1 does not list bw-w2.
        const def = getMapDefinition('coastal-continent', 'breakwater');
        expect(def.nodes.find(n => n.id === 'bw-w2')!.connectedNodes).toContain('bw-m1');
        expect(def.nodes.find(n => n.id === 'bw-m1')!.connectedNodes).not.toContain('bw-w2');
        const w = advance(advance(world(), 'bw-w2'), 'bw-m1');
        expect(legalMovesFrom(w.currentMap)).toEqual(['bw-w2', 'bw-m2', 'bw-p1']);
    });

    it('offers spent neighbours too: the player walks back the way they came', () => {
        let w = world();
        w = advance(w, 'bw-w2');
        w = advance(w, 'bw-w3');
        expect(isNodeSpent(w.currentMap, 'bw-w2')).toBe(true);
        expect(legalMovesFrom(w.currentMap)).toContain('bw-w2');
        const back = moveToNode(w, 'bw-w2');
        expect(back.currentMap.currentNode).toBe('bw-w2');
        // And on from there, back to the windmill.
        expect(moveToNode(back, 'bw-w1').currentMap.currentNode).toBe('bw-w1');
    });

    it('never jumps: a lane left three moves ago is a walk back, not a move', () => {
        let w = world();
        w = advance(w, 'bw-w2');
        w = advance(w, 'bw-w3');
        w = advance(w, 'bw-h1');
        w = advance(w, 'bw-t1');
        expect(legalMovesFrom(w.currentMap)).toEqual(['bw-h1', 'bw-t2']);
        expect(legalMovesFrom(w.currentMap)).not.toContain('bw-w2');
        expect(() => moveToNode(w, 'bw-w2')).toThrow(IllegalMoveError);
        expect(() => moveToNode(w, 'bw-w2')).toThrow(/not joined by a road/);
    });

    it('has no move to a node across the map, even the last one left', () => {
        // Everything but the sea keep and the far bank is spent, and the
        // player stands far from them: the sea keep is not a move from here.
        const spent = allBreakwaterNodes().filter(id => id !== 'bw-k2' && id !== 'bw-b2');
        const far = bwWorld({ currentNode: 'bw-m5', completedNodes: spent, blockedRoutes: [] });
        expect(legalMovesFrom(far.currentMap)).not.toContain('bw-k2');
        const near = bwWorld({ currentNode: 'bw-k1', completedNodes: spent, blockedRoutes: [] });
        expect(legalMovesFrom(near.currentMap)).toEqual(['bw-w5', 'bw-k2']);
    });

    it('is empty off the map\'s nodes', () => {
        expect(legalMovesFrom(bwWorld({ currentNode: 'nowhere' }).currentMap)).toEqual([]);
    });
});

describe('A1 — blocked and held roads do not open', () => {
    it('drops a neighbour whose road is blocked, and the refusal names the blockage', () => {
        const w = advance(world(), 'bw-w2');
        const blocked = { ...w, currentMap: withBlockedRoute(w.currentMap, 'bw-w2', 'bw-w3', 'Test blockage') };
        expect(legalMovesFrom(blocked.currentMap)).toEqual(['bw-w1', 'bw-w4', 'bw-m1']);
        expect(() => moveToNode(blocked, 'bw-w3')).toThrow(/blocked — Test blockage/);
    });

    it('goes round a blocked road by another one', () => {
        // The Breakwater's roads are a tree; the Charcoal Wood's cross. With
        // cw-2's road to cw-7 collapsed, cw-7 is still reached through cw-3
        // by walking there.
        let w = createStartingWorld('charcoal-wood');
        w = advance(w, 'cw-2');
        const blocked = { ...w, currentMap: withBlockedRoute(w.currentMap, 'cw-2', 'cw-7', 'The bridge gave way') };
        expect(legalMovesFrom(blocked.currentMap)).not.toContain('cw-7');
        const round = moveToNode(blocked, 'cw-3');
        expect(moveToNode(round, 'cw-7').currentMap.currentNode).toBe('cw-7');
    });

    it('a held node keeps its onward roads shut, both ways, until it is spent', () => {
        // Standing on the wreck before crossing: the road back is open, the
        // road on (bw-h5) is not.
        const onWreck = bwWorld({ currentNode: 'bw-h4' });
        expect(legalMovesFrom(onWreck.currentMap)).toEqual(['bw-h3']);
        expect(() => moveToNode(onWreck, 'bw-h5')).toThrow(/held/);
        // Past it (placed there), the wreck is not a way back either.
        const past = bwWorld({ currentNode: 'bw-h5' });
        expect(legalMovesFrom(past.currentMap)).not.toContain('bw-h4');
        expect(() => moveToNode(past, 'bw-h4')).toThrow(/held/);
        // Spent, the wreck opens its road on.
        const crossed = bwWorld({ currentNode: 'bw-h4', consumedNodes: ['bw-h4'] });
        expect(legalMovesFrom(crossed.currentMap)).toEqual(['bw-h3', 'bw-h5']);
    });

    it('an elite holds the road past it until it is won', () => {
        const before = bwWorld({ currentNode: 'bw-w5', blockedRoutes: [] });
        expect(legalMovesFrom(before.currentMap)).toEqual(['bw-w4']);
        const won = bwWorld({ currentNode: 'bw-w5', consumedNodes: ['bw-w5'], blockedRoutes: [] });
        expect(legalMovesFrom(won.currentMap)).toEqual(['bw-w4', 'bw-k1']);
    });
});

describe('A2 — the unlock lists follow the road rule', () => {
    it('available is the legal moves; locked is every other unspent node', () => {
        let w = world();
        expect(w.currentMap.availableNodes).toEqual(legalMovesFrom(w.currentMap));
        w = advance(w, 'bw-w2');
        expect(w.currentMap.availableNodes).toEqual(legalMovesFrom(w.currentMap));
        expect(w.currentMap.availableNodes).toContain('bw-w3');
        expect(w.currentMap.lockedNodes).not.toContain('bw-w3');
        expect(w.currentMap.lockedNodes).toContain('bw-k2');
        expect(w.currentMap.lockedNodes).not.toContain('bw-w2');
    });

    it('a lane walked away from reads as out of reach again', () => {
        let w = world();
        w = advance(w, 'bw-w2');
        w = advance(w, 'bw-w3');
        w = advance(w, 'bw-h1');
        expect(w.currentMap.availableNodes).not.toContain('bw-w4');
        expect(w.currentMap.lockedNodes).toContain('bw-w4');
        expect(w.currentMap.availableNodes).toEqual(legalMovesFrom(w.currentMap));
    });

    it('syncMoveLists rewrites a frontier-era list and is the identity when it already agrees', () => {
        const stale = bwWorld({ currentNode: 'bw-w2', availableNodes: ['bw-w3', 'bw-h1', 'bw-w5', 'bw-k1'], lockedNodes: [] });
        const synced = syncMoveLists(stale.currentMap);
        expect(synced.availableNodes).toEqual(legalMovesFrom(stale.currentMap));
        expect(synced.lockedNodes).toContain('bw-k2');
        expect(syncMoveLists(synced)).toBe(synced);
    });
});

describe('spent nodes', () => {
    it('never re-farms a spent node: completing it twice is a no-op', () => {
        let w = world();
        w = advance(w, 'bw-w2');
        const once = w.currentMap.completedNodes.filter(id => id === 'bw-w2');
        w = completeNode(w, 'bw-w2');
        expect(w.currentMap.completedNodes.filter(id => id === 'bw-w2')).toEqual(once);
    });

    it('spends a node on RESOLUTION, not on departure', () => {
        let w = world();
        w = moveToNode(w, 'bw-w2');
        expect(isNodeSpent(w.currentMap, 'bw-w1')).toBe(false);
        w = completeCurrentNode(w);
        expect(isNodeSpent(w.currentMap, 'bw-w2')).toBe(true);
    });
});
