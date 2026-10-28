/**
 * The Act 1 walk plan (Phase AW1a).
 *
 * The browser walk (`axiomancer-mobile/scripts/act1-walk-e2e.mjs`) crosses all
 * four Act 1 doors from a new game and meets every event kind each region
 * carries. Its path is never a hand-listed node sequence: it is derived here,
 * at run time, from the map graphs and the registered node pools, so a new
 * node or kind is picked up without editing the script.
 *
 * Everything is read from the graph:
 *   - the regions, in order: the new-game map, then each exit's `travel`
 *     destination, until an exit that travels nowhere;
 *   - a region's exit: its one terminal node (no outgoing edge) in the last
 *     column (a questline's pockets are dead ends too, never the exit);
 *   - its door: the one node with an edge into the exit (the Death Beholder);
 *   - the kinds it carries: the first entry kind of every node's pool.
 *
 * The path follows the frontier rule (`world.reducer.ts`): a node is open when
 * it touches any resolved node. From the arrival node, the plan repeatedly
 * walks the shortest route through the visited set to the nearest node of a
 * kind not yet met (door and exit excluded), resolving every node on the way,
 * then the door, then the exit. Ties break in map-definition order.
 *
 * A region that carries a questline (the Breakwater's) plays it first, in
 * step order: the walk goes to each step's quest node (accepting the step
 * there, after turning in the one before), then to as many nodes of its
 * pocket as the step counts (the nearest first). The last step's boss is the
 * door. The questline's own locks and held roads open in that order, so the
 * walk never needs a road the game would refuse.
 *
 * Read-only: nothing here edits a map, a pool or a save.
 *
 * Functions:
 *   planAct1Walk()            the four regions with their derived paths
 *   ACT1_WALK_EVENT_KINDS     all thirteen map-event kinds, for the audit table
 */

import { MAP_REGISTRY } from './map.registry';
import type { ContinentName, MapName } from './map.library';
import type { MapDefinition } from './types';
import type { MapEventKind } from './MapEvents/types';
import { getNodeEventPool } from './MapEvents/resolve-map-event';
import './MapEvents/content';
import { STARTING_MAP } from './index';
import { listQuestlines } from './questline';
import { objectiveClass, stepSupply, supplyClassesOf } from './questline-supply';

/** Every map-event kind, in `MapEventKind` declaration order. */
export const ACT1_WALK_EVENT_KINDS: readonly MapEventKind[] = [
    'encounter', 'interaction', 'gathering', 'rest', 'village', 'cutscene',
    'hazard', 'loot-cache', 'narration', 'blacksmith', 'travel', 'labyrinth', 'quest',
];

/** Why a step is on the path. */
export type Act1WalkRole = 'arrival' | 'path' | 'door' | 'exit';

export interface Act1WalkStep {
    readonly nodeId: string;
    readonly kind: MapEventKind;
    readonly role: Act1WalkRole;
}

export interface Act1WalkRegion {
    readonly continent: ContinentName;
    readonly map: MapName;
    readonly start: string;
    readonly door: string;
    readonly exit: string;
    /** Distinct kinds this region's nodes carry, in first-seen map order. */
    readonly carried: readonly MapEventKind[];
    /** Every carrier of each kind, in map order. */
    readonly carriers: Readonly<Partial<Record<MapEventKind, readonly string[]>>>;
    /** The arrival node, the derived path, the door, the exit. */
    readonly steps: readonly Act1WalkStep[];
}

export interface Act1WalkPlan {
    readonly regions: readonly Act1WalkRegion[];
    /** Distinct kinds across all regions, in first-seen order. */
    readonly carried: readonly MapEventKind[];
}

function continentOf(map: string): ContinentName {
    for (const [continent, maps] of Object.entries(MAP_REGISTRY)) {
        if (maps[map as MapName]) return continent as ContinentName;
    }
    throw new Error(`act1-walk: map '${map}' is not registered`);
}

function nodeKind(continent: string, map: string, nodeId: string): MapEventKind {
    const kind = getNodeEventPool(continent, map, nodeId)?.entries[0]?.kind;
    if (!kind) throw new Error(`act1-walk: ${map}/${nodeId} has no event pool`);
    return kind;
}

function undirected(def: MapDefinition): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const n of def.nodes) adj.set(n.id, new Set());
    for (const n of def.nodes) {
        for (const next of n.connectedNodes) {
            if (!adj.has(next)) continue;
            adj.get(n.id)!.add(next);
            adj.get(next)!.add(n.id);
        }
    }
    return adj;
}

/**
 * The shortest route from the visited set to the nearest node whose kind is
 * still wanted, as the list of new nodes to resolve in order. `null` when no
 * wanted node is reachable without crossing a barred node.
 */
