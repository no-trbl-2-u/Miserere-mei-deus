/**
 * A map node may name its arena plate (plan 146.3). Layouts name none yet; the
 * guard fails on any id that is not one of the twelve, and the resolver takes
 * the node's plate, else the region's default, else the fallback.
 */

import { describe, expect, it } from '@jest/globals';

import {
    ARENA_PLATES,
    ARENA_PLATE_IDS,
    arenaAltTextFor,
    arenaBackdropFor,
} from '@/assets/images/combat';
import { ALL_MAP_LAYOUTS, nodeArenaFor } from '../index';
import type { MapLayout } from '../types';

describe('node arena plates in the layouts', () => {
    it('every plate a node names is one of the twelve', () => {
        const unknown: string[] = [];
        for (const layout of ALL_MAP_LAYOUTS) {
            for (const node of layout.nodes) {
                if (node.arena !== undefined && !ARENA_PLATE_IDS.includes(node.arena)) {
                    unknown.push(`${layout.mapId}/${node.id}: ${String(node.arena)}`);
                }
            }
        }
        expect(unknown).toEqual([]);
    });

    it('the guard would catch an unknown id', () => {
        const bad = { id: 'x', x: 0, y: 0, label: 'x', description: 'x', arena: 'arena-nowhere' } as unknown as MapLayout['nodes'][number];
        expect(ARENA_PLATE_IDS.includes(bad.arena as never)).toBe(false);
    });

    it('nodeArenaFor is undefined for no region, no node, an unknown node or a node naming none', () => {
        const layout = ALL_MAP_LAYOUTS[0];
        expect(nodeArenaFor(undefined, layout.nodes[0].id)).toBeUndefined();
        expect(nodeArenaFor(layout.region, undefined)).toBeUndefined();
        expect(nodeArenaFor(layout.region, 'no-such-node')).toBeUndefined();
        expect(nodeArenaFor('the Drowned Parish', layout.nodes[0].id)).toBeUndefined();
    });
});

describe('the three layers of choice', () => {
    const NODE_PLATE = 'arena-lantern-deep-pandemonium'; // another region's plate: any of the twelve
    const fallback = arenaBackdropFor(undefined);

    it('a node plate wins over the region default, art and words together', () => {
        expect(arenaBackdropFor('The Breakwater', NODE_PLATE)).toEqual(ARENA_PLATES[NODE_PLATE].art);
        expect(arenaAltTextFor('The Breakwater', NODE_PLATE)).toEqual(ARENA_PLATES[NODE_PLATE].alt);
        expect(arenaBackdropFor(undefined, NODE_PLATE)).toEqual(ARENA_PLATES[NODE_PLATE].art);
    });

    it('with no node plate, the region default', () => {
        expect(arenaBackdropFor('The Breakwater', undefined)).toEqual(ARENA_PLATES['arena-breakwater-northern-sea'].art);
        expect(arenaAltTextFor('The Breakwater')).toEqual(ARENA_PLATES['arena-breakwater-northern-sea'].alt);
    });

    it('with neither, the fallback', () => {
        expect(arenaBackdropFor('unknown region', undefined)).toEqual(fallback);
        expect(arenaBackdropFor(undefined, undefined)).toEqual(fallback);
        expect(arenaAltTextFor('unknown region')).toEqual(arenaAltTextFor(undefined));
    });

    it('an id outside the library is ignored, not trusted', () => {
        const bogus = 'arena-nowhere' as never;
        expect(arenaBackdropFor('The Breakwater', bogus)).toEqual(ARENA_PLATES['arena-breakwater-northern-sea'].art);
        expect(arenaAltTextFor(undefined, bogus)).toEqual(arenaAltTextFor(undefined));
    });
});
