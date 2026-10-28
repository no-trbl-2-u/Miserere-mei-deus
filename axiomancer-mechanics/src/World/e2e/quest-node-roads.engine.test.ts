/**
 * What resolving an unspent node does to its roads (phase QL1c: the mutation
 * gaps left by QL1b in `resolve-map-event.ts`).
 *
 * A quest node (and the labyrinth door) is never consumed on resolve. Whether
 * it opens its roads then is the map's call: a node listed in
 * `holdRoadsUntilSettled` opens none until it is spent; an unlisted one opens
 * them as any node does. A consumed kind (a hazard) opens its roads even when
 * the map lists it, because it is spent by the resolve itself.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { MAP_REGISTRY, createMapState } from '../map.registry';
import { moveToNode, legalMovesFrom } from '../world.reducer';
import { resolveMapEvent, registerMapEventPool, setNodeEventPoolOverride } from '../MapEvents/resolve-map-event';
import { createNewGameState } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import type { MapDefinition, MapNode } from '../types';
import type { MapName } from '../map.library';
import type { MapEventPayload } from '../MapEvents/types';

const CONTINENT = 'coastal-continent' as const;
const HELD = 'ql1c-roads-held' as MapName;
const OPEN = 'ql1c-roads-open' as MapName;

//   s0 ── q ── after-q          q: a quest node
//    └─── h ── after-h          h: a hazard node
const NODES: MapNode[] = [
    { id: 's0', location: [0, 0], connectedNodes: ['q', 'h'] },
    { id: 'q', location: [1, 1], connectedNodes: ['after-q'] },
    { id: 'after-q', location: [2, 1], connectedNodes: [] },
    { id: 'h', location: [1, 0], connectedNodes: ['after-h'] },
    { id: 'after-h', location: [2, 0], connectedNodes: [] },
];

function def(name: MapName, extra: Partial<MapDefinition>): MapDefinition {
    return { name, continent: CONTINENT, description: 'QL1c roads fixture.', startingNode: NODES[0]!, nodes: NODES, ...extra };
}

const POOLS: Record<string, MapEventPayload> = {
    q: { kind: 'quest', questline: 'ql1c-roads-line', node: 1 },
    h: { kind: 'hazard', damage: 1 },
};

beforeAll(() => {
    MAP_REGISTRY[CONTINENT][HELD] = def(HELD, { holdRoadsUntilSettled: ['q', 'h'] });
    MAP_REGISTRY[CONTINENT][OPEN] = def(OPEN, {});
    for (const mapName of [HELD, OPEN]) {
        for (const [nodeId, payload] of Object.entries(POOLS)) {
            const id = `${mapName}.${nodeId}`;
            registerMapEventPool({ id, entries: [{ kind: payload.kind, weight: 1, payload }] });
            setNodeEventPoolOverride(CONTINENT, mapName, nodeId, id);
        }
    }
});

function arriveAndResolve(mapName: MapName, nodeId: string): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    const state: GameState = { ...base, world: { ...base.world, currentMap: createMapState(MAP_REGISTRY[CONTINENT][mapName]!) } };
    const moved: GameState = { ...state, world: moveToNode(state.world, nodeId) };
    return resolveMapEvent(moved, () => 0.5).state;
}

describe('an unspent quest node', () => {
    it('on a map that holds its roads: unspent, and none of its roads opens', () => {
        const s = arriveAndResolve(HELD, 'q');
        const map = s.world.currentMap;
        expect(map.consumedNodes).not.toContain('q');
        expect(map.availableNodes).not.toContain('after-q');
        expect(legalMovesFrom(map)).not.toContain('after-q');
    });

    it('on a map that does not hold them: still unspent, but its roads open as any node does', () => {
        const s = arriveAndResolve(OPEN, 'q');
        const map = s.world.currentMap;
        expect(map.consumedNodes).not.toContain('q');
        expect(map.availableNodes).toContain('after-q');
        expect(legalMovesFrom(map)).toContain('after-q');
    });
});

describe('a node that the resolve spends', () => {
    it('a hazard on a listed node is consumed and opens its roads: the hold applies only to unspent kinds', () => {
        const s = arriveAndResolve(HELD, 'h');
        const map = s.world.currentMap;
        expect(map.consumedNodes).toContain('h');
        expect(map.availableNodes).toContain('after-h');
        expect(legalMovesFrom(map)).toContain('after-h');
    });
});
