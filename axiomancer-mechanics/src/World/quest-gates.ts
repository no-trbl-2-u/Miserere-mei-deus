/**
 * Quest gates: the authoring check that a gate really holds its road.
 *
 * A step's `gatesPast` roads stay shut until the step is completed. On a
 * gauntlet map the player roams the whole frontier (`frontierNodes`), so a
 * gate holds only when every node past it is out of reach while it is shut.
 * `questGateProblems` reads the static definition (never a save) the way the
 * frontier does: roads both ways, every gate of every questline on the map
 * shut, every other authored block and every held node assumed open (each
 * one opens in play), and lists each node past a gate the start still
 * reaches, with the road it gets in by.
 *
 * "Past a gate" is read off the authored direction: the nodes the gate's far
 * end leads on to by its own forward roads (`connectedNodes`), the far end
 * included and the gate's near end never.
 */

import type { MapDefinition, NodeId } from './types';
import type { Questline, RouteRef } from './questline';

/** One gate of a questline, with the step that holds it. */
export interface QuestGate {
    readonly questline: string;
    readonly step: number;
    readonly road: RouteRef;
}

/** Every gate the questlines on `def`'s map declare, in step order. */
export function questGatesOn(def: MapDefinition, questlines: readonly Questline[]): QuestGate[] {
    return questlines
        .filter(line => line.mapName === def.name)
        .flatMap(line => line.steps.flatMap(step =>
            (step.gatesPast ?? []).map(road => ({ questline: line.id, step: step.step, road }))));
}

const sameRoad = (r: RouteRef, a: NodeId, b: NodeId) =>
    (r.from === a && r.to === b) || (r.from === b && r.to === a);

/** The nodes past `gate`: its far end and everything its forward roads lead on to. */
function pastGate(def: MapDefinition, gate: RouteRef): Set<NodeId> {
    const forward = new Map(def.nodes.map(n => [n.id, n.connectedNodes] as const));
    const past = new Set<NodeId>([gate.to]);
    const queue: NodeId[] = [gate.to];
    while (queue.length > 0) {
        const at = queue.shift()!;
        for (const next of forward.get(at) ?? []) {
            if (next === gate.from || past.has(next) || !forward.has(next)) continue;
            past.add(next);
            queue.push(next);
        }
    }
    return past;
}

/**
 * Breadth-first reach from the start with every gate in `shut` closed, roads
 * read both ways. Returns each reached node's parent (the start's is itself).
 */
function reachWithGatesShut(def: MapDefinition, shut: readonly RouteRef[]): Map<NodeId, NodeId> {
    const adj = new Map<NodeId, NodeId[]>(def.nodes.map(n => [n.id, []]));
    for (const node of def.nodes) {
        for (const next of node.connectedNodes) {
            if (!adj.has(next) || shut.some(g => sameRoad(g, node.id, next))) continue;
            adj.get(node.id)!.push(next);
            adj.get(next)!.push(node.id);
        }
    }
    const start = def.startingNode.id;
    const parent = new Map<NodeId, NodeId>([[start, start]]);
    const queue: NodeId[] = [start];
    while (queue.length > 0) {
        const at = queue.shift()!;
        for (const next of adj.get(at) ?? []) {
            if (parent.has(next)) continue;
            parent.set(next, at);
            queue.push(next);
        }
    }
    return parent;
}

/** The road on `node`'s path from the start that first enters `past`. */
function entryRoad(parent: Map<NodeId, NodeId>, past: Set<NodeId>, node: NodeId): RouteRef {
    const path: NodeId[] = [node];
    while (parent.get(path[0]!) !== path[0]) path.unshift(parent.get(path[0]!)!);
    const i = path.findIndex(id => past.has(id));
    // The start itself lies past the gate: the map begins on the far side.
    if (i <= 0) return { from: path[0]!, to: path[0]! };
    return { from: path[i - 1]!, to: path[i]! };
}

/**
 * Every way `questlines`' gates fail to hold on `def`, one line each; empty
 * when every gate holds. A gate is a problem when the map does not seed it
 * shut (`initialBlockedRoutes`), and when a node past it is reachable from
 * the start with every gate shut: the line names the gate, the nodes, and
 * the road that walks around it.
 */
export function questGateProblems(def: MapDefinition, questlines: readonly Questline[]): string[] {
    const gates = questGatesOn(def, questlines);
    if (gates.length === 0) return [];
    const problems: string[] = [];
    const seeded = def.initialBlockedRoutes ?? [];
    const parent = reachWithGatesShut(def, gates.map(g => g.road));
    for (const { questline, step, road } of gates) {
        const name = `${questline} step ${step} gate ${road.from}-${road.to}`;
        if (!seeded.some(r => sameRoad(r, road.from, road.to))) {
            problems.push(`${name}: not seeded shut in initialBlockedRoutes`);
        }
        const past = pastGate(def, road);
        const around = new Map<string, NodeId[]>();
        for (const id of def.nodes.map(n => n.id)) {
            if (!past.has(id) || !parent.has(id)) continue;
            const entry = entryRoad(parent, past, id);
            const key = `${entry.from}-${entry.to}`;
            around.set(key, [...(around.get(key) ?? []), id]);
        }
        for (const [edge, nodes] of around) {
            problems.push(`${name}: ${nodes.join(', ')} reachable around it by ${edge}`);
        }
    }
    return problems;
}
