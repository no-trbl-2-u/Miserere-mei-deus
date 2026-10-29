/**
 * World reducer — pure transitions over WorldState. Idempotent where it
 * makes sense (locking/unlocking, completing).
 */

import { WorldState, MapState, MapDefinition, MapNode, NodeId, Continent } from './types';
import { MapName, ContinentName } from './map.library';
import { getMapDefinition } from './map.registry';
import { holdsRoads, openRoadsFrom, roadMoveLists } from './roads';

/**
 * Writes an updated continent into BOTH `currentContinent` and its slot in
 * the `world` catalogue. The two must stay in sync or a continent switch
 * would resurrect stale map lists.
 */
function withCurrentContinent(state: WorldState, continent: Continent): WorldState {
    return {
        ...state,
        currentContinent: continent,
        world: state.world.map(c => (c.name === continent.name ? continent : c)),
    };
}

// ── Map navigation ──────────────────────────────────────────────────────────

/** Sets the current map. Caller resolves the MapState from the registry. */
export function changeMap(state: WorldState, map: MapState): WorldState {
    return { ...state, currentMap: map };
}

// ── Node movement ───────────────────────────────────────────────────────────

/** Thrown by `moveToNode` when the requested transition is illegal. */
export class IllegalMoveError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IllegalMoveError';
    }
}

/** Lookup a node on the current map's definition. */
function findNode(map: MapState, nodeId: NodeId): MapNode | undefined {
    const def = getMapDefinition(map.continent, map.name);
    return def.nodes.find(n => n.id === nodeId);
}

// ── Walking the roads ───────────────────────────────────────────────────────
//
// The traversal doctrine (phase WR1a). The player moves only along the open
// roads out of the node they stand on, read both ways, onto new and resolved
// nodes alike (`roads.ts`). A node the player has RESOLVED is SPENT: still
// drawn, still part of the graph, and walkable, but answered. Nothing jumps
// across the map: a dead-end pocket is left the way it was entered.
//
// Nothing here is persisted. The legal moves are DERIVED from what the save
// already carries (`currentNode`, `completedNodes`, `consumedNodes`,
// `blockedRoutes`) plus the static graph, so any save reads correctly on the
// first load.

/**
 * True when `nodeId` has been resolved on this map — "spent".
 * A spent node still renders, still carries its authored content and can be
 * walked across; its one-shot event does not fire again. The one exception: a
 * claimed rest un-spends the act's settled elite nodes (`respawnElites`,
 * elite-respawn.ts), so a fought elite returns. The node the player is
 * standing on is NOT spent by standing there.
 */
export function isNodeSpent(map: MapState, nodeId: NodeId): boolean {
    return map.completedNodes.includes(nodeId) || map.consumedNodes.includes(nodeId);
}

/**
 * True when `nodeId` is on the map's `holdRoadsUntilSettled` list and not yet
 * spent: such a node keeps its onward roads shut, both ways, until it is
 * spent (a quest node before its step is accepted, the watchtower before the
 * boss falls). The road it was reached by stays open. Always false on a map
 * with no list.
 */
export function isHoldingRoads(map: MapState, nodeId: NodeId): boolean {
    return holdsRoads(getMapDefinition(map.continent, map.name), map, nodeId);
}

/**
 * Rewrites `availableNodes` and `lockedNodes` from the road rule: available
 * is the legal moves from where the player stands (`legalMovesFrom`), locked
 * is every other unspent node but the one underfoot.
 *
 * Those two lists are bookkeeping (the CLI's move list, mobile's move gate
 * and the dev inspector read them); `legalMovesFrom` is the authority. Run
 * after every move, resolve, rest respawn and load, so the saved lists always
 * say what the rule says. Returns `map` itself when nothing changes.
 *
 * No-ops on labyrinth maps, which do not consult either list.
 */
