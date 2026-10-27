/**
 * Elites come back after a night's rest (phase ER1).
 *
 * A node is spent when its encounter settles (victory, flee, defeat or
 * mercy), and a spent node is not a destination. This module is the one way
 * back: claiming a rest un-spends every elite node already fought anywhere in
 * the act, the current map and every departed map the act keeps in
 * `world.mapStates`. The same foe returns at the same pinned level, because
 * the node's authored payload simply resolves again.
 *
 * Two per-map records bound the repeat:
 *   - `MapState.retiredEliteNodes`: an elite whose relic dropped never
 *     returns (`retireEliteNode`).
 *   - `MapState.eliteUpgradeTakenNodes`: the elite reward's upgrade is taken
 *     once per elite (`markEliteUpgradeTaken`, read by `isEliteUpgradeTaken`).
 * Both are optional on the save; absent reads as empty, so no migration.
 *
 * Elite detection reads the node's event pool: a node is an elite node when
 * its pool stages an encounter whose foe is `difficulty: 'elite'`. No content
 * flag, so a future elite placed on any map respawns with no change here.
 *
 * Every function is pure.
 */

import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import type { ContinentName, MapName } from './map.library';
import { getNodeEventPool } from './MapEvents/resolve-map-event';
import type { EncounterPayload } from './MapEvents/types';
import { getMapDefinition } from './map.registry';
import { syncFrontierLists } from './world.reducer';
import type { MapState, NodeId, WorldState } from './types';

/**
 * The continents an act spans. Act 1 crosses two (the coast, then the
 * mountains and the underworld), so "the act" is not `currentContinent`
 * alone. A continent no act lists is an act of its own.
 */
const ACT_CONTINENTS: ReadonlyArray<ReadonlyArray<ContinentName>> = [
    ['coastal-continent', 'northern-continent'],
];

/** The continents that share an act with `continent`. */
function actContinentsOf(continent: ContinentName): ReadonlySet<ContinentName> {
    const act = ACT_CONTINENTS.find(group => group.includes(continent));
    return new Set(act ?? [continent]);
}

/** A settled elite node somewhere in the act. */
export interface EliteNodeRef {
    readonly map: MapName;
    readonly node: NodeId;
}

/** A settled elite node that a claimed rest would bring back, with its foe. */
export interface SettledEliteNode extends EliteNodeRef {
    readonly continent: ContinentName;
    readonly enemySlug: EnemySlug;
}

/**
 * The elite encounter a node stages, or undefined when it stages none: the
 * first pool entry that is an encounter naming an `elite`-difficulty foe.
 */
export function eliteEncounterAt(
    continent: string,
    map: string,
    node: NodeId,
): (EncounterPayload & { enemySlug: EnemySlug }) | undefined {
    const pool = getNodeEventPool(continent, map, node);
    for (const entry of pool?.entries ?? []) {
        const payload = entry.payload;
        if (payload.kind !== 'encounter' || !payload.enemySlug) continue;
        const foe = ENEMY_REGISTRY[payload.enemySlug];
        if (foe?.difficulty === 'elite') return payload as EncounterPayload & { enemySlug: EnemySlug };
    }
    return undefined;
}

/** True when the node stages an elite encounter. */
export function isEliteNode(continent: string, map: string, node: NodeId): boolean {
    return eliteEncounterAt(continent, map, node) !== undefined;
}

/**
 * The relic ids an elite node's fight can drop (`eliteRelicDrops` on its
 * encounter payload), or undefined when the node authors none, which means
 * the whole elite-only pool.
 */
export function eliteRelicDropsAt(continent: string, map: string, node: NodeId): readonly string[] | undefined {
    return eliteEncounterAt(continent, map, node)?.eliteRelicDrops;
}

/** The act's maps the world holds runtime state for: current first, then departed in record order. */
function actMapStates(world: WorldState): MapState[] {
    const act = actContinentsOf(world.currentMap.continent);
    const departed = Object.values(world.mapStates ?? {})
        .filter((m): m is MapState => m !== undefined)
        .filter(m => m.name !== world.currentMap.name && act.has(m.continent));
    return [world.currentMap, ...departed];
}

