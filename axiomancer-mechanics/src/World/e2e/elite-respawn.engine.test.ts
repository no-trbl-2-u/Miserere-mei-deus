/**
 * Elites come back after a night's rest (phase ER1, engine halves of A1-A3,
 * A7, A9 and A10).
 *
 * The walk below crosses Act 1 for real: on each region it walks onto the
 * Green Jelly's node, resolves the arrival (the encounter), settles the fight
 * (`settleArrival`, which `END_COMBAT` runs for a win, a flee or a spare
 * alike) and leaves through the region's exit door, which files the departed
 * map under `world.mapStates`. On the last region it claims a rest, which in
 * the engine is `respawnElites`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import '../MapEvents/content';
import { createStartingWorld } from '../index';
import { getMapDefinition } from '../map.registry';
import { markNodeConsumed, moveToNode, placeOnNode } from '../world.reducer';
import { getNodeEventPool, resolveMapEvent, settleArrival } from '../MapEvents/resolve-map-event';
import { takeTravel } from '../MapEvents/travel';
import {
    isEliteNode, isEliteUpgradeTaken, markEliteUpgradeTaken, respawnElites,
    retireEliteNode, settledEliteNodes,
} from '../elite-respawn';
import { planAct1Walk } from '../act1-walk';
import { createGameStore } from '../../Game/store';
import type { GameState } from '../../Game/types';
import type { PersistenceAdapter } from '../../Game/persistence/types';
import type { MapName } from '../map.library';
import type { MapState, WorldState } from '../types';
import { Player } from '../../Character/characters.mock';
import { mockSequentialRng } from '../../test-utils/rng';
import { eliteRelicPool, rollEliteRelicDrop } from '../../Combat/combat.rewards';
import { ELITE_RELIC_DROP_CHANCE } from '../../Game/game-mechanics.constants';
import { FIXTURE_ELITE_RELICS, FIXTURE_QUEST_RELIC } from '../../Game/fixtures/fixture-content';
import { deepClone } from '../../Utils';
import type { Character } from '../../Character/types';
import type { Equipment } from '../../Items/types';

afterEach(() => vi.restoreAllMocks());

const ELITES = [
    { map: 'breakwater', node: 'bw-8' },
    { map: 'charcoal-wood', node: 'cw-12' },
    { map: 'beacon-crags', node: 'bc-8' },
    { map: 'lantern-deep', node: 'ld-8' },
] as const;

const REGIONS = planAct1Walk().regions;

const noDisk: PersistenceAdapter = { load: () => null, save: () => undefined };

function gameOn(world: WorldState): GameState {
    return createGameStore(noDisk, { player: Player, world }).getState() as GameState;
}

/** A neighbour of `nodeId` on the map (either edge direction), for the approach. */
function neighbourOf(map: MapState, nodeId: string): string {
    const def = getMapDefinition(map.continent, map.name);
    const own = def.nodes.find(n => n.id === nodeId)!;
    const into = def.nodes.find(n => n.connectedNodes.includes(nodeId))?.id;
    return into ?? own.connectedNodes[0]!;
}

/**
 * Stands beside `nodeId` (the approach counts as resolved, as a walked route
 * would), walks onto it and resolves the arrival. Returns the state with the
 * arrival owed and the resolved event.
 */
function arriveAt(state: GameState, nodeId: string) {
    const approach = neighbourOf(state.world.currentMap, nodeId);
    let world = placeOnNode(state.world, approach);
    world = { ...world, currentMap: markNodeConsumed(world.currentMap, approach) };
    world = moveToNode(world, nodeId);
    return resolveMapEvent({ ...state, world }, () => 0.5);
}

/** Walks onto the elite, enters the fight and settles it (any outcome). */
function fightElite(state: GameState, nodeId: string): { state: GameState; slug: string; level: number } {
    const { state: owed, event } = arriveAt(state, nodeId);
    if (event.kind !== 'encounter') throw new Error(`expected a fight at ${nodeId}, got ${event.kind}`);
    const foe = event.encounter.enemies[0]!;
    expect(event.isBoss).toBe(false);
    return { state: settleArrival(owed), slug: foe.name, level: foe.level };
}

