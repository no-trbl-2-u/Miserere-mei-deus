/**
 * The Act 1 walk plan (Phase AW1a).
 *
 * The browser walk (`axiomancer-mobile/scripts/act1-walk-e2e.mjs`) crosses all
 * four Act 1 doors from a new game and meets every event kind each region
 * carries. Its path is never a hand-listed node sequence: it is derived here,
 * at run time, from the map graphs and the registered node pools, so a new
 * node or kind is picked up without editing the script.
 *
 * Everything is read from the graph and the pools:
 *   - the regions, in order: the new-game map, then each exit's `travel`
 *     destination, until an exit that travels nowhere;
 *   - a region's exit: its one node that travels to another map, or, on the
 *     last map, its one terminal node (no outgoing edge) in the last column;
 *   - its door: the one node with an edge into the exit (the Death Beholder;
 *     on the Breakwater, the river bridge's quest node);
 *   - the kinds it carries: the first entry kind of every node's pool, or
 *     `'none'` for an empty waypoint (a node with no pool).
 *
 * The path walks the roads (`roads.ts`): every step is joined by a road to
 * the step before it, and a dead end is left the way it was entered. A
 * same-map passage (a travel node whose destination is a node, NK1d) joins
 * its two ends too: the step after the travel node is the far end, with the
 * role `passage` (the walker says YES on the travel screen and lands there).
 * From the arrival node, the plan repeatedly walks the shortest route from
 * where it stands to the nearest node of a kind not yet met (door and exit
 * excluded): back across nodes it has already resolved (`back` steps) and
 * resolving every new node on the way, then the door, then the exit. Ties
 * break in map-definition order.
 *
 * A region that carries a questline (the Breakwater's chain) plays it first,
 * in step order: the walk goes to each step's quest node (turning in the step
 * before, then accepting the step there), then to as many nodes as the step
 * counts (a boss step walks to the boss). A step turned in somewhere other
 * than the next quest node (`turnInAt`) is turned in at that node, which is
 * the door when it feeds the exit. Later quest nodes are fenced until their
 * turn, so the walk never needs a road the game would refuse.
 *
 * Read-only: nothing here edits a map, a pool or a save.
 *
 * Functions:
 *   planAct1Walk()            the four regions with their derived paths
 *   ACT1_WALK_EVENT_KINDS     the ten map-event kinds and the waypoint, for the audit table
 */

import { MAP_REGISTRY } from './map.registry';
import type { ContinentName, MapName } from './map.library';
import type { MapDefinition } from './types';
import type { MapEventKind } from './MapEvents/types';
import { getNodeEventPool } from './MapEvents/resolve-map-event';
import './MapEvents/content';
import { STARTING_MAP } from './index';
import { listQuestlines } from './questline';
import { objectiveClass, supplyClassesOf } from './questline-supply';
import { mapPassages } from './road-reachability';

/** What a walked node carries: a map-event kind, or `'none'` for an empty waypoint. */
export type Act1WalkKind = MapEventKind | 'none';

/** Every map-event kind, in `MapEventKind` declaration order, then the waypoint. */
export const ACT1_WALK_EVENT_KINDS: readonly Act1WalkKind[] = [
    'encounter', 'rest', 'village', 'cutscene', 'hazard', 'loot-cache',
    'travel', 'labyrinth', 'quest', 'none',
];

/** Why a step is on the path. */
export type Act1WalkRole = 'arrival' | 'path' | 'back' | 'passage' | 'door' | 'exit';

export interface Act1WalkStep {
    readonly nodeId: string;
    readonly kind: Act1WalkKind;
    readonly role: Act1WalkRole;
}

export interface Act1WalkRegion {
    readonly continent: ContinentName;
    readonly map: MapName;
    readonly start: string;
    readonly door: string;
    readonly exit: string;
    /** Distinct kinds this region's nodes carry, in first-seen map order. */
    readonly carried: readonly Act1WalkKind[];
    /** Every carrier of each kind, in map order. */
    readonly carriers: Readonly<Partial<Record<Act1WalkKind, readonly string[]>>>;
    /** The arrival node, the derived path, the door, the exit. */
    readonly steps: readonly Act1WalkStep[];
}

export interface Act1WalkPlan {
    readonly regions: readonly Act1WalkRegion[];
    /** Distinct kinds across all regions, in first-seen order. */
    readonly carried: readonly Act1WalkKind[];
}

function continentOf(map: string): ContinentName {
    for (const [continent, maps] of Object.entries(MAP_REGISTRY)) {
        if (maps[map as MapName]) return continent as ContinentName;
    }
    throw new Error(`act1-walk: map '${map}' is not registered`);
}