export function syncMoveLists(map: MapState): MapState {
    const def = getMapDefinition(map.continent, map.name);
    if (def.traversal === 'labyrinth') return map;
    if (!def.nodes.some(n => n.id === map.currentNode)) return map;
    const { availableNodes, lockedNodes } = roadMoveLists(def, map);
    const same = (a: readonly NodeId[], b: readonly NodeId[]) =>
        a.length === b.length && a.every((id, i) => id === b[i]);
    if (same(availableNodes, map.availableNodes) && same(lockedNodes, map.lockedNodes)) return map;
    return { ...map, availableNodes, lockedNodes };
}

/**
 * The former name of {@link syncMoveLists}, kept while `questline.ts` still
 * imports it (the questline worker owns that file); remove once it has moved.
 */
export const syncFrontierLists = syncMoveLists;

/**
 * `syncMoveLists` over a whole world: the current map and every departed map
 * on file (`mapStates`). The load step: a save written under the frontier
 * rule carries the frontier in its lists, and this rewrites them by the road
 * rule from where the player stands on each map. Returns `world` itself when
 * nothing changes.
 */
export function syncWorldMoveLists(world: WorldState): WorldState {
    const syncSafe = (map: MapState): MapState => {
        try {
            return syncMoveLists(map);
        } catch {
            return map;
        }
    };
    const currentMap = syncSafe(world.currentMap);
    const states = world.mapStates;
    let mapStates = states;
    if (states) {
        const entries = Object.entries(states).map(([k, m]) => [k, m ? syncSafe(m) : m] as const);
        if (entries.some(([k, m]) => m !== states[k as MapName])) mapStates = Object.fromEntries(entries) as typeof states;
    }
    if (currentMap === world.currentMap && mapStates === states) return world;
    return { ...world, currentMap, ...(mapStates !== undefined ? { mapStates } : {}) };
}

/**
 * Moves the player to `nodeId` on the current map. Pure WorldState reducer.
 *
 * Validation (WALKING THE ROADS):
 *   1. The destination must be a real node on the map.
 *   2. The destination must be one of `legalMovesFrom`: joined to the node
 *      the player stands on by an open road, read both ways. New and spent
 *      nodes alike: a resolved node is walked across, its one-shot event
 *      does not fire again. There is no frontier jumping, so the boss is
 *      forced by routing (the bridge behind the watchtower's held road).
 *   3. Blocked routes (hazard outcomes, quest locks) and the onward roads of
 *      an unspent held node (`holdRoadsUntilSettled`) are not open, so a
 *      node across one is not a legal destination from here.
 *
 * Labyrinth maps keep free travel along the
 * CURRENT room's doors including back into solved rooms.
 *
 * Hazard ticking (each `moveToNode` call) belongs to the
 * higher-level orchestrator above this reducer (`Game/`), since the world
 * reducer is purely WorldState-shaped and the player lives at the
 * `GameState` level.
 *
 * THIS IS THE ARRIVAL VERB, and arriving is what a MapEvent fires on. The
 * move therefore records the debt — `pendingArrival` — which `resolveMapEvent`
 * clears when the arrival is answered. Being PLACED on a node is a different act with a different
 * verb (`placeOnNode` / `teleportToNode`), and those clear the field: a
 * fixture or a dev jump stands the player somewhere, it does not walk them
 * there, so nothing is owed.
 */
