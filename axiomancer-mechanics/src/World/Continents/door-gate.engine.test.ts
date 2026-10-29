import { describe, it, expect } from 'vitest';
import type { MapDefinition } from '../types';
import { breakwaterChapter as breakwater, BREAKWATER_CHAPTER_GATES } from './Coastal-Village/breakwater-chapter';
import { charcoalWood } from './Coastal-Village/charcoal-wood';
import { beaconCrags } from './Northern-Continent/beacon-crags';
import { lanternDeep } from './Northern-Continent/lantern-deep';

/**
 * Each later Act 1 region ends at a Death Beholder's door (`docs/game-model.md`):
 * the region's exit is reachable only through its door fight. The frontier
 * walks edges both ways, so the guard does too. The RC walk found the Charcoal
 * Wood's exit joined to every last-ring node, so the door could be skipped.
 *
 * The Breakwater's boss is not on the way out: its exit (the far bank,
 * `bw-b2`) sits behind the river bridge's quest node (`bw-b1`), whose gate
 * opens only when the boss quest is turned in, and the boss (`bw-k2`) sits
 * behind the keep gate (`bw-k1`). Both are pinned below the same way.
 */
const REGIONS: ReadonlyArray<{ map: MapDefinition; door: string; exit: string }> = [
    { map: charcoalWood, door: 'cw-17', exit: 'cw-20' },
    { map: beaconCrags, door: 'bc-15', exit: 'bc-17' },
    { map: lanternDeep, door: 'ld-16', exit: 'ld-18' },
];

function reachableWithout(map: MapDefinition, removed: string): Set<string> {
    const nodes = [map.startingNode, ...map.nodes];
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n.id, adj.get(n.id) ?? new Set());
    for (const n of nodes) {
        for (const next of n.connectedNodes) {
            if (!adj.has(next)) adj.set(next, new Set());
            adj.get(n.id)!.add(next);
            adj.get(next)!.add(n.id);
        }
    }
    const seen = new Set<string>([map.startingNode.id]);
    const queue = [map.startingNode.id];
    while (queue.length > 0) {
        const id = queue.shift()!;
        for (const next of adj.get(id) ?? []) {
            if (next === removed || seen.has(next)) continue;
            seen.add(next);
            queue.push(next);
        }
    }
    return seen;
}

describe('every Act 1 exit sits behind its Death Beholder', () => {
    for (const { map, door, exit } of REGIONS) {
        it(`${map.name}: ${exit} is reachable only through ${door}`, () => {
            expect(reachableWithout(map, door).has(exit)).toBe(false);
        });

        it(`${map.name}: ${door} itself is reachable from the start`, () => {
            expect(reachableWithout(map, exit).has(door)).toBe(true);
        });
    }
});

describe('the Breakwater\'s exit and boss sit behind their quest gates', () => {
    const gates = (breakwater.initialBlockedRoutes ?? []).map(r => ({ from: r.from, to: r.to }));

    it('reaches the far bank only through the river bridge, whose road on is seeded shut', () => {
        expect(reachableWithout(breakwater, 'bw-b1').has('bw-b2')).toBe(false);
        expect(reachableWithout(breakwater, 'bw-b2').has('bw-b1')).toBe(true);
        expect(gates).toContainEqual(BREAKWATER_CHAPTER_GATES.pastBridge);
        expect(BREAKWATER_CHAPTER_GATES.pastBridge).toEqual({ from: 'bw-b1', to: 'bw-b2' });
    });

    it('reaches the chapter boss only through the keep gate, whose road on is seeded shut', () => {
        expect(reachableWithout(breakwater, 'bw-k1').has('bw-k2')).toBe(false);
        expect(reachableWithout(breakwater, 'bw-k2').has('bw-k1')).toBe(true);
        expect(gates).toContainEqual(BREAKWATER_CHAPTER_GATES.pastKeep);
        expect(BREAKWATER_CHAPTER_GATES.pastKeep).toEqual({ from: 'bw-k1', to: 'bw-k2' });
    });
});
