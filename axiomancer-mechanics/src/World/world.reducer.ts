/**
 * World reducer — pure transitions over WorldState. Idempotent where it
 * makes sense (locking/unlocking, completing).
 */

import { WorldState, MapState, MapDefinition, MapNode, NodeId, Continent } from './types';
import { MapName, ContinentName } from './map.library';
import { getMapDefinition } from './map.registry';

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

// ── The frontier ────────────────────────────────────────────────────────────
//
// The traversal doctrine. A node the player has RESOLVED is SPENT:
// still drawn, still part of the graph, but answered — it yields nothing and
// is not a destination. Everything unvisited that touches the visited
// set across an unblocked edge is the FRONTIER, and the whole frontier is
// open at once. The player therefore roams the explored edge of the map
// instead of being pushed down a single lane, and the region boss becomes
// unavoidable only once the frontier is empty.
//
// Nothing here is persisted. The frontier is DERIVED from the three sets the
// save already carries (`currentNode`, `completedNodes`, `consumedNodes`)
// plus the static graph, so any save reads correctly on the first load.

/**
 * The nodes that count as ALREADY ANSWERED for frontier purposes: everything
 * resolved (`completedNodes` ∪ `consumedNodes`) plus the node the player is
 * standing on.
 *
 * Standing on a node counts, but merely having WALKED THROUGH one does not:
 * `moveToNode` marks nothing spent, so a node the player stepped off without
 * resolving drops back onto the frontier and can be returned to. A node is
 * spent on RESOLUTION, not on departure.
 */
function visitedSet(map: MapState): Set<NodeId> {
    const seen = new Set<NodeId>(map.completedNodes);
    for (const id of map.consumedNodes) seen.add(id);
    seen.add(map.currentNode);
    return seen;
}

/** `visitedSet` as an array — the spent set plus the node under the player. */
export function visitedNodes(map: MapState): NodeId[] {
    return [...visitedSet(map)];
}

/**
 * True when `nodeId` has been resolved on this map — "spent/sealed".
 * A spent node still renders and still carries its authored content; it
 * simply cannot be re-entered or re-farmed. The one exception: a claimed rest
 * un-spends the act's settled elite nodes (`respawnElites`, elite-respawn.ts),
 * so a fought elite returns. The node the player is standing on is NOT spent
 * by standing there (see `visitedSet`).
 */
export function isNodeSpent(map: MapState, nodeId: NodeId): boolean {
    return map.completedNodes.includes(nodeId) || map.consumedNodes.includes(nodeId);
}

/**
 * Undirected, unblocked adjacency over the map definition.
 *
 * Edges are authored one-way (forward, plus the lateral lane ribs) but are
 * drawn and walked as undirected lines, so the frontier reads them both
 * ways. Blocked routes are cut here, which is what makes a hazard-blocked
 * edge genuinely block: a node reachable only across it never enters the
 * frontier.
 */
function unblockedAdjacency(map: MapState): Map<NodeId, Set<NodeId>> {
    const def = getMapDefinition(map.continent, map.name);
    const adj = new Map<NodeId, Set<NodeId>>();
    for (const node of def.nodes) adj.set(node.id, new Set<NodeId>());
    for (const node of def.nodes) {
        for (const next of node.connectedNodes) {
            if (!adj.has(next)) continue;
            if (isRouteBlocked(map, node.id, next) !== undefined) continue;
            adj.get(node.id)!.add(next);
            adj.get(next)!.add(node.id);
        }
    }
    return adj;
}

/**
 * True when `nodeId` is on the map's `holdRoadsUntilSettled` list and not yet
 * spent: such a node adds its roads to the frontier only once it is spent, so
 * standing on it opens nothing (a quest node before its step is accepted, the
 * watchtower before the boss falls). Always false on a map with no list.
 */