export function moveToNode(state: WorldState, nodeId: NodeId): WorldState {
    const map = state.currentMap;
    const def = getMapDefinition(map.continent, map.name);
    if (map.currentNode === nodeId) {
        // The retry: the node the player stands on, still unspent, with its
        // arrival already answered (a fled or lost fight, a quest node whose
        // step was not accepted) is owed again, so it can be tried even when
        // it is the last move left. Otherwise idempotent (already here): a
        // spent node, an arrival still owed, the labyrinth's rooms, and the
        // map's starting node (the player is placed there, never arrives:
        // its content is the host's start-node affair).
        const answered = (map.pendingArrival ?? null) === null;
        const retryable = def.traversal !== 'labyrinth' && nodeId !== def.startingNode.id;
        if (retryable && answered && !isNodeSpent(map, nodeId)) {
            return { ...state, currentMap: { ...map, pendingArrival: nodeId } };
        }
        return state;
    }
    const currentNode = def.nodes.find(n => n.id === map.currentNode);
    if (!currentNode) {
        throw new IllegalMoveError(`moveToNode: current node '${map.currentNode}' is unknown on map '${map.name}'.`);
    }
    if (def.traversal === 'labyrinth') {
        // Labyrinth maps allow free travel along the current room's
        // doors, including back into completed/consumed rooms ("solved space
        // is solved" — re-entry is free, the one-shot event just won't fire).
        if (!currentNode.connectedNodes.includes(nodeId)) {
            throw new IllegalMoveError(`moveToNode: '${nodeId}' is not adjacent to '${map.currentNode}'.`);
        }
        const blockedRoute = map.blockedRoutes.find(
            route => (route.from === map.currentNode && route.to === nodeId) ||
                     (route.from === nodeId && route.to === map.currentNode)
        );
        if (blockedRoute) {
            throw new IllegalMoveError(`moveToNode: route from '${map.currentNode}' to '${nodeId}' is blocked — ${blockedRoute.reason}`);
        }
        return {
            ...state,
            currentMap: arriveAtNode(map, nodeId),
        };
    }

    if (!def.nodes.some(n => n.id === nodeId)) {
        throw new IllegalMoveError(`moveToNode: '${nodeId}' is unknown on map '${map.name}'.`);
    }
    if (!legalMovesFrom(map).includes(nodeId)) {
        // Name what actually stopped the move: a blocked or held road out of
        // the node underfoot is the true and useful sentence.
        const touching = currentNode.connectedNodes.includes(nodeId)
            || def.nodes.find(n => n.id === nodeId)?.connectedNodes.includes(map.currentNode);
        const blockedReason = touching ? isRouteBlocked(map, map.currentNode, nodeId) : undefined;
        if (blockedReason !== undefined) {
            throw new IllegalMoveError(`moveToNode: route from '${map.currentNode}' to '${nodeId}' is blocked — ${blockedReason}`);
        }
        if (touching) {
            throw new IllegalMoveError(`moveToNode: the road from '${map.currentNode}' to '${nodeId}' is held until its node is settled.`);
        }
        throw new IllegalMoveError(`moveToNode: '${nodeId}' is not joined by a road to '${map.currentNode}'.`);
    }
    return {
        ...state,
        currentMap: arriveAtNode(map, nodeId),
    };
}

/**
 * Writes an ARRIVAL onto a map: the cursor moves to `nodeId`, the node's
 * unanswered arrival is recorded (`pendingArrival`), and the node the player
 * stood on is recorded as `arrivedFrom`, the spot a first death returns them
 * to. The three fields are one sentence, so they are written together. The
 * engine's `moveToNode` and mobile's own move both arrive through here.
 * Arriving at the node already under the player keeps the `arrivedFrom` it
 * had: nothing was walked.
 *
 * A WALK BACK OWES NOTHING (phase WR1b). On a gauntlet, arriving at a node
 * that is already spent records no debt: its one-shot event is answered, so
 * a reload re-offers nothing there. The kinds that act on every entry (a
 * village, a door, a quest node with business) are resolved by the host's
 * own confirm, never by a re-offered arrival (`actsOnRevisit`,
 * `resolve-map-event.ts`). A labyrinth room keeps its debt as before.
 */
export function arriveAtNode(map: MapState, nodeId: NodeId): MapState {
    const arrivedFrom = map.currentNode === nodeId ? (map.arrivedFrom ?? null) : map.currentNode;
    const def = getMapDefinition(map.continent, map.name);
    const owed = def.traversal === 'labyrinth' || !isNodeSpent(map, nodeId);
    // The move lists are read from where the player stands, so a move
    // rewrites them (a no-op on a labyrinth).
    return syncMoveLists({ ...map, currentNode: nodeId, pendingArrival: owed ? nodeId : null, arrivedFrom });
}