function nodeKind(continent: string, map: string, nodeId: string): Act1WalkKind {
    const pool = getNodeEventPool(continent, map, nodeId);
    if (!pool) return 'none';
    const kind = pool.entries[0]?.kind;
    if (!kind) throw new Error(`act1-walk: ${map}/${nodeId} has an empty event pool`);
    return kind;
}

/** Road adjacency both ways, plus each same-map passage from its travel node. */
function undirected(def: MapDefinition, passages: ReadonlyArray<{ from: string; to: string }>): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const n of def.nodes) adj.set(n.id, new Set());
    for (const n of def.nodes) {
        for (const next of n.connectedNodes) {
            if (!adj.has(next)) continue;
            adj.get(n.id)!.add(next);
            adj.get(next)!.add(n.id);
        }
    }
    for (const p of passages) adj.get(p.from)?.add(p.to);
    return adj;
}

/**
 * The region's exit: its one door to another map, else its one last-column
 * dead end. Throws on a map with two doors or no single dead end; exported for
 * the test that pins those refusals (`act1-walk.exit.test.ts`).
 */
export function exitOf(continent: ContinentName, map: MapName, def: MapDefinition): string {
    const doors = def.nodes.filter(n => {
        const p = getNodeEventPool(continent, map, n.id)?.entries[0]?.payload;
        return p?.kind === 'travel' && 'map' in p.destination;
    });
    if (doors.length === 1) return doors[0]!.id;
    if (doors.length > 1) throw new Error(`act1-walk: ${map} has ${doors.length} doors to another map, expected one exit`);
    const lastColumn = Math.max(...def.nodes.map(n => n.location[0]));
    const terminals = def.nodes.filter(n => n.connectedNodes.length === 0 && n.location[0] === lastColumn);
    if (terminals.length !== 1) {
        throw new Error(`act1-walk: ${map} has ${terminals.length} terminal nodes, expected one exit`);
    }
    return terminals[0]!.id;
}

/**
 * The shortest road from `from` to the nearest unvisited node whose kind is
 * still wanted, as the nodes to walk in order (`from` excluded): visited
 * nodes on the way are walked back across, new ones are resolved. `null`
 * when no wanted node is reachable without crossing a barred node.
 */
function routeToNearest(
    def: MapDefinition,
    adj: Map<string, Set<string>>,
    from: string,
    visited: ReadonlySet<string>,
    barred: ReadonlySet<string>,
    wanted: (id: string) => boolean,
): string[] | null {
    const order = new Map(def.nodes.map((n, i) => [n.id, i]));
    const byOrder = (a: string, b: string) => order.get(a)! - order.get(b)!;
    const prev = new Map<string, string | null>([[from, null]]);
    const isWanted = (id: string) => !visited.has(id) && wanted(id);
    let layer = [from];
    while (layer.length > 0) {
        const next: string[] = [];
        for (const id of layer) {
            for (const n of [...(adj.get(id) ?? [])].sort(byOrder)) {
                if (prev.has(n) || barred.has(n)) continue;
                prev.set(n, id);
                next.push(n);
            }
        }
        next.sort(byOrder);
        const hit = next.find(isWanted);
        if (hit) {
            const route: string[] = [];
            for (let at: string | null = hit; at !== null && at !== from; at = prev.get(at) ?? null) {
                route.unshift(at);
            }
            return route;
        }
        layer = next;
    }
    return null;
}

