// guard-test: pins exitOf's two refusals, which no Act 1 map reaches (mutation survivors act1-walk.ts:132-136 left by #1080), so it passes on the parent by design
/**
 * `exitOf` reads a region's exit off its graph: the one door to another map,
 * else the one last-column dead end. The Act 1 maps all have a door, so the
 * refusals are staged here on a map the registry does not hold: its pools are
 * registered under its own name and touch no real node.
 */

import { describe, it, expect } from 'vitest';

import { exitOf } from './act1-walk';
import { registerMapEventPool, setNodeEventPoolOverride } from './MapEvents/resolve-map-event';
import type { MapDefinition, MapNode } from './types';
import type { ContinentName, MapName } from './map.library';

const CONTINENT = 'coastal-continent' as ContinentName;

const node = (id: string, column: number, connectedNodes: string[] = []): MapNode =>
    ({ id, location: [column, 0], connectedNodes });

function region(name: string, nodes: MapNode[]): MapDefinition {
    return { name: name as MapName, continent: CONTINENT, description: '', startingNode: nodes[0]!, nodes };
}

registerMapEventPool({
    id: 'hd1a.door',
    entries: [{
        kind: 'travel', weight: 1,
        payload: { kind: 'travel', destination: { map: 'charcoal-wood', continent: CONTINENT }, prompt: 'On.' },
    }],
});
registerMapEventPool({
    id: 'hd1a.passage',
    entries: [{ kind: 'travel', weight: 1, payload: { kind: 'travel', destination: { node: 's' }, prompt: 'Back.' } }],
});

registerMapEventPool({ id: 'hd1a.empty', entries: [] });

function doorAt(map: string, nodeId: string, pool = 'hd1a.door'): void {
    setNodeEventPoolOverride(CONTINENT, map, nodeId, pool);
}

describe('exitOf', () => {
    it('is the one door to another map, wherever it stands', () => {
        const def = region('hd1a-one-door', [node('s', 0, ['d', 'e']), node('d', 1), node('e', 2)]);
        doorAt('hd1a-one-door', 'd');
        expect(exitOf(CONTINENT, def.name, def)).toBe('d');
    });

    it('refuses a map with two doors to another map', () => {
        const def = region('hd1a-two-doors', [node('s', 0, ['d', 'e']), node('d', 1), node('e', 1)]);
        doorAt('hd1a-two-doors', 'd');
        doorAt('hd1a-two-doors', 'e');
        expect(() => exitOf(CONTINENT, def.name, def))
            .toThrow('act1-walk: hd1a-two-doors has 2 doors to another map, expected one exit');
    });

    it('with no door, is the one dead end in the last column; a passage or an empty pool is not a door', () => {
        const def = region('hd1a-dead-end', [node('s', 0, ['a', 'c', 'b']), node('a', 1), node('c', 1), node('b', 2)]);
        doorAt('hd1a-dead-end', 'a', 'hd1a.passage');
        doorAt('hd1a-dead-end', 'c', 'hd1a.empty');
        expect(exitOf(CONTINENT, def.name, def)).toBe('b');
    });

    it('refuses a map with no door and two dead ends in the last column', () => {
        const def = region('hd1a-two-ends', [node('s', 0, ['a', 'b']), node('a', 1), node('b', 1)]);
        expect(() => exitOf(CONTINENT, def.name, def))
            .toThrow('act1-walk: hd1a-two-ends has 2 terminal nodes, expected one exit');
    });

    it('refuses a map with no door and no dead end in the last column', () => {
        const def = region('hd1a-no-end', [node('s', 0, ['a']), node('a', 1, ['s'])]);
        expect(() => exitOf(CONTINENT, def.name, def))
            .toThrow('act1-walk: hd1a-no-end has 0 terminal nodes, expected one exit');
    });
});