/**
 * Completes the current node and unlocks every `connectedNode` that isn't
 * already completed. Idempotent on completed nodes. Used by the world
 * orchestrator after a node event resolves successfully.
 */
export function completeCurrentNode(state: WorldState): WorldState {
    const map = state.currentMap;
    const nodeId = map.currentNode;
    if (map.completedNodes.includes(nodeId)) return state;

    const node = findNode(map, nodeId);
    const unlocks = node?.connectedNodes ?? [];

    const newLocked = map.lockedNodes.filter(n => !unlocks.includes(n));
    const newlyAvailable = unlocks.filter(
        n => !map.completedNodes.includes(n) && !map.availableNodes.includes(n),
    );
    // Completing a node spends it, which can open a held node's roads: on a
    // gauntlet the sync rewrites both lists by the road rule (the local
    // promotion above is what a labyrinth map keeps).
    return {
        ...state,
        currentMap: syncMoveLists({
            ...map,
            completedNodes: [...map.completedNodes, nodeId],
            availableNodes: [...map.availableNodes, ...newlyAvailable],
            lockedNodes: newLocked,
        }),
    };
}

/** Marks a map as completed on the current continent. Idempotent. */
export function completeMap(state: WorldState, mapName: MapName): WorldState {
    const continent = state.currentContinent;
    if (continent.completedMaps.includes(mapName)) return state;
    return withCurrentContinent(state, {
        ...continent,
        completedMaps: [...continent.completedMaps, mapName],
    });
}

/** Moves a map from `lockedMaps` to `availableMaps`. Idempotent. */
export function unlockMap(state: WorldState, mapName: MapName): WorldState {
    const continent = state.currentContinent;
    if (continent.availableMaps.includes(mapName)) return state;
    return withCurrentContinent(state, {
        ...continent,
        lockedMaps: continent.lockedMaps.filter(m => m !== mapName),
        availableMaps: [...continent.availableMaps, mapName],
    });
}

// ── Node progression ────────────────────────────────────────────────────────

/** Marks a node as completed on the current map. Idempotent. */
export function completeNode(state: WorldState, nodeId: string): WorldState {
    const map = state.currentMap;
    if (map.completedNodes.includes(nodeId)) return state;
    return {
        ...state,
        currentMap: syncMoveLists({
            ...map,
            completedNodes: [...map.completedNodes, nodeId],
        }),
    };
}

/** Moves a node from `lockedNodes` to `availableNodes`. Idempotent. */
export function unlockNode(state: WorldState, nodeId: string): WorldState {
    const map = state.currentMap;
    if (map.availableNodes.includes(nodeId)) return state;
    return {
        ...state,
        currentMap: {
            ...map,
            lockedNodes: map.lockedNodes.filter(n => n !== nodeId),
            availableNodes: [...map.availableNodes, nodeId],
        },
    };
}

// ── Continent navigation ────────────────────────────────────────────────────

/**
 * Switches to the named continent. No-op when the name is not in
 * `state.world` (the catalogue is the authority — labyrinth-continent is
 * deliberately uncatalogued, dev-menu + CLI only, and stays unreachable
 * here). The outgoing `currentContinent` is written back into the catalogue
 * first, so nothing accumulated on it is lost by the switch.
 */
export function changeContinent(state: WorldState, continentName: ContinentName): WorldState {
    const synced = withCurrentContinent(state, state.currentContinent);
    const continent = synced.world.find(c => c.name === continentName);
    if (!continent) return state;
    return { ...synced, currentContinent: continent };
}

// ── Event management ────────────────────────────────────────────────────────

/** Marks a unique event as completed on the current map. */
export function completeUniqueEvent(state: WorldState, eventId: string): WorldState {
    return {
        ...state,
        currentMap: {
            ...state.currentMap,
            uniqueEvents: state.currentMap.uniqueEvents.map(e =>
                e.id === eventId ? { ...e, completed: true } : e,
            ),
        },
    };
}

