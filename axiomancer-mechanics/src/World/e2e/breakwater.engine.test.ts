/**
 * The Breakwater — Act 1, map 1.
 *
 * Pins the first Act 1 map:
 * - a new game starts here, and any campaign map can be started on
 *   instead (the dev "start on any map" tools);
 * - the map borrows the shipped pool builders, with one authored
 *   event on every node, one Anvil near its exit and a door on
 *   to the Charcoal Wood;
 * - every run ends at the river bridge, through the watchtower, where the
 *   region's elite waits; the start is an arrival scene.
 *
 * The generic gauntlet invariants (road reachability, column law, ribs, distinct
 * coordinates) run over this map in `map-traversal.engine.test.ts` like every
 * other registered map. The layout pins live in mobile, where the landmarks
 * and the sheet are.
 */

import { describe, expect, it } from 'vitest';

import {
    createStartingWorld, STARTING_MAP, STARTABLE_MAPS,
    getMapDefinition, createMapState, resolveMapEvent, getNodeEventPool,
} from '../index';
import { auditMapTraversal } from '../world.reducer';
import { createNewGameState } from '../../Game/game.reducer';
import { STARTING_REGION } from '../../Game/run-loop';
import type { GameState } from '../../Game/types';

const breakwater = getMapDefinition('coastal-continent', 'breakwater');

/** A fresh game standing on `nodeId` of the Breakwater. */
function standingOn(nodeId: string): GameState {
    const base = createNewGameState();
    return {
        ...base,
        world: {
            ...base.world,
            currentMap: { ...createMapState(breakwater), currentNode: nodeId },
        },
    };
}

describe('the new-game start (D27)', () => {
    it('starts a new game on the Breakwater, at the windmill', () => {
        expect(STARTING_MAP).toBe('breakwater');
        expect(STARTING_REGION).toBe('breakwater');
        const world = createNewGameState().world;
        expect(world.currentContinent.name).toBe('coastal-continent');
        expect(world.currentMap.name).toBe('breakwater');
        expect(world.currentMap.currentNode).toBe('bw-1');
    });

    it('lists the Breakwater available and every other campaign map locked', () => {
        const [coastal, northern] = createStartingWorld().world;
        expect(coastal!.availableMaps).toEqual(['breakwater']);
        expect(coastal!.lockedMaps).toEqual(['charcoal-wood']);
        expect(northern!.availableMaps).toEqual([]);
        expect(northern!.lockedMaps).toEqual(['beacon-crags', 'lantern-deep']);
    });
});

describe('starting on any map (dev tools)', () => {
    it('offers every campaign map and no labyrinth act', () => {
        expect([...STARTABLE_MAPS].sort()).toEqual([
            'beacon-crags', 'breakwater', 'charcoal-wood', 'lantern-deep',
        ]);
    });

    it.each(STARTABLE_MAPS.map(m => [m]))('places a fresh game on %s, at its start node, on its own continent', map => {
        const world = createNewGameState({ startMap: map }).world;
        expect(world.currentMap.name).toBe(map);
        expect(world.currentContinent.name).toBe(world.currentMap.continent);
        const def = getMapDefinition(world.currentMap.continent, map);
        expect(world.currentMap.currentNode).toBe(def.startingNode.id);
        const own = world.world.find(c => c.name === world.currentContinent.name)!;
        expect(own.availableMaps).toEqual([map]);
        expect(world.currentContinent).toBe(own);
    });

    it('refuses a labyrinth act', () => {
        expect(() => createStartingWorld('aporia-colonnade')).toThrow(/not a startable campaign map/);
    });
});

