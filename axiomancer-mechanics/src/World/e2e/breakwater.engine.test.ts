/**
 * The Breakwater — Act 1, map 1.
 *
 * Pins the first Act 1 map:
 * - a new game starts here, and any campaign map can be started on
 *   instead (the dev "start on any map" tools);
 * - the map is T's 44-node Chapter 1 board (phase BW1b), with one authored
 *   event on every node, an Anvil in each of its two villages and a door on
 *   to the Charcoal Wood at the far bank (`bw-b2`);
 * - the run leaves by the river bridge (`bw-b1`), which opens only when the
 *   chapter boss (`bw-k2`, behind the keep gate) is beaten and turned in;
 *   the start is the windmill's arrival scene, which gives the chain's first
 *   quest.
 *
 * The node list, kinds and roads are checked against T's table in
 * `breakwater-chapter.test.ts`, and the chain walked in
 * `breakwater-chapter.engine.test.ts`. The generic gauntlet invariants run
 * over this map in `map-traversal.engine.test.ts` like every other registered
 * map. The layout pins live in mobile, where the landmarks and the sheet are.
 */

import { describe, expect, it } from 'vitest';
import { takeTravel } from '../MapEvents/travel';

import {
    createStartingWorld, STARTING_MAP, STARTABLE_MAPS,
    getMapDefinition, createMapState, resolveMapEvent, getNodeEventPool,
} from '../index';
import { auditRoadReachability } from '../road-reachability';
import { AUTHORED_QUESTLINES } from '../quest.library';
import { BREAKWATER_CHAPTER_QUESTLINE_ID } from '../breakwater-chapter.questline';
import { BW_DOOR_LEVEL, BW_ELITE_LEVEL } from '../MapEvents/content';
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
        expect(world.currentMap.currentNode).toBe('bw-w1');
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
    it('carries T\'s 44 board nodes, from the windmill (bw-w1) out', () => {
        expect(breakwater.nodes).toHaveLength(44);
        expect(breakwater.startingNode.id).toBe('bw-w1');
        for (const n of breakwater.nodes) expect(n.id, n.id).toMatch(/^bw-[a-z]\d$/);
    });

    it('reaches every node walking the roads and the sea-cave passage, the chain opening its gates in order', () => {
        const audit = auditRoadReachability(breakwater, AUTHORED_QUESTLINES);
        expect(audit.unreachableNodes).toEqual([]);
        expect(audit.unreachableSteps).toEqual([]);
    });

    it('leaves by the far bank alone: its dead ends are the far bank, the boss, the pockets and the cave mouth', () => {
        const deadEnds = breakwater.nodes.filter(n => n.connectedNodes.length === 0).map(n => n.id);
        expect(deadEnds.sort()).toEqual([
            'bw-b2', 'bw-c2', 'bw-d2', 'bw-d5', 'bw-h6', 'bw-h8', 'bw-k2',
            'bw-l2', 'bw-l5', 'bw-m3', 'bw-m5', 'bw-p3', 'bw-t4',
        ]);
        const leaving = breakwater.nodes.filter(n => {
            const p = getNodeEventPool('coastal-continent', 'breakwater', n.id)?.entries[0]?.payload;
            return p?.kind === 'travel' && 'map' in p.destination;
        }).map(n => n.id);
        expect(leaving).toEqual(['bw-b2']);
        expect(breakwater.nodes.find(n => n.id === 'bw-b1')!.connectedNodes).toEqual(['bw-b2']);
    });
});

describe('the Breakwater\'s events (D29)', () => {
    const kinds = Object.fromEntries(
        breakwater.nodes.map(n => [n.id, resolveMapEvent(standingOn(n.id)).event.kind]),
    );

    it('resolves an authored event on every node: no waypoint, nothing empty', () => {
        expect(Object.keys(kinds)).toHaveLength(44);
        expect(Object.values(kinds)).not.toContain('empty');
        expect(Object.values(kinds)).not.toContain('none');
    });

    it('spreads 19 fights, 3 camps, 3 loot caches, 6 hazards, 2 villages, 4 cutscenes, 3 travels and 4 quest nodes', () => {
        const tally: Record<string, number> = {};
        for (const k of Object.values(kinds)) tally[k] = (tally[k] ?? 0) + 1;
        expect(tally).toEqual({
            encounter: 19, rest: 3, 'loot-cache': 3, hazard: 6, village: 2, cutscene: 4, travel: 3, quest: 4,
        });
    });

    it('puts the chain\'s quest nodes on the camp, the lighthouse, the keep gate and the bridge', () => {
        for (const [id, node] of [['bw-c2', 2], ['bw-l5', 3], ['bw-k1', 4], ['bw-b1', 5]] as const) {
            const payload = getNodeEventPool('coastal-continent', 'breakwater', id)!.entries[0]!.payload;
            expect(payload, id).toMatchObject({ kind: 'quest', questline: BREAKWATER_CHAPTER_QUESTLINE_ID, node });
        }
    });

    it('keeps an Anvil in each of its two villages, the town (bw-t4) and the manor (bw-m5) (R3b)', () => {
        for (const id of ['bw-t4', 'bw-m5']) {
            expect(kinds[id], id).toBe('village');
            const payload = getNodeEventPool('coastal-continent', 'breakwater', id)!.entries[0]!.payload;
            expect(payload.kind === 'village' && payload.anvil?.variants?.length, id).toBeGreaterThan(0);
        }
    });

    it('opens on an arrival scene at the windmill, not a rest screen, that gives the chain\'s first quest (D31)', () => {
        expect(kinds['bw-w1']).toBe('cutscene');
        const payload = getNodeEventPool('coastal-continent', 'breakwater', 'bw-w1')!.entries[0]!.payload;
        expect(payload).toMatchObject({
            kind: 'cutscene', effect: { giveQuestStep: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1 } },
        });
    });

    it('fights the Death Beholder in the sea keep, pinned low, as the chapter boss (D61)', () => {
        const payload = getNodeEventPool('coastal-continent', 'breakwater', 'bw-k2')!.entries[0]!.payload;
        expect(payload).toMatchObject({ kind: 'encounter', enemySlug: 'death-beholder', isBoss: true, level: BW_DOOR_LEVEL });
    });

    it('fights the Cave Choir or the Tithe-Collector in the sea cave (EN1j, EN1h) and the Green Jelly on the other two held elite nodes (D61)', () => {
        const cave = getNodeEventPool('coastal-continent', 'breakwater', 'bw-c1')!.entries.map(e => e.payload);
        expect(cave).toContainEqual(expect.objectContaining({ kind: 'encounter', enemySlug: 'cave-choir', isBoss: false, level: 5 }));
        expect(cave).toContainEqual(expect.objectContaining({ kind: 'encounter', enemySlug: 'tithe-collector', isBoss: false, level: 5 }));
        for (const id of ['bw-w5', 'bw-l4']) {
            const payload = getNodeEventPool('coastal-continent', 'breakwater', id)!.entries[0]!.payload;
            expect(payload, id).toMatchObject({ kind: 'encounter', enemySlug: 'green-jelly', isBoss: false, level: BW_ELITE_LEVEL });
        }
    });

    it('crosses the far bank into the Charcoal Wood (Act 1, map 2)', () => {
        const offer = resolveMapEvent(standingOn('bw-b2'));
        expect(offer.event.kind).toBe('travel');
        const r = { state: takeTravel(offer.state) };
        expect(r.state.world.currentMap.name).toBe('charcoal-wood');
        expect(r.state.world.currentMap.currentNode).toBe('cw-1');
    });
});