function planRegion(continent: ContinentName, map: MapName): Act1WalkRegion {
    const def = MAP_REGISTRY[continent][map];
    if (!def) throw new Error(`act1-walk: ${continent}/${map} is not registered`);
    const start = def.startingNode.id;

    const exit = exitOf(continent, map, def);
    const feeders = def.nodes.filter(n => n.connectedNodes.includes(exit));
    if (feeders.length !== 1) {
        throw new Error(`act1-walk: ${map} exit ${exit} has ${feeders.length} feeding nodes, expected one door`);
    }
    const door = feeders[0]!.id;

    const kindOf = new Map(def.nodes.map(n => [n.id, nodeKind(continent, map, n.id)]));
    const carried: Act1WalkKind[] = [];
    const carriers: Partial<Record<Act1WalkKind, string[]>> = {};
    for (const n of def.nodes) {
        const kind = kindOf.get(n.id)!;
        if (!carried.includes(kind)) carried.push(kind);
        (carriers[kind] ??= []).push(n.id);
    }

    const steps: Act1WalkStep[] = [{ nodeId: start, kind: kindOf.get(start)!, role: 'arrival' }];
    const met = new Set<Act1WalkKind>([kindOf.get(start)!, kindOf.get(door)!, kindOf.get(exit)!]);
    const visited = new Set<string>([start]);
    const barred = new Set<string>([door, exit]);
    const passages = mapPassages(def);
    const adj = undirected(def, passages);
    const throughPassage = (from: string, to: string) =>
        passages.some(p => p.from === from && p.to === to)
        && !def.nodes.some(n => (n.id === from && n.connectedNodes.includes(to)) || (n.id === to && n.connectedNodes.includes(from)));
    let here = start;
    const walkTo = (route: readonly string[]) => {
        for (const id of route) {
            const passage = throughPassage(here, id);
            here = id;
            if (passage) {
                // The passage's far end is arrived at, not resolved (NK1d).
                visited.add(id);
                met.add(kindOf.get(id)!);
                steps.push({ nodeId: id, kind: kindOf.get(id)!, role: 'passage' });
                continue;
            }
            if (visited.has(id)) {
                steps.push({ nodeId: id, kind: kindOf.get(id)!, role: 'back' });
                continue;
            }
            visited.add(id);
            met.add(kindOf.get(id)!);
            steps.push({ nodeId: id, kind: kindOf.get(id)!, role: 'path' });
        }
    };

    for (const questline of listQuestlines().filter(q => q.mapName === map)) {
        const steps = [...questline.steps].sort((a, b) => a.step - b.step);
        const markers = steps.flatMap(s => (s.turnInAt ? [s.nodeId, s.turnInAt] : [s.nodeId]));
        for (const step of steps) {
            const later = steps.filter(s => s.step > step.step).map(s => s.nodeId);
            const turnIns = steps.filter(s => s.step >= step.step && s.turnInAt).map(s => s.turnInAt!);
            const fenced = new Set<string>([door, exit, ...later, ...turnIns].filter(id => id !== step.nodeId));
            if (!visited.has(step.nodeId)) {
                const route = routeToNearest(def, adj, here, visited, fenced, id => id === step.nodeId);
                if (!route) throw new Error(`act1-walk: ${map} quest node ${step.nodeId} is not reachable`);
                walkTo(route);
            }
            for (const objective of step.quest.objectives) {
                const cls = objectiveClass(objective);
                if (!cls) continue;
                for (let n = 0; n < objective.requiredCount; n++) {
                    const route = routeToNearest(def, adj, here, visited, fenced,
                        id => !markers.includes(id) && supplyClassesOf(continent, map, id).includes(cls));
                    if (!route) throw new Error(`act1-walk: ${map} step ${step.step} has no ${cls} node left to count`);
                    walkTo(route);
                }
            }
        }
    }

    for (;;) {
        const missing = carried.filter(k => !met.has(k));
        if (missing.length === 0) break;
        const route = routeToNearest(def, adj, here, visited, barred, id => missing.includes(kindOf.get(id)!));
        if (!route) {
            throw new Error(`act1-walk: ${map} carries ${missing.join(', ')} but no carrier is reachable before the door`);
        }
        walkTo(route);
    }

    const toDoor = routeToNearest(def, adj, here, visited, new Set([exit]), id => id === door);
    if (!toDoor) throw new Error(`act1-walk: ${map} door ${door} is not reachable from the path`);
    walkTo(toDoor.slice(0, -1));
    visited.add(door);
    steps.push({ nodeId: door, kind: kindOf.get(door)!, role: 'door' });
    steps.push({ nodeId: exit, kind: kindOf.get(exit)!, role: 'exit' });

    return { continent, map, start, door, exit, carried, carriers, steps };
}

/**
 * The four Act 1 regions in crossing order, each with its derived path.
 * Throws when a region's graph cannot be read as start, door and exit, or a
 * kind it carries cannot be reached before the door.
 */
export function planAct1Walk(): Act1WalkPlan {
    const regions: Act1WalkRegion[] = [];
    const seen = new Set<string>();
    let next: { continent: ContinentName; map: MapName } | null = { continent: continentOf(STARTING_MAP), map: STARTING_MAP };
    while (next !== null) {
        if (seen.has(next.map)) throw new Error(`act1-walk: the travel chain loops back to ${next.map}`);
        seen.add(next.map);
        const region = planRegion(next.continent, next.map);
        regions.push(region);
        const payload = getNodeEventPool(region.continent, region.map, region.exit)?.entries[0]?.payload;
        // Only a door to another map continues the chain; a passage on the
        // same map leads nowhere new.
        const destination = payload?.kind === 'travel' ? payload.destination : undefined;
        next = destination && 'map' in destination
            ? { continent: destination.continent, map: destination.map }
            : null;
    }
    const carried: Act1WalkKind[] = [];
    for (const r of regions) for (const k of r.carried) if (!carried.includes(k)) carried.push(k);
    return { regions, carried };
}