/** The settled, unretired elite nodes of one map, in map-definition order. */
function settledOn(map: MapState): SettledEliteNode[] {
    const retired = new Set(map.retiredEliteNodes ?? []);
    const spent = new Set<NodeId>([...map.completedNodes, ...map.consumedNodes]);
    const out: SettledEliteNode[] = [];
    for (const node of getMapDefinition(map.continent, map.name).nodes) {
        if (!spent.has(node.id) || retired.has(node.id)) continue;
        const elite = eliteEncounterAt(map.continent, map.name, node.id);
        if (!elite) continue;
        out.push({ map: map.name, continent: map.continent, node: node.id, enemySlug: elite.enemySlug });
    }
    return out;
}

/**
 * Every elite node a claimed rest would bring back: spent (won, fled or
 * spared) and not retired, on the current map and on every departed map of
 * the act. Current map first. The rest screen's preview reads this.
 */
export function settledEliteNodes(world: WorldState): SettledEliteNode[] {
    return actMapStates(world).flatMap(settledOn);
}

/** Un-spends `nodes` on one map and re-syncs its frontier lists. */
function unspend(map: MapState, nodes: ReadonlySet<NodeId>): MapState {
    const cleared: MapState = {
        ...map,
        completedNodes: map.completedNodes.filter(id => !nodes.has(id)),
        consumedNodes: map.consumedNodes.filter(id => !nodes.has(id)),
    };
    // The same unlock-list sync every spend runs (`markNodeConsumed`).
    return syncFrontierLists(cleared);
}

/** The result of {@link respawnElites}. */
export interface RespawnElitesResult {
    readonly world: WorldState;
    readonly respawned: EliteNodeRef[];
}

/**
 * Brings back every settled, unretired elite of the act (a claimed rest's
 * one world effect). Each node leaves `consumedNodes` and `completedNodes`;
 * nothing else changes (current node, discovered nodes, hazard outcomes,
 * blocked routes, maps of another act). A world with no settled elite comes
 * back as the same reference with `respawned: []`.
 *
 * @example respawnElites(world).respawned // [{ map: 'breakwater', node: 'bw-8' }, ...]
 */
export function respawnElites(world: WorldState): RespawnElitesResult {
    const settled = settledEliteNodes(world);
    if (settled.length === 0) return { world, respawned: [] };
    const byMap = new Map<MapName, Set<NodeId>>();
    for (const s of settled) {
        const set = byMap.get(s.map) ?? new Set<NodeId>();
        set.add(s.node);
        byMap.set(s.map, set);
    }
    const currentNodes = byMap.get(world.currentMap.name);
    const currentMap = currentNodes ? unspend(world.currentMap, currentNodes) : world.currentMap;
    let mapStates = world.mapStates;
    for (const [name, nodes] of byMap) {
        if (name === world.currentMap.name) continue;
        const departed = mapStates?.[name];
        if (!departed) continue;
        mapStates = { ...mapStates, [name]: unspend(departed, nodes) };
    }
    return {
        world: { ...world, currentMap, mapStates },
        respawned: settled.map(({ map, node }) => ({ map, node })),
    };
}

/** Adds `nodeId` to a per-map list once; the same map back when already there. */
function addOnce(map: MapState, key: 'retiredEliteNodes' | 'eliteUpgradeTakenNodes', nodeId: NodeId): MapState {
    const list = map[key] ?? [];
    if (list.includes(nodeId)) return map;
    return { ...map, [key]: [...list, nodeId] };
}

/**
 * Retires an elite node on the current map: its relic dropped, so it never
 * returns. Touches nothing else. Idempotent.
 */
export function retireEliteNode(world: WorldState, nodeId: NodeId): WorldState {
    const map = addOnce(world.currentMap, 'retiredEliteNodes', nodeId);
    return map === world.currentMap ? world : { ...world, currentMap: map };
}

/**
 * Records that the elite reward's upgrade was taken over the elite on
 * `nodeId` (current map), so later wins over that elite offer cards only.
 * Touches nothing else. Idempotent.
 */
export function markEliteUpgradeTaken(world: WorldState, nodeId: NodeId): WorldState {
    const map = addOnce(world.currentMap, 'eliteUpgradeTakenNodes', nodeId);
    return map === world.currentMap ? world : { ...world, currentMap: map };
}

/** True when the upgrade was already taken over the elite on `nodeId` (current map). */
export function isEliteUpgradeTaken(world: WorldState, nodeId: NodeId): boolean {
    return (world.currentMap.eliteUpgradeTakenNodes ?? []).includes(nodeId);
}