function routeToNearest(
    def: MapDefinition,
    adj: Map<string, Set<string>>,
    visited: ReadonlySet<string>,
    barred: ReadonlySet<string>,
    wanted: (id: string) => boolean,
): string[] | null {
    const order = new Map(def.nodes.map((n, i) => [n.id, i]));
    const byOrder = (a: string, b: string) => order.get(a)! - order.get(b)!;
    const prev = new Map<string, string | null>();
    let layer = [...visited].sort(byOrder);
    for (const id of layer) prev.set(id, null);
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
        const hit = next.find(wanted);
        if (hit) {
            const route: string[] = [];
            for (let at: string | null = hit; at !== null && !visited.has(at); at = prev.get(at) ?? null) {
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

    const lastColumn = Math.max(...def.nodes.map(n => n.location[0]));
    const terminals = def.nodes.filter(n => n.connectedNodes.length === 0 && n.location[0] === lastColumn);
    if (terminals.length !== 1) {
        throw new Error(`act1-walk: ${map} has ${terminals.length} terminal nodes, expected one exit`);
    }
    const exit = terminals[0]!.id;
    const feeders = def.nodes.filter(n => n.connectedNodes.includes(exit));
    if (feeders.length !== 1) {
        throw new Error(`act1-walk: ${map} exit ${exit} has ${feeders.length} feeding nodes, expected one door`);
    }
    const door = feeders[0]!.id;

    const kindOf = new Map(def.nodes.map(n => [n.id, nodeKind(continent, map, n.id)]));
    const carried: MapEventKind[] = [];
    const carriers: Partial<Record<MapEventKind, string[]>> = {};
    for (const n of def.nodes) {
        const kind = kindOf.get(n.id)!;
        if (!carried.includes(kind)) carried.push(kind);
        (carriers[kind] ??= []).push(n.id);
    }

    const steps: Act1WalkStep[] = [{ nodeId: start, kind: kindOf.get(start)!, role: 'arrival' }];
    const met = new Set<MapEventKind>([kindOf.get(start)!, kindOf.get(door)!, kindOf.get(exit)!]);
    const visited = new Set<string>([start]);
    const barred = new Set<string>([door, exit]);
    const adj = undirected(def);
    const walkTo = (route: readonly string[]) => {
        for (const id of route) {
            visited.add(id);
            met.add(kindOf.get(id)!);
            steps.push({ nodeId: id, kind: kindOf.get(id)!, role: 'path' });
        }
    };

    for (const questline of listQuestlines().filter(q => q.mapName === map)) {
        const markers = questline.steps.map(s => s.nodeId);
        for (const step of questline.steps) {
            const later = markers.filter((_, i) => questline.steps[i]!.step > step.step);
            const fenced = new Set<string>([door, exit, ...later]);
            if (!visited.has(step.nodeId)) {
                const route = routeToNearest(def, adj, visited, fenced, id => id === step.nodeId);
                if (!route) throw new Error(`act1-walk: ${map} quest node ${step.nodeId} is not reachable`);
                walkTo(route);
            }
            const supply = new Set(stepSupply(def, questline, step));
            for (const objective of step.quest.objectives) {
                const cls = objectiveClass(objective);
                if (!cls || cls === 'boss') continue;
                for (let n = 0; n < objective.requiredCount; n++) {
                    const route = routeToNearest(def, adj, visited, fenced,
                        id => supply.has(id) && supplyClassesOf(continent, map, id).includes(cls));
                    if (!route) throw new Error(`act1-walk: ${map} step ${step.step} has no ${cls} node left to count`);
                    walkTo(route);
                }
            }
        }
    }

    for (;;) {
        const missing = carried.filter(k => !met.has(k));
        if (missing.length === 0) break;
        const route = routeToNearest(def, adj, visited, barred, id => missing.includes(kindOf.get(id)!));
        if (!route) {
            throw new Error(`act1-walk: ${map} carries ${missing.join(', ')} but no carrier is reachable before the door`);
        }
        walkTo(route);
    }

    const toDoor = routeToNearest(def, adj, visited, new Set([exit]), id => id === door);
    if (!toDoor) throw new Error(`act1-walk: ${map} door ${door} is not reachable from the path`);
    for (const id of toDoor) {
        visited.add(id);
        steps.push({ nodeId: id, kind: kindOf.get(id)!, role: id === door ? 'door' : 'path' });
    }
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
        next = payload?.kind === 'travel'
            ? { continent: payload.destinationContinent, map: payload.destinationMap }
            : null;
    }
    const carried: MapEventKind[] = [];
    for (const r of regions) for (const k of r.carried) if (!carried.includes(k)) carried.push(k);
    return { regions, carried };
}