export function isHoldingRoads(map: MapState, nodeId: NodeId): boolean {
    const def = getMapDefinition(map.continent, map.name);
    if (!def.holdRoadsUntilSettled?.includes(nodeId)) return false;
    return !isNodeSpent(map, nodeId);
}

/**
 * The frontier: every UNVISITED node joined by an unblocked edge to ANY
 * visited node. Returned in map-definition order so callers render a stable
 * list. Gauntlet-shaped; labyrinth maps have their own rule and should ask
 * `legalMovesFrom` instead.
 *
 * A node the map holds (`holdRoadsUntilSettled`) is visited while the player
 * stands on it, so it is never its own destination, but its roads open only
 * once it is spent (`isHoldingRoads`).
 */
export function frontierNodes(map: MapState): NodeId[] {
    const def = getMapDefinition(map.continent, map.name);
    if (!def.nodes.some(n => n.id === map.currentNode)) return [];
    const visited = visitedSet(map);
    const origins = new Set<NodeId>(visited);
    if (isHoldingRoads(map, map.currentNode)) origins.delete(map.currentNode);
    const adj = unblockedAdjacency(map);
    return def.nodes
        .map(n => n.id)
        .filter(id => !visited.has(id))
        .filter(id => {
            for (const neighbour of adj.get(id) ?? []) {
                if (origins.has(neighbour)) return true;
            }
            return false;
        });
}

/**
 * True when nothing unvisited touches the explored set any more — the map is
 * walked out. On a map whose climax sits behind its last open lane this is
 * also the moment the boss stops being optional, which is "the boss is
 * forced only when the frontier is exhausted" stated as a query.
 */
export function isFrontierExhausted(map: MapState): boolean {
    return frontierNodes(map).length === 0;
}

/**
 * Promotes the current frontier into `availableNodes` and out of
 * `lockedNodes`.
 *
 * Those two lists are the LEGACY unlock bookkeeping (the CLI's move filter
 * and mobile's defence-in-depth tap gate still read them); `legalMovesFrom`
 * is the authority. The sync is ADDITIVE on `availableNodes` — it never
 * removes, because that list is documented as cumulative and consumers
 * subtract from it themselves — and subtractive on `lockedNodes`, so a node
 * that has joined the frontier stops reading as locked.
 *
 * No-ops on labyrinth maps, which do not consult either list.
 * Exported for the elite respawn (`elite-respawn.ts`), which un-spends nodes
 * and keeps the same lists in step.
 */
export function syncFrontierLists(map: MapState): MapState {
    const def = getMapDefinition(map.continent, map.name);
    if (def.traversal === 'labyrinth') return map;
    const frontier = new Set<NodeId>(frontierNodes(map));
    if (frontier.size === 0) return map;
    const available = new Set<NodeId>(map.availableNodes);
    const added = [...frontier].filter(id => !available.has(id));
    const stillLocked = map.lockedNodes.filter(id => !frontier.has(id));
    if (added.length === 0 && stillLocked.length === map.lockedNodes.length) return map;
    return {
        ...map,
        availableNodes: [...map.availableNodes, ...added],
        lockedNodes: stillLocked,
    };
}