/** Leaves the current region through its exit door. */
function leaveRegion(state: GameState, map: MapName): GameState {
    const exit = REGIONS.find(r => r.map === map)!.exit;
    const placed = placeOnNode(state.world, exit);
    const { state: next, event } = resolveMapEvent({ ...state, world: placed }, () => 0.5);
    expect(event.kind).toBe('travel');
    return takeTravel(next);
}

/** A rest node of the current map. */
function restNodeOf(map: MapState): string {
    const def = getMapDefinition(map.continent, map.name);
    return def.nodes.find(n => getNodeEventPool(map.continent, map.name, n.id)?.entries[0]?.kind === 'rest')!.id;
}

/** Walks Act 1, fighting the elites named in `fight`; ends on the Lantern Deep. */
function walkAct1(fight: ReadonlySet<string>) {
    mockSequentialRng(0.5);
    let state = gameOn(createStartingWorld('breakwater'));
    const firstFights: Record<string, { slug: string; level: number }> = {};
    for (const { map, node } of ELITES) {
        expect(state.world.currentMap.name).toBe(map);
        if (fight.has(node)) {
            const fought = fightElite(state, node);
            state = fought.state;
            firstFights[node] = { slug: fought.slug, level: fought.level };
            expect(state.world.currentMap.consumedNodes).toContain(node);
        }
        if (map !== 'lantern-deep') state = leaveRegion(state, map);
    }
    // Claim a rest on the last region: arrive, resolve (consumed on arrival).
    const rest = restNodeOf(state.world.currentMap);
    const placed = placeOnNode(state.world, rest);
    const rested = resolveMapEvent({ ...state, world: placed }, () => 0.5);
    expect(rested.event.kind).toBe('rest');
    return { state: rested.state, rest, firstFights };
}

function spentOn(world: WorldState, map: MapName, node: string): boolean {
    const m = world.currentMap.name === map ? world.currentMap : world.mapStates![map]!;
    return m.consumedNodes.includes(node) || m.completedNodes.includes(node);
}

