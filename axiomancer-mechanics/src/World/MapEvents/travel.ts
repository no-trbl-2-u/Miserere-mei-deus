/**
 * Travel — the player's yes to a "move to X?" (phase NK1d).
 *
 * Resolving a travel node only OFFERS the trip (`resolveTravel`, handlers.ts):
 * the player stands on the node and is asked. `takeTravel` is the yes. A no
 * is nothing at all: the player stays on the node, owes nothing, and tapping
 * it again offers the trip again (a travel node acts on every entry).
 *
 * Two destinations:
 *   - another map: the world crosses (`crossToMap`), as the doors always did;
 *   - a node on the same map, a PASSAGE: the player arrives on the far node
 *     (`arriveThroughPassage`), which counts as visited, so its roads are the
 *     next moves; nothing there fires. The far node of an authored passage is
 *     the paired travel node that leads back, so the player can return.
 */

import type { GameState } from '../../Game/types';
import type { NodeId } from '../types';
import { arriveThroughPassage } from '../world.reducer';
import { getNodeEventPool } from './resolve-map-event';
import { crossToMap, isTravelOpen } from './handlers';
import type { TravelPayload } from './types';

/**
 * The travel payload authored on `nodeId` of the current map (the node
 * underfoot when omitted), or undefined when that node is not a travel node.
 */
export function travelPayloadAt(
    state: Pick<GameState, 'world'>,
    nodeId: NodeId = state.world.currentMap.currentNode,
): TravelPayload | undefined {
    const map = state.world.currentMap;
    const pool = getNodeEventPool(map.continent, map.name, nodeId);
    const entry = pool?.entries.find(e => e.payload.kind === 'travel');
    return entry?.payload.kind === 'travel' ? entry.payload : undefined;
}

/**
 * Takes the trip the travel node underfoot offers. Returns `state` itself
 * (nothing moves) when the node is not a travel node or its way is shut
 * (`opensAfter` unspent). Otherwise crosses to the destination map, or
 * steps through the passage to the destination node of the same map.
 *
 * `staged` takes that payload in place of the node's own, as
 * `resolveMapEvent`'s `staged` does (tests and state fixtures).
 */
export function takeTravel(state: GameState, staged?: TravelPayload): GameState {
    const payload = staged ?? travelPayloadAt(state);
    if (!payload) return state;
    if (!isTravelOpen(state.world.currentMap, payload)) return state;
    const destination = payload.destination;
    const world = 'node' in destination
        ? arriveThroughPassage(state.world, destination.node)
        : crossToMap(state.world, destination.continent, destination.map);
    return { ...state, world };
}
