/**
 * Walking the roads: where a player standing on a gauntlet node may go.
 *
 * The rule (phase WR1a): the legal moves are the open roads out of the node
 * the player stands on, read both ways, onto new and completed nodes alike.
 * There is no frontier and no jumping to a node elsewhere on the map: a
 * dead-end pocket is left by walking back out of it.
 *
 * A road is OPEN when it is not blocked (`MapState.blockedRoutes`: a quest
 * lock, a hazard outcome) and not HELD. A held node (`holdRoadsUntilSettled`)
 * that is still unspent holds its own onward roads (its `connectedNodes`)
 * both ways: standing on a quest marker before accepting, the player may walk
 * back the road they came by, but not on into the pocket; the bridge past the
 * watchtower stays shut until the watchtower is won.
 *
 * Pure and definition-driven: every function takes the static
 * `MapDefinition` beside the runtime lists, so `createMapState` (which the
 * reducer imports) can use it without an import cycle. `world.reducer.ts`
 * wraps these with the registry lookup.
 */

import type { BlockedRoute, MapDefinition, MapState, NodeId } from './types';

/** The runtime fields the road rule reads. */
export type RoadState = Pick<MapState, 'currentNode' | 'completedNodes' | 'consumedNodes' | 'blockedRoutes'>;

/** True when the road `a`–`b` is on the blocked list, either direction. */
export function isRoadBlocked(blocked: readonly BlockedRoute[], a: NodeId, b: NodeId): boolean {
    return blocked.some(r => (r.from === a && r.to === b) || (r.from === b && r.to === a));
}

/** True when `nodeId` is completed or consumed. */
function spent(map: RoadState, nodeId: NodeId): boolean {
    return map.completedNodes.includes(nodeId) || map.consumedNodes.includes(nodeId);
}

/**
 * True when `nodeId` is on the definition's hold list and not yet spent: it
 * holds its onward roads shut.
 */
export function holdsRoads(def: MapDefinition, map: RoadState, nodeId: NodeId): boolean {
    return (def.holdRoadsUntilSettled ?? []).includes(nodeId) && !spent(map, nodeId);
}

/**
 * True when the road `a`–`b` is held: one end is an unspent held node and the
 * other end is on that node's own onward roads.
 */
function isRoadHeld(def: MapDefinition, map: RoadState, a: NodeId, b: NodeId): boolean {
    const onward = (from: NodeId, to: NodeId) =>
        holdsRoads(def, map, from) && (def.nodes.find(n => n.id === from)?.connectedNodes.includes(to) ?? false);
    return onward(a, b) || onward(b, a);
}

/**
 * The nodes joined to `nodeId` by an open road, read both ways, in
 * map-definition order. Empty for a node not on the map.
 */
export function openRoadsFrom(def: MapDefinition, map: RoadState, nodeId: NodeId): NodeId[] {
    const here = def.nodes.find(n => n.id === nodeId);
    if (!here) return [];
    const joined = new Set<NodeId>(here.connectedNodes);
    for (const n of def.nodes) if (n.connectedNodes.includes(nodeId)) joined.add(n.id);
    joined.delete(nodeId);
    return def.nodes
        .map(n => n.id)
        .filter(id => joined.has(id))
        .filter(id => !isRoadBlocked(map.blockedRoutes, nodeId, id))
        .filter(id => !isRoadHeld(def, map, nodeId, id));
}

/**
 * The two unlock lists as the road rule keeps them: `availableNodes` is the
 * legal moves from where the player stands; `lockedNodes` is every other
 * unspent node but the one underfoot.
 */
export function roadMoveLists(def: MapDefinition, map: RoadState): { availableNodes: NodeId[]; lockedNodes: NodeId[] } {
    const availableNodes = openRoadsFrom(def, map, map.currentNode);
    const open = new Set(availableNodes);
    const lockedNodes = def.nodes
        .map(n => n.id)
        .filter(id => id !== map.currentNode && !open.has(id) && !spent(map, id));
    return { availableNodes, lockedNodes };
}