// ── Fog-of-war discovery + one-shot consumption ─────────────────────────────

/**
 * Reveals every node adjacent to `nodeId` on the current map. Idempotent —
 * nodes already in `discoveredNodes` are left in place. Looks up the
 * static `MapDefinition` to resolve adjacency.
 */
export function revealAdjacent(state: MapState, nodeId: NodeId): MapState {
    const def = getMapDefinition(state.continent, state.name);
    const node = def.nodes.find(n => n.id === nodeId);
    if (!node) return state;
    const already = new Set<NodeId>(state.discoveredNodes);
    let changed = false;
    const next = [...state.discoveredNodes];
    for (const adj of node.connectedNodes) {
        if (!already.has(adj)) {
            next.push(adj);
            already.add(adj);
            changed = true;
        }
    }
    return changed ? { ...state, discoveredNodes: next } : state;
}

/**
 * Marks a node as consumed. Idempotent — re-marking is a no-op. Used by
 * `resolveMapEvent` to enforce the one-shot contract: a consumed node's
 * MapEvent never resolves again.
 */
export function markNodeConsumed(state: MapState, nodeId: NodeId): MapState {
    if (state.consumedNodes.includes(nodeId)) return state;
    // A consumed node is SPENT, which can open a held node's roads. Keep
    // the unlock lists honest about that.
    return syncMoveLists({ ...state, consumedNodes: [...state.consumedNodes, nodeId] });
}

/**
 * Moves every node adjacent to `nodeId` out of `lockedNodes` and into
 * `availableNodes` (`revealAdjacent` only updates `discoveredNodes`, which
 * alone would leave the player stuck at the first map event). Idempotent. Looks up
 * the static `MapDefinition` to resolve adjacency.
 */
export function unlockAdjacent(state: MapState, nodeId: NodeId): MapState {
    const def = getMapDefinition(state.continent, state.name);
    const node = def.nodes.find(n => n.id === nodeId);
    if (!node) return state;
    const adjacents = node.connectedNodes;
    if (adjacents.length === 0) return state;

    const availableSet = new Set<NodeId>(state.availableNodes);
    const newlyAvailable: NodeId[] = [];
    const stillLocked: NodeId[] = [];

    for (const id of state.lockedNodes) {
        if (adjacents.includes(id) && !availableSet.has(id)) {
            newlyAvailable.push(id);
        } else {
            stillLocked.push(id);
        }
    }
    // Also handle the case where an adjacent isn't in lockedNodes but isn't
    // yet in availableNodes (e.g. a sibling map was authored without
    // strict locked-list seeding).
    for (const id of adjacents) {
        if (!availableSet.has(id) && !newlyAvailable.includes(id)) {
            // Was it in lockedNodes already? If so it's in newlyAvailable above.
            // If not, it's neither locked nor available — promote it.
            if (!state.lockedNodes.includes(id)) {
                newlyAvailable.push(id);
            }
        }
    }

    // The local promotion above is what a labyrinth map keeps; on a
    // gauntlet the sync then rewrites both lists by the road rule.
    if (newlyAvailable.length === 0) return syncMoveLists(state);

    return syncMoveLists({
        ...state,
        availableNodes: [...state.availableNodes, ...newlyAvailable],
        lockedNodes: stillLocked,
    });
}

// ── Route blocking (Labyrinth doors) ───────────────────────────────────────

/**
 * Removes any block on the route between two nodes (either direction).
 * Opens a labyrinth secret door or an answered act gate. No-op
 * when the route isn't blocked.
 */
export function unblockMapRoute(state: MapState, from: NodeId, to: NodeId): MapState {
    const remaining = state.blockedRoutes.filter(
        route => !((route.from === from && route.to === to) ||
                   (route.from === to && route.to === from))
    );
    if (remaining.length === state.blockedRoutes.length) return state;
    return { ...state, blockedRoutes: remaining };
}