/**
 * Moves the player to `nodeId` on the current map. Pure WorldState reducer.
 *
 * Validation (FRONTIER ROAMING):
 *   1. The destination must be a real node on the map.
 *   2. The destination must not be SPENT — a node the player has already
 *      resolved (`completedNodes` / `consumedNodes`) is answered; it stays
 *      drawn on the canvas but is not a destination, so nothing can
 *      be re-farmed, except an elite a claimed rest brought back
 *      (`respawnElites`), which is unspent again and so a destination.
 *   3. The destination must be on the FRONTIER: unvisited, and joined by an
 *      unblocked edge to ANY visited node — not merely to the node the
 *      player is standing on. That is the whole rule: the explored edge of
 *      the map is open, so a player may double back and clear a lane they
 *      skipped instead of being shovelled forward into the boss. The boss
 *      is never *forced* until the frontier is exhausted, which falls out
 *      of this rule rather than being special-cased.
 *   4. Blocked routes (hazard outcomes, secret doors) are cut out of the
 *      adjacency the frontier is derived from, so a node reachable ONLY
 *      across a blocked edge is not a legal destination. A node still
 *      reachable by some other unblocked edge stays legal — that is
 *      `map.dispatcher.ts`'s "alternative path", expressed in the
 *      legality rule itself.
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
            currentMap: { ...map, currentNode: nodeId, pendingArrival: nodeId },
        };
    }

    if (!def.nodes.some(n => n.id === nodeId)) {
        throw new IllegalMoveError(`moveToNode: '${nodeId}' is unknown on map '${map.name}'.`);
    }
    if (visitedSet(map).has(nodeId)) {
        throw new IllegalMoveError(`moveToNode: '${nodeId}' is spent — its arrival has already been answered.`);
    }
    if (!frontierNodes(map).includes(nodeId)) {
        // Name the blockage when that is what actually stopped the move: if
        // the destination touches the node the player stands on and THAT
        // edge is blocked, "the bridge is down" is the true and useful
        // sentence. It only reaches here when no other unblocked edge to
        // the explored region exists — a destination still reachable the
        // long way round stays legal, which is `map.dispatcher.ts`'s
        // alternative path honoured in the legality rule.
        const touching = currentNode.connectedNodes.includes(nodeId)
            || def.nodes.find(n => n.id === nodeId)?.connectedNodes.includes(map.currentNode);
        const blockedReason = touching ? isRouteBlocked(map, map.currentNode, nodeId) : undefined;
        if (blockedReason !== undefined) {
            throw new IllegalMoveError(`moveToNode: route from '${map.currentNode}' to '${nodeId}' is blocked — ${blockedReason}`);
        }
        throw new IllegalMoveError(`moveToNode: '${nodeId}' is not on the explored frontier of '${map.name}'.`);
    }
    return {
        ...state,
        currentMap: { ...map, currentNode: nodeId, pendingArrival: nodeId },
    };
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
    // Completing a node spends it, which grows the frontier: sync the
    // unlock lists against the whole frontier, not just this node's
    // own edges, so a lane the player left open earlier still reads as
    // available.
    return {
        ...state,
        currentMap: syncFrontierLists({
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
        currentMap: syncFrontierLists({
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
    // A consumed node is SPENT, so everything it touches joins the
    // frontier. Keep the unlock lists honest about that.
    return syncFrontierLists({ ...state, consumedNodes: [...state.consumedNodes, nodeId] });
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

    // The local promotion above is kept (callers and their tests pin
    // it), then widened to the whole frontier: a lane the player walked past
    // without resolving must not silently fall back into `lockedNodes`.
    if (newlyAvailable.length === 0) return syncFrontierLists(state);

    return syncFrontierLists({
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
    return { ...state, currentMap: { ...map, currentNode: nodeId, pendingArrival: null } };
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

// ── Traversal audit ──────────────────────────────────────────────────────────

/**
 * The nodes the player may legally move to right now.
 *
 * This is the single source of truth for "where can I go" — `moveToNode`'s
 * validation, expressed as a query instead of an exception.
 *
 * On a gauntlet map this is the FRONTIER, not the current node's
 * neighbours. The set does not depend on where the player is
 * standing at all — every unvisited node touching the explored region is
 * offered, so a skipped lane stays open and the boss is only forced once
 * nothing else is left. `lockedNodes` is not consulted: it is
 * bookkeeping that `syncFrontierLists` keeps in step, never the authority.
 * Labyrinth maps keep their own rule — the current room's doors, solved rooms
 * included. Blocked routes are excluded on both.
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
    return frontierNodes(map);
}

/**
 * True when the player has no legal move left.
 *
 * A gauntlet map runs out of moves only when the FRONTIER is
 * exhausted — every node has been resolved, or the survivors are cut off
 * behind blocked routes. Walking into a corner is not possible: the
 * frontier does not depend on where the player stands, so a dead-end lane
 * is a detour, not a soft-lock.
 */
