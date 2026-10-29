/**
 * The empty waypoint — hermetic coverage (phase NK1a, A1 and A2).
 *
 * The `gathering`, `interaction` and `narration` kinds are cut. The seven Act
 * 1 nodes that held a gathering event carry no pool now: arriving on one
 * resolves to nothing, consumes it and opens its roads, like any node with no
 * pool. No registered pool names a removed kind.
 */

import { describe, expect, it } from 'vitest';

import { resolveMapEvent, getNodeEventPool, listRegisteredMapEventPools } from '../resolve-map-event';
import { ACT1_WAYPOINT_NODES } from '../content';
import type { MapEventKind } from '../types';
import { createMapState, getMapDefinition } from '../../map.registry';
import type { ContinentName, MapName } from '../../map.library';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import '../content';
import '../../Labyrinth/labyrinth.pools';

const CONTINENT_OF: Record<string, ContinentName> = {
    'breakwater': 'coastal-continent',
    'charcoal-wood': 'coastal-continent',
    'beacon-crags': 'northern-continent',
    'lantern-deep': 'northern-continent',
};

/** Every kind `MapEventKind` holds. The `Record` fails to compile if one is added or removed. */
const KEPT: Record<MapEventKind, true> = {
    'encounter': true, 'rest': true, 'village': true, 'cutscene': true, 'hazard': true,
    'loot-cache': true, 'blacksmith': true, 'travel': true, 'labyrinth': true, 'quest': true,
};

function standingOn(map: string, nodeId: string): GameState {
    const base = createNewGameState();
    const def = getMapDefinition(CONTINENT_OF[map]!, map as MapName);
    return { ...base, world: { ...base.world, currentMap: { ...createMapState(def), currentNode: nodeId } } };
}

describe('the overworld node kinds (A1)', () => {
    it('are the ten kept kinds: no gathering, interaction or narration', () => {
        const kinds = Object.keys(KEPT);
        expect(kinds).toHaveLength(10);
        for (const removed of ['gathering', 'interaction', 'narration']) expect(kinds).not.toContain(removed);
    });

    it('no registered pool, overworld or labyrinth, names a removed kind', () => {
        for (const pool of listRegisteredMapEventPools()) {
            for (const entry of pool.entries) {
                expect(KEPT[entry.kind], `${pool.id} ${entry.kind}`).toBe(true);
                expect(KEPT[entry.payload.kind], `${pool.id} ${entry.payload.kind}`).toBe(true);
            }
        }
    });
});

describe('the seven former gathering nodes are empty waypoints (A2)', () => {
    it('are the seven nodes the gathering kind held', () => {
        expect(ACT1_WAYPOINT_NODES).toEqual({
            'breakwater':    ['bw-4', 'bw-11'],
            'charcoal-wood': ['cw-4', 'cw-8', 'cw-14'],
            'beacon-crags':  ['bc-7'],
            'lantern-deep':  ['ld-7'],
        });
    });

    const cases = Object.entries(ACT1_WAYPOINT_NODES).flatMap(([map, ids]) => ids.map(id => [map, id] as const));

    it.each(cases)('%s %s carries no pool and resolves to nothing', (map, nodeId) => {
        expect(getNodeEventPool(CONTINENT_OF[map]!, map, nodeId)).toBeUndefined();
        const before = standingOn(map, nodeId);
        const { state, event } = resolveMapEvent(before, () => 0.5);
        expect(event).toEqual({ kind: 'none' });
        expect(state.player).toEqual(before.player);
        expect(state.world.currentMap.consumedNodes).toContain(nodeId);
        const def = getMapDefinition(CONTINENT_OF[map]!, map as MapName);
        const roads = def.nodes.find(n => n.id === nodeId)!.connectedNodes;
        for (const next of roads) expect(state.world.currentMap.discoveredNodes, next).toContain(next);
    });
});