/**
 * Places the player directly on `nodeId`, bypassing adjacency: the
 * labyrinth-only movements that are not walks: the Oubliette's ejection
 * to the last activated Waystone. Throws off labyrinth maps so gauntlet
 * traversal can never be teleport-skipped, and on unknown nodes.
 */
export function teleportToNode(state: WorldState, nodeId: NodeId): WorldState {
    const map = state.currentMap;
    const def = getMapDefinition(map.continent, map.name);
    if (def.traversal !== 'labyrinth') {
        throw new IllegalMoveError(`teleportToNode: '${map.name}' is not a labyrinth map.`);
    }
    if (!def.nodes.some(n => n.id === nodeId)) {
        throw new IllegalMoveError(`teleportToNode: '${nodeId}' is unknown on map '${map.name}'.`);
    }
    if (map.currentNode === nodeId) return state;
    // A teleport PLACES the player (the Oubliette's eject, a waystone recall):
    // no door was walked, so no arrival is owed at the far end.
    return { ...state, currentMap: { ...map, currentNode: nodeId, pendingArrival: null, arrivedFrom: null } };
}

/**
 * Check if a route between two nodes is blocked by hazard outcomes.
 * Returns the blocking reason if blocked, undefined otherwise.
 */
export function isRouteBlocked(state: MapState, from: NodeId, to: NodeId): string | undefined {
    const blockedRoute = state.blockedRoutes.find(
        route => (route.from === from && route.to === to) ||
                 (route.from === to && route.to === from)
    );
    return blockedRoute?.reason;
}

// ── Traversal queries + audit ───────────────────────────────────────────────

/**
 * The nodes the player may legally move to right now.
 *
 * This is the single source of truth for "where can I go" — `moveToNode`'s
 * validation, expressed as a query instead of an exception.
 *
 * On a gauntlet map this is the current node's open roads (`roads.ts`):
 * every neighbour over an unblocked road, read both ways, new or spent,
 * minus the onward roads an unspent held node still holds. `lockedNodes` is
 * not consulted: it is bookkeeping that `syncMoveLists` keeps in step, never
 * the authority. Labyrinth maps keep their own rule — the current room's
 * doors, solved rooms included. Blocked routes are excluded on both.
 */
export function legalMovesFrom(map: MapState): NodeId[] {
    const def = getMapDefinition(map.continent, map.name);
    const node = def.nodes.find(n => n.id === map.currentNode);
    if (!node) return [];
    if (def.traversal === 'labyrinth') {
        return node.connectedNodes.filter(
            id => isRouteBlocked(map, map.currentNode, id) === undefined,
        );
    }
    return openRoadsFrom(def, map, map.currentNode);
}

/**
 * The shortest walk along open roads from the node underfoot to `target`,
 * passing only across nodes that fire nothing on the way (spent nodes and
 * the map's starting node), as the nodes to step onto in order (the node
 * underfoot excluded, `target` last). `[]` when the player already stands
 * there; `null` when no such walk exists. Gauntlet maps only (`null` on a
 * labyrinth). Ties break in map-definition order.
 */
export function roadRouteTo(map: MapState, target: NodeId): NodeId[] | null {
    if (map.currentNode === target) return [];
    const prev = roadWalk(map);
    if (prev === null || !prev.has(target)) return null;
    const route: NodeId[] = [];
    for (let n = target; n !== map.currentNode; n = prev.get(n)!) route.unshift(n);
    return route;
}

/**
 * Every node a walk along open roads from the node underfoot can step onto
 * (`roadRouteTo` is not `null`), the node underfoot excluded, in
 * map-definition order. What the player can get to from here without
 * resolving anything on the way. Empty on a labyrinth.
 */
export function roadReachable(map: MapState): NodeId[] {
    const prev = roadWalk(map);
    if (prev === null) return [];
    const def = getMapDefinition(map.continent, map.name);
    return def.nodes.map(n => n.id).filter(id => id !== map.currentNode && prev.has(id));
}

/**
 * Breadth-first over open roads from the node underfoot, stepping on past
 * spent nodes and the start only: each reached node's parent. `null` on a
 * labyrinth.
 */
