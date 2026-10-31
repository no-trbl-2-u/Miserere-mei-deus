/**
 * Held roads, read for the screens that explain them (phase ET1b).
 *
 * A node on a map's `holdRoadsUntilSettled` list keeps its own onward roads
 * shut until it is spent (`roads.ts`). A screen about that node (the hazard's
 * stakes card) names what it holds; the map draws a held road closed and
 * redraws it open once it is not held.
 *
 * Pure and definition-driven, like `roads.ts`.
 */

import type { MapDefinition, NodeId } from './types';
import { BREAKWATER_CHAPTER_KINDS } from './MapEvents/content';

/** The nodes `nodeId` holds the road to while unspent; empty when the map does not hold it. */
export function heldRoadTargets(def: MapDefinition, nodeId: NodeId): NodeId[] {
    if (!(def.holdRoadsUntilSettled ?? []).includes(nodeId)) return [];
    return [...(def.nodes.find(n => n.id === nodeId)?.connectedNodes ?? [])];
}

/** A node's authored place name ("Moored ship"), or null when the node has none. */
export function nodePlace(nodeId: NodeId): string | null {
    return BREAKWATER_CHAPTER_KINDS[nodeId]?.place ?? null;
}

/** The place names of the nodes `nodeId` holds the road to, in map order; unnamed nodes are left off. */
export function heldRoadPlaces(def: MapDefinition, nodeId: NodeId): string[] {
    return heldRoadTargets(def, nodeId)
        .map(nodePlace)
        .filter((p): p is string => p !== null);
}