describe('respawnElites over a real Act 1 walk (A1, A2)', () => {
    it('brings back all four elites, on the current map and on the departed maps', () => {
        const { state, rest, firstFights } = walkAct1(new Set(ELITES.map(e => e.node)));
        for (const e of ELITES) expect(spentOn(state.world, e.map, e.node)).toBe(true);

        const { world, respawned } = respawnElites(state.world);
        expect(respawned).toEqual([
            { map: 'lantern-deep', node: 'ld-8' },
            { map: 'breakwater', node: 'bw-8' },
            { map: 'charcoal-wood', node: 'cw-12' },
            { map: 'beacon-crags', node: 'bc-8' },
        ]);
        for (const e of ELITES) expect(spentOn(world, e.map, e.node)).toBe(false);
        // The rest node stays used up, and the player has not moved.
        expect(world.currentMap.consumedNodes).toContain(rest);
        expect(world.currentMap.currentNode).toBe(rest);

        // On the current map the elite is a legal destination again, and its
        // arrival offers the same encounter.
        const back = arriveAt(gameOn(world), 'ld-8');
        expect(back.event.kind).toBe('encounter');
        if (back.event.kind !== 'encounter') return;
        expect(back.event.isBoss).toBe(false);
        expect(back.event.encounter.enemies[0]!.name).toBe(firstFights['ld-8']!.slug);
        expect(back.event.encounter.enemies[0]!.level).toBe(firstFights['ld-8']!.level);
        expect(() => moveToNode(placeOnNode(world, neighbourOf(world.currentMap, 'ld-8')), 'ld-8')).not.toThrow();

        // A departed map restored through a door shows its elite unspent.
        const atExit = placeOnNode(world, REGIONS.find(r => r.map === 'lantern-deep')!.exit);
        const door = { state: takeTravel(gameOn(atExit), {
            kind: 'travel', destination: { map: 'breakwater', continent: 'coastal-continent' }, prompt: '[content]',
        }) };
        expect(door.state.world.currentMap.name).toBe('breakwater');
        expect(spentOn(door.state.world, 'breakwater', 'bw-8')).toBe(false);
        const again = fightElite(door.state, 'bw-8');
        expect(again.slug).toBe(firstFights['bw-8']!.slug);
        expect(again.level).toBe(firstFights['bw-8']!.level);
    });

    it('respawns exactly the elites that were fought', () => {
        const { state } = walkAct1(new Set(['bw-8', 'bc-8']));
        const { world, respawned } = respawnElites(state.world);
        expect(respawned).toEqual([
            { map: 'breakwater', node: 'bw-8' },
            { map: 'beacon-crags', node: 'bc-8' },
        ]);
        expect(spentOn(world, 'breakwater', 'bw-8')).toBe(false);
        expect(spentOn(world, 'beacon-crags', 'bc-8')).toBe(false);
        expect(spentOn(world, 'charcoal-wood', 'cw-12')).toBe(false);
        expect(spentOn(world, 'lantern-deep', 'ld-8')).toBe(false);
    });

    it('is pure, and a world with no settled elite comes back unchanged', () => {
        const fresh = createStartingWorld('breakwater');
        const out = respawnElites(fresh);
        expect(out.world).toBe(fresh);
        expect(out.respawned).toEqual([]);

        const { state } = walkAct1(new Set(['cw-12']));
        const frozen = structuredClone(state.world);
        respawnElites(state.world);
        expect(state.world).toEqual(frozen);
    });

    it('changes nothing but the spent lists: position, discovery, hazards, routes and other acts', () => {
        const { state } = walkAct1(new Set(ELITES.map(e => e.node)));
        const otherAct: MapState = {
            ...deepClone(state.world.currentMap),
            name: 'aporia-colonnade', continent: 'labyrinth-continent',
        };
        const before: WorldState = {
            ...state.world,
            currentMap: {
                ...state.world.currentMap,
                hazardOutcomes: [{ nodeId: 'ld-2', hazardId: 'h', outcome: 'cleared', appliedDate: '2026-10-27' }],
                blockedRoutes: [{ from: 'ld-1', to: 'ld-2', reason: 'test' }],
            },
            mapStates: { ...state.world.mapStates, 'aporia-colonnade': otherAct },
        };
        const { world } = respawnElites(before);
        const strip = (m: MapState) => ({ ...m, consumedNodes: [], completedNodes: [], availableNodes: [], lockedNodes: [] });
        expect(strip(world.currentMap)).toEqual(strip(before.currentMap));
        for (const name of Object.keys(before.mapStates!) as MapName[]) {
            expect(strip(world.mapStates![name]!)).toEqual(strip(before.mapStates![name]!));
        }
        expect(world.mapStates!['aporia-colonnade']).toBe(otherAct);
        expect(world.world).toBe(before.world);
        expect(world.currentContinent).toBe(before.currentContinent);
    });
});

describe('only elites return (A3)', () => {
    it('every other node of every Act 1 map stays spent', () => {
        // A full clear of every Act 1 map: every node spent.
        const cleared = (m: MapState): MapState => {
            const def = getMapDefinition(m.continent, m.name);
            return def.nodes.reduce((acc, n) => markNodeConsumed(acc, n.id), m);
        };
        let state = gameOn(createStartingWorld('breakwater'));
        for (const { map } of ELITES) {
            state = { ...state, world: { ...state.world, currentMap: cleared(state.world.currentMap) } };
            if (map !== 'lantern-deep') state = leaveRegion(state, map);
        }
        const { world, respawned } = respawnElites(state.world);
        expect(respawned).toHaveLength(4);
        let swept = 0;
        for (const { map } of ELITES) {
            const m = world.currentMap.name === map ? world.currentMap : world.mapStates![map]!;
            for (const node of getMapDefinition(m.continent, m.name).nodes) {
                const elite = isEliteNode(m.continent, m.name, node.id);
                // Each exit door was stood on to leave, so it was never spent.
                const wasSpent = spentOn(state.world, map, node.id);
                expect(spentOn(world, map, node.id), `${map}/${node.id}`).toBe(wasSpent && !elite);
                if (wasSpent && !elite) swept += 1;
            }
        }
        expect(swept).toBeGreaterThan(60);
    });
});