function roadWalk(map: MapState): Map<NodeId, NodeId> | null {
    const def = getMapDefinition(map.continent, map.name);
    if (def.traversal === 'labyrinth') return null;
    const passable = (id: NodeId) => isNodeSpent(map, id) || id === def.startingNode.id;
    const prev = new Map<NodeId, NodeId>([[map.currentNode, map.currentNode]]);
    if (!def.nodes.some(n => n.id === map.currentNode)) return prev;
    const queue: NodeId[] = [map.currentNode];
    while (queue.length > 0) {
        const at = queue.shift()!;
        for (const next of openRoadsFrom(def, map, at)) {
            if (prev.has(next)) continue;
            prev.set(next, at);
            if (passable(next)) queue.push(next);
        }
    }
    return prev;
}

/**
 * Walks the player along `roadRouteTo(target)`, one `moveToNode` per road.
 * Only the arrival at `target` can be left owed: the nodes walked across on
 * the way are spent (or the start), so arriving there owes nothing
 * (`arriveAtNode`); a spent `target` is owed nothing either. Throws
 * `IllegalMoveError` when no such walk exists.
 */
export function walkRoadTo(state: WorldState, target: NodeId): WorldState {
    const route = roadRouteTo(state.currentMap, target);
    if (route === null) {
        throw new IllegalMoveError(`walkRoadTo: no road leads from '${state.currentMap.currentNode}' to '${target}' across walked nodes.`);
    }
    let world = state;
    for (const id of route) world = moveToNode(world, id);
    return world;
}

/** The verdict of `auditMapTraversal`. */
export interface MapTraversalAudit {
    mapName: string;
    /** Nodes with no forward edge — the authored ends of the map's lanes. */
    terminalNodes: NodeId[];
    /** Nodes no forward route can ever reach from the starting node. */
    unreachableNodes: NodeId[];
    /** Length in nodes of the longest forward route. */
    longestRoute: number;
    /** Total distinct forward routes walked to their end. */
    routesExplored: number;
}

/**
 * The FORWARD SKELETON of a map: for every node, the neighbours that sit one
 * column further along (`location[0] + 1`).
 *
 * LATERAL RIBS — same-column edges between neighbouring
 * lanes — make the canvas draw a branching web instead of a ladder of rungs
 * and let a hazard-blocked edge be routed around. Those ribs are traversal
 * edges, not progression edges. The two route audits below measure
 * PROGRESSION — "how many beats does a run take", "what share of runs meets
 * the quest-giver" — so they walk the forward skeleton alone. Walking the
 * ribs as well would let a single-life route snake sideways through a whole
 * column and would multiply the route count into the millions without
 * describing anything a player experiences.
 */
export function forwardEdges(def: MapDefinition): Map<string, string[]> {
    const columnOf = new Map(def.nodes.map(n => [n.id, n.location[0]]));
    const forward = new Map<string, string[]>();
    for (const node of def.nodes) {
        const here = columnOf.get(node.id)!;
        forward.set(
            node.id,
            node.connectedNodes.filter(id => columnOf.get(id) === here + 1),
        );
    }
    return forward;
}

/**
 * Exhaustively walks every forward route through a gauntlet map (the
 * forward skeleton, `forwardEdges`) and reports its ends and its length.
 * Pure and definition-only — it reads the static `MapDefinition`, never a
 * live `MapState`, so content tests can run it over the whole registry.
 * Whether every node can actually be walked to is the road-reachability
 * audit's question (`road-reachability.ts`), not this one's.
 *
 * Labyrinth maps return an empty audit.
 *
 * `maxRoutes` bounds the search on pathological content; exceeding it stops
 * the walk early rather than looping forever, and the returned
 * `routesExplored` will equal the cap.
 */