describe('the Breakwater map', () => {
    it('carries one node per landmark on the coast plate (D25: 18) and the four quest markers', () => {
        expect(breakwater.nodes).toHaveLength(22);
        expect(breakwater.nodes.map(n => n.id).sort()).toEqual(
            Array.from({ length: 22 }, (_, i) => `bw-${i + 1}`).sort(),
        );
    });

    it('ends every run at the river bridge, through the watchtower; the other dead ends are the pockets and the wreck', () => {
        const audit = auditMapTraversal(breakwater);
        expect(audit.unreachableNodes).toEqual([]);
        // The pockets (joined only to their marker) and the wreck (whose
        // only onward road is the rib to the harbour town) end the forward
        // skeleton too; the bridge is the one end in the last column.
        expect([...audit.terminalNodes].sort()).toEqual(
            ['bw-2', 'bw-3', 'bw-6', 'bw-8', 'bw-10', 'bw-11', 'bw-12', 'bw-14', 'bw-18'].sort(),
        );
        const watchtower = breakwater.nodes.find(n => n.id === 'bw-17')!;
        expect(watchtower.connectedNodes).toEqual(['bw-18']);
        const lastColumn = Math.max(...breakwater.nodes.map(n => n.location[0]));
        expect(breakwater.nodes.filter(n => n.location[0] === lastColumn).map(n => n.id)).toEqual(['bw-18']);
    });
});

describe('the Breakwater\'s events (D29)', () => {
    const kinds = Object.fromEntries(
        breakwater.nodes.map(n => [n.id, resolveMapEvent(standingOn(n.id)).event.kind]),
    );

    it('resolves an authored event on every node but its waypoints', () => {
        expect(Object.values(kinds)).not.toContain('empty');
        expect(Object.keys(kinds)).toHaveLength(22);
    });

    it('spreads 6 encounters, 2 rests, 3 loot caches, 2 waypoints, 2 hazards, 1 Anvil, an arrival, 1 door and 4 quest nodes', () => {
        const tally: Record<string, number> = {};
        for (const k of Object.values(kinds)) tally[k] = (tally[k] ?? 0) + 1;
        expect(tally).toEqual({
            encounter: 6, rest: 2, 'loot-cache': 3, none: 2, hazard: 2, village: 1, cutscene: 1, travel: 1, quest: 4,
        });
    });

    it('leaves its former gathering nodes an empty waypoint: no pool, resolves to nothing', () => {
        for (const id of ['bw-4', 'bw-11']) expect(kinds[id], id).toBe('none');
    });

    it('puts the four quest markers on bw-19..bw-22, node 1 to node 4 of the Breakwater questline', () => {
        for (const [i, id] of ['bw-19', 'bw-20', 'bw-21', 'bw-22'].entries()) {
            const payload = getNodeEventPool('coastal-continent', 'breakwater', id)!.entries[0]!.payload;
            expect(payload).toMatchObject({ kind: 'quest', questline: 'breakwater-questline', node: i + 1 });
        }
    });

    it('keeps its Anvil at the fishing hamlet, a step from the last marker before the door fight (D61, R3b)', () => {
        expect(kinds['bw-16']).toBe('village');
        expect(breakwater.nodes.find(n => n.id === 'bw-16')!.connectedNodes).toContain('bw-22');
        expect(breakwater.nodes.find(n => n.id === 'bw-22')!.connectedNodes).toEqual(['bw-17']);
    });

    it('opens on an arrival scene at the windmill, not a rest screen (D31)', () => {
        expect(kinds['bw-1']).toBe('cutscene');
    });

    it('fights the Death Beholder at the watchtower, pinned low, the last fight before the door (D61)', () => {
        // Level 1, one under the level-2 player a full clear brings.
        const payload = getNodeEventPool('coastal-continent', 'breakwater', 'bw-17')!.entries[0]!.payload;
        expect(payload).toMatchObject({ kind: 'encounter', enemySlug: 'death-beholder', isBoss: true, level: 1 });
    });

    it('fights the region\'s elite, the Green Jelly, mid-region (D61)', () => {
        const payload = getNodeEventPool('coastal-continent', 'breakwater', 'bw-8')!.entries[0]!.payload;
        expect(payload).toMatchObject({ kind: 'encounter', enemySlug: 'green-jelly', isBoss: false });
    });

    it('crosses the river bridge into the Charcoal Wood (Act 1, map 2)', () => {
        const r = resolveMapEvent(standingOn('bw-18'));
        expect(r.event.kind).toBe('travel');
        expect(r.state.world.currentMap.name).toBe('charcoal-wood');
        expect(r.state.world.currentMap.currentNode).toBe('cw-1');
    });
});