describe('a retired elite never returns (A9)', () => {
    it('respawnElites skips a retired node on any map of the act', () => {
        const { state } = walkAct1(new Set(ELITES.map(e => e.node)));
        // Retire ld-8 (current map) and bw-8 (departed, retired while it was current).
        let world = retireEliteNode(state.world, 'ld-8');
        world = {
            ...world,
            mapStates: {
                ...world.mapStates,
                breakwater: { ...world.mapStates!.breakwater!, retiredEliteNodes: ['bw-8'] },
            },
        };
        expect(settledEliteNodes(world).map(s => s.node)).toEqual(['cw-12', 'bc-8']);
        const out = respawnElites(world);
        expect(out.respawned.map(r => r.node)).toEqual(['cw-12', 'bc-8']);
        expect(spentOn(out.world, 'lantern-deep', 'ld-8')).toBe(true);
        expect(spentOn(out.world, 'breakwater', 'bw-8')).toBe(true);
    });

    it('retireEliteNode touches nothing else and is idempotent', () => {
        const world = createStartingWorld('breakwater');
        const retired = retireEliteNode(world, 'bw-8');
        expect(retired.currentMap).toEqual({ ...world.currentMap, retiredEliteNodes: ['bw-8'] });
        expect(retired.mapStates).toBe(world.mapStates);
        expect(retireEliteNode(retired, 'bw-8')).toBe(retired);
    });
});

describe('the upgrade is taken once per elite (A10)', () => {
    it('markEliteUpgradeTaken touches nothing else and survives a respawn', () => {
        const { state } = walkAct1(new Set(['ld-8']));
        const marked = markEliteUpgradeTaken(state.world, 'ld-8');
        expect(marked.currentMap).toEqual({ ...state.world.currentMap, eliteUpgradeTakenNodes: ['ld-8'] });
        expect(markEliteUpgradeTaken(marked, 'ld-8')).toBe(marked);
        expect(isEliteUpgradeTaken(marked, 'ld-8')).toBe(true);
        expect(isEliteUpgradeTaken(state.world, 'ld-8')).toBe(false);

        const { world } = respawnElites(marked);
        expect(spentOn(world, 'lantern-deep', 'ld-8')).toBe(false);
        expect(isEliteUpgradeTaken(world, 'ld-8')).toBe(true);
    });
});

describe("each elite rolls its own drop list (A7)", () => {
    const [A, B] = FIXTURE_ELITE_RELICS as readonly [Equipment, Equipment];
    const Q = FIXTURE_QUEST_RELIC;
    const POOL: readonly Equipment[] = [A, B, Q];
    // Two elites sharing B.
    const LIST_X = [A.id, B.id];
    const LIST_Y = [B.id, Q.id];

    function seededRng(seed: number): () => number {
        let s = seed % 2147483647 || 1;
        return () => {
            s = (s * 48271) % 2147483647;
            return s / 2147483647;
        };
    }
    const bare = (): Character => ({ ...deepClone(Player), inventory: [] });

    it('draws from the fight\'s own list at the constant\'s rate, and never drops a carried shared relic', () => {
        const KILLS = 10_000;
        let drops = 0;
        const rng = seededRng(104729);
        for (let i = 0; i < KILLS; i++) {
            const list = i % 2 === 0 ? LIST_X : LIST_Y;
            const relic = rollEliteRelicDrop(bare(), rng, POOL, list);
            if (relic) {
                drops += 1;
                expect(list).toContain(relic.id);
            }
        }
        expect(Math.abs(drops / KILLS - ELITE_RELIC_DROP_CHANCE)).toBeLessThan(0.01);

        // Carrying the shared relic: neither elite ever drops it.
        const carrying = { ...bare(), inventory: [deepClone(B)] };
        expect(eliteRelicPool(carrying, POOL, LIST_X).map(r => r.id)).toEqual([A.id]);
        expect(eliteRelicPool(carrying, POOL, LIST_Y).map(r => r.id)).toEqual([Q.id]);
        const rng2 = seededRng(209458);
        for (let i = 0; i < 5_000; i++) {
            const relic = rollEliteRelicDrop(carrying, rng2, POOL, i % 2 === 0 ? LIST_X : LIST_Y);
            expect(relic?.id).not.toBe(B.id);
        }

        // A list the player fully carries drops nothing and draws nothing.
        const full = { ...bare(), inventory: [deepClone(A), deepClone(B)] };
        let draws = 0;
        expect(rollEliteRelicDrop(full, () => { draws += 1; return 0; }, POOL, LIST_X)).toBeNull();
        expect(draws).toBe(0);
    });

    it('an absent list is the whole elite-only pool, as before', () => {
        expect(eliteRelicPool(bare(), POOL).map(r => r.id)).toEqual([A.id, B.id]);
    });
});