export function auditMapTraversal(
    def: MapDefinition,
    maxRoutes = 500_000,
): MapTraversalAudit {
    const byId = forwardEdges(def);
    const terminalNodes = def.nodes.filter(n => (byId.get(n.id) ?? []).length === 0).map(n => n.id);
    const audit: MapTraversalAudit = {
        mapName: def.name,
        terminalNodes,
        unreachableNodes: [],
        longestRoute: 0,
        routesExplored: 0,
    };
    if (def.traversal === 'labyrinth') return audit;

    const reached = new Set<NodeId>([def.startingNode.id]);
    const walk = (cur: NodeId, completed: Set<NodeId>, route: NodeId[]): void => {
        if (audit.routesExplored >= maxRoutes) return;
        const options = (byId.get(cur) ?? []).filter(id => !completed.has(id));
        if (options.length === 0) {
            audit.routesExplored += 1;
            audit.longestRoute = Math.max(audit.longestRoute, route.length);
            return;
        }
        for (const next of options) {
            reached.add(next);
            completed.add(next);
            route.push(next);
            walk(next, completed, route);
            route.pop();
            completed.delete(next);
        }
    };
    walk(def.startingNode.id, new Set([def.startingNode.id]), [def.startingNode.id]);
    audit.unreachableNodes = def.nodes.map(n => n.id).filter(id => !reached.has(id));
    return audit;
}

/**
 * Makes `nodeId` live again: out of `lockedNodes`, `completedNodes` and
 * `consumedNodes`, and in `availableNodes` and `discoveredNodes`. Moves no
 * one and touches no other node. `placeOnNode` places the player on a node it
 * has un-spent; the death rule (`resolveDeath`) un-spends the node a first
 * death happened on so it can be walked into again.
 */
export function unspendNode(map: MapState, nodeId: NodeId): MapState {
    const without = (xs: readonly NodeId[]) => xs.filter(x => x !== nodeId);
    const withOnce = (xs: readonly NodeId[]) => (xs.includes(nodeId) ? [...xs] : [...xs, nodeId]);
    return {
        ...map,
        lockedNodes: without(map.lockedNodes),
        completedNodes: without(map.completedNodes),
        consumedNodes: without(map.consumedNodes),
        availableNodes: withOnce(map.availableNodes),
        discoveredNodes: withOnce(map.discoveredNodes),
    };
}

/**
 * Stand the player on `nodeId` with no adjacency or back-travel rule and
 * no event fired — the state-fixture / dev-tools placement primitive.
 * Unlike `teleportToNode` it works on every map kind; unlike
 * `moveToNode` it never throws for a legal-but-unwalked node. The node is
 * also marked discovered (and cleared from locked / completed / consumed)
 * so an exploration renderer shows it as the live position, and its
 * neighbours are revealed and the move lists re-synced from it so the walk
 * can continue from there (the `availableNodes` / `lockedNodes` readers stay
 * in step; `legalMovesFrom` itself does not consult them).
 * Throws `IllegalMoveError` only when `nodeId` is not on the current map.
 *
 * Mobile's `/dev` WORLD → JUMP row delegates here.
 *
 * BEING PLACED IS NOT ARRIVING, and this verb says so in the state it writes:
 * `pendingArrival` is cleared. Placement un-consumes the node so its content
 * is live for a tester; without the cleared debt, that "live, unconsumed node
 * under the player" would be indistinguishable from an arrival nobody had
 * answered, and the exploration screen would fire the node's event on mount.
 * `no event fired` above is the contract; this keeps it.
 */
export function placeOnNode(state: WorldState, nodeId: NodeId): WorldState {
    const map = state.currentMap;
    const def = getMapDefinition(map.continent, map.name);
    if (!def.nodes.some(n => n.id === nodeId)) {
        throw new IllegalMoveError(`placeOnNode: '${nodeId}' is unknown on map '${map.name}'.`);
    }
    const placed: MapState = {
        ...unspendNode(map, nodeId),
        currentNode: nodeId,
        pendingArrival: null,
        arrivedFrom: null,
    };
    return { ...state, currentMap: unlockAdjacent(revealAdjacent(placed, nodeId), nodeId) };
}