export function isStranded(map: MapState): boolean {
    return legalMovesFrom(map).length === 0;
}

/** One strand a traversal audit found: entering `nodeId` by `via` dead-ends. */
export interface MapStrand {
    /** The node the run walked into with no legal move left. */
    nodeId: NodeId;
    /** The node it arrived from. */
    via: NodeId;
    /** The full route, start node first. */
    route: NodeId[];
}

/** The verdict of `auditMapTraversal`. */
export interface MapTraversalAudit {
    mapName: string;
    /** Nodes with no outgoing edges at all — the authored ends of the map. */
    terminalNodes: NodeId[];
    /**
     * Routes that ran out of legal moves on a NON-terminal node. Any entry
     * here is a soft-lock: the player is alive, the map is unfinished, and
     * the UI has nothing to offer. Empty is the invariant.
     */
    strands: MapStrand[];
    /** Nodes no legal route can ever reach from the starting node. */
    unreachableNodes: NodeId[];
    /** Length in nodes of the longest legal single-life route. */
    longestRoute: number;
    /** Total distinct routes walked to exhaustion. */
    routesExplored: number;
}

/**
 * Exhaustively walks every legal single-life route through a gauntlet map
 * and reports the ways it can end. Pure and definition-only — it reads the
 * static `MapDefinition`, never a live `MapState`, so content tests can run
 * it over the whole registry.
 *
 * Only meaningful for gauntlet maps: labyrinth traversal permits re-entry,
 * so a labyrinth route never runs out of moves and the walk would not
 * terminate. Callers should skip those (`auditMapTraversal` returns an empty
 * audit for them rather than hanging).
 *
 * `maxRoutes` bounds the search on pathological content; exceeding it stops
 * the walk early rather than looping forever, and the returned
 * `routesExplored` will equal the cap.
 */
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

export function auditMapTraversal(
    def: MapDefinition,
    maxRoutes = 500_000,
): MapTraversalAudit {
    const byId = forwardEdges(def);
    const terminalNodes = def.nodes.filter(n => (byId.get(n.id) ?? []).length === 0).map(n => n.id);
    const audit: MapTraversalAudit = {
        mapName: def.name,
        terminalNodes,
        strands: [],
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
            if (!terminalNodes.includes(cur)) {
                audit.strands.push({ nodeId: cur, via: route[route.length - 2] ?? cur, route: [...route] });
            }
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
 * Stand the player on `nodeId` with no adjacency or back-travel rule and
 * no event fired — the state-fixture / dev-tools placement primitive.
 * Unlike `teleportToNode` it works on every map kind; unlike
 * `moveToNode` it never throws for a legal-but-unwalked node. The node is
 * also marked discovered + available (and cleared from locked / completed /
 * consumed) so an exploration renderer shows it as the live position, and
 * its neighbours are revealed + unlocked so the walk can continue from
 * there (the `availableNodes` / `lockedNodes` readers stay in step;
 * `legalMovesFrom` itself does not consult them).
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
    const without = (xs: readonly NodeId[]) => xs.filter(x => x !== nodeId);
    const withOnce = (xs: readonly NodeId[]) => (xs.includes(nodeId) ? [...xs] : [...xs, nodeId]);
    const placed: MapState = {
        ...map,
        currentNode: nodeId,
        pendingArrival: null,
        lockedNodes: without(map.lockedNodes),
        completedNodes: without(map.completedNodes),
        consumedNodes: without(map.consumedNodes),
        availableNodes: withOnce(map.availableNodes),
        discoveredNodes: withOnce(map.discoveredNodes),
    };
    return { ...state, currentMap: unlockAdjacent(revealAdjacent(placed, nodeId), nodeId) };
}
