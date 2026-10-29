/**
 * Road reachability: can a player who walks the roads reach every node?
 *
 * Under the road rule (`roads.ts`) the player moves only along open roads
 * from where they stand, back across spent nodes too, so the nodes in reach
 * are everything joined to the start by open roads. This audit replays a
 * map's gates in the order play opens them and lists what is never reached:
 *
 *   1. Start on the starting node with the map's authored blocks shut
 *      (`initialBlockedRoutes`) and every held node holding its onward roads.
 *   2. Each questline on the map, step by step: first every held node in
 *      reach is settled (the elite beaten, the wreck crossed), until nothing
 *      more opens; then the step's quest node must be in reach; accepting it
 *      spends it (its held roads open), its objectives fill (`opensOnReady`
 *      opens) and it completes (`gatesPast` opens).
 *   3. Then every held node still in reach is settled, until nothing more
 *      opens.
 *
 * A same-map passage (a travel node whose destination is another node of the
 * map, NK1d) joins its two ends as a road does: the player standing on one end
 * can take it to the other. The passages are read from the map's event pools
 * unless passed in.
 *
 * A step whose quest node is out of reach is reported, and its roads stay
 * shut. Never reads a save: the questlines are passed in.
 */

import type { BlockedRoute, MapDefinition, NodeId } from './types';
import type { Questline, RouteRef } from './questline';
import { openRoadsFrom, type RoadState } from './roads';
import { getNodeEventPool } from './MapEvents/resolve-map-event';

/** A same-map passage: standing on `from`, the player can travel to `to`. */
export interface MapPassage {
    readonly from: NodeId;
    readonly to: NodeId;
}

/**
 * The map's same-map passages: every node whose registered pool travels to
 * another node of the same map (`destination: { node }`), in map order.
 */
export function mapPassages(def: MapDefinition): MapPassage[] {
    const out: MapPassage[] = [];
    for (const n of def.nodes) {
        for (const entry of getNodeEventPool(def.continent, def.name, n.id)?.entries ?? []) {
            const p = entry.payload;
            if (p.kind === 'travel' && 'node' in p.destination) out.push({ from: n.id, to: p.destination.node });
        }
    }
    return out;
}

/** The verdict of `auditRoadReachability`. */
export interface RoadReachabilityAudit {
    readonly mapName: string;
    /** Nodes no walk along open roads ever reaches, in map order. Empty is the invariant. */
    readonly unreachableNodes: readonly NodeId[];
    /** Quest steps whose quest node was out of reach when their turn came. */
    readonly unreachableSteps: readonly { questline: string; step: number; nodeId: NodeId }[];
}

/** Every node reachable from the start along open roads and passages, under `state`. */
function reach(def: MapDefinition, state: RoadState, passages: readonly MapPassage[]): Set<NodeId> {
    const seen = new Set<NodeId>([def.startingNode.id]);
    const queue: NodeId[] = [def.startingNode.id];
    while (queue.length > 0) {
        const at = queue.shift()!;
        const through = passages.filter(p => p.from === at).map(p => p.to);
        for (const next of [...openRoadsFrom(def, state, at), ...through]) {
            if (seen.has(next)) continue;
            seen.add(next);
            queue.push(next);
        }
    }
    return seen;
}

const isRoad = (r: RouteRef, b: BlockedRoute) =>
    (r.from === b.from && r.to === b.to) || (r.from === b.to && r.to === b.from);

/**
 * Walks `def` along open roads and passages with its gates opened in
 * questline order and reports every node and quest step left out of reach.
 * Labyrinth maps return an empty audit (their doors are their own rule).
 */
export function auditRoadReachability(
    def: MapDefinition,
    questlines: readonly Questline[],
    passages: readonly MapPassage[] = mapPassages(def),
): RoadReachabilityAudit {
    if (def.traversal === 'labyrinth') return { mapName: def.name, unreachableNodes: [], unreachableSteps: [] };
    const state: RoadState & { completedNodes: NodeId[]; blockedRoutes: BlockedRoute[] } = {
        currentNode: def.startingNode.id,
        completedNodes: [],
        consumedNodes: [],
        blockedRoutes: (def.initialBlockedRoutes ?? []).map(r => ({ ...r })),
    };
    const open = (roads: readonly RouteRef[] | undefined) => {
        for (const road of roads ?? []) state.blockedRoutes = state.blockedRoutes.filter(b => !isRoad(road, b));
    };
    const unreachableSteps: { questline: string; step: number; nodeId: NodeId }[] = [];
    const settleHeld = () => {
        for (;;) {
            const reached = reach(def, state, passages);
            const settle = (def.holdRoadsUntilSettled ?? [])
                .filter(id => reached.has(id) && !state.completedNodes.includes(id));
            if (settle.length === 0) return;
            state.completedNodes.push(...settle);
        }
    };

    for (const line of questlines.filter(q => q.mapName === def.name)) {
        for (const step of [...line.steps].sort((a, b) => a.step - b.step)) {
            settleHeld();
            if (!reach(def, state, passages).has(step.nodeId)) {
                unreachableSteps.push({ questline: line.id, step: step.step, nodeId: step.nodeId });
                continue;
            }
            state.completedNodes.push(step.nodeId);
            open(step.opensOnReady);
            open(step.gatesPast);
        }
    }

    settleHeld();

    const reached = reach(def, state, passages);
    return {
        mapName: def.name,
        unreachableNodes: def.nodes.map(n => n.id).filter(id => !reached.has(id)),
        unreachableSteps,
    };
}
