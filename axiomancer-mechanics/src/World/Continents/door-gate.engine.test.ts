import { describe, it, expect } from 'vitest';
import type { MapDefinition } from '../types';
import { breakwater } from './Coastal-Village/breakwater';
import { charcoalWood } from './Coastal-Village/charcoal-wood';
import { beaconCrags } from './Northern-Continent/beacon-crags';
import { lanternDeep } from './Northern-Continent/lantern-deep';

/**
 * Each Act 1 region ends at a Death Beholder's door (`docs/game-model.md`): the
 * region's exit is reachable only through its door fight. The frontier walks
 * edges both ways, so the guard does too. The RC walk found the Charcoal
 * Wood's exit joined to every last-ring node, so the door could be skipped.
 */
const REGIONS: ReadonlyArray<{ map: MapDefinition; door: string; exit: string }> = [
    { map: breakwater, door: 'bw-17', exit: 'bw-18' },
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
